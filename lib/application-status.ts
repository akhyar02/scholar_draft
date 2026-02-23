import { ApplicationStatus, REOPENABLE_STATUSES, STATUS_TRANSITIONS } from "@/lib/constants";

export function isTransitionAllowed(from: ApplicationStatus, to: ApplicationStatus) {
  return STATUS_TRANSITIONS[from].includes(to);
}

export function canReopen(status: ApplicationStatus) {
  return REOPENABLE_STATUSES.includes(status);
}
