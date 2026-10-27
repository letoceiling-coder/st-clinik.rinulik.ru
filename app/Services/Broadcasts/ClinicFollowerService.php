<?php

namespace App\Services\Broadcasts;

use App\Models\Clinic;
use App\Models\ClinicFollower;
use App\Models\User;
use App\Services\Notifications\NotificationPreferenceService;

class ClinicFollowerService
{
    public function __construct(private readonly NotificationPreferenceService $preferences) {}

    public function subscribe(User $user, Clinic $clinic): ClinicFollower
    {
        $channels = $this->preferences->availableOutboundChannels($user);
        abort_if($channels === [], 422, 'Подключите email, MAX или push-уведомления в профиле.');

        return ClinicFollower::query()->updateOrCreate(
            ['user_id' => $user->id, 'clinic_id' => $clinic->id],
            [
                'channels' => $channels,
                'subscribed_at' => now(),
            ],
        );
    }

    public function unsubscribe(User $user, Clinic $clinic): void
    {
        ClinicFollower::query()
            ->where('user_id', $user->id)
            ->where('clinic_id', $clinic->id)
            ->delete();
    }

    public function isFollowing(User $user, Clinic $clinic): bool
    {
        return ClinicFollower::query()
            ->where('user_id', $user->id)
            ->where('clinic_id', $clinic->id)
            ->exists();
    }

    public function followerCount(Clinic $clinic): int
    {
        return ClinicFollower::query()->where('clinic_id', $clinic->id)->count();
    }

    /** @return list<array{id: int, name: string, slug: string, channels: list<string>, subscribed_at: string}> */
    public function listForUser(User $user): array
    {
        return ClinicFollower::query()
            ->where('user_id', $user->id)
            ->with('clinic:id,name,slug')
            ->orderByDesc('subscribed_at')
            ->get()
            ->map(fn (ClinicFollower $f) => [
                'id' => $f->clinic_id,
                'name' => $f->clinic?->name ?? 'Клиника',
                'slug' => $f->clinic?->slug ?? '',
                'channels' => is_array($f->channels) ? $f->channels : [],
                'subscribed_at' => $f->subscribed_at?->format('d.m.Y') ?? '',
            ])
            ->all();
    }
}
