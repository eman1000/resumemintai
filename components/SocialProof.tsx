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

const CANDIDATE_MSGS = [
  (n: string, c: string) => `${n}${c ? ` in ${c}` : ""} just got an interview confirmation`,
  (n: string, c: string) => `${n}${c ? ` in ${c}` : ""} just got shortlisted`,
  (n: string) => `${n} just tailored a resume to a new job`,
  (n: string) => `${n} downloaded an ATS-ready resume`,
  (n: string) => `${n} just passed an ATS check`,
  (n: string, c: string) => `${n}${c ? ` from ${c}` : ""} landed a new role`,
];

const RECRUITER_MSGS = [
  (n: string, c: string, k: number) => `${n}${c ? ` in ${c}` : ""} just shortlisted ${k} candidates`,
  (n: string, c: string) => `${n}${c ? ` in ${c}` : ""} posted a new job`,
  (n: string, c: string, k: number) => `${n} ranked ${k} resumes in seconds`,
  (n: string) => `${n} just found their top candidate`,
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

  const accent = variant === "recruiter" ? "bg-blue-600" : "bg-brand";

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
