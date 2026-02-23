import type { Metadata } from "next";
import Link from "next/link";
import { Poppins } from "next/font/google";

import { getSessionUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/logout-button";
import { MobileNav } from "@/components/mobile-nav";

import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "YUM Scholarship Portal",
  description: "YUM Scholarship application and review platform",
};

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  return (
    <html lang="en">
      <body
        className={`${poppins.className} flex min-h-screen flex-col bg-surface-50 text-surface-900 antialiased`}
      >
        <header className="sticky top-0 z-50 border-b border-surface-200 bg-primary-600 backdrop-blur-md h-20">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold text-primary-700"
            >
              
              <img
                src="https://yum.mmu.edu.my/wp-content/uploads/2022/02/logo_white-eng.png"
                alt="ScholarHub Logo"
                className="h-12 object-cover"
              />
            </Link>
            <nav className="hidden md:flex items-center gap-8 text-md font-medium text-surface-50">
              <Link
                href="/scholarships"
                className="hover:text-surface-300 transition-colors"
              >
                Scholarships
              </Link>
              {user?.role === "student" ? (
                <>
                  <Link
                    href="/student/dashboard"
                    className="hover:text-surface-300 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/student/applications"
                    className="hover:text-surface-300 transition-colors"
                  >
                    My Applications
                  </Link>
                </>
              ) : null}
              {user?.role === "admin" ? (
                <>
                  <Link
                    href="/admin/dashboard"
                    className="hover:text-surface-300 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/admin/applications"
                    className="hover:text-surface-300 transition-colors"
                  >
                    Review Queue
                  </Link>
                  <Link
                    href="/admin/programs"
                    className="hover:text-surface-300 transition-colors"
                  >
                    Application Options
                  </Link>
                </>
              ) : null}
            </nav>
            <div className="flex items-center gap-4">
              {user ? (
                <div className="hidden md:flex items-center gap-4">
                  <span className="text-sm font-medium text-surface-50">
                    {user.email}
                  </span>
                  <LogoutButton />
                </div>
              ) : null}
              <MobileNav user={user} />
            </div>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-surface-200 bg-white py-12 mt-auto">
          <div className="mx-auto max-w-7xl px-6 text-center text-sm text-surface-500">
            <p>
              &copy; {new Date().getFullYear()} YUM. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
