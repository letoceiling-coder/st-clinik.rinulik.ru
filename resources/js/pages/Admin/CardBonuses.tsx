import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { PageHead, Table } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check } from '@/components/ui/Fields';

interface TypeRow {
    id: number;
    code: string;
    name: string;
    placement: string;
    is_active: boolean;
    triggers_premium: boolean;
    requires_calendar: boolean;
}

export default function AdminCardBonuses({ types = [] }: { types?: TypeRow[] }) {
    const form = useForm({
        types: types.map((t) => ({
            id: t.id,
            is_active: t.is_active,
            triggers_premium: t.triggers_premium,
        })),
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.put('/admin/card-bonuses');
    };

    return (
        <form className="stack-lg" onSubmit={submit}>
            <PageHead
                title="Бонусы на карточках клиник"
                text="Включите типы акций для ЛК клиник. Отметка «Премиум» выделяет карточку на главной и в каталоге, если клиника включила такой бонус."
            />
            <Table headers={['Тип', 'Код', 'Где показывается', 'Активен', 'Премиум-оформление']}>
                {types.map((type, index) => (
                    <tr key={type.id}>
                        <td>{type.name}</td>
                        <td>{type.code}</td>
                        <td>{type.placement === 'features' ? 'Особенности' : 'Полоска акций'}</td>
                        <td>
                            <Check
                                label=""
                                checked={form.data.types[index]?.is_active ?? false}
                                onChange={(e) => {
                                    const next = [...form.data.types];
                                    next[index] = { ...next[index], is_active: e.target.checked };
                                    form.setData('types', next);
                                }}
                            />
                        </td>
                        <td>
                            <Check
                                label=""
                                checked={form.data.types[index]?.triggers_premium ?? false}
                                onChange={(e) => {
                                    const next = [...form.data.types];
                                    next[index] = { ...next[index], triggers_premium: e.target.checked };
                                    form.setData('types', next);
                                }}
                            />
                        </td>
                    </tr>
                ))}
            </Table>
            <Button type="submit" loading={form.processing}>Сохранить</Button>
        </form>
    );
}
