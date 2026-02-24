import { notFound } from "next/navigation";
import {
  Calendar,
  GraduationCap,
  Banknote,
  Info,
  CheckCircle2,
} from "lucide-react";

import { PublicApplicationForm } from "@/components/public-application-form";
import { getDb } from "@/lib/db";
import { resolveStoredObjectUrl } from "@/lib/s3-object-url";
import { formatScholarshipEducationLevel } from "@/lib/scholarships";

export const dynamic = "force-dynamic";

export default async function ScholarshipDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDb();

  const scholarship = await db
    .selectFrom("scholarships")
    .selectAll()
    .where("slug", "=", slug)
    .where("is_published", "=", true)
    .executeTakeFirst();

  if (!scholarship) {
    notFound();
  }

  const isOpen = new Date(scholarship.deadline_at) > new Date();
  const resolvedImageUrl = await resolveStoredObjectUrl(scholarship.image_url);
  const imageUrl =
    resolvedImageUrl ??
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop";

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner */}
      <div className="relative h-64 w-full overflow-hidden rounded-xl bg-surface-900 shadow-lg sm:h-80">
        <img
          src={imageUrl}
          alt={scholarship.title}
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-900/80 to-transparent" />
        <div className="absolute bottom-0 left-0 p-8 sm:p-12">
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-semibold shadow-sm backdrop-blur-md ${
                isOpen
                  ? "bg-success-500/20 text-success-300 ring-1 ring-success-500/50"
                  : "bg-danger-500/20 text-danger-300 ring-1 ring-danger-500/50"
              }`}
            >
              {isOpen ? "Applications Open" : "Applications Closed"}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl md:text-5xl">
            {scholarship.title}
          </h1>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Main Content */}
        <div className="space-y-8 lg:col-span-3">
          <section className="rounded-lg bg-white p-8 shadow-sm ring-1 ring-surface-200">
            <div className="flex items-center gap-3 border-b border-surface-100 pb-4">
              <Info className="h-6 w-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-surface-900">
                About the Scholarship
              </h2>
            </div>
            <div className="prose prose-slate mt-6 max-w-none text-surface-600">
              <p className="whitespace-pre-wrap leading-relaxed">
                {scholarship.description}
              </p>
            </div>
          </section>

          <section className="rounded-lg bg-white p-8 shadow-sm ring-1 ring-surface-200">
            <div className="flex items-center gap-3 border-b border-surface-100 pb-4">
              <CheckCircle2 className="h-6 w-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-surface-900">
                Eligibility Criteria
              </h2>
            </div>
            <div className="prose prose-slate mt-6 max-w-none text-surface-600">
              <p className="whitespace-pre-wrap leading-relaxed">
                {scholarship.eligibility_text}
              </p>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8 lg:col-span-2">
          <section className="rounded-lg bg-primary-50 p-8 shadow-sm ring-1 ring-primary-100">
            <h3 className="text-lg font-bold text-primary-900">Key Details</h3>
            <div className="mt-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-primary-600 shadow-sm">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary-700">Amount</p>
                  <p className="mt-1 text-lg font-semibold text-surface-900">
                    {scholarship.currency}{" "}
                    {Number(scholarship.amount).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-primary-600 shadow-sm">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary-700">
                    Education Level
                  </p>
                  <p className="mt-1 text-lg font-semibold text-surface-900">
                    {formatScholarshipEducationLevel(scholarship.education_level)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-primary-600 shadow-sm">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary-700">
                    Deadline
                  </p>
                  <p className="mt-1 text-lg font-semibold text-surface-900">
                    {new Date(scholarship.deadline_at).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="sticky top-24 rounded-lg bg-white p-8 shadow-md ring-1 ring-surface-200">
        <h2 className="text-xl font-bold text-surface-900">Apply Now</h2>
        <p className="mt-3 text-sm text-surface-600">
          Submit your application directly. We will send updates to the email
          address you provide.
        </p>
        <div className="mt-6">
          {isOpen ? (
            <PublicApplicationForm scholarshipId={scholarship.id} />
          ) : (
            <div className="rounded-xl bg-danger-50 p-4 text-center ring-1 ring-danger-100">
              <p className="font-semibold text-danger-700">
                This scholarship is closed.
              </p>
              <p className="mt-1 text-sm text-danger-600">
                We are no longer accepting applications.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
