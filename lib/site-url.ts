const FALLBACK_SITE_URL = "https://scholarhub.yum.edu.my";

export function getSiteUrl(): string {
  const rawUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? FALLBACK_SITE_URL;

  try {
    return new URL(rawUrl).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export function getSiteUrlObject(): URL {
  return new URL(getSiteUrl());
}

