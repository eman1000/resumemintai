// Forward ResumeMint lead events into the Plenqor CRM (plenqor.com/admin/leads?product=resumemint).
// Fire-and-forget: never throws, never blocks a request path. Plenqor folds repeat events for the
// same email into one lead (signup → trial → subscription) and bumps its status.
// Env: PLENQOR_INGEST_URL (default https://www.plenqor.com/api/leads/ingest), PLENQOR_INGEST_SECRET.

type PlenqorEvent = {
  source: 'resumemint-signup' | 'resumemint-trial' | 'resumemint-subscription' | 'resumemint-contact' | 'resumemint-recruiter';
  email: string | null | undefined;
  name?: string | null;
  company?: string | null;
  country?: string | null;
  message?: string | null;
  notes?: string | null;
  /** Pipeline status to set on the Plenqor lead: signup=new, trial=qualified, paid=won. */
  status?: 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
  /** Page/attribution hints when the event comes from a browser request. */
  pageUrl?: string | null;
  referrer?: string | null;
  gclid?: string | null;
  utm?: Partial<Record<'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_term' | 'utm_content', string>>;
};

export async function postPlenqorLead(ev: PlenqorEvent): Promise<void> {
  const secret = process.env.PLENQOR_INGEST_SECRET;
  const url = process.env.PLENQOR_INGEST_URL || 'https://www.plenqor.com/api/leads/ingest';
  if (!secret || !ev.email) return;
  const name = (ev.name || '').trim() || ev.email.split('@')[0];
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-plenqor-ingest-secret': secret },
      body: JSON.stringify({
        product: 'resumemint',
        source: ev.source,
        formType: ev.source,
        name,
        email: ev.email,
        company: ev.company || 'ResumeMint user',
        country: ev.country || undefined,
        message: ev.message || undefined,
        notes: ev.notes || undefined,
        status: ev.status,
        page_url: ev.pageUrl || undefined,
        referrer: ev.referrer || undefined,
        gclid: ev.gclid || undefined,
        ...(ev.utm || {}),
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) console.warn('[plenqorLeads] ingest', res.status, (await res.text()).slice(0, 200));
  } catch (e) {
    console.warn('[plenqorLeads] post failed', (e as Error)?.message);
  }
}
