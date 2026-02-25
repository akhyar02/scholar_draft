import type { Metadata } from "next";
import Link from "next/link";
import { Poppins } from "next/font/google";
import { Heart, LogIn } from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import { NavLink } from "@/components/nav-link";
import { LogoutButton } from "@/components/logout-button";
import { MobileNav } from "@/components/mobile-nav";
import { getSiteUrlObject } from "@/lib/site-url";

import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: getSiteUrlObject(),
  title: {
    default: "YUM Scholarship Portal",
    template: "%s | YUM Scholarship Portal",
  },
  description: "YUM Scholarship application and review platform",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: "YUM Scholarship Portal",
    title: "YUM Scholarship Portal",
    description: "YUM Scholarship application and review platform",
    url: "/",
  },
};

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
        {/* Ambient background mesh */}
        <div className="mesh-bg" />

        <header className="sticky top-0 z-50 border-b border-primary-800/50 bg-primary-700 shadow-lg h-20">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="https://yum.mmu.edu.my/wp-content/uploads/2022/02/logo_white-eng.png"
                alt="YUM ScholarHub Logo"
                className="h-12 object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <NavLink href="/scholarships">Scholarships</NavLink>
              {user?.role === "student" ? (
                <>
                  <NavLink href="/student/dashboard">Dashboard</NavLink>
                  <NavLink href="/student/applications">
                    My Applications
                  </NavLink>
                </>
              ) : null}
              {user?.role === "admin" ? (
                <>
                  <NavLink href="/admin/dashboard">Dashboard</NavLink>
                  <NavLink href="/admin/applications">Review Queue</NavLink>
                  <NavLink href="/admin/programs">Application Options</NavLink>
                </>
              ) : null}
            </nav>
            <div className="flex items-center gap-4">
              {user ? (
                <div className="hidden md:flex items-center gap-4">
                  <span className="text-sm font-medium text-white/70">
                    {user.email}
                  </span>
                  <LogoutButton />
                </div>
              ) : (
                <Link
                  href="/login"
                  className="hidden md:inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2 text-sm font-semibold text-white backdrop-blur-sm ring-1 ring-white/20 transition-all hover:bg-white/20 hover:ring-white/30"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              )}
              <MobileNav user={user} />
            </div>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-10">
          {children}
        </main>
        <footer className="relative mt-auto border-t border-surface-200/60 bg-surface-950 text-white">
          <div className="absolute inset-0 bg-linear-to-t from-surface-950 via-surface-950 to-surface-900/80" />
          <div className="relative mx-auto max-w-7xl px-6 py-16">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-4">
                <img
                  src="https://yum.mmu.edu.my/wp-content/uploads/2022/02/logo_white-eng.png"
                  alt="YUM Logo"
                  className="h-10 object-cover"
                />
                <p className="text-sm text-surface-400 leading-relaxed">
                  Empowering students with life-changing scholarship
                  opportunities for a brighter future.
                </p>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-surface-300">
                  Quick Links
                </h4>
                <div className="flex flex-col gap-2.5">
                  <Link
                    href="/scholarships"
                    className="text-sm text-surface-400 hover:text-white transition-colors"
                  >
                    Browse Scholarships
                  </Link>
                  {!user && (
                    <Link
                      href="/login"
                      className="text-sm text-surface-400 hover:text-white transition-colors"
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-surface-300">
                  Support
                </h4>
                <div className="flex flex-col gap-2.5">
                  <Link
                    href="https://yum.mmu.edu.my/contact/"
                    className="text-sm text-surface-400 hover:text-white transition-colors"
                  >
                    Contact Us
                  </Link>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-surface-300">
                  Legal
                </h4>
                <div className="flex flex-col gap-2.5">
                  <Link
                    href="https://www.mmu.edu.my/privacy-notice/"
                    className="text-sm text-surface-400 hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </div>
              </div>
            </div>
            <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-surface-800 pt-8 sm:flex-row">
              <p className="text-sm text-surface-500">
                &copy; {new Date().getFullYear()} YUM. All rights reserved.
              </p>
              <p className="flex items-center gap-1.5 text-xs text-surface-500">
                Made with{" "}
                <Heart className="h-3 w-3 text-primary-500 fill-primary-500" />{" "}
                for students everywhere
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
