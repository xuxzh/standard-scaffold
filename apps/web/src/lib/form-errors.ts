/**
 * Reads a react-hook-form field error into a plain string message.
 *
 * React-hook-form exposes most leaf errors as `{ message: string }`, but a few
 * array-level issues (the `.min(1, ...)` style errors that zod emits against
 * a `useFieldArray` collection, or `superRefine` issues added without a
 * `path`) are wrapped as `{ root: { message: string } }`. This helper flattens
 * both shapes so callers can render a single message string.
 */
export function getFieldErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const fieldError = error as {
    message?: unknown;
    root?: { message?: unknown };
  };

  if (typeof fieldError.message === "string") {
    return fieldError.message;
  }

  if (typeof fieldError.root?.message === "string") {
    return fieldError.root.message;
  }

  return null;
}
