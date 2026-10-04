<?php

namespace App\Http\Controllers\Cabinet;

use App\Models\ClinicPromotion;
use App\Models\PromotionOrder;
use App\Models\PromotionPackage;
use App\Models\PromotionProduct;
use App\Services\PromotionService;
use App\Services\YooKassaService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Response;

class PromotionController extends CabinetController
{
    public function index(Request $request, PromotionService $promotions): Response
    {
        $branch = $this->branch($request);
        $cityId = (int) $branch->city_id;

        $products = PromotionProduct::query()->where('is_active', true)->orderBy('sort')->get()->map(fn (PromotionProduct $p) => [
            'id' => $p->id,
            'code' => $p->code,
            'name' => $p->name,
            'description' => $p->description,
            'duration_days' => $p->duration_days,
            'requires_moderation' => $p->requires_moderation,
            'price' => $promotions->resolvePrice('product', $p->id, $cityId)?->price,
            'available' => $promotions->availableSlots($cityId, $p->code),
        ]);

        $packages = PromotionPackage::query()->where('is_active', true)->orderBy('sort')->get()->map(fn (PromotionPackage $p) => [
            'id' => $p->id,
            'code' => $p->code,
            'name' => $p->name,
            'description' => $p->description,
            'duration_days' => $p->duration_days,
            'price' => $promotions->resolvePrice('package', $p->id, $cityId)?->price,
        ]);

        $active = ClinicPromotion::query()
            ->where('clinic_id', $branch->id)
            ->whereIn('status', ['active', 'pending_moderation'])
            ->orderByDesc('id')
            ->get()
            ->map(fn (ClinicPromotion $p) => [
                'id' => $p->id,
                'product_code' => $p->product_code,
                'status' => $p->status,
                'starts_at' => $p->starts_at?->toDateString(),
                'ends_at' => $p->ends_at?->toDateString(),
                'banner_image_url' => $p->banner_image_path ? Storage::disk('public')->url($p->banner_image_path) : null,
            ]);

        $orders = PromotionOrder::query()
            ->where('clinic_id', $branch->id)
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (PromotionOrder $o) => [
                'id' => $o->id,
                'amount' => $o->amount,
                'status' => $o->status,
                'moderation_status' => $o->moderation_status,
                'payment_url' => $o->payment_url,
                'created_at' => $o->created_at?->toDateTimeString(),
            ]);

        return $this->render($request, 'Cabinet/Promotions', 'Продвижение', [
            'products' => $products,
            'packages' => $packages,
            'active' => $active,
            'orders' => $orders,
            'has_publication' => $promotions->hasActivePublication($branch),
            'yookassa_configured' => app(YooKassaService::class)->configured(),
            'labels' => [
                'publication' => 'Публикация на сервисе',
                'boost' => 'Подъём «Рекомендуем»',
                'banner_home' => 'Баннер на главной',
                'banner_catalog' => 'Баннер в каталоге',
            ],
        ]);
    }

    public function checkout(Request $request, PromotionService $promotions): RedirectResponse
    {
        $branch = $this->branch($request);
        $data = $request->validate([
            'type' => 'required|in:product,package',
            'id' => 'required|integer|min:1',
            'banner_title' => 'nullable|string|max:120',
            'banner_url' => 'nullable|url|max:512',
            'banner_image' => 'nullable|image|max:4096',
        ]);

        $banner = [];
        $needsBanner = $this->needsBanner($data['type'], (int) $data['id']);
        if ($needsBanner) {
            $request->validate([
                'banner_image' => 'required|image|max:4096',
                'banner_title' => 'required|string|max:120',
                'banner_url' => 'required|url|max:512',
            ]);
            $banner['image_path'] = $request->file('banner_image')->store("promotion-banners/{$branch->id}", 'public');
            $banner['title'] = $data['banner_title'];
            $banner['url'] = $data['banner_url'];
        }

        $order = $promotions->createOrder($branch, $request->user(), $data['type'], (int) $data['id'], $banner);

        try {
            $order = $promotions->initiatePayment($order);
        } catch (\Throwable $e) {
            return back()->withErrors(['payment' => $e->getMessage()]);
        }

        if ($order->payment_url) {
            return redirect()->away($order->payment_url);
        }

        return back()->withErrors(['payment' => 'Не удалось получить ссылку на оплату.']);
    }

    public function return(Request $request, PromotionOrder $order, PromotionService $promotions): RedirectResponse
    {
        $branch = $this->branch($request);
        abort_unless((int) $order->clinic_id === (int) $branch->id, 404);

        $promotions->syncPayment($order);

        $message = $order->fresh()->isPaid()
            ? ($order->needsModeration() ? 'Оплата прошла. Баннер отправлен на модерацию.' : 'Оплата прошла. Услуга активирована.')
            : 'Оплата ещё обрабатывается. Обновите страницу через минуту.';

        return redirect()->route('cabinet.promotions')->with('success', $message);
    }

    private function needsBanner(string $type, int $id): bool
    {
        if ($type === 'product') {
            return (bool) PromotionProduct::query()->find($id)?->isBanner();
        }

        return false;
    }
}
