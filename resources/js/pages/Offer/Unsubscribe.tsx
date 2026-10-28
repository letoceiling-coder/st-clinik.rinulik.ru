import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Misc';

export default function OfferUnsubscribe({ contact, done }: { contact: string; done: boolean }) {
    const [processing, setProcessing] = useState(false);
    const unsubscribe = () =>
        router.post(window.location.pathname + window.location.search, {}, { preserveScroll: true, onStart: () => setProcessing(true), onFinish: () => setProcessing(false) });

    return (
        <div className="container offer-unsubscribe">
            <div className="card stack">
                <h1 className="offer-section-title">Отписка от предложений</h1>
                {done ? (
                    <Alert tone="success" icon="check-circle">
                        Готово: на {contact} больше не будут приходить предложения МирКлиник.
                    </Alert>
                ) : (
                    <>
                        <p>
                            Больше не присылать коммерческие предложения на <b>{contact}</b>? Системные письма по уже подключённым услугам это не затронет.
                        </p>
                        <div>
                            <Button onClick={unsubscribe} loading={processing}>
                                Отписаться
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
