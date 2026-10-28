import { useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { PageHead } from '@/components/Dash';
import Icon from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { cx } from '@/lib/format';
import type { SharedProps } from '@/lib/types';

interface VariantRow {
    id: string;
    label: string;
    description: string;
    class: string;
}

const PREVIEW_PHOTO = '/images/demo/clinic-interior-02.jpg';

function PremiumCardPreview({ skinClass }: { skinClass: string }) {
    return (
        <article className={cx('clinic-card', 'clinic-card--tile', 'clinic-card--preview', skinClass)} aria-hidden="true">
            <div className="clinic-card__aside">
                <div className="clinic-card__media">
                    <img src={PREVIEW_PHOTO} alt="" className="clinic-card__photo" loading="lazy" width={400} height={300} />
                    <div className="clinic-card__premium-badge">
                        <span className="clinic-card__premium-badge-main">
                            <Icon name="crown" size={13} aria-hidden />
                            <span>Премиум</span>
                        </span>
                        <span className="clinic-card__premium-badge-sub">Премиум-размещение</span>
                    </div>
                </div>
            </div>
            <div className="clinic-card__body">
                <h3 className="clinic-card__title">
                    <span>МирКлиник «Пример»</span>
                </h3>
                <p className="clinic-card__address text-sm">ул. Примерная, 12 · 500 м</p>
                <div className="clinic-card__prices-wrap">
                    <div className="clinic-card__prices">
                        <div className="clinic-card__prices-head">
                            <span className="clinic-card__prices-label">
                                <Icon name="ruble" size={16} />
                                Приём и диагностика
                            </span>
                            <strong className="clinic-card__prices-from">от 500 ₽</strong>
                        </div>
                    </div>
                </div>
                <div className="clinic-card__actions">
                    <span className="btn btn--primary btn--sm">Записаться</span>
                </div>
            </div>
        </article>
    );
}

export default function ClinicCardAppearance({ variant, variants }: { variant: string; variants: VariantRow[] }) {
    const form = useForm({ variant });
    const { flash } = usePage<SharedProps>().props;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.put('/admin/clinic-card-appearance');
    };

    return (
        <form className="stack-lg premium-variant-page" onSubmit={submit}>
            <PageHead
                title="Премиум-карточки клиник"
                text="Выберите визуальный стиль для клиник с премиальным размещением (бонус с отметкой «Премиум» в справочнике). Обычные карточки не меняются."
            />
            {flash.success ? <p className="text-sm text-success">{flash.success}</p> : null}
            <div className="premium-variant-picker" role="radiogroup" aria-label="Стиль премиальной карточки">
                {variants.map((row) => {
                    const selected = form.data.variant === row.id;
                    return (
                        <label key={row.id} className={cx('premium-variant-picker__item', selected && 'is-selected')}>
                            <input
                                type="radio"
                                className="premium-variant-picker__input"
                                name="variant"
                                value={row.id}
                                checked={selected}
                                onChange={() => form.setData('variant', row.id)}
                            />
                            <span className="premium-variant-picker__check" aria-hidden="true">
                                {selected ? <Icon name="check" size={16} /> : null}
                            </span>
                            <div className="premium-variant-picker__preview">
                                <PremiumCardPreview skinClass={row.class} />
                            </div>
                            <span className="premium-variant-picker__meta stack-sm">
                                <strong>{row.label}</strong>
                                <span className="text-sm text-muted">{row.description}</span>
                            </span>
                        </label>
                    );
                })}
            </div>
            <Button type="submit" loading={form.processing}>
                Сохранить стиль
            </Button>
        </form>
    );
}
