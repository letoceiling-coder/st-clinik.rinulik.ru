import { FavoritesView } from '@/components/CollectionViews';
import { PageHead } from '@/components/Dash';

export default function Favorites() {
    return (
        <div className="stack-lg">
            <PageHead title="Избранное" text="Клиники и врачи, к которым хотите вернуться." />
            <FavoritesView />
        </div>
    );
}
