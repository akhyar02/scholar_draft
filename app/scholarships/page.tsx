import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, GraduationCap, Banknote, ArrowRight, Sparkles } from "lucide-react";

import { getDb } from "@/lib/db";
import { resolveStoredObjectUrl } from "@/lib/s3-object-url";
import { formatScholarshipEducationLevel } from "@/lib/scholarships";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Available Scholarships",
  description:
    "Browse available YUM scholarships and explore funding opportunities for your educational journey.",
  alternates: {
    canonical: "/scholarships",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Available Scholarships",
    description:
      "Browse available YUM scholarships and explore funding opportunities for your educational journey.",
    url: "/scholarships",
    type: "website",
  },
};

export default async function ScholarshipsPage() {
  const db = getDb();
  const scholarships = await db
    .selectFrom("scholarships")
    .select([
      "id",
      "title",
      "slug",
      "description",
      "image_url",
      "amount",
      "currency",
      "education_level",
      "deadline_at",
    ])
    .where("is_published", "=", true)
    .orderBy("deadline_at", "asc")
    .execute();
  const scholarshipCards = await Promise.all(
    scholarships.map(async (scholarship) => ({
      ...scholarship,
      resolvedImageUrl: await resolveStoredObjectUrl(scholarship.image_url),
    })),
  );

  return (
    <div className="space-y-12">
      <div className="text-center max-w-3xl mx-auto animate-fade-in-up">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700">
          <Sparkles className="h-4 w-4" />
          {scholarshipCards.length} opportunities available
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-surface-900 sm:text-5xl">
          Available <span className="text-gradient">Scholarships</span>
        </h1>
        <p className="mt-4 text-lg text-surface-500 leading-relaxed">
          Explore our curated list of funding opportunities to support your educational journey.
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {scholarshipCards.map((scholarship, index) => {
          const isOpen = new Date(scholarship.deadline_at) > new Date();
          const placeholderImageUrl = `https://images.unsplash.com/photo-${1523050854058 + index * 100}-8df90110c9f1?q=80&w=800&auto=format&fit=crop`;
          const imageUrl = scholarship.resolvedImageUrl ?? placeholderImageUrl;

          return (
            <article
              key={scholarship.id}
              className={`card-hover group flex flex-col overflow-hidden rounded-2xl bg-white/80 shadow-sm ring-1 ring-surface-200/60 backdrop-blur-sm animate-fade-in-up animate-delay-${Math.min(index, 3) * 100}`}
            >
              <div className="relative h-52 w-full overflow-hidden bg-surface-100">
                <img
                  src={imageUrl}
                  alt={scholarship.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />
                <div className="absolute top-4 right-4">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-lg backdrop-blur-md ${
                      isOpen
                        ? "bg-success-500/90 text-white"
                        : "bg-surface-800/80 text-surface-200"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-white animate-pulse" : "bg-surface-400"}`} />
                    {isOpen ? "Open" : "Closed"}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h2 className="text-xl font-bold text-surface-900 line-clamp-2 group-hover:text-primary-700 transition-colors">
                  {scholarship.title}
                </h2>
                <p className="mt-3 text-sm text-surface-500 line-clamp-3 flex-1 leading-relaxed">
                  {scholarship.description}
                </p>

                <div className="mt-6 space-y-3 text-sm text-surface-500">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                      <Banknote className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-surface-900">
                      {scholarship.currency} {Number(scholarship.amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <span>{formatScholarshipEducationLevel(scholarship.education_level)}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-info-50 text-info-600">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span>{new Date(scholarship.deadline_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </div>

                <Link
                  href={`/scholarships/${scholarship.slug}`}
                  className="btn-gradient mt-8 flex items-center justify-center gap-2 w-full rounded-xl py-3 text-center text-sm font-semibold text-white shadow-sm"
                >
                  View Details
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
