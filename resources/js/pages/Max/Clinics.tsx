import type { ComponentProps } from 'react';
import ClinicsIndex from '../Clinics/Index';
import { useMaxWebAppAuth } from '@/lib/max-web-app';

export default function MaxClinics(props: ComponentProps<typeof ClinicsIndex>) {
    useMaxWebAppAuth();

    return <ClinicsIndex {...props} />;
}
