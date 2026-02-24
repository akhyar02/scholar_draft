"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LogoutButton } from "./logout-button";

function MobileNavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`rounded-xl px-4 py-3 transition-all text-lg font-medium ${
        isActive
          ? "text-white bg-white/20 font-semibold"
          : "text-white/80 hover:text-white hover:bg-white/10"
      }`}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

export function MobileNav({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <div className="md:hidden flex items-center">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-white/80 hover:text-white focus:outline-none transition-colors p-1"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div className="absolute top-20 left-0 w-full bg-primary-800 border-b border-primary-900/50 shadow-2xl z-40 flex flex-col py-6 px-6 gap-1">
          <MobileNavLink href="/scholarships" onClick={closeMenu}>
            Scholarships
          </MobileNavLink>
          {user?.role === "student" ? (
            <>
              <MobileNavLink href="/student/dashboard" onClick={closeMenu}>
                Dashboard
              </MobileNavLink>
              <MobileNavLink href="/student/applications" onClick={closeMenu}>
                My Applications
              </MobileNavLink>
            </>
          ) : null}
          {user?.role === "admin" ? (
            <>
              <MobileNavLink href="/admin/dashboard" onClick={closeMenu}>
                Dashboard
              </MobileNavLink>
              <MobileNavLink href="/admin/applications" onClick={closeMenu}>
                Review Queue
              </MobileNavLink>
              <MobileNavLink href="/admin/programs" onClick={closeMenu}>
                Application Options
              </MobileNavLink>
            </>
          ) : null}
          {user ? (
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-4">
              <span className="text-sm font-medium text-white/60 px-4">
                {user.email}
              </span>
              <div onClick={closeMenu} className="px-4">
                <LogoutButton />
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-white/10">
              <MobileNavLink href="/login" onClick={closeMenu}>
                Sign In
              </MobileNavLink>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
