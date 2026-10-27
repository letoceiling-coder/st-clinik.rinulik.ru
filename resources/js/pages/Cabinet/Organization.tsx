import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Fields';

export default function Organization({ organization }: { organization: Record<string, string | null> }) {
    const form = useForm({ ...organization });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.put('/clinic-cabinet/organization');
    };

    return (
        <>
            <PageHead title="Организация" />
            <form className="card stack" onSubmit={submit}>
                <TextField label="Отображаемое название" required value={form.data.name ?? ''} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} />
                <TextField label="Юридическое название" value={form.data.legal_name ?? ''} onChange={(e) => form.setData('legal_name', e.target.value)} />
                <TextField label="ИНН" value={form.data.inn ?? ''} onChange={(e) => form.setData('inn', e.target.value)} />
                <TextField label="ОГРН" value={form.data.ogrn ?? ''} onChange={(e) => form.setData('ogrn', e.target.value)} />
                <TextField label="КПП" value={form.data.kpp ?? ''} onChange={(e) => form.setData('kpp', e.target.value)} />
                <TextField label="Юридический адрес" value={form.data.legal_address ?? ''} onChange={(e) => form.setData('legal_address', e.target.value)} />
                <TextField label="Лицензия №" value={form.data.license_number ?? ''} onChange={(e) => form.setData('license_number', e.target.value)} />
                <TextField label="Кем выдана" value={form.data.license_issuer ?? ''} onChange={(e) => form.setData('license_issuer', e.target.value)} />
                <TextField label="Дата лицензии" type="date" value={form.data.license_date ?? ''} onChange={(e) => form.setData('license_date', e.target.value)} />
                <Button type="submit" loading={form.processing}>
                    Сохранить
                </Button>
            </form>
        </>
    );
}
