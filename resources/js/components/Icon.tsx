import type { ReactNode, SVGProps } from 'react';

const P = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></>,
    pin: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
    star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" fill="currentColor" stroke="none" />,
    'star-o': <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
    heart: <path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5c0 6.1-8 11-8 11Z" />,
    'heart-fill': <path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5c0 6.1-8 11-8 11Z" fill="currentColor" />,
    scale: <><path d="M12 4v16M7 20h10M5 7h14" /><path d="m5 7-3 7a3.5 3.5 0 0 0 6 0L5 7ZM19 7l-3 7a3.5 3.5 0 0 0 6 0l-3-7Z" /></>,
    phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
    'check-circle': <><circle cx="12" cy="12" r="9" /><path d="m8 12.3 2.7 2.7L16 9.5" /></>,
    shield: <><path d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6l-7-3Z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>,
    building: <><path d="M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M16 10h2a1 1 0 0 1 1 1v10M3 21h18" /><path d="M9 7.5h2M9 11.5h2M9 15.5h2" /></>,
    users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.2.6 3.5 2.6 3.5 5.7" /></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    x: <path d="m6 6 12 12M18 6 6 18" />,
    'chevron-down': <path d="m6 9 6 6 6-6" />,
    'chevron-up': <path d="m6 15 6-6 6 6" />,
    'chevron-right': <path d="m9 6 6 6-6 6" />,
    'chevron-left': <path d="m15 6-6 6 6 6" />,
    'arrow-right': <path d="M5 12h14m-6-6 6 6-6 6" />,
    filter: <path d="M4 6h16M7 12h10M10 18h4" />,
    calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>,
    ruble: <><path d="M8 20V4h5.5a4.5 4.5 0 0 1 0 9H6" /><path d="M6 17h8" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8l1-12M9 7V4h6v3" /></>,
    edit: <><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
    bell: <><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15L6 17Z" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
    logout: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l-4 4 4 4M6 12h10" /></>,
    home: <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" />,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" /></>,
    chart: <><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>,
    file: <><path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
    image: <><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m4 18 5-5 4 4 3-3 4 4" /></>,
    upload: <path d="M12 16V4m-5 5 5-5 5 5M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />,
    eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></>,
    alert: <><path d="M12 3.5 2.5 20h19L12 3.5Z" /><path d="M12 10v4.5M12 17.5v.01" /></>,
    award: <><circle cx="12" cy="9" r="5.5" /><path d="m8.5 13.5-1.5 7 5-2.8 5 2.8-1.5-7" /></>,
    list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
    grid: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>,
    shield2: <><path d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6l-7-3Z" /></>,
    flash: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z" />,
    mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7.5 8 6 8-6" /></>,
    lock: <><rect x="5" y="10.5" width="14" height="10" rx="3" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
    external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
    refresh: <path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5" />,
    wifi: <><path d="M3 9a14 14 0 0 1 18 0M6 12.5a9.5 9.5 0 0 1 12 0M9 16a5 5 0 0 1 6 0" /><path d="M12 19.5v.01" /></>,
    card: <><rect x="2.5" y="5" width="19" height="14" rx="3" /><path d="M2.5 10h19M6.5 15h4" /></>,
    percent: <><path d="M19 5 5 19" /><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="17" r="2.5" /></>,
    sort: <path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3" />,
    dots: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3.2" />,
    send: <path d="m21 3-9.5 18-2.5-7.5L1.5 11 21 3ZM9 13.5 21 3" />,
    thumb: <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Zm0 0 4-7a2 2 0 0 1 3 1.8L13.5 10H19a2 2 0 0 1 2 2.3l-1 6a2 2 0 0 1-2 1.7H7" />,
    cookie: <><path d="M20.5 12.5A8.5 8.5 0 1 1 11.5 3.5 4 4 0 0 0 16 8a4 4 0 0 0 4.5 4.5Z" /><path d="M8.5 10.5h.01M11 15.5h.01M15.5 14.5h.01" strokeWidth="2.6" /></>,
    /* предметные иконки направлений */
    tooth: <path d="M7.5 3.5C5 3.5 3.5 5.5 3.5 8c0 2 .8 3.4 1.3 5.2.6 2.3.7 7.3 2.4 7.3 1.4 0 1.5-4 2.3-5.6.4-.8 1.1-1.2 1.9-1.2s1.5.4 1.9 1.2c.8 1.6.9 5.6 2.3 5.6 1.7 0 1.8-5 2.4-7.3.5-1.8 1.3-3.2 1.3-5.2 0-2.5-1.5-4.5-4-4.5-1.7 0-2.6 1-4.5 1s-2.8-1-4.5-1Z" />,
    scalpel: <><path d="m4 20 11-11" /><path d="m15 9 5-5-3-.5-4 3.5v2.5L15 9Z" /><path d="m4 20 3-3" /></>,
    implant: <><path d="M7 3.5h10l-1 4H8l-1-4Z" /><path d="M8.5 9.5h7M9 13h6M9.7 16.5h4.6M12 20v1" /><path d="M8 7.5v2M16 7.5v2" /></>,
    braces: <><path d="M3 11c3 3.5 15 3.5 18 0" /><rect x="5" y="7.2" width="3.4" height="3.4" rx="1" /><rect x="10.3" y="8.4" width="3.4" height="3.4" rx="1" /><rect x="15.6" y="7.2" width="3.4" height="3.4" rx="1" /><path d="M5 15.5c4 2.5 10 2.5 14 0" /></>,
    crown: <path d="M4 18 3 7l5 4 4-6 4 6 5-4-1 11H4ZM4 21h16" />,
    child: <><circle cx="12" cy="9" r="6" /><path d="M9.5 9.2h.01M14.5 9.2h.01M10 11.4c1.3 1 2.7 1 4 0M12 3a2 2 0 0 1 2 1.5" /><path d="M8 21c.6-2.4 2.2-3.5 4-3.5s3.4 1.1 4 3.5" /></>,
    gum: <path d="M12 3.5c3 3.3 5.8 6.6 5.8 10.2a5.8 5.8 0 0 1-11.6 0c0-3.6 2.8-6.9 5.8-10.2Z" />,
    microscope: <><path d="M9 3h4v7H9z" transform="rotate(25 11 6.5)" /><path d="M7 21h10M12 21v-3.5M6 14.5a6 6 0 0 0 11-1.5" /></>,
    sparkle: <><path d="m11 3 1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8L11 3Z" /><path d="M18.5 15.5v4M16.5 17.5h4M5 18.5v2M4 19.5h2" /></>,
    smile: <><circle cx="12" cy="12" r="9" /><path d="M8.5 14c1.9 2.2 5.1 2.2 7 0M9 9.6h.01M15 9.6h.01" /></>,
    jaw: <><path d="M4 9c0 6 3.2 10 8 10s8-4 8-10" /><path d="M4 9h16M8 9v3M12 9v4M16 9v3" /></>,
    moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />,
    pain: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z" />,
    snow: <><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" /><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2" /></>,
    breath: <path d="M3 9h10a2.5 2.5 0 1 0-2.5-2.5M3 14h14a3 3 0 1 1-3 3M3 19h7" />,
    crack: <path d="M7.5 3.5C5 3.5 3.5 5.5 3.5 8c0 2 .8 3.4 1.3 5.2.6 2.3.7 7.3 2.4 7.3 1.4 0 1.5-4 2.3-5.6.4-.8 1.1-1.2 1.9-1.2s1.5.4 1.9 1.2c.8 1.6.9 5.6 2.3 5.6 1.7 0 1.8-5 2.4-7.3.5-1.8 1.3-3.2 1.3-5.2 0-2.5-1.5-4.5-4-4.5M13.5 4.5l-2 3 2.5 1.5-2 3" />,
    swelling: <><circle cx="12" cy="12" r="8.5" /><path d="M9 10h.01M15 10h.01M9 15.5c1.8-1.2 4.2-1.2 6 0" /></>,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof P;

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
    name: IconName | string;
    size?: number;
    title?: string;
}

export default function Icon({ name, size = 20, title, strokeWidth = 2, ...rest }: Props) {
    const content = (P as Record<string, ReactNode>)[name] ?? P.tooth;
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            role={title ? 'img' : undefined}
            aria-hidden={title ? undefined : true}
            focusable="false"
            {...rest}
        >
            {title ? <title>{title}</title> : null}
            {content}
        </svg>
    );
}
