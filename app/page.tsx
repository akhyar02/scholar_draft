import Link from "next/link";
import { Search, FileText, CheckCircle, GraduationCap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-20 pb-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-xl bg-surface-900 text-white shadow-xl">
        <div className="absolute inset-0 opacity-40">
          <img
            src="https://yum.mmu.edu.my/wp-content/uploads/2022/03/Convo2019.jpg"
            alt="Students on campus"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="relative z-10 px-8 py-24 md:px-16 md:py-32 lg:w-2/3">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Your Journey to a Brighter Future Starts Here
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-100 sm:text-xl">
            Discover opportunities, apply with ease, and track your progress. YUM ScholarHub connects ambitious students with life-changing scholarships.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              className="rounded-md bg-white px-8 py-3.5 text-base font-semibold text-primary-900 shadow-sm hover:bg-primary-50 transition-colors"
              href="/scholarships"
            >
              Browse Scholarships
            </Link>
          </div>
        </div>
      </section>

      {/* How We Help Section */}
      <section className="mx-auto max-w-5xl text-center">
        <h2 className="text-3xl font-bold text-surface-900">Taking the Stress Out of Applications</h2>
        <p className="mt-4 text-lg text-surface-600">
          Our platform is designed to make finding and applying for scholarships as seamless as possible.
        </p>
        
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col items-center rounded-lg bg-white p-8 shadow-sm ring-1 ring-surface-100">
            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-primary-100 text-primary-600">
              <Search className="h-8 w-8" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-surface-900">Discover Opportunities</h3>
            <p className="mt-3 text-surface-600">
              Easily search and filter through a curated list of scholarships that match your educational goals.
            </p>
          </div>
          
          <div className="flex flex-col items-center rounded-lg bg-white p-8 shadow-sm ring-1 ring-surface-100">
            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-primary-100 text-primary-600">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-surface-900">Simple Application</h3>
            <p className="mt-3 text-surface-600">
              Submit your details and upload required documents directly through our secure platform.
            </p>
          </div>
          
          <div className="flex flex-col items-center rounded-lg bg-white p-8 shadow-sm ring-1 ring-surface-100 sm:col-span-2 lg:col-span-1">
            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-primary-100 text-primary-600">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-surface-900">Track Progress</h3>
            <p className="mt-3 text-surface-600">
              Stay updated with real-time status changes and notifications on your application journey.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="rounded-xl bg-surface-900 px-6 py-16 text-center sm:px-12">
        <GraduationCap className="mx-auto h-16 w-16 text-primary-400" />
        <h2 className="mt-6 text-3xl font-bold text-white">Ready to take the next step?</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-surface-300">
          Join thousands of students who have successfully secured funding for their education through YUM ScholarHub.
        </p>
        <div className="mt-8">
          <Link
            className="inline-flex rounded-md bg-primary-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-primary-500 transition-colors"
            href="/scholarships"
          >
            Explore Scholarships Now
          </Link>
        </div>
      </section>
    </div>
  );
}
