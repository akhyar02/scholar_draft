import Link from "next/link";
import {
  Search,
  FileText,
  CheckCircle,
  GraduationCap,
  ArrowRight,
  Sparkles,
  LogIn,
  Award,
  Users,
  TrendingUp,
} from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getSessionUser();
  return (
    <div className="space-y-32 pb-16">
      {/* ─────────────────────────────────────────────────────────────────
          HERO
      ───────────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden bg-surface-950 text-white"
        style={{ marginLeft: "calc(-50vw + 50%)", width: "100vw", marginTop: "-2.5rem" }}
      >
        {/* Background image — lighter overlay so the photo reads clearly */}
        <div className="absolute inset-0">
          <img
            src="https://yum.mmu.edu.my/wp-content/uploads/2022/03/Convo2019.jpg"
            alt="Students on campus"
            className="h-full w-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-linear-to-br from-surface-950/85 via-surface-950/55 to-primary-950/40" />
          <div className="absolute inset-0 bg-linear-to-t from-surface-950 via-surface-950/20 to-transparent" />
        </div>

        {/* Ambient glow orb */}
        <div className="absolute -top-20 right-0 h-[500px] w-[500px] rounded-full bg-primary-700/10 blur-[120px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 md:py-32 lg:py-40">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">

            {/* Left: Copy */}
            <div className="animate-fade-in-up">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-400/25 bg-primary-500/10 px-4 py-1.5 text-sm font-medium text-primary-300 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Now accepting applications for 2026
              </div>
              <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.08]">
                Your Journey to a{" "}
                <span className="text-gradient">Brighter Future</span>{" "}
                Starts Here
              </h1>
              <p className="mt-8 max-w-xl text-lg text-surface-300 leading-relaxed sm:text-xl">
                Discover opportunities, apply with ease, and track your progress.
                YUM ScholarHub connects ambitious students with life-changing scholarships.
              </p>
              <div className="mt-10 flex flex-wrap gap-4 animate-fade-in-up animate-delay-200">
                <Link
                  className="btn-gradient inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-semibold text-white shadow-lg"
                  href="/scholarships"
                >
                  Browse Scholarships
                  <ArrowRight className="h-5 w-5" />
                </Link>
                {!user && (
                  <Link
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/25"
                    href="/login"
                  >
                    <LogIn className="h-5 w-5" />
                    Sign In
                  </Link>
                )}
              </div>
            </div>

            {/* Right: Stats panel (desktop only) */}
            <div className="hidden lg:block animate-fade-in-right animate-delay-200">
              <div className="glass-dark rounded-3xl p-8 ring-1 ring-white/8">
                <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary-400">
                  Impact Overview
                </p>
                <div className="flex flex-col gap-0">
                  <div className="flex items-center gap-5 pb-6">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500/15 ring-1 ring-primary-500/20">
                      <Award className="h-7 w-7 text-primary-400" />
                    </div>
                    <div>
                      <p className="text-3xl font-extrabold text-white stat-number">50+</p>
                      <p className="mt-0.5 text-sm text-surface-400">Active Scholarships</p>
                    </div>
                  </div>
                  <div className="h-px bg-white/8" />
                  <div className="flex items-center gap-5 py-6">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500/15 ring-1 ring-primary-500/20">
                      <Users className="h-7 w-7 text-primary-400" />
                    </div>
                    <div>
                      <p className="text-3xl font-extrabold text-white stat-number">1,000+</p>
                      <p className="mt-0.5 text-sm text-surface-400">Students Supported</p>
                    </div>
                  </div>
                  <div className="h-px bg-white/8" />
                  <div className="flex items-center gap-5 pt-6">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500/15 ring-1 ring-primary-500/20">
                      <TrendingUp className="h-7 w-7 text-primary-400" />
                    </div>
                    <div>
                      <p className="text-3xl font-extrabold text-white stat-number">RM 2M+</p>
                      <p className="mt-0.5 text-sm text-surface-400">Total Awards Given</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile stats */}
          <div className="mt-14 grid max-w-sm grid-cols-3 gap-6 lg:hidden animate-fade-in-up animate-delay-300">
            <div className="text-center">
              <p className="text-2xl font-bold stat-number text-white">50+</p>
              <p className="mt-1 text-xs text-surface-400">Scholarships</p>
            </div>
            <div className="text-center border-x border-white/10">
              <p className="text-2xl font-bold stat-number text-white">1K+</p>
              <p className="mt-1 text-xs text-surface-400">Students</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold stat-number text-white">RM2M+</p>
              <p className="mt-1 text-xs text-surface-400">Awarded</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          HOW IT WORKS
      ───────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl">
        <div className="text-center animate-fade-in-up">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">
            How It Works
          </p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-surface-900 sm:text-5xl">
            Taking the Stress Out
            <br className="hidden sm:block" /> of Applications
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-surface-500 leading-relaxed">
            Our platform is designed to make finding and applying for
            scholarships as seamless as possible.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Search,
              step: "01",
              title: "Discover Opportunities",
              desc: "Easily search and filter through a curated list of scholarships that match your educational goals.",
              delay: "animate-delay-100",
            },
            {
              icon: FileText,
              step: "02",
              title: "Simple Application",
              desc: "Submit your details and upload required documents directly through our secure platform.",
              delay: "animate-delay-200",
            },
            {
              icon: CheckCircle,
              step: "03",
              title: "Track Progress",
              desc: "Stay updated with real-time status changes and notifications on your application journey.",
              delay: "animate-delay-300",
            },
          ].map(({ icon: Icon, step, title, desc, delay }) => (
            <div
              key={step}
              className={`card-hover group relative flex flex-col rounded-3xl bg-white p-8 shadow-sm ring-1 ring-surface-200/80 animate-fade-in-up ${delay}`}
            >
              <div className="mb-6 flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 ring-1 ring-primary-100 transition-all duration-300 group-hover:bg-primary-100 group-hover:scale-110">
                  <Icon className="h-7 w-7" />
                </div>
                <span className="text-5xl font-extrabold leading-none text-surface-100 select-none">
                  {step}
                </span>
              </div>
              <h3 className="text-xl font-bold text-surface-900">{title}</h3>
              <p className="mt-3 flex-1 text-surface-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          CTA
      ───────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-surface-950 px-8 py-24 text-center sm:px-16">
        <div className="absolute inset-0 bg-linear-to-br from-primary-950/80 via-surface-950 to-surface-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 bg-linear-to-r from-transparent via-primary-500/30 to-transparent" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[600px] rounded-full bg-primary-700/12 blur-3xl" />

        <div className="relative z-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/15 ring-1 ring-primary-500/20">
            <GraduationCap className="h-8 w-8 text-primary-400" />
          </div>
          <h2 className="mt-8 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Ready to take the
            <br className="hidden sm:block" /> next step?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-surface-400 leading-relaxed">
            Join thousands of students who have successfully secured funding for
            their education through YUM ScholarHub.
          </p>
          <div className="mt-10">
            <Link
              className="btn-gradient inline-flex items-center gap-2.5 rounded-2xl px-10 py-4 text-base font-semibold text-white shadow-lg"
              href="/scholarships"
            >
              Explore Scholarships Now
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
