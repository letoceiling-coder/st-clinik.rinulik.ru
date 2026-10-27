import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, TextArea, TextField } from '@/components/ui/Fields';
import { Badge } from '@/components/ui/Misc';

interface BonusTypeRow {
    id: number;
    code: string;
    name: string;
    default_short_label: string;
    placement: string;
    is_active: boolean;
    triggers_premium: boolean;
    requires_calendar: boolean;
    enabled: boolean;
    short_label: string;
    description: string;
}

export default function CardBonuses({ types, help }: { types: BonusTypeRow[]; help: string }) {
    const form = useForm({
        bonuses: types.map((t) => ({
            type_id: t.id,
            enabled: t.enabled,
            short_label: t.short_label,
            description: t.description,
        })),
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.put('/clinic-cabinet/card-bonuses');
    };

    return (
        <form className="stack-lg" onSubmit={submit}>
            <PageHead title="Бонусы на карточке" text={help} />
            {types.map((type, index) => (
                <section key={type.id} className="card stack">
                    <div className="row row--between row--wrap">
                        <div>
                            <h2 className="h3">{type.name}</h2>
                            <p className="text-sm text-muted">
                                {type.placement === 'features' ? 'Блок особенностей' : 'Полоска акций'}
                                {type.requires_calendar ? ' · проверка по календарю' : ''}
                            </p>
                        </div>
                        <div className="row row--wrap">
                            {!type.is_active ? <Badge tone="warning">Отключено админом</Badge> : null}
                            {type.triggers_premium ? <Badge tone="primary">Премиум-карточка</Badge> : null}
                        </div>
                    </div>
                    <Check
                        label="Показывать на карточке"
                        checked={form.data.bonuses[index]?.enabled ?? false}
                        disabled={!type.is_active}
                        onChange={(e) => {
                            const bonuses = [...form.data.bonuses];
                            bonuses[index] = { ...bonuses[index], enabled: e.target.checked };
                            form.setData('bonuses', bonuses);
                        }}
                    />
                    <TextField
                        label="Короткая подпись на карточке"
                        value={form.data.bonuses[index]?.short_label ?? ''}
                        onChange={(e) => {
                            const bonuses = [...form.data.bonuses];
                            bonuses[index] = { ...bonuses[index], short_label: e.target.value };
                            form.setData('bonuses', bonuses);
                        }}
                    />
                    <TextArea
                        label="Описание для пользователя (попап)"
                        value={form.data.bonuses[index]?.description ?? ''}
                        onChange={(e) => {
                            const bonuses = [...form.data.bonuses];
                            bonuses[index] = { ...bonuses[index], description: e.target.value };
                            form.setData('bonuses', bonuses);
                        }}
                    />
                </section>
            ))}
            <Button type="submit" loading={form.processing}>Сохранить</Button>
        </form>
    );
}
