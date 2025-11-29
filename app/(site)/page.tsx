import Link from 'next/link';
import { CheckCircle2, Wand2, Sparkles, ShieldCheck, Clock, FileText, Star } from 'lucide-react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
const tiers = [
  {
    name: 'Starter',
    topNote: ['Starting today', '€0.01 trial', 'Starting tomorrow', '€19.99/month'],
    desc: 'Perfect for users exploring AI resume improvement for the first time.',
    featuresYes: [
      '1 resume template (basic layout)',
      '10 resume optimizations per job description',
      'Tech & Soft Skills keyword generation',
    ],
    featuresNo: ['No AI summary generation', 'No experience-level rewrite'],
    cta: '/login?return=/builder',
  },
  {
    name: 'Pro',
    topNote: ['Starting today', '€0.01 trial', 'Starting tomorrow', '€29.99/month'],
    desc: 'Designed for serious applicants targeting multiple roles.',
    featuresYes: [
      'Access to 3 resume templates',
      '20 resume optimizations per job description',
      'AI-generated summary',
      'Tech & Soft Skills keyword generation',
      'Rewrite for up to 2 company experiences',
    ],
    badge: 'Most Popular',
    cta: '/login?return=/builder',
  },
  {
    name: 'Elite',
    topNote: ['Starting today', '€0.01 trial', 'Starting tomorrow', '€19.99/month'],
    desc: 'For professionals and power users who want it all.',
    featuresYes: [
      'All templates unlocked (10+ modern styles)',
      '100+ resume optimizations per job description',
      'Full AI suite: summary + keyword generation',
      'Rewrite for all companies in the resume',
      'Priority customer support',
    ],
    cta: '/login?return=/builder',
  },
];

export default function LandingPage() {
  return (
    <>
      <SiteNav />
      <header className="relative overflow-hidden">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="section text-center relative">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
            AI‑Powered <span className="bg-gradient-to-r from-blue-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">Resume Optimization</span>
          </h1>
          <p className="mt-4 text-neutral-400 text-lg max-w-2xl mx-auto">
            Upload your resume, paste any job description, and get an ATS‑optimized resume in under 2 minutes.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/login?return=/builder" className="btn-gradient">Start Optimizing Now</Link>
            {/* <a href="#pricing" className="px-5 py-3 rounded-xl bg-neutral-900 border border-neutral-800">See Pricing</a> */}
          </div>
          <div className="mt-6 flex justify-center gap-4 text-sm text-neutral-400">
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Multiple templates</span>
            <span className="flex items-center gap-2"><Wand2 className="w-4 h-4" /> AI optimization</span>
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> ATS compatible</span>
            <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> 2‑minute process</span>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="section">
        <h2 className="text-3xl font-bold text-center mb-8">Why Choose <span className="text-neutral-200">YourBrand</span>?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Sparkles, t: '3x More Interviews', d: 'Stand out with quantified, tailored bullets.' },
            { icon: Clock, t: 'Lightning Fast', d: 'Optimized resume in minutes, not hours.' },
            { icon: ShieldCheck, t: 'ATS Compatible', d: 'Clean structure that parsing systems can read.' },
            { icon: FileText, t: 'Keyword Optimization', d: 'Surface and include critical keywords from JDs.' },
            { icon: Star, t: 'Flexible Plans', d: 'Start free, upgrade only if you love it.' },
            { icon: CheckCircle2, t: 'Modern Templates', d: 'Designed for readability and impact.' },
          ].map((i,idx)=>(
            <div key={idx} className="card">
              <div className="flex items-center gap-3">
                <i.icon className="w-5 h-5 text-neutral-200" />
                <h3 className="font-semibold">{i.t}</h3>
              </div>
              <p className="text-sm text-neutral-400 mt-1">{i.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section id="how" className="section">
        <h2 className="text-3xl font-bold text-center mb-8">How it Works</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { n: '01', t: 'Upload or Paste', d: 'Add your current resume or work history.' },
            { n: '02', t: 'Paste the Job Post', d: 'We tailor content and keywords to match.' },
            { n: '03', t: 'Review & Export', d: 'Switch templates and print to PDF.' },
          ].map((s,idx)=>(
            <div key={idx} className="card text-center">
              <div className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-fuchsia-400 bg-clip-text text-transparent">{s.n}</div>
              <h3 className="mt-2 font-semibold">{s.t}</h3>
              <p className="text-sm text-neutral-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className="section">
        <h2 className="text-3xl font-bold text-center mb-8">Success Stories</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { name: 'Sarah C.', role: 'Software Engineer', text: 'Got 5 interviews in 2 weeks—the bullets finally show impact.' },
            { name: 'Marcus J.', role: 'Product Manager', text: 'Identified gaps and helped me land PM interviews.' },
            { name: 'Emily R.', role: 'Data Scientist', text: 'Saved hours—keywords alone boosted responses.' },
          ].map((r, i)=>(
            <div key={i} className="card">
              <p className="text-sm text-neutral-400">{r.role}</p>
              <p className="mt-2">“{r.text}”</p>
              <p className="mt-2 text-neutral-500 text-sm">— {r.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}

      <SiteFooter />
    </>
  );
}
