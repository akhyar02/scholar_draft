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
import { createDefaultApplicationFormV2, isApplicationFormV2, mergeApplicationFormV2 } from "@/lib/application-v2";
import { applicationFormV2Schema } from "@/lib/validation";
import type { ApplicationFormPayloadV2, SiblingMemberPayload } from "@/lib/application-types";

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

function formatErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "issues" in err && Array.isArray((err as { issues: unknown[] }).issues)) {
    const issues = (err as { issues: { path?: (string | number)[]; message?: string }[] }).issues;
    const messages = issues
      .map((issue) => {
        const field = issue.path?.length ? issue.path.join(" → ") : undefined;
        return field ? `${field}: ${issue.message}` : issue.message;
      })
      .filter(Boolean);
    return messages.length > 0 ? messages.join(". ") : fallback;
  }

  if (err instanceof Error) {
    // ZodError.message is a JSON string of the issues array — try to parse and format it
    try {
      const parsed = JSON.parse(err.message);
      if (Array.isArray(parsed)) {
        const messages = parsed
          .map((issue: { path?: (string | number)[]; message?: string }) => {
            const field = issue.path?.length ? issue.path.join(" → ") : undefined;
            return field ? `${field}: ${issue.message}` : issue.message;
          })
          .filter(Boolean);
        if (messages.length > 0) return messages.join(". ");
      }
    } catch {
      // Not JSON — use the message as-is
    }
    return err.message;
  }

  return fallback;
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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-danger-600">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3 shrink-0">
        <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-.75-4.75a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-1.5 0v3.5Zm.75-6.5a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  );
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
    <div className={`relative flex items-start gap-3 rounded-xl p-4 transition-colors overflow-hidden ${
      attachment
        ? "bg-success-50 ring-1 ring-success-200"
        : "bg-surface-50 ring-1 ring-surface-200 ring-dashed"
    }`}>
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
        attachment ? "bg-success-100" : "bg-white ring-1 ring-surface-200"
      }`}>
        {isUploading ? (
          <svg className="size-4 animate-spin text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : attachment ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-success-600">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-surface-400">
            <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-surface-700">{label}</p>
        {attachment ? (
          <p className="mt-0.5 truncate text-xs text-success-700" title={attachment.fileName}>
            {attachment.fileName}
            <span className="ml-1 text-success-500">({formatBytes(attachment.sizeBytes)})</span>
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-surface-400">PDF, JPG or PNG · max 10 MB</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          {attachment ? (
            <a
              href={`/api/public/view-file?key=${encodeURIComponent(attachment.s3Key)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold bg-primary-50 text-primary-700 ring-1 ring-primary-200 hover:bg-primary-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3">
                <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
                <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25h7.5a.75.75 0 0 0 0-1.5h-7.5A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25v-7.5a.75.75 0 0 0-1.5 0v7.5c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
              </svg>
              View
            </a>
          ) : null}
          <label className={`inline-flex cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
            disabled || isUploading
              ? "cursor-not-allowed opacity-50"
              : attachment
              ? "bg-white text-surface-700 ring-1 ring-surface-300 hover:bg-surface-50"
              : "bg-primary-600 text-white hover:bg-primary-500"
          }`}>
            {isUploading ? "Uploading…" : attachment ? "Replace" : "Choose File"}
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
      </div>
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
  fieldError,
  pathPrefix,
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
  fieldError: (path: string) => string | undefined;
  pathPrefix: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-surface-200 shadow-sm">
      <div className="flex items-center justify-between border-b border-surface-100 bg-surface-50 px-4 py-3">
        <div>
          <h4 className="text-sm font-semibold text-surface-900">{title}</h4>
          <p className="mt-0.5 text-xs text-surface-500">{items.length === 0 ? "None added" : `${items.length} ${items.length === 1 ? "person" : "people"}`}</p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setItems([...items, emptySiblingMember(withSalary)])}
          className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-500 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          Add Person
        </button>
      </div>
      <div className="space-y-3 p-4">
        {items.map((item, index) => {
          const icSlot = `siblings.${category}.${item.memberId}.icDoc`;
          const payslipSlot = `siblings.${category}.${item.memberId}.payslip`;

          return (
            <div key={item.memberId} className="overflow-hidden rounded-xl bg-surface-50 ring-1 ring-surface-200">
              <div className="flex items-center justify-between border-b border-surface-100 px-3 py-2">
                <p className="text-xs font-semibold text-surface-700">Person #{index + 1}</p>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setItems(items.filter((row) => row.memberId !== item.memberId))}
                  className="flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold text-danger-600 transition-colors hover:bg-danger-50 disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3">
                    <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                  </svg>
                  Remove
                </button>
              </div>
              <div className="space-y-3 p-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Full Name</label>
                  <input
                    className="w-full rounded-xl border-0 bg-white px-3 py-2 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:bg-surface-50"
                    placeholder="e.g. Ahmad bin Ali"
                    value={item.name}
                    disabled={disabled}
                    onChange={(event) => {
                      const next = [...items];
                      next[index] = { ...item, name: event.target.value };
                      setItems(next);
                    }}
                  />
                  <FieldError message={fieldError(`${pathPrefix}.${index}.name`)} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">ID Number</label>
                  <input
                    className="w-full rounded-xl border-0 bg-white px-3 py-2 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:bg-surface-50"
                    placeholder="IC / Passport No."
                    value={item.idNumber}
                    disabled={disabled}
                    onChange={(event) => {
                      const next = [...items];
                      next[index] = { ...item, idNumber: event.target.value };
                      setItems(next);
                    }}
                  />
                  <FieldError message={fieldError(`${pathPrefix}.${index}.idNumber`)} />
                </div>
                {withSalary ? (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Monthly Salary (MYR)</label>
                    <input
                      className="w-full rounded-xl border-0 bg-white px-3 py-2 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:bg-surface-50"
                      placeholder="e.g. 2000"
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
                    <FieldError message={fieldError(`${pathPrefix}.${index}.monthlySalary`)} />
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
      return mergeApplicationFormV2(
        createEditableDefaultForm({
          fullName: "",
          email: "",
          mobileNumber: "",
        }),
        initialForm,
      );
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

  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const validationErrors = useMemo(() => {
    const result = applicationFormV2Schema.safeParse(form);
    if (result.success) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const issue of result.error.issues) {
      const key = issue.path.join(".");
      if (!map.has(key)) map.set(key, issue.message);
    }
    return map;
  }, [form]);

  function markTouched(path: string) {
    setTouched((prev) => new Set([...prev, path]));
  }

  function fieldError(path: string): string | undefined {
    if (!submitted && !touched.has(path)) return undefined;
    return validationErrors.get(path);
  }

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
          setError(formatErrorMessage(err, "Failed to load application options"));
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
      setError(formatErrorMessage(err, "Attachment upload failed"));
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
      setError(formatErrorMessage(err, "Failed to save draft"));
    } finally {
      setSaving(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (validationErrors.size > 0) {
      setError("Please fix the validation errors before submitting.");
      return;
    }
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
        setTouched(new Set());
        setSubmitted(false);
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
      setError(formatErrorMessage(err, "Application submission failed"));
    } finally {
      setSubmitting(false);
    }
  }

  const siblings = form.familyInfo.siblings;
  const hasFatherGuardian = form.familyInfo.hasFatherGuardian !== false;
  const hasMotherGuardian = form.familyInfo.hasMotherGuardian !== false;

  function setGuardianAvailability(type: "father" | "mother", isAvailable: boolean) {
    setForm((prev) => ({
      ...prev,
      familyInfo: {
        ...prev.familyInfo,
        ...(type === "father"
          ? { hasFatherGuardian: isAvailable }
          : { hasMotherGuardian: isAvailable }),
      },
    }));
  }

  return (
    <form onSubmit={submit} className="application-form-shell space-y-6">
      {mode === "student" && scholarshipTitle ? (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-surface-200">
          <div className="h-1.5 bg-linear-to-r from-primary-500 to-primary-700" />
          <div className="px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">Scholarship Application</p>
            <h2 className="mt-1 text-2xl font-bold text-surface-900">{scholarshipTitle}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-medium capitalize text-surface-700">
                {applicationStatus}
              </span>
              {!isEditable ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-medium text-warning-700 ring-1 ring-warning-200">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3">
                    <path fillRule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                  </svg>
                  Locked – no longer editable
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-surface-200">
        <div className="border-b border-surface-100 bg-surface-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">1</span>
            <h3 className="text-base font-semibold text-surface-900">Personal Information</h3>
          </div>
        </div>
        <div className="space-y-5 p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Full Name</label>
            <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" placeholder="e.g. Ahmad bin Abdullah" value={form.personalInfo.fullName} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, fullName: event.target.value } }))} onBlur={() => markTouched("personalInfo.fullName")} required />
            <FieldError message={fieldError("personalInfo.fullName")} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Student ID</label>
            <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" placeholder="e.g. 1221234" value={form.personalInfo.studentId} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, studentId: event.target.value } }))} onBlur={() => markTouched("personalInfo.studentId")} required />
            <FieldError message={fieldError("personalInfo.studentId")} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Campus</label>
            <select className="ui-select w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" value={form.personalInfo.campusOptionId} disabled={!isEditable || optionsLoading} onChange={(event) => { setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, campusOptionId: event.target.value, facultyOptionId: "", courseOptionId: "" } })); markTouched("personalInfo.campusOptionId"); }} required>
              <option value="">Select Campus</option>
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.id}>{campus.label}</option>
              ))}
            </select>
            <FieldError message={fieldError("personalInfo.campusOptionId")} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Faculty</label>
            <select className="ui-select w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" value={form.personalInfo.facultyOptionId} disabled={!isEditable || optionsLoading || !selectedCampus} onChange={(event) => { setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, facultyOptionId: event.target.value, courseOptionId: "" } })); markTouched("personalInfo.facultyOptionId"); }} required>
              <option value="">Select Faculty</option>
              {facultyOptions.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>{faculty.label}</option>
              ))}
            </select>
            <FieldError message={fieldError("personalInfo.facultyOptionId")} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Course Level</label>
            <select className="ui-select w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" value={form.personalInfo.courseOptionId} disabled={!isEditable || optionsLoading || !selectedFaculty} onChange={(event) => { setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, courseOptionId: event.target.value } })); markTouched("personalInfo.courseOptionId"); }} required>
              <option value="">Select Course Level</option>
              {courseOptions.map((course) => (
                <option key={course.id} value={course.id}>{course.label}</option>
              ))}
            </select>
            <FieldError message={fieldError("personalInfo.courseOptionId")} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Identification Type</label>
            <select className="ui-select w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" value={form.personalInfo.idType} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, idType: event.target.value as "mykad" | "passport" } }))} required>
              {IDENTIFICATION_TYPES.map((type) => <option key={type} value={type}>{type.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Identification Number</label>
            <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" placeholder="e.g. 990101011234" value={form.personalInfo.idNumber} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, idNumber: event.target.value } }))} onBlur={() => markTouched("personalInfo.idNumber")} required />
            <FieldError message={fieldError("personalInfo.idNumber")} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Current Trimester</label>
            <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" placeholder="e.g. Trimester 3" value={form.personalInfo.currentTrimester} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, currentTrimester: event.target.value } }))} onBlur={() => markTouched("personalInfo.currentTrimester")} required />
            <FieldError message={fieldError("personalInfo.currentTrimester")} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Duration of Study (years)</label>
            <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" type="number" min={0.5} step="0.5" placeholder="e.g. 3" value={formatNumberInputValue(form.personalInfo.studyDurationYears)} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, studyDurationYears: parseNumberInput(event) } }))} onBlur={() => markTouched("personalInfo.studyDurationYears")} required />
            <FieldError message={fieldError("personalInfo.studyDurationYears")} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Mobile Number</label>
            <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" type="tel" placeholder="+60123456789" value={form.personalInfo.mobileNumber} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, mobileNumber: event.target.value } }))} onBlur={() => markTouched("personalInfo.mobileNumber")} required />
            <FieldError message={fieldError("personalInfo.mobileNumber")} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Email Address</label>
            <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" type="email" placeholder="student@mmu.edu.my" value={form.personalInfo.email} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, email: event.target.value } }))} onBlur={() => markTouched("personalInfo.email")} required />
            <FieldError message={fieldError("personalInfo.email")} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Gender</label>
            <select className="ui-select w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" value={form.personalInfo.gender} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, gender: event.target.value as "male" | "female" } }))} required>
              {GENDERS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Religion</label>
            <select className="ui-select w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" value={form.personalInfo.religion} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, religion: event.target.value as "islam" | "non_islam" } }))} required>
              {RELIGIONS.map((religion) => <option key={religion} value={religion}>{religion.replace("_", " ")}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Nationality</label>
            <select className="ui-select w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" value={form.personalInfo.nationality} disabled={!isEditable} onChange={(event) => { setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, nationality: event.target.value as "malaysian" | "non_malaysian", countryCode: event.target.value === "non_malaysian" ? prev.personalInfo.countryCode : null } })); markTouched("personalInfo.nationality"); }} required>
              {NATIONALITIES.map((nationality) => <option key={nationality} value={nationality}>{nationality.replace("_", " ")}</option>)}
            </select>
            <FieldError message={fieldError("personalInfo.nationality")} />
          </div>
        </div>

        {form.personalInfo.nationality === "non_malaysian" ? (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Country of Origin</label>
            <select className="ui-select w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" value={form.personalInfo.countryCode ?? ""} disabled={!isEditable} onChange={(event) => { setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, countryCode: event.target.value || null } })); markTouched("personalInfo.countryCode"); }} required>
              <option value="">Select Country</option>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>{country.name}</option>
              ))}
            </select>
            <FieldError message={fieldError("personalInfo.countryCode")} />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Home Address</label>
          <textarea className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" placeholder="Full mailing address" value={form.personalInfo.address} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, address: event.target.value } }))} onBlur={() => markTouched("personalInfo.address")} rows={3} required />
          <FieldError message={fieldError("personalInfo.address")} />
        </div>

        <div className="grid gap-3 md:grid-cols-2 min-w-0">
          <UploadField label="Student ID Image Proof" slotKey="personal.studentIdProof" attachment={bySlot.get("personal.studentIdProof")} onUpload={uploadAttachment} disabled={!isEditable} uploadingSlot={uploadingSlot} />
          <UploadField label="Latest Semester Result Transcript" slotKey="personal.latestTranscript" attachment={bySlot.get("personal.latestTranscript")} onUpload={uploadAttachment} disabled={!isEditable} uploadingSlot={uploadingSlot} />
        </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-surface-200">
        <div className="border-b border-surface-100 bg-surface-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">2</span>
            <h3 className="text-base font-semibold text-surface-900">Family Information</h3>
          </div>
        </div>
        <div className="space-y-5 p-6">
        <p className="rounded-xl bg-surface-50 px-4 py-3 text-sm text-surface-600 ring-1 ring-surface-200">
          Uncheck a guardian section if the applicant has no father/mother/guardian details to provide (for example single-parent or no-parent cases).
        </p>

        <div className="overflow-hidden rounded-xl ring-1 ring-surface-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-100 bg-surface-50 px-4 py-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-surface-900">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-surface-500">
                <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
              </svg>
              Father / Guardian
            </h4>
            <label className="ui-checkbox-pill inline-flex items-center gap-2 text-xs font-semibold text-surface-700">
              <input
                type="checkbox"
                className="ui-checkbox size-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                checked={hasFatherGuardian}
                disabled={!isEditable}
                onChange={(event) => setGuardianAvailability("father", event.target.checked)}
              />
              Include details
            </label>
          </div>
          <div className="space-y-4 p-4">
            {hasFatherGuardian ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Full Name</label>
                    <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" placeholder="Full name" value={form.familyInfo.fatherGuardian.name} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, fatherGuardian: { ...prev.familyInfo.fatherGuardian, name: event.target.value } } }))} onBlur={() => markTouched("familyInfo.fatherGuardian.name")} required />
                    <FieldError message={fieldError("familyInfo.fatherGuardian.name")} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Relationship</label>
                    <select className="ui-select w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" value={form.familyInfo.fatherGuardian.relationship} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, fatherGuardian: { ...prev.familyInfo.fatherGuardian, relationship: event.target.value as "father" | "guardian" } } }))} required>
                      {FATHER_GUARDIAN_RELATIONSHIPS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Identification Type</label>
                    <select className="ui-select w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" value={form.familyInfo.fatherGuardian.identificationType} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, fatherGuardian: { ...prev.familyInfo.fatherGuardian, identificationType: event.target.value as "mykad" | "passport" } } }))} required>
                      {IDENTIFICATION_TYPES.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Identification Number</label>
                    <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" placeholder="e.g. 650101011234" value={form.familyInfo.fatherGuardian.identificationNumber} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, fatherGuardian: { ...prev.familyInfo.fatherGuardian, identificationNumber: event.target.value } } }))} onBlur={() => markTouched("familyInfo.fatherGuardian.identificationNumber")} required />
                    <FieldError message={fieldError("familyInfo.fatherGuardian.identificationNumber")} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Age</label>
                    <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" type="number" min={18} placeholder="e.g. 50" value={formatNumberInputValue(form.familyInfo.fatherGuardian.age)} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, fatherGuardian: { ...prev.familyInfo.fatherGuardian, age: parseNumberInput(event) } } }))} onBlur={() => markTouched("familyInfo.fatherGuardian.age")} required />
                    <FieldError message={fieldError("familyInfo.fatherGuardian.age")} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Contact Number</label>
                    <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" placeholder="+60123456789" value={form.familyInfo.fatherGuardian.contactNo} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, fatherGuardian: { ...prev.familyInfo.fatherGuardian, contactNo: event.target.value } } }))} onBlur={() => markTouched("familyInfo.fatherGuardian.contactNo")} required />
                    <FieldError message={fieldError("familyInfo.fatherGuardian.contactNo")} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Monthly Salary (MYR)</label>
                    <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" type="number" min={0} placeholder="e.g. 3000" value={formatNumberInputValue(form.familyInfo.fatherGuardian.monthlySalary)} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, fatherGuardian: { ...prev.familyInfo.fatherGuardian, monthlySalary: parseNumberInput(event) } } }))} onBlur={() => markTouched("familyInfo.fatherGuardian.monthlySalary")} required />
                    <FieldError message={fieldError("familyInfo.fatherGuardian.monthlySalary")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Home Address</label>
                  <textarea className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" placeholder="Full home address" value={form.familyInfo.fatherGuardian.address} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, fatherGuardian: { ...prev.familyInfo.fatherGuardian, address: event.target.value } } }))} onBlur={() => markTouched("familyInfo.fatherGuardian.address")} rows={2} required />
                  <FieldError message={fieldError("familyInfo.fatherGuardian.address")} />
                </div>
                <UploadField label="Father/Guardian Payslip" slotKey="family.fatherGuardian.payslip" attachment={bySlot.get("family.fatherGuardian.payslip")} onUpload={uploadAttachment} disabled={!isEditable} uploadingSlot={uploadingSlot} />
              </>
            ) : (
              <p className="rounded-xl bg-surface-50 px-4 py-3 text-sm text-surface-600 ring-1 ring-surface-200">
                Father / guardian details are not available for this applicant.
              </p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl ring-1 ring-surface-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-100 bg-surface-50 px-4 py-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-surface-900">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-surface-500">
                <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
              </svg>
              Mother / Guardian
            </h4>
            <label className="ui-checkbox-pill inline-flex items-center gap-2 text-xs font-semibold text-surface-700">
              <input
                type="checkbox"
                className="ui-checkbox size-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                checked={hasMotherGuardian}
                disabled={!isEditable}
                onChange={(event) => setGuardianAvailability("mother", event.target.checked)}
              />
              Include details
            </label>
          </div>
          <div className="space-y-4 p-4">
            {hasMotherGuardian ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Full Name</label>
                    <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" placeholder="Full name" value={form.familyInfo.motherGuardian.name} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, motherGuardian: { ...prev.familyInfo.motherGuardian, name: event.target.value } } }))} onBlur={() => markTouched("familyInfo.motherGuardian.name")} required />
                    <FieldError message={fieldError("familyInfo.motherGuardian.name")} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Relationship</label>
                    <select className="ui-select w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" value={form.familyInfo.motherGuardian.relationship} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, motherGuardian: { ...prev.familyInfo.motherGuardian, relationship: event.target.value as "mother" | "guardian" } } }))} required>
                      {MOTHER_GUARDIAN_RELATIONSHIPS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Identification Type</label>
                    <select className="ui-select w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" value={form.familyInfo.motherGuardian.identificationType} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, motherGuardian: { ...prev.familyInfo.motherGuardian, identificationType: event.target.value as "mykad" | "passport" } } }))} required>
                      {IDENTIFICATION_TYPES.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Identification Number</label>
                    <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" placeholder="e.g. 700101011234" value={form.familyInfo.motherGuardian.identificationNumber} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, motherGuardian: { ...prev.familyInfo.motherGuardian, identificationNumber: event.target.value } } }))} onBlur={() => markTouched("familyInfo.motherGuardian.identificationNumber")} required />
                    <FieldError message={fieldError("familyInfo.motherGuardian.identificationNumber")} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Age</label>
                    <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" type="number" min={18} placeholder="e.g. 48" value={formatNumberInputValue(form.familyInfo.motherGuardian.age)} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, motherGuardian: { ...prev.familyInfo.motherGuardian, age: parseNumberInput(event) } } }))} onBlur={() => markTouched("familyInfo.motherGuardian.age")} required />
                    <FieldError message={fieldError("familyInfo.motherGuardian.age")} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Contact Number</label>
                    <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" placeholder="+60123456789" value={form.familyInfo.motherGuardian.contactNo} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, motherGuardian: { ...prev.familyInfo.motherGuardian, contactNo: event.target.value } } }))} onBlur={() => markTouched("familyInfo.motherGuardian.contactNo")} required />
                    <FieldError message={fieldError("familyInfo.motherGuardian.contactNo")} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Monthly Salary (MYR)</label>
                    <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" type="number" min={0} placeholder="e.g. 2500" value={formatNumberInputValue(form.familyInfo.motherGuardian.monthlySalary)} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, motherGuardian: { ...prev.familyInfo.motherGuardian, monthlySalary: parseNumberInput(event) } } }))} onBlur={() => markTouched("familyInfo.motherGuardian.monthlySalary")} required />
                    <FieldError message={fieldError("familyInfo.motherGuardian.monthlySalary")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Home Address</label>
                  <textarea className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" placeholder="Full home address" value={form.familyInfo.motherGuardian.address} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, familyInfo: { ...prev.familyInfo, motherGuardian: { ...prev.familyInfo.motherGuardian, address: event.target.value } } }))} onBlur={() => markTouched("familyInfo.motherGuardian.address")} rows={2} required />
                  <FieldError message={fieldError("familyInfo.motherGuardian.address")} />
                </div>
                <UploadField label="Mother/Guardian Payslip" slotKey="family.motherGuardian.payslip" attachment={bySlot.get("family.motherGuardian.payslip")} onUpload={uploadAttachment} disabled={!isEditable} uploadingSlot={uploadingSlot} />
              </>
            ) : (
              <p className="rounded-xl bg-surface-50 px-4 py-3 text-sm text-surface-600 ring-1 ring-surface-200">
                Mother / guardian details are not available for this applicant.
              </p>
            )}
          </div>
        </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-surface-200">
        <div className="border-b border-surface-100 bg-surface-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">3</span>
            <h3 className="text-base font-semibold text-surface-900">Siblings &amp; Dependants</h3>
          </div>
        </div>
        <div className="space-y-4 p-6">
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
          fieldError={fieldError}
          pathPrefix="familyInfo.siblings.above18Working"
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
          fieldError={fieldError}
          pathPrefix="familyInfo.siblings.above18NonWorking"
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
          fieldError={fieldError}
          pathPrefix="familyInfo.siblings.studyInIpt"
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
          fieldError={fieldError}
          pathPrefix="familyInfo.siblings.age7to17"
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
          fieldError={fieldError}
          pathPrefix="familyInfo.siblings.age6Below"
        />

        <div className="overflow-hidden rounded-xl ring-1 ring-surface-200">
          <div className="border-b border-surface-100 bg-surface-50 px-4 py-3">
            <h4 className="text-sm font-semibold text-surface-900">Special Family Circumstances</h4>
            <p className="mt-0.5 text-xs text-surface-500">Select any that apply to your household</p>
          </div>
          <div className="divide-y divide-surface-100">
            <div className="space-y-3 p-4">
            <label className="ui-checkbox-row p-1 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="ui-checkbox mt-0.5 size-4 rounded accent-primary-600"
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
              <div>
                <p className="text-sm font-medium text-surface-900">OKU Member(s)</p>
                <p className="text-xs text-surface-500">Family has a registered OKU (Orang Kurang Upaya) member</p>
              </div>
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
            </div>
            <div className="space-y-3 p-4">
            <label className="ui-checkbox-row flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="ui-checkbox mt-0.5 size-4 rounded accent-primary-600"
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
              <div>
                <p className="text-sm font-medium text-surface-900">Chronic Illness Treatment</p>
                <p className="text-xs text-surface-500">Family has ongoing chronic illness treatment cases</p>
              </div>
            </label>
            {siblings.specialTreatment.hasChronicIllness ? (
              <UploadField
                label="Treatment Details (Hospital / Doctor)"
                slotKey="siblings.specialTreatment.chronicTreatment"
                attachment={bySlot.get("siblings.specialTreatment.chronicTreatment")}
                onUpload={uploadAttachment}
                disabled={!isEditable}
                uploadingSlot={uploadingSlot}
              />
            ) : null}
            </div>
          </div>
        </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-surface-200">
        <div className="border-b border-surface-100 bg-surface-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">4</span>
            <h3 className="text-base font-semibold text-surface-900">Financial Declaration</h3>
          </div>
        </div>
        <div className="space-y-5 p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Bank Name</label>
            <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" placeholder="e.g. Maybank" value={form.financialDeclaration.bankName} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, financialDeclaration: { ...prev.financialDeclaration, bankName: event.target.value } }))} onBlur={() => markTouched("financialDeclaration.bankName")} required />
            <FieldError message={fieldError("financialDeclaration.bankName")} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Account Number</label>
            <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" placeholder="e.g. 1234567890" value={form.financialDeclaration.accountNumber} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, financialDeclaration: { ...prev.financialDeclaration, accountNumber: event.target.value } }))} onBlur={() => markTouched("financialDeclaration.accountNumber")} required />
            <FieldError message={fieldError("financialDeclaration.accountNumber")} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-surface-500">Current MMU Finance Outstanding (MYR)</label>
            <input className="w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400" type="number" min={0} placeholder="e.g. 1200.00" value={formatNumberInputValue(form.financialDeclaration.mmuOutstandingInvoiceAmount)} disabled={!isEditable} onChange={(event) => setForm((prev) => ({ ...prev, financialDeclaration: { ...prev.financialDeclaration, mmuOutstandingInvoiceAmount: parseNumberInput(event) } }))} onBlur={() => markTouched("financialDeclaration.mmuOutstandingInvoiceAmount")} required />
            <FieldError message={fieldError("financialDeclaration.mmuOutstandingInvoiceAmount")} />
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

        <label className="ui-checkbox-row flex cursor-pointer items-center gap-3 rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200 transition-colors hover:bg-primary-50 hover:ring-primary-200">
          <input
            type="checkbox"
            className="ui-checkbox size-4 rounded accent-primary-600"
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
          <div>
            <p className="text-sm font-medium text-surface-900">Currently Receiving Scholarship / Financial Support</p>
            <p className="text-xs text-surface-500">Tick if you are already receiving another scholarship or financial aid</p>
          </div>
        </label>

        {form.financialDeclaration.receivingOtherSupport ? (
          <div className="overflow-hidden rounded-xl ring-1 ring-surface-200">
            <div className="border-b border-surface-100 bg-surface-50 px-4 py-3">
              <p className="text-sm font-semibold text-surface-800">Select support provider(s)</p>
            </div>
            <div className="p-4 space-y-4">
            <div className="grid gap-2 md:grid-cols-2">
              {supportProviders.map((provider) => {
                const checked = form.financialDeclaration.supportProviderOptionIds.includes(provider.id);
                return (
                  <label key={provider.id} className="ui-checkbox-row flex cursor-pointer items-center gap-2.5 rounded-xl p-2.5 text-sm transition-colors hover:bg-surface-50">
                    <input
                      type="checkbox"
                      className="ui-checkbox size-4 rounded accent-primary-600"
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
                    <span className="font-medium text-surface-800">{provider.label}</span>
                  </label>
                );
              })}
            </div>
            <FieldError message={fieldError("financialDeclaration.supportProviderOptionIds")} />

            <div className="space-y-2">
              {form.financialDeclaration.supportProviderOptionIds.map((providerId) => {
                const provider = supportProviders.find((item) => item.id === providerId);
                const slotKey = `financial.support.${providerId}.proof`;
                return (
                  <UploadField
                    key={providerId}
                    label={`Proof of Application – ${provider?.label ?? providerId}`}
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
          </div>
        ) : null}
        </div>
      </section>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl bg-danger-50 p-4 ring-1 ring-danger-200">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 size-5 shrink-0 text-danger-500">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium text-danger-700">{error}</p>
        </div>
      ) : null}
      {success ? (
        <div className="flex items-start gap-3 rounded-2xl bg-success-50 p-4 ring-1 ring-success-200">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 size-5 shrink-0 text-success-500">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium text-success-700">{success}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-50 p-4 ring-1 ring-surface-200">
        {mode === "student" && isStudentDraft ? (
          <button
            type="button"
            onClick={() => void saveDraft()}
            disabled={!isEditable || saving || submitting || uploadingSlot !== null}
            className="flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-surface-700 shadow-sm ring-1 ring-surface-300 transition-colors hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <svg className="size-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4">
                  <path d="M2.5 3.5A1.5 1.5 0 0 1 4 2h5.379a1.5 1.5 0 0 1 1.06.44l2.122 2.12A1.5 1.5 0 0 1 13 5.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 12.5v-1h-.5V3.5ZM4 3.5v9h7v-7.05L8.95 3.5H4Zm2 0v1.5h1.5V3.5H6Z" />
                </svg>
                Save Draft
              </>
            )}
          </button>
        ) : null}

        {isEditable ? (
          <button
            type="submit"
            disabled={saving || submitting || uploadingSlot !== null}
            className="flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <svg className="size-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting…
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4">
                  <path d="M2.87 2.298a.75.75 0 0 0-.812.162l-.082.083a.75.75 0 0 0 .162.812L5.87 6H5a3 3 0 0 0-3 3v2.25a.75.75 0 0 0 1.5 0V9a1.5 1.5 0 0 1 1.5-1.5h.872l-3.73 2.645a.75.75 0 0 0 .975 1.138l10-7.09a.75.75 0 0 0-.115-1.294l-10-2.6Z" />
                </svg>
                Submit Application
              </>
            )}
          </button>
        ) : null}
      </div>
    </form>
  );
}
