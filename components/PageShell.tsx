import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

export default function PageShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode; }) {
  return (
    <>
      <SiteNav />
      <main className="max-w-site mx-auto px-4 py-12">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#1d1d20]">{title}</h1>
          {subtitle ? <p className="text-[#52525a] mt-2">{subtitle}</p> : null}
        </header>
        <section className="rounded-lg border border-gray-200 bg-white shadow-md p-6">
          {children}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
