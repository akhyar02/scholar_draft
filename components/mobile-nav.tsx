"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LogoutButton } from "./logout-button";

export function MobileNav({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <div className="md:hidden flex items-center">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-surface-50 hover:text-surface-300 focus:outline-none"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div className="absolute top-20 left-0 w-full bg-primary-600 border-b border-primary-500 shadow-lg z-40 flex flex-col py-4 px-6 gap-4">
          <Link
            href="/scholarships"
            className="text-surface-50 hover:text-surface-300 transition-colors text-lg font-medium"
            onClick={closeMenu}
          >
            Scholarships
          </Link>
          {user?.role === "student" ? (
            <>
              <Link
                href="/student/dashboard"
                className="text-surface-50 hover:text-surface-300 transition-colors text-lg font-medium"
                onClick={closeMenu}
              >
                Dashboard
              </Link>
              <Link
                href="/student/applications"
                className="text-surface-50 hover:text-surface-300 transition-colors text-lg font-medium"
                onClick={closeMenu}
              >
                My Applications
              </Link>
            </>
          ) : null}
          {user?.role === "admin" ? (
            <>
              <Link
                href="/admin/dashboard"
                className="text-surface-50 hover:text-surface-300 transition-colors text-lg font-medium"
                onClick={closeMenu}
              >
                Dashboard
              </Link>
              <Link
                href="/admin/applications"
                className="text-surface-50 hover:text-surface-300 transition-colors text-lg font-medium"
                onClick={closeMenu}
              >
                Review Queue
              </Link>
              <Link
                href="/admin/programs"
                className="text-surface-50 hover:text-surface-300 transition-colors text-lg font-medium"
                onClick={closeMenu}
              >
                Application Options
              </Link>
            </>
          ) : null}
          {user ? (
            <div className="pt-4 border-t border-primary-500 flex flex-col gap-4">
              <span className="text-sm font-medium text-surface-200">
                {user.email}
              </span>
              <div onClick={closeMenu}>
                <LogoutButton />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
