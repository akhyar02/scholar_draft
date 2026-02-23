import { apiFetch } from "@/lib/api/client";
import {
  adminActionSuccessResponseSchema,
  adminApplicationOptionsResponseSchema,
  adminChangeApplicationStatusRequestSchema,
  adminCreateScholarshipRequestSchema,
  adminScholarshipMutationResponseSchema,
  adminScholarshipUploadUrlRequestSchema,
  adminScholarshipUploadUrlResponseSchema,
  adminReopenApplicationRequestSchema,
  adminUpdateApplicationOptionsRequestSchema,
  adminUpdateScholarshipRequestSchema,
  adminStudyProgramsResponseSchema,
  adminUpdateStudyProgramsRequestSchema,
  type AdminChangeApplicationStatusRequest,
  type AdminCreateScholarshipRequest,
  type AdminReopenApplicationRequest,
  type AdminUpdateApplicationOptionsRequest,
  type AdminUpdateScholarshipRequest,
  type AdminUpdateStudyProgramsRequest,
  type AdminScholarshipUploadUrlRequest,
} from "@/lib/api/contracts";
import { apiEndpoints } from "@/lib/api/endpoints";

export const adminApi = {
  updateStudyPrograms(input: AdminUpdateStudyProgramsRequest) {
    const body = adminUpdateStudyProgramsRequestSchema.parse(input);

    return apiFetch(apiEndpoints.admin.studyPrograms, {
      method: "PUT",
      body,
      responseSchema: adminStudyProgramsResponseSchema,
    });
  },

  updateApplicationOptions(input: AdminUpdateApplicationOptionsRequest) {
    const body = adminUpdateApplicationOptionsRequestSchema.parse(input);

    return apiFetch(apiEndpoints.admin.applicationOptions, {
      method: "PUT",
      body,
      responseSchema: adminApplicationOptionsResponseSchema,
    });
  },

  createScholarshipUploadUrl(input: AdminScholarshipUploadUrlRequest) {
    const body = adminScholarshipUploadUrlRequestSchema.parse(input);

    return apiFetch(apiEndpoints.admin.scholarshipUploadUrl, {
      method: "POST",
      body,
      responseSchema: adminScholarshipUploadUrlResponseSchema,
    });
  },

  createScholarship(input: AdminCreateScholarshipRequest) {
    const body = adminCreateScholarshipRequestSchema.parse(input);

    return apiFetch(apiEndpoints.admin.scholarships, {
      method: "POST",
      body,
      responseSchema: adminScholarshipMutationResponseSchema,
    });
  },

  updateScholarship(scholarshipId: string, input: AdminUpdateScholarshipRequest) {
    const body = adminUpdateScholarshipRequestSchema.parse(input);

    return apiFetch(apiEndpoints.admin.scholarshipById(scholarshipId), {
      method: "PATCH",
      body,
      responseSchema: adminScholarshipMutationResponseSchema,
    });
  },

  deleteScholarship(scholarshipId: string) {
    return apiFetch(apiEndpoints.admin.scholarshipById(scholarshipId), {
      method: "DELETE",
      responseSchema: adminActionSuccessResponseSchema,
    });
  },

  updateApplicationStatus(applicationId: string, input: AdminChangeApplicationStatusRequest) {
    const body = adminChangeApplicationStatusRequestSchema.parse(input);

    return apiFetch(apiEndpoints.admin.applicationStatus(applicationId), {
      method: "POST",
      body,
      responseSchema: adminActionSuccessResponseSchema,
    });
  },

  reopenApplication(applicationId: string, input: AdminReopenApplicationRequest = {}) {
    const body = adminReopenApplicationRequestSchema.parse(input);

    return apiFetch(apiEndpoints.admin.applicationReopen(applicationId), {
      method: "POST",
      body,
      responseSchema: adminActionSuccessResponseSchema,
    });
  },
} as const;
