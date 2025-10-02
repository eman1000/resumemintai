'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SiteNav() {
  const pathname = usePathname();
  const onHome = pathname === '/';

  return (
    <nav className="sticky top-0 z-50 backdrop-blur bg-neutral-950/70 border-b border-neutral-900">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-extrabold tracking-tight">ResumeMint</Link>
        <div className="hidden md:flex items-center gap-6 text-md">
          {onHome ? (
            <>
              <a href="#features" className="text-neutral-400 hover:text-white">Features</a>
              <a href="#how" className="text-neutral-400 hover:text-white">How it Works</a>
              <a href="#reviews" className="text-neutral-400 hover:text-white">Reviews</a>
              {/* <a href="#pricing" className="text-neutral-400 hover:text-white">Pricing</a> */}
            </>
          ) : (
            <>
              <Link href="/#features" className="text-neutral-400 hover:text-white">Features</Link>
              <Link href="/#how" className="text-neutral-400 hover:text-white">How it Works</Link>
              <Link href="/#reviews" className="text-neutral-400 hover:text-white">Reviews</Link>
              {/* <Link href="/#pricing" className="text-neutral-400 hover:text-white">Pricing</Link> */}
            </>
          )}
          <Link href="/login" className="px-3 py-1.5 rounded-lg border border-neutral-800">Login</Link>
          <Link href="/login?return=/builder" className="btn-gradient">Get Started</Link>
        </div>
      </div>
    </nav>
  );
}
