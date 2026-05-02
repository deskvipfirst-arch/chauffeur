import { auth, supabase, getAccessToken } from "@/lib/supabase/browser";
import { canonicalizeUserRole, isAllowedRole } from "./roles";

async function saveAdminRoleServerSide(email: string, password: string) {
  const token = await getAccessToken();
  const response = await fetch("/api/admin/bootstrap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.error || "Failed to create admin user");
  }

  return result;
}

export async function createAdminUser(email: string, password: string) {
  try {
    const result = await saveAdminRoleServerSide(email, password);
    return { success: true, user: result?.user || { email } };
  } catch (error: unknown) {
    console.error("Error creating admin user:", error);
    const message = error instanceof Error ? error.message : "Failed to create admin user";
    throw new Error(message);
  }
}

export { canonicalizeUserRole, isAllowedRole } from "./roles";

export async function getUserRole(userId: string) {
  try {
    const { data: userData, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();
      
    if (!error && userData) {
      return canonicalizeUserRole(userData.role || null);
    }

    if (auth.currentUser?.uid === userId) {
      return canonicalizeUserRole(auth.currentUser.role || null);
    }

    return null;
  } catch (error) {
    console.error("Error checking user role:", error);
    if (auth.currentUser?.uid === userId) {
      return canonicalizeUserRole(auth.currentUser.role || null);
    }
    return null;
  }
}

export async function isAdminUser(userId: string) {
  const role = await getUserRole(userId);
  return isAllowedRole(role, ["admin"]);
}

export async function isAdminOrHeathrowUser(userId: string) {
  const role = await getUserRole(userId);
  return isAllowedRole(role, ["admin", "heathrow"]);
}

export async function isGreeterUser(userId: string) {
  const role = await getUserRole(userId);
  return isAllowedRole(role, ["greeter", "admin"]);
}

// Function to create the first admin user
export async function createFirstAdminUser(email: string, password: string) {
  try {
    const result = await saveAdminRoleServerSide(email, password);
    return { success: true, user: result?.user || { email } };
  } catch (error: unknown) {
    console.error("Error creating first admin user:", error);
    const message = error instanceof Error ? error.message : "Failed to create first admin user";
    throw new Error(message);
  }
} 

