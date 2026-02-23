import { ApplicationStatus, STATUS_LABELS } from "@/lib/constants";

const classes: Record<ApplicationStatus, string> = {
  draft: "bg-surface-100 text-surface-700 ring-surface-200",
  submitted: "bg-info-50 text-info-700 ring-info-200",
  under_review: "bg-warning-50 text-warning-700 ring-warning-200",
  shortlisted: "bg-success-50 text-success-700 ring-success-200",
  rejected: "bg-danger-50 text-danger-700 ring-danger-200",
  awarded: "bg-accent-50 text-accent-700 ring-accent-200",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${classes[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
