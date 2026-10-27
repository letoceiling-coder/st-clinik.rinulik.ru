import type { ComponentProps } from 'react';
import ClinicsShow from '../Clinics/Show';
import { useMaxWebAppAuth } from '@/lib/max-web-app';

export default function MaxClinicShow(props: ComponentProps<typeof ClinicsShow>) {
    useMaxWebAppAuth();

    return <ClinicsShow {...props} />;
}
