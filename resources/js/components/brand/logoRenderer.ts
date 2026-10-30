import { LOGO_CENTER, LOGO_FAMILIES, LOGO_HALF_EXTENT, LOGO_SPHERES, LOGO_TOKEN_FALLBACK, type LogoFamily } from './logoSpheres';

export type LogoRendererOptions = {
    /** Секунд на полный оборот вокруг оси Y. */
    duration?: number;
    /** Во сколько раз замедляется вращение при наведении (0.35 — до 35 % скорости). */
    hoverSpeed?: number;
    /** Без анимации: один кадр вида спереди. */
    still?: boolean;
    /** Элемент, наведение на который замедляет вращение. */
    hoverTarget?: HTMLElement | null;
    /** Элемент, из которого читаются CSS-токены --color-logo-*. */
    tokenSource?: Element;
};

export type LogoRenderer = {
    setDuration: (seconds: number) => void;
    setHoverSpeed: (factor: number) => void;
    setStill: (still: boolean) => void;
    resize: () => void;
    destroy: () => void;
};

/**
 * Доля холста, которую занимает вид спереди. Холст больше видимого знака,
 * чтобы сферы, выходящие вперёд при повороте, не обрезались.
 */
export const LOGO_CANVAS_OVERSCAN = 1.3;

/** Расстояние до камеры в радиусах композиции: чем меньше, тем сильнее перспектива. */
const CAMERA_DISTANCE = 6;
const FLOATS_PER_VERTEX = 11;
const VERTICES_PER_SPHERE = 6;

const VERTEX_SHADER = `
attribute vec2 aPos;
attribute vec2 aUv;
attribute vec3 aLight;
attribute vec3 aDeep;
attribute float aEdge;
varying vec2 vUv;
varying vec3 vLight;
varying vec3 vDeep;
varying float vEdge;
void main() {
    vUv = aUv;
    vLight = aLight;
    vDeep = aDeep;
    vEdge = aEdge;
    gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `
precision mediump float;
varying vec2 vUv;
varying vec3 vLight;
varying vec3 vDeep;
varying float vEdge;
void main() {
    float dist = length(vUv);
    float alpha = clamp((1.0 - dist) / vEdge + 0.5, 0.0, 1.0);
    if (alpha <= 0.0) discard;
    vec2 uv = vUv / max(dist, 1.0);
    vec3 n = vec3(uv, sqrt(max(0.0, 1.0 - dot(uv, uv))));
    vec3 lightDir = normalize(vec3(0.55, 0.62, 0.56));
    float diffuse = dot(n, lightDir) * 0.5 + 0.5;
    float ramp = dot(uv, vec2(0.7071, 0.7071)) * 0.5 + 0.5;
    float t = smoothstep(0.02, 1.0, mix(ramp, diffuse, 0.4));
    vec3 col = mix(vDeep, vLight, t);
    float rim = pow(1.0 - n.z, 3.0);
    col *= 1.0 - 0.1 * rim;
    vec3 halfVec = normalize(lightDir + vec3(0.0, 0.0, 1.0));
    float spec = pow(max(dot(n, halfVec), 0.0), 22.0);
    col = mix(col, vec3(1.0), spec * 0.16);
    col += vLight * 0.08 * pow(max(dot(n, normalize(vec3(-0.6, -0.5, 0.6))), 0.0), 6.0);
    gl_FragColor = vec4(col * alpha, alpha);
}`;

type Rgb = [number, number, number];

function parseColor(value: string, fallback: string): Rgb {
    const hex = (value.trim().match(/^#([0-9a-f]{6})$/i)?.[1] ?? fallback.slice(1)).toLowerCase();

    return [parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255];
}

function readPalette(source: Element): Record<LogoFamily, { light: Rgb; deep: Rgb }> {
    const style = getComputedStyle(source);
    const palette = {} as Record<LogoFamily, { light: Rgb; deep: Rgb }>;
    for (const family of LOGO_FAMILIES) {
        const fallback = LOGO_TOKEN_FALLBACK[family];
        palette[family] = {
            light: parseColor(style.getPropertyValue(`--color-logo-${family}-light`), fallback.light),
            deep: parseColor(style.getPropertyValue(`--color-logo-${family}-deep`), fallback.deep),
        };
    }

    return palette;
}

/**
 * Сферы в мировых координатах: вид спереди совпадает с исходником,
 * поэтому позиция и радиус сферы, отодвинутой по глубине, компенсируют перспективу.
 */
function buildScene(): { x: number; y: number; z: number; r: number; family: LogoFamily }[] {
    return LOGO_SPHERES.map((sphere) => {
        const fx = (sphere.x - LOGO_CENTER.x) / LOGO_HALF_EXTENT;
        const fy = -(sphere.y - LOGO_CENTER.y) / LOGO_HALF_EXTENT;
        const fr = sphere.r / LOGO_HALF_EXTENT;
        const shell = Math.sqrt(Math.max(0, 1.05 * 1.05 - (fx * fx + fy * fy)));
        const z = sphere.depth * shell * 0.78;
        const k = (CAMERA_DISTANCE - z) / CAMERA_DISTANCE;

        return { x: fx * k, y: fy * k, z, r: fr * k, family: sphere.family };
    });
}

export function isWebGlAvailable(): boolean {
    try {
        const canvas = document.createElement('canvas');

        return Boolean(window.WebGLRenderingContext && canvas.getContext('webgl'));
    } catch {
        return false;
    }
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
        throw new Error('shader');
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
    }

    return shader;
}

/**
 * Рисует трёхмерный логотип в canvas: каждая сфера — отдельный объём с освещением,
 * весь шар вращается вокруг вертикальной оси. Возвращает null, если WebGL недоступен.
 */
export function createLogoRenderer(canvas: HTMLCanvasElement, options: LogoRendererOptions = {}): LogoRenderer | null {
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, powerPreference: 'low-power' });
    if (!gl) {
        return null;
    }

    let program: WebGLProgram;
    try {
        program = gl.createProgram() as WebGLProgram;
        gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
        gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            return null;
        }
    } catch {
        return null;
    }

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const scene = buildScene();
    const vertices = new Float32Array(scene.length * VERTICES_PER_SPHERE * FLOATS_PER_VERTEX);
    gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength, gl.DYNAMIC_DRAW);

    const stride = FLOATS_PER_VERTEX * 4;
    const attributes: [string, number, number][] = [
        ['aPos', 2, 0],
        ['aUv', 2, 2],
        ['aLight', 3, 4],
        ['aDeep', 3, 7],
        ['aEdge', 1, 10],
    ];
    for (const [name, size, offset] of attributes) {
        const location = gl.getAttribLocation(program, name);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset * 4);
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    let palette = readPalette(options.tokenSource ?? document.documentElement);
    let duration = Math.max(1, options.duration ?? 20);
    let hoverSpeed = options.hoverSpeed ?? 0.35;
    let still = options.still ?? false;
    let hovered = false;
    let visible = true;
    let speed = 1;
    let angle = 0;
    let frame = 0;
    let lastTime = 0;
    let pixelSize = 1;
    const order = scene.map((_, index) => index);
    const projected = scene.map(() => ({ x: 0, y: 0, z: 0, r: 0 }));

    const resize = (): void => {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
        const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        pixelSize = 2 / Math.min(width, height);
        gl.viewport(0, 0, width, height);
    };

    const draw = (): void => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        for (let i = 0; i < scene.length; i++) {
            const s = scene[i];
            const x = s.x * cos + s.z * sin;
            const z = -s.x * sin + s.z * cos;
            const scale = CAMERA_DISTANCE / (CAMERA_DISTANCE - z) / LOGO_CANVAS_OVERSCAN;
            projected[i] = { x: x * scale, y: s.y * scale, z, r: s.r * scale };
        }
        order.sort((a, b) => projected[a].z - projected[b].z);

        let offset = 0;
        for (const index of order) {
            const p = projected[index];
            const colors = palette[scene[index].family];
            const pad = 1 + pixelSize * 1.5 / p.r;
            const edge = pixelSize / p.r;
            const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
            for (const [cx, cy] of corners) {
                vertices[offset++] = p.x + cx * p.r * pad;
                vertices[offset++] = p.y + cy * p.r * pad;
                vertices[offset++] = cx * pad;
                vertices[offset++] = cy * pad;
                vertices[offset++] = colors.light[0];
                vertices[offset++] = colors.light[1];
                vertices[offset++] = colors.light[2];
                vertices[offset++] = colors.deep[0];
                vertices[offset++] = colors.deep[1];
                vertices[offset++] = colors.deep[2];
                vertices[offset++] = edge;
            }
        }

        gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, scene.length * VERTICES_PER_SPHERE);
    };

    const tick = (time: number): void => {
        frame = 0;
        const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
        lastTime = time;
        const target = hovered ? hoverSpeed : 1;
        speed += (target - speed) * Math.min(1, delta * 4);
        angle = (angle + (delta * speed * Math.PI * 2) / duration) % (Math.PI * 2);
        draw();
        schedule();
    };

    const schedule = (): void => {
        if (!frame && !still && visible && !document.hidden) {
            frame = requestAnimationFrame(tick);
        }
    };

    const stop = (): void => {
        if (frame) {
            cancelAnimationFrame(frame);
            frame = 0;
        }
        lastTime = 0;
    };

    const onVisibility = (): void => {
        if (document.hidden) {
            stop();
        } else {
            schedule();
        }
    };
    const onEnter = (): void => {
        hovered = true;
    };
    const onLeave = (): void => {
        hovered = false;
    };

    const observer =
        typeof IntersectionObserver === 'function'
            ? new IntersectionObserver(([entry]) => {
                  visible = entry.isIntersecting;
                  if (visible) {
                      schedule();
                  } else {
                      stop();
                  }
              })
            : null;
    observer?.observe(canvas);
    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
        resize();
        draw();
    }) : null;
    resizeObserver?.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);
    const hoverTarget = options.hoverTarget ?? canvas;
    hoverTarget.addEventListener('pointerenter', onEnter);
    hoverTarget.addEventListener('pointerleave', onLeave);

    resize();
    draw();
    schedule();

    return {
        setDuration: (seconds) => {
            duration = Math.max(1, seconds);
        },
        setHoverSpeed: (factor) => {
            hoverSpeed = Math.max(0, factor);
        },
        setStill: (value) => {
            still = value;
            if (still) {
                stop();
                angle = 0;
                draw();
            } else {
                schedule();
            }
        },
        resize: () => {
            palette = readPalette(options.tokenSource ?? document.documentElement);
            resize();
            draw();
        },
        destroy: () => {
            stop();
            observer?.disconnect();
            resizeObserver?.disconnect();
            document.removeEventListener('visibilitychange', onVisibility);
            hoverTarget.removeEventListener('pointerenter', onEnter);
            hoverTarget.removeEventListener('pointerleave', onLeave);
            gl.deleteBuffer(buffer);
            gl.deleteProgram(program);
            gl.getExtension('WEBGL_lose_context')?.loseContext();
        },
    };
}
