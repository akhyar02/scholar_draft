import { NextRequest } from "next/server";

import { UserRole } from "@/lib/constants";
import { jsonError } from "@/lib/http";
import { getSessionUser } from "@/lib/auth/session";

export async function requireApiUser(_request: NextRequest, role?: UserRole) {
  const user = await getSessionUser();

  if (!user) {
    return { response: jsonError(401, "UNAUTHORIZED", "Unauthorized") };
  }

  if (role && user.role !== role) {
    return { response: jsonError(403, "FORBIDDEN", "Forbidden") };
  }

  return { user };
}
