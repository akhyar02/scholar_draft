import { notFound } from "next/navigation";

import { AdminStatusControls } from "@/components/admin-status-controls";
import { StatusBadge } from "@/components/status-badge";
import { isApplicationFormV2 } from "@/lib/application-v2";
import { listApplicationOptionsTree } from "@/lib/application-options";
import { getDb } from "@/lib/db";
import type { ApplicationFormPayloadV2 } from "@/lib/application-types";
import { requirePageUser } from "@/lib/page-auth";
import { resolveStoredObjectUrl } from "@/lib/s3-object-url";

export const dynamic = "force-dynamic";

function formatDocType(docType: string) {
  return docType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const sizes = ["B", "KB", "MB", "GB"];
  const sizeIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  const value = bytes / 1024 ** sizeIndex;
  const rounded = value >= 10 || sizeIndex === 0 ? value.toFixed(0) : value.toFixed(1);

  return `${rounded} ${sizes[sizeIndex]}`;
}

function humanizeSlot(slot: string) {
  if (slot === "personal.studentIdProof") return "Student ID Image Proof";
  if (slot === "personal.latestTranscript") return "Latest Semester Transcript";
  if (slot === "family.fatherGuardian.payslip") return "Father/Guardian Payslip";
  if (slot === "family.motherGuardian.payslip") return "Mother/Guardian Payslip";
  if (slot === "siblings.specialTreatment.okuCard") return "OKU Card";
  if (slot === "siblings.specialTreatment.chronicTreatment") return "Chronic Treatment Document";
  if (slot === "financial.mmuOutstandingInvoice") return "MMU Outstanding Invoice";

  const siblingIc = /^siblings\.(above18Working|above18NonWorking|studyInIpt|age7to17|age6Below)\.([0-9a-fA-F-]{8,})\.(icDoc|payslip)$/;
  const supportProof = /^financial\.support\.([0-9a-fA-F-]{8,})\.proof$/;

  const siblingMatch = siblingIc.exec(slot);
  if (siblingMatch) {
    const category = siblingMatch[1]
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (char) => char.toUpperCase());
    const doc = siblingMatch[3] === "icDoc" ? "IC Doc" : "Payslip";
    return `${category} - ${doc}`;
  }

  const supportMatch = supportProof.exec(slot);
  if (supportMatch) {
    return `Support Proof (${supportMatch[1]})`;
  }

  return slot;
}

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageUser("admin");
  const { id } = await params;
  const db = getDb();

  const application = await db
    .selectFrom("applications as a")
    .innerJoin("scholarships as s", "s.id", "a.scholarship_id")
    .innerJoin("student_profiles as p", "p.user_id", "a.student_user_id")
    .innerJoin("users as u", "u.id", "a.student_user_id")
    .select([
      "a.id",
      "a.status",
      "a.admin_notes",
      "a.submitted_at",
      "a.updated_at",
      "s.title as scholarship_title",
      "u.email as student_email",
      "p.full_name as student_name",
      "p.phone as student_phone",
      "p.institution as student_institution",
      "p.program as student_program",
      "p.graduation_year as student_graduation_year",
      "p.gpa as student_gpa",
    ])
    .where("a.id", "=", id)
    .executeTakeFirst();

  if (!application) {
    notFound();
  }

  const [formData, attachments, legacyDocuments, history, applicationOptions] = await Promise.all([
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
    db
      .selectFrom("application_status_history")
      .selectAll()
      .where("application_id", "=", id)
      .orderBy("changed_at", "desc")
      .execute(),
    listApplicationOptionsTree(db),
  ]);

  const payload = formData?.payload ?? {};
  const isV2 = isApplicationFormV2(payload);
  const supportProviderLabelById = new Map(
    applicationOptions.supportProviders.map((provider) => [provider.id, provider.label]),
  );

  const attachmentsWithLinks = await Promise.all(
    attachments.map(async (file) => {
      const [viewUrl, downloadUrl] = await Promise.all([
        resolveStoredObjectUrl(file.s3_key),
        resolveStoredObjectUrl(file.s3_key, {
          downloadFileName: file.original_filename,
          responseContentType: file.mime_type,
        }),
      ]);

      return {
        ...file,
        viewUrl,
        downloadUrl,
      };
    }),
  );

  const groupedAttachments = {
    Personal: attachmentsWithLinks.filter((file) => file.slot_key.startsWith("personal.")),
    Family: attachmentsWithLinks.filter((file) => file.slot_key.startsWith("family.")),
    Siblings: attachmentsWithLinks.filter((file) => file.slot_key.startsWith("siblings.")),
    Financial: attachmentsWithLinks.filter((file) => file.slot_key.startsWith("financial.")),
  };

  const legacyDocumentsWithLinks = await Promise.all(
    legacyDocuments.map(async (doc) => {
      const [viewUrl, downloadUrl] = await Promise.all([
        resolveStoredObjectUrl(doc.s3_key),
        resolveStoredObjectUrl(doc.s3_key, {
          downloadFileName: doc.original_filename,
          responseContentType: doc.mime_type,
        }),
      ]);

      return {
        ...doc,
        viewUrl,
        downloadUrl,
      };
    }),
  );

  const v2Form = isV2 ? (payload as ApplicationFormPayloadV2) : null;
  const selectedSupportProviderNames = v2Form
    ? v2Form.financialDeclaration.supportProviderOptionIds.map(
        (providerId) => supportProviderLabelById.get(providerId) ?? providerId,
      )
    : [];

  return (
    <div className="min-w-0 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-surface-900">Application Review</h1>
        <p className="mt-2 text-surface-600">Review application details, documents, and update status.</p>
      </div>

      <div className="grid min-w-0 gap-8 lg:grid-cols-3">
        <div className="min-w-0 space-y-8 lg:col-span-2">
          <section className="rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-surface-200/60 backdrop-blur-sm sm:p-8">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="break-words text-2xl font-bold text-surface-900">{application.scholarship_title}</h2>
                <div className="mt-3">
                  <StatusBadge status={application.status} />
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-surface-500">Applicant</p>
                <p className="mt-1 break-words font-medium text-surface-900">{application.student_name}</p>
                <p className="break-all text-sm text-surface-600">{application.student_email}</p>
                <p className="break-all text-sm text-surface-600">{application.student_phone}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-surface-500">Academic Info</p>
                <p className="mt-1 break-words font-medium text-surface-900">{application.student_program}</p>
                <p className="break-words text-sm text-surface-600">{application.student_institution}</p>
                {application.student_graduation_year || application.student_gpa ? (
                  <p className="break-words text-sm text-surface-600">
                    {application.student_graduation_year ? `Class of ${application.student_graduation_year}` : ""}
                    {application.student_graduation_year && application.student_gpa ? " • " : ""}
                    {typeof application.student_gpa === "number" ? `GPA: ${Number(application.student_gpa).toFixed(2)}` : ""}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {v2Form ? (
            <>
              <section className="min-w-0 rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-sm ring-1 ring-surface-200/60">
                <h2 className="text-xl font-bold text-surface-900">Personal Info</h2>
                <div className="mt-6 grid min-w-0 gap-4 sm:grid-cols-2 [&>*]:min-w-0 [&_p]:[overflow-wrap:anywhere]">
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Full Name</p><p className="mt-1 text-sm text-surface-900">{v2Form.personalInfo.fullName}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Student ID</p><p className="mt-1 text-sm text-surface-900">{v2Form.personalInfo.studentId}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">ID Type</p><p className="mt-1 text-sm text-surface-900">{v2Form.personalInfo.idType}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">ID Number</p><p className="mt-1 text-sm text-surface-900">{v2Form.personalInfo.idNumber}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Gender</p><p className="mt-1 text-sm text-surface-900">{v2Form.personalInfo.gender}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Religion</p><p className="mt-1 text-sm text-surface-900">{v2Form.personalInfo.religion}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Nationality</p><p className="mt-1 text-sm text-surface-900">{v2Form.personalInfo.nationality}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Country</p><p className="mt-1 text-sm text-surface-900">{v2Form.personalInfo.countryCode ?? "-"}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Current Trimester</p><p className="mt-1 text-sm text-surface-900">{v2Form.personalInfo.currentTrimester}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Duration of Study</p><p className="mt-1 text-sm text-surface-900">{v2Form.personalInfo.studyDurationYears} years</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Mobile</p><p className="mt-1 text-sm text-surface-900">{v2Form.personalInfo.mobileNumber}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Email</p><p className="mt-1 text-sm text-surface-900">{v2Form.personalInfo.email}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200 sm:col-span-2"><p className="text-xs uppercase text-surface-500">Address</p><p className="mt-1 text-sm text-surface-900 whitespace-pre-wrap">{v2Form.personalInfo.address}</p></div>
                </div>
              </section>

              <section className="min-w-0 rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-sm ring-1 ring-surface-200/60">
                <h2 className="text-xl font-bold text-surface-900">Family Info</h2>
                <div className="mt-6 grid min-w-0 gap-4 sm:grid-cols-2 [&>*]:min-w-0 [&_p]:[overflow-wrap:anywhere]">
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200 space-y-1">
                    <p className="text-xs uppercase text-surface-500">Father / Guardian</p>
                    {v2Form.familyInfo.hasFatherGuardian === false ? (
                      <p className="text-sm text-surface-700">Not provided</p>
                    ) : (
                      <>
                        <p className="text-sm text-surface-900">{v2Form.familyInfo.fatherGuardian.name}</p>
                        <p className="text-xs text-surface-600">{v2Form.familyInfo.fatherGuardian.relationship} • {v2Form.familyInfo.fatherGuardian.identificationType}: {v2Form.familyInfo.fatherGuardian.identificationNumber}</p>
                        <p className="text-xs text-surface-600">Age {v2Form.familyInfo.fatherGuardian.age} • Salary MYR {v2Form.familyInfo.fatherGuardian.monthlySalary.toLocaleString()}</p>
                        <p className="text-xs text-surface-600">{v2Form.familyInfo.fatherGuardian.contactNo}</p>
                        <p className="text-xs text-surface-600 whitespace-pre-wrap">{v2Form.familyInfo.fatherGuardian.address}</p>
                      </>
                    )}
                  </div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200 space-y-1">
                    <p className="text-xs uppercase text-surface-500">Mother / Guardian</p>
                    {v2Form.familyInfo.hasMotherGuardian === false ? (
                      <p className="text-sm text-surface-700">Not provided</p>
                    ) : (
                      <>
                        <p className="text-sm text-surface-900">{v2Form.familyInfo.motherGuardian.name}</p>
                        <p className="text-xs text-surface-600">{v2Form.familyInfo.motherGuardian.relationship} • {v2Form.familyInfo.motherGuardian.identificationType}: {v2Form.familyInfo.motherGuardian.identificationNumber}</p>
                        <p className="text-xs text-surface-600">Age {v2Form.familyInfo.motherGuardian.age} • Salary MYR {v2Form.familyInfo.motherGuardian.monthlySalary.toLocaleString()}</p>
                        <p className="text-xs text-surface-600">{v2Form.familyInfo.motherGuardian.contactNo}</p>
                        <p className="text-xs text-surface-600 whitespace-pre-wrap">{v2Form.familyInfo.motherGuardian.address}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 [&>*]:min-w-0 [&_p]:[overflow-wrap:anywhere]">
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Above 18 Working</p><p className="mt-1 text-sm text-surface-900">{v2Form.familyInfo.siblings.above18Working.length}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Above 18 Non-Working</p><p className="mt-1 text-sm text-surface-900">{v2Form.familyInfo.siblings.above18NonWorking.length}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Studying in IPT</p><p className="mt-1 text-sm text-surface-900">{v2Form.familyInfo.siblings.studyInIpt.length}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Age 7-17</p><p className="mt-1 text-sm text-surface-900">{v2Form.familyInfo.siblings.age7to17.length}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Age 6 and Below</p><p className="mt-1 text-sm text-surface-900">{v2Form.familyInfo.siblings.age6Below.length}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Special Treatment Flags</p><p className="mt-1 text-sm text-surface-900">OKU: {v2Form.familyInfo.siblings.specialTreatment.hasOku ? "Yes" : "No"} • Chronic: {v2Form.familyInfo.siblings.specialTreatment.hasChronicIllness ? "Yes" : "No"}</p></div>
                </div>
              </section>

              <section className="min-w-0 rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-sm ring-1 ring-surface-200/60">
                <h2 className="text-xl font-bold text-surface-900">Financial Declaration</h2>
                <div className="mt-6 grid min-w-0 gap-4 sm:grid-cols-2 [&>*]:min-w-0 [&_p]:[overflow-wrap:anywhere]">
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Bank Name</p><p className="mt-1 text-sm text-surface-900">{v2Form.financialDeclaration.bankName}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Account Number</p><p className="mt-1 text-sm text-surface-900">{v2Form.financialDeclaration.accountNumber}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">Receiving Other Support</p><p className="mt-1 text-sm text-surface-900">{v2Form.financialDeclaration.receivingOtherSupport ? "Yes" : "No"}</p></div>
                  <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200"><p className="text-xs uppercase text-surface-500">MMU Outstanding Invoice</p><p className="mt-1 text-sm text-surface-900">MYR {v2Form.financialDeclaration.mmuOutstandingInvoiceAmount.toLocaleString()}</p></div>
                </div>
                {selectedSupportProviderNames.length > 0 ? (
                  <div className="mt-4 rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200">
                    <p className="text-xs uppercase text-surface-500">Support Providers</p>
                    <p className="mt-1 text-sm text-surface-900 break-all">{selectedSupportProviderNames.join(", ")}</p>
                  </div>
                ) : null}
              </section>
            </>
          ) : (
            <section className="rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-sm ring-1 ring-surface-200/60">
              <h2 className="text-xl font-bold text-surface-900">Legacy Application Form Data</h2>
              <pre className="mt-6 overflow-auto rounded-xl bg-surface-900 p-4 text-xs text-surface-200">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </section>
          )}

          <section className="rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-sm ring-1 ring-surface-200/60">
            <h2 className="text-xl font-bold text-surface-900">Documents</h2>
            {isV2 ? (
              attachmentsWithLinks.length === 0 ? (
                <p className="mt-6 rounded-xl bg-surface-50 p-4 text-sm text-surface-600 ring-1 ring-surface-200">
                  No V2 attachments were uploaded for this application.
                </p>
              ) : (
                <div className="mt-6 space-y-6">
                  {Object.entries(groupedAttachments).map(([group, files]) =>
                    files.length === 0 ? null : (
                      <div key={group} className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-surface-600">{group}</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {files.map((file) => (
                            <div key={file.id} className="rounded-xl bg-surface-50 p-5 ring-1 ring-surface-200">
                              <p className="font-semibold text-surface-900">{humanizeSlot(file.slot_key)}</p>
                              <p className="mt-1 text-sm text-surface-600 truncate" title={file.original_filename}>{file.original_filename}</p>
                              <p className="mt-2 text-xs text-surface-500">{file.mime_type} • {formatBytes(file.size_bytes)}</p>
                              <p className="mt-1 text-xs text-surface-500">Uploaded {new Date(file.uploaded_at).toLocaleString()}</p>
                              <p className="mt-2 text-xs text-surface-400 break-all">Slot: {file.slot_key}</p>
                              <div className="mt-4 flex gap-3">
                                {file.viewUrl ? <a href={file.viewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-xs font-semibold text-surface-700 ring-1 ring-surface-300 hover:bg-surface-100">View</a> : null}
                                {file.downloadUrl || file.viewUrl ? <a href={file.downloadUrl ?? file.viewUrl ?? undefined} target="_blank" rel="noreferrer" download={file.original_filename} className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-500">Download</a> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )
            ) : legacyDocumentsWithLinks.length === 0 ? (
              <p className="mt-6 rounded-xl bg-surface-50 p-4 text-sm text-surface-600 ring-1 ring-surface-200">No legacy documents were uploaded for this application.</p>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {legacyDocumentsWithLinks.map((doc) => (
                  <div key={doc.id} className="rounded-xl bg-surface-50 p-5 ring-1 ring-surface-200">
                    <p className="font-semibold text-surface-900">{formatDocType(doc.doc_type)}</p>
                    <p className="mt-1 text-sm text-surface-600 truncate" title={doc.original_filename}>{doc.original_filename}</p>
                    <p className="mt-2 text-xs text-surface-500">{doc.mime_type} • {formatBytes(doc.size_bytes)}</p>
                    <div className="mt-4 flex gap-3">
                      {doc.viewUrl ? <a href={doc.viewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-xs font-semibold text-surface-700 ring-1 ring-surface-300 hover:bg-surface-100">View</a> : null}
                      {doc.downloadUrl || doc.viewUrl ? <a href={doc.downloadUrl ?? doc.viewUrl ?? undefined} target="_blank" rel="noreferrer" download={doc.original_filename} className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-500">Download</a> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-sm ring-1 ring-surface-200/60">
            <h2 className="text-xl font-bold text-surface-900">Admin Notes</h2>
            {application.admin_notes ? (
              <p className="mt-6 whitespace-pre-wrap rounded-xl bg-surface-50 p-4 text-sm leading-relaxed text-surface-800 ring-1 ring-surface-200">
                {application.admin_notes}
              </p>
            ) : (
              <p className="mt-6 rounded-xl bg-surface-50 p-4 text-sm text-surface-600 ring-1 ring-surface-200">
                No admin notes yet.
              </p>
            )}
          </section>

          <section className="rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-sm ring-1 ring-surface-200/60">
            <h2 className="text-xl font-bold text-surface-900">Status History</h2>
            <div className="mt-6 space-y-4">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-start gap-4 rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                  <div>
                    <p className="text-sm font-medium text-surface-900">
                      {entry.from_status ?? "none"} <span className="text-surface-400 mx-1">→</span> {entry.to_status}
                    </p>
                    <p className="mt-1 text-xs text-surface-500">
                      {new Date(entry.changed_at).toLocaleString()}
                    </p>
                    {entry.reason && (
                      <p className="mt-2 text-sm text-surface-600 italic">"{entry.reason}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="min-w-0 space-y-8">
          <div className="min-w-0 lg:sticky lg:top-24">
            <AdminStatusControls
              applicationId={application.id}
              currentStatus={application.status}
              initialAdminNotes={application.admin_notes}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
