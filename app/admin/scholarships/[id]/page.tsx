import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminScholarshipForm } from "@/components/admin-scholarship-form";
import { getDb } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import { resolveStoredObjectUrl } from "@/lib/s3-object-url";

function formatDateTimeLocal(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

export default async function EditScholarshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageUser("admin");
  const { id } = await params;
  const db = getDb();

  const scholarship = await db
    .selectFrom("scholarships")
    .select([
      "id",
      "title",
      "description",
      "image_url",
      "amount",
      "currency",
      "education_level",
      "eligibility_text",
      "deadline_at",
      "is_published",
    ])
    .where("id", "=", id)
    .executeTakeFirst();

  if (!scholarship) {
    notFound();
  }

  const initialImagePreviewUrl = await resolveStoredObjectUrl(scholarship.image_url);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="space-y-3">
        <Link
          href="/admin/scholarships"
          className="inline-flex items-center gap-2 text-sm font-medium text-surface-600 hover:text-surface-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to scholarships
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Edit Scholarship</h1>
          <p className="mt-2 text-surface-600">Update scholarship details and publish settings.</p>
        </div>
      </div>
      <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-sm ring-1 ring-surface-200/60">
        <AdminScholarshipForm
          mode="edit"
          scholarshipId={scholarship.id}
          initialImagePreviewUrl={initialImagePreviewUrl}
          initialValues={{
            title: scholarship.title,
            description: scholarship.description,
            imageKey: scholarship.image_url ?? "",
            amount: Number(scholarship.amount).toString(),
            currency: scholarship.currency,
            educationLevel: scholarship.education_level ?? "",
            eligibilityText: scholarship.eligibility_text,
            deadlineAt: formatDateTimeLocal(scholarship.deadline_at),
            isPublished: scholarship.is_published,
          }}
        />
      </div>
    </div>
  );
}
