import { FavoritesView } from '@/components/CollectionViews';

export default function Favorites() {
    return (
        <div className="container page-head" style={{ paddingBottom: 'var(--space-12)' }}>
            <h1>Избранное</h1>
            <div style={{ marginTop: 24 }}>
                <FavoritesView />
            </div>
        </div>
    );
}
