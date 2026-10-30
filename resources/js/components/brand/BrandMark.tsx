import { useEffect, useId, useRef, useState } from 'react';
import { createLogoRenderer, isWebGlAvailable, LOGO_CANVAS_OVERSCAN, type LogoRenderer } from './logoRenderer';
import { LOGO_FAMILIES, LOGO_SPHERES, LOGO_VIEWBOX } from './logoSpheres';

/** Плоский знак: круги с градиентами из токенов --color-logo-*. Работает без JS и WebGL. */
export function BrandMarkStatic({ size = 40, className }: { size?: number; className?: string }) {
    const prefix = `lg${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

    return (
        <svg className={className} width={size} height={size} viewBox={LOGO_VIEWBOX} aria-hidden="true" focusable="false">
            <defs>
                {LOGO_FAMILIES.map((family) => (
                    <linearGradient key={family} id={`${prefix}-${family}`} x1="0.85" y1="0.15" x2="0.15" y2="0.85">
                        <stop offset="0" style={{ stopColor: `var(--color-logo-${family}-light)` }} />
                        <stop offset="1" style={{ stopColor: `var(--color-logo-${family}-deep)` }} />
                    </linearGradient>
                ))}
            </defs>
            {LOGO_SPHERES.map((sphere, index) => (
                <circle key={index} cx={sphere.x} cy={sphere.y} r={sphere.r} fill={`url(#${prefix}-${sphere.family})`} />
            ))}
        </svg>
    );
}

type BrandMarkProps = {
    /** Размер знака в пикселях. */
    size?: number;
    /** Секунд на полный оборот. */
    duration?: number;
    /** Скорость при наведении относительно обычной. */
    hoverSpeed?: number;
    className?: string;
};

/**
 * Трёхмерный знак: 21 объёмная сфера вращается вокруг вертикальной оси.
 * До загрузки, без WebGL и при prefers-reduced-motion показывается плоский SVG.
 */
export default function BrandMark({ size = 40, duration = 20, hoverSpeed = 0.35, className }: BrandMarkProps) {
    const hostRef = useRef<HTMLSpanElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<LogoRenderer | null>(null);
    const [mode, setMode] = useState<'static' | '3d'>('static');

    useEffect(() => {
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = (): void => setMode(!motion.matches && isWebGlAvailable() ? '3d' : 'static');
        update();
        motion.addEventListener('change', update);

        return () => motion.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (mode !== '3d' || !canvas) {
            return;
        }
        const renderer = createLogoRenderer(canvas, {
            duration,
            hoverSpeed,
            hoverTarget: hostRef.current?.closest('a') ?? hostRef.current,
        });
        if (!renderer) {
            setMode('static');

            return;
        }
        rendererRef.current = renderer;
        const onLost = (event: Event): void => {
            event.preventDefault();
            setMode('static');
        };
        canvas.addEventListener('webglcontextlost', onLost);

        return () => {
            canvas.removeEventListener('webglcontextlost', onLost);
            renderer.destroy();
            rendererRef.current = null;
        };
    }, [mode]);

    useEffect(() => {
        rendererRef.current?.setDuration(duration);
        rendererRef.current?.setHoverSpeed(hoverSpeed);
    }, [duration, hoverSpeed]);

    return (
        <span ref={hostRef} className={`brand-mark${className ? ` ${className}` : ''}`} style={{ width: size, height: size }} data-mode={mode}>
            <BrandMarkStatic size={size} className="brand-mark__static" />
            {mode === '3d' ? (
                <canvas
                    ref={canvasRef}
                    className="brand-mark__canvas"
                    aria-hidden="true"
                    style={{ width: size * LOGO_CANVAS_OVERSCAN, height: size * LOGO_CANVAS_OVERSCAN, margin: (-size * (LOGO_CANVAS_OVERSCAN - 1)) / 2 }}
                />
            ) : null}
        </span>
    );
}
