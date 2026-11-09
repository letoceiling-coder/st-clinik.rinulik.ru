import { Link, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import ClinicProfileFields, { useClinicProfileForm, type ClinicProfile, type ClinicProfileOptions } from '@/components/ClinicProfileFields';
import { PageHead } from '@/components/Dash';
import PendingChanges, { type PendingRevision } from '@/components/PendingChanges';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Misc';
import type { SharedProps } from '@/lib/types';

interface DuplicateMatch {
    slug: string;
    name: string;
    address: string | null;
    reason: string;
    claim_url: string;
}

export default function BranchForm({
    branchForm,
    pendingRevision,
    ...options
}: { branchForm: ClinicProfile | null; pendingRevision?: PendingRevision | null } & ClinicProfileOptions) {
    const b = branchForm ?? {};
    const { form, prepare } = useClinicProfileForm(branchForm, options.propertyTypes);
    const duplicates: DuplicateMatch[] = usePage<SharedProps>().props.flash.duplicates ?? [];

    const save = (notDuplicate: boolean) => {
        prepare();
        if (b.id) {
            form.put(`/clinic-cabinet/branches/${b.id}`);
        } else {
            form.transform((data) => ({ ...data, not_duplicate: notDuplicate }));
            form.post('/clinic-cabinet/branches');
        }
    };
    const submit = (e: FormEvent) => {
        e.preventDefault();
        save(false);
    };

    return (
        <form className="stack-lg" onSubmit={submit}>
            <PageHead title={b.id ? 'Редактирование филиала' : 'Новый филиал'} text="Не публикуйте диагнозы и сканы паспортов пациентов. Лицензию загружайте в «Документы»." />
            <PendingChanges revision={pendingRevision} />
            {!b.id && duplicates.length > 0 ? (
                <Alert tone="warning" icon="info">
                    <b>Похоже, ваша клиника уже есть в каталоге.</b> Заберите готовую карточку — отзывы, рейтинг и история сохранятся, а пациенты не увидят дубль.
                    <ul className="stack" style={{ marginBlock: 'var(--space-3)' }}>
                        {duplicates.map((d) => (
                            <li key={d.slug}>
                                <b>{d.name}</b>
                                {d.address ? `, ${d.address}` : ''} <span className="text-muted">— {d.reason}</span>{' '}
                                <a href={d.claim_url} className="link">
                                    Это наша клиника
                                </a>
                            </li>
                        ))}
                    </ul>
                    <Button type="button" variant="outline" size="sm" loading={form.processing} onClick={() => save(true)}>
                        Нет, это другая клиника — создать филиал
                    </Button>
                </Alert>
            ) : null}
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
