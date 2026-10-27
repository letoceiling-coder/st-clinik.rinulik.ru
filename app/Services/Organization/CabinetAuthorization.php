<?php

namespace App\Services\Organization;

use App\Models\Organization;
use App\Models\OrganizationStaff;
use App\Models\User;

/** Права сотрудников организации в кабинете клиники. */
class CabinetAuthorization
{
    public const ABILITY_MANAGE_ORGANIZATION = 'manage_organization';

    public const ABILITY_MANAGE_STAFF = 'manage_staff';

    public const ABILITY_MANAGE_BILLING = 'manage_billing';

    public const ABILITY_MANAGE_PROMOTIONS = 'manage_promotions';

    public const ABILITY_MANAGE_OPERATIONS = 'manage_operations';

    public const ABILITY_MANAGE_CONTENT = 'manage_content';

    public const ABILITY_MANAGE_SCHEDULE = 'manage_schedule';

    /** @var array<string, list<string>> */
    private const ROLE_ABILITIES = [
        OrganizationStaff::ROLE_OWNER => ['*'],
        OrganizationStaff::ROLE_ADMIN => ['*'],
        OrganizationStaff::ROLE_MANAGER => [
            self::ABILITY_MANAGE_OPERATIONS,
            self::ABILITY_MANAGE_SCHEDULE,
        ],
        OrganizationStaff::ROLE_CONTENT => [
            self::ABILITY_MANAGE_CONTENT,
            self::ABILITY_MANAGE_SCHEDULE,
        ],
    ];

    public function __construct(
        private readonly OrganizationStaffService $staffService,
    ) {}

    public function roleFor(User $user, Organization $organization): ?string
    {
        return $this->staffService->roleFor($user, $organization);
    }

    public function allows(User $user, Organization $organization, string $ability): bool
    {
        $role = $this->roleFor($user, $organization);
        if ($role === null) {
            return false;
        }

        $abilities = self::ROLE_ABILITIES[$role] ?? [];

        return in_array('*', $abilities, true) || in_array($ability, $abilities, true);
    }

    /** @return list<string> */
    public function grantedAbilities(User $user, Organization $organization): array
    {
        $role = $this->roleFor($user, $organization);
        if ($role === null) {
            return [];
        }

        $abilities = self::ROLE_ABILITIES[$role] ?? [];
        if (in_array('*', $abilities, true)) {
            return [
                self::ABILITY_MANAGE_ORGANIZATION,
                self::ABILITY_MANAGE_STAFF,
                self::ABILITY_MANAGE_BILLING,
                self::ABILITY_MANAGE_PROMOTIONS,
                self::ABILITY_MANAGE_OPERATIONS,
                self::ABILITY_MANAGE_CONTENT,
                self::ABILITY_MANAGE_SCHEDULE,
            ];
        }

        return $abilities;
    }
}
