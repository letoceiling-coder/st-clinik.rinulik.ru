<?php

namespace App\Services\Auth;

use App\Models\SocialAccount;
use App\Models\User;
use App\Services\Audit;
use App\Services\Notifications\NotificationSubscriptionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SocialAuthService
{
    public const PROVIDERS = ['yandex', 'vk', 'max'];

    public function findAccount(string $provider, string $providerUserId): ?SocialAccount
    {
        return SocialAccount::query()
            ->where('provider', $provider)
            ->where('provider_user_id', $providerUserId)
            ->first();
    }

    /** @return list<SocialAccount> */
    public function accountsFor(User $user): array
    {
        return SocialAccount::query()
            ->where('user_id', $user->id)
            ->orderBy('provider')
            ->get()
            ->all();
    }

    public function hasPassword(User $user): bool
    {
        return filled($user->password);
    }

    public function canUnlink(User $user, string $provider): bool
    {
        $others = SocialAccount::query()
            ->where('user_id', $user->id)
            ->where('provider', '!=', $provider)
            ->exists();

        return $others || $this->hasPassword($user);
    }

    /**
     * @return array{action: string, user?: User, account?: SocialAccount}
     */
    public function resolveLogin(SocialProfile $profile, ?User $currentUser): array
    {
        $existing = $this->findAccount($profile->provider, $profile->providerUserId);

        if ($currentUser !== null) {
            if ($existing !== null && (int) $existing->user_id !== (int) $currentUser->id) {
                throw ValidationException::withMessages([
                    'provider' => 'Этот аккаунт уже привязан к другому пользователю.',
                ]);
            }

            $account = $existing ?? $this->link($currentUser, $profile);

            return ['action' => 'linked', 'user' => $currentUser, 'account' => $account];
        }

        if ($existing !== null) {
            $user = $existing->user;
            $this->touchAccount($existing, $profile);

            return ['action' => 'login', 'user' => $user, 'account' => $existing];
        }

        $email = $profile->normalizedEmail();
        if ($email !== null && $profile->emailVerified) {
            $match = User::query()->where('email', $email)->first();
            if ($match !== null) {
                return ['action' => 'link_prompt', 'user' => $match];
            }
        }

        $user = $this->createUserFromProfile($profile);
        $account = $this->link($user, $profile);

        return ['action' => 'registered', 'user' => $user, 'account' => $account];
    }

    public function link(User $user, SocialProfile $profile): SocialAccount
    {
        return DB::transaction(function () use ($user, $profile) {
            $account = SocialAccount::query()->updateOrCreate(
                [
                    'provider' => $profile->provider,
                    'provider_user_id' => $profile->providerUserId,
                ],
                [
                    'user_id' => $user->id,
                    'email' => $profile->normalizedEmail(),
                    'phone' => $profile->phone,
                    'name' => $profile->name,
                    'avatar' => $profile->avatar,
                    'access_token' => $profile->accessToken,
                    'refresh_token' => $profile->refreshToken,
                    'raw' => $profile->raw,
                    'linked_at' => now(),
                ],
            );

            Audit::log('auth.social_linked', $user, ['provider' => $profile->provider]);

            if ($profile->provider === 'max') {
                app(NotificationSubscriptionService::class)->activateMax($user, $profile->providerUserId);
            }

            return $account;
        });
    }

    public function unlink(User $user, string $provider): void
    {
        abort_unless(in_array($provider, self::PROVIDERS, true), 404);
        abort_unless($this->canUnlink($user, $provider), 422, 'Нельзя отвязать последний способ входа без пароля.');

        SocialAccount::query()
            ->where('user_id', $user->id)
            ->where('provider', $provider)
            ->delete();

        Audit::log('auth.social_unlinked', $user, ['provider' => $provider]);
    }

    public function confirmLinkWithPassword(User $user, SocialProfile $profile, string $password): SocialAccount
    {
        if (! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages(['password' => 'Неверный пароль.']);
        }

        $existing = $this->findAccount($profile->provider, $profile->providerUserId);
        if ($existing !== null && (int) $existing->user_id !== (int) $user->id) {
            throw ValidationException::withMessages([
                'provider' => 'Этот аккаунт уже привязан к другому пользователю.',
            ]);
        }

        return $this->link($user, $profile);
    }

    private function createUserFromProfile(SocialProfile $profile): User
    {
        $email = $profile->normalizedEmail();
        if ($email === null) {
            $email = sprintf('%s_%s@%s.local', $profile->provider, $profile->providerUserId, Str::slug(config('app.name', 'app')));
        }

        $user = new User([
            'name' => $profile->name ?: 'Пользователь',
            'email' => $email,
            'phone' => $profile->phone,
            'consent_at' => now(),
            'consent_version' => '2026-10',
            'email_verified_at' => $profile->emailVerified && str_contains($email, '@') && ! str_ends_with($email, '.local') ? now() : null,
        ]);
        $user->forceFill(['role' => 'user', 'status' => 'active'])->save();

        Audit::log('auth.social_register', $user, ['provider' => $profile->provider]);

        return $user;
    }

    private function touchAccount(SocialAccount $account, SocialProfile $profile): void
    {
        $account->forceFill([
            'email' => $profile->normalizedEmail() ?? $account->email,
            'phone' => $profile->phone ?? $account->phone,
            'name' => $profile->name ?? $account->name,
            'avatar' => $profile->avatar ?? $account->avatar,
            'access_token' => $profile->accessToken ?? $account->access_token,
            'refresh_token' => $profile->refreshToken ?? $account->refresh_token,
            'raw' => $profile->raw ?? $account->raw,
        ])->save();
    }
}
