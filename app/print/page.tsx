// app/print/page.tsx
import { TEMPLATES } from '@/components/templates';
import type { Resume } from '@/types/resume';

export const dynamic = 'force-dynamic';

type Props = { searchParams: { payload?: string } };

function decodePayload(encoded?: string) {
  if (!encoded) return null;
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export default function PrintPage({ searchParams }: Props) {
  const json =
    decodePayload(searchParams.payload) ??
    ({ data: null, template: 'executive-ats', accent: '#6366f1' } as any);

  const Template =
    TEMPLATES[(json.template as keyof typeof TEMPLATES) || 'executive-ats'];
  const data: Resume = json.data;

  return (
    <main className="min-h-screen bg-white text-neutral-900 flex items-start justify-center py-8">
      {/* ~A4 width canvas; actual page size/margins come from @page below */}
      <div className="w-[794px] print:w-auto">
        <Template data={data} accent={json.accent || '#6366f1'} />
      </div>

      {/* IMPORTANT: plain <style>, not styled-jsx */}
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
        }
        /* Ensure colors render in print */
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>
    </main>
  );
}
