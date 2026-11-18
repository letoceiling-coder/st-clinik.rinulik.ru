import { LinkButton } from '@/components/ui/Button';
import { dateRu } from '@/lib/format';

const CLINIC_STEPS = [
    'Оставьте заявку: название клиники, ваше имя, телефон и e-mail — это займёт минуту.',
    'Сразу получите доступ в личный кабинет и заполните карточку: филиал, врачей, услуги и цены, фото, график.',
    'Отправьте карточку на проверку. После модерации клиника появится в каталоге — до проверки она на сайте не видна.',
];

function ClinicConnect() {
    return (
        <section className="card card--shadow stack" style={{ marginTop: 32, maxWidth: 720 }}>
            <h2 className="card-title">Подключите клинику за три шага</h2>
            <ol className="stack" style={{ paddingLeft: 20, margin: 0 }}>
                {CLINIC_STEPS.map((step) => (
                    <li key={step}>{step}</li>
                ))}
            </ol>
            <div className="row row--wrap" style={{ gap: 12 }}>
                <LinkButton href="/register/clinic">Оставить заявку и подключить клинику</LinkButton>
                <LinkButton href="/login" variant="outline">
                    У меня уже есть кабинет
                </LinkButton>
            </div>
        </section>
    );
}

export default function Page({ page }: { page: { slug: string; title: string; html: string; updated_at: string | null } }) {
    return (
        <article className="container page-head" style={{ paddingBottom: 'var(--space-16)' }}>
            <h1>{page.title}</h1>
            {page.updated_at ? <p className="text-muted text-sm" style={{ marginTop: 8 }}>Обновлено: {dateRu(page.updated_at)}</p> : null}
            <div className="prose" style={{ marginTop: 24 }} dangerouslySetInnerHTML={{ __html: page.html }} />
            {page.slug === 'for-clinics' ? <ClinicConnect /> : null}
        </article>
    );
}
