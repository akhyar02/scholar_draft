import type { UserRole } from "@/lib/constants";

export function getPostLoginRedirectPath(_role?: UserRole | null) {
  return "/";
}
