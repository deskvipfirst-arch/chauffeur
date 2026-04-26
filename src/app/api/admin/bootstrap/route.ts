import { NextResponse } from "next/server";
import { createUserProfile, getUserProfile, requireAuthorizedUser, supabaseAdmin } from "@/lib/supabase/admin";
import { canonicalizeUserRole } from "@/lib/roles";

export const runtime = "nodejs";

function getStatusCode(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (message === "Missing authorization token" || message === "Invalid authorization token") {
    return 401;
  }

  if (message === "Forbidden" || message === "Admin bootstrap is disabled after the first admin is created") {
    return 403;
  }

  if (
    message === "Email and password are required" ||
    message === "Please enter a valid email address" ||
    message === "Password must be at least 6 characters long"
  ) {
    return 400;
  }

  return 500;
}

async function hasExistingAdmin() {
  const { data, error } = await supabaseAdmin.from("users").select("id, role");

  if (error) {
    return false;
  }

  return (data || []).some((row) => canonicalizeUserRole(row.role) === "admin");
}

async function findAuthUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    throw error;
  }

  return data.users.find((user) => String(user.email || "").trim().toLowerCase() === email) || null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    const alreadyInitialized = await hasExistingAdmin();
    if (alreadyInitialized) {
      await requireAuthorizedUser(request.headers.get("authorization"), ["admin"]);
    }

    let user = await findAuthUserByEmail(email);

    if (!user) {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: "admin",
        },
      });

      if (created.error || !created.data.user) {
        throw created.error || new Error("Failed to create admin auth user");
      }

      user = created.data.user;
    } else {
      const updated = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...(user.user_metadata || {}),
          role: "admin",
        },
      });

      if (updated.error || !updated.data.user) {
        throw updated.error || new Error("Failed to promote the existing user to admin");
      }

      user = updated.data.user;
    }

    await createUserProfile(user.id, {
      email,
      role: "ADMIN",
    });

    const profile = await getUserProfile(user.id);

    return NextResponse.json({
      success: true,
      message: alreadyInitialized ? "Admin user created successfully." : "First admin user created successfully.",
      user: {
        id: user.id,
        email: user.email,
        role: canonicalizeUserRole(profile?.role || user.user_metadata?.role || "admin"),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create admin user",
      },
      { status: getStatusCode(error) }
    );
  }
}
