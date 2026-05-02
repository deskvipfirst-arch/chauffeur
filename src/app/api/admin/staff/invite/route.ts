import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
import { getRequestIp, rateLimitByKey } from "@/lib/api/rate-limit";
import { requireAuthorizedUser, createUserProfile } from "@/lib/supabase/admin";
import { buildStaffInvitationEmail, sendTransactionalEmail } from "@/lib/email";
import { createInvite } from "@/lib/invites/service";
import { canonicalizeUserRole } from "@/lib/roles";

export const runtime = "nodejs";

const INVITE_MAX_REQUESTS_PER_MINUTE = 8;

function shouldExposeInviteDetails() {
  return process.env.NODE_ENV !== "production" && process.env.E2E_EXPOSE_INVITE_LINK === "true";
}

function logInviteRequest(event: string, details: Record<string, unknown>) {
  console.info("[invite-flow]", event, details);
}

export async function POST(request: Request) {
  try {
    const sourceIp = getRequestIp(request);
    const limitKey = `staff-invite:${sourceIp}`;
    const rateLimit = await rateLimitByKey(limitKey, INVITE_MAX_REQUESTS_PER_MINUTE, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many invite requests. Please wait and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const adminUser = await requireAuthorizedUser(request.headers.get("authorization"), ["admin"]);

    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const firstName = String(body?.firstName || "").trim();
    const lastName = String(body?.lastName || "").trim();
    const phone = String(body?.phone || "").trim();
    const role = canonicalizeUserRole(String(body?.role || ""));

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    if (!["admin", "greeter", "heathrow"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    logInviteRequest("create-start", {
      sourceIp,
      email,
      role,
      invitedBy: adminUser.email,
    });

    const { user, inviteLink } = await createInvite(
      {
        email,
        role: role as "admin" | "greeter" | "heathrow",
        firstName,
        lastName,
        phone,
        invitedBy: adminUser.email,
      },
      request
    );

    await createUserProfile(user.id, {
      email,
      role: role.toUpperCase() as "USER" | "ADMIN" | "GREETER" | "HEATHROW",
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      phone_number: phone || undefined,
    } as any);

    const emailContent = buildStaffInvitationEmail({
      email,
      role: role as "admin" | "greeter" | "heathrow",
      inviteLink,
      fullName: `${firstName} ${lastName}`.trim() || undefined,
      invitedBy: adminUser.email,
    });

    await sendTransactionalEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    logInviteRequest("create-success", {
      sourceIp,
      email,
      role,
      userId: user.id,
      limiterSource: rateLimit.source,
    });

    const responsePayload: {
      success: boolean;
      message: string;
      inviteLink?: string;
      invitedEmail?: string;
      invitedUserId?: string;
      emailDelivery?: "queued";
    } = {
      success: true,
      message: "Invitation sent successfully",
    };

    if (shouldExposeInviteDetails()) {
      responsePayload.inviteLink = inviteLink;
      responsePayload.invitedEmail = email;
      responsePayload.invitedUserId = user.id;
      responsePayload.emailDelivery = "queued";
    }

    return NextResponse.json(responsePayload);
  } catch (error: unknown) {
    console.error("[invite-flow] create-error", error);
    return apiErrorResponse(error, "Failed to send invitation");
  }
}
