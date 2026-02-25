"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LogoutButton } from "./logout-button";

type MenuPhase = "closed" | "opening" | "open" | "closing";

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
          ? "text-white font-semibold"
          : "text-white/80 hover:text-white hover:bg-white/10"
      }`}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

function MobileNavMotionItem({
  children,
  index,
  isVisible,
}: {
  children: React.ReactNode;
  index: number;
  isVisible: boolean;
}) {
  return (
    <div
      className={`transition-[opacity,transform] duration-300 motion-reduce:transition-none motion-reduce:transform-none ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
      }`}
      style={{
        transitionDelay: isVisible ? `${60 + index * 35}ms` : "0ms",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {children}
    </div>
  );
}

export function MobileNav({ user }: { user: any }) {
  const [phase, setPhase] = useState<MenuPhase>("closed");
  const openFrameRef = useRef<number | null>(null);
  const menuId = "mobile-nav-menu";

  const isMounted = phase !== "closed";
  const isOpen = phase === "opening" || phase === "open";
  const isPanelVisible = phase === "open";

  useEffect(() => {
    return () => {
      if (openFrameRef.current !== null) {
        cancelAnimationFrame(openFrameRef.current);
      }
    };
  }, []);

  const queueOpenAnimation = () => {
    if (openFrameRef.current !== null) {
      cancelAnimationFrame(openFrameRef.current);
    }

    openFrameRef.current = requestAnimationFrame(() => {
      setPhase((current) => (current === "opening" ? "open" : current));
      openFrameRef.current = null;
    });
  };

  const openMenu = () => {
    if (phase === "open" || phase === "opening") return;

    if (phase === "closing") {
      setPhase("open");
      return;
    }

    setPhase("opening");
    queueOpenAnimation();
  };

  const closeMenu = () => {
    if (phase === "closed" || phase === "closing") return;

    if (openFrameRef.current !== null) {
      cancelAnimationFrame(openFrameRef.current);
      openFrameRef.current = null;
    }

    if (phase === "opening") {
      setPhase("closed");
      return;
    }

    setPhase("closing");
  };

  const toggleMenu = () => {
    if (isOpen) {
      closeMenu();
      return;
    }

    openMenu();
  };

  const handleMenuTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "opacity") {
      return;
    }

    if (phase === "closing") {
      setPhase("closed");
    }
  };

  const navItems = [{ href: "/scholarships", label: "Scholarships" }];

  if (user?.role === "student") {
    navItems.push(
      { href: "/student/dashboard", label: "Dashboard" },
      { href: "/student/applications", label: "My Applications" },
    );
  }

  if (user?.role === "admin") {
    navItems.push(
      { href: "/admin/dashboard", label: "Dashboard" },
      { href: "/admin/applications", label: "Review Queue" },
      { href: "/admin/programs", label: "Application Options" },
    );
  }

  return (
    <div className="md:hidden flex items-center">
      <button
        onClick={toggleMenu}
        className={`group grid h-10 w-10 place-items-center rounded-xl p-1 transition-all duration-300 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
          isOpen
            ? "bg-white/10 text-white ring-1 ring-white/20 shadow-lg shadow-primary-950/20"
            : "text-white/80 hover:bg-white/5 hover:text-white"
        }`}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
      >
        <span
          className={`grid place-items-center transition-transform duration-300 motion-reduce:transition-none motion-reduce:transform-none ${
            isOpen ? "scale-105 rotate-90" : "scale-100 rotate-0"
          }`}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </span>
      </button>

      {isMounted ? (
        <div
          id={menuId}
          aria-hidden={!isPanelVisible}
          onTransitionEnd={handleMenuTransitionEnd}
          className={`absolute top-20 left-0 right-0 z-40 origin-top border-b border-primary-900/50 shadow-2xl backdrop-blur-xl transition-[opacity,transform,filter] duration-300 motion-reduce:transition-none motion-reduce:transform-none ${
            isPanelVisible
              ? "pointer-events-auto translate-y-0 scale-[1] opacity-100 blur-0"
              : "pointer-events-none -translate-y-2 scale-[0.985] opacity-0 blur-[2px]"
          }`}
          style={{
            transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            background:
              "linear-gradient(180deg, rgba(136, 19, 55, 0.92) 0%, rgba(113, 18, 52, 0.9) 55%, rgba(82, 20, 49, 0.94) 100%)",
          }}
        >
          <div className="relative overflow-hidden px-4 py-4">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-8 right-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute top-10 left-8 h-20 w-20 rounded-full bg-accent-400/10 blur-2xl" />
            </div>

            <div className="relative mx-2 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-[0_20px_40px_-24px_rgba(12,10,9,0.7)] ring-1 ring-inset ring-white/5">
              <div className="flex flex-col gap-1">
                {navItems.map((item, index) => (
                  <MobileNavMotionItem
                    key={item.href}
                    index={index}
                    isVisible={isPanelVisible}
                  >
                    <MobileNavLink href={item.href} onClick={closeMenu}>
                      {item.label}
                    </MobileNavLink>
                  </MobileNavMotionItem>
                ))}
              </div>

              {user ? (
                <MobileNavMotionItem
                  index={navItems.length}
                  isVisible={isPanelVisible}
                >
                  <div className="mt-4 flex flex-col gap-4 border-t border-white/10 px-1 pt-4">
                    <span className="px-4 text-sm font-medium text-white/60">
                      {user.email}
                    </span>
                    <div onClick={closeMenu} className="px-4">
                      <LogoutButton />
                    </div>
                  </div>
                </MobileNavMotionItem>
              ) : (
                <MobileNavMotionItem
                  index={navItems.length}
                  isVisible={isPanelVisible}
                >
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <MobileNavLink href="/login" onClick={closeMenu}>
                      Sign In
                    </MobileNavLink>
                  </div>
                </MobileNavMotionItem>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
