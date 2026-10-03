import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, SelectField, TextArea, TextField } from '@/components/ui/Fields';

type Branch = Record<string, unknown> & {
    id?: number;
    name?: string;
    specialty_ids?: number[];
    payment_methods?: string[];
    achievements?: string[];
};

export default function BranchForm({
    branchForm,
    cities,
    districts,
    specialties,
    payments,
}: {
    branchForm: Branch | null;
    cities: { id: number; name: string }[];
    districts: { id: number; city_id: number; name: string }[];
    specialties: { id: number; name: string }[];
    payments: string[];
}) {
    const b = branchForm ?? {};
    const form = useForm<Record<string, any>>({
        name: (b.name as string) ?? '',
        tagline: (b.tagline as string) ?? '',
        description: (b.description as string) ?? '',
        city_id: (b.city_id as number) ?? '',
        district_id: (b.district_id as number) ?? '',
        address: (b.address as string) ?? '',
        metro: (b.metro as string) ?? '',
        phone: (b.phone as string) ?? '',
        email: (b.email as string) ?? '',
        website: (b.website as string) ?? '',
        founded_year: (b.founded_year as number) ?? '',
        license_number: (b.license_number as string) ?? '',
        license_issuer: (b.license_issuer as string) ?? '',
        license_date: (b.license_date as string) ?? '',
        restrictions: (b.restrictions as string) ?? '',
        payment_methods: (b.payment_methods as string[]) ?? [],
        achievements: ((b.achievements as string[]) ?? ['']).join('\n'),
        specialty_ids: ((b.specialty_ids as number[]) ?? []).map(String),
        accepts_children: Boolean(b.accepts_children),
        children_age_from: (b.children_age_from as number) ?? '',
        has_installment: Boolean(b.has_installment),
        installment_months: (b.installment_months as number) ?? '',
        accepts_dms: Boolean(b.accepts_dms),
        has_sedation: Boolean(b.has_sedation),
        has_anesthesia: Boolean(b.has_anesthesia),
        has_microscope: Boolean(b.has_microscope),
        has_ct: Boolean(b.has_ct),
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const payload = {
            ...form.data,
            achievements: String(form.data.achievements).split('\n').map((s: string) => s.trim()).filter(Boolean),
            specialty_ids: form.data.specialty_ids.map(Number),
        };
        form.transform(() => payload);
        if (b.id) form.put(`/clinic-cabinet/branches/${b.id}`);
        else form.post('/clinic-cabinet/branches');
    };

    const cityDistricts = districts.filter((d) => String(d.city_id) === String(form.data.city_id));
    const togglePay = (p: string) => form.setData('payment_methods', form.data.payment_methods.includes(p) ? form.data.payment_methods.filter((x: string) => x !== p) : [...form.data.payment_methods, p]);
    const toggleSpec = (id: string) => form.setData('specialty_ids', form.data.specialty_ids.includes(id) ? form.data.specialty_ids.filter((x: string) => x !== id) : [...form.data.specialty_ids, id]);

    return (
        <form className="stack-lg" onSubmit={submit}>
            <PageHead title={b.id ? 'Редактирование филиала' : 'Новый филиал'} text="Не публикуйте диагнозы и сканы паспортов пациентов. Лицензию загружайте в «Документы»." />
            <section className="card form-grid">
                <TextField className="span-2" label="Название" required value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} />
                <TextField className="span-2" label="Короткий слоган" value={form.data.tagline} onChange={(e) => form.setData('tagline', e.target.value)} />
                <TextArea className="span-2" label="Описание" value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
                <SelectField label="Город" required value={form.data.city_id} onChange={(e) => form.setData('city_id', e.target.value)} error={form.errors.city_id}>
                    <option value="">Выберите</option>
                    {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectField>
                <SelectField label="Район" value={form.data.district_id} onChange={(e) => form.setData('district_id', e.target.value)}>
                    <option value="">Не указан</option>
                    {cityDistricts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </SelectField>
                <TextField className="span-2" label="Адрес" required value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} error={form.errors.address} />
                <TextField label="Метро" value={form.data.metro} onChange={(e) => form.setData('metro', e.target.value)} />
                <TextField label="Телефон" required value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} error={form.errors.phone} />
                <TextField label="E-mail" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
                <TextField label="Сайт" value={form.data.website} onChange={(e) => form.setData('website', e.target.value)} />
                <TextField label="Год основания" type="number" value={form.data.founded_year} onChange={(e) => form.setData('founded_year', e.target.value)} />
                <TextField label="Номер лицензии" value={form.data.license_number} onChange={(e) => form.setData('license_number', e.target.value)} />
                <TextField label="Кем выдана" value={form.data.license_issuer} onChange={(e) => form.setData('license_issuer', e.target.value)} />
                <TextField label="Дата лицензии" type="date" value={form.data.license_date} onChange={(e) => form.setData('license_date', e.target.value)} />
                <TextArea className="span-2" label="Ограничения приёма" hint="Например: не принимаем детей младше 3 лет, нет наркоза." value={form.data.restrictions} onChange={(e) => form.setData('restrictions', e.target.value)} />
                <TextArea className="span-2" label="Достижения (каждое с новой строки)" value={form.data.achievements} onChange={(e) => form.setData('achievements', e.target.value)} />
            </section>
            <section className="card stack">
                <h2 className="card-title">Направления</h2>
                <div className="check-grid">
                    {specialties.map((s) => <Check key={s.id} label={s.name} checked={form.data.specialty_ids.includes(String(s.id))} onChange={() => toggleSpec(String(s.id))} />)}
                </div>
            </section>
            <section className="card stack">
                <h2 className="card-title">Условия</h2>
                <div className="check-grid">
                    <Check label="Детский приём" checked={form.data.accepts_children} onChange={(e) => form.setData('accepts_children', e.target.checked)} />
                    <Check label="Рассрочка" checked={form.data.has_installment} onChange={(e) => form.setData('has_installment', e.target.checked)} />
                    <Check label="ДМС" checked={form.data.accepts_dms} onChange={(e) => form.setData('accepts_dms', e.target.checked)} />
                    <Check label="Седация" checked={form.data.has_sedation} onChange={(e) => form.setData('has_sedation', e.target.checked)} />
                    <Check label="Наркоз" checked={form.data.has_anesthesia} onChange={(e) => form.setData('has_anesthesia', e.target.checked)} />
                    <Check label="Микроскоп" checked={form.data.has_microscope} onChange={(e) => form.setData('has_microscope', e.target.checked)} />
                    <Check label="КТ" checked={form.data.has_ct} onChange={(e) => form.setData('has_ct', e.target.checked)} />
                </div>
                {form.data.accepts_children ? <TextField label="Дети с какого возраста" type="number" value={form.data.children_age_from} onChange={(e) => form.setData('children_age_from', e.target.value)} /> : null}
                {form.data.has_installment ? <TextField label="Рассрочка, мес." type="number" value={form.data.installment_months} onChange={(e) => form.setData('installment_months', e.target.value)} /> : null}
                <div className="check-grid">
                    {payments.map((p) => <Check key={p} label={p} checked={form.data.payment_methods.includes(p)} onChange={() => togglePay(p)} />)}
                </div>
            </section>
            <Button type="submit" size="lg" loading={form.processing}>Сохранить</Button>
        </form>
    );
}
