import { storage } from "@/lib/supabase/client";

const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
  process.env.SUPABASE_STORAGE_BUCKET ||
  "uploads";

type StorageRef = {
  bucket: string;
  path: string;
};

function extractPath(pathOrUrl: string, bucket: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  if (pathOrUrl.includes(marker)) {
    return pathOrUrl.split(marker)[1];
  }
  return pathOrUrl.replace(/^\/+/, "");
}

export function ref(_storage: typeof storage, path: string): StorageRef {
  return {
    bucket: STORAGE_BUCKET,
    path,
  };
}

export async function uploadBytes(reference: StorageRef, file: File) {
  const normalizedPath = extractPath(reference.path, reference.bucket);
  const { data, error } = await storage.from(reference.bucket).upload(normalizedPath, file, {
    upsert: true,
  });

  if (error) throw error;
  return { data, ref: { ...reference, path: normalizedPath } };
}

export async function getDownloadURL(reference: StorageRef) {
  const normalizedPath = extractPath(reference.path, reference.bucket);
  const { data } = storage.from(reference.bucket).getPublicUrl(normalizedPath);
  return data.publicUrl;
}

export async function deleteObject(reference: StorageRef) {
  const normalizedPath = extractPath(reference.path, reference.bucket);
  const { error } = await storage.from(reference.bucket).remove([normalizedPath]);
  if (error) throw error;
}
