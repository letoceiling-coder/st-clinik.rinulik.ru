import { CompareView } from '@/components/CollectionViews';
import { PageHead } from '@/components/Dash';

export default function Compare() {
    return (
        <div className="stack-lg">
            <PageHead title="Сравнение" text="Цены «от»; финальную стоимость называет врач после осмотра." />
            <CompareView />
        </div>
    );
}
