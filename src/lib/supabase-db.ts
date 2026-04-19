import { isSupabaseConfigured, supabase } from "@/lib/supabase";

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
  value: any;
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

export function normalizeDbRow(row: any) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return row;
  }

  const normalized = { ...row };
  for (const [dbField, appField] of Object.entries(DB_TO_APP_FIELD_ALIASES)) {
    if (normalized[dbField] !== undefined && normalized[appField] === undefined) {
      normalized[appField] = normalized[dbField];
    }
  }

  return normalized;
}

function makeDocSnapshot(row: any) {
  const normalizedRow = normalizeDbRow(row);
  return {
    id: String(normalizedRow?.id ?? ""),
    data: () => normalizedRow,
    exists: () => Boolean(normalizedRow),
  };
}

function makeQuerySnapshot(rows: any[]) {
  const docs = rows.map((row) => makeDocSnapshot(row));
  return {
    empty: docs.length === 0,
    docs,
    forEach: (callback: (doc: ReturnType<typeof makeDocSnapshot>) => void) => docs.forEach(callback),
  };
}

function applyWhere(builder: any, constraint: WhereConstraint) {
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

export function sanitizeMutationPayload(data: Record<string, any>) {
  const payload = { ...data };

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

export function collection(_db: any, table: string): CollectionRef {
  return { kind: "collection", table };
}

export function doc(_db: any, table: string, id: string): DocRef {
  return { kind: "doc", table, id };
}

export function where(field: string, op: string, value: any): WhereConstraint {
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

  let builder: any = supabase.from(ref.table).select("*");

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
      /Could not find the table|relation .* does not exist/i.test(errorMessage)
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

  if (error) throw error;
  return makeDocSnapshot(data);
}

export async function addDoc(ref: CollectionRef, data: Record<string, any>) {
  if (!isSupabaseConfigured) {
    return { id: "" };
  }

  const payload = sanitizeMutationPayload(data);

  const { data: inserted, error } = await supabase
    .from(ref.table)
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return { id: String(inserted?.id ?? "") };
}

export async function setDoc(ref: DocRef, data: Record<string, any>) {
  if (!isSupabaseConfigured) return;

  const payload = sanitizeMutationPayload({ id: ref.id, ...data });
  const { error } = await supabase.from(ref.table).upsert(payload);
  if (error) throw error;
}

export async function updateDoc(ref: DocRef, data: Record<string, any>) {
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
