import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Calendar,
  GraduationCap,
  Banknote,
  Info,
  CheckCircle2,
  Sparkles,
  Send,
} from "lucide-react";

import { PublicApplicationForm } from "@/components/public-application-form";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { isApplicationFormV2 } from "@/lib/application-v2";
import { resolveStoredObjectUrl } from "@/lib/s3-object-url";
import { formatScholarshipEducationLevel } from "@/lib/scholarships";

export const dynamic = "force-dynamic";

type ScholarshipRouteParams = Promise<{ slug: string }>;

function buildScholarshipDescription(description: string) {
  const normalized = description.replace(/\s+/g, " ").trim();

  if (normalized.length <= 160) {
    return normalized;
  }

  return `${normalized.slice(0, 157).trimEnd()}...`;
}

async function getPublishedScholarshipBySlug(slug: string) {
  return getDb()
    .selectFrom("scholarships")
    .selectAll()
    .where("slug", "=", slug)
    .where("is_published", "=", true)
    .executeTakeFirst();
}

export async function generateMetadata({
  params,
}: {
  params: ScholarshipRouteParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const scholarship = await getPublishedScholarshipBySlug(slug);

  if (!scholarship) {
    return {
      title: "Scholarship Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const description = buildScholarshipDescription(scholarship.description);
  const canonicalPath = `/scholarships/${scholarship.slug}`;

  return {
    title: scholarship.title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: scholarship.title,
      description,
      url: canonicalPath,
      type: "website",
    },
  };
}

export default async function ScholarshipDetailPage({
  params,
}: {
  params: ScholarshipRouteParams;
}) {
  const { slug } = await params;
  const db = getDb();
  const scholarship = await getPublishedScholarshipBySlug(slug);

  if (!scholarship) {
    notFound();
  }

  const isOpen = new Date(scholarship.deadline_at) > new Date();
  const resolvedImageUrl = await resolveStoredObjectUrl(scholarship.image_url);
  const imageUrl =
    resolvedImageUrl ??
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop";

  /* ── Prefill from the logged-in student's latest application ─────── */
  let prefillForm: unknown = undefined;
  let prefillAttachments: { slot_key: string; s3_key: string; original_filename: string; mime_type: string; size_bytes: number }[] = [];
  const user = await getSessionUser();
  let prefillSourceAppId: string | undefined;

  if (user?.role === "student") {
    // 1. Check if this student already has an application for THIS scholarship
    const existingApp = await db
      .selectFrom("applications")
      .select("id")
      .where("scholarship_id", "=", scholarship.id)
      .where("student_user_id", "=", user.id)
      .executeTakeFirst();

    if (existingApp) {
      const existingFormData = await db
        .selectFrom("application_form_data")
        .select("payload")
        .where("application_id", "=", existingApp.id)
        .executeTakeFirst();

      if (existingFormData && isApplicationFormV2(existingFormData.payload)) {
        prefillForm = existingFormData.payload;
        prefillSourceAppId = existingApp.id;
      }
    }

    // 2. If no existing application for this scholarship, try the most recent V2 application
    if (!prefillForm) {
      const latestApp = await db
        .selectFrom("applications")
        .select("id")
        .where("student_user_id", "=", user.id)
        .orderBy("created_at", "desc")
        .executeTakeFirst();

      if (latestApp) {
        const latestFormData = await db
          .selectFrom("application_form_data")
          .select("payload")
          .where("application_id", "=", latestApp.id)
          .executeTakeFirst();

        if (latestFormData && isApplicationFormV2(latestFormData.payload)) {
          prefillForm = latestFormData.payload;
          prefillSourceAppId = latestApp.id;
        }
      }
    }

    // 3. Fallback: prefill from student profile
    if (!prefillForm) {
      const profile = await db
        .selectFrom("student_profiles")
        .selectAll()
        .where("user_id", "=", user.id)
        .executeTakeFirst();

      if (profile) {
        prefillForm = {
          schemaVersion: 2,
          personalInfo: {
            fullName: profile.full_name,
            email: user.email,
            mobileNumber: profile.phone,
          },
        };
      }
    }

    // Fetch attachments from the source application
    if (prefillSourceAppId) {
      prefillAttachments = await db
        .selectFrom("application_attachments")
        .select(["slot_key", "s3_key", "original_filename", "mime_type", "size_bytes"])
        .where("application_id", "=", prefillSourceAppId)
        .execute();
    }
  }

  return (
    <div className="space-y-10 pb-16 animate-fade-in-up">
      {/* Hero Banner */}
      <div className="relative -mx-6 -mt-10 h-72 w-[calc(100%+3rem)] overflow-hidden sm:h-96">
        <img
          src={imageUrl}
          alt={scholarship.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-surface-950 via-surface-900/60 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-primary-900/30 to-transparent" />

        {/* Decorative orbs */}
        <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="absolute -top-10 right-1/4 h-40 w-40 rounded-full bg-accent-400/10 blur-3xl animate-shimmer" />

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 sm:px-12 sm:pb-12">
          <div className="flex items-center gap-3 mb-5">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold backdrop-blur-md ${
                isOpen
                  ? "bg-success-500/20 text-success-300 ring-1 ring-success-400/40"
                  : "bg-danger-500/20 text-danger-300 ring-1 ring-danger-400/40"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isOpen ? "bg-success-400 animate-pulse" : "bg-danger-400"}`} />
              {isOpen ? "Applications Open" : "Applications Closed"}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl md:text-5xl drop-shadow-lg">
            {scholarship.title}
          </h1>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Main Content */}
        <div className="space-y-8 lg:col-span-3">
          <section className="rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-sm ring-1 ring-surface-200/60 card-hover">
            <div className="flex items-center gap-3 border-b border-surface-100 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary-500 to-primary-600 text-white shadow-sm">
                <Info className="h-5 w-5" />
              </div>
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

          <section className="rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-sm ring-1 ring-surface-200/60 card-hover">
            <div className="flex items-center gap-3 border-b border-surface-100 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-success-500 to-success-600 text-white shadow-sm">
                <CheckCircle2 className="h-5 w-5" />
              </div>
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
          <section className="rounded-2xl bg-linear-to-br from-primary-50 to-accent-50/40 p-8 shadow-sm ring-1 ring-primary-100/60">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-500" />
              <h3 className="text-lg font-bold text-primary-900">Key Details</h3>
            </div>
            <div className="mt-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm ring-1 ring-primary-100">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary-600">Amount</p>
                  <p className="mt-0.5 text-xl font-bold text-surface-900">
                    {scholarship.currency}{" "}
                    {Number(scholarship.amount).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm ring-1 ring-primary-100">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary-600">
                    Education Level
                  </p>
                  <p className="mt-0.5 text-xl font-bold text-surface-900">
                    {formatScholarshipEducationLevel(scholarship.education_level)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm ring-1 ring-primary-100">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary-600">
                    Deadline
                  </p>
                  <p className="mt-0.5 text-xl font-bold text-surface-900">
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

      {/* Apply Section */}
      <section className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-lg ring-1 ring-surface-200/60">
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary-100/40 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-accent-100/30 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary-500 to-primary-600 text-white shadow-sm">
              <Send className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-surface-900">Apply Now</h2>
          </div>
          <p className="mt-2 text-sm text-surface-500 ml-13">
            Submit your application directly. We will send updates to the email
            address you provide.
          </p>
          <div className="mt-8">
            {isOpen ? (
              <PublicApplicationForm
                scholarshipId={scholarship.id}
                initialForm={prefillForm}
                initialAttachments={prefillAttachments}
              />
            ) : (
              <div className="rounded-2xl bg-danger-50/80 p-6 text-center ring-1 ring-danger-100">
                <p className="font-bold text-danger-700">
                  This scholarship is closed.
                </p>
                <p className="mt-1 text-sm text-danger-500">
                  We are no longer accepting applications.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
