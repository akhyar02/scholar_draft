import { apiFetch } from "@/lib/api/client";
import {
  studentConfirmAttachmentRequestSchema,
  studentConfirmAttachmentResponseSchema,
  studentCreateApplicationRequestSchema,
  studentCreateApplicationResponseSchema,
  studentSubmitApplicationResponseSchema,
  studentUpdateDraftRequestSchema,
  studentUpdateDraftResponseSchema,
  studentUploadUrlRequestSchema,
  studentUploadUrlResponseSchema,
  type StudentConfirmAttachmentRequest,
  type StudentCreateApplicationRequest,
  type StudentUpdateDraftRequest,
  type StudentUploadUrlRequest,
} from "@/lib/api/contracts";
import { apiEndpoints } from "@/lib/api/endpoints";

export const studentApi = {
  createApplication(input: StudentCreateApplicationRequest) {
    const body = studentCreateApplicationRequestSchema.parse(input);

    return apiFetch(apiEndpoints.student.applications, {
      method: "POST",
      body,
      responseSchema: studentCreateApplicationResponseSchema,
    });
  },

  createApplicationUploadUrl(applicationId: string, input: StudentUploadUrlRequest) {
    const body = studentUploadUrlRequestSchema.parse(input);

    return apiFetch(apiEndpoints.student.applicationUploadUrl(applicationId), {
      method: "POST",
      body,
      responseSchema: studentUploadUrlResponseSchema,
    });
  },

  confirmApplicationDocument(applicationId: string, input: StudentConfirmAttachmentRequest) {
    const body = studentConfirmAttachmentRequestSchema.parse(input);

    return apiFetch(apiEndpoints.student.applicationDocumentsConfirm(applicationId), {
      method: "POST",
      body,
      responseSchema: studentConfirmAttachmentResponseSchema,
    });
  },

  updateApplicationDraft(applicationId: string, input: StudentUpdateDraftRequest) {
    const body = studentUpdateDraftRequestSchema.parse(input);

    return apiFetch(apiEndpoints.student.applicationById(applicationId), {
      method: "PATCH",
      body,
      responseSchema: studentUpdateDraftResponseSchema,
    });
  },

  submitApplication(applicationId: string) {
    return apiFetch(apiEndpoints.student.applicationSubmit(applicationId), {
      method: "POST",
      responseSchema: studentSubmitApplicationResponseSchema,
    });
  },
} as const;
