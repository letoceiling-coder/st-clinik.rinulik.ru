import { Link } from '@inertiajs/react';
import type { FormEvent } from 'react';
import ClinicProfileFields, { useClinicProfileForm, type ClinicProfile, type ClinicProfileOptions } from '@/components/ClinicProfileFields';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Misc';

export default function BranchForm({ branchForm, ...options }: { branchForm: ClinicProfile | null } & ClinicProfileOptions) {
    const b = branchForm ?? {};
    const { form, prepare } = useClinicProfileForm(branchForm, options.propertyTypes);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        prepare();
        if (b.id) form.put(`/clinic-cabinet/branches/${b.id}`);
        else form.post('/clinic-cabinet/branches');
    };

    return (
        <form className="stack-lg" onSubmit={submit}>
            <PageHead title={b.id ? 'Редактирование филиала' : 'Новый филиал'} text="Не публикуйте диагнозы и сканы паспортов пациентов. Лицензию загружайте в «Документы»." />
            {b.id ? (
                <Alert tone="muted" icon="image">
                    Фотографии филиала (фасад, интерьер, кабинеты) загружаются в разделе{' '}
                    <Link href="/clinic-cabinet/photos" className="link">
                        «Фото»
                    </Link>{' '}
                    в меню слева. После модерации они появятся на карточке клиники и на странице филиала.
                </Alert>
            ) : null}
            <ClinicProfileFields form={form} options={options} />
            <Button type="submit" size="lg" loading={form.processing}>
                Сохранить
            </Button>
        </form>
    );
}
