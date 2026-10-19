type HeroPhotoProps = {
    index: 1 | 2 | 3;
    alt?: string;
    loading?: 'eager' | 'lazy';
    fetchPriority?: 'high' | 'low' | 'auto';
};

const HERO = {
    1: {
        jpg: '/images/demo/hero-01.jpg',
        webp: '/images/demo/hero-01-480.webp 480w, /images/demo/hero-01-960.webp 960w',
        sizes: '(min-width: 1280px) 456px, 90vw',
        width: 960,
        height: 600,
    },
    2: {
        jpg: '/images/demo/hero-02.jpg',
        webp: '/images/demo/hero-02-256.webp 256w, /images/demo/hero-02-512.webp 512w',
        sizes: '(min-width: 1280px) 246px, 42vw',
        width: 512,
        height: 320,
    },
    3: {
        jpg: '/images/demo/hero-03.jpg',
        webp: '/images/demo/hero-03-256.webp 256w, /images/demo/hero-03-512.webp 512w',
        sizes: '(min-width: 1280px) 246px, 42vw',
        width: 512,
        height: 320,
    },
} as const;

export default function HeroPhoto({ index, alt = '', loading = 'lazy', fetchPriority }: HeroPhotoProps) {
    const photo = HERO[index];

    return (
        <picture>
            <source type="image/webp" srcSet={photo.webp} sizes={photo.sizes} />
            <img
                src={photo.jpg}
                alt={alt}
                width={photo.width}
                height={photo.height}
                sizes={photo.sizes}
                loading={loading}
                decoding="async"
                fetchPriority={fetchPriority}
            />
        </picture>
    );
}
