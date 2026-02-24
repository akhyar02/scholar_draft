import Link from "next/link";
import { Search, FileText, CheckCircle, GraduationCap, ArrowRight, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-28 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-surface-950 text-white min-h-screen flex flex-col justify-center" style={{ marginLeft: 'calc(-50vw + 50%)', width: '100vw', marginTop: '-2.5rem' }}>
        <div className="absolute inset-0">
          <img
            src="https://yum.mmu.edu.my/wp-content/uploads/2022/03/Convo2019.jpg"
            alt="Students on campus"
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-linear-to-br from-surface-950/90 via-surface-950/70 to-primary-950/60" />
          <div className="absolute inset-0 bg-linear-to-t from-surface-950 via-transparent to-transparent" />
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 right-20 h-72 w-72 rounded-full bg-primary-500/10 blur-3xl animate-shimmer" />
        <div className="absolute bottom-20 left-10 h-56 w-56 rounded-full bg-accent-500/10 blur-3xl animate-shimmer animate-delay-200" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:py-28 lg:py-36">
          <div className="max-w-3xl animate-fade-in-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-4 py-1.5 text-sm font-medium text-primary-300 backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              Now accepting applications for 2026
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl leading-[1.1]">
              Your Journey to a{" "}
              <span className="text-gradient">Brighter Future</span>{" "}
              Starts Here
            </h1>
            <p className="mt-8 max-w-2xl text-lg text-surface-300 leading-relaxed sm:text-xl">
              Discover opportunities, apply with ease, and track your progress. YUM ScholarHub connects ambitious students with life-changing scholarships.
            </p>
            <div className="mt-10 flex flex-wrap gap-4 animate-fade-in-up animate-delay-200">
              <Link
                className="btn-gradient inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-semibold text-white shadow-lg"
                href="/scholarships"
              >
                Browse Scholarships
                <ArrowRight className="h-5 w-5" />
              </Link>

            </div>
          </div>

          {/* Floating stats */}
          <div className="mt-20 grid grid-cols-3 gap-6 max-w-lg animate-fade-in-up animate-delay-300">
            <div className="text-center">
              <p className="text-3xl font-bold stat-number text-white">50+</p>
              <p className="mt-1 text-sm text-surface-400">Scholarships</p>
            </div>
            <div className="text-center border-x border-white/10">
              <p className="text-3xl font-bold stat-number text-white">1K+</p>
              <p className="mt-1 text-sm text-surface-400">Students</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold stat-number text-white">RM2M+</p>
              <p className="mt-1 text-sm text-surface-400">Awarded</p>
            </div>
          </div>
        </div>
      </section>

      {/* How We Help Section */}
      <section className="mx-auto max-w-5xl text-center">
        <div className="animate-fade-in-up">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary-500">How It Works</p>
          <h2 className="mt-3 text-4xl font-bold text-surface-900">
            Taking the Stress Out of Applications
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-500">
            Our platform is designed to make finding and applying for scholarships as seamless as possible.
          </p>
        </div>
        
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card-hover group flex flex-col items-center rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-surface-200/60 backdrop-blur-sm animate-fade-in-up animate-delay-100">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary-50 to-primary-100 text-primary-600 shadow-sm ring-1 ring-primary-200/40 transition-transform duration-300 group-hover:scale-110">
              <Search className="h-7 w-7" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-surface-900">Discover Opportunities</h3>
            <p className="mt-3 text-surface-500 leading-relaxed">
              Easily search and filter through a curated list of scholarships that match your educational goals.
            </p>
          </div>
          
          <div className="card-hover group flex flex-col items-center rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-surface-200/60 backdrop-blur-sm animate-fade-in-up animate-delay-200">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-accent-50 to-accent-100 text-accent-600 shadow-sm ring-1 ring-accent-200/40 transition-transform duration-300 group-hover:scale-110">
              <FileText className="h-7 w-7" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-surface-900">Simple Application</h3>
            <p className="mt-3 text-surface-500 leading-relaxed">
              Submit your details and upload required documents directly through our secure platform.
            </p>
          </div>
          
          <div className="card-hover group flex flex-col items-center rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-surface-200/60 backdrop-blur-sm sm:col-span-2 lg:col-span-1 animate-fade-in-up animate-delay-300">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-success-50 to-success-100 text-success-600 shadow-sm ring-1 ring-success-200/40 transition-transform duration-300 group-hover:scale-110">
              <CheckCircle className="h-7 w-7" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-surface-900">Track Progress</h3>
            <p className="mt-3 text-surface-500 leading-relaxed">
              Stay updated with real-time status changes and notifications on your application journey.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden rounded-3xl bg-surface-950 px-8 py-20 text-center sm:px-16">
        {/* Decorative gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 bg-linear-to-r from-transparent via-primary-500/40 to-transparent" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full bg-primary-500/15 blur-3xl" />
        <div className="absolute -bottom-16 right-0 h-40 w-80 rounded-full bg-accent-500/10 blur-3xl" />
        
        <div className="relative z-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-primary-500/20 to-accent-500/20 ring-1 ring-white/10">
            <GraduationCap className="h-10 w-10 text-primary-400" />
          </div>
          <h2 className="mt-8 text-4xl font-bold text-white">Ready to take the next step?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-400 leading-relaxed">
            Join thousands of students who have successfully secured funding for their education through YUM ScholarHub.
          </p>
          <div className="mt-10">
            <Link
              className="btn-gradient inline-flex items-center gap-2 rounded-2xl px-10 py-4 text-base font-semibold text-white shadow-lg"
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
