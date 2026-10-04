declare namespace ymaps {
    interface IEvent {
        get<T>(name: string): T;
    }

    interface GeoObjects {
        add(object: Placemark): void;
    }

    class Map {
        constructor(element: string | HTMLElement, state: { center: number[]; zoom: number; controls?: string[] }, options?: Record<string, unknown>);
        geoObjects: GeoObjects;
        setCenter(center: number[], zoom?: number): void;
        setBounds(bounds: number[][], options?: Record<string, unknown>): void;
        destroy(): void;
    }

    class Placemark {
        constructor(
            coordinates: number[],
            properties?: Record<string, unknown>,
            options?: Record<string, unknown>,
        );
        events: { add(name: string, cb: (e: IEvent) => void): void };
    }

    class GeoObjectCollection {
        add(object: Placemark): void;
        getBounds(): number[][] | null;
    }

    function ready(callback: () => void): void;
}

interface Window {
    ymaps?: typeof ymaps;
}
