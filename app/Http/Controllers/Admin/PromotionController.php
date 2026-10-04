<?php

namespace App\Http\Controllers\Admin;

use App\Models\City;
use App\Models\PromotionOrder;
use App\Models\PromotionPackage;
use App\Models\PromotionPrice;
use App\Models\PromotionProduct;
use App\Models\PromotionSetting;
use App\Services\Audit;
use App\Services\PromotionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Response;

class PromotionController extends AdminController
{
    public function index(): Response
    {
        $products = PromotionProduct::query()->orderBy('sort')->get();
        $packages = PromotionPackage::query()->with('products:id,name,code')->orderBy('sort')->get();
        $prices = PromotionPrice::query()->with('city:id,name')->orderBy('priceable_type')->orderBy('priceable_id')->get()->map(fn (PromotionPrice $p) => [
            'id' => $p->id,
            'priceable_type' => $p->priceable_type,
            'priceable_id' => $p->priceable_id,
            'city_id' => $p->city_id,
            'city_name' => $p->city?->name ?? 'По умолчанию',
            'price' => $p->price,
            'is_active' => $p->is_active,
        ]);

        $settings = PromotionSetting::query()->with('city:id,name')->orderByRaw('city_id is null desc')->get()->map(fn (PromotionSetting $s) => [
            'id' => $s->id,
            'city_id' => $s->city_id,
            'city_name' => $s->city?->name ?? 'По умолчанию',
            'max_boost' => $s->max_boost,
            'max_banner_home' => $s->max_banner_home,
            'max_banner_catalog' => $s->max_banner_catalog,
        ]);

        $pending = PromotionOrder::query()
            ->where('status', 'paid')
            ->where('moderation_status', 'pending')
            ->with(['clinic:id,name,slug', 'city:id,name'])
            ->latest()
            ->get()
            ->map(fn (PromotionOrder $o) => [
                'id' => $o->id,
                'clinic' => $o->clinic?->only(['id', 'name', 'slug']),
                'city' => $o->city?->name,
                'banner_title' => $o->banner_title,
                'banner_url' => $o->banner_url,
                'banner_image_url' => $o->banner_image_path ? Storage::disk('public')->url($o->banner_image_path) : null,
                'paid_at' => $o->paid_at?->toDateTimeString(),
            ]);

        return $this->render('Admin/Promotions', 'Продвижение и тарифы', [
            'products' => $products,
            'packages' => $packages,
            'prices' => $prices,
            'settings' => $settings,
            'pending_orders' => $pending,
            'cities' => City::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function storeProduct(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => 'required|string|max:32|regex:/^[a-z0-9_]+$/|unique:promotion_products,code',
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:2000',
            'duration_days' => 'required|integer|min:1|max:365',
            'requires_moderation' => 'boolean',
            'is_active' => 'boolean',
            'sort' => 'nullable|integer|min:0|max:9999',
        ]);

        PromotionProduct::create($data);
        Audit::log('promotion.product.created', null, ['code' => $data['code']]);

        return back()->with('success', 'Тариф добавлен.');
    }

    public function updateProduct(Request $request, PromotionProduct $product): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:2000',
            'duration_days' => 'required|integer|min:1|max:365',
            'requires_moderation' => 'boolean',
            'is_active' => 'boolean',
            'sort' => 'nullable|integer|min:0|max:9999',
        ]);

        $product->update($data);

        return back()->with('success', 'Тариф обновлён.');
    }

    public function storePackage(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => 'required|string|max:32|regex:/^[a-z0-9_]+$/|unique:promotion_packages,code',
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:2000',
            'duration_days' => 'required|integer|min:1|max:1095',
            'is_active' => 'boolean',
            'sort' => 'nullable|integer|min:0|max:9999',
        ]);

        PromotionPackage::create($data);

        return back()->with('success', 'Пакет публикации добавлен.');
    }

    public function updatePackage(Request $request, PromotionPackage $package): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:2000',
            'duration_days' => 'required|integer|min:1|max:1095',
            'is_active' => 'boolean',
            'sort' => 'nullable|integer|min:0|max:9999',
        ]);

        $package->update($data);
        $package->products()->detach();

        return back()->with('success', 'Пакет публикации обновлён.');
    }

    public function storePrice(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'priceable_type' => 'required|in:product,package',
            'priceable_id' => 'required|integer|min:1',
            'city_id' => 'nullable|integer|exists:cities,id',
            'price' => 'required|integer|min:100',
            'is_active' => 'boolean',
        ]);

        PromotionPrice::updateOrCreate(
            [
                'priceable_type' => $data['priceable_type'],
                'priceable_id' => $data['priceable_id'],
                'city_id' => $data['city_id'] ?? null,
            ],
            ['price' => $data['price'], 'is_active' => $data['is_active'] ?? true],
        );

        return back()->with('success', 'Цена сохранена.');
    }

    public function destroyPrice(PromotionPrice $price): RedirectResponse
    {
        $price->delete();

        return back()->with('success', 'Цена удалена.');
    }

    public function storeSetting(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'city_id' => 'nullable|integer|exists:cities,id',
            'max_boost' => 'required|integer|min:0|max:50',
            'max_banner_home' => 'required|integer|min:0|max:20',
            'max_banner_catalog' => 'required|integer|min:0|max:20',
        ]);

        PromotionSetting::updateOrCreate(
            ['city_id' => $data['city_id'] ?? null],
            collect($data)->except('city_id')->all(),
        );

        return back()->with('success', 'Лимиты сохранены.');
    }

    public function approveOrder(Request $request, PromotionOrder $order, PromotionService $promotions): RedirectResponse
    {
        abort_unless($order->status === 'paid' && $order->moderation_status === 'pending', 422);

        $data = $request->validate(['note' => 'nullable|string|max:500']);
        $promotions->approveOrder($order, $data['note'] ?? null);
        Audit::log('promotion.order.approved', $order);

        return back()->with('success', 'Баннер опубликован.');
    }

    public function rejectOrder(Request $request, PromotionOrder $order, PromotionService $promotions): RedirectResponse
    {
        abort_unless($order->status === 'paid' && $order->moderation_status === 'pending', 422);

        $data = $request->validate(['note' => 'required|string|max:500']);
        $promotions->rejectOrder($order, $data['note']);
        Audit::log('promotion.order.rejected', $order);

        return back()->with('success', 'Заявка отклонена.');
    }
}
