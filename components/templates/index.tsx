import type { Resume } from '@/types/resume';
import ExecutiveATS from '../ExecutiveATS';
import ModernTwoCol from '../ModernTwoCol';

export type TemplateKey = 'executive-ats' | 'modern-two-col';

export const TEMPLATE_META: Record<TemplateKey, { name: string; lockedUntil?: 'pro'|'elite' }> = {
  'executive-ats':   { name: 'Executive ATS' },
  'modern-two-col':  { name: 'Modern Two-Column', lockedUntil: 'pro' },
};

export const TEMPLATES: Record<TemplateKey, (p: { data: Resume; accent?: string }) => JSX.Element> = {
  'executive-ats': (p) => <ExecutiveATS {...p} />,
  'modern-two-col': (p) => <ModernTwoCol {...p} />,
};
