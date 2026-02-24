"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white/90 ring-1 ring-white/10 hover:bg-white/20 hover:ring-white/20 transition-all duration-200"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );
}
