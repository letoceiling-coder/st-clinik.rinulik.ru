<?php

namespace App\Models;

use App\Notifications\ResetPasswordNotification;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasFactory;
    use Notifiable;

    protected $guarded = ['id', 'role', 'status'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'consent_at' => 'datetime',
            'last_login_at' => 'datetime',
            'notify_email' => 'boolean',
            'notify_leads' => 'boolean',
            'password' => 'hashed',
        ];
    }

    public function roleModel(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role', 'slug');
    }

    public function organization(): HasOne
    {
        return $this->hasOne(Organization::class, 'owner_id');
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function socialAccounts(): HasMany
    {
        return $this->hasMany(SocialAccount::class);
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function collections(): HasMany
    {
        return $this->hasMany(UserCollection::class);
    }

    public function notificationsList(): HasMany
    {
        return $this->hasMany(UserNotification::class);
    }

    /** @return list<string> */
    public function permissions(): array
    {
        $role = $this->roleModel;

        return $role?->permissions ?? [];
    }

    public function hasPermission(string $permission): bool
    {
        $permissions = $this->permissions();

        return in_array('*', $permissions, true) || in_array($permission, $permissions, true);
    }

    public function hasAnyAdminPermission(): bool
    {
        return count($this->permissions()) > 0;
    }

    public function usesPlaceholderEmail(): bool
    {
        return str_ends_with(strtolower((string) $this->email), '.local');
    }

    public function sendEmailVerificationNotification(): void
    {
        if ($this->usesPlaceholderEmail()) {
            return;
        }

        $this->notify(new VerifyEmailNotification);
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    public function isSuperadmin(): bool
    {
        return $this->role === 'superadmin';
    }

    public function isClinicOwner(): bool
    {
        return $this->role === 'clinic_owner' || $this->isSuperadmin();
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
