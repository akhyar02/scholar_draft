import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { StudentApplicationEditor } from "@/components/student-application-editor";
import { createDraftApplication } from "@/lib/application-service";
import { isApplicationFormV2 } from "@/lib/application-v2";
import { getDb } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function StudentApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePageUser("student");
  const db = getDb();

  const application = await db
    .selectFrom("applications as a")
    .innerJoin("scholarships as s", "s.id", "a.scholarship_id")
    .select([
      "a.id",
      "a.status",
      "a.student_user_id",
      "a.scholarship_id",
      "s.title as scholarship_title",
      "s.slug as scholarship_slug",
    ])
    .where("a.id", "=", id)
    .where("a.student_user_id", "=", user.id)
    .executeTakeFirst();

  if (!application) {
    notFound();
  }

  const [formData, attachments, legacyDocuments] = await Promise.all([
    db
      .selectFrom("application_form_data")
      .select("payload")
      .where("application_id", "=", id)
      .executeTakeFirst(),
    db
      .selectFrom("application_attachments")
      .selectAll()
      .where("application_id", "=", id)
      .orderBy("uploaded_at", "desc")
      .execute(),
    db
      .selectFrom("application_documents")
      .selectAll()
      .where("application_id", "=", id)
      .orderBy("uploaded_at", "desc")
      .execute(),
  ]);

  const payload = formData?.payload ?? {};
  const isV2 = isApplicationFormV2(payload);

  if (application.status === "draft" && !isV2) {
    await db.deleteFrom("applications").where("id", "=", application.id).execute();

    const recreatedId = await createDraftApplication({
      scholarshipId: application.scholarship_id,
      studentUserId: user.id,
      studentEmail: user.email,
    });

    redirect(`/student/applications/${recreatedId}`);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link
          href="/student/applications"
          className="inline-flex items-center gap-2 text-sm font-medium text-surface-500 hover:text-surface-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Applications
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-surface-900">Application Details</h1>
        <p className="mt-2 text-surface-500">
          Review and update your application for {application.scholarship_title}.
        </p>
      </div>

      {isV2 ? (
        <StudentApplicationEditor
          application={{
            id: application.id,
            status: application.status,
            scholarship_title: application.scholarship_title,
          }}
          initialForm={payload}
          initialAttachments={attachments}
        />
      ) : (
        <section className="rounded-lg bg-white p-6 ring-1 ring-surface-200 space-y-4">
          <h2 className="text-xl font-semibold text-surface-900">Legacy Application Data</h2>
          <p className="text-sm text-surface-600">
            This application was submitted using the previous schema and is displayed in read-only mode.
          </p>
          <pre className="overflow-auto rounded-xl bg-surface-900 p-4 text-xs text-surface-200">
            {JSON.stringify(payload, null, 2)}
          </pre>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-surface-900">Legacy Documents</h3>
            {legacyDocuments.length === 0 ? (
              <p className="text-sm text-surface-500">No legacy documents found.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {legacyDocuments.map((doc) => (
                  <div key={doc.id} className="rounded-lg bg-surface-50 p-3 ring-1 ring-surface-200">
                    <p className="text-sm font-medium text-surface-800">{doc.doc_type}</p>
                    <p className="text-xs text-surface-600 truncate" title={doc.original_filename}>{doc.original_filename}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
