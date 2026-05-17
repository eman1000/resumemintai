'use client';
import { auth } from '@/app/firebase';
import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function SiteNavAuth() {

  const router = useRouter();

  const onLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');         // back to marketing page
      router.refresh();         // refresh client state
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-site mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" aria-label="ResumeMint home" className="flex items-center">
          <Logo size="md" />
        </Link>
        <div className="items-center gap-6 text-md">
          <button onClick={onLogout} className="px-3 py-1.5 rounded-lg border border-gray-300 text-[#52525a] hover:bg-gray-100">Logout</button>
        </div>
      </div>
    </nav>
  );
}
