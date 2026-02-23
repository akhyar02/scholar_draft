import { redirect } from "next/navigation";

import { UserRole } from "@/lib/constants";
import { getSessionUser } from "@/lib/auth/session";

export async function requirePageUser(role?: UserRole) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (role && user.role !== role) {
    redirect("/unauthorized");
  }

  return user;
}
