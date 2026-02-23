export const USER_ROLES = ["student", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "shortlisted",
  "rejected",
  "awarded",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const DOCUMENT_TYPES = ["transcript", "id_document", "essay"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const APPLICATION_OPTION_KINDS = [
  "campus",
  "faculty",
  "course",
  "support_provider",
] as const;
export type ApplicationOptionKind = (typeof APPLICATION_OPTION_KINDS)[number];

export const IDENTIFICATION_TYPES = ["mykad", "passport"] as const;
export type IdentificationType = (typeof IDENTIFICATION_TYPES)[number];

export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];

export const RELIGIONS = ["islam", "non_islam"] as const;
export type Religion = (typeof RELIGIONS)[number];

export const NATIONALITIES = ["malaysian", "non_malaysian"] as const;
export type Nationality = (typeof NATIONALITIES)[number];

export const FATHER_GUARDIAN_RELATIONSHIPS = ["father", "guardian"] as const;
export type FatherGuardianRelationship = (typeof FATHER_GUARDIAN_RELATIONSHIPS)[number];

export const MOTHER_GUARDIAN_RELATIONSHIPS = ["mother", "guardian"] as const;
export type MotherGuardianRelationship = (typeof MOTHER_GUARDIAN_RELATIONSHIPS)[number];

export const COURSE_LEVELS = [
  "Foundation",
  "Diploma",
  "Degree",
  "Masters",
  "PhD",
] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];

export const SIBLING_CATEGORIES = [
  "above18Working",
  "above18NonWorking",
  "studyInIpt",
  "age7to17",
  "age6Below",
] as const;
export type SiblingCategory = (typeof SIBLING_CATEGORIES)[number];

export const EMAIL_NOTIFICATION_STATUSES = ["queued", "sent", "failed"] as const;
export type EmailNotificationStatus = (typeof EMAIL_NOTIFICATION_STATUSES)[number];

export const STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ["submitted"],
  submitted: ["under_review"],
  under_review: ["shortlisted", "rejected"],
  shortlisted: ["awarded", "rejected"],
  rejected: [],
  awarded: [],
};

export const REOPENABLE_STATUSES: ApplicationStatus[] = [
  "submitted",
  "under_review",
  "shortlisted",
];

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_SCHOLARSHIP_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const DEFAULT_STUDENT_INSTITUTION = "MMU";
export const DEFAULT_SCHOLARSHIP_CURRENCY = "MYR";

export const MALAYSIAN_EDUCATION_LEVELS = [
  "Foundation / Matriculation / STPM",
  "Diploma (MQF Level 4)",
  "Bachelor's Degree (MQF Level 6)",
  "Master's Degree (MQF Level 7)",
  "Doctoral Degree (PhD, MQF Level 8)",
] as const;
export type MalaysianEducationLevel = (typeof MALAYSIAN_EDUCATION_LEVELS)[number];

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const ALLOWED_SCHOLARSHIP_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  awarded: "Awarded",
};
