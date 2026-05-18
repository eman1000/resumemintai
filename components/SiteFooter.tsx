import Link from 'next/link';
import Logo from '@/components/Logo';

export default function SiteFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-8">
      <div className="max-w-site mx-auto px-4 py-10 grid sm:grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        {/* Brand */}
        <div>
          <Logo size="md" />
          <p className="mt-2 text-[#52525a]">AI‑powered resume &amp; cover letter builder for the modern job seeker.</p>
        </div>

        {/* Product */}
        <div>
          <p className="font-semibold text-[#1d1d20] mb-2">Product</p>
          <ul className="space-y-1 text-[#52525a]">
            <li><Link href="/resume-checker" className="hover:text-brand">Free ATS Checker</Link></li>
            <li><Link href="/templates" className="hover:text-brand">Resume Templates</Link></li>
            <li><Link href="/cover-letter-templates" className="hover:text-brand">Cover Letter Templates</Link></li>
            <li><Link href="/pricing" className="hover:text-brand">Pricing</Link></li>
            <li><Link href="/faq" className="hover:text-brand">FAQ</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <p className="font-semibold text-[#1d1d20] mb-2">Contact</p>
          <ul className="space-y-1 text-[#52525a]">
            <li><Link href="/contact" className="hover:text-brand">Contact Support</Link></li>
            <li>help@resumemintai.com</li>
          </ul>
          <div className="mt-3">
            <p className="font-semibold text-[#1d1d20] mb-2">We Accept</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { alt: "Visa", src: "/logos/visa.webp" },
                { alt: "Mastercard", src: "/logos/mastercard.webp" },
                { alt: "Apple Pay", src: "/logos/apple-pay.webp" },
                { alt: "Google Pay", src: "/logos/google-pay.webp" },
              ].map((logo, i) => (
                <div
                  key={i}
                  className="bg-gray-50 border border-gray-200 rounded flex items-center justify-center w-12 h-8 p-1"
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

        {/* Legal */}
        <div>
          <p className="font-semibold text-[#1d1d20] mb-2">Legal</p>
          <ul className="space-y-1 text-[#52525a]">
            <li><Link href="/privacy" className="hover:text-brand">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-brand">Terms of Service</Link></li>
            <li><Link href="/refund" className="hover:text-brand">Refund Policy</Link></li>
            <li><Link href="/unsubscribe" className="hover:text-brand">Unsubscribe</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-200 py-4 text-center text-xs text-[#a1a1aa]">
        © {new Date().getFullYear()} ResumeMint. All rights reserved.
      </div>
    </footer>
  );
}
