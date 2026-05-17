// lib/demoCoverLetter.ts
//
// Fake-but-realistic cover letter data used to render template thumbnails
// on /cover-letter-templates.

import type { CoverLetterData } from '@/components/cover-letter-templates/types';

export const DEMO_COVER_LETTER_DATA: CoverLetterData = {
  sender: {
    fullName: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    phone: '+1 (415) 555-0142',
    address: '1480 Mission St',
    city: 'San Francisco, CA',
    linkedIn: 'linkedin.com/in/alexrivera',
  },
  recipient: {
    name: 'Jordan Hayes',
    title: 'Hiring Manager',
    company: 'Lumen Software',
    address: '500 Howard St',
    city: 'San Francisco, CA',
  },
  date: 'May 17, 2026',
  subject: 'Application for Senior Product Designer',
  salutation: 'Dear Jordan,',
  paragraphs: [
    "I'm writing to apply for the Senior Product Designer role at Lumen Software. After eight years shipping consumer SaaS, the way Lumen treats research-led design and craft as first-class lines me up perfectly for what your team is building.",
    "Most recently at Northwind Labs, I led the redesign of an onboarding flow that lifted activation by 38% in a quarter, and I built a cross-product design system that cut handoff time by ~40%. Before that I designed Helio Finance's consumer card-issuing experience from zero to 100k MAU.",
    "I'd love to bring that mix — strong systems thinking with a feel for what makes a product feel personal — to Lumen. I'm available for a call next week and happy to walk you through a portfolio piece that closely mirrors the work in your latest job post.",
  ],
  closing: 'Best regards,',
  signatureName: 'Alex Rivera',
};

export const COVER_LETTER_RENDERERS_LIST = [
  'professional',
  'classic',
  'elegant',
  'creative',
] as const;
export type CoverLetterRenderer = (typeof COVER_LETTER_RENDERERS_LIST)[number];
