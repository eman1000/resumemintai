import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="mt-8">
      <div className="h-1 bg-gradient-to-r from-blue-500 via-fuchsia-500 to-rose-500" />
      <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-6 text-sm text-neutral-400">
        <div>
          <p className="text-xl font-bold text-neutral-100">ResumeMint</p>
          <p className="mt-2">AI‑powered resume optimization for the modern job seeker.</p>
        </div>
        <div>
          <p className="font-semibold text-neutral-200 mb-2">Contact</p>
          <p>help@resumemintai.com</p>
        
        <div className="mt-1">
          <p className="font-semibold text-neutral-200 mb-2">We Accept</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { alt: "Visa", src: "/logos/visa.webp" },
              { alt: "Mastercard", src: "/logos/mastercard.webp" },
              { alt: "Apple Pay", src: "/logos/apple-pay.webp" },
              { alt: "Google Pay", src: "/logos/google-pay.webp" },
            ].map((logo, i) => (
              <div
                key={i}
                className="bg-white rounded flex items-center justify-center w-12 h-8 p-1"
              >
                <img
                  alt={logo.alt}
                  src={logo.src}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>

        </div>
        <div>
          <p className="font-semibold text-neutral-200 mb-2">Legal</p>
          <ul className="space-y-1">
            <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
            <li><Link href="/refund" className="hover:text-white">Refund Policy</Link></li>
            <li><Link href="/unsubscribe" className="hover:text-white">Unsubscribe</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-900 py-4 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} YourBrand. All rights reserved.
      </div>
    </footer>
  );
}
