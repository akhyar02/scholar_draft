import { apiFetch } from "@/lib/api/client";
import {
  publicApplicationOptionsResponseSchema,
  publicSubmitApplicationRequestSchema,
  publicSubmitApplicationResponseSchema,
  publicUploadUrlRequestSchema,
  publicUploadUrlResponseSchema,
  type PublicSubmitApplicationRequest,
  type PublicUploadUrlRequest,
} from "@/lib/api/contracts";
import { apiEndpoints } from "@/lib/api/endpoints";

export const publicApi = {
  getApplicationOptions(init?: Omit<RequestInit, "method" | "body">) {
    return apiFetch(apiEndpoints.public.applicationOptions, {
      ...init,
      method: "GET",
      responseSchema: publicApplicationOptionsResponseSchema,
    });
  },

  createApplicationUploadUrl(input: PublicUploadUrlRequest) {
    const body = publicUploadUrlRequestSchema.parse(input);

    return apiFetch(apiEndpoints.public.uploadUrl, {
      method: "POST",
      body,
      responseSchema: publicUploadUrlResponseSchema,
    });
  },

  submitApplication(input: PublicSubmitApplicationRequest) {
    const body = publicSubmitApplicationRequestSchema.parse(input);

    return apiFetch(apiEndpoints.public.applications, {
      method: "POST",
      body,
      responseSchema: publicSubmitApplicationResponseSchema,
    });
  },
} as const;
