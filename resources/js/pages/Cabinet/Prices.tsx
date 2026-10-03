import { router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { PageHead, Table } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, SelectField, TextField } from '@/components/ui/Fields';
import { EmptyState } from '@/components/ui/Misc';
import { money } from '@/lib/format';

interface Price { id: number; service_id: number; name: string; specialty: string | null; price_from: number; price_to: number | null; is_promo: boolean; note: string | null }

export default function Prices({ prices, services }: { prices: Price[]; services: { id: number; name: string; specialty: string | null }[] }) {
    const form = useForm({ service_id: '', price_from: '', price_to: '', is_promo: false, note: '' });
    const add = (e: FormEvent) => {
        e.preventDefault();
        form.post('/clinic-cabinet/prices', { onSuccess: () => form.reset() });
    };
    return (
        <div className="stack-lg">
            <PageHead title="Услуги и прайс" text="Публикуем цену «от». Пациенту объясняем, что итог — после осмотра." />
            <form className="card form-grid" onSubmit={add}>
                <SelectField label="Услуга" required value={form.data.service_id} onChange={(e) => form.setData('service_id', e.target.value)} error={form.errors.service_id}>
                    <option value="">Выберите</option>
                    {services.map((s) => <option key={s.id} value={s.id}>{s.specialty ? `${s.specialty} · ` : ''}{s.name}</option>)}
                </SelectField>
                <TextField label="Цена от, ₽" type="number" required value={form.data.price_from} onChange={(e) => form.setData('price_from', e.target.value)} error={form.errors.price_from} />
                <TextField label="До, ₽" type="number" value={form.data.price_to} onChange={(e) => form.setData('price_to', e.target.value)} />
                <TextField label="Пометка" value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} />
                <Check label="Акция" checked={form.data.is_promo} onChange={(e) => form.setData('is_promo', e.target.checked)} />
                <Button type="submit" loading={form.processing}>Добавить</Button>
            </form>
            {prices.length === 0 ? <EmptyState title="Прайс пуст" /> : (
                <Table headers={['Услуга', 'От', 'До', '']}>
                    {prices.map((p) => (
                        <tr key={p.id}>
                            <td>{p.specialty ? <span className="text-xs text-muted">{p.specialty}<br /></span> : null}{p.name}{p.is_promo ? ' · акция' : ''}{p.note ? <div className="text-xs text-muted">{p.note}</div> : null}</td>
                            <td>{money(p.price_from)}</td>
                            <td>{p.price_to ? money(p.price_to) : '—'}</td>
                            <td className="actions"><Button size="sm" variant="ghost" onClick={() => router.delete(`/clinic-cabinet/prices/${p.id}`)}>Удалить</Button></td>
                        </tr>
                    ))}
                </Table>
            )}
        </div>
    );
}
