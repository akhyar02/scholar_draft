"use client";

import type { ApplicationStatus } from "@/lib/constants";

import { ApplicationV2IntakeForm } from "@/components/application-v2-intake-form";

export function StudentApplicationEditor({
  application,
  initialForm,
  initialAttachments,
}: {
  application: {
    id: string;
    status: ApplicationStatus;
    scholarship_title: string;
  };
  initialForm: unknown;
  initialAttachments: Array<{
    slot_key: string;
    s3_key: string;
    original_filename: string;
    mime_type: string;
    size_bytes: number;
  }>;
}) {
  return (
    <ApplicationV2IntakeForm
      mode="student"
      applicationId={application.id}
      applicationStatus={application.status}
      scholarshipTitle={application.scholarship_title}
      initialForm={initialForm}
      initialAttachments={initialAttachments}
    />
  );
}
