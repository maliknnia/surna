/** Whether the user must verify a real inbox before social actions. */
export function isPhoneOnlyEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return true;
  return email.endsWith("@phone.surna.local");
}

export function userRequiresEmailVerification(user: {
  email?: string | null;
  emailVerified?: boolean | null;
}): boolean {
  if (user.emailVerified) return false;
  if (isPhoneOnlyEmail(user.email)) return false;
  return Boolean(user.email?.trim());
}
