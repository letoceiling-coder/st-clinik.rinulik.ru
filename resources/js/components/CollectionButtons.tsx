import { useCollections } from '@/lib/collections';
import { cx } from '@/lib/format';
import type { EntityType } from '@/lib/types';
import Icon from './Icon';

export function FavoriteButton({ type, id, name, floating = true }: { type: EntityType; id: number; name: string; floating?: boolean }) {
    const { has, toggle } = useCollections();
    const active = has('favorite', type, id);
    return (
        <button
            type="button"
            className={cx('fav-btn', floating && 'fav-btn--floating', active && 'is-active')}
            aria-pressed={active}
            aria-label={active ? `Убрать «${name}» из избранного` : `Добавить «${name}» в избранное`}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle('favorite', type, id);
            }}
        >
            <Icon name={active ? 'heart-fill' : 'heart'} size={22} />
        </button>
    );
}

export function CompareButton({ type, id, name, compact }: { type: EntityType; id: number; name: string; compact?: boolean }) {
    const { has, toggle } = useCollections();
    const active = has('compare', type, id);
    return (
        <button
            type="button"
            className={cx('btn btn--outline btn--sm compare-btn', compact && 'btn--icon btn--round', active && 'is-active')}
            aria-pressed={active}
            aria-label={active ? `Убрать «${name}» из сравнения` : `Добавить «${name}» к сравнению`}
            onClick={() => toggle('compare', type, id)}
        >
            <Icon name="scale" size={18} />
            {compact ? null : <span>{active ? 'В сравнении' : 'Сравнить'}</span>}
        </button>
    );
}
