"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="inline-flex bg-accent-600 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-surface-50 hover:bg-accent-900 transition-colors"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );
}
