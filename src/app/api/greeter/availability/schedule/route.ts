import { NextRequest, NextResponse } from "next/server";
import { requireAuthorizedUser, supabaseAdmin } from "@/lib/supabase/admin";

const AVAILABILITY_TABLE = "greeter_availability";

type AvailabilityDayInput = {
  date?: string;
  available?: boolean;
  mode?: "all_day" | "range";
  startTime?: string | null;
  endTime?: string | null;
};

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimeValue(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function parseRequestedEmail(request: NextRequest) {
  return normalizeEmail(request.nextUrl.searchParams.get("email"));
}

function parseDayInput(day: AvailabilityDayInput) {
  const date = String(day?.date || "").trim();
  if (!isIsoDate(date)) {
    throw new Error(`Invalid date: ${date || "(empty)"}`);
  }

  const available = day?.available === true;
  const mode = day?.mode === "range" ? "range" : "all_day";

  if (!available) {
    return {
      availability_date: date,
      is_available: false,
      all_day: true,
      start_time: null,
      end_time: null,
    };
  }

  if (mode === "all_day") {
    return {
      availability_date: date,
      is_available: true,
      all_day: true,
      start_time: null,
      end_time: null,
    };
  }

  const startTime = String(day?.startTime || "").trim();
  const endTime = String(day?.endTime || "").trim();
  if (!isTimeValue(startTime) || !isTimeValue(endTime) || startTime >= endTime) {
    throw new Error(`Invalid time range for ${date}`);
  }

  return {
    availability_date: date,
    is_available: true,
    all_day: false,
    start_time: `${startTime}:00`,
    end_time: `${endTime}:00`,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthorizedUser(request.headers.get("authorization"), ["greeter", "admin"]);

    const requestedEmail = parseRequestedEmail(request);
    const effectiveEmail = auth.role === "admin" ? requestedEmail || auth.email : auth.email;

    if (!effectiveEmail) {
      return NextResponse.json({ error: "Email not found" }, { status: 400 });
    }

    if (auth.role !== "admin" && requestedEmail && requestedEmail !== auth.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const from = String(request.nextUrl.searchParams.get("from") || "").trim();
    const to = String(request.nextUrl.searchParams.get("to") || "").trim();
    if (!isIsoDate(from) || !isIsoDate(to)) {
      return NextResponse.json({ error: "Valid from/to dates are required (YYYY-MM-DD)" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(AVAILABILITY_TABLE)
      .select("availability_date,is_available,all_day,start_time,end_time")
      .eq("greeter_email", effectiveEmail)
      .gte("availability_date", from)
      .lte("availability_date", to)
      .order("availability_date", { ascending: true });

    if (error) {
      throw error;
    }

    const days = (data || []).map((row) => ({
      date: String(row.availability_date),
      available: row.is_available === true,
      mode: row.is_available === true && row.all_day === false ? "range" : "all_day",
      startTime: row.start_time ? String(row.start_time).slice(0, 5) : null,
      endTime: row.end_time ? String(row.end_time).slice(0, 5) : null,
    }));

    return NextResponse.json({ email: effectiveEmail, days });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch schedule";
    const status = message === "Forbidden" ? 403 : message.toLowerCase().includes("authorization") || message.toLowerCase().includes("token") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuthorizedUser(request.headers.get("authorization"), ["greeter", "admin"]);

    const body = (await request.json()) as {
      email?: string;
      days?: AvailabilityDayInput[];
    };

    const requestedEmail = normalizeEmail(body?.email);
    const effectiveEmail = auth.role === "admin" ? requestedEmail || auth.email : auth.email;

    if (!effectiveEmail) {
      return NextResponse.json({ error: "Email not found" }, { status: 400 });
    }

    if (auth.role !== "admin" && requestedEmail && requestedEmail !== auth.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const days = Array.isArray(body?.days) ? body.days : [];
    if (days.length === 0) {
      return NextResponse.json({ error: "At least one day is required" }, { status: 400 });
    }
    if (days.length > 62) {
      return NextResponse.json({ error: "Too many day updates in a single request" }, { status: 400 });
    }

    const rows = days.map((day) => ({
      greeter_email: effectiveEmail,
      ...parseDayInput(day),
    }));

    const { error } = await supabaseAdmin
      .from(AVAILABILITY_TABLE)
      .upsert(rows, { onConflict: "greeter_email,availability_date" });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, updated: rows.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update schedule";
    const status = message === "Forbidden" ? 403 : message.toLowerCase().includes("authorization") || message.toLowerCase().includes("token") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
