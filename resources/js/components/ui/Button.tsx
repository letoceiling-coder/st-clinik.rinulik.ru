import { Link } from '@inertiajs/react';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { cx } from '@/lib/format';
import Icon, { type IconName } from '../Icon';

type Variant = 'primary' | 'dark' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Shared {
    variant?: Variant;
    size?: Size;
    block?: boolean;
    icon?: IconName;
    iconRight?: IconName;
    loading?: boolean;
    children?: ReactNode;
}

const classes = ({ variant = 'primary', size = 'md', block, loading }: Shared, extra?: string) =>
    cx('btn', `btn--${variant}`, size !== 'md' && `btn--${size}`, block && 'btn--block', loading && 'is-loading', extra);

export function Button({
    variant,
    size,
    block,
    icon,
    iconRight,
    loading,
    children,
    className,
    type = 'button',
    disabled,
    ...rest
}: Shared & ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            type={type}
            className={classes({ variant, size, block, loading }, className)}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...rest}
        >
            {loading ? <span className="spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={size === 'sm' ? 18 : 20} /> : null}
            {children}
            {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 18 : 20} /> : null}
        </button>
    );
}

export function LinkButton({
    variant,
    size,
    block,
    icon,
    iconRight,
    children,
    className,
    ...rest
}: Shared & Omit<ComponentProps<typeof Link>, keyof Shared | 'icon' | 'size'>) {
    return (
        <Link className={classes({ variant, size, block }, className)} {...rest}>
            {icon ? <Icon name={icon} size={size === 'sm' ? 18 : 20} /> : null}
            {children}
            {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 18 : 20} /> : null}
        </Link>
    );
}

export function AnchorButton({
    variant,
    size,
    block,
    icon,
    iconRight,
    children,
    className,
    ...rest
}: Shared & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
    return (
        <a className={classes({ variant, size, block }, className)} {...rest}>
            {icon ? <Icon name={icon} size={size === 'sm' ? 18 : 20} /> : null}
            {children}
            {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 18 : 20} /> : null}
        </a>
    );
}

export function IconButton({
    icon,
    label,
    variant = 'ghost',
    round,
    className,
    pressed,
    ...rest
}: {
    icon: IconName;
    label: string;
    variant?: Variant;
    round?: boolean;
    pressed?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            type="button"
            className={cx('btn', `btn--${variant}`, 'btn--icon', round && 'btn--round', className)}
            aria-label={label}
            title={label}
            aria-pressed={pressed}
            {...rest}
        >
            <Icon name={icon} size={20} />
        </button>
    );
}
