import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, TextArea, TextField } from '@/components/ui/Fields';

export default function DoctorForm({
    doctorForm,
    specialties,
    weekdays,
}: {
    doctorForm: Record<string, unknown> | null;
    specialties: { id: number; name: string }[];
    weekdays: Record<string, string>;
}) {
    const d = doctorForm ?? {};
    const form = useForm<Record<string, any>>({
        name: (d.name as string) ?? '',
        position: (d.position as string) ?? '',
        experience_years: (d.experience_years as number) ?? '',
        bio: (d.bio as string) ?? '',
        education: ((d.education as string[]) ?? ['']).join('\n'),
        achievements: ((d.achievements as string[]) ?? ['']).join('\n'),
        schedule_days: (d.schedule_days as string[]) ?? [],
        accepts_children: Boolean(d.accepts_children),
        children_age_from: (d.children_age_from as number) ?? '',
        consult_price: (d.consult_price as number) ?? '',
        specialty_ids: ((d.specialty_ids as number[]) ?? []).map(String),
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const payload = {
            ...form.data,
            education: String(form.data.education).split('\n').map((s: string) => s.trim()).filter(Boolean),
            achievements: String(form.data.achievements).split('\n').map((s: string) => s.trim()).filter(Boolean),
            specialty_ids: form.data.specialty_ids.map(Number),
        };
        form.transform(() => payload);
        if (d.id) form.put(`/clinic-cabinet/doctors/${d.id}`);
        else form.post('/clinic-cabinet/doctors');
    };

    return (
        <form className="card stack" onSubmit={submit}>
            <PageHead title={d.id ? 'Редактирование врача' : 'Новый врач'} />
            <TextField label="ФИО" required value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} />
            <TextField label="Должность" required value={form.data.position} onChange={(e) => form.setData('position', e.target.value)} error={form.errors.position} />
            <TextField label="Стаж, лет" type="number" required value={form.data.experience_years} onChange={(e) => form.setData('experience_years', e.target.value)} error={form.errors.experience_years} />
            <TextField label="Приём от, ₽" type="number" value={form.data.consult_price} onChange={(e) => form.setData('consult_price', e.target.value)} />
            <TextArea label="О враче" value={form.data.bio} onChange={(e) => form.setData('bio', e.target.value)} />
            <TextArea label="Образование (с новой строки)" value={form.data.education} onChange={(e) => form.setData('education', e.target.value)} />
            <TextArea label="Достижения (с новой строки)" value={form.data.achievements} onChange={(e) => form.setData('achievements', e.target.value)} />
            <div className="check-grid">
                {specialties.map((s) => (
                    <Check key={s.id} label={s.name} checked={form.data.specialty_ids.includes(String(s.id))} onChange={() => form.setData('specialty_ids', form.data.specialty_ids.includes(String(s.id)) ? form.data.specialty_ids.filter((x: string) => x !== String(s.id)) : [...form.data.specialty_ids, String(s.id)])} />
                ))}
            </div>
            {form.errors.specialty_ids ? <p className="field__error">{form.errors.specialty_ids}</p> : null}
            <div className="check-grid">
                {Object.entries(weekdays).map(([k, v]) => (
                    <Check key={k} label={v} checked={form.data.schedule_days.includes(k)} onChange={() => form.setData('schedule_days', form.data.schedule_days.includes(k) ? form.data.schedule_days.filter((x: string) => x !== k) : [...form.data.schedule_days, k])} />
                ))}
            </div>
            <Check label="Принимает детей" checked={form.data.accepts_children} onChange={(e) => form.setData('accepts_children', e.target.checked)} />
            {form.data.accepts_children ? <TextField label="С какого возраста" type="number" value={form.data.children_age_from} onChange={(e) => form.setData('children_age_from', e.target.value)} /> : null}
            <Button type="submit" loading={form.processing}>Сохранить</Button>
        </form>
    );
}
