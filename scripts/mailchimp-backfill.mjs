// One-off: push existing ResumeMint accounts into the Mailchimp audience with
// the same tags the live sync uses (no-card / subscribed / churned), plus
// `backfill` so the journey can be told to skip or include them.
//
//   node --env-file=.env scripts/mailchimp-backfill.mjs            # dry run
//   node --env-file=.env scripts/mailchimp-backfill.mjs --apply    # write to Mailchimp
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const apply = process.argv.includes('--apply');
const key = process.env.MAILCHIMP_API_KEY || '';
const list = process.env.MAILCHIMP_AUDIENCE_ID || '';
const dc = key.split('-').pop();
if (apply && !(key && list && dc)) { console.error('MAILCHIMP_API_KEY / MAILCHIMP_AUDIENCE_ID missing'); process.exit(1); }

const p = new PrismaClient();
const users = await p.$queryRaw`
  select u.email, u.user_type as "userType", u.created_at as "createdAt",
    (select status from subscriptions s where s.user_id = u.id order by s.created_at desc limit 1) as "subStatus"
  from users u
  where u.email is not null and u.email not like 'guest+%' and u.email not like 'qa-%' and u.email not like 'qa+%'
  order by u.created_at`;
await p.$disconnect();

const live = ['active', 'trialing', 'past_due'];
const rows = users.map((u) => {
  const bucket = !u.subStatus ? 'no-card' : live.includes(u.subStatus) ? 'subscribed' : 'churned';
  return { email: u.email.toLowerCase(), bucket, userType: u.userType, signup: new Date(u.createdAt).toISOString().slice(0, 10) };
});
const counts = rows.reduce((a, r) => ((a[r.bucket] = (a[r.bucket] || 0) + 1), a), {});
console.log(`${rows.length} contacts →`, counts, apply ? '(applying)' : '(dry run, pass --apply to write)');

async function mc(path, body, method = 'PUT') {
  const r = await fetch(`https://${dc}.api.mailchimp.com/3.0${path}`, {
    method, headers: { Authorization: `Basic ${Buffer.from('any:' + key).toString('base64')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`${r.status} ${path} ${(await r.text()).slice(0, 200)}`);
}
let ok = 0, fail = 0;
for (const r of rows) {
  if (!apply) { console.log(r.bucket.padEnd(10), r.signup, r.email); continue; }
  const hash = createHash('md5').update(r.email).digest('hex');
  try {
    await mc(`/lists/${list}/members/${hash}`, { email_address: r.email, status_if_new: 'subscribed', merge_fields: { SIGNUP: r.signup } });
    await mc(`/lists/${list}/members/${hash}/tags`, { tags: [
      { name: 'no-card', status: r.bucket === 'no-card' ? 'active' : 'inactive' },
      { name: 'subscribed', status: r.bucket === 'subscribed' ? 'active' : 'inactive' },
      { name: 'churned', status: r.bucket === 'churned' ? 'active' : 'inactive' },
      { name: r.userType === 'recruiter' ? 'recruiter' : 'candidate', status: 'active' },
      { name: 'backfill', status: 'active' },
    ] }, 'POST');
    ok++;
  } catch (e) { fail++; console.warn('FAIL', r.email, e.message); }
}
if (apply) console.log(`done: ${ok} ok, ${fail} failed`);
