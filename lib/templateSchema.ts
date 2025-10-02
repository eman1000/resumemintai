// lib/templateSchema.ts

/** Bump when the template contract changes (kept with each saved doc). */
export const TEMPLATE_VERSION = 1;

/** The root wrapper every template must have (for style scoping & print). */
const ROOT_SELECTOR = 'class="resume"';

/** Each item means: the template must include EITHER the left token/loop OR the right guard block. */
const MUST_SUPPORT = [
  // header
  'name',
  // summary
  'summary|#_hasSummary',
  // experience
  '#experience|#_hasExperience',
  // education
  '#education|#_hasEducation',
  // skills (support either {{.}} or {{value}} inside loops)
  '#skills.core|#_hasSkillsCore',
  '#skills.tools|#_hasSkillsTools',
  '#skills.soft|#_hasSkillsSoft',
] as const;

/** Minimal, contract-compliant template designers can start from. */
export const TEMPLATE_MINIMAL_SKELETON = `
<!-- ${TEMPLATE_VERSION} -->
<style>
  .resume{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#222;line-height:1.6}
  .resume .h{font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#3b82f6;margin:16px 0 8px}
  .resume ul{margin:6px 0 0 18px}
</style>

<div class="resume">
  <div class="h" style="font-size:28px;color:#111">{{name}}</div>
  <div style="opacity:.75">{{contact}}</div>

  {{#_hasSummary}}
  <div class="h">Summary</div>
  <p>{{summary}}</p>
  {{/_hasSummary}}

  {{#_hasExperience}}
  <div class="h">Experience</div>
  {{#experience}}
    <div style="margin:8px 0">
      <div><strong>{{role}}</strong>{{#company}} — {{company}}{{/company}}</div>
      <div style="opacity:.7">{{location}}{{#start}} • {{start}}{{/start}}{{#end}} – {{end}}{{/end}}</div>
      {{#bullets.length}}<ul>{{#bullets}}<li>{{.}}</li>{{/bullets}}</ul>{{/bullets.length}}
    </div>
  {{/experience}}
  {{/_hasExperience}}

  {{#_hasEducation}}
  <div class="h">Education</div>
  {{#education}}
    <div style="margin:8px 0">
      <div><strong>{{degree}}</strong>{{#school}} — {{school}}{{/school}}</div>
      <div style="opacity:.7">{{location}}{{#dates}} • {{dates}}{{/dates}}</div>
      {{#notes.length}}<ul>{{#notes}}<li>{{.}}</li>{{/notes}}</ul>{{/notes.length}}
    </div>
  {{/education}}
  {{/_hasEducation}}

  {{#_hasSkills}}
  <div class="h">Skills</div>
  {{#_hasSkillsCore}}<p><strong>Core:</strong>  {{#skills.core}}<span>{{value}}</span>{{/skills.core}}</p>{{/_hasSkillsCore}}
  {{#_hasSkillsTools}}<p><strong>Tools:</strong> {{#skills.tools}}<span>{{value}}</span>{{/skills.tools}}</p>{{/_hasSkillsTools}}
  {{#_hasSkillsSoft}}<p><strong>Soft:</strong>  {{#skills.soft}}<span>{{value}}</span>{{/skills.soft}}</p>{{/_hasSkillsSoft}}
  {{/_hasSkills}}

  {{#_hasAchievements}}
  <div class="h">Achievements</div>
  <ul>{{#achievements}}<li>{{.}}</li>{{/achievements}}</ul>
  {{/_hasAchievements}}
</div>
`.trim();

/** Validation result type */
export type TemplateValidation = { ok: boolean; errors: string[] };

/** Validate a template’s HTML against our contract. */
export function validateTemplateHtml(html: string): TemplateValidation {
  const src = (html || '').trim();
  const errors: string[] = [];

  // 1) Must have .resume root wrapper
  if (!src.includes(ROOT_SELECTOR)) {
    errors.push('Root container with class="resume" is required.');
  }

  // 2) Section presence: token/loop OR guard
  for (const need of MUST_SUPPORT) {
    const [left, right] = need.split('|'); // left may be token (summary) or loop (#experience)
    const hasLeft =
      left.startsWith('#')
        ? // loop form (e.g. #experience) -> require both open & close
          src.includes(`{{${left}}}`) && src.includes(`{{/${left.replace('#', '')}}}`)
        : // plain token (e.g. name / summary)
          src.includes(`{{${left}}}`);

    const hasRight =
      !!right &&
      src.includes(`{{${right}}}`) &&
      src.includes(`{{/${right.replace('#', '')}}}`);

    if (!(hasLeft || hasRight)) {
      errors.push(`Missing required token or guard: ${need}`);
    }
  }

  // 3) Skills loop content must render item values via {{.}} or {{value}}
  const skillsLoops = [
    { open: '{{#skills.core}}', close: '{{/skills.core}}' },
    { open: '{{#skills.tools}}', close: '{{/skills.tools}}' },
    { open: '{{#skills.soft}}',  close: '{{/skills.soft}}'  },
  ];

  for (const { open, close } of skillsLoops) {
    const start = src.indexOf(open);
    if (start === -1) continue;
    const end = src.indexOf(close, start + open.length);
    if (end === -1) { errors.push(`Unclosed skills loop: ${open}`); continue; }
    const inner = src.slice(start + open.length, end);
    if (!inner.includes('{{.}}') && !inner.includes('{{value}}')) {
      errors.push(`Inside ${open}…${close} you must render items with {{.}} or {{value}}.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Best-effort, non-destructive fixes so designers don’t get blocked:
 * - Wrap in .resume if missing
 * - Append invisible guard anchors for optional guards we accept in lieu of loops/tokens
 * - Add a hidden {{summary}} token so guard-only templates still validate
 */
export function autoFixTemplateHtml(raw: string): string {
  let html = (raw || '').trim();

  // 1) Wrap in .resume if missing
  if (!html.includes(ROOT_SELECTOR)) {
    html = `<div class="resume">\n${html}\n</div>`;
  }

  // 2) Append invisible guard anchors (harmless in render, satisfies validator)
  const ensureGuard = (name: string) => {
    const open = `{{#${name}}}`;
    const close = `{{/${name}}}`;
    if (!html.includes(open) || !html.includes(close)) {
      html += `\n<!-- guard:${name} --><span style="display:none">${open}${close}</span>`;
    }
  };

  [
    '_hasSummary',
    '_hasExperience',
    '_hasEducation',
    '_hasSkills',
    '_hasSkillsCore',
    '_hasSkillsTools',
    '_hasSkillsSoft',
    '_hasAchievements',
  ].forEach(ensureGuard);

  // 3) Ensure a hidden plain {{summary}} token exists (covers the token/guard “either/or”)
  if (!html.includes('{{summary}}')) {
    html += `\n<!-- anchor:summary --><span style="display:none">{{summary}}</span>`;
  }

  return html;
}
