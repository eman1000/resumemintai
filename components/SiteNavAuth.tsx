'use client';
import { auth } from '@/app/firebase';
import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

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
    <nav className="sticky top-0 z-50 backdrop-blur bg-neutral-950/70 border-b border-neutral-900">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-extrabold tracking-tight">ResumeMint</Link>
        <div className=" items-center gap-6 text-md">

          <button onClick={onLogout} className="px-3 py-1.5 rounded-lg border border-neutral-800">Logout</button>
        </div>
      </div>
    </nav>
  );
}
