import { LinkButton } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/Misc';
import { useCity } from '@/lib/city';

const TEXT: Record<number, [string, string]> = {
    403: ['Нет доступа', 'У вашей учётной записи нет прав для этого раздела.'],
    404: ['Страница не найдена', 'Возможно, адрес изменился или страница больше не существует.'],
    419: ['Сессия истекла', 'Обновите страницу и повторите действие.'],
    429: ['Слишком много запросов', 'Подождите минуту и попробуйте снова.'],
    500: ['Что-то пошло не так', 'Мы уже знаем о проблеме. Попробуйте позже.'],
    503: ['Сервис на обслуживании', 'Скоро всё заработает, зайдите чуть позже.'],
};

export default function ErrorPage({ status, message }: { status: number; message?: string }) {
    const city = useCity();
    const [title, text] = TEXT[status] ?? TEXT[500];

    return (
        <div className="container" style={{ padding: 'var(--space-12) var(--gutter)' }}>
            <ErrorState
                title={`${status}. ${title}`}
                text={message && status !== 500 ? message : text}
                action={
                    <div className="row row--wrap" style={{ justifyContent: 'center' }}>
                        <LinkButton href="/" variant="dark">
                            На главную
                        </LinkButton>
                        <LinkButton href={city.path('clinics')} variant="outline">
                            Каталог клиник
                        </LinkButton>
                    </div>
                }
            />
        </div>
    );
}
