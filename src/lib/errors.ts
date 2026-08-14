/**
 * Thrown deliberately with a message that is safe to show to the client.
 * Anything else (Supabase/OpenAI/fs errors, JSON parse failures, ...) is
 * logged server-side only and replaced with a generic fallback, since raw
 * driver/SDK error messages can leak internal details to callers — and
 * these server actions have no auth in front of them.
 */
export class AppError extends Error {}

export function toClientMessage(error: unknown, fallback: string): string {
  if (error instanceof AppError) return error.message;
  return fallback;
}
