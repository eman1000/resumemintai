"use client";

import * as React from "react";
import Link from "next/link";
import { auth } from "@/app/firebase";
import { track } from "@/lib/track";
import LoginSlidePanel from "@/components/LoginSlidePanel";

// Each question is a micro-commitment. By the time the user reaches the end,
// they've publicly (to themselves) named the version of themselves they want
// to leave behind AND the version they want to become. The price feels small
// against that gap.
type Choice = { value: string; label: string };
type Question = {
  id: "duration" | "story" | "avoid" | "become" | "ready";
  prompt: string;
  helper?: string;
  choices: Choice[];
};

const QUESTIONS: Question[] = [
  {
    id: "duration",
    prompt: "How long has it been since you got a real interview?",
    helper: "Be honest. The longer it's been, the more this matters.",
    choices: [
      { value: "weeks", label: "A few weeks" },
      { value: "1-2-months", label: "1–2 months" },
      { value: "3-plus", label: "3+ months" },
      { value: "lost-count", label: "I've stopped counting" },
    ],
  },
  {
    id: "story",
    prompt: "What story have you been telling yourself?",
    helper: "Whichever one shows up first — that's the one.",
    choices: [
      { value: "not-enough", label: "I'm not qualified enough" },
      { value: "market", label: "Nobody is hiring in my field" },
      { value: "resume", label: "My resume isn't getting through" },
      { value: "momentum", label: "I'm losing momentum" },
    ],
  },
  {
    id: "avoid",
    prompt: "Which version of you do you NOT want to be a year from now?",
    choices: [
      { value: "same-jobs", label: "Still applying to the same titles, hoping" },
      { value: "wrong-job", label: "The one who took whatever job, even the wrong one" },
      { value: "gave-up", label: "The one who gave up on what they actually wanted" },
      { value: "waiting", label: "Still waiting for things to just work out" },
    ],
  },
  {
    id: "become",
    prompt: "Who do you want to be in 30 days?",
    helper: "Pick the one that makes you sit up a little straighter.",
    choices: [
      { value: "phone-rings", label: "The person whose phone is ringing with interview offers" },
      { value: "options", label: "The person with options, not desperation" },
      { value: "right-job", label: "The person who finally got the job they actually wanted" },
      { value: "in-control", label: "The person back in control of their career" },
    ],
  },
  {
    id: "ready",
    prompt: "If $19 could close the gap, would you be in?",
    helper: "Last question. There's no wrong answer — only an honest one.",
    choices: [
      { value: "yes-if-works", label: "Yes — if it actually works" },
      { value: "try-month", label: "Yes — I'll try it for a month" },
      { value: "show-me", label: "Show me what's inside first" },
    ],
  },
];

const BECOMES: Record<string, string> = {
  "phone-rings": "the person whose phone keeps ringing",
  options: "the person with options, not desperation",
  "right-job": "the person who finally got the job they actually wanted",
  "in-control": "the person back in control of their career",
};

const AVOIDS: Record<string, string> = {
  "same-jobs": "still applying to the same titles a year from now",
  "wrong-job": "taking the wrong job out of desperation",
  "gave-up": "giving up on what you actually wanted",
  waiting: "still waiting for things to just work out",
};

const STORY_OBSTACLE: Record<string, string> = {
  "not-enough":
    "Your resume isn't making the case for you — recruiters spend 7 seconds on it, and the version you have right now isn't winning that 7 seconds.",
  market:
    "Recruiters ARE hiring — they're just filtering. Your resume is hitting the filter, not the human, because it's not tailored to the specific job description.",
  resume:
    "You already know the problem. The fix is mechanical: ATS-friendly structure, keyword overlap with the JD, and a measurable bullet on every role.",
  momentum:
    "Momentum doesn't come back on its own — it comes back when you stack small wins. 5 tailored applications per day for 14 days resets it.",
};

const DURATION_LABEL: Record<string, string> = {
  weeks: "a few weeks",
  "1-2-months": "1–2 months",
  "3-plus": "3+ months",
  "lost-count": "long enough that you've stopped counting",
};

const ink = "#1d1d20";
const meta = "#52525a";
const brand = "#2a72d7";

export default function BecomingClient() {
  const [step, setStep] = React.useState(0); // 0..QUESTIONS.length
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [loginOpen, setLoginOpen] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const t = await auth?.currentUser?.getIdToken();
      track({ event: "impression", props: { page: "landing", variant: "becoming", _idToken: t } });
    })();
  }, []);

  const isFinished = step >= QUESTIONS.length;
  const currentQ = QUESTIONS[step];
  const progress = Math.min(1, step / QUESTIONS.length);

  function pick(value: string) {
    if (!currentQ) return;
    const next = { ...answers, [currentQ.id]: value };
    setAnswers(next);
    track({
      event: "landing_quiz_answer",
      props: { variant: "becoming", q: currentQ.id, a: value, step },
    });
    // Tiny delay so the user sees the highlight before transitioning.
    setTimeout(() => setStep((s) => s + 1), 220);
  }

  function startSignup() {
    track({
      event: "landing_quiz_cta",
      props: { variant: "becoming", answers },
    });
    if (auth?.currentUser) {
      window.location.href = "/pricing";
      return;
    }
    setLoginOpen(true);
  }

  return (
    <div style={{ background: "#fafbfd", minHeight: "100vh", color: ink, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      {/* Top brand-only bar — no escape routes. Logo links home but that's it. */}
      <header style={{ padding: "18px 24px", borderBottom: "1px solid #ececef", background: "white" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", color: ink }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: brand, color: "white", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800 }}>
            RM
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>ResumeMint</span>
        </Link>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px 64px" }}>
        {!isFinished && step === 0 && (
          <IntroHero onStart={() => setStep(1)} />
        )}

        {!isFinished && step > 0 && currentQ && (
          <>
            <ProgressBar pct={progress * 100} />
            <QuestionCard q={currentQ} stepIdx={step} total={QUESTIONS.length} onPick={pick} selected={answers[currentQ.id]} />
          </>
        )}

        {isFinished && <Reveal answers={answers} onCta={startSignup} />}
      </main>

      <LoginSlidePanel
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => {
          setLoginOpen(false);
          window.location.href = "/pricing";
        }}
        reason="Lock in this version of yourself — start your 14-day free trial."
      />
    </div>
  );
}

function IntroHero({ onStart }: { onStart: () => void }) {
  return (
    <section style={{ textAlign: "center", paddingTop: 24 }}>
      <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: 2, color: brand, background: "#eaf3fc", padding: "5px 10px", borderRadius: 999, textTransform: "uppercase" }}>
        A 3-minute identity check
      </span>
      <h1 style={{ fontSize: 44, fontWeight: 800, marginTop: 18, lineHeight: 1.1, letterSpacing: -0.5 }}>
        Who are you trying to become?
      </h1>
      <p style={{ fontSize: 18, color: meta, marginTop: 16, lineHeight: 1.5 }}>
        Not in 5 years. In the next <strong style={{ color: ink }}>30 days</strong>.<br />
        Most people can't answer this honestly — and that's exactly why they stay stuck.
      </p>
      <button
        onClick={onStart}
        style={{ marginTop: 32, background: brand, color: "white", border: 0, borderRadius: 10, padding: "14px 28px", fontSize: 16, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 14px rgba(42,114,215,.25)" }}
      >
        Start the questions →
      </button>
      <p style={{ marginTop: 14, fontSize: 12, color: meta }}>
        5 questions · 3 minutes · No email required to take it
      </p>
    </section>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 4, background: "#e7e9ee", borderRadius: 999, overflow: "hidden", marginBottom: 32 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: brand, transition: "width 240ms ease" }} />
    </div>
  );
}

function QuestionCard({
  q,
  stepIdx,
  total,
  onPick,
  selected,
}: {
  q: Question;
  stepIdx: number;
  total: number;
  onPick: (v: string) => void;
  selected?: string;
}) {
  return (
    <section>
      <div style={{ fontSize: 12, color: meta, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
        Question {stepIdx} of {total}
      </div>
      <h2 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.3 }}>{q.prompt}</h2>
      {q.helper && (
        <p style={{ fontSize: 14, color: meta, marginTop: 8, lineHeight: 1.5 }}>{q.helper}</p>
      )}

      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
        {q.choices.map((c) => {
          const isSelected = selected === c.value;
          return (
            <button
              key={c.value}
              onClick={() => onPick(c.value)}
              style={{
                background: isSelected ? brand : "white",
                color: isSelected ? "white" : ink,
                border: `1.5px solid ${isSelected ? brand : "#e1e4ea"}`,
                borderRadius: 12,
                padding: "16px 18px",
                fontSize: 15,
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 140ms ease",
              }}
              onMouseOver={(e) => {
                if (!isSelected) (e.currentTarget.style.borderColor = brand);
              }}
              onMouseOut={(e) => {
                if (!isSelected) (e.currentTarget.style.borderColor = "#e1e4ea");
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Reveal({
  answers,
  onCta,
}: {
  answers: Record<string, string>;
  onCta: () => void;
}) {
  const becomeLabel = BECOMES[answers.become] || "the person you said you want to become";
  const avoidLabel = AVOIDS[answers.avoid] || "stuck where you are";
  const storyObstacle = STORY_OBSTACLE[answers.story] || "Your resume isn't working as hard as it should.";
  const durationLabel = DURATION_LABEL[answers.duration] || "a while";

  return (
    <section>
      <div style={{ fontSize: 12, color: brand, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
        Here's what you said
      </div>

      <h2 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.2, letterSpacing: -0.4 }}>
        You want to be{" "}
        <span style={{ background: "#eaf3fc", padding: "2px 8px", borderRadius: 6, color: brand }}>
          {becomeLabel}
        </span>
        .
      </h2>

      <p style={{ fontSize: 17, color: ink, marginTop: 18, lineHeight: 1.5 }}>
        And you do NOT want to be the one{" "}
        <strong>{avoidLabel}</strong>.
      </p>

      <p style={{ fontSize: 15, color: meta, marginTop: 12, lineHeight: 1.6 }}>
        You haven't had a real interview in <strong style={{ color: ink }}>{durationLabel}</strong>. That's a signal,
        not a sentence. Here's what's actually in the way:
      </p>

      <div style={{ marginTop: 18, padding: "20px 22px", background: "#fff8e6", border: "1px solid #f5e0a0", borderRadius: 12, fontSize: 15, lineHeight: 1.6, color: "#5a4500" }}>
        {storyObstacle}
      </div>

      <h3 style={{ fontSize: 22, fontWeight: 700, marginTop: 36, lineHeight: 1.3 }}>
        ResumeMint closes that gap in 7 days.
      </h3>

      <ol style={{ marginTop: 16, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          ["Day 1", "Rebuild your resume", "Import what you have. AI rewrites your bullets with measurable impact."],
          ["Day 2", "ATS-check it", "See exactly which keywords you're missing for the role you actually want."],
          ["Day 3", "Cover letter template", "One base letter, infinitely tailorable. No more blank pages at 11pm."],
          ["Day 4–5", "Apply at volume", "Our Chrome extension auto-fills Greenhouse, Lever, Ashby, Workable, LinkedIn — you click Submit."],
          ["Day 6", "Track everything", "Every application logged. No more wondering who you sent what to."],
          ["Day 7", "Tune + repeat", "Double down on what's getting responses. Skip what isn't."],
        ].map(([day, t, d]) => (
          <li key={day as string} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "12px 14px", background: "white", border: "1px solid #ececef", borderRadius: 10 }}>
            <span style={{ flexShrink: 0, background: brand, color: "white", fontSize: 11, fontWeight: 700, padding: "5px 8px", borderRadius: 6, minWidth: 64, textAlign: "center" }}>{day}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{t}</div>
              <div style={{ fontSize: 13, color: meta, marginTop: 2, lineHeight: 1.45 }}>{d}</div>
            </div>
          </li>
        ))}
      </ol>

      <div style={{ marginTop: 36, padding: 28, borderRadius: 16, background: "linear-gradient(145deg, #0a2d50 0%, #2a72d7 100%)", color: "white", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", opacity: 0.85 }}>
          The commitment
        </div>
        <div style={{ fontSize: 38, fontWeight: 800, marginTop: 12, lineHeight: 1 }}>
          $19<span style={{ fontSize: 16, fontWeight: 500, opacity: 0.85 }}>/month</span>
        </div>
        <p style={{ fontSize: 14, marginTop: 8, opacity: 0.9, lineHeight: 1.5 }}>
          First 14 days free. Cancel anytime.<br />
          You don't lock yourself in — you lock in the version of yourself that doesn't settle.
        </p>
        <button
          onClick={onCta}
          style={{ marginTop: 22, background: "white", color: brand, border: 0, borderRadius: 10, padding: "14px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer", width: "100%", maxWidth: 360 }}
        >
          Become {becomeLabel.split(" ").slice(0, 4).join(" ")}…
        </button>
        <p style={{ fontSize: 11, marginTop: 12, opacity: 0.75 }}>
          14-day free trial · No credit card to start the trial · Cancel anytime
        </p>
      </div>

      <div style={{ marginTop: 36, padding: "18px 20px", borderLeft: `3px solid ${brand}`, background: "white", borderRadius: 6, fontSize: 14, color: ink, lineHeight: 1.55 }}>
        <strong>One last question:</strong> 30 days from now, are you going to be glad you took 3 minutes to be honest with yourself today — or going to wish you had?
      </div>

      <div style={{ marginTop: 28, fontSize: 12, color: meta, textAlign: "center", lineHeight: 1.6 }}>
        <Link href="/pricing" style={{ color: meta }}>See what's included</Link>
        {" · "}
        <Link href="/faq" style={{ color: meta }}>FAQ</Link>
        {" · "}
        <Link href="/laid-off" style={{ color: meta }}>Recently laid off?</Link>
      </div>
    </section>
  );
}
