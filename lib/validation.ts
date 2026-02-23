import { z } from "zod";

import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  ALLOWED_SCHOLARSHIP_IMAGE_MIME_TYPES,
  APPLICATION_STATUSES,
  DEFAULT_SCHOLARSHIP_CURRENCY,
  FATHER_GUARDIAN_RELATIONSHIPS,
  GENDERS,
  IDENTIFICATION_TYPES,
  MALAYSIAN_EDUCATION_LEVELS,
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_SCHOLARSHIP_IMAGE_SIZE_BYTES,
  MOTHER_GUARDIAN_RELATIONSHIPS,
  NATIONALITIES,
  RELIGIONS,
  USER_ROLES,
} from "@/lib/constants";

export const userRoleSchema = z.enum(USER_ROLES);
export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);

export const scholarshipBaseSchema = z.object({
  title: z.string().min(4).max(200),
  description: z.string().min(10),
  imageKey: z.string().min(5).max(2048).nullish(),
  amount: z.number().positive(),
  currency: z.literal(DEFAULT_SCHOLARSHIP_CURRENCY),
  educationLevel: z.enum(MALAYSIAN_EDUCATION_LEVELS),
  eligibilityText: z.string().min(10),
  deadlineAt: z.string().datetime(),
  isPublished: z.boolean().default(false),
  slug: z
    .string()
    .min(3)
    .max(220)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

export const scholarshipCreateSchema = scholarshipBaseSchema;
export const scholarshipPatchSchema = scholarshipBaseSchema.partial();

export const scholarshipImageUploadSchema = z.object({
  scholarshipId: z.string().uuid().optional(),
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_SCHOLARSHIP_IMAGE_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_SCHOLARSHIP_IMAGE_SIZE_BYTES),
});

const CURRENT_YEAR = new Date().getUTCFullYear();
const MINIMUM_AGE = 15;
const INTERNATIONAL_PHONE_REGEX = /^\+[1-9]\d{6,14}$/;
const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;
const MEMBER_SLOT_ID_REGEX = /^[0-9a-fA-F-]{8,}$/;

function normalizePhoneNumber(value: string) {
  return value.trim().replace(/[()\s-]/g, "");
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

const dateOfBirthSchema = z
  .string()
  .refine((value) => Boolean(parseIsoDate(value)), {
    message: "Date of birth must be in YYYY-MM-DD format",
  })
  .refine((value) => {
    const dob = parseIsoDate(value);
    if (!dob) {
      return false;
    }

    const today = new Date();
    const minimumAllowed = new Date(
      Date.UTC(today.getUTCFullYear() - MINIMUM_AGE, today.getUTCMonth(), today.getUTCDate()),
    );

    return dob <= minimumAllowed;
  }, `Applicant must be at least ${MINIMUM_AGE} years old`);

const siblingMemberBaseSchema = z.object({
  memberId: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  idNumber: z.string().trim().min(3).max(60),
});

const siblingWorkingMemberSchema = siblingMemberBaseSchema.extend({
  monthlySalary: z.number().min(0).max(10_000_000),
});

const parentGuardianBaseSchema = z.object({
  name: z.string().trim().min(2).max(200),
  identificationType: z.enum(IDENTIFICATION_TYPES),
  identificationNumber: z.string().trim().min(3).max(60),
  age: z.number().int().min(18).max(120),
  address: z.string().trim().min(5).max(1000),
  contactNo: z
    .string()
    .transform((value) => normalizePhoneNumber(value))
    .refine((value) => INTERNATIONAL_PHONE_REGEX.test(value), {
      message: "Contact number must be in international format (e.g. +60123456789)",
    }),
  monthlySalary: z.number().min(0).max(10_000_000),
});

const fatherGuardianSchema = parentGuardianBaseSchema.extend({
  relationship: z.enum(FATHER_GUARDIAN_RELATIONSHIPS),
});

const motherGuardianSchema = parentGuardianBaseSchema.extend({
  relationship: z.enum(MOTHER_GUARDIAN_RELATIONSHIPS),
});

const personalInfoSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    studentId: z.string().trim().min(3).max(60),
    campusOptionId: z.string().uuid(),
    idType: z.enum(IDENTIFICATION_TYPES),
    idNumber: z.string().trim().min(3).max(60),
    address: z.string().trim().min(5).max(1000),
    gender: z.enum(GENDERS),
    religion: z.enum(RELIGIONS),
    nationality: z.enum(NATIONALITIES),
    countryCode: z.string().regex(COUNTRY_CODE_REGEX).nullable(),
    facultyOptionId: z.string().uuid(),
    courseOptionId: z.string().uuid(),
    currentTrimester: z.string().trim().min(1).max(30),
    studyDurationYears: z.number().min(0.5).max(20),
    mobileNumber: z
      .string()
      .transform((value) => normalizePhoneNumber(value))
      .refine((value) => INTERNATIONAL_PHONE_REGEX.test(value), {
        message: "Phone number must be in international format (e.g. +60123456789)",
      }),
    email: z.string().email().toLowerCase(),
  })
  .superRefine((value, ctx) => {
    if (value.nationality === "non_malaysian" && !value.countryCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["countryCode"],
        message: "Country is required for non-Malaysian applicants",
      });
    }

    if (value.nationality === "malaysian" && value.countryCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["countryCode"],
        message: "Country must be empty for Malaysian applicants",
      });
    }
  });

const familyInfoSchema = z.object({
  fatherGuardian: fatherGuardianSchema,
  motherGuardian: motherGuardianSchema,
  siblings: z.object({
    above18Working: z.array(siblingWorkingMemberSchema),
    above18NonWorking: z.array(siblingMemberBaseSchema),
    studyInIpt: z.array(siblingMemberBaseSchema),
    age7to17: z.array(siblingMemberBaseSchema),
    age6Below: z.array(siblingMemberBaseSchema),
    specialTreatment: z.object({
      hasOku: z.boolean(),
      hasChronicIllness: z.boolean(),
    }),
  }),
});

const financialDeclarationSchema = z
  .object({
    bankName: z.string().trim().min(2).max(120),
    accountNumber: z.string().trim().min(4).max(60),
    receivingOtherSupport: z.boolean(),
    supportProviderOptionIds: z.array(z.string().uuid()),
    mmuOutstandingInvoiceAmount: z.number().min(0).max(10_000_000),
  })
  .superRefine((value, ctx) => {
    if (value.receivingOtherSupport && value.supportProviderOptionIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supportProviderOptionIds"],
        message: "Select at least one support provider",
      });
    }

    if (!value.receivingOtherSupport && value.supportProviderOptionIds.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supportProviderOptionIds"],
        message: "Support provider list must be empty when not receiving support",
      });
    }
  });

export const applicationFormV2Schema = z.object({
  schemaVersion: z.literal(2),
  personalInfo: personalInfoSchema,
  familyInfo: familyInfoSchema,
  financialDeclaration: financialDeclarationSchema,
});

const updateFamilyInfoSchema = z.object({
  fatherGuardian: fatherGuardianSchema.partial().optional(),
  motherGuardian: motherGuardianSchema.partial().optional(),
  siblings: z
    .object({
      above18Working: z.array(siblingWorkingMemberSchema).optional(),
      above18NonWorking: z.array(siblingMemberBaseSchema).optional(),
      studyInIpt: z.array(siblingMemberBaseSchema).optional(),
      age7to17: z.array(siblingMemberBaseSchema).optional(),
      age6Below: z.array(siblingMemberBaseSchema).optional(),
      specialTreatment: z
        .object({
          hasOku: z.boolean().optional(),
          hasChronicIllness: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

const updateFinancialDeclarationSchema = z.object({
  bankName: z.string().trim().min(2).max(120).optional(),
  accountNumber: z.string().trim().min(4).max(60).optional(),
  receivingOtherSupport: z.boolean().optional(),
  supportProviderOptionIds: z.array(z.string().uuid()).optional(),
  mmuOutstandingInvoiceAmount: z.number().min(0).max(10_000_000).optional(),
});

export const updateDraftV2Schema = z.object({
  payload: z.object({
    schemaVersion: z.literal(2).optional(),
    personalInfo: personalInfoSchema.partial().optional(),
    familyInfo: updateFamilyInfoSchema.optional(),
    financialDeclaration: updateFinancialDeclarationSchema.optional(),
  }),
});

const slotKeyPattern =
  /^(?:personal\.(?:studentIdProof|latestTranscript)|family\.(?:fatherGuardian|motherGuardian)\.payslip|siblings\.(?:above18Working|above18NonWorking|studyInIpt|age7to17|age6Below)\.[0-9a-fA-F-]{8,}\.(?:icDoc|payslip)|siblings\.specialTreatment\.(?:okuCard|chronicTreatment)|financial\.support\.[0-9a-fA-F-]{8,}\.proof|financial\.mmuOutstandingInvoice)$/;

export const slotKeySchema = z.string().min(8).max(220).regex(slotKeyPattern, {
  message: "Invalid attachment slot key",
});

export const uploadUrlV2Schema = z.object({
  slotKey: slotKeySchema,
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_DOCUMENT_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_DOCUMENT_SIZE_BYTES),
});

export const publicUploadUrlV2Schema = uploadUrlV2Schema.extend({
  scholarshipId: z.string().uuid(),
});

export const confirmAttachmentSchema = z.object({
  slotKey: slotKeySchema,
  s3Key: z.string().min(5).max(1024),
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_DOCUMENT_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_DOCUMENT_SIZE_BYTES),
});

export const publicApplicationSubmitSchema = z.object({
  scholarshipId: z.string().uuid(),
  form: applicationFormV2Schema,
  attachments: z.array(confirmAttachmentSchema).min(1),
});

const optionNodeSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(2).max(200),
});

const courseNodeSchema = optionNodeSchema;

const facultyNodeSchema = optionNodeSchema.extend({
  courses: z.array(courseNodeSchema),
});

const campusNodeSchema = optionNodeSchema.extend({
  faculties: z.array(facultyNodeSchema),
});

export const updateApplicationOptionsSchema = z.object({
  campuses: z.array(campusNodeSchema).min(1),
  supportProviders: z.array(optionNodeSchema).min(1),
});

export const createApplicationSchema = z.object({
  scholarshipId: z.string().uuid(),
});

export const statusChangeSchema = z.object({
  toStatus: applicationStatusSchema,
  reason: z.string().max(1000).optional(),
  adminNotes: z.string().max(4000).optional(),
});

export const reopenSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const updateStudyProgramsSchema = z.object({
  programs: z.array(z.string().trim().min(2).max(200)).min(1).max(200),
});

export function isAttachmentSlotForSiblingMember(slotKey: string, memberId: string) {
  if (!MEMBER_SLOT_ID_REGEX.test(memberId)) {
    return false;
  }

  return slotKey.includes(`.${memberId}.`);
}

export const dateOfBirthV2Schema = dateOfBirthSchema;
export const currentYearForV2 = CURRENT_YEAR;
