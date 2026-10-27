import { useForm } from '@inertiajs/react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check } from '@/components/ui/Fields';

type DisplaySettings = { home_map_enabled: boolean; ads_enabled: boolean };

export default function SiteDisplay({
    display_settings,
    yandex_maps_configured,
}: {
    display_settings: DisplaySettings;
    yandex_maps_configured: boolean;
}) {
    const form = useForm<DisplaySettings>({
        home_map_enabled: display_settings.home_map_enabled,
        ads_enabled: display_settings.ads_enabled,
    });

    return (
        <div className="stack-lg">
            <PageHead
                title="Сайт: карта и реклама"
                text="Переключатели для публичного сайта. Доступно без раздела «Справочники → География»."
            />

            <form
                className="card stack"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.put('/admin/site-display', { preserveScroll: true });
                }}
            >
                <h2 className="card-title">Рекламные баннеры</h2>
                <Check
                    label="Показывать рекламу на сайте"
                    checked={form.data.ads_enabled}
                    onChange={(e) => form.setData('ads_enabled', e.target.checked)}
                />
                <p className="text-sm text-muted">
                    При включении на главной и в каталоге видны только одобренные активные баннеры выбранного города. Если в городе нет
                    баннеров, блок не показывается. Демо-заглушки отключены.
                </p>

                <h2 className="card-title">Карта на главной</h2>
                <Check
                    label="Показывать карту клиник под шапкой"
                    checked={form.data.home_map_enabled}
                    onChange={(e) => form.setData('home_map_enabled', e.target.checked)}
                />
                <p className="text-sm text-muted">
                    Блок виден только если переключатель включён
                    {yandex_maps_configured ? (
                        <> и в интеграциях указан ключ Яндекс.Карт</>
                    ) : (
                        <>
                            , но сейчас{' '}
                            <a href="/admin/integrations#integration-yandex_maps" className="link">
                                ключ Яндекс.Карт не настроен
                            </a>
                        </>
                    )}{' '}
                    и у клиник города есть координаты.
                </p>

                <Button type="submit" loading={form.processing} disabled={!form.isDirty}>
                    Сохранить
                </Button>
            </form>

            <p className="text-sm text-muted">
                Импорт городов и статистика — в{' '}
                <a href="/admin/geography" className="link">
                    «География»
                </a>{' '}
                (нужно право «Справочники»). Модерация баннеров — в{' '}
                <a href="/admin/promotions" className="link">
                    «Продвижение»
                </a>
                .
            </p>
        </div>
    );
}
