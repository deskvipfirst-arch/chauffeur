import { isSupabaseConfigured, supabaseClient as supabase } from "@/lib/supabase/browser";

type JsonObject = Record<string, unknown>;

type PostgrestBuilder = {
  eq: (field: string, value: unknown) => PostgrestBuilder;
  neq: (field: string, value: unknown) => PostgrestBuilder;
  gt: (field: string, value: unknown) => PostgrestBuilder;
  gte: (field: string, value: unknown) => PostgrestBuilder;
  lt: (field: string, value: unknown) => PostgrestBuilder;
  lte: (field: string, value: unknown) => PostgrestBuilder;
  order: (field: string, options: { ascending: boolean }) => PostgrestBuilder;
  then: <TResult1 = { data: JsonObject[] | null; error: { code?: string; message?: string; details?: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: JsonObject[] | null; error: { code?: string; message?: string; details?: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) => PromiseLike<TResult1 | TResult2>;
};

type CollectionRef = {
  kind: "collection";
  table: string;
};

type DocRef = {
  kind: "doc";
  table: string;
  id: string;
};

type WhereConstraint = {
  kind: "where";
  field: string;
  op: string;
  value: unknown;
};

type OrderConstraint = {
  kind: "orderBy";
  field: string;
  direction: "asc" | "desc";
};

type QueryRef = {
  kind: "query";
  table: string;
  constraints: Array<WhereConstraint | OrderConstraint>;
};

const APP_TO_DB_FIELD_ALIASES: Record<string, string> = {
  firstName: "firstname",
  lastName: "lastname",
  first_name: "firstname",
  last_name: "lastname",
  createdAt: "createdat",
  updatedAt: "updatedat",
  isFirstAdmin: "isfirstadmin",
  paymentDetails: "paymentdetails",
  baseRate: "baserate",
  driverId: "driverid",
  bookingId: "bookingid",
  paymentDate: "paymentdate",
  paymentMethod: "paymentmethod",
};

const DB_TO_APP_FIELD_ALIASES: Record<string, string> = {
  firstname: "firstName",
  lastname: "lastName",
  createdat: "createdAt",
  updatedat: "updatedAt",
  isfirstadmin: "isFirstAdmin",
  paymentdetails: "paymentDetails",
  baserate: "baseRate",
  driverid: "driverId",
  bookingid: "bookingId",
  paymentdate: "paymentDate",
  paymentmethod: "paymentMethod",
  first_name: "firstName",
  last_name: "lastName",
  is_first_admin: "isFirstAdmin",
  payment_details: "paymentDetails",
  base_rate: "baseRate",
  driver_id: "driverId",
  booking_id: "bookingId",
  payment_date: "paymentDate",
  payment_method: "paymentMethod",
};

function toDbFieldName(field: string) {
  return APP_TO_DB_FIELD_ALIASES[field] ?? field;
}

export function normalizeDbRow(row: unknown): JsonObject {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return (row as JsonObject) || {};
  }

  const normalized = { ...(row as JsonObject) } as JsonObject;
  for (const [dbField, appField] of Object.entries(DB_TO_APP_FIELD_ALIASES)) {
    if (normalized[dbField] !== undefined && normalized[appField] === undefined) {
      normalized[appField] = normalized[dbField];
    }
  }

  if (normalized.createdat !== undefined) {
    if (normalized.createdAt === undefined) normalized.createdAt = normalized.createdat;
    if (normalized.created_at === undefined) normalized.created_at = normalized.createdat;
  }

  if (normalized.updatedat !== undefined) {
    if (normalized.updatedAt === undefined) normalized.updatedAt = normalized.updatedat;
    if (normalized.updated_at === undefined) normalized.updated_at = normalized.updatedat;
  }

  return normalized;
}

function makeDocSnapshot(row: unknown) {
  const normalizedRow = normalizeDbRow(row);
  return {
    id: String(normalizedRow?.id ?? ""),
    data: () => normalizedRow,
    exists: () => Boolean(normalizedRow),
  };
}

function makeQuerySnapshot(rows: JsonObject[]) {
  const docs = rows.map((row) => makeDocSnapshot(row));
  return {
    empty: docs.length === 0,
    docs,
    forEach: (callback: (doc: ReturnType<typeof makeDocSnapshot>) => void) => docs.forEach(callback),
  };
}

function applyWhere(builder: PostgrestBuilder, constraint: WhereConstraint): PostgrestBuilder {
  const field = toDbFieldName(constraint.field);

  switch (constraint.op) {
    case "==":
      return builder.eq(field, constraint.value);
    case "!=":
      return builder.neq(field, constraint.value);
    case ">":
      return builder.gt(field, constraint.value);
    case ">=":
      return builder.gte(field, constraint.value);
    case "<":
      return builder.lt(field, constraint.value);
    case "<=":
      return builder.lte(field, constraint.value);
    default:
      return builder.eq(field, constraint.value);
  }
}

export function sanitizeMutationPayload(data: object) {
  const payload = { ...(data as JsonObject) };

  for (const [appField, dbField] of Object.entries(APP_TO_DB_FIELD_ALIASES)) {
    if (payload[appField] !== undefined) {
      if (payload[dbField] === undefined) {
        payload[dbField] = payload[appField];
      }
      delete payload[appField];
    }
  }

  return payload;
}

export function collection(_db: unknown, table: string): CollectionRef {
  return { kind: "collection", table };
}

export function doc(_db: unknown, table: string, id: string): DocRef {
  return { kind: "doc", table, id };
}

export function where(field: string, op: string, value: unknown): WhereConstraint {
  return { kind: "where", field, op, value };
}

export function orderBy(field: string, direction: "asc" | "desc" = "asc"): OrderConstraint {
  return { kind: "orderBy", field, direction };
}

export function query(ref: CollectionRef, ...constraints: Array<WhereConstraint | OrderConstraint>): QueryRef {
  return {
    kind: "query",
    table: ref.table,
    constraints,
  };
}

export async function getDocs(ref: CollectionRef | QueryRef) {
  if (!isSupabaseConfigured) return makeQuerySnapshot([]);

  let builder = supabase.from(ref.table).select("*") as unknown as PostgrestBuilder;

  if (ref.kind === "query") {
    for (const constraint of ref.constraints) {
      if (constraint.kind === "where") {
        builder = applyWhere(builder, constraint);
      }
      if (constraint.kind === "orderBy") {
        builder = builder.order(toDbFieldName(constraint.field), {
          ascending: constraint.direction !== "desc",
        });
      }
    }
  }

  const { data, error } = await builder;
  if (error) {
    const errorMessage = `${error.message ?? ""} ${error.details ?? ""}`;
    if (
      error.code === "PGRST205" ||
      error.code === "42P01" ||
      error.code === "42501" ||
      /Could not find the table|relation .* does not exist|row-level security/i.test(errorMessage)
    ) {
      return makeQuerySnapshot([]);
    }
    throw error;
  }

  return makeQuerySnapshot(data || []);
}

export async function getDoc(ref: DocRef) {
  if (!isSupabaseConfigured) {
    return makeDocSnapshot(undefined);
  }

  const { data, error } = await supabase
    .from(ref.table)
    .select("*")
    .eq("id", ref.id)
    .maybeSingle();

  if (error) {
    const errorMessage = `${error.message ?? ""} ${error.details ?? ""}`;
    if (error.code === "42501" || /row-level security/i.test(errorMessage)) {
      return makeDocSnapshot(undefined);
    }
    throw error;
  }
  return makeDocSnapshot(data);
}

export async function addDoc(ref: CollectionRef, data: object) {
  if (!isSupabaseConfigured) {
    return { id: "" };
  }

  const payload = sanitizeMutationPayload(data);

  const { data: inserted, error } = await supabase.from(ref.table).insert(payload).select("*").single();

  if (error) throw error;
  return { id: String((inserted as { id?: string | number } | null)?.id ?? "") };
}

export async function setDoc(ref: DocRef, data: object) {
  if (!isSupabaseConfigured) return;

  const payload = sanitizeMutationPayload({ id: ref.id, ...data });
  const { error } = await supabase.from(ref.table).upsert(payload);
  if (error) throw error;
}

export async function updateDoc(ref: DocRef, data: object) {
  if (!isSupabaseConfigured) return;

  const payload = sanitizeMutationPayload(data);
  const { error } = await supabase.from(ref.table).update(payload).eq("id", ref.id);
  if (error) throw error;
}

export async function deleteDoc(ref: DocRef) {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase.from(ref.table).delete().eq("id", ref.id);
  if (error) throw error;
}

export function serverTimestamp() {
  return new Date().toISOString();
}
