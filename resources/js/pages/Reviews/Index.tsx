import { router, usePage } from '@inertiajs/react';
import ReviewCard from '@/components/ReviewCard';
import { Alert, Breadcrumbs, EmptyState, Pagination } from '@/components/ui/Misc';
import { useCity } from '@/lib/city';
import { cx } from '@/lib/format';
import type { Crumb, Flat, Paginated, ReviewData, SharedProps } from '@/lib/types';

export default function ReviewsIndex({ reviews, filters, breadcrumbs }: { reviews: Paginated<ReviewData>; filters: Flat; breadcrumbs: Crumb[] }) {
    const city = useCity();
    const { seo } = usePage<SharedProps>().props;
    const rating = filters.rating ? Number(filters.rating) : 0;

    const setRating = (value: number) =>
        router.get(`/${city.slug}/reviews`, value ? { rating: value } : {}, { preserveScroll: true, preserveState: true, replace: true });

    return (
        <>
            <Breadcrumbs items={breadcrumbs} />
            <header className="container page-head">
                <h1>{seo?.h1 ?? `Отзывы о стоматологиях ${city.nameIn}`}</h1>
                <p className="text-muted">Мы публикуем отзывы только после проверки модератором.</p>
            </header>

            <div className="container stack-lg" style={{ paddingBottom: 'var(--space-12)' }}>
                <div className="row row--wrap" role="group" aria-label="Фильтр по оценке">
                    <button type="button" className={cx('chip', !rating && 'is-active')} aria-pressed={!rating} onClick={() => setRating(0)}>
                        Все оценки
                    </button>
                    {[5, 4, 3, 2, 1].map((n) => (
                        <button key={n} type="button" className={cx('chip', rating === n && 'is-active')} aria-pressed={rating === n} onClick={() => setRating(n)}>
                            {n} ★
                        </button>
                    ))}
                </div>

                <Alert tone="muted" icon="shield">
                    Отзывы отражают личный опыт пациентов и не заменяют консультацию врача. Не публикуем диагнозы, медицинские документы и персональные данные.
                </Alert>

                {reviews.data.length === 0 ? (
                    <EmptyState icon="thumb" title="Отзывов пока нет" text="Будьте первым, кто поделится опытом, — откройте страницу клиники." />
                ) : (
                    <>
                        <div className="grid grid--reviews">
                            {reviews.data.map((r) => (
                                <ReviewCard key={r.id} review={r} showClinic />
                            ))}
                        </div>
                        <Pagination page={reviews} />
                    </>
                )}
            </div>
        </>
    );
}
