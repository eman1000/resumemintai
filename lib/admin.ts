// lib/admin.ts
// Platform admin gate. Admins are identified by email via the ADMIN_EMAILS env
// var (comma-separated). No DB role column — keeps it simple and out of band.

import { getUserFromRequest } from "@/app/api/server/auth/getUserFromRequest";

export function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email?: string | null): boolean {
  return !!email && adminEmails().has(email.toLowerCase());
}

export class AdminGateError extends Error {
  code: "UNAUTHORIZED" | "FORBIDDEN";
  constructor(code: AdminGateError["code"]) {
    super(code);
    this.code = code;
    this.name = "AdminGateError";
  }
}

/** Verify the caller is an authenticated admin. Throws AdminGateError. */
export async function requireAdmin(): Promise<{ email: string; uid: string }> {
  let fb;
  try {
    fb = await getUserFromRequest();
  } catch {
    throw new AdminGateError("UNAUTHORIZED");
  }
  if (!isAdminEmail(fb.email)) throw new AdminGateError("FORBIDDEN");
  return { email: (fb.email || "").toLowerCase(), uid: fb.uid };
}

export function adminGateResponse(e: AdminGateError) {
  return e.code === "UNAUTHORIZED"
    ? { status: 401, body: { error: "unauthorized" } }
    : { status: 403, body: { error: "forbidden" } };
}
