// lib/coverLetterExamples.ts
//
// Dataset behind the programmatic /cover-letter-examples/[slug] pages.
// Mirrors lib/resumeExamples.ts — slugs match 1:1 so each role has a paired
// resume example and cover letter example that cross-link.
//
// The sample candidate (name, location, contact) is pulled from the matching
// resume example at render time, so the two examples stay consistent.
//
// Quality bar: every letter must be genuinely distinct and role-specific.
// Target companies and recipients are fictional.

export type CoverLetterExample = {
  slug: string;            // matches a resume-examples slug
  title: string;           // job title, Title Case
  category: string;
  metaAngle: string;
  /** 2-3 sentence intro / guidance for cover letters in this role. */
  intro: string;
  /** Fictional company the sample letter is addressed to. */
  targetCompany: string;
  /** Salutation line, e.g. "Dear Hiring Manager,". */
  greeting: string;
  /** Body paragraphs of the letter, in order (opening → body → close). */
  paragraphs: string[];
  /** Sign-off line, e.g. "Sincerely,". */
  signOff: string;
  /** 3-4 "why this works" annotations. */
  keyPoints: string[];
  /** 3 common, role-aware cover-letter mistakes. */
  mistakes: string[];
};

export const COVER_LETTER_EXAMPLES: CoverLetterExample[] = [
  {
    slug: 'software-engineer',
    title: 'Software Engineer',
    category: 'Technology',
    metaAngle: 'a full sample letter, a why-it-works breakdown, and common mistakes',
    intro:
      'A software engineer cover letter should not restate your resume — it should tell a short, specific story about something you built and why it mattered. Lead with an outcome, name the stack only where it earns its place, and connect your work to what the team needs.',
    targetCompany: 'Northstar Technologies',
    greeting: 'Dear Hiring Manager,',
    paragraphs: [
      'I am writing to apply for the Backend Software Engineer role at Northstar Technologies. Over the past seven years I have built and scaled backend services for high-traffic applications, and Northstar’s focus on reliable, large-scale infrastructure is exactly the kind of work I want to do next.',
      'In my current role at Acme Cloud, I designed a payments microservice that processes €4M per month at 99.98% uptime, and cut API p95 latency from 850ms to 320ms through query batching and a Redis cache layer. I also led the migration of 12 services from a monolith to containerised deployments, which halved our release time.',
      'Beyond shipping features, I care about the engineers around me — I have mentored three juniors, two of whom were promoted within a year. I would bring that same mix of hands-on delivery and team support to Northstar, where owning systems end to end clearly matters.',
      'I would welcome the chance to discuss how my experience with distributed systems and performance work could help your team. Thank you for your time and consideration.',
    ],
    signOff: 'Sincerely,',
    keyPoints: [
      'Opens by naming the exact role and a genuine reason for the interest — not a generic greeting.',
      'Leads the second paragraph with hard metrics (€4M/month, 99.98% uptime, 850ms → 320ms) rather than a duty list.',
      'Adds something the resume cannot: mentoring and how the candidate works with a team.',
      'Closes with a confident, low-pressure call to action.',
    ],
    mistakes: [
      'Restating the resume line by line instead of telling one focused story.',
      'Listing every framework you know — name only the technologies the role actually calls for.',
      'Writing about what you want from the job instead of what you would contribute.',
    ],
  },
  {
    slug: 'project-manager',
    title: 'Project Manager',
    category: 'Business & Operations',
    metaAngle: 'a full sample letter, a why-it-works breakdown, and common mistakes',
    intro:
      'A project manager cover letter should prove you deliver. Quantify the scale of what you have run — budget, team size, timeline — and show you can connect delivery to a business result, not just keep a plan on track.',
    targetCompany: 'Halcyon Group',
    greeting: 'Dear Hiring Manager,',
    paragraphs: [
      'I am applying for the Project Manager position at Halcyon Group. I am a PMP-certified project manager with nine years of experience delivering cross-functional initiatives on time and on budget, and I am keen to bring that record to a team known for ambitious delivery.',
      'At Northwind Solutions I led a 14-month, €2.4M platform rollout that landed on schedule and 9% under budget across four departments. I introduced weekly risk reviews that cut slipped milestones by 35%, and I recovered an at-risk project that had fallen six weeks behind, bringing it back to an on-time delivery.',
      'What I value most is keeping stakeholders aligned and informed — over two delivery cycles I raised satisfaction scores from 78% to 93%. I would bring that same discipline around communication, risk, and budget control to Halcyon Group.',
      'I would welcome the opportunity to discuss how I can help your projects ship predictably. Thank you for considering my application.',
    ],
    signOff: 'Sincerely,',
    keyPoints: [
      'States the role and a clear, relevant credential (PMP) in the first two sentences.',
      'Backs delivery claims with budget, timeline, and team-size figures.',
      'Highlights a recovery story — proof of judgement under pressure, not just smooth sailing.',
      'Ties stakeholder management to a measurable result (78% → 93%).',
    ],
    mistakes: [
      'Saying you "managed projects" without budget, timeline, or team-size figures.',
      'Describing process for its own sake instead of the business outcome it produced.',
      'Omitting a certification (PMP, PRINCE2) the role explicitly asks for.',
    ],
  },
  {
    slug: 'registered-nurse',
    title: 'Registered Nurse',
    category: 'Healthcare',
    metaAngle: 'a full sample letter, a why-it-works breakdown, and common mistakes',
    intro:
      'A registered nurse cover letter should make licensure, specialty, and patient-care values clear early. Hospitals want to see clinical competence and the human qualities that do not fit neatly on a resume.',
    targetCompany: 'Maple Grove Hospital',
    greeting: 'Dear Hiring Manager,',
    paragraphs: [
      'I am writing to apply for the Registered Nurse position on the medical-surgical unit at Maple Grove Hospital. I am an RN with a BSN and nine years of acute-care experience, and your hospital’s reputation for patient-centred care is what draws me to this role.',
      'On my current medical-surgical unit at St. Mary’s Hospital, I care for six to eight acute patients per shift with a consistent record of zero medication errors. I restructured shift handover to cut assessment wait times by 22%, and I led a hand-hygiene initiative that reduced hospital-acquired infections by 18%.',
      'Clinical skill matters, but so does how patients and families experience their care — I have held a 98% patient-satisfaction rating across more than a thousand survey responses, and I take pride in mentoring new nurses as a preceptor.',
      'I would be glad to discuss how my experience could support your unit. Thank you for your time and consideration.',
    ],
    signOff: 'Sincerely,',
    keyPoints: [
      'Names the licence (RN, BSN) and specialty in the opening paragraph, where screeners look first.',
      'Pairs clinical metrics (zero medication errors, 18% fewer infections) with a patient-experience metric.',
      'Conveys values — patient-centred care, mentoring — that a resume cannot show.',
      'Stays concise and warm, matching the tone hiring managers expect in healthcare.',
    ],
    mistakes: [
      'Leaving licensure and specialty until the end of the letter.',
      'Describing duties generically instead of citing patient-outcome results.',
      'Using a cold, corporate tone — healthcare hiring managers look for genuine care.',
    ],
  },
  {
    slug: 'data-analyst',
    title: 'Data Analyst',
    category: 'Technology',
    metaAngle: 'a full sample letter, a why-it-works breakdown, and common mistakes',
    intro:
      'A data analyst cover letter should show you turn data into decisions. Skip the tool list — name one analysis, the decision it drove, and the result that followed.',
    targetCompany: 'Beacon Analytics',
    greeting: 'Dear Hiring Manager,',
    paragraphs: [
      'I am applying for the Data Analyst role at Beacon Analytics. I have six years of experience turning raw data into decisions for marketing and operations teams, and I am drawn to Beacon’s reputation for letting analysts influence real outcomes.',
      'At Brightline Retail I built a self-service Tableau dashboard now used by more than 40 stakeholders, replacing ten hours of manual reporting each week. A cohort analysis I ran surfaced a churn driver that informed a retention campaign, which cut churn by 14%, and my analysis redirected €1.2M of marketing spend toward higher-ROI channels.',
      'I am fluent in SQL, Python, and Tableau, but what I enjoy most is the conversation that turns a finding into a decision. I would bring that same focus on practical impact to your team.',
      'I would welcome the chance to discuss how my analysis could support Beacon’s goals. Thank you for your consideration.',
    ],
    signOff: 'Sincerely,',
    keyPoints: [
      'Frames the candidate around decisions and outcomes, not software.',
      'Uses concrete numbers — 40+ stakeholders, 14% churn reduction, €1.2M reallocated.',
      'Mentions tools briefly, then pivots to the human skill of driving decisions.',
      'Keeps to four tight paragraphs — easy for a busy hiring manager to scan.',
    ],
    mistakes: [
      'Listing every tool and language without showing the impact they produced.',
      'Describing analysis as a task ("ran reports") rather than a decision you enabled.',
      'Forgetting to mention SQL when the job description clearly requires it.',
    ],
  },
  {
    slug: 'marketing-manager',
    title: 'Marketing Manager',
    category: 'Marketing',
    metaAngle: 'a full sample letter, a why-it-works breakdown, and common mistakes',
    intro:
      'A marketing manager cover letter should speak in the language of growth — pipeline, CAC, ROI. Show the channels you own and the revenue you moved, and let the numbers carry the argument.',
    targetCompany: 'Tidewater Software',
    greeting: 'Dear Hiring Manager,',
    paragraphs: [
      'I am writing to apply for the Marketing Manager position at Tidewater Software. I have eight years of experience driving demand across paid, organic, and lifecycle channels, and I am excited by the chance to build a growth engine for a product with Tidewater’s momentum.',
      'At Cleartide SaaS I grew marketing-sourced pipeline from €400K to €1.8M in 18 months while cutting blended customer acquisition cost by 22%. I launched an SEO content programme that lifted organic traffic 140% year over year, and my lifecycle email work moved trial-to-paid conversion from 9% to 14%.',
      'I manage budgets and small teams as carefully as I manage campaigns — I have run a €600K annual budget and led four people across content, paid, and design. I would bring that same accountability for both spend and results to Tidewater.',
      'I would be glad to discuss how I can help Tidewater grow efficiently. Thank you for your time and consideration.',
    ],
    signOff: 'Sincerely,',
    keyPoints: [
      'Speaks in growth metrics from the first body paragraph — pipeline, CAC, conversion.',
      'Shows range across paid, organic, and lifecycle rather than a single channel.',
      'Demonstrates ownership of budget and team, signalling seniority.',
      'Ends on "grow efficiently" — the result every marketing hire is judged on.',
    ],
    mistakes: [
      'Leaning on vanity metrics (impressions, "engagement") instead of pipeline and revenue.',
      'Describing campaigns without the business result each one delivered.',
      'Failing to mention budget and team size, which signal the scope you can handle.',
    ],
  },
  {
    slug: 'accountant',
    title: 'Accountant',
    category: 'Finance',
    metaAngle: 'a full sample letter, a why-it-works breakdown, and common mistakes',
    intro:
      'An accountant cover letter should signal accuracy, compliance, and command of the tools. Name your certification, the systems you know, and a concrete example of work done faster or cleaner.',
    targetCompany: 'Stellar Manufacturing',
    greeting: 'Dear Hiring Manager,',
    paragraphs: [
      'I am applying for the Accountant position at Stellar Manufacturing. I am an ACCA-qualified accountant with eight years of experience in general ledger, month-end close, and reporting, and I am keen to support a growing manufacturing business.',
      'At Halewood Manufacturing I reduced the month-end close from nine days to four by automating reconciliations in NetSuite, and I have managed the general ledger for a €20M-revenue entity with zero audit adjustments for three years. A vendor-account review I led identified €90K in recurring billing errors.',
      'I take compliance seriously — my VAT and corporate tax filings have always been accurate and submitted before deadline. I would bring that same precision and reliability to Stellar’s finance team.',
      'I would welcome the opportunity to discuss how I can contribute. Thank you for considering my application.',
    ],
    signOff: 'Sincerely,',
    keyPoints: [
      'States the certification (ACCA) in the first sentence — a hard requirement for many roles.',
      'Quantifies accuracy and speed: close cut from 9 to 4 days, zero audit adjustments, €90K found.',
      'Names the accounting system (NetSuite) where it strengthens the claim.',
      'Reinforces compliance — the trait finance employers screen for hardest.',
    ],
    mistakes: [
      'Omitting your certification and the accounting software you use daily.',
      'Writing "handled the books" instead of citing revenue size, close speed, or accuracy.',
      'Skipping compliance language — accuracy and deadlines are the whole job.',
    ],
  },
  {
    slug: 'product-manager',
    title: 'Product Manager',
    category: 'Technology',
    metaAngle: 'a full sample letter, a why-it-works breakdown, and common mistakes',
    intro:
      'A product manager cover letter should read as a record of shipped outcomes and good decisions. Show what you launched, the metric it moved, and how you chose what to build.',
    targetCompany: 'Lumen Apps',
    greeting: 'Dear Hiring Manager,',
    paragraphs: [
      'I am writing to apply for the Product Manager role at Lumen Apps. I have nine years of experience owning B2B and consumer products from discovery through launch, and Lumen’s focus on customer-led product work is exactly how I like to operate.',
      'At Vantage Apps I owned a product line that grew from €1.2M to €3.2M in ARR over two years. I lifted new-user activation 31% by redesigning onboarding after more than 20 customer interviews, and I shipped a self-serve plan that opened a segment worth €700K a year.',
      'I prioritise with evidence, not opinion — I run an experimentation programme where roughly half of tested ideas ship with measurable lift, and I sequence fixes against real support and usage data. I would bring that same discipline to Lumen.',
      'I would welcome the chance to discuss how I can help Lumen build products customers love. Thank you for your consideration.',
    ],
    signOff: 'Sincerely,',
    keyPoints: [
      'Frames the candidate as an outcome owner — revenue, activation, new segments.',
      'Shows the decision-making behind the work (20+ interviews, experimentation, usage data).',
      'Distinguishes product judgement from project delivery.',
      'Connects naturally to a customer-led company culture.',
    ],
    mistakes: [
      'Listing features shipped without the metric each one moved.',
      'Sounding like a project manager — show product decisions, not just delivery.',
      'Claiming to be "data-driven" without one concrete example of a decision.',
    ],
  },
  {
    slug: 'sales-representative',
    title: 'Sales Representative',
    category: 'Sales',
    metaAngle: 'a full sample letter, a why-it-works breakdown, and common mistakes',
    intro:
      'A sales cover letter is a short pitch — and you are the product. Lead with your number, prove you can build pipeline, and show the drive a hiring manager wants on the team.',
    targetCompany: 'Apex Software',
    greeting: 'Dear Hiring Manager,',
    paragraphs: [
      'I am applying for the Account Executive position at Apex Software. I am a B2B SaaS sales rep with seven years of experience and a consistent record of beating quota, and I would like to bring that record to a fast-growing team like yours.',
      'In the last fiscal year I closed €1.4M in new business at 118% of quota, ranking in the top three of 22 reps. I built a new territory’s pipeline from zero to €900K in nine months, and I improved my win rate from 19% to 27% by qualifying earlier with a structured discovery process.',
      'I generate 40% of my own pipeline through outbound prospecting — I do not wait for leads to arrive. I would bring that same ownership and energy to Apex, and I am happy to back every claim here with the numbers.',
      'I would welcome a conversation about how I can contribute to your sales targets. Thank you for your time.',
    ],
    signOff: 'Sincerely,',
    keyPoints: [
      'Leads with the number — €1.4M closed, 118% of quota, top 3 of 22 — exactly what a sales manager scans for.',
      'Proves pipeline-building ability (€0 → €900K), not just closing.',
      'Shows hunter mentality with the self-sourced-pipeline stat.',
      'Confident, direct tone that mirrors how good salespeople communicate.',
    ],
    mistakes: [
      'Burying quota attainment and revenue instead of leading with them.',
      'Describing activity ("made calls") rather than results (revenue, ranking, win rate).',
      'A flat, passive tone — sales hiring managers read the letter as a sample of your pitch.',
    ],
  },
  {
    slug: 'customer-service-representative',
    title: 'Customer Service Representative',
    category: 'Customer Support',
    metaAngle: 'a full sample letter, a why-it-works breakdown, and common mistakes',
    intro:
      'A customer service cover letter should prove you keep customers happy under pressure. Show satisfaction scores, resolution rates, and the calm, helpful tone the job itself requires.',
    targetCompany: 'Clearwave Communications',
    greeting: 'Dear Hiring Manager,',
    paragraphs: [
      'I am writing to apply for the Customer Service Representative role at Clearwave Communications. I have six years of experience in high-volume support across phone, email, and chat, and I would be glad to bring that experience to your team.',
      'At Orbit Telecom I maintain a 96% customer-satisfaction score across more than 12,000 rated interactions, and I resolve 80% of cases on first contact — well above my team’s 68% average. I handle 60 or more contacts a day across channels without letting a backlog build.',
      'I am also the person colleagues turn to with a difficult call — I have de-escalated complaints that retained more than 45 at-risk accounts in a year. I would bring that same patience and problem-solving to Clearwave’s customers.',
      'I would welcome the chance to discuss how I can support your support team. Thank you for your consideration.',
    ],
    signOff: 'Sincerely,',
    keyPoints: [
      'Quantifies performance — 96% CSAT, 80% first-contact resolution, 60+ daily contacts.',
      'Benchmarks against the team average to prove the candidate is genuinely strong.',
      'Shows de-escalation skill with a retention result, not just a soft-skill claim.',
      'Warm, clear tone — itself a sample of how the candidate would speak to customers.',
    ],
    mistakes: [
      'Claiming "great communication skills" with no metric or example behind it.',
      'Omitting CSAT, resolution rate, or contact volume — the numbers that prove the point.',
      'A stiff tone — the letter should read the way good support sounds.',
    ],
  },
  {
    slug: 'graphic-designer',
    title: 'Graphic Designer',
    category: 'Creative',
    metaAngle: 'a full sample letter, a why-it-works breakdown, and common mistakes',
    intro:
      'A graphic designer cover letter should point to the portfolio and explain the thinking behind the work. Show that your design moves a metric, not just that it looks good.',
    targetCompany: 'Studio Mast',
    greeting: 'Dear Hiring Manager,',
    paragraphs: [
      'I am applying for the Graphic Designer position at Studio Mast. I have seven years of experience across brand, digital, and print, and Studio Mast’s portfolio of considered, systems-led work is the kind of environment where I do my best.',
      'At Foundry Creative I have designed brand identities for more than 30 clients, from logo systems to full guidelines. My redesign of email and ad creative lifted average click-through rates by 35%, and I built a reusable component library that cut asset turnaround time by 40%.',
      'I think about design as a system, not a one-off — that is how I keep quality high while moving quickly. You can see the work in my portfolio (linked on my resume), and I would be glad to walk through the thinking behind any piece.',
      'I would welcome the opportunity to discuss how I could contribute to Studio Mast. Thank you for your time and consideration.',
    ],
    signOff: 'Sincerely,',
    keyPoints: [
      'Directs the reader to the portfolio early — essential for any design role.',
      'Pairs craft with results: a 35% CTR lift and a 40% faster turnaround.',
      'Explains a point of view (systems-led design), which a portfolio alone cannot.',
      'Keeps the letter clean and readable — consistent with good design sense.',
    ],
    mistakes: [
      'Forgetting to reference the portfolio — it is the most important link you have.',
      'Describing visuals as "beautiful" without tying them to a result.',
      'Over-designing the letter itself; let the writing be clear and the portfolio carry the visuals.',
    ],
  },
  {
    slug: 'human-resources-manager',
    title: 'Human Resources Manager',
    category: 'Business & Operations',
    metaAngle: 'a full sample letter, a why-it-works breakdown, and common mistakes',
    intro:
      'An HR manager cover letter should show you treat people operations as a business function. Quantify hiring, retention, and time-to-hire, and convey the judgement employee relations demands.',
    targetCompany: 'Evergreen Group',
    greeting: 'Dear Hiring Manager,',
    paragraphs: [
      'I am writing to apply for the HR Manager position at Evergreen Group. I have ten years of experience across recruitment, employee relations, and people operations, and I would like to bring that breadth to a growing organisation like yours.',
      'At Lakeside Group I support 350 employees across three sites. I reduced average time-to-hire from 45 days to 31 by restructuring the recruitment pipeline, and I lifted 12-month retention from 81% to 91% through a redesigned onboarding programme.',
      'I have also resolved more than 60 employee-relations cases with none escalating to litigation — sound judgement and fair process matter as much as efficient hiring. I would bring both to Evergreen Group.',
      'I would welcome the chance to discuss how I can support your people and your business. Thank you for your consideration.',
    ],
    signOff: 'Sincerely,',
    keyPoints: [
      'Treats HR as a business function — time-to-hire, retention, headcount supported.',
      'Quantifies outcomes (45 → 31 days, 81% → 91% retention) rather than listing duties.',
      'Signals judgement with the employee-relations record, not just process knowledge.',
      'States the scale supported (350 employees), which conveys seniority.',
    ],
    mistakes: [
      'Describing HR as administrative tasks instead of business outcomes.',
      'Omitting headcount supported — it signals the scope you can manage.',
      'Being vague about employee relations; judgement is part of the job.',
    ],
  },
  {
    slug: 'business-analyst',
    title: 'Business Analyst',
    category: 'Business & Operations',
    metaAngle: 'a full sample letter, a why-it-works breakdown, and common mistakes',
    intro:
      'A business analyst cover letter should show you translate business problems into solutions. Name a process you improved, the value it delivered, and how you brought stakeholders along.',
    targetCompany: 'Keystone Financial',
    greeting: 'Dear Hiring Manager,',
    paragraphs: [
      'I am applying for the Business Analyst role at Keystone Financial. I have eight years of experience bridging business and technical teams in finance and operations, and I am drawn to Keystone’s focus on process and systems improvement.',
      'At Meridian Financial I re-engineered an approvals workflow, cutting cycle time from eight days to four. I gathered and documented the requirements for a €1.1M system implementation that was delivered on time, and I identified process gaps that, once fixed, saved €450K in annual operating cost.',
      'I am comfortable in both the business and technical conversation — I have facilitated more than 30 alignment workshops and write user-acceptance test plans that catch defects before launch. I would bring that same clarity to Keystone.',
      'I would welcome the opportunity to discuss how I can contribute. Thank you for your time and consideration.',
    ],
    signOff: 'Sincerely,',
    keyPoints: [
      'Frames the candidate as a translator between business and technical teams.',
      'Quantifies process improvement: cycle time halved, €450K saved.',
      'Shows the facilitation skill (30+ workshops) that the role depends on.',
      'Concise and structured — a sample of the clarity a BA brings to documentation.',
    ],
    mistakes: [
      'Saying you "gathered requirements" without the project size or business result.',
      'Failing to quantify improvements in time, cost, or error reduction.',
      'Being vague about whether your work was business-side or technical.',
    ],
  },
  {
    slug: 'administrative-assistant',
    title: 'Administrative Assistant',
    category: 'Business & Operations',
    metaAngle: 'a full sample letter, a why-it-works breakdown, and common mistakes',
    intro:
      'An administrative assistant cover letter should show reliability, range, and initiative. Quantify what you supported — calendars, budgets, people — and name a system you improved.',
    targetCompany: 'Brightline Partners',
    greeting: 'Dear Hiring Manager,',
    paragraphs: [
      'I am writing to apply for the Administrative Assistant position at Brightline Partners. I have eight years of experience supporting executives and busy teams, and I would be glad to bring that reliability to your office.',
      'At Crestview Partners I manage calendars, travel, and expenses for four directors with no scheduling conflicts, and I coordinate quarterly all-hands events for more than 120 staff, consistently on budget. I also built a shared filing system that cut document-retrieval time in half.',
      'I am not just organised — I look for ways to make the team run more smoothly, which is how I have saved colleagues around six hours a week. I would bring that same initiative to Brightline Partners.',
      'I would welcome the chance to discuss how I can support your team. Thank you for your consideration.',
    ],
    signOff: 'Sincerely,',
    keyPoints: [
      'Quantifies the support load — four directors, 120+ staff events, 200+ monthly invoices’ worth of range.',
      'Shows initiative with the filing-system improvement, not just task completion.',
      'Translates "organised" into a concrete result (six hours saved per week).',
      'Warm, capable tone appropriate for a support role.',
    ],
    mistakes: [
      'Writing a generic duty list instead of showing volume and range.',
      'Claiming to be "organised" without a result that proves it.',
      'Omitting the software and systems you use every day.',
    ],
  },
  {
    slug: 'teacher',
    title: 'Teacher',
    category: 'Education',
    metaAngle: 'a full sample letter, a why-it-works breakdown, and common mistakes',
    intro:
      'A teacher cover letter should lead with certification and subject, then prove impact through student outcomes. Convey the care and classroom presence a resume cannot.',
    targetCompany: 'Oakfield Secondary School',
    greeting: 'Dear Hiring Manager,',
    paragraphs: [
      'I am writing to apply for the Mathematics Teacher position at Oakfield Secondary School. I hold Qualified Teacher Status and have nine years of experience teaching secondary mathematics, and Oakfield’s commitment to every student’s progress is what draws me to the role.',
      'At Ridgeway Secondary School I raised the GCSE mathematics pass rate from 68% to 85% over three years. I designed a differentiated curriculum later adopted across the department, and I introduced data tracking that identifies struggling students earlier, lifting intervention success by 30%.',
      'Teaching is more than results — I have mentored four trainee teachers and run an after-school programme that improved attendance among at-risk students by 22%. I would bring that same commitment to Oakfield’s pupils and staff.',
      'I would welcome the opportunity to discuss how I can contribute to your department. Thank you for your time and consideration.',
    ],
    signOff: 'Sincerely,',
    keyPoints: [
      'States certification (QTS) and subject in the opening paragraph.',
      'Proves impact with student outcomes — pass rate up 17 points, attendance up 22%.',
      'Shows contribution beyond the classroom: curriculum design and mentoring.',
      'Conveys genuine care for students, which schools weigh heavily.',
    ],
    mistakes: [
      'Listing classroom activities instead of student outcomes.',
      'Leaving certification and subject until the end of the letter.',
      'A purely procedural tone — schools want to sense your commitment to students.',
    ],
  },
  {
    slug: 'operations-manager',
    title: 'Operations Manager',
    category: 'Business & Operations',
    metaAngle: 'a full sample letter, a why-it-works breakdown, and common mistakes',
    intro:
      'An operations manager cover letter should prove you make things run better and cheaper. Quantify cost savings, throughput, and team size, and name a process you redesigned.',
    targetCompany: 'Vector Logistics',
    greeting: 'Dear Hiring Manager,',
    paragraphs: [
      'I am applying for the Operations Manager role at Vector Logistics. I have twelve years of experience optimising processes, teams, and budgets in logistics and manufacturing, and Vector’s scale is exactly the kind of operation where I can add value.',
      'At Pinewood Logistics I cut annual operating costs by €600K by redesigning warehouse workflows and staffing, and I raised the on-time delivery rate from 88% to 98% across a five-site network. I lead a team of 45 across operations, scheduling, and fulfilment.',
      'I also believe efficient operations and a safe workplace go together — a revamped safety and training programme cut workplace incidents by 40%. I would bring that same balance of cost discipline and team care to Vector.',
      'I would welcome the chance to discuss how I can help your operation run better. Thank you for your consideration.',
    ],
    signOff: 'Sincerely,',
    keyPoints: [
      'Quantifies the core outcomes: €600K saved, on-time delivery 88% → 98%.',
      'States team size (45), the clearest signal of operational scope.',
      'Pairs cost results with safety — showing balanced, not reckless, management.',
      'Direct, results-first tone suited to an operations role.',
    ],
    mistakes: [
      'Describing duties without the cost, throughput, or quality numbers behind them.',
      'Omitting team size, which signals the scope you can manage.',
      'Ignoring safety and quality — cost savings alone can read as risky.',
    ],
  },
  {
    slug: 'financial-analyst',
    title: 'Financial Analyst',
    category: 'Finance',
    metaAngle: 'a full sample letter, a why-it-works breakdown, and common mistakes',
    intro:
      'A financial analyst cover letter should prove your modelling drives decisions. Name a forecast or analysis, the decision it informed, and the accuracy or value it delivered.',
    targetCompany: 'Anchor Capital',
    greeting: 'Dear Hiring Manager,',
    paragraphs: [
      'I am writing to apply for the Financial Analyst position at Anchor Capital. I have eight years of experience in FP&A and investment analysis, and Anchor’s analytical, evidence-led culture is where I want to do my next chapter of work.',
      'At Harbour Capital I built a three-statement model that informed a €15M capital-allocation decision, and I improved quarterly forecast accuracy from 84% to 95% by reworking the driver assumptions. My variance analysis flagged €300K of overspend before quarter-end, in time to act on it.',
      'I also care about making analysis usable — I automated a monthly reporting pack, cutting its preparation from three days to one, so the team spends more time on judgement and less on assembly. I would bring that same rigour and efficiency to Anchor Capital.',
      'I would welcome the opportunity to discuss how I can contribute. Thank you for your time and consideration.',
    ],
    signOff: 'Sincerely,',
    keyPoints: [
      'Ties modelling to a real decision (€15M capital allocation), not just the activity.',
      'Quantifies analytical rigour — forecast accuracy 84% → 95%, €300K overspend caught early.',
      'Shows the candidate improves process, not just output (reporting pack 3 days → 1).',
      'Concise and precise, matching the discipline expected of an analyst.',
    ],
    mistakes: [
      'Saying you "built models" without the decision or money they influenced.',
      'Omitting forecast accuracy or variance figures that prove rigour.',
      'Failing to name FP&A, modelling, or valuation when the role asks for them.',
    ],
  },
];

const BY_SLUG = new Map(COVER_LETTER_EXAMPLES.map((e) => [e.slug, e]));

export function getCoverLetterExample(slug: string): CoverLetterExample | undefined {
  return BY_SLUG.get(slug);
}

export function getAllCoverLetterSlugs(): string[] {
  return COVER_LETTER_EXAMPLES.map((e) => e.slug);
}

/** Other examples in the same category, for internal linking. */
export function getRelatedCoverLetters(slug: string, limit = 4): CoverLetterExample[] {
  const current = BY_SLUG.get(slug);
  if (!current) return [];
  const sameCategory = COVER_LETTER_EXAMPLES.filter(
    (e) => e.slug !== slug && e.category === current.category,
  );
  const others = COVER_LETTER_EXAMPLES.filter(
    (e) => e.slug !== slug && e.category !== current.category,
  );
  return [...sameCategory, ...others].slice(0, limit);
}

/** Categories with their examples, for the hub page. */
export function getCoverLettersByCategory(): Array<{ category: string; examples: CoverLetterExample[] }> {
  const order: string[] = [];
  const map = new Map<string, CoverLetterExample[]>();
  for (const e of COVER_LETTER_EXAMPLES) {
    if (!map.has(e.category)) {
      map.set(e.category, []);
      order.push(e.category);
    }
    map.get(e.category)!.push(e);
  }
  return order.map((category) => ({ category, examples: map.get(category)! }));
}
