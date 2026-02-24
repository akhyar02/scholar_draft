import Link from "next/link";
import { Calendar, GraduationCap, Banknote } from "lucide-react";

import { getDb } from "@/lib/db";
import { resolveStoredObjectUrl } from "@/lib/s3-object-url";
import { formatScholarshipEducationLevel } from "@/lib/scholarships";

export const dynamic = "force-dynamic";

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
    <div className="space-y-10">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight text-surface-900 sm:text-5xl">
          Available Scholarships
        </h1>
        <p className="mt-4 text-lg text-surface-600">
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
              className="group flex flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-surface-200 transition-all hover:shadow-md hover:ring-primary-300"
            >
              <div className="relative h-48 w-full overflow-hidden bg-surface-100">
                <img
                  src={imageUrl}
                  alt={scholarship.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute top-4 right-4">
                  <span
                    className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold shadow-sm backdrop-blur-md ${
                      isOpen
                        ? "bg-success-100/90 text-success-800 ring-1 ring-success-600/20"
                        : "bg-danger-100/90 text-danger-800 ring-1 ring-danger-600/20"
                    }`}
                  >
                    {isOpen ? "Open" : "Closed"}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h2 className="text-xl font-bold text-surface-900 line-clamp-2">
                  {scholarship.title}
                </h2>
                <p className="mt-3 text-sm text-surface-600 line-clamp-3 flex-1">
                  {scholarship.description}
                </p>

                <div className="mt-6 space-y-3 text-sm text-surface-600">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-primary-500" />
                    <span className="font-medium text-surface-900">
                      {scholarship.currency} {Number(scholarship.amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary-500" />
                    <span>{formatScholarshipEducationLevel(scholarship.education_level)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary-500" />
                    <span>{new Date(scholarship.deadline_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <Link
                  href={`/scholarships/${scholarship.slug}`}
                  className="mt-8 block w-full rounded-xl bg-primary-50 py-2.5 text-center text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100"
                >
                  View Details
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
