import type { ComponentProps } from 'react';
import AccountAppointments from '../Account/Appointments';
import { useMaxWebAppAuth } from '@/lib/max-web-app';

export default function MaxAppointments(props: ComponentProps<typeof AccountAppointments>) {
    useMaxWebAppAuth();

    return <AccountAppointments {...props} />;
}
