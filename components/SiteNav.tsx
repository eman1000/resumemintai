'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function SiteNav() {
  const pathname = usePathname();
  const onHome = pathname === '/';
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: 'Templates', href: '/templates' },
    { label: 'Cover Letters', href: '/cover-letter-templates' },
    { label: 'Pricing', href: '/pricing' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-site mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-[#1d1d20]">ResumeMint</Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-[#52525a] hover:text-brand transition-colors">
              {l.label}
            </Link>
          ))}
          <Link href="/login" className="text-[#52525a] hover:text-brand transition-colors">Login</Link>
          <Link href="/builder" className="btn-primary text-sm !px-5 !py-2">
            Create resume
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span className={`block w-5 h-0.5 bg-[#1d1d20] transition-transform ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-[#1d1d20] transition-opacity ${mobileOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-[#1d1d20] transition-transform ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-3">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block text-[#52525a] hover:text-brand py-1"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/login" className="block text-[#52525a] hover:text-brand py-1" onClick={() => setMobileOpen(false)}>
            Login
          </Link>
          <Link
            href="/builder"
            className="btn-primary block text-center text-sm !py-2"
            onClick={() => setMobileOpen(false)}
          >
            Create resume
          </Link>
        </div>
      )}
    </nav>
  );
}
