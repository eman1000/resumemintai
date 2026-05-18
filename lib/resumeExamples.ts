// lib/resumeExamples.ts
//
// Dataset behind the programmatic /resume-examples/[slug] pages.
// Each entry produces one statically-generated, SEO-targeted page aimed at
// long-tail queries like "software engineer resume example".
//
// Each entry is a COMPLETE sample resume — contact header, summary, multiple
// dated roles, education, certifications, and skills — so the page delivers a
// real example, not a fragment.
//
// IMPORTANT: candidates are illustrative samples, not real people. Emails use
// the reserved, non-routable example.com domain; phone numbers are fictional.
// Keep it that way — never substitute a real person's details.
//
// Quality bar: every entry must have genuinely distinct, role-specific
// content. Thin/near-duplicate pages risk Google's doorway-page penalties.

export type ExperienceEntry = {
  role: string;
  company: string;
  location: string;
  period: string;          // e.g. "2021 – Present"
  bullets: string[];
};

export type EducationEntry = {
  qualification: string;
  institution: string;
  period: string;
};

export type ResumeExample = {
  slug: string;
  title: string;            // job title, Title Case
  category: string;         // grouping for the hub page + related links
  /** One-line meta description angle. */
  metaAngle: string;
  /** 2-3 sentence intro shown above the sample. Role-specific. */
  intro: string;
  // --- sample candidate (illustrative only) ---
  candidateName: string;
  candidateLocation: string;
  candidatePhone: string;   // fictional
  /** Sample professional summary. */
  summary: string;
  /** Work history, most recent first. */
  experience: ExperienceEntry[];
  /** Education, most recent first. */
  education: EducationEntry[];
  /** Certifications / licences (optional). */
  certifications?: string[];
  /** 10-12 hard + soft skills relevant to the role. */
  skills: string[];
  /** ATS keywords recruiters/parsers look for in this role. */
  atsKeywords: string[];
  /** 3 common, role-specific resume mistakes. */
  mistakes: string[];
};

export const RESUME_EXAMPLES: ResumeExample[] = [
  {
    slug: 'software-engineer',
    title: 'Software Engineer',
    category: 'Technology',
    metaAngle: 'a full sample resume, achievement bullets, skills, and ATS keywords',
    intro:
      'A software engineer resume is judged on impact, not task lists. Recruiters and ATS scanners look for the languages and systems you have shipped, the scale you have worked at, and measurable outcomes. Lead with results, then back them with the stack.',
    candidateName: 'Daniel Okafor',
    candidateLocation: 'Berlin, Germany',
    candidatePhone: '+49 30 901 55012',
    summary:
      'Software engineer with 7+ years building and scaling backend services for high-traffic web applications. Specialised in distributed systems, API design, and performance optimisation. Reduced p95 latency by 40% and shipped features used by 2M+ monthly users.',
    experience: [
      {
        role: 'Software Engineer',
        company: 'Acme Cloud',
        location: 'Berlin, Germany',
        period: '2021 – Present',
        bullets: [
          'Designed and shipped a payments microservice handling €4M/month in transactions with 99.98% uptime.',
          'Cut API p95 latency from 850ms to 320ms by introducing query batching and a Redis cache layer.',
          'Led migration of 12 services from a monolith to containerised deployments, halving release time.',
          'Mentored 3 junior engineers; 2 were promoted within 12 months.',
          'Automated regression testing, raising coverage from 54% to 87% and cutting production incidents 30%.',
          'Partnered with product to launch a feature adopted by 60% of active users in its first quarter.',
        ],
      },
      {
        role: 'Software Engineer',
        company: 'Finch Labs',
        location: 'Berlin, Germany',
        period: '2018 – 2021',
        bullets: [
          'Built and maintained REST APIs for a logistics platform serving 200K daily requests.',
          'Reduced CI build times 35% by parallelising the test pipeline.',
          'Shipped a customer-facing analytics dashboard adopted by 80% of B2B accounts.',
        ],
      },
    ],
    education: [
      {
        qualification: 'BSc Computer Science',
        institution: 'Technical University of Berlin',
        period: '2014 – 2017',
      },
    ],
    certifications: ['AWS Certified Solutions Architect – Associate'],
    skills: [
      'TypeScript', 'Python', 'Go', 'Node.js', 'React', 'PostgreSQL',
      'Docker', 'Kubernetes', 'AWS', 'CI/CD', 'System design', 'REST & GraphQL APIs',
    ],
    atsKeywords: [
      'software engineer', 'backend development', 'API design', 'microservices',
      'cloud infrastructure', 'unit testing', 'agile', 'scalability', 'CI/CD pipeline',
      'code review', 'distributed systems', 'performance optimisation',
    ],
    mistakes: [
      'Listing every technology you have ever touched instead of the ones the job description names.',
      'Describing duties ("responsible for backend code") instead of outcomes ("cut latency 40%").',
      'Omitting scale — "built an API" means little without traffic, data volume, or user numbers.',
    ],
  },
  {
    slug: 'project-manager',
    title: 'Project Manager',
    category: 'Business & Operations',
    metaAngle: 'a full sample resume, achievement bullets, skills, and ATS keywords',
    intro:
      'A project manager resume must prove you deliver — on time, on budget, and across stakeholders. Quantify the size of what you ran: budget, team size, timeline, and the business result.',
    candidateName: 'Claire Bennett',
    candidateLocation: 'London, UK',
    candidatePhone: '+44 7700 900318',
    summary:
      'PMP-certified project manager with 9+ years delivering cross-functional initiatives in software and operations. Managed portfolios worth €3M+, consistently delivering on schedule and 8–12% under budget while keeping stakeholder satisfaction above 90%.',
    experience: [
      {
        role: 'Project Manager',
        company: 'Northwind Solutions',
        location: 'London, UK',
        period: '2020 – Present',
        bullets: [
          'Delivered a 14-month, €2.4M platform rollout on time and 9% under budget across 4 departments.',
          'Managed a cross-functional team of 18; introduced weekly risk reviews that cut slipped milestones 35%.',
          'Standardised project intake and reporting, reducing status-meeting time by 6 hours per week.',
          'Negotiated vendor contracts that saved €180K annually without scope reduction.',
          'Raised stakeholder satisfaction scores from 78% to 93% over two delivery cycles.',
          'Recovered an at-risk project, bringing it from 6 weeks behind to on-time delivery.',
        ],
      },
      {
        role: 'Project Coordinator',
        company: 'Brightway Consulting',
        location: 'London, UK',
        period: '2017 – 2020',
        bullets: [
          'Coordinated 6 concurrent client projects, tracking scope, budget, and timelines.',
          'Produced weekly status reports that became the team’s reporting standard.',
          'Cut project onboarding time 40% by building a reusable kickoff template.',
        ],
      },
    ],
    education: [
      {
        qualification: 'BA Business Management',
        institution: 'University of Manchester',
        period: '2013 – 2016',
      },
    ],
    certifications: ['PMP (Project Management Professional)', 'PRINCE2 Practitioner'],
    skills: [
      'Project planning', 'Risk management', 'Stakeholder management', 'Budgeting',
      'Agile & Scrum', 'Waterfall', 'Jira', 'MS Project', 'Resource allocation',
      'Vendor management', 'Change management', 'Reporting & dashboards',
    ],
    atsKeywords: [
      'project manager', 'project lifecycle', 'stakeholder management', 'budget management',
      'risk mitigation', 'agile', 'scrum', 'cross-functional', 'project scope',
      'milestones', 'PMP', 'resource planning',
    ],
    mistakes: [
      'Saying you "managed projects" without budget, team size, or timeline figures.',
      'Leaving out the business outcome — delivery is the means, not the result.',
      'Omitting certifications (PMP, PRINCE2, CSM) that ATS filters explicitly screen for.',
    ],
  },
  {
    slug: 'registered-nurse',
    title: 'Registered Nurse',
    category: 'Healthcare',
    metaAngle: 'a full sample resume, achievement bullets, skills, and ATS keywords',
    intro:
      'A registered nurse resume must surface licensure, specialty, and patient-care outcomes fast. Hospitals screen for credentials and unit experience before anything else — put them where they cannot be missed.',
    candidateName: 'Aisling Murphy',
    candidateLocation: 'Dublin, Ireland',
    candidatePhone: '+353 1 555 0142',
    summary:
      'Compassionate registered nurse (RN, BSN) with 9+ years in acute medical-surgical and ICU settings. Skilled in patient assessment, care planning, and family education. Maintained a 98% patient-satisfaction score while managing high-acuity caseloads.',
    experience: [
      {
        role: 'Registered Nurse, Medical-Surgical Unit',
        company: 'St. Mary’s Hospital',
        location: 'Dublin, Ireland',
        period: '2019 – Present',
        bullets: [
          'Delivered direct care to 6–8 acute patients per shift with consistently zero medication errors.',
          'Cut average patient wait time for assessment by 22% by restructuring shift handover.',
          'Trained and onboarded 9 new nurses as preceptor over two years.',
          'Achieved a 98% patient-satisfaction rating across 1,000+ survey responses.',
          'Identified early sepsis signs in 3 cases, enabling rapid intervention and full recovery.',
          'Led a unit hand-hygiene initiative that reduced hospital-acquired infections 18%.',
        ],
      },
      {
        role: 'Staff Nurse',
        company: 'Riverside General Hospital',
        location: 'Dublin, Ireland',
        period: '2016 – 2019',
        bullets: [
          'Provided post-operative care for surgical patients on a 28-bed ward.',
          'Coordinated discharge planning with multidisciplinary teams.',
          'Maintained accurate electronic health records with zero compliance flags.',
        ],
      },
    ],
    education: [
      {
        qualification: 'BSc Nursing',
        institution: 'University College Dublin',
        period: '2012 – 2016',
      },
    ],
    certifications: ['Registered Nurse — NMBI', 'BLS & ACLS Certified'],
    skills: [
      'Patient assessment', 'Care planning', 'Medication administration', 'IV therapy',
      'Electronic health records (EHR)', 'Patient education', 'Wound care', 'Triage',
      'Infection control', 'Telemetry', 'Discharge planning', 'Team collaboration',
    ],
    atsKeywords: [
      'registered nurse', 'RN', 'BSN', 'patient care', 'medical-surgical', 'ICU',
      'EHR', 'medication administration', 'BLS', 'ACLS', 'patient assessment', 'discharge planning',
    ],
    mistakes: [
      'Burying your RN licence and certifications at the bottom instead of near the top.',
      'Not naming the unit/specialty — "nursing experience" is too vague for ATS matching.',
      'Skipping patient-outcome metrics (satisfaction scores, infection rates, error rates).',
    ],
  },
  {
    slug: 'data-analyst',
    title: 'Data Analyst',
    category: 'Technology',
    metaAngle: 'a full sample resume, achievement bullets, skills, and ATS keywords',
    intro:
      'A data analyst resume should prove you turn data into decisions. Recruiters look for SQL, a BI tool, and — most of all — a business result that followed your analysis.',
    candidateName: 'Priya Nair',
    candidateLocation: 'Manchester, UK',
    candidatePhone: '+44 7700 900276',
    summary:
      'Data analyst with 6+ years turning raw data into decisions for marketing and operations teams. Fluent in SQL, Python, and Tableau. Built reporting that informed €1.2M in budget reallocation and lifted campaign ROI 26%.',
    experience: [
      {
        role: 'Data Analyst',
        company: 'Brightline Retail',
        location: 'Manchester, UK',
        period: '2021 – Present',
        bullets: [
          'Built a self-service Tableau dashboard adopted by 40+ stakeholders, replacing 10 hours/week of manual reporting.',
          'Identified a churn driver through cohort analysis, informing a retention campaign that cut churn 14%.',
          'Wrote and optimised SQL pipelines, reducing a key report’s run time from 25 minutes to under 2.',
          'Delivered analysis that redirected €1.2M of marketing spend toward higher-ROI channels.',
          'A/B tested pricing changes, surfacing a variant that lifted revenue per user 9%.',
          'Automated weekly KPI reporting, freeing 8 analyst-hours per week.',
        ],
      },
      {
        role: 'Junior Data Analyst',
        company: 'Cobalt Media',
        location: 'Manchester, UK',
        period: '2019 – 2021',
        bullets: [
          'Built weekly performance reports covering 5 marketing channels.',
          'Consolidated data from 3 source systems into a single warehouse table.',
          'Automated a manual Excel report, saving the team 5 hours per week.',
        ],
      },
    ],
    education: [
      {
        qualification: 'BSc Economics',
        institution: 'University of Leeds',
        period: '2015 – 2018',
      },
    ],
    certifications: ['Google Data Analytics Professional Certificate'],
    skills: [
      'SQL', 'Python (pandas)', 'Excel', 'Tableau', 'Power BI', 'Data visualisation',
      'A/B testing', 'Statistical analysis', 'ETL', 'Data cleaning', 'Cohort analysis', 'Stakeholder reporting',
    ],
    atsKeywords: [
      'data analyst', 'SQL', 'data visualisation', 'Tableau', 'Power BI', 'Python',
      'reporting', 'A/B testing', 'KPI', 'dashboard', 'statistical analysis', 'data-driven',
    ],
    mistakes: [
      'Listing tools without showing the decision or dollar impact they produced.',
      'Forgetting SQL — most ATS filters for data roles screen for it explicitly.',
      'Presenting analysis as a task ("ran reports") rather than an outcome ("cut churn 14%").',
    ],
  },
  {
    slug: 'marketing-manager',
    title: 'Marketing Manager',
    category: 'Marketing',
    metaAngle: 'a full sample resume, achievement bullets, skills, and ATS keywords',
    intro:
      'A marketing manager resume lives or dies on numbers: pipeline, ROI, CAC, growth. Show the channels you own and the revenue you moved, not the campaigns you "managed".',
    candidateName: 'Tom Hargreaves',
    candidateLocation: 'London, UK',
    candidatePhone: '+44 7700 900491',
    summary:
      'Marketing manager with 8+ years driving demand across paid, organic, and lifecycle channels. Scaled a B2B SaaS pipeline from €400K to €1.8M in 18 months while cutting blended CAC 22%.',
    experience: [
      {
        role: 'Marketing Manager',
        company: 'Cleartide SaaS',
        location: 'London, UK',
        period: '2020 – Present',
        bullets: [
          'Grew marketing-sourced pipeline from €400K to €1.8M in 18 months across paid and organic.',
          'Cut blended customer acquisition cost (CAC) 22% by reallocating spend to top-performing channels.',
          'Launched an SEO content programme that lifted organic traffic 140% year over year.',
          'Ran lifecycle email campaigns improving trial-to-paid conversion from 9% to 14%.',
          'Managed a €600K annual budget and a team of 4 across content, paid, and design.',
          'Built attribution reporting that reset channel investment and raised overall ROAS 1.7x.',
        ],
      },
      {
        role: 'Digital Marketing Specialist',
        company: 'Vively Agency',
        location: 'London, UK',
        period: '2017 – 2020',
        bullets: [
          'Managed paid search and paid social campaigns for 8 B2B clients.',
          'Grew one client’s organic traffic 90% through an SEO content programme.',
          'Built reporting dashboards adopted as the agency’s reporting standard.',
        ],
      },
    ],
    education: [
      {
        qualification: 'BA Marketing',
        institution: 'University of Bristol',
        period: '2013 – 2016',
      },
    ],
    certifications: ['Google Ads Certified', 'HubSpot Inbound Marketing Certified'],
    skills: [
      'Demand generation', 'SEO', 'Paid media (Google & Meta)', 'Content marketing',
      'Marketing analytics', 'Email & lifecycle marketing', 'A/B testing', 'CRM (HubSpot)',
      'Budget management', 'Brand positioning', 'Conversion optimisation', 'Team leadership',
    ],
    atsKeywords: [
      'marketing manager', 'demand generation', 'SEO', 'paid media', 'CAC', 'ROAS',
      'content marketing', 'lead generation', 'marketing analytics', 'campaign management',
      'conversion rate', 'budget management',
    ],
    mistakes: [
      'Describing campaigns without the metric that mattered (pipeline, CAC, ROAS, conversion).',
      'Claiming "increased engagement" — vanity metrics read as filler to hiring managers.',
      'Omitting budget size and team size, which signal the scope you can operate at.',
    ],
  },
  {
    slug: 'accountant',
    title: 'Accountant',
    category: 'Finance',
    metaAngle: 'a full sample resume, achievement bullets, skills, and ATS keywords',
    intro:
      'An accountant resume must signal accuracy, compliance, and the systems you know. Recruiters screen for certifications, software, and the scale of the books you have closed.',
    candidateName: 'Elena Rossi',
    candidateLocation: 'Milan, Italy',
    candidatePhone: '+39 02 9055 0173',
    summary:
      'Detail-driven accountant with 8+ years in general ledger, month-end close, and reporting. Closed monthly books for a €20M-revenue business in 4 days and identified €90K in annual cost savings through reconciliation review.',
    experience: [
      {
        role: 'Staff Accountant',
        company: 'Halewood Manufacturing',
        location: 'Milan, Italy',
        period: '2020 – Present',
        bullets: [
          'Reduced month-end close from 9 days to 4 by automating reconciliations in NetSuite.',
          'Managed general ledger for a €20M-revenue entity with zero audit adjustments for 3 years.',
          'Identified €90K in recurring billing errors during a vendor-account review.',
          'Prepared accurate VAT and corporate tax filings, all submitted before deadline.',
          'Built monthly variance reports that helped leadership cut overhead spend 7%.',
          'Trained 2 junior accountants on close procedures and internal controls.',
        ],
      },
      {
        role: 'Junior Accountant',
        company: 'Borden & Vale',
        location: 'Milan, Italy',
        period: '2017 – 2020',
        bullets: [
          'Processed accounts payable and receivable for a portfolio of 40 clients.',
          'Prepared monthly bank reconciliations with consistent accuracy.',
          'Supported year-end audits by compiling schedules and supporting documentation.',
        ],
      },
    ],
    education: [
      {
        qualification: 'BSc Accounting & Finance',
        institution: 'Bocconi University',
        period: '2013 – 2016',
      },
    ],
    certifications: ['ACCA (Association of Chartered Certified Accountants)'],
    skills: [
      'General ledger', 'Month-end close', 'Account reconciliation', 'Financial reporting',
      'Accounts payable & receivable', 'VAT & tax preparation', 'NetSuite', 'QuickBooks',
      'Excel (advanced)', 'Internal controls', 'Audit support', 'GAAP / IFRS',
    ],
    atsKeywords: [
      'accountant', 'general ledger', 'month-end close', 'reconciliation', 'financial reporting',
      'accounts payable', 'accounts receivable', 'GAAP', 'tax preparation', 'audit',
      'QuickBooks', 'variance analysis',
    ],
    mistakes: [
      'Leaving off certifications (ACCA, CPA, CIMA) and software — both are hard ATS filters.',
      'Writing "handled accounts" instead of stating revenue size, close speed, or accuracy.',
      'Ignoring compliance language (GAAP, IFRS, internal controls) recruiters search for.',
    ],
  },
  {
    slug: 'product-manager',
    title: 'Product Manager',
    category: 'Technology',
    metaAngle: 'a full sample resume, achievement bullets, skills, and ATS keywords',
    intro:
      'A product manager resume should read as a record of shipped outcomes. Show what you launched, the metric it moved, and how you decided what to build.',
    candidateName: 'James Cole',
    candidateLocation: 'Amsterdam, Netherlands',
    candidatePhone: '+31 20 905 5028',
    summary:
      'Product manager with 9+ years owning B2B and consumer products end to end. Shipped features that grew activation 31% and drove €2M in new annual recurring revenue, working from discovery through launch.',
    experience: [
      {
        role: 'Product Manager',
        company: 'Vantage Apps',
        location: 'Amsterdam, Netherlands',
        period: '2020 – Present',
        bullets: [
          'Owned a product line that grew from €1.2M to €3.2M ARR in two years.',
          'Lifted new-user activation 31% by redesigning onboarding after 20+ customer interviews.',
          'Defined and shipped a self-serve plan that opened a segment worth €700K/year.',
          'Built and prioritised the roadmap with engineering, cutting cycle time 25%.',
          'Ran an experimentation programme; 4 of 9 tests shipped with measurable revenue lift.',
          'Reduced churn 11% by sequencing fixes against support and usage data.',
        ],
      },
      {
        role: 'Associate Product Manager',
        company: 'Loop Software',
        location: 'Amsterdam, Netherlands',
        period: '2017 – 2020',
        bullets: [
          'Owned the mobile onboarding flow, lifting completion rate 18%.',
          'Ran user interviews and translated findings into prioritised tickets.',
          'Coordinated 2-week release cycles with engineering and design.',
        ],
      },
    ],
    education: [
      {
        qualification: 'BSc Industrial Engineering',
        institution: 'Delft University of Technology',
        period: '2012 – 2016',
      },
    ],
    certifications: ['Certified Scrum Product Owner (CSPO)'],
    skills: [
      'Product strategy', 'Roadmapping', 'User research', 'Data analysis', 'A/B testing',
      'Agile & Scrum', 'Stakeholder management', 'Go-to-market', 'Prioritisation',
      'Wireframing', 'SQL', 'Customer discovery',
    ],
    atsKeywords: [
      'product manager', 'product roadmap', 'product strategy', 'user research',
      'go-to-market', 'agile', 'stakeholder management', 'A/B testing', 'KPI',
      'product lifecycle', 'prioritisation', 'cross-functional',
    ],
    mistakes: [
      'Listing features shipped without the metric each one moved.',
      'Sounding like a project manager — show product decisions, not just delivery.',
      'Omitting how you prioritised; "data-informed" needs a concrete example.',
    ],
  },
  {
    slug: 'sales-representative',
    title: 'Sales Representative',
    category: 'Sales',
    metaAngle: 'a full sample resume, achievement bullets, skills, and ATS keywords',
    intro:
      'A sales resume is a scoreboard. Quota attainment, revenue closed, and ranking belong in the first three lines — recruiters scan for them before reading anything else.',
    candidateName: 'Nadia Hassan',
    candidateLocation: 'London, UK',
    candidatePhone: '+44 7700 900654',
    summary:
      'Results-driven sales representative with 7+ years in B2B SaaS. Consistently exceeded quota, averaging 118% attainment, and closed €1.4M in new business in the last fiscal year while ranking top 3 of 22 reps.',
    experience: [
      {
        role: 'Account Executive',
        company: 'Summit Software',
        location: 'London, UK',
        period: '2021 – Present',
        bullets: [
          'Closed €1.4M in new annual revenue at 118% of quota — top 3 of 22 reps.',
          'Built a territory pipeline from €0 to €900K in the first 9 months.',
          'Improved win rate from 19% to 27% by qualifying earlier with a discovery framework.',
          'Shortened average sales cycle from 71 to 52 days through structured follow-up.',
          'Generated 40% of personal pipeline through self-sourced outbound prospecting.',
          'Mentored 2 new reps who both hit quota within their first two quarters.',
        ],
      },
      {
        role: 'Sales Development Representative',
        company: 'Summit Software',
        location: 'London, UK',
        period: '2019 – 2021',
        bullets: [
          'Booked 35+ qualified meetings per quarter through outbound prospecting.',
          'Ranked #1 of 9 SDRs for pipeline generated in 2020.',
          'Promoted to Account Executive after consistently exceeding meeting targets.',
        ],
      },
    ],
    education: [
      {
        qualification: 'BA Communications',
        institution: 'University of Nottingham',
        period: '2015 – 2018',
      },
    ],
    skills: [
      'B2B sales', 'Prospecting', 'Pipeline management', 'Negotiation', 'CRM (Salesforce)',
      'Cold outreach', 'Discovery & qualification', 'Account management', 'Forecasting',
      'Solution selling', 'Closing', 'Relationship building',
    ],
    atsKeywords: [
      'sales representative', 'quota', 'B2B sales', 'pipeline', 'prospecting', 'CRM',
      'Salesforce', 'account management', 'lead generation', 'closing', 'revenue growth',
      'negotiation',
    ],
    mistakes: [
      'Hiding quota attainment and revenue — these are the first things a sales recruiter wants.',
      'Listing duties ("made calls") instead of results ("closed €1.4M, 118% of quota").',
      'Leaving out ranking or pipeline figures that prove you outperformed peers.',
    ],
  },
  {
    slug: 'customer-service-representative',
    title: 'Customer Service Representative',
    category: 'Customer Support',
    metaAngle: 'a full sample resume, achievement bullets, skills, and ATS keywords',
    intro:
      'A customer service resume should prove you keep customers happy at volume. Surface satisfaction scores, resolution rates, and the systems you have used.',
    candidateName: 'Liam Doyle',
    candidateLocation: 'Dublin, Ireland',
    candidatePhone: '+353 1 555 0188',
    summary:
      'Customer service representative with 6+ years in high-volume support across phone, email, and chat. Maintained a 96% CSAT score while handling 60+ contacts per day and resolving 80% of cases on first contact.',
    experience: [
      {
        role: 'Customer Service Representative',
        company: 'Orbit Telecom',
        location: 'Dublin, Ireland',
        period: '2021 – Present',
        bullets: [
          'Maintained a 96% customer-satisfaction (CSAT) score across 12,000+ rated interactions.',
          'Resolved 80% of cases on first contact, beating the team average of 68%.',
          'Handled 60+ daily contacts across phone, email, and live chat without backlog.',
          'De-escalated complex complaints, retaining 45+ at-risk accounts over the year.',
          'Wrote 15 help-centre articles that cut repeat tickets on common issues 20%.',
          'Onboarded and coached 4 new representatives on tools and tone.',
        ],
      },
      {
        role: 'Retail Sales Assistant',
        company: 'Greenfield Stores',
        location: 'Dublin, Ireland',
        period: '2018 – 2021',
        bullets: [
          'Handled customer queries and complaints in a high-footfall store.',
          'Consistently exceeded monthly customer-feedback targets.',
          'Trained 5 seasonal staff on service standards and POS systems.',
        ],
      },
    ],
    education: [
      {
        qualification: 'Diploma in Business Administration',
        institution: 'Dublin Business School',
        period: '2016 – 2018',
      },
    ],
    skills: [
      'Customer support', 'Conflict resolution', 'Active listening', 'CRM (Zendesk)',
      'Live chat & email support', 'Troubleshooting', 'Product knowledge', 'Empathy',
      'Time management', 'Multitasking', 'De-escalation', 'Help-centre documentation',
    ],
    atsKeywords: [
      'customer service', 'customer support', 'CSAT', 'first contact resolution',
      'CRM', 'Zendesk', 'conflict resolution', 'live chat', 'ticketing', 'troubleshooting',
      'customer retention', 'communication',
    ],
    mistakes: [
      'Not quantifying performance — CSAT, resolution rate, and contact volume tell the story.',
      'Listing "good communication skills" without an example that proves it.',
      'Omitting the support tools (Zendesk, Intercom, Salesforce) ATS filters look for.',
    ],
  },
  {
    slug: 'graphic-designer',
    title: 'Graphic Designer',
    category: 'Creative',
    metaAngle: 'a full sample resume, achievement bullets, skills, and ATS keywords',
    intro:
      'A graphic designer resume needs two things: ATS-friendly text and a link to your portfolio. Keep the layout clean and parseable; let the portfolio carry the visuals.',
    candidateName: 'Sofia Almeida',
    candidateLocation: 'Lisbon, Portugal',
    candidatePhone: '+351 21 905 5061',
    summary:
      'Graphic designer with 7+ years across brand, digital, and print. Delivered visual systems for 30+ clients and redesigned assets that lifted campaign click-through rates 35%.',
    experience: [
      {
        role: 'Graphic Designer',
        company: 'Foundry Creative',
        location: 'Lisbon, Portugal',
        period: '2020 – Present',
        bullets: [
          'Designed brand identities for 30+ clients, from logo systems to full guidelines.',
          'Redesigned email and ad creative, lifting average click-through rate 35%.',
          'Built a reusable design-component library that cut asset turnaround time 40%.',
          'Led the visual rebrand of a flagship client, supporting a 20% lift in brand recall.',
          'Collaborated with marketing to ship 200+ social assets per quarter on schedule.',
          'Mentored a junior designer and standardised the studio’s file-handover process.',
        ],
      },
      {
        role: 'Junior Designer',
        company: 'Pixel & Co',
        location: 'Lisbon, Portugal',
        period: '2018 – 2020',
        bullets: [
          'Produced social and web assets for 10+ clients on tight deadlines.',
          'Supported senior designers on two full brand-identity projects.',
          'Built and maintained the studio’s asset template library.',
        ],
      },
    ],
    education: [
      {
        qualification: 'BA Graphic Design',
        institution: 'Lisbon School of Design',
        period: '2014 – 2017',
      },
    ],
    certifications: ['Adobe Certified Professional'],
    skills: [
      'Adobe Photoshop', 'Adobe Illustrator', 'Adobe InDesign', 'Figma', 'Brand identity',
      'Typography', 'Layout design', 'Print production', 'Digital & social design',
      'Design systems', 'Visual storytelling', 'Creative direction',
    ],
    atsKeywords: [
      'graphic designer', 'brand identity', 'Adobe Creative Suite', 'Figma', 'typography',
      'layout', 'visual design', 'print design', 'digital design', 'design systems',
      'portfolio', 'creative',
    ],
    mistakes: [
      'Submitting a heavily designed resume that ATS software cannot parse — use a clean text layout.',
      'Forgetting to include a portfolio URL, which is non-negotiable for design roles.',
      'Listing software without showing the work or outcome it produced.',
    ],
  },
  {
    slug: 'human-resources-manager',
    title: 'Human Resources Manager',
    category: 'Business & Operations',
    metaAngle: 'a full sample resume, achievement bullets, skills, and ATS keywords',
    intro:
      'An HR manager resume should show you can hire, retain, and protect the business. Quantify headcount supported, retention gains, and time-to-hire.',
    candidateName: 'Rachel Adeyemi',
    candidateLocation: 'Birmingham, UK',
    candidatePhone: '+44 7700 900207',
    summary:
      'HR manager with 10+ years across recruitment, employee relations, and people operations. Supported a 350-person organisation, cut time-to-hire 30%, and lifted employee retention from 81% to 91%.',
    experience: [
      {
        role: 'HR Manager',
        company: 'Lakeside Group',
        location: 'Birmingham, UK',
        period: '2019 – Present',
        bullets: [
          'Reduced average time-to-hire from 45 to 31 days by restructuring the recruitment pipeline.',
          'Raised 12-month employee retention from 81% to 91% through a revamped onboarding programme.',
          'Managed HR operations for 350 employees across 3 sites with full compliance.',
          'Rolled out a performance-review framework adopted org-wide within one cycle.',
          'Resolved 60+ employee-relations cases with no escalations to litigation.',
          'Negotiated benefits renewals that held costs flat while improving coverage.',
        ],
      },
      {
        role: 'HR Officer',
        company: 'Crestline Retail',
        location: 'Birmingham, UK',
        period: '2016 – 2019',
        bullets: [
          'Managed end-to-end recruitment for 60+ hires per year.',
          'Administered payroll and benefits for 200 employees.',
          'Advised line managers on disciplinary and grievance procedures.',
        ],
      },
    ],
    education: [
      {
        qualification: 'BA Human Resource Management',
        institution: 'Aston University',
        period: '2012 – 2015',
      },
    ],
    certifications: ['CIPD Level 7 — Chartered Member'],
    skills: [
      'Recruitment & hiring', 'Employee relations', 'Onboarding', 'Performance management',
      'HR compliance', 'Compensation & benefits', 'HRIS (Workday)', 'Policy development',
      'Conflict resolution', 'People analytics', 'Training & development', 'Employment law',
    ],
    atsKeywords: [
      'human resources', 'HR manager', 'recruitment', 'employee relations', 'onboarding',
      'performance management', 'HRIS', 'compliance', 'retention', 'time-to-hire',
      'compensation', 'employment law',
    ],
    mistakes: [
      'Describing HR as administrative tasks instead of business outcomes (retention, time-to-hire).',
      'Omitting headcount supported — it signals the scale you can operate at.',
      'Leaving out the HRIS and compliance terms recruiters and ATS screen for.',
    ],
  },
  {
    slug: 'business-analyst',
    title: 'Business Analyst',
    category: 'Business & Operations',
    metaAngle: 'a full sample resume, achievement bullets, skills, and ATS keywords',
    intro:
      'A business analyst resume should show you translate business problems into solutions. Surface the requirements you gathered, the processes you improved, and the value delivered.',
    candidateName: 'David Park',
    candidateLocation: 'London, UK',
    candidatePhone: '+44 7700 900833',
    summary:
      'Business analyst with 8+ years bridging business and technical teams across finance and operations. Delivered process and system improvements that saved €450K annually and cut a core workflow’s cycle time in half.',
    experience: [
      {
        role: 'Business Analyst',
        company: 'Meridian Financial',
        location: 'London, UK',
        period: '2020 – Present',
        bullets: [
          'Mapped and re-engineered an approvals workflow, cutting cycle time from 8 days to 4.',
          'Gathered and documented requirements for a €1.1M system implementation delivered on time.',
          'Identified process gaps that, once fixed, saved €450K in annual operating cost.',
          'Built stakeholder dashboards that replaced 12 hours/week of manual reporting.',
          'Facilitated 30+ workshops to align business and engineering on scope.',
          'Wrote user-acceptance test plans that caught defects before launch, cutting rework 25%.',
        ],
      },
      {
        role: 'Operations Analyst',
        company: 'Castlepoint Group',
        location: 'London, UK',
        period: '2017 – 2020',
        bullets: [
          'Analysed operational data to identify bottlenecks across 4 teams.',
          'Documented business processes and standard operating procedures.',
          'Supported a CRM migration affecting 150 users.',
        ],
      },
    ],
    education: [
      {
        qualification: 'BSc Management Science',
        institution: 'London School of Economics',
        period: '2013 – 2016',
      },
    ],
    certifications: ['BCS Foundation Certificate in Business Analysis'],
    skills: [
      'Requirements gathering', 'Process mapping', 'Stakeholder management', 'SQL',
      'Data analysis', 'User-acceptance testing', 'Agile', 'Business process improvement',
      'Documentation', 'Gap analysis', 'Wireframing', 'Reporting',
    ],
    atsKeywords: [
      'business analyst', 'requirements gathering', 'process improvement', 'stakeholder management',
      'gap analysis', 'user acceptance testing', 'documentation', 'SQL', 'agile',
      'business process', 'data analysis', 'workflow',
    ],
    mistakes: [
      'Listing "gathered requirements" without the project size or business result.',
      'Failing to quantify process improvements in time, cost, or error reduction.',
      'Being vague about whether work was business-side or technical — name both clearly.',
    ],
  },
  {
    slug: 'administrative-assistant',
    title: 'Administrative Assistant',
    category: 'Business & Operations',
    metaAngle: 'a full sample resume, achievement bullets, skills, and ATS keywords',
    intro:
      'An administrative assistant resume should show reliability and range. Quantify the calendars, budgets, and people you supported, and the tools you mastered.',
    candidateName: 'Hannah Schmidt',
    candidateLocation: 'Munich, Germany',
    candidatePhone: '+49 89 905 5039',
    summary:
      'Organised administrative assistant with 8+ years supporting executives and busy teams. Managed complex calendars for 4 directors, coordinated travel and events, and introduced systems that saved the team 6 hours per week.',
    experience: [
      {
        role: 'Administrative Assistant',
        company: 'Crestview Partners',
        location: 'Munich, Germany',
        period: '2020 – Present',
        bullets: [
          'Managed calendars, travel, and expenses for 4 directors with zero scheduling conflicts.',
          'Coordinated quarterly all-hands events for 120+ staff, consistently on budget.',
          'Built a shared filing and tracking system that cut document-retrieval time 50%.',
          'Processed 200+ monthly invoices and expense reports with full accuracy.',
          'Served as first point of contact, handling 50+ calls and visitors per day professionally.',
          'Onboarded new hires’ workspaces and accounts, reducing first-day setup issues to near zero.',
        ],
      },
      {
        role: 'Office Administrator',
        company: 'Adler & Klein',
        location: 'Munich, Germany',
        period: '2017 – 2020',
        bullets: [
          'Managed front-desk reception and incoming communications for a 60-person office.',
          'Coordinated office supplies, facilities, and vendor relationships.',
          'Maintained filing and records systems for the HR and finance teams.',
        ],
      },
    ],
    education: [
      {
        qualification: 'Diploma in Business Administration',
        institution: 'Munich Business College',
        period: '2015 – 2017',
      },
    ],
    skills: [
      'Calendar management', 'Travel coordination', 'Microsoft Office', 'Google Workspace',
      'Expense reporting', 'Event coordination', 'Data entry', 'Office management',
      'Minute-taking', 'Vendor liaison', 'Communication', 'Prioritisation',
    ],
    atsKeywords: [
      'administrative assistant', 'calendar management', 'scheduling', 'travel coordination',
      'Microsoft Office', 'expense reports', 'office management', 'data entry',
      'event coordination', 'communication', 'organisation', 'executive support',
    ],
    mistakes: [
      'Writing a generic duty list instead of showing volume (calendars, invoices, calls handled).',
      'Omitting the software you use daily — Office, Google Workspace, and tools are ATS filters.',
      'Underselling initiative — name the systems or processes you improved.',
    ],
  },
  {
    slug: 'teacher',
    title: 'Teacher',
    category: 'Education',
    metaAngle: 'a full sample resume, achievement bullets, skills, and ATS keywords',
    intro:
      'A teacher resume should lead with certification, subject, and grade level, then prove impact through student outcomes — not just classroom activities.',
    candidateName: 'Owen Pritchard',
    candidateLocation: 'Cardiff, UK',
    candidatePhone: '+44 7700 900925',
    summary:
      'Certified secondary teacher with 9+ years in mathematics instruction. Raised average exam pass rates 17 percentage points and designed curriculum adopted across the department.',
    experience: [
      {
        role: 'Mathematics Teacher',
        company: 'Ridgeway Secondary School',
        location: 'Cardiff, UK',
        period: '2019 – Present',
        bullets: [
          'Raised the GCSE mathematics pass rate from 68% to 85% over three academic years.',
          'Designed a differentiated curriculum later adopted by the full 6-teacher department.',
          'Mentored 4 trainee teachers through their qualification placements.',
          'Introduced data tracking to identify struggling students earlier, lifting intervention success 30%.',
          'Led an after-school programme that improved attendance among at-risk students 22%.',
          'Maintained strong parent engagement with a 95% parents-evening attendance rate.',
        ],
      },
      {
        role: 'Mathematics Teacher',
        company: 'St. Aidan’s High School',
        location: 'Cardiff, UK',
        period: '2016 – 2019',
        bullets: [
          'Taught Key Stage 3 and 4 mathematics across mixed-ability classes.',
          'Ran a GCSE revision programme that lifted attainment in target groups.',
          'Served as form tutor, supporting the pastoral needs of 28 students.',
        ],
      },
    ],
    education: [
      {
        qualification: 'PGCE Secondary Mathematics',
        institution: 'Cardiff University',
        period: '2015 – 2016',
      },
      {
        qualification: 'BSc Mathematics',
        institution: 'Swansea University',
        period: '2011 – 2014',
      },
    ],
    certifications: ['Qualified Teacher Status (QTS)'],
    skills: [
      'Curriculum design', 'Lesson planning', 'Differentiated instruction', 'Classroom management',
      'Student assessment', 'Data tracking', 'Parent communication', 'SEN awareness',
      'Educational technology', 'Mentoring', 'Behaviour management', 'Subject expertise',
    ],
    atsKeywords: [
      'teacher', 'curriculum design', 'lesson planning', 'classroom management',
      'student assessment', 'differentiated instruction', 'certified teacher',
      'student outcomes', 'parent communication', 'education', 'pedagogy', 'mentoring',
    ],
    mistakes: [
      'Listing classroom activities instead of student outcomes (pass rates, attendance, growth).',
      'Burying certification and subject/grade level instead of stating them up front.',
      'Omitting curriculum or leadership contributions that distinguish you from peers.',
    ],
  },
  {
    slug: 'operations-manager',
    title: 'Operations Manager',
    category: 'Business & Operations',
    metaAngle: 'a full sample resume, achievement bullets, skills, and ATS keywords',
    intro:
      'An operations manager resume should prove you make things run better and cheaper. Quantify throughput, cost savings, team size, and the processes you redesigned.',
    candidateName: 'Carlos Mendes',
    candidateLocation: 'Porto, Portugal',
    candidatePhone: '+351 22 905 5074',
    summary:
      'Operations manager with 12+ years optimising processes, teams, and budgets in logistics and manufacturing. Cut operating costs €600K annually, lifted on-time delivery to 98%, and led teams of up to 45.',
    experience: [
      {
        role: 'Operations Manager',
        company: 'Pinewood Logistics',
        location: 'Porto, Portugal',
        period: '2018 – Present',
        bullets: [
          'Cut annual operating costs €600K by redesigning warehouse workflows and staffing.',
          'Raised on-time delivery rate from 88% to 98% across a 5-site network.',
          'Led a team of 45 across operations, scheduling, and fulfilment.',
          'Implemented an inventory system that reduced stock discrepancies 60%.',
          'Negotiated carrier contracts saving €220K per year without service loss.',
          'Cut workplace incidents 40% through a revamped safety and training programme.',
        ],
      },
      {
        role: 'Operations Supervisor',
        company: 'Atlas Distribution',
        location: 'Porto, Portugal',
        period: '2014 – 2018',
        bullets: [
          'Supervised a 20-person warehouse shift, consistently hitting daily throughput targets.',
          'Implemented a stock-rotation process that cut waste 25%.',
          'Coordinated inbound and outbound logistics for 3 major accounts.',
        ],
      },
    ],
    education: [
      {
        qualification: 'BSc Operations & Logistics Management',
        institution: 'University of Porto',
        period: '2009 – 2012',
      },
    ],
    certifications: ['Lean Six Sigma Green Belt'],
    skills: [
      'Process optimisation', 'Supply chain management', 'Team leadership', 'Budgeting',
      'Inventory management', 'KPI tracking', 'Lean / Six Sigma', 'Vendor negotiation',
      'Logistics', 'Health & safety', 'Forecasting', 'Continuous improvement',
    ],
    atsKeywords: [
      'operations manager', 'process improvement', 'supply chain', 'cost reduction',
      'team leadership', 'inventory management', 'KPI', 'logistics', 'Lean', 'Six Sigma',
      'budget management', 'on-time delivery',
    ],
    mistakes: [
      'Describing operations duties without the cost, throughput, or quality numbers behind them.',
      'Omitting team size — it is the clearest signal of the scope you can manage.',
      'Skipping methodology (Lean, Six Sigma) and systems that ATS filters screen for.',
    ],
  },
  {
    slug: 'financial-analyst',
    title: 'Financial Analyst',
    category: 'Finance',
    metaAngle: 'a full sample resume, achievement bullets, skills, and ATS keywords',
    intro:
      'A financial analyst resume should prove your modelling drives decisions. Surface the forecasts, analyses, and recommendations that changed how money was spent.',
    candidateName: 'Grace Sullivan',
    candidateLocation: 'Edinburgh, UK',
    candidatePhone: '+44 7700 900462',
    summary:
      'Financial analyst with 8+ years in FP&A and investment analysis. Built models that informed €15M in capital decisions and improved forecast accuracy from 84% to 95%.',
    experience: [
      {
        role: 'Financial Analyst',
        company: 'Harbour Capital',
        location: 'Edinburgh, UK',
        period: '2020 – Present',
        bullets: [
          'Built a three-statement model that informed a €15M capital-allocation decision.',
          'Improved quarterly forecast accuracy from 84% to 95% by reworking driver assumptions.',
          'Delivered variance analysis that flagged €300K of overspend before quarter-end.',
          'Automated the monthly reporting pack, cutting preparation time from 3 days to 1.',
          'Evaluated 12 investment opportunities, with 4 recommendations advancing to approval.',
          'Partnered with department heads to build budgets totalling €40M.',
        ],
      },
      {
        role: 'Finance Associate',
        company: 'Brackley & Stone',
        location: 'Edinburgh, UK',
        period: '2017 – 2020',
        bullets: [
          'Prepared monthly management accounts and board reporting packs.',
          'Built cash-flow forecasts for a portfolio of 6 business units.',
          'Supported the annual budgeting process across departments.',
        ],
      },
    ],
    education: [
      {
        qualification: 'BSc Finance',
        institution: 'University of Edinburgh',
        period: '2013 – 2016',
      },
    ],
    certifications: ['CFA Level II Candidate'],
    skills: [
      'Financial modelling', 'Forecasting', 'FP&A', 'Variance analysis', 'Valuation',
      'Excel (advanced)', 'Budgeting', 'Financial reporting', 'Scenario analysis',
      'Power BI', 'SQL', 'Data visualisation',
    ],
    atsKeywords: [
      'financial analyst', 'financial modelling', 'forecasting', 'FP&A', 'variance analysis',
      'budgeting', 'valuation', 'financial reporting', 'Excel', 'scenario analysis',
      'data analysis', 'KPI',
    ],
    mistakes: [
      'Listing "built models" without the decision or amount of money they influenced.',
      'Omitting forecast accuracy or variance figures that prove analytical rigour.',
      'Failing to name FP&A, valuation, or modelling explicitly — these are ATS keywords.',
    ],
  },
];

const BY_SLUG = new Map(RESUME_EXAMPLES.map((e) => [e.slug, e]));

export function getResumeExample(slug: string): ResumeExample | undefined {
  return BY_SLUG.get(slug);
}

export function getAllResumeExampleSlugs(): string[] {
  return RESUME_EXAMPLES.map((e) => e.slug);
}

/** Derive an illustrative, non-routable email from a sample candidate name. */
export function exampleEmail(name: string): string {
  const parts = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/);
  return `${parts.join('.')}@example.com`;
}

/** Other examples in the same category, for internal linking. */
export function getRelatedExamples(slug: string, limit = 4): ResumeExample[] {
  const current = BY_SLUG.get(slug);
  if (!current) return [];
  const sameCategory = RESUME_EXAMPLES.filter(
    (e) => e.slug !== slug && e.category === current.category,
  );
  const others = RESUME_EXAMPLES.filter(
    (e) => e.slug !== slug && e.category !== current.category,
  );
  return [...sameCategory, ...others].slice(0, limit);
}

/** Categories with their examples, for the hub page. */
export function getExamplesByCategory(): Array<{ category: string; examples: ResumeExample[] }> {
  const order: string[] = [];
  const map = new Map<string, ResumeExample[]>();
  for (const e of RESUME_EXAMPLES) {
    if (!map.has(e.category)) {
      map.set(e.category, []);
      order.push(e.category);
    }
    map.get(e.category)!.push(e);
  }
  return order.map((category) => ({ category, examples: map.get(category)! }));
}
