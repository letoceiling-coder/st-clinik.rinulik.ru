import { Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button, LinkButton } from '@/components/ui/Button';
import { Check } from '@/components/ui/Fields';
import { Alert } from '@/components/ui/Misc';
import type { SharedProps } from '@/lib/types';

interface Props {
    offer_token: string;
    clinic_name: string;
    organization_name: string;
    authenticated: boolean;
    register_url: string;
}

export default function OfferClaim({ offer_token, clinic_name, organization_name, authenticated, register_url }: Props) {
    const { flash } = usePage<SharedProps>().props;
    const form = useForm({ confirm: false });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(`/offer/${offer_token}/claim`, { preserveScroll: true });
    };

    return (
        <div className="container narrow stack">
            <div className="card card--shadow stack">
                <h1 className="auth-card__title">Подключить черновик</h1>
                <p className="text-muted">
                    Вы забираете управление организацией «{organization_name}» и филиалом «{clinic_name}» на платформе СтомКлиник.
                </p>
                {flash?.error ? <Alert tone="warning">{flash.error}</Alert> : null}
                {authenticated ? (
                    <form onSubmit={submit} className="stack">
                        <Check
                            checked={form.data.confirm}
                            onChange={(e) => form.setData('confirm', e.target.checked)}
                            error={form.errors.confirm}
                            label="Подтверждаю, что уполномочен(а) представлять эту клинику"
                        />
                        <Button type="submit" block loading={form.processing}>
                            Забрать черновик в кабинет
                        </Button>
                    </form>
                ) : (
                    <div className="stack">
                        <p className="text-sm">Войдите или зарегистрируйте кабинет клиники, чтобы подтвердить подключение.</p>
                        <div className="cluster">
                            <LinkButton href={`/login?intended=${encodeURIComponent(`/offer/${offer_token}/claim`)}`}>Войти</LinkButton>
                            <LinkButton href={register_url} variant="outline">
                                Регистрация клиники
                            </LinkButton>
                        </div>
                    </div>
                )}
                <p className="text-sm text-center">
                    <Link href={`/offer/${offer_token}`} className="link">
                        Вернуться к предложению
                    </Link>
                </p>
            </div>
        </div>
    );
}
