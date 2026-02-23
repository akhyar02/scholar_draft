"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  ALLOWED_SCHOLARSHIP_IMAGE_MIME_TYPES,
  DEFAULT_SCHOLARSHIP_CURRENCY,
  MALAYSIAN_EDUCATION_LEVELS,
  MAX_SCHOLARSHIP_IMAGE_SIZE_BYTES,
} from "@/lib/constants";

export type AdminScholarshipFormValues = {
  title: string;
  description: string;
  imageKey: string;
  amount: string;
  currency: string;
  educationLevel: string;
  eligibilityText: string;
  deadlineAt: string;
  isPublished: boolean;
};

type AdminScholarshipFormProps = {
  mode?: "create" | "edit";
  scholarshipId?: string;
  initialValues?: Partial<AdminScholarshipFormValues>;
  initialImagePreviewUrl?: string | null;
};

const DEFAULT_FORM_VALUES: AdminScholarshipFormValues = {
  title: "",
  description: "",
  imageKey: "",
  amount: "",
  currency: DEFAULT_SCHOLARSHIP_CURRENCY,
  educationLevel: "Bachelor's Degree (MQF Level 6)",
  eligibilityText: "",
  deadlineAt: "",
  isPublished: false,
};

function isMalaysianEducationLevel(value: string) {
  return MALAYSIAN_EDUCATION_LEVELS.includes(
    value as (typeof MALAYSIAN_EDUCATION_LEVELS)[number],
  );
}

export function AdminScholarshipForm({
  mode = "create",
  scholarshipId,
  initialValues,
  initialImagePreviewUrl = null,
}: AdminScholarshipFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(initialImagePreviewUrl);
  const [error, setError] = useState<string | null>(null);
  const hasLegacyEducationLevel = Boolean(
    initialValues?.educationLevel && !isMalaysianEducationLevel(initialValues.educationLevel),
  );
  const startingEducationLevel =
    initialValues?.educationLevel && isMalaysianEducationLevel(initialValues.educationLevel)
      ? initialValues.educationLevel
      : hasLegacyEducationLevel
        ? ""
        : DEFAULT_FORM_VALUES.educationLevel;

  const [form, setForm] = useState<AdminScholarshipFormValues>({
    ...DEFAULT_FORM_VALUES,
    ...initialValues,
    currency: DEFAULT_SCHOLARSHIP_CURRENCY,
    educationLevel: startingEducationLevel,
  });

  async function uploadImage(file: File) {
    setUploadingImage(true);
    setError(null);

    try {
      if (
        !ALLOWED_SCHOLARSHIP_IMAGE_MIME_TYPES.includes(
          file.type as (typeof ALLOWED_SCHOLARSHIP_IMAGE_MIME_TYPES)[number],
        )
      ) {
        throw new Error("Unsupported image format. Use JPG, PNG, or WEBP.");
      }

      if (file.size > MAX_SCHOLARSHIP_IMAGE_SIZE_BYTES) {
        throw new Error("Image exceeds 5MB size limit.");
      }

      const uploadMetaResponse = await fetch("/api/admin/scholarships/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scholarshipId: isEdit ? scholarshipId : undefined,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });

      const uploadMeta = await uploadMetaResponse.json().catch(() => null);
      if (!uploadMetaResponse.ok) {
        throw new Error(uploadMeta?.error?.message ?? "Failed to prepare image upload");
      }

      const uploadResponse = await fetch(uploadMeta.uploadUrl, {
        method: "PUT",
        headers: uploadMeta.requiredHeaders,
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

      setForm((prev) => ({ ...prev, imageKey: uploadMeta.s3Key }));
      setImagePreviewUrl(uploadMeta.viewUrl ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEdit && !scholarshipId) {
        throw new Error("Scholarship ID is required");
      }

      const normalizedImageKey = form.imageKey.trim();
      const endpoint = isEdit ? `/api/admin/scholarships/${scholarshipId}` : "/api/admin/scholarships";
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          imageKey: isEdit ? (normalizedImageKey || null) : (normalizedImageKey || undefined),
          amount: Number(form.amount),
          deadlineAt: new Date(form.deadlineAt).toISOString(),
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.error?.message ?? (isEdit ? "Failed to update scholarship" : "Failed to create scholarship"),
        );
      }

      router.push("/admin/scholarships");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : isEdit ? "Failed to update scholarship" : "Failed to create scholarship",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-1">
        <label className="text-sm font-medium text-surface-700">Scholarship Title</label>
        <input
          className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all"
          placeholder="e.g. Global Excellence Scholarship"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-surface-700">Description</label>
        <textarea
          className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all"
          rows={5}
          placeholder="Provide a detailed description of the scholarship..."
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-surface-700">Scholarship Image (Optional)</label>
        <div className="rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-surface-600">
              Upload JPG, PNG, or WEBP (max 5MB).
            </p>
            {form.imageKey ? (
              <button
                type="button"
                onClick={() => {
                  setForm((prev) => ({ ...prev, imageKey: "" }));
                  setImagePreviewUrl(null);
                }}
                className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-surface-700 ring-1 ring-surface-300 hover:bg-surface-100"
              >
                Remove
              </button>
            ) : null}
          </div>
          {imagePreviewUrl ? (
            <img
              src={imagePreviewUrl}
              alt="Scholarship preview"
              className="mb-3 h-40 w-full rounded-lg object-cover ring-1 ring-surface-200"
            />
          ) : (
            <div className="mb-3 flex h-28 items-center justify-center rounded-lg border border-dashed border-surface-300 bg-white text-xs text-surface-500">
              No image uploaded
            </div>
          )}
          <input
            className="block w-full text-sm text-surface-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100 transition-all"
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            disabled={uploadingImage}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                uploadImage(file);
              }
            }}
          />
          {form.imageKey ? (
            <p className="mt-2 truncate text-xs text-surface-500">Stored key: {form.imageKey}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-surface-700">Amount</label>
          <input
            className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all"
            placeholder="e.g. 5000"
            type="number"
            value={form.amount}
            onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-surface-700">Currency</label>
          <input
            className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all"
            value={DEFAULT_SCHOLARSHIP_CURRENCY}
            readOnly
            disabled
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-surface-700">Education Level</label>
          <select
            className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all"
            value={form.educationLevel}
            onChange={(event) => setForm((prev) => ({ ...prev, educationLevel: event.target.value }))}
            required
          >
            <option value="">Select education level</option>
            {MALAYSIAN_EDUCATION_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          {hasLegacyEducationLevel ? (
            <p className="text-xs text-warning-700">
              Existing value is non-standard. Please choose a Malaysian MQF level before saving.
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-surface-700">Eligibility Criteria</label>
        <textarea
          className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all"
          rows={4}
          placeholder="List the requirements applicants must meet..."
          value={form.eligibilityText}
          onChange={(event) => setForm((prev) => ({ ...prev, eligibilityText: event.target.value }))}
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-surface-700">Application Deadline</label>
        <input
          className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all"
          type="datetime-local"
          value={form.deadlineAt}
          onChange={(event) => setForm((prev) => ({ ...prev, deadlineAt: event.target.value }))}
          required
        />
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-surface-50 p-4 ring-1 ring-surface-200">
        <input
          id="isPublished"
          type="checkbox"
          className="h-5 w-5 rounded border-surface-300 text-primary-600 focus:ring-primary-600"
          checked={form.isPublished}
          onChange={(event) => setForm((prev) => ({ ...prev, isPublished: event.target.checked }))}
        />
        <label htmlFor="isPublished" className="text-sm font-medium text-surface-700">
          {isEdit ? "Published" : "Publish immediately"}
        </label>
      </div>

      <div className="pt-4">
        <button
          className="w-full rounded-xl bg-primary-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50 transition-colors"
          disabled={loading || uploadingImage || deleteLoading}
          type="submit"
        >
          {loading
            ? isEdit
              ? "Updating Scholarship..."
              : "Creating Scholarship..."
            : uploadingImage
              ? "Uploading Image..."
              : isEdit
                ? "Save Changes"
                : "Create Scholarship"}
        </button>
      </div>

      {error ? (
        <div className="rounded-lg bg-danger-50 p-4 text-sm text-danger-700 ring-1 ring-danger-200">
          {error}
        </div>
      ) : null}
    </form>
  );
}
