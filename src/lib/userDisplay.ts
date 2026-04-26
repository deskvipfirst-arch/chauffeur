type BasicUser = {
  displayName?: string | null;
  email?: string | null;
};

function readValue(source: unknown, keys: string[]) {
  const sourceObj = source as Record<string, any> | null;
  if (!sourceObj || typeof sourceObj !== "object") return "";

  for (const key of keys) {
    const value = sourceObj[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function splitName(value: string) {
  const cleaned = toTitleCase(value.replace(/[._-]+/g, " ").trim());
  const parts = cleaned.split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
    fullName: parts.join(" "),
  };
}

export function getUserDisplayName(profile?: Record<string, any> | null, user?: BasicUser | null) {
  const profileFirst = readValue(profile, ["firstName", "firstname", "first_name"]);
  const profileLast = readValue(profile, ["lastName", "lastname", "last_name"]);
  const profileFull = readValue(profile, ["displayName", "display_name", "full_name"]);

  if (profileFirst || profileLast) {
    return [profileFirst, profileLast].filter(Boolean).join(" ").trim();
  }

  if (profileFull) {
    return splitName(profileFull).fullName;
  }

  if (user?.displayName) {
    return splitName(user.displayName).fullName;
  }

  const emailName = String(user?.email || "").split("@")[0] || "Passenger";
  return splitName(emailName).fullName || "Passenger";
}

export function getUserFirstName(profile?: Record<string, any> | null, user?: BasicUser | null) {
  const directFirst = readValue(profile, ["firstName", "firstname", "first_name"]);
  if (directFirst) {
    return splitName(directFirst).firstName || "Passenger";
  }

  const displayName = getUserDisplayName(profile, user);
  return splitName(displayName).firstName || "Passenger";
}

export function getUserInitials(profile?: Record<string, any> | null, user?: BasicUser | null) {
  const displayName = getUserDisplayName(profile, user);
  const parts = splitName(displayName).fullName.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase() || "P";
}
