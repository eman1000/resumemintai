import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

export default function PageShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode; }) {
  return (
    <>
      <SiteNav />
      <main className="max-w-6xl mx-auto px-4 py-12">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-extrabold">{title}</h1>
          {subtitle ? <p className="text-neutral-400 mt-2">{subtitle}</p> : null}
        </header>
        <section className="rounded-3xl border border-neutral-800 p-6 bg-neutral-900">
          {children}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
