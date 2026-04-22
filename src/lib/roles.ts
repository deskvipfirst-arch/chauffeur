export function canonicalizeUserRole(role: string | null | undefined): string {
  const normalized = String(role ?? "user").trim().toLowerCase();

  if (["admin", "administrator", "office"].includes(normalized)) {
    return "admin";
  }

  if (["heathrow", "heathrow_monitor", "airport_ops"].includes(normalized)) {
    return "heathrow";
  }

  if (["greeter", "driver", "chauffeur"].includes(normalized)) {
    return "greeter";
  }

  return normalized || "user";
}

export function isAllowedRole(role: string | null | undefined, allowedRoles: string[] = []): boolean {
  if (allowedRoles.length === 0) {
    return true;
  }

  const canonicalRole = canonicalizeUserRole(role);
  return allowedRoles.map(canonicalizeUserRole).includes(canonicalRole);
}
