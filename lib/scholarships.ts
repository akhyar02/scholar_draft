export const DEFAULT_SCHOLARSHIP_EDUCATION_LEVEL_LABEL = "All education levels";

export function formatScholarshipEducationLevel(educationLevel: string | null | undefined) {
  const normalized = educationLevel?.trim();
  return normalized || DEFAULT_SCHOLARSHIP_EDUCATION_LEVEL_LABEL;
}
