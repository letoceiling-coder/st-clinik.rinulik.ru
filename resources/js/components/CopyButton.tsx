import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function CopyButton({ value, label = 'Копировать', size = 'sm' }: { value: string; label?: string; size?: 'sm' | 'md' }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    return (
        <Button type="button" size={size} variant="outline" icon={copied ? 'check' : undefined} onClick={copy}>
            {copied ? 'Скопировано' : label}
        </Button>
    );
}

export function CopyLink({ label, value }: { label: string; value: string }) {
    return (
        <div className="copy-link">
            <span className="copy-link__label text-xs text-muted">{label}</span>
            <code className="copy-link__value">{value}</code>
            <CopyButton value={value} />
        </div>
    );
}
