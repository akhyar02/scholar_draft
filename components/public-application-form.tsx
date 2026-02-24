"use client";

import { ApplicationV2IntakeForm } from "@/components/application-v2-intake-form";

export function PublicApplicationForm({
  scholarshipId,
  initialForm,
  initialAttachments,
}: {
  scholarshipId: string;
  initialForm?: unknown;
  initialAttachments?: { slot_key: string; s3_key: string; original_filename: string; mime_type: string; size_bytes: number }[];
}) {
  return (
    <ApplicationV2IntakeForm
      mode="public"
      scholarshipId={scholarshipId}
      initialForm={initialForm}
      initialAttachments={initialAttachments}
    />
  );
}
