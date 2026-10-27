<?php

namespace App\Policies;

use App\Models\Organization;
use App\Models\User;
use App\Services\Organization\CabinetAuthorization;

/** Авторизация действий в кабинете на уровне организации. */
class OrganizationPolicy
{
    public function __construct(
        private readonly CabinetAuthorization $authorization,
    ) {}

    public function manageOrganization(User $user, Organization $organization): bool
    {
        return $this->authorization->allows($user, $organization, CabinetAuthorization::ABILITY_MANAGE_ORGANIZATION);
    }

    public function manageStaff(User $user, Organization $organization): bool
    {
        return $this->authorization->allows($user, $organization, CabinetAuthorization::ABILITY_MANAGE_STAFF);
    }

    public function manageBilling(User $user, Organization $organization): bool
    {
        return $this->authorization->allows($user, $organization, CabinetAuthorization::ABILITY_MANAGE_BILLING);
    }

    public function managePromotions(User $user, Organization $organization): bool
    {
        return $this->authorization->allows($user, $organization, CabinetAuthorization::ABILITY_MANAGE_PROMOTIONS);
    }

    public function manageOperations(User $user, Organization $organization): bool
    {
        return $this->authorization->allows($user, $organization, CabinetAuthorization::ABILITY_MANAGE_OPERATIONS);
    }

    public function manageContent(User $user, Organization $organization): bool
    {
        return $this->authorization->allows($user, $organization, CabinetAuthorization::ABILITY_MANAGE_CONTENT);
    }
}
