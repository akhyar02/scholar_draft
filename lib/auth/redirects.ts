import type { UserRole } from "@/lib/constants";

export function getPostLoginRedirectPath(role?: UserRole | null) {
  if (role === "admin") {
    return "/admin/dashboard";
  }

  if (role === "student") {
    return "/student/dashboard";
  }

  return "/";
}
