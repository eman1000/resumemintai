// delete-anon-users.mjs
// Usage:
//   node delete-anon-users.mjs --project your-project-id --olderDays 7 --yes
//   node delete-anon-users.mjs --project your-project-id --neverSignedIn --yes
//   node delete-anon-users.mjs --project your-project-id --lastSignInOlderDays 30 --yes
//
// Auth options (no GOOGLE_APPLICATION_CREDENTIALS needed):
//   Set env vars (recommended for temporary runs):
//     FIREBASE_PROJECT_ID=your-project-id
//     FIREBASE_CLIENT_EMAIL=...@your-project-id.iam.gserviceaccount.com
//     FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
//   or hard-code in the HARD_CODED_SERVICE_ACCOUNT block below (don’t commit!).
//
// Notes:
// - Dry-run unless you pass --yes
// - Deletes in batches of 1000 (Admin API limit)
// - Safe: only deletes users with providerData.length === 0 and no email/phone

import admin from 'firebase-admin';

// ---------- Parse CLI args ----------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const projectArg = args.project || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
const olderDays = Number(args.olderDays ?? 0); // creationTime older than
const lastSignInOlderDays = Number(args.lastSignInOlderDays ?? 0); // lastSignInTime older than
const neverSignedIn = !!args.neverSignedIn; // only users that never signed in
const doDelete = !!args.yes; // otherwise dry-run
const batchSize = Math.min(Number(args.batchSize || 1000), 1000);

// ---------- Initialize Admin without GOOGLE_APPLICATION_CREDENTIALS ----------
const envProjectId = "resumemint-edf2f";
const envClientEmail = "firebase-adminsdk-fbsvc@resumemint-edf2f.iam.gserviceaccount.com";
const envPrivateKey = ("-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCQoPsObtZFhNBw\n1Cx5G0d3ILLN/+wDSFCDN+ALeMVhF1NoPx3coJqrMwxATfGvagvEimFTNvgFvKom\n0gd3nzwc0LgGI+LEcrpD9+qscxHKDdmUIsF3DLZrD982zLnhl0dgAc8V4N5uknvs\nueZyozKdiqH9qBNb/EfDr8MD+pW6DSuJ5ziW7qf5hLptCA2QMwjPC6JUjhcakBaw\nvVWC+PWxj0rDb31uLeWPeRihrxBIt6PuvWNMuLlOCcX0pZjkpxuHtSvWpHuaJhBg\njCKpXGM0cb+hfhNMqWrUdZGhiG2JPYXPX9aPMly9scNTVz+r0cSWD7VzsXblvtcB\niIRXfA1dAgMBAAECggEAGLS7NlO2PDFsNv3zq+t+SYoXKUwAye3CPSwgFG2Y0BVf\nPOVdSUlRKpIhk2GNOfEkWfpmlkPDWh2ItnF175gOuYBpEzlxnSvZCE/TMYrFnO3B\nP4YxZNAR4FeZgp+12CTSv0KH2N2tOZfB3iZCiM46kQFz2yQpTHMb4kCF0InvplSk\nXn+9AbLKMQkJPsKTqVZDZNns77o0zz6S+Dx7ph3esUfog4WBykosSJS8hVGwwpkQ\n/VSsligDJnDz5wxXQNWXFfKUnZJh5ZKrXO0OQyJmDtqoowg2L8AwukgCzFPAeUog\nEl7xzNihoIp7ybnVXs91SatQHceHPhd3EqqG/cqRsQKBgQDDGtnz95NcgAaSTpzs\nBRkm4eNew3j9r9c0UFsNDHsqIGXf1xqQPMYXQfy81Uw5M4yIpnobkl6IYqARTTDM\nChtV1QsjehrdzLaH1/aeUXP1NoUuUnQq8VTbS8ciOrOluaeuzsx6yapsHKTZSw6G\ngenxw4AY5hpnz4aPGC+GiC9jzQKBgQC9xQXhxrt1R3dkpXOE7LRHpZxurbytluRl\nHcSnMqmFXMWEYxKz557pzMpt60kqI9AWvWZyEGXhZrVkjTMV3/x0xuopSUcr+9qV\n/oQTolSBYI+bv7IWmCivd9WiAQVpUYSlrD+AekiVD4SC/VVzw+f+Jvoy45bFyM4c\ns50tQEzf0QKBgQCPpOZQ+7cwBEZSU7SvBHXnLapUK8CZrmvYZU0UB1tqwZ2ftuQk\ny8ngd8HXWYccGjrepQsD37jf2xUUh+tkXhCQGiFwRkcfg8fjrfoxx7CDGlflqelD\ncJjUOC9toSCA5HZzemgMAwwJOvGX1e3k1CNkz1YxfsB0K9Na6SiceQnDBQKBgQCL\n+4TOOcFXzqLkjCM9fzmwzBorjl7qka7iY+YHC5j+tiNA96/5IzcW8ai1EmVC/23l\nCEtEgpIUhaXyiTGQxku8fGqIj/Q/HqXsFPWqYgkB8o+cbPhaMF16qePdf/FU8fvu\nFbQ1+n4F7o9p7KOXJIDB+lB/L2CtfuWDSH79vTu3sQKBgAHQBDkiUyIBFbzLDHLI\niWOQy+xSuGKSG4ch22j/W92G58z0VJkVxRmYcgTKt2d/LBnPKV0EQr/VSwet3Bh1\nAinBG0LOoOEQPtLppFrTQHILoNcdsDrTxSRGn7owQSnlQkNPr4QApbnpRR+at6BK\nDy8V8ktL/Vye05y6ihAQKozH\n-----END PRIVATE KEY-----\n").replace(/\\n/g, '\n');

if (envClientEmail && envPrivateKey && envProjectId) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: envProjectId,
      clientEmail: envClientEmail,
      privateKey: envPrivateKey,
    }),
    projectId: envProjectId,
  });
} else {
  // ⚠️ Hard-code only if you insist; do NOT commit this.
  const HARD_CODED_SERVICE_ACCOUNT = null;
  // Example:
  // const HARD_CODED_SERVICE_ACCOUNT = {
  //   projectId: 'your-project-id',
  //   clientEmail: 'firebase-adminsdk-xxxx@your-project-id.iam.gserviceaccount.com',
  //   privateKey: `-----BEGIN PRIVATE KEY-----
  // YOUR_KEY_LINES_HERE
  // -----END PRIVATE KEY-----\n`,
  // };

  if (!HARD_CODED_SERVICE_ACCOUNT) {
    console.error(
      '❌ Missing credentials. Provide env FIREBASE_CLIENT_EMAIL & FIREBASE_PRIVATE_KEY (and FIREBASE_PROJECT_ID) or fill HARD_CODED_SERVICE_ACCOUNT.'
    );
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(HARD_CODED_SERVICE_ACCOUNT),
    projectId: HARD_CODED_SERVICE_ACCOUNT.projectId,
  });
}

const auth = admin.auth();

// ---------- Helpers ----------
function isAnonymousUser(u) {
  // Anonymous = no email, no phone, and no linked providers.
  return !u.email && !u.phoneNumber && Array.isArray(u.providerData) && u.providerData.length === 0;
}

function isOlderThan(dateStr, days) {
  if (!days) return true;
  if (!dateStr) return true; // if missing, treat as old
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return true;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return t < cutoff;
}

function matchesFilters(u) {
  if (!isAnonymousUser(u)) return false;

  // Creation age filter
  if (olderDays && !isOlderThan(u.metadata.creationTime, olderDays)) return false;

  // Last sign-in age filter
  if (lastSignInOlderDays && !isOlderThan(u.metadata.lastSignInTime, lastSignInOlderDays)) return false;

  // Never signed in filter
  if (neverSignedIn) {
    const last = u.metadata.lastSignInTime;
    if (last && !Number.isNaN(new Date(last).getTime())) return false;
  }

  return true;
}

// ---------- Main ----------
(async function main() {
  const projectId = projectArg || envProjectId;
  console.log('Firebase project:', projectId || '(from credentials)');
  console.log(
    `Mode: ${doDelete ? 'DELETE' : 'DRY-RUN'} | Filters: anonymous ONLY` +
      (olderDays ? `, created > ${olderDays}d ago` : '') +
      (lastSignInOlderDays ? `, lastSignIn > ${lastSignInOlderDays}d ago` : '') +
      (neverSignedIn ? ', neverSignedIn' : '')
  );

  let nextPageToken;
  let matchedCount = 0;
  let scanned = 0;
  let toDelete = [];

  try {
    do {
      const { users, pageToken } = await auth.listUsers(1000, nextPageToken);
      nextPageToken = pageToken;

      for (const u of users) {
        scanned++;
        if (matchesFilters(u)) {
          matchedCount++;
          toDelete.push(u.uid);

          if (toDelete.length >= batchSize) {
            await flushDelete(toDelete, doDelete);
            toDelete = [];
          }
        }
      }
    } while (nextPageToken);

    // Flush remainder
    if (toDelete.length) {
      await flushDelete(toDelete, doDelete);
      toDelete = [];
    }

    console.log(`Scanned: ${scanned} users. Matched anonymous per filters: ${matchedCount}.`);
    if (!doDelete) console.log('Dry-run complete. Re-run with --yes to delete.');
  } catch (err) {
    console.error('❌ Error:', err?.message || err);
    process.exit(1);
  }
})();

async function flushDelete(uids, doDelete) {
  if (!uids.length) return;
  if (!doDelete) {
    console.log(`DRY-RUN: would delete ${uids.length} user(s). Example UIDs:`, uids.slice(0, 5), uids.length > 5 ? '...' : '');
    return;
  }
  const res = await auth.deleteUsers(uids);
  console.log(
    `🗑️ Deleted batch: requested=${uids.length}, success=${res.successCount}, errors=${res.failureCount}`
  );
  if (res.failureCount) {
    for (const e of res.errors) {
      console.warn(`  • index=${e.index} uid=${uids[e.index]} error=${e.error.message}`);
    }
  }
}
