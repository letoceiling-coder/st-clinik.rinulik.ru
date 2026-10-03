export interface City {
    id: number;
    slug: string;
    name: string;
    name_in: string | null;
    region?: string | null;
}

export interface SharedUser {
    id: number;
    name: string;
    email: string;
    role: string;
    is_admin: boolean;
    is_clinic_owner: boolean;
    permissions: string[];
    unread: number;
}

export type CollectionKind = 'favorite' | 'compare';
export type EntityType = 'clinic' | 'doctor';
export type CollectionState = Record<CollectionKind, Record<EntityType, number[]>>;

export interface SeoProps {
    title?: string;
    description?: string;
    h1?: string;
    canonical?: string;
    robots?: string;
}

export interface SharedProps {
    app: { name: string; noindex: boolean; consent_version: string };
    auth: { user: SharedUser | null };
    city: City | null;
    cities: { slug: string; name: string; region: string | null }[];
    collections: CollectionState | null;
    flash: { success?: string | null; error?: string | null };
    seo?: SeoProps;
    errors: Record<string, string>;
    [key: string]: unknown;
}

export type Crumb = [string, string];

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
    next_page_url: string | null;
    prev_page_url: string | null;
    path: string;
}

export interface PhotoRef {
    kind: string;
    caption: string | null;
    art_seed: number;
    url: string | null;
}

export interface ClinicCardData {
    id: number;
    slug: string;
    name: string;
    tagline: string | null;
    address: string;
    district: string | null;
    metro: string | null;
    city: { slug: string; name: string; name_in: string | null } | null;
    phone: string | null;
    rating: number;
    reviews_count: number;
    doctors_count: number;
    min_price: number | null;
    is_verified: boolean;
    is_24_7: boolean;
    accepts_children: boolean;
    children_age_from: number | null;
    same_day: boolean;
    has_installment: boolean;
    installment_months: number | null;
    accepts_dms: boolean;
    has_sedation: boolean;
    has_anesthesia: boolean;
    has_microscope: boolean;
    has_ct: boolean;
    art_seed: number;
    achievements: string[];
    license: { number: string | null; confirmed: boolean; issuer?: string | null; date?: string | null };
    payment_methods: string[];
    today: string;
    specialties: { name: string; slug: string }[];
    top_services: { name: string; slug: string; price_from: number }[];
    doctors_preview: { slug: string; name: string; position: string; art_seed: number; rating: number }[];
    photos: PhotoRef[];
}

export interface PriceItem {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    duration_min: number | null;
    price_from: number;
    price_to: number | null;
    is_promo: boolean;
}

export interface DoctorData {
    id: number;
    slug: string;
    name: string;
    position: string;
    experience_years: number;
    rating: number;
    reviews_count: number;
    is_verified: boolean;
    accepts_children: boolean;
    children_age_from: number | null;
    consult_price: number | null;
    art_seed: number;
    achievements: string[];
    specialties: { name: string; slug: string }[];
    clinic: {
        id: number;
        slug: string;
        name: string;
        address: string;
        phone: string | null;
        city: { slug: string; name: string } | null;
        rating: number;
        is_verified: boolean;
        same_day: boolean;
    } | null;
    bio?: string | null;
    education?: string[];
    schedule_days?: string[];
}

export interface ClinicDetailData extends ClinicCardData {
    description: string | null;
    email: string | null;
    website: string | null;
    founded_year: number | null;
    lat: number | null;
    lng: number | null;
    restrictions: string | null;
    organization: { name: string; legal_name: string | null } | null;
    documents: { type: string; title: string; number: string | null; issued_at: string | null }[];
    week: { key: string; day: string; hours: string; today: boolean }[];
    doctors: DoctorData[];
    prices: { group: string; items: PriceItem[] }[];
}

export interface ReviewData {
    id: number;
    rating: number;
    title: string | null;
    body: string;
    author_name: string;
    visit_date: string | null;
    published_at: string | null;
    is_verified_visit: boolean;
    helpful_count: number;
    reply: { text: string; at: string | null } | null;
    doctor: { name: string; slug: string } | null;
    service: { name: string } | null;
    clinic: { name: string; slug: string } | null;
}

export interface ConcernData {
    slug: string;
    name: string;
    hint?: string | null;
    icon?: string | null;
}

export interface SpecialtyData {
    slug: string;
    name: string;
    short?: string | null;
    icon?: string | null;
    clinics?: number;
    price_from?: number | null;
}

export interface FilterOptions {
    districts: { slug: string; name: string }[];
    specialties: { slug: string; name: string }[];
    services: { slug: string; name: string; group: string | null }[];
}

export type Flat = Record<string, string | number | boolean | null | undefined>;
