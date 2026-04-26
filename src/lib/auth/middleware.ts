import { getUserProfile } from "@/lib/db/users";
import { createClient } from "@/lib/supabase/server";

export async function requireAuth(request: Request, allowedRoles?: string[]) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    throw new Error("Missing authorization token");
  }

  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error("Invalid authorization token");
  }

  if (allowedRoles?.length) {
    const profile = await getUserProfile(user.id);
    const role = String(profile?.role || "").toLowerCase();

    if (!role || !allowedRoles.includes(role)) {
      throw new Error("Forbidden");
    }
  }

  return { user, email: user.email! };
}
