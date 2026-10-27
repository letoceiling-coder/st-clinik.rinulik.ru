import type { ComponentProps } from 'react';
import Home from '../Home';
import { useMaxWebAppAuth } from '@/lib/max-web-app';

export default function MaxHome(props: ComponentProps<typeof Home>) {
    useMaxWebAppAuth();

    return <Home {...props} />;
}
