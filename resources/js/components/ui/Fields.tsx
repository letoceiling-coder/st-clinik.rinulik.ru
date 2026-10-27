import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useDismiss } from '@/components/ui/Overlay';
import { cx, formatRuPhone } from '@/lib/format';
import Icon from '../Icon';

interface FieldWrap {
    label?: ReactNode;
    hint?: ReactNode;
    error?: string;
    required?: boolean;
    className?: string;
}

function Wrap({
    id,
    label,
    hint,
    error,
    required,
    className,
    children,
}: FieldWrap & { id: string; children: ReactNode }) {
    return (
        <div className={cx('field', className)}>
            {label ? (
                <label className="field__label" htmlFor={id}>
                    {label}
                    {required ? <span className="req" aria-hidden="true"> *</span> : null}
                </label>
            ) : null}
            {children}
            {error ? (
                <p className="field__error" id={`${id}-err`} role="alert">
                    {error}
                </p>
            ) : hint ? (
                <p className="field__hint" id={`${id}-hint`}>
                    {hint}
                </p>
            ) : null}
        </div>
    );
}

const describe = (id: string, error?: string, hint?: ReactNode) => (error ? `${id}-err` : hint ? `${id}-hint` : undefined);

export function TextField({
    label,
    hint,
    error,
    className,
    inputClassName,
    ...rest
}: FieldWrap & { inputClassName?: string; ref?: Ref<HTMLInputElement> } & InputHTMLAttributes<HTMLInputElement>) {
    const id = useId();
    return (
        <Wrap id={id} label={label} hint={hint} error={error} required={rest.required} className={className}>
            <input
                id={id}
                className={cx('input', inputClassName)}
                aria-invalid={error ? true : undefined}
                aria-describedby={describe(id, error, hint)}
                {...rest}
            />
        </Wrap>
    );
}

/**
 * Поле телефона с маской «+7 (900) 000-00-00». Подходит для автозаполнения браузера
 * (autocomplete="tel") и вставки номера в любом виде.
 */
export function PhoneField({ onChange, onFocus, onBlur, placeholder, ...rest }: FieldWrap & { inputClassName?: string; ref?: Ref<HTMLInputElement> } & InputHTMLAttributes<HTMLInputElement>) {
    const lastValue = useRef(String(rest.value ?? ''));
    const external = String(rest.value ?? '');
    useEffect(() => {
        lastValue.current = external;
    }, [external]);
    const emit = (e: ChangeEvent<HTMLInputElement>, value: string) => {
        e.target.value = value;
        lastValue.current = value;
        onChange?.(e);
    };

    return (
        <TextField
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={placeholder ?? '+7 (900) 000-00-00'}
            {...rest}
            onFocus={(e) => {
                if (e.target.value === '' && !rest.readOnly) {
                    emit(e as unknown as ChangeEvent<HTMLInputElement>, '+7 (');
                }
                onFocus?.(e);
            }}
            onBlur={(e) => {
                if (e.target.value.replace(/\D/g, '') === '7') {
                    emit(e as unknown as ChangeEvent<HTMLInputElement>, '');
                }
                onBlur?.(e);
            }}
            onChange={(e) => {
                const raw = e.target.value;
                // Берём последнее значение, которое поле выдало само: при быстром наборе проп value
                // может отставать на символ.
                const prevDigits = lastValue.current.replace(/\D/g, '');
                let digits = raw.replace(/\D/g, '');
                if (digits.length > 11) {
                    if (prevDigits.length <= 2) {
                        // Вставка или автозаполнение поверх «+7 (»: номер — это вставленная часть,
                        // её код страны (7/8) отбрасываем, лишний хвост обрезаем.
                        const pasted = digits.slice(prevDigits.length);
                        digits = '7' + (/^[78]/.test(pasted) && pasted.length >= 11 ? pasted.slice(1, 11) : pasted.slice(0, 10));
                    } else {
                        // Лишние цифры при наборе в заполненное поле игнорируем.
                        digits = prevDigits;
                    }
                } else if (prevDigits === '7' && digits === '77') {
                    // Набрали «+7» после автоподставленного префикса.
                    digits = '7';
                } else if (prevDigits === '78' && digits === '789') {
                    // Привычное «8 9xx…»: восьмёрка — это код страны, а не начало кода оператора.
                    digits = '79';
                }
                // Префикс можно стереть целиком, иначе поле нельзя очистить.
                emit(e, digits === '7' || digits === '' ? (raw.length < 4 ? '' : '+7 (') : formatRuPhone(digits));
            }}
        />
    );
}

export function TextArea({ label, hint, error, className, ...rest }: FieldWrap & { ref?: Ref<HTMLTextAreaElement> } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
    const id = useId();
    const max = typeof rest.maxLength === 'number' ? rest.maxLength : null;
    const length = typeof rest.value === 'string' ? rest.value.length : 0;

    return (
        <Wrap id={id} label={label} hint={hint} error={error} required={rest.required} className={className}>
            <textarea
                id={id}
                className="textarea"
                aria-invalid={error ? true : undefined}
                aria-describedby={describe(id, error, hint)}
                {...rest}
            />
            {max ? (
                <span className={cx('field__counter', length >= max * 0.9 && 'is-near')} aria-live="polite">
                    {length} / {max}
                </span>
            ) : null}
        </Wrap>
    );
}

export function SelectField({
    label,
    hint,
    error,
    className,
    children,
    ...rest
}: FieldWrap & SelectHTMLAttributes<HTMLSelectElement>) {
    const id = useId();
    return (
        <Wrap id={id} label={label} hint={hint} error={error} required={rest.required} className={className}>
            <select
                id={id}
                className="select"
                aria-invalid={error ? true : undefined}
                aria-describedby={describe(id, error, hint)}
                {...rest}
            >
                {children}
            </select>
        </Wrap>
    );
}

export function Check({
    label,
    error,
    className,
    type = 'checkbox',
    ...rest
}: { label: ReactNode; error?: string; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div className={className}>
            <label className={cx('check', error && 'is-invalid')}>
                <input type={type} aria-invalid={error ? true : undefined} {...rest} />
                <span>{label}</span>
            </label>
            {error ? (
                <p className="field__error" role="alert" style={{ marginTop: 6 }}>
                    {error}
                </p>
            ) : null}
        </div>
    );
}

export function Switch({ label, ...rest }: { label: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
    return (
        <label className="switch">
            <input type="checkbox" role="switch" {...rest} />
            <span>{label}</span>
        </label>
    );
}

export function SearchInput({
    value,
    onChange,
    placeholder,
    label = 'Поиск',
    ...rest
}: { label?: string } & InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div className="input-group">
            <Icon name="search" className="icon-left" size={20} />
            <input
                type="search"
                className="input"
                aria-label={label}
                placeholder={placeholder}
                {...(value === undefined ? {} : { value, onChange })}
                {...rest}
            />
        </div>
    );
}

export function CitySearchField({
    cities,
    name = 'city',
    label = 'Город',
    defaultValue = '',
}: {
    cities: { id: number; name: string }[];
    name?: string;
    label?: string;
    defaultValue?: string;
}) {
    const id = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(String(defaultValue));

    useEffect(() => {
        setSelected(String(defaultValue));
    }, [defaultValue]);

    useDismiss(open, () => setOpen(false), rootRef);

    const selectedCity = cities.find((c) => String(c.id) === selected);
    const displayValue = open ? query : selectedCity?.name ?? '';

    const options = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const list = needle ? cities.filter((c) => c.name.toLowerCase().includes(needle)) : cities;

        return list.slice(0, 30);
    }, [cities, query]);

    const pick = (value: string, labelText: string) => {
        setSelected(value);
        setQuery(labelText);
        setOpen(false);
    };

    return (
        <div ref={rootRef} className="field city-search">
            <label className="field__label" htmlFor={id}>
                {label}
            </label>
            <input type="hidden" name={name} value={selected} />
            <div className="input-group">
                <Icon name="search" className="icon-left" size={20} />
                <input
                    id={id}
                    type="search"
                    className="input"
                    placeholder="Начните вводить город"
                    value={displayValue}
                    autoComplete="off"
                    onFocus={() => {
                        setOpen(true);
                        setQuery(selectedCity?.name ?? '');
                    }}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                        if (e.target.value === '') {
                            setSelected('');
                        }
                    }}
                />
            </div>
            {open ? (
                <ul className="city-search__list" role="listbox">
                    <li>
                        <button type="button" className={cx('city-search__option', selected === '' && 'is-active')} onMouseDown={(e) => e.preventDefault()} onClick={() => pick('', '')}>
                            Все города
                        </button>
                    </li>
                    {options.length === 0 ? (
                        <li className="city-search__empty">Город не найден</li>
                    ) : (
                        options.map((c) => (
                            <li key={c.id}>
                                <button
                                    type="button"
                                    className={cx('city-search__option', String(c.id) === selected && 'is-active')}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => pick(String(c.id), c.name)}
                                >
                                    {c.name}
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            ) : null}
        </div>
    );
}
