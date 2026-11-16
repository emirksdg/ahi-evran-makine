const domainPattern =
  /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

export function matchesUniversityEmail(
  email: string,
  allowedDomains: readonly string[],
): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const separator = normalizedEmail.lastIndexOf("@");
  if (separator <= 0 || separator === normalizedEmail.length - 1) return false;

  const localPart = normalizedEmail.slice(0, separator).trim();
  const domain = normalizedEmail.slice(separator + 1).trim();

  if (
    !localPart ||
    !domain ||
    domain.includes("@") ||
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    domain.includes(" ") ||
    !domainPattern.test(domain)
  ) {
    return false;
  }

  const normalizedAllowedDomains = allowedDomains
    .map((value) => value.trim().toLowerCase().replace(/^\.+|\.+$/g, ""))
    .filter((value) => value.length > 0);

  if (normalizedAllowedDomains.length === 0) return false;

  return normalizedAllowedDomains.some(
    (allowedDomain) =>
      domain === allowedDomain || domain.endsWith(`.${allowedDomain}`),
  );
}
