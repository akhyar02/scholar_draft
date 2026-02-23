"use client";

import { ApplicationV2IntakeForm } from "@/components/application-v2-intake-form";

export function PublicApplicationForm({ scholarshipId }: { scholarshipId: string }) {
  return <ApplicationV2IntakeForm mode="public" scholarshipId={scholarshipId} />;
}
