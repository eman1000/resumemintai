"use client";

// Localized social-proof toasts ("Tanaka in Harare just got shortlisted").
// Names + cities are chosen from the visitor's country (via /api/geo) so the
// activity feels local. Two variants: candidate (default) and recruiter.
//
// Note: these are illustrative activity prompts, not a live event feed.

import React from "react";
import { X } from "lucide-react";
import { useGeo } from "@/lib/useGeo";

type Pack = { names: string[]; cities: string[] };

// country_code (lowercase) → native first names + major cities.
const PACKS: Record<string, Pack> = {
  zw: { names: ["Tanaka", "Tendai", "Farai", "Chipo", "Tatenda", "Rumbidzai", "Nyasha", "Kudzai", "Tafadzwa", "Rutendo", "Simba", "Anesu"], cities: ["Harare", "Bulawayo", "Mutare", "Gweru", "Kwekwe"] },
  za: { names: ["Thabo", "Lerato", "Sipho", "Naledi", "Bongani", "Ayanda", "Lwazi", "Zanele", "Kagiso", "Nomvula"], cities: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Soweto"] },
  ng: { names: ["Chinedu", "Adaeze", "Emeka", "Ngozi", "Tunde", "Folake", "Ifeoma", "Yusuf", "Chiamaka", "Obinna"], cities: ["Lagos", "Abuja", "Ibadan", "Kano", "Port Harcourt"] },
  ke: { names: ["Wanjiru", "Otieno", "Achieng", "Kamau", "Mwangi", "Nyambura", "Wafula", "Akinyi"], cities: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"] },
  gh: { names: ["Kwame", "Akosua", "Kofi", "Ama", "Yaw", "Abena", "Kojo", "Esi"], cities: ["Accra", "Kumasi", "Tamale", "Takoradi"] },
  ug: { names: ["Mukasa", "Namuli", "Okello", "Nakato", "Wasswa", "Aceng"], cities: ["Kampala", "Gulu", "Mbarara", "Jinja"] },
  us: { names: ["James", "Emily", "Michael", "Olivia", "David", "Ashley", "Daniel", "Sophia", "Chris", "Jessica"], cities: ["New York", "Austin", "Chicago", "Seattle", "Atlanta", "Denver"] },
  gb: { names: ["Oliver", "Amelia", "Harry", "Isla", "Jack", "Emily", "George", "Ava"], cities: ["London", "Manchester", "Bristol", "Leeds", "Birmingham"] },
  ca: { names: ["Liam", "Emma", "Noah", "Olivia", "Ethan", "Ava"], cities: ["Toronto", "Vancouver", "Calgary", "Montreal", "Ottawa"] },
  au: { names: ["Jack", "Charlotte", "William", "Mia", "Noah", "Ruby"], cities: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"] },
  in: { names: ["Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Sneha", "Arjun", "Diya"], cities: ["Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Pune", "Chennai"] },
  ph: { names: ["Juan", "Maria", "Jose", "Angelica", "Mark", "Joy"], cities: ["Manila", "Cebu", "Davao", "Quezon City"] },
  ie: { names: ["Conor", "Saoirse", "Cian", "Aoife", "Liam", "Niamh"], cities: ["Dublin", "Cork", "Galway", "Limerick"] },
  de: { names: ["Lukas", "Mia", "Felix", "Hannah", "Jonas", "Lena"], cities: ["Berlin", "Munich", "Hamburg", "Cologne"] },
};

const DEFAULT_PACK: Pack = {
  names: ["Alex", "Maria", "John", "Sara", "David", "Anna", "Daniel", "Sofia", "Michael", "Elena"],
  cities: [],
};

// City fragments (degrade gracefully when the visitor's city is unknown).
const IN = (c: string) => (c ? ` in ${c}` : "");
const FROM = (c: string) => (c ? ` from ${c}` : "");

type Msg = (n: string, c: string, k: number) => string;

const CANDIDATE_MSGS: Msg[] = [
  (n, c) => `${n}${IN(c)} just got an interview confirmation`,
  (n, c) => `${n}${IN(c)} just got shortlisted`,
  (n) => `${n} just tailored a resume to a new job`,
  (n) => `${n} downloaded an ATS-ready resume`,
  (n) => `${n} just passed an ATS check`,
  (n, c) => `${n}${FROM(c)} landed a new role`,
  (n) => `${n} built a resume in under 5 minutes`,
  (n) => `${n} generated a matching cover letter`,
  (n, c) => `${n}${IN(c)} applied to 3 jobs in one click`,
  (n) => `${n} boosted their ATS score to 92%`,
  (n) => `${n} fixed 7 ATS issues on their resume`,
  (n, c) => `${n}${IN(c)} just got a callback`,
  (n, c) => `${n}${IN(c)} accepted a job offer 🎉`,
  (n) => `${n} optimised their resume for a new role`,
  (n) => `${n} added missing keywords from a job post`,
  (n) => `${n} created a second tailored resume`,
  (n, c) => `${n}${FROM(c)} started a 14-day free trial`,
  (n) => `${n} exported their resume as a PDF`,
  (n, c) => `${n}${IN(c)} matched 94% to a job description`,
  (n) => `${n} just upgraded to Pro`,
  (n, c) => `${n}${IN(c)} got an interview at a top company`,
  (n) => `${n} rewrote their experience with AI`,
  (n) => `${n} cleared the ATS scan on the first try`,
  (n, c) => `${n}${IN(c)} landed 2 interviews this week`,
  (n) => `${n} polished a LinkedIn-imported resume`,
  (n, c) => `${n}${FROM(c)} switched careers with a new CV`,
  (n) => `${n} got their resume recruiter-ready`,
  (n) => `${n} generated a cover letter for a remote role`,
  (n) => `${n} improved their resume summary with AI`,
  (n, c) => `${n}${IN(c)} reached the final interview round`,
  (n, c) => `${n}${IN(c)} beat the ATS filter`,
  (n) => `${n} created an ATS-optimised resume`,
  (n) => `${n} tailored a CV for a finance role`,
  (n) => `${n} got 3 recruiter views today`,
  (n, c) => `${n}${FROM(c)} finished a resume in minutes`,
  (n) => `${n} just applied with one click`,
  (n) => `${n} added quantified achievements with AI`,
  (n, c) => `${n}${IN(c)} got past the first screening`,
  (n) => `${n} downloaded a cover-letter PDF`,
  (n) => `${n} reached a 90+ ATS score`,
  (n, c) => `${n}${IN(c)} booked a phone screen`,
  (n) => `${n} fixed formatting an ATS couldn't read`,
  (n) => `${n} generated 3 resume bullet ideas`,
  (n, c) => `${n}${IN(c)} got invited for a second interview`,
  (n) => `${n} matched their CV to a marketing role`,
  (n) => `${n} created a one-page resume`,
  (n, c) => `${n}${FROM(c)} got a recruiter reply`,
  (n) => `${n} tailored a resume for a graduate program`,
  (n) => `${n} just saved a resume draft`,
  (n) => `${n} ran a free ATS check`,
  (n, c) => `${n}${IN(c)} got an offer after 2 interviews`,
  (n) => `${n} added a skills section with AI`,
  (n) => `${n} cleaned up a 2-page resume`,
  (n, c) => `${n}${IN(c)} applied to a remote position`,
];

const RECRUITER_MSGS: Msg[] = [
  (n, c, k) => `${n}${IN(c)} just shortlisted ${k} candidates`,
  (n, c) => `${n}${IN(c)} posted a new job`,
  (n, _c, k) => `${n} ranked ${k} resumes in seconds`,
  (n) => `${n} just found their top candidate`,
  (n, c, k) => `${n}${IN(c)} AI-screened ${k} applicants`,
  (n) => `${n} shortlisted interns for an attachment role`,
  (n) => `${n} exported a shortlist report`,
  (n, c) => `${n}${FROM(c)} filled a role in record time`,
  (n, _c, k) => `${n} compared ${k} candidates side by side`,
  (n) => `${n} ranked applicants for a finance role`,
  (n) => `${n} just hired through ResumeMint`,
  (n, c, k) => `${n}${IN(c)} reviewed ${k} resumes over coffee`,
  (n) => `${n} posted a remote job to the board`,
  (n, _c, k) => `${n} shortlisted ${k} candidates in under a minute`,
  (n, _c, k) => `${n} found 3 strong fits in a stack of ${k}`,
  (n, c) => `${n}${FROM(c)} started a recruiter trial`,
  (n) => `${n} AI-screened a graduate batch`,
  (n) => `${n} downloaded a Word shortlist report`,
  (n, _c, k) => `${n} ranked ${k} CVs for a management role`,
  (n) => `${n} flagged an over-qualified candidate`,
  (n, c) => `${n}${IN(c)} shortlisted without reading 50 CVs`,
  (n) => `${n} invited their top 5 to interview`,
  (n) => `${n} posted 2 jobs this week`,
  (n, _c, k) => `${n} got evidence-based rankings for ${k} applicants`,
  (n, c) => `${n}${FROM(c)} cut screening time by 90%`,
  (n) => `${n} shortlisted candidates for a pasted JD`,
  (n, _c, k) => `${n} found the best fit in ${k} resumes`,
  (n) => `${n} ranked a stack of student CVs`,
  (n) => `${n} published a role to the job board`,
  (n, _c, k) => `${n} shortlisted ${k} applicants for an accountant role`,
  (n) => `${n} reviewed applicants on the go`,
  (n, c) => `${n}${IN(c)} hired a candidate they shortlisted`,
  (n) => `${n} generated a PDF shortlist`,
  (n, _c, k) => `${n} screened ${k} resumes with honest gaps flagged`,
  (n, _c, k) => `${n} found a hidden gem in ${k} applications`,
  (n, c) => `${n}${IN(c)} shortlisted interns in minutes`,
  (n) => `${n} ranked candidates for a sales role`,
  (n, _c, k) => `${n} uploaded ${k} CVs and got a ranking`,
  (n) => `${n} exported a CSV of their shortlist`,
  (n, c) => `${n}${IN(c)} posted an engineering role`,
  (n, _c, k) => `${n} shortlisted ${k} for a junior role`,
  (n) => `${n} saved a shortlist as their default report`,
  (n) => `${n} found 2 standout interns`,
  (n, _c, k) => `${n} ranked ${k} resumes against a JD`,
  (n) => `${n} contacted a top candidate on WhatsApp`,
  (n) => `${n} shortlisted for a graduate trainee role`,
  (n, c, k) => `${n}${IN(c)} screened ${k} applicants before lunch`,
  (n) => `${n} posted a marketing role to the board`,
  (n, _c, k) => `${n} narrowed ${k} resumes to a top 5`,
  (n) => `${n} got an AI shortlist with reasons`,
  (n) => `${n} ranked applicants for a customer-service role`,
  (n, c) => `${n}${FROM(c)} just upgraded to the recruiter plan`,
  (n) => `${n} shortlisted candidates for a remote job`,
  (n, _c, k) => `${n} found their hire in ${k} CVs`,
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type Toast = { text: string; initial: string; ago: string };

export default function SocialProof({ variant = "candidate" }: { variant?: "candidate" | "recruiter" }) {
  const { data } = useGeo();
  const [toast, setToast] = React.useState<Toast | null>(null);
  const [muted, setMuted] = React.useState(false);

  React.useEffect(() => {
    try {
      if (sessionStorage.getItem("rm_sp_muted") === "1") setMuted(true);
    } catch {}
  }, []);

  React.useEffect(() => {
    if (muted) return;
    let alive = true;
    const timers: any[] = [];

    const make = (): Toast => {
      const cc = (data?.country_code || "").toLowerCase();
      const pack = PACKS[cc] || DEFAULT_PACK;
      const name = pick(pack.names);
      // Prefer the visitor's real city, else a city from their country pack.
      const city = data?.city || (pack.cities.length ? pick(pack.cities) : "");
      const k = 3 + Math.floor(Math.random() * 18);
      const tmpl = variant === "recruiter" ? pick(RECRUITER_MSGS) : pick(CANDIDATE_MSGS);
      const text = (tmpl as any)(name, city, k);
      const mins = Math.floor(Math.random() * 24) + 1;
      return { text, initial: name.charAt(0).toUpperCase(), ago: mins <= 1 ? "just now" : `${mins} min ago` };
    };

    const cycle = (firstDelay: number) => {
      timers.push(
        setTimeout(() => {
          if (!alive) return;
          setToast(make());
          // keep visible ~6s
          timers.push(
            setTimeout(() => {
              if (!alive) return;
              setToast(null);
              // next one in 22–40s
              cycle(22000 + Math.random() * 18000);
            }, 6000),
          );
        }, firstDelay),
      );
    };

    cycle(5000); // first toast after 5s
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [data, muted, variant]);

  const dismiss = () => {
    setToast(null);
    setMuted(true);
    try { sessionStorage.setItem("rm_sp_muted", "1"); } catch {}
  };

  if (muted || !toast) return null;

  const accent = variant === "recruiter" ? "bg-mint-600" : "bg-brand";

  return (
    <div className="fixed bottom-4 left-4 z-[60] max-w-[20rem] animate-[fadeInUp_.3s_ease-out]">
      <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white shadow-lg p-3 pr-8 relative">
        <div className={`relative w-9 h-9 rounded-full ${accent} text-white grid place-items-center font-semibold shrink-0`}>
          {toast.initial}
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-[#1d1d20] leading-snug">{toast.text}</p>
          <p className="text-xs text-[#a1a1aa] mt-0.5">{toast.ago} · on ResumeMint</p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-2 right-2 text-gray-300 hover:text-gray-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
