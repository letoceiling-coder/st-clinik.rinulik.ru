import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Check, PhoneField, TextField } from '@/components/ui/Fields';
import { Alert } from '@/components/ui/Misc';

interface OfferPreview {
    token: string;
    claimable: boolean;
    reason: string | null;
    organization_name: string;
    clinic_name: string;
}

interface Props {
    offer?: OfferPreview | null;
    claim?: { slug: string; name: string } | null;
}

export default function RegisterClinic({ offer = null, claim = null }: Props) {
    const claimMode = Boolean(offer?.claimable);
    const catalogMode = !claimMode && claim !== null;
    const form = useForm({
        name: '',
        organization_name: offer?.organization_name ?? '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        consent: false,
        offer_token: claimMode ? offer?.token ?? '' : '',
        claim_clinic: catalogMode ? claim?.slug ?? '' : '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/register/clinic', { onFinish: () => form.reset('password', 'password_confirmation') });
    };

    return (
        <form onSubmit={submit} className="auth-card card card--shadow stack" noValidate>
            <div>
                <h1 className="auth-card__title">{claimMode || catalogMode ? 'Регистрация и подключение' : 'Заявка на подключение клиники'}</h1>
                <p className="text-muted">
                    {claimMode
                        ? `Создайте аккаунт и заберите черновик «${offer?.clinic_name}» (${offer?.organization_name}).`
                        : catalogMode
                          ? `Создайте аккаунт, подтвердите e-mail и права — и управляйте карточкой «${claim?.name}».`
                        : 'Оставьте заявку — кабинет откроется сразу, и вы сможете заполнить карточку клиники. В каталоге клиника появится после проверки модератором.'}
                </p>
            </div>
            {offer && !offer.claimable && offer.reason ? <Alert tone="warning">{offer.reason}</Alert> : null}
            <TextField label="Ваше имя" required autoComplete="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} />
            {catalogMode ? (
                <TextField label="Клиника" value={claim?.name ?? ''} readOnly disabled />
            ) : !claimMode ? (
                <TextField
                    label="Название организации"
                    required
                    value={form.data.organization_name}
                    onChange={(e) => form.setData('organization_name', e.target.value)}
                    error={form.errors.organization_name}
                />
            ) : (
                <TextField label="Организация" value={offer?.organization_name ?? ''} readOnly disabled />
            )}
            <TextField label="E-mail" type="email" autoComplete="email" required value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} />
            <PhoneField label="Телефон" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} error={form.errors.phone} />
            <TextField label="Пароль" type="password" autoComplete="new-password" required value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} />
            <TextField
                label="Повторите пароль"
                type="password"
                required
                value={form.data.password_confirmation}
                onChange={(e) => form.setData('password_confirmation', e.target.value)}
                error={form.errors.password_confirmation}
            />
            <Check checked={form.data.consent} onChange={(e) => form.setData('consent', e.target.checked)} error={form.errors.consent} label="Согласие на обработку персональных данных" />
            <Button type="submit" block loading={form.processing} disabled={Boolean(offer && !offer.claimable)}>
                {claimMode ? 'Зарегистрироваться и забрать черновик' : catalogMode ? 'Зарегистрироваться' : 'Оставить заявку и открыть кабинет'}
            </Button>
            <p className="text-sm text-center">
                <Link href="/register" className="link">
                    Регистрация пациента
                </Link>
                {' · '}
                <Link href="/login" className="link">
                    Войти
                </Link>
            </p>
        </form>
    );
}
