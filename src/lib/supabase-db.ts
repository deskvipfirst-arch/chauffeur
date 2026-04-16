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

function makeDocSnapshot(row: any) {
  return {
    id: String(row?.id ?? ""),
    data: () => row,
    exists: () => Boolean(row),
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
  switch (constraint.op) {
    case "==":
      return builder.eq(constraint.field, constraint.value);
    case "!=":
      return builder.neq(constraint.field, constraint.value);
    case ">":
      return builder.gt(constraint.field, constraint.value);
    case ">=":
      return builder.gte(constraint.field, constraint.value);
    case "<":
      return builder.lt(constraint.field, constraint.value);
    case "<=":
      return builder.lte(constraint.field, constraint.value);
    default:
      return builder.eq(constraint.field, constraint.value);
  }
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
        builder = builder.order(constraint.field, {
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

  const { data: inserted, error } = await supabase
    .from(ref.table)
    .insert(data)
    .select("*")
    .single();

  if (error) throw error;
  return { id: String(inserted?.id ?? "") };
}

export async function setDoc(ref: DocRef, data: Record<string, any>) {
  if (!isSupabaseConfigured) return;

  const payload = { id: ref.id, ...data };
  const { error } = await supabase.from(ref.table).upsert(payload);
  if (error) throw error;
}

export async function updateDoc(ref: DocRef, data: Record<string, any>) {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase.from(ref.table).update(data).eq("id", ref.id);
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
