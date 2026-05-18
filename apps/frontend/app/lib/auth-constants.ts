/** Platform system owner (not organization user). */
export const SYSTEM_OWNER_EMAIL = "admin@outflo.com";

export function isSystemOwnerEmail(email: string): boolean {
  return email.trim().toLowerCase() === SYSTEM_OWNER_EMAIL.toLowerCase();
}
