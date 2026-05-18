// lib/demoResume.ts
//
// Fake-but-realistic resume data used to render template thumbnails on
// /templates. Shape matches what TEMPLATE_REGISTRY → toCircularProps
// expects (sections[].records[].fields {header, subheader, city, period,
// richtextValue, level}).

const bullets = (items: string[]) =>
  `<ul>${items.map((b) => `<li>${b}</li>`).join('')}</ul>`;

export const DEMO_RESUME_DATA: any = {
  title: 'Alex Rivera',
  headline: 'Senior Product Designer',
  photoUrl: '/demo/avatar.png',
  emailaddress: 'alex.rivera@example.com',
  phonenumber: '+1 (415) 555-0142',
  address: ['San Francisco, CA'],
  city: 'San Francisco',
  website: 'alexrivera.design',
  linkedin: 'linkedin.com/in/alexrivera',
  personalDetails: {
    givenName: 'Alex',
    familyName: 'Rivera',
    desiredJobPosition: 'Senior Product Designer',
  },
  sections: [
    {
      key: 'personalDetails',
      title: 'Personal details',
      records: [{ fields: {} }],
    },
    {
      key: 'profile',
      title: 'Profile',
      records: [
        {
          fields: {
            richtextValue:
              'Senior product designer with 8+ years shaping consumer SaaS — fintech, productivity, and AI tooling. I pair sharp UX intuition with design-system rigor, and I love taking a fuzzy product brief from “maybe?” to “ship it.”',
          },
        },
      ],
    },
    {
      key: 'employment',
      title: 'Employment',
      records: [
        {
          fields: {
            header: 'Senior Product Designer',
            subheader: 'Northwind Labs',
            city: 'San Francisco, CA',
            period: 'Mar 2022 – Present',
            richtextValue: bullets([
              'Led the redesign of the onboarding flow that lifted activation by 38% in a quarter.',
              'Built and shipped a cross-product design system used by 6 squads.',
              'Partnered with research and engineering on a generative-AI assistant feature.',
            ]),
          },
        },
        {
          fields: {
            header: 'Product Designer',
            subheader: 'Helio Finance',
            city: 'Remote',
            period: 'Aug 2019 – Feb 2022',
            richtextValue: bullets([
              'Designed the consumer card-issuing experience from zero to 100k MAU.',
              'Ran 30+ usability sessions, cutting support tickets by 22%.',
            ]),
          },
        },
      ],
    },
    {
      key: 'educations',
      title: 'Education',
      records: [
        {
          fields: {
            header: 'BFA, Interaction Design',
            subheader: 'School of Visual Arts',
            city: 'New York, NY',
            period: '2013 – 2017',
          },
        },
      ],
    },
    {
      key: 'skills',
      title: 'Skills',
      records: [
        { fields: { header: 'Figma', level: 'Expert' } },
        { fields: { header: 'Design systems', level: 'Expert' } },
        { fields: { header: 'User research', level: 'Advanced' } },
        { fields: { header: 'Prototyping', level: 'Advanced' } },
        { fields: { header: 'HTML & CSS', level: 'Advanced' } },
        { fields: { header: 'Motion design', level: 'Intermediate' } },
      ],
    },
    {
      key: 'languages',
      title: 'Languages',
      records: [
        { fields: { header: 'English', level: 'Native' } },
        { fields: { header: 'Spanish', level: 'Fluent' } },
        { fields: { header: 'Portuguese', level: 'Conversational' } },
      ],
    },
  ],
};

export const RESUME_RENDERERS = [
  'circular',
  'professional',
  'elegant',
  'classic',
  'modern',
  'minimal',
  'creative',
  'compact',
  'executive',
  'chrono',
  'horizontal',
  'casual',
] as const;
export type ResumeRenderer = (typeof RESUME_RENDERERS)[number];
