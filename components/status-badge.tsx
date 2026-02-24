import { ApplicationStatus, STATUS_LABELS } from "@/lib/constants";

const dotColors: Record<ApplicationStatus, string> = {
  draft: "bg-surface-400",
  submitted: "bg-info-500",
  under_review: "bg-warning-500 animate-pulse",
  shortlisted: "bg-success-500",
  rejected: "bg-danger-500",
  awarded: "bg-accent-500",
};

const classes: Record<ApplicationStatus, string> = {
  draft: "bg-surface-50 text-surface-700 ring-surface-200/60",
  submitted: "bg-info-50 text-info-700 ring-info-200/60",
  under_review: "bg-warning-50 text-warning-700 ring-warning-200/60",
  shortlisted: "bg-success-50 text-success-700 ring-success-200/60",
  rejected: "bg-danger-50 text-danger-700 ring-danger-200/60",
  awarded: "bg-accent-50 text-accent-700 ring-accent-200/60",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${classes[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColors[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}
