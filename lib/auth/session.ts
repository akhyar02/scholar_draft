import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/options";
import { UserRole } from "@/lib/constants";

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.email || !session.user.role) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
  };
}

export async function requireSessionUser(role?: UserRole) {
  const user = await getSessionUser();

  if (!user) {
    return { error: { status: 401, code: "UNAUTHORIZED", message: "Unauthorized" } as const };
  }

  if (role && user.role !== role) {
    return { error: { status: 403, code: "FORBIDDEN", message: "Forbidden" } as const };
  }

  return { user };
}
