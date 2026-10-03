import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, TextField } from '@/components/ui/Fields';

interface Day { key: string; label: string; open: string | null; close: string | null; enabled: boolean }

export default function Schedule({ days, is_24_7, same_day }: { days: Day[]; is_24_7: boolean; same_day: boolean }) {
    const form = useForm({
        is_24_7,
        same_day,
        days: Object.fromEntries(days.map((d) => [d.key, { enabled: d.enabled, open: d.open ?? '09:00', close: d.close ?? '21:00' }])),
    });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.put('/clinic-cabinet/schedule');
    };
    return (
        <form className="card stack" onSubmit={submit}>
            <PageHead title="График работы" />
            <Check label="Круглосуточно" checked={form.data.is_24_7} onChange={(e) => form.setData('is_24_7', e.target.checked)} />
            <Check label="Можно записаться на сегодня" checked={form.data.same_day} onChange={(e) => form.setData('same_day', e.target.checked)} />
            {days.map((d) => (
                <div key={d.key} className="row row--wrap">
                    <Check label={d.label} checked={form.data.days[d.key]?.enabled} onChange={(e) => form.setData('days', { ...form.data.days, [d.key]: { ...form.data.days[d.key], enabled: e.target.checked } })} />
                    <TextField label="С" type="time" value={form.data.days[d.key]?.open ?? ''} onChange={(e) => form.setData('days', { ...form.data.days, [d.key]: { ...form.data.days[d.key], open: e.target.value } })} />
                    <TextField label="До" type="time" value={form.data.days[d.key]?.close ?? ''} onChange={(e) => form.setData('days', { ...form.data.days, [d.key]: { ...form.data.days[d.key], close: e.target.value } })} />
                </div>
            ))}
            <Button type="submit" loading={form.processing}>Сохранить график</Button>
        </form>
    );
}
