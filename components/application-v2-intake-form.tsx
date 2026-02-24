"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getData as getCountryData } from "country-list";

import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  FATHER_GUARDIAN_RELATIONSHIPS,
  GENDERS,
  IDENTIFICATION_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  MOTHER_GUARDIAN_RELATIONSHIPS,
  NATIONALITIES,
  RELIGIONS,
  type ApplicationStatus,
} from "@/lib/constants";
import type {
  ApplicationOptionsTree,
  PublicSubmitApplicationRequest,
  StudentUpdateDraftRequest,
} from "@/lib/api/contracts";
import { publicApi } from "@/lib/api/services/public-client";
import { studentApi } from "@/lib/api/services/student-client";
import { createDefaultApplicationFormV2, isApplicationFormV2 } from "@/lib/application-v2";
import type { ApplicationFormPayloadV2, SiblingMemberPayload } from "@/lib/db/types";

type CampusOption = ApplicationOptionsTree["campuses"][number];
type SupportProviderOption = ApplicationOptionsTree["supportProviders"][number];
type DocumentMimeType = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

type UploadedAttachment = {
  slotKey: string;
  s3Key: string;
  fileName: string;
  mimeType: DocumentMimeType;
  sizeBytes: number;
};

type IntakeMode = "public" | "student";

const COUNTRIES = getCountryData().sort((a, b) => a.name.localeCompare(b.name));

type AttachmentLike = {
  slot_key?: string;
  slotKey?: string;
  fileName?: string;
  s3_key?: string;
  s3Key?: string;
  original_filename?: string;
  originalFilename?: string;
  mime_type?: string;
  mimeType?: string;
  size_bytes?: number;
  sizeBytes?: number;
};

function normalizeAttachment(raw: AttachmentLike): UploadedAttachment | null {
  const slotKey = raw.slotKey ?? raw.slot_key;
  const s3Key = raw.s3Key ?? raw.s3_key;
  const fileName = raw.fileName ?? raw.originalFilename ?? raw.original_filename;
  const mimeType = raw.mimeType ?? raw.mime_type;
  const sizeBytes = raw.sizeBytes ?? raw.size_bytes;

  if (
    !slotKey ||
    !s3Key ||
    !fileName ||
    !mimeType ||
    typeof sizeBytes !== "number" ||
    !ALLOWED_DOCUMENT_MIME_TYPES.includes(mimeType as DocumentMimeType)
  ) {
    return null;
  }

  return {
    slotKey,
    s3Key,
    fileName,
    mimeType: mimeType as DocumentMimeType,
    sizeBytes,
  };
}

function toSlotMap(items: UploadedAttachment[]) {
  return new Map(items.map((item) => [item.slotKey, item]));
}

function emptySiblingMember(withSalary = false): SiblingMemberPayload {
  return {
    memberId: crypto.randomUUID(),
    name: "",
    idNumber: "",
    ...(withSalary ? { monthlySalary: Number.NaN } : {}),
  };
}

function createEditableDefaultForm(params: {
  fullName: string;
  email: string;
  mobileNumber: string;
}) {
  const form = createDefaultApplicationFormV2(params);

  form.familyInfo.fatherGuardian.monthlySalary = Number.NaN;
  form.familyInfo.motherGuardian.monthlySalary = Number.NaN;
  form.financialDeclaration.mmuOutstandingInvoiceAmount = Number.NaN;

  return form;
}

function parseNumberInput(event: React.ChangeEvent<HTMLInputElement>) {
  if (event.target.value === "") {
    return Number.NaN;
  }

  return event.target.valueAsNumber;
}

function formatNumberInputValue(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : "";
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function UploadField({
  label,
  slotKey,
  attachment,
  onUpload,
  disabled,
  uploadingSlot,
}: {
  label: string;
  slotKey: string;
  attachment: UploadedAttachment | undefined;
  onUpload: (slotKey: string, file: File) => Promise<void>;
  disabled?: boolean;
  uploadingSlot: string | null;
}) {
  const isUploading = uploadingSlot === slotKey;

  return (
    <div className="rounded-lg bg-surface-50 p-3 ring-1 ring-surface-200">
      <p className="text-xs font-medium text-surface-700">{label}</p>
      {attachment ? (
        <p className="mt-1 text-xs text-surface-600" title={attachment.fileName}>
          {attachment.fileName} ({formatBytes(attachment.sizeBytes)})
        </p>
      ) : (
        <p className="mt-1 text-xs text-surface-500">No file uploaded</p>
      )}
      <label className="mt-2 inline-flex cursor-pointer rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 ring-1 ring-primary-200 hover:bg-primary-50">
        {isUploading ? "Uploading..." : attachment ? "Replace File" : "Upload File"}
        <input
          className="sr-only"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          disabled={disabled || isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void onUpload(slotKey, file);
            }
          }}
        />
      </label>
    </div>
  );
}

function SiblingGroup({
  title,
  category,
  items,
  withSalary,
  setItems,
  bySlot,
  onUpload,
  disabled,
  uploadingSlot,
}: {
  title: string;
  category: "above18Working" | "above18NonWorking" | "studyInIpt" | "age7to17" | "age6Below";
  items: SiblingMemberPayload[];
  withSalary: boolean;
  setItems: (next: SiblingMemberPayload[]) => void;
  bySlot: Map<string, UploadedAttachment>;
  onUpload: (slotKey: string, file: File) => Promise<void>;
  disabled: boolean;
  uploadingSlot: string | null;
}) {
  return (
    <div className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-surface-200">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-surface-900">{title}</h4>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setItems([...items, emptySiblingMember(withSalary)])}
          className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          Add Person
        </button>
      </div>
      <p className="text-xs text-surface-500">Count: {items.length}</p>
      <div className="space-y-3">
        {items.map((item, index) => {
          const icSlot = `siblings.${category}.${item.memberId}.icDoc`;
          const payslipSlot = `siblings.${category}.${item.memberId}.payslip`;

          return (
            <div key={item.memberId} className="space-y-3 rounded-lg bg-surface-50 p-3 ring-1 ring-surface-200">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-surface-700">Person #{index + 1}</p>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setItems(items.filter((row) => row.memberId !== item.memberId))}
                  className="text-xs font-semibold text-danger-700 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200"
                  placeholder="Name"
                  value={item.name}
                  disabled={disabled}
                  onChange={(event) => {
                    const next = [...items];
                    next[index] = { ...item, name: event.target.value };
                    setItems(next);
                  }}
                />
                <input
                  className="rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200"
                  placeholder="ID Number"
                  value={item.idNumber}
                  disabled={disabled}
                  onChange={(event) => {
                    const next = [...items];
                    next[index] = { ...item, idNumber: event.target.value };
                    setItems(next);
                  }}
                />
                {withSalary ? (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-surface-700">Monthly Salary (MYR)</label>
                    <input
                      className="w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200"
                      placeholder="Monthly Salary"
                      type="number"
                      min={0}
                      value={formatNumberInputValue(item.monthlySalary)}
                      disabled={disabled}
                      onChange={(event) => {
                        const next = [...items];
                        next[index] = { ...item, monthlySalary: parseNumberInput(event) };
                        setItems(next);
                      }}
                    />
                  </div>
                ) : null}
              </div>
              <div className={`grid gap-3 ${withSalary ? "md:grid-cols-2" : ""}`}>
                <UploadField
                  label="IC Document"
                  slotKey={icSlot}
                  attachment={bySlot.get(icSlot)}
                  onUpload={onUpload}
                  disabled={disabled}
                  uploadingSlot={uploadingSlot}
                />
                {withSalary ? (
                  <UploadField
                    label="Payslip"
                    slotKey={payslipSlot}
                    attachment={bySlot.get(payslipSlot)}
                    onUpload={onUpload}
                    disabled={disabled}
                    uploadingSlot={uploadingSlot}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ApplicationV2IntakeForm({
  mode,
  scholarshipId,
  applicationId,
  applicationStatus,
  scholarshipTitle,
  initialForm,
  initialAttachments,
}: {
  mode: IntakeMode;
  scholarshipId?: string;
  applicationId?: string;
  applicationStatus?: ApplicationStatus;
  scholarshipTitle?: string;
  initialForm?: unknown;
  initialAttachments?: AttachmentLike[];
}) {
  const router = useRouter();
  const isStudentDraft = mode === "student" && applicationStatus === "draft";
  const isEditable = mode === "public" || isStudentDraft;

  const [optionsLoading, setOptionsLoading] = useState(true);
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [supportProviders, setSupportProviders] = useState<SupportProviderOption[]>([]);

  const [form, setForm] = useState<ApplicationFormPayloadV2>(() => {
    if (isApplicationFormV2(initialForm)) {
      return initialForm;
    }

    return createEditableDefaultForm({
      fullName: "",
      email: "",
      mobileNumber: "",
    });
  });

  const [attachments, setAttachments] = useState<UploadedAttachment[]>(() =>
    (initialAttachments ?? []).map(normalizeAttachment).filter(Boolean) as UploadedAttachment[],
  );
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const bySlot = useMemo(() => toSlotMap(attachments), [attachments]);

  const selectedCampus = useMemo(
    () => campuses.find((item) => item.id === form.personalInfo.campusOptionId),
    [campuses, form.personalInfo.campusOptionId],
  );
  const facultyOptions = selectedCampus?.faculties ?? [];
  const selectedFaculty = facultyOptions.find((item) => item.id === form.personalInfo.facultyOptionId);
  const courseOptions = selectedFaculty?.courses ?? [];

  useEffect(() => {
    let mounted = true;

    async function loadOptions() {
      setOptionsLoading(true);

      try {
        const data = await publicApi.getApplicationOptions({ cache: "no-store" });

        if (mounted) {
          setCampuses(data.options.campuses);
          setSupportProviders(data.options.supportProviders);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load application options");
        }
      } finally {
        if (mounted) {
          setOptionsLoading(false);
        }
      }
    }

    loadOptions();

    return () => {
      mounted = false;
    };
  }, []);

  async function uploadAttachment(slotKey: string, file: File) {
    if (!isEditable) {
      return;
    }

    setUploadingSlot(slotKey);
    setError(null);
    setSuccess(null);

    try {
      if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number])) {
        throw new Error("Unsupported file type. Use PDF, JPG, or PNG.");
      }

      if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
        throw new Error("File exceeds 10MB size limit.");
      }
      const mimeType = file.type as DocumentMimeType;

      const uploadMeta = mode === "public"
        ? (() => {
            if (!scholarshipId) {
              throw new Error("Scholarship ID is required");
            }

            return publicApi.createApplicationUploadUrl({
              scholarshipId,
              slotKey,
              fileName: file.name,
              mimeType,
              sizeBytes: file.size,
            });
          })()
        : (() => {
            if (!applicationId) {
              throw new Error("Application ID is required");
            }

            return studentApi.createApplicationUploadUrl(applicationId, {
              slotKey,
              fileName: file.name,
              mimeType,
              sizeBytes: file.size,
            });
          })();
      const resolvedUploadMeta = await uploadMeta;

      const uploadResponse = await fetch(resolvedUploadMeta.uploadUrl, {
        method: "PUT",
        headers: resolvedUploadMeta.requiredHeaders,
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      if (mode === "student") {
        if (!applicationId) {
          throw new Error("Application ID is required");
        }

        await studentApi.confirmApplicationDocument(applicationId, {
          slotKey,
          s3Key: resolvedUploadMeta.s3Key,
          fileName: file.name,
          mimeType,
          sizeBytes: file.size,
        });
      }

      setAttachments((previous) => {
        const next = previous.filter((item) => item.slotKey !== slotKey);
        next.push({
          slotKey,
          s3Key: resolvedUploadMeta.s3Key,
          fileName: file.name,
          mimeType,
          sizeBytes: file.size,
        });
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attachment upload failed");
    } finally {
      setUploadingSlot(null);
    }
  }

  async function saveDraft() {
    if (mode !== "student" || !applicationId || !isStudentDraft) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await studentApi.updateApplicationDraft(applicationId, {
        payload: form,
      } as StudentUpdateDraftRequest);

      setSuccess("Draft saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSaving(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "public") {
        if (!scholarshipId) {
          throw new Error("Scholarship ID is required");
        }

        await publicApi.submitApplication({
          scholarshipId,
          form,
          attachments,
        } as PublicSubmitApplicationRequest);

        setSuccess("Application submitted successfully.");
        setForm(createEditableDefaultForm({ fullName: "", email: "", mobileNumber: "" }));
        setAttachments([]);
      } else {
        await saveDraft();

        if (!applicationId) {
          throw new Error("Application ID is required");
        }

        await studentApi.submitApplication(applicationId);

        setSuccess("Application submitted successfully.");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Application submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  const siblings = form.familyInfo.siblings;

  return (
    <form onSubmit={submit} className="space-y-6">
      {mode === "student" && scholarshipTitle ? (
        <div className="rounded-lg bg-white p-6 ring-1 ring-surface-200">
          <h2 className="text-2xl font-bold text-surface-900">{scholarshipTitle}</h2>
          <p className="mt-1 text-sm text-surface-500">Status: {applicationStatus}</p>
          {!isEditable ? (
            <p className="mt-2 text-sm text-warning-700">This application is locked and no longer editable.</p>
          ) : null}
        </div>
      ) : null}

      <section className="rounded-lg bg-white p-6 ring-1 ring-surface-200 space-y-4">
        <h3 className="text-lg font-semibold text-surface-900">1. Personal Info</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <input className="rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" placeholder="Full Name" value={form.personalInfo.fullName} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, fullName: event.target.value } }))} required />
          <input className="rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" placeholder="Student ID" value={form.personalInfo.studentId} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, studentId: event.target.value } }))} required />

          <select className="rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" value={form.personalInfo.campusOptionId} disabled={!isEditable || optionsLoading} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, campusOptionId: event.target.value, facultyOptionId: "", courseOptionId: "" } }))} required>
            <option value="">Select Campus</option>
            {campuses.map((campus) => (
              <option key={campus.id} value={campus.id}>{campus.label}</option>
            ))}
          </select>

          <select className="rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" value={form.personalInfo.facultyOptionId} disabled={!isEditable || optionsLoading || !selectedCampus} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, facultyOptionId: event.target.value, courseOptionId: "" } }))} required>
            <option value="">Select Faculty</option>
            {facultyOptions.map((faculty) => (
              <option key={faculty.id} value={faculty.id}>{faculty.label}</option>
            ))}
          </select>

          <select className="rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" value={form.personalInfo.courseOptionId} disabled={!isEditable || optionsLoading || !selectedFaculty} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, courseOptionId: event.target.value } }))} required>
            <option value="">Select Course Level</option>
            {courseOptions.map((course) => (
              <option key={course.id} value={course.id}>{course.label}</option>
            ))}
          </select>

          <select className="rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" value={form.personalInfo.idType} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, idType: event.target.value as "mykad" | "passport" } }))} required>
            {IDENTIFICATION_TYPES.map((type) => <option key={type} value={type}>{type.toUpperCase()}</option>)}
          </select>

          <input className="rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" placeholder="ID Number" value={form.personalInfo.idNumber} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, idNumber: event.target.value } }))} required />

          <input className="rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" placeholder="Current Trimester" value={form.personalInfo.currentTrimester} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, currentTrimester: event.target.value } }))} required />

          <div className="space-y-1">
            <label className="text-xs font-medium text-surface-700">Duration of Study (years)</label>
            <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" type="number" min={0.5} step="0.5" placeholder="Duration of Study (years)" value={formatNumberInputValue(form.personalInfo.studyDurationYears)} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, studyDurationYears: parseNumberInput(event) } }))} required />
          </div>

          <input className="rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" type="tel" placeholder="Mobile Number (+60123456789)" value={form.personalInfo.mobileNumber} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, mobileNumber: event.target.value } }))} required />

          <input className="rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" type="email" placeholder="Email" value={form.personalInfo.email} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, email: event.target.value } }))} required />

          <select className="rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" value={form.personalInfo.gender} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, gender: event.target.value as "male" | "female" } }))} required>
            {GENDERS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
          </select>

          <select className="rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" value={form.personalInfo.religion} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, religion: event.target.value as "islam" | "non_islam" } }))} required>
            {RELIGIONS.map((religion) => <option key={religion} value={religion}>{religion.replace("_", " ")}</option>)}
          </select>

          <select className="rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" value={form.personalInfo.nationality} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, nationality: event.target.value as "malaysian" | "non_malaysian", countryCode: event.target.value === "non_malaysian" ? prev.personalInfo.countryCode : null } }))} required>
            {NATIONALITIES.map((nationality) => <option key={nationality} value={nationality}>{nationality.replace("_", " ")}</option>)}
          </select>
        </div>

        {form.personalInfo.nationality === "non_malaysian" ? (
          <select className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" value={form.personalInfo.countryCode ?? ""} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, countryCode: event.target.value || null } }))} required>
            <option value="">Select Country</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>{country.name}</option>
            ))}
          </select>
        ) : null}

        <textarea className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" placeholder="Address" value={form.personalInfo.address} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, address: event.target.value } }))} rows={3} required />

        <div className="grid gap-3 md:grid-cols-2">
          <UploadField label="Student ID Image Proof" slotKey="personal.studentIdProof" attachment={bySlot.get("personal.studentIdProof")} onUpload={uploadAttachment} disabled={!isEditable} uploadingSlot={uploadingSlot} />
          <UploadField label="Latest Semester Result Transcript" slotKey="personal.latestTranscript" attachment={bySlot.get("personal.latestTranscript")} onUpload={uploadAttachment} disabled={!isEditable} uploadingSlot={uploadingSlot} />
        </div>
      </section>

      <section className="rounded-lg bg-white p-6 ring-1 ring-surface-200 space-y-4">
        <h3 className="text-lg font-semibold text-surface-900">2. Family Info</h3>

        <div className="space-y-3 rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200">
          <h4 className="text-sm font-semibold text-surface-900">Father / Guardian</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200" placeholder="Name" value={form.familyInfo.fatherGuardian.name} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, fatherGuardian: { ...prev.familyInfo.fatherGuardian, name: event.target.value } } }))} required />
            <select className="rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200" value={form.familyInfo.fatherGuardian.relationship} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, fatherGuardian: { ...prev.familyInfo.fatherGuardian, relationship: event.target.value as "father" | "guardian" } } }))} required>
              {FATHER_GUARDIAN_RELATIONSHIPS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200" value={form.familyInfo.fatherGuardian.identificationType} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, fatherGuardian: { ...prev.familyInfo.fatherGuardian, identificationType: event.target.value as "mykad" | "passport" } } }))} required>
              {IDENTIFICATION_TYPES.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
            </select>
            <input className="rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200" placeholder="Identification Number" value={form.familyInfo.fatherGuardian.identificationNumber} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, fatherGuardian: { ...prev.familyInfo.fatherGuardian, identificationNumber: event.target.value } } }))} required />
            <div className="space-y-1">
              <label className="text-xs font-medium text-surface-700">Age</label>
              <input className="w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200" type="number" min={18} placeholder="Age" value={formatNumberInputValue(form.familyInfo.fatherGuardian.age)} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, fatherGuardian: { ...prev.familyInfo.fatherGuardian, age: parseNumberInput(event) } } }))} required />
            </div>
            <input className="rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200" placeholder="Contact No" value={form.familyInfo.fatherGuardian.contactNo} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, fatherGuardian: { ...prev.familyInfo.fatherGuardian, contactNo: event.target.value } } }))} required />
            <div className="space-y-1">
              <label className="text-xs font-medium text-surface-700">Monthly Salary (MYR)</label>
              <input className="w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200" type="number" min={0} placeholder="Monthly Salary" value={formatNumberInputValue(form.familyInfo.fatherGuardian.monthlySalary)} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, fatherGuardian: { ...prev.familyInfo.fatherGuardian, monthlySalary: parseNumberInput(event) } } }))} required />
            </div>
          </div>
          <textarea className="w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200" placeholder="Address" value={form.familyInfo.fatherGuardian.address} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, fatherGuardian: { ...prev.familyInfo.fatherGuardian, address: event.target.value } } }))} rows={2} required />
          <UploadField label="Father/Guardian Payslip" slotKey="family.fatherGuardian.payslip" attachment={bySlot.get("family.fatherGuardian.payslip")} onUpload={uploadAttachment} disabled={!isEditable} uploadingSlot={uploadingSlot} />
        </div>

        <div className="space-y-3 rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200">
          <h4 className="text-sm font-semibold text-surface-900">Mother / Guardian</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200" placeholder="Name" value={form.familyInfo.motherGuardian.name} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, motherGuardian: { ...prev.familyInfo.motherGuardian, name: event.target.value } } }))} required />
            <select className="rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200" value={form.familyInfo.motherGuardian.relationship} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, motherGuardian: { ...prev.familyInfo.motherGuardian, relationship: event.target.value as "mother" | "guardian" } } }))} required>
              {MOTHER_GUARDIAN_RELATIONSHIPS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200" value={form.familyInfo.motherGuardian.identificationType} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, motherGuardian: { ...prev.familyInfo.motherGuardian, identificationType: event.target.value as "mykad" | "passport" } } }))} required>
              {IDENTIFICATION_TYPES.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
            </select>
            <input className="rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200" placeholder="Identification Number" value={form.familyInfo.motherGuardian.identificationNumber} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, motherGuardian: { ...prev.familyInfo.motherGuardian, identificationNumber: event.target.value } } }))} required />
            <div className="space-y-1">
              <label className="text-xs font-medium text-surface-700">Age</label>
              <input className="w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200" type="number" min={18} placeholder="Age" value={formatNumberInputValue(form.familyInfo.motherGuardian.age)} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, motherGuardian: { ...prev.familyInfo.motherGuardian, age: parseNumberInput(event) } } }))} required />
            </div>
            <input className="rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200" placeholder="Contact No" value={form.familyInfo.motherGuardian.contactNo} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, motherGuardian: { ...prev.familyInfo.motherGuardian, contactNo: event.target.value } } }))} required />
            <div className="space-y-1">
              <label className="text-xs font-medium text-surface-700">Monthly Salary (MYR)</label>
              <input className="w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200" type="number" min={0} placeholder="Monthly Salary" value={formatNumberInputValue(form.familyInfo.motherGuardian.monthlySalary)} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, motherGuardian: { ...prev.familyInfo.motherGuardian, monthlySalary: parseNumberInput(event) } } }))} required />
            </div>
          </div>
          <textarea className="w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-surface-200" placeholder="Address" value={form.familyInfo.motherGuardian.address} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, motherGuardian: { ...prev.familyInfo.motherGuardian, address: event.target.value } } }))} rows={2} required />
          <UploadField label="Mother/Guardian Payslip" slotKey="family.motherGuardian.payslip" attachment={bySlot.get("family.motherGuardian.payslip")} onUpload={uploadAttachment} disabled={!isEditable} uploadingSlot={uploadingSlot} />
        </div>
      </section>

      <section className="rounded-lg bg-white p-6 ring-1 ring-surface-200 space-y-4">
        <h3 className="text-lg font-semibold text-surface-900">3. Siblings</h3>

        <SiblingGroup
          title="Children above 18 (working)"
          category="above18Working"
          items={siblings.above18Working}
          withSalary
          setItems={(next) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, siblings: { ...prev.familyInfo.siblings, above18Working: next } } }))}
          bySlot={bySlot}
          onUpload={uploadAttachment}
          disabled={!isEditable}
          uploadingSlot={uploadingSlot}
        />

        <SiblingGroup
          title="Children above 18 (non-working)"
          category="above18NonWorking"
          items={siblings.above18NonWorking}
          withSalary={false}
          setItems={(next) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, siblings: { ...prev.familyInfo.siblings, above18NonWorking: next } } }))}
          bySlot={bySlot}
          onUpload={uploadAttachment}
          disabled={!isEditable}
          uploadingSlot={uploadingSlot}
        />

        <SiblingGroup
          title="Siblings studying in IPT"
          category="studyInIpt"
          items={siblings.studyInIpt}
          withSalary={false}
          setItems={(next) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, siblings: { ...prev.familyInfo.siblings, studyInIpt: next } } }))}
          bySlot={bySlot}
          onUpload={uploadAttachment}
          disabled={!isEditable}
          uploadingSlot={uploadingSlot}
        />

        <SiblingGroup
          title="Siblings age 7-17"
          category="age7to17"
          items={siblings.age7to17}
          withSalary={false}
          setItems={(next) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, siblings: { ...prev.familyInfo.siblings, age7to17: next } } }))}
          bySlot={bySlot}
          onUpload={uploadAttachment}
          disabled={!isEditable}
          uploadingSlot={uploadingSlot}
        />

        <SiblingGroup
          title="Siblings age 6 and below"
          category="age6Below"
          items={siblings.age6Below}
          withSalary={false}
          setItems={(next) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, siblings: { ...prev.familyInfo.siblings, age6Below: next } } }))}
          bySlot={bySlot}
          onUpload={uploadAttachment}
          disabled={!isEditable}
          uploadingSlot={uploadingSlot}
        />

        <div className="space-y-3 rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200">
          <h4 className="text-sm font-semibold text-surface-900">Special Family Treatment</h4>
          <label className="flex items-center gap-2 text-sm text-surface-700">
            <input
              type="checkbox"
              checked={siblings.specialTreatment.hasOku}
              disabled={!isEditable}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  familyInfo: {
                    ...prev.familyInfo,
                    siblings: {
                      ...prev.familyInfo.siblings,
                      specialTreatment: {
                        ...prev.familyInfo.siblings.specialTreatment,
                        hasOku: event.target.checked,
                      },
                    },
                  },
                }))
              }
            />
            Family has OKU member(s)
          </label>
          {siblings.specialTreatment.hasOku ? (
            <UploadField
              label="OKU Card"
              slotKey="siblings.specialTreatment.okuCard"
              attachment={bySlot.get("siblings.specialTreatment.okuCard")}
              onUpload={uploadAttachment}
              disabled={!isEditable}
              uploadingSlot={uploadingSlot}
            />
          ) : null}

          <label className="flex items-center gap-2 text-sm text-surface-700">
            <input
              type="checkbox"
              checked={siblings.specialTreatment.hasChronicIllness}
              disabled={!isEditable}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  familyInfo: {
                    ...prev.familyInfo,
                    siblings: {
                      ...prev.familyInfo.siblings,
                      specialTreatment: {
                        ...prev.familyInfo.siblings.specialTreatment,
                        hasChronicIllness: event.target.checked,
                      },
                    },
                  },
                }))
              }
            />
            Family has chronic illness treatment case(s)
          </label>
          {siblings.specialTreatment.hasChronicIllness ? (
            <UploadField
              label="Treatment Details (Hospital/Doctor)"
              slotKey="siblings.specialTreatment.chronicTreatment"
              attachment={bySlot.get("siblings.specialTreatment.chronicTreatment")}
              onUpload={uploadAttachment}
              disabled={!isEditable}
              uploadingSlot={uploadingSlot}
            />
          ) : null}
        </div>
      </section>

      <section className="rounded-lg bg-white p-6 ring-1 ring-surface-200 space-y-4">
        <h3 className="text-lg font-semibold text-surface-900">4. Financial Declaration</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <input className="rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" placeholder="Bank Name" value={form.financialDeclaration.bankName} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, financialDeclaration: { ...prev.financialDeclaration, bankName: event.target.value } }))} required />
          <input className="rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" placeholder="Account Number" value={form.financialDeclaration.accountNumber} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, financialDeclaration: { ...prev.financialDeclaration, accountNumber: event.target.value } }))} required />
          <div className="space-y-1">
            <label className="text-xs font-medium text-surface-700">Current MMU Finance Outstanding (MYR)</label>
            <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 ring-1 ring-surface-200" type="number" min={0} placeholder="Current MMU Finance Outstanding (MYR)" value={formatNumberInputValue(form.financialDeclaration.mmuOutstandingInvoiceAmount)} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, financialDeclaration: { ...prev.financialDeclaration, mmuOutstandingInvoiceAmount: parseNumberInput(event) } }))} required />
          </div>
        </div>

        <UploadField
          label="Attach Outstanding Invoice"
          slotKey="financial.mmuOutstandingInvoice"
          attachment={bySlot.get("financial.mmuOutstandingInvoice")}
          onUpload={uploadAttachment}
          disabled={!isEditable}
          uploadingSlot={uploadingSlot}
        />

        <label className="flex items-center gap-2 text-sm text-surface-700">
          <input
            type="checkbox"
            checked={form.financialDeclaration.receivingOtherSupport}
            disabled={!isEditable}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                financialDeclaration: {
                  ...prev.financialDeclaration,
                  receivingOtherSupport: event.target.checked,
                  supportProviderOptionIds: event.target.checked ? prev.financialDeclaration.supportProviderOptionIds : [],
                },
              }))
            }
          />
          Currently receiving scholarship/support
        </label>

        {form.financialDeclaration.receivingOtherSupport ? (
          <div className="space-y-3 rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200">
            <p className="text-sm font-semibold text-surface-800">Select support provider(s)</p>
            <div className="grid gap-2 md:grid-cols-2">
              {supportProviders.map((provider) => {
                const checked = form.financialDeclaration.supportProviderOptionIds.includes(provider.id);
                return (
                  <label key={provider.id} className="flex items-center gap-2 text-sm text-surface-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!isEditable}
                      onChange={(event) => {
                        setForm((prev) => {
                          const set = new Set(prev.financialDeclaration.supportProviderOptionIds);
                          if (event.target.checked) {
                            set.add(provider.id);
                          } else {
                            set.delete(provider.id);
                          }

                          return {
                            ...prev,
                            financialDeclaration: {
                              ...prev.financialDeclaration,
                              supportProviderOptionIds: [...set],
                            },
                          };
                        });
                      }}
                    />
                    {provider.label}
                  </label>
                );
              })}
            </div>

            <div className="space-y-2">
              {form.financialDeclaration.supportProviderOptionIds.map((providerId) => {
                const provider = supportProviders.find((item) => item.id === providerId);
                const slotKey = `financial.support.${providerId}.proof`;
                return (
                  <UploadField
                    key={providerId}
                    label={`Proof of Application - ${provider?.label ?? providerId}`}
                    slotKey={slotKey}
                    attachment={bySlot.get(slotKey)}
                    onUpload={uploadAttachment}
                    disabled={!isEditable}
                    uploadingSlot={uploadingSlot}
                  />
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-lg bg-danger-50 p-4 text-sm text-danger-700 ring-1 ring-danger-200">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-lg bg-success-50 p-4 text-sm text-success-700 ring-1 ring-success-200">
          {success}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {mode === "student" && isStudentDraft ? (
          <button
            type="button"
            onClick={() => void saveDraft()}
            disabled={!isEditable || saving || submitting || uploadingSlot !== null}
            className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-surface-700 ring-1 ring-surface-300 hover:bg-surface-50 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
        ) : null}

        {isEditable ? (
          <button
            type="submit"
            disabled={saving || submitting || uploadingSlot !== null}
            className="rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
