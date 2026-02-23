import { z } from "zod";

import { apiErrorResponseSchema } from "@/lib/api/contracts";

type ApiFetchOptions<TResponseSchema extends z.ZodTypeAny> = Omit<RequestInit, "body"> & {
  body?: unknown;
  responseSchema: TResponseSchema;
};

export async function apiFetch<TResponseSchema extends z.ZodTypeAny>(
  input: RequestInfo | URL,
  { body, responseSchema, headers, ...init }: ApiFetchOptions<TResponseSchema>,
): Promise<z.infer<TResponseSchema>> {
  const hasBody = body !== undefined;

  const response = await fetch(input, {
    ...init,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = apiErrorResponseSchema.safeParse(payload);
    const message = parsedError.success
      ? parsedError.data.error.message
      : `Request failed (${response.status})`;

    throw new Error(message);
  }

  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("API response did not match the expected schema");
  }

  return parsed.data;
}
