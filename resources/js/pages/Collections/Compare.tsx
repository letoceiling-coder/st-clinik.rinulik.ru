import { CompareView } from '@/components/CollectionViews';

export default function Compare() {
    return (
        <div className="container page-head" style={{ paddingBottom: 'var(--space-12)' }}>
            <h1>Сравнение</h1>
            <p className="text-muted" style={{ marginTop: 8 }}>
                Цены указаны «от». Итоговую стоимость называет врач после осмотра.
            </p>
            <div style={{ marginTop: 24 }}>
                <CompareView />
            </div>
        </div>
    );
}
