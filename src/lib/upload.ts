import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * Subida de imágenes. Único lugar del proyecto que toca el almacenamiento.
 *
 * - Producción: Supabase Storage (bucket público `uploads`), usando la
 *   service_role key desde el servidor. Nunca se expone al cliente.
 * - Desarrollo sin credenciales de Supabase: cae a /public/uploads en disco.
 */
const BUCKET = "uploads";
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/heic", "heic"],
  ["image/heif", "heif"],
]);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const useSupabase = Boolean(SUPABASE_URL && SERVICE_KEY);

const LOCAL_DIR = path.join(process.cwd(), "public", "uploads");

function storage() {
  return createClient(SUPABASE_URL!, SERVICE_KEY!, { auth: { persistSession: false } }).storage.from(BUCKET);
}

function validate(file: File): string {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) {
    throw new Error("Archivo inválido.");
  }
  if (file.size > MAX_BYTES) throw new Error("La imagen supera los 8 MB.");
  const ext = ALLOWED.get(file.type);
  if (!ext) throw new Error("Formato no permitido. Subí una imagen JPG, PNG, WEBP o HEIC.");
  return ext;
}

/** Guarda una imagen y devuelve su URL pública. */
export async function saveImage(file: File): Promise<string> {
  const ext = validate(file);
  const name = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (useSupabase) {
    const { error } = await storage().upload(name, buffer, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
    return storage().getPublicUrl(name).data.publicUrl;
  }

  // Fallback local (desarrollo).
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, name), buffer);
  return `/uploads/${name}`;
}

/** Versión tolerante: devuelve null en vez de lanzar (para lotes). */
export async function trySaveImage(file: File): Promise<string | null> {
  try {
    return await saveImage(file);
  } catch {
    return null;
  }
}

/**
 * Adjuntos de una solicitud: imágenes + PDF y documentos.
 *
 * A diferencia de `saveImage`, acepta también archivos (para que el cliente
 * mande planos, presupuestos, etc.) y conserva el nombre y el tipo original,
 * que la solicitud guarda para mostrarlos.
 */
export type Attachment = { url: string; name: string; type: "image" | "file" };

const ATTACHMENT_MAX = 15 * 1024 * 1024; // 15 MB
const ATTACHMENT_EXT = new Map<string, string>([
  ...ALLOWED,
  ["application/pdf", "pdf"],
  ["application/msword", "doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["application/vnd.ms-excel", "xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
  ["text/plain", "txt"],
]);

/** Guarda un adjunto (imagen o documento). Devuelve null si no es válido. */
export async function saveAttachment(file: File): Promise<Attachment | null> {
  try {
    if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) return null;
    if (file.size > ATTACHMENT_MAX) return null;
    const ext = ATTACHMENT_EXT.get(file.type);
    if (!ext) return null;

    const stored = `${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const kind: Attachment["type"] = file.type.startsWith("image/") ? "image" : "file";
    // Nombre para mostrar: el original, saneado.
    const shown = (file.name || `archivo.${ext}`).replace(/[\r\n"]/g, "").slice(0, 120);

    let url: string;
    if (useSupabase) {
      const { error } = await storage().upload(stored, buffer, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) return null;
      url = storage().getPublicUrl(stored).data.publicUrl;
    } else {
      await mkdir(LOCAL_DIR, { recursive: true });
      await writeFile(path.join(LOCAL_DIR, stored), buffer);
      url = `/uploads/${stored}`;
    }
    return { url, name: shown, type: kind };
  } catch {
    return null;
  }
}

/** Borra una imagen subida por la app (best-effort). Ignora URLs externas. */
export async function deleteUpload(url: string): Promise<void> {
  if (!url) return;
  const name = url.split("/").pop();
  if (!name) return;

  if (useSupabase && url.includes(`/${BUCKET}/`)) {
    await storage().remove([name]);
    return;
  }
  if (url.startsWith("/uploads/")) {
    try {
      await unlink(path.join(LOCAL_DIR, name));
    } catch {
      /* ya no existe */
    }
  }
}
