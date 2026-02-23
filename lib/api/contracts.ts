import { z } from "zod";

import {
  confirmAttachmentSchema,
  createApplicationSchema,
  publicApplicationSubmitSchema,
  publicUploadUrlV2Schema,
  reopenSchema,
  scholarshipCreateSchema,
  scholarshipImageUploadSchema,
  scholarshipPatchSchema,
  statusChangeSchema,
  updateApplicationOptionsSchema,
  updateDraftV2Schema,
  updateStudyProgramsSchema,
  uploadUrlV2Schema,
} from "@/lib/validation";

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const apiSuccessResponseSchema = z.object({
  success: z.literal(true),
});

export const studyProgramSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sort_order: z.number().int(),
});

const optionNodeSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  sort_order: z.number().int(),
});

const courseOptionNodeSchema = optionNodeSchema;

const facultyOptionNodeSchema = optionNodeSchema.extend({
  courses: z.array(courseOptionNodeSchema),
});

const campusOptionNodeSchema = optionNodeSchema.extend({
  faculties: z.array(facultyOptionNodeSchema),
});

export const applicationOptionsTreeSchema = z.object({
  campuses: z.array(campusOptionNodeSchema),
  supportProviders: z.array(optionNodeSchema),
});

export const adminStudyProgramsResponseSchema = z.object({
  programs: z.array(studyProgramSchema),
});

export const adminUpdateStudyProgramsRequestSchema = updateStudyProgramsSchema;

export const adminApplicationOptionsResponseSchema = z.object({
  options: applicationOptionsTreeSchema,
});

export const adminUpdateApplicationOptionsRequestSchema = updateApplicationOptionsSchema;

export const presignedUploadResponseSchema = z.object({
  uploadUrl: z.string().url(),
  s3Key: z.string(),
  slotKey: z.string().optional(),
  viewUrl: z.string().url().nullable().optional(),
  expiresIn: z.number().int().positive(),
  method: z.literal("PUT"),
  requiredHeaders: z.record(z.string(), z.string()),
});

export const adminScholarshipUploadUrlRequestSchema = scholarshipImageUploadSchema;
export const adminScholarshipUploadUrlResponseSchema = presignedUploadResponseSchema;

export const adminCreateScholarshipRequestSchema = scholarshipCreateSchema;
export const adminUpdateScholarshipRequestSchema = scholarshipPatchSchema;
export const adminScholarshipMutationResponseSchema = z.object({
  scholarship: z.unknown(),
});

export const adminChangeApplicationStatusRequestSchema = statusChangeSchema;
export const adminReopenApplicationRequestSchema = reopenSchema;
export const adminActionSuccessResponseSchema = apiSuccessResponseSchema;

export const publicApplicationOptionsResponseSchema = adminApplicationOptionsResponseSchema;
export const publicUploadUrlRequestSchema = publicUploadUrlV2Schema;
export const publicUploadUrlResponseSchema = presignedUploadResponseSchema;
export const publicSubmitApplicationRequestSchema = publicApplicationSubmitSchema;
export const publicSubmitApplicationResponseSchema = apiSuccessResponseSchema.extend({
  applicationId: z.string().uuid(),
});

export const studentCreateApplicationRequestSchema = createApplicationSchema;
export const studentCreateApplicationResponseSchema = z.object({
  applicationId: z.string().uuid(),
});
export const studentUploadUrlRequestSchema = uploadUrlV2Schema;
export const studentUploadUrlResponseSchema = presignedUploadResponseSchema;
export const studentConfirmAttachmentRequestSchema = confirmAttachmentSchema;
export const studentConfirmAttachmentResponseSchema = apiSuccessResponseSchema.extend({
  attachmentId: z.string().uuid(),
});
export const studentUpdateDraftRequestSchema = updateDraftV2Schema;
export const studentUpdateDraftResponseSchema = apiSuccessResponseSchema;
export const studentSubmitApplicationResponseSchema = apiSuccessResponseSchema;

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
export type ApiSuccessResponse = z.infer<typeof apiSuccessResponseSchema>;
export type StudyProgram = z.infer<typeof studyProgramSchema>;
export type ApplicationOptionsTree = z.infer<typeof applicationOptionsTreeSchema>;
export type AdminStudyProgramsResponse = z.infer<typeof adminStudyProgramsResponseSchema>;
export type AdminUpdateStudyProgramsRequest = z.input<typeof adminUpdateStudyProgramsRequestSchema>;
export type AdminApplicationOptionsResponse = z.infer<typeof adminApplicationOptionsResponseSchema>;
export type AdminUpdateApplicationOptionsRequest = z.input<
  typeof adminUpdateApplicationOptionsRequestSchema
>;
export type PresignedUploadResponse = z.infer<typeof presignedUploadResponseSchema>;
export type AdminScholarshipUploadUrlRequest = z.input<typeof adminScholarshipUploadUrlRequestSchema>;
export type AdminCreateScholarshipRequest = z.input<typeof adminCreateScholarshipRequestSchema>;
export type AdminUpdateScholarshipRequest = z.input<typeof adminUpdateScholarshipRequestSchema>;
export type AdminChangeApplicationStatusRequest = z.input<typeof adminChangeApplicationStatusRequestSchema>;
export type AdminReopenApplicationRequest = z.input<typeof adminReopenApplicationRequestSchema>;
export type PublicUploadUrlRequest = z.input<typeof publicUploadUrlRequestSchema>;
export type PublicSubmitApplicationRequest = z.input<typeof publicSubmitApplicationRequestSchema>;
export type StudentCreateApplicationRequest = z.input<typeof studentCreateApplicationRequestSchema>;
export type StudentUploadUrlRequest = z.input<typeof studentUploadUrlRequestSchema>;
export type StudentConfirmAttachmentRequest = z.input<typeof studentConfirmAttachmentRequestSchema>;
export type StudentUpdateDraftRequest = z.input<typeof studentUpdateDraftRequestSchema>;
