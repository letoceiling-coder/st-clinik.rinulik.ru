import { Link } from '@inertiajs/react';
import type { FormEvent } from 'react';
import ClinicProfileFields, { useClinicProfileForm, type ClinicProfileOptions } from '@/components/ClinicProfileFields';
import { Button } from '@/components/ui/Button';
import { Check, SelectField } from '@/components/ui/Fields';
import { Alert } from '@/components/ui/Misc';

export default function ClinicCreate({ organizations, ...options }: { organizations: { id: number; name: string }[] } & ClinicProfileOptions) {
    const { form, prepare } = useClinicProfileForm(null, options.propertyTypes, { organization_id: '', publish: false });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        prepare();
        form.post('/admin/clinics');
    };

    return (
        <form className="stack-lg" onSubmit={submit}>
            <div className="page-head page-head--dash">
                <div>
                    <p className="text-sm text-muted" style={{ marginBottom: 8 }}>
                        <Link href="/admin/clinics" className="link">
                            ← К списку клиник
                        </Link>
                    </p>
                    <h1>Новая клиника</h1>
                    <p className="text-muted">Добавление вручную. Чтобы взять данные с Яндекс Карт, откройте «Парсер», отметьте найденные клиники и нажмите «Импортировать».</p>
                </div>
            </div>

            <section className="card form-grid">
                <h2 className="card-title span-2">Размещение</h2>
                <SelectField
                    label="Организация"
                    hint="Если клиника — филиал сети, выберите её организацию. Иначе будет создана новая организация без владельца."
                    value={form.data.organization_id}
                    onChange={(e) => form.setData('organization_id', e.target.value)}
                    error={form.errors.organization_id}
                >
                    <option value="">Новая организация</option>
                    {organizations.map((o) => (
                        <option key={o.id} value={o.id}>
                            {o.name}
                        </option>
                    ))}
                </SelectField>
                <Check label="Сразу опубликовать на сайте" checked={form.data.publish} onChange={(e) => form.setData('publish', e.target.checked)} />
            </section>

            {Object.keys(form.errors).length > 0 ? (
                    <Alert tone="danger">
                        Не сохранено: {[...new Set(Object.values(form.errors))].slice(0, 3).join(' ')}
                    </Alert>
                ) : null}
            <ClinicProfileFields form={form} options={options} phoneRequired={false} showCoordinates />
            <Button type="submit" size="lg" loading={form.processing}>
                Добавить клинику
            </Button>
        </form>
    );
}
