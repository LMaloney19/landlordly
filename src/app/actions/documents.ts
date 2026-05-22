"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/supabase/get-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  categoryOtherValidationError,
  DOCUMENT_BUCKET,
  DOCUMENT_SELECT,
  normalizeCategoryOther,
  rowToDocument,
  type DocumentRow,
} from "@/lib/documents";
import type { Document, DocumentCategory } from "@/types";
import type { ActionResult } from "@/app/actions/properties";

export type DocumentInput = {
  propertyId?: string;
  unitLabel?: string;
  tenantId?: string;
  name: string;
  filePath: string;
  category: DocumentCategory;
  categoryOther?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type DocumentUpdateInput = {
  id: string;
  name: string;
  category: DocumentCategory;
  categoryOther?: string;
  propertyId?: string | null;
  unitLabel?: string;
  tenantId?: string;
};

export async function getDocuments(): Promise<ActionResult<Document[]>> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase is not configured. Add keys to .env.local.",
    };
  }

  const supabase = await createClient();

  const user = await getServerUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: (data as DocumentRow[])
      .filter((document) => !document.archived_at)
      .map(rowToDocument),
  };
}

export async function saveDocument(
  input: DocumentInput,
): Promise<ActionResult<Document>> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase is not configured. Add keys to .env.local.",
    };
  }

  const supabase = await createClient();

  const user = await getServerUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const unitLabel = input.unitLabel?.trim() || null;
  const tenantId = input.tenantId?.trim() || null;
  const categoryOther = normalizeCategoryOther(input.category, input.categoryOther);
  const categoryError = categoryOtherValidationError(input.category, categoryOther);
  if (categoryError) {
    return { success: false, error: categoryError };
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      property_id: input.propertyId || null,
      unit_label: unitLabel,
      tenant_id: tenantId,
      name: input.name.trim(),
      file_path: input.filePath,
      category: input.category,
      category_other: categoryOther,
      mime_type: input.mimeType ?? null,
      size_bytes: input.sizeBytes ?? null,
    })
    .select(DOCUMENT_SELECT)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/documents");

  return { success: true, data: rowToDocument(data as DocumentRow) };
}

export async function updateDocument(
  input: DocumentUpdateInput,
): Promise<ActionResult<Document>> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase is not configured. Add keys to .env.local.",
    };
  }

  const supabase = await createClient();

  const user = await getServerUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "Document name is required." };
  }

  const propertyId = input.propertyId?.trim() || null;
  const unitLabel = propertyId ? input.unitLabel?.trim() || null : null;
  const tenantId = propertyId ? input.tenantId?.trim() || null : null;
  const categoryOther = normalizeCategoryOther(input.category, input.categoryOther);
  const categoryError = categoryOtherValidationError(input.category, categoryOther);
  if (categoryError) {
    return { success: false, error: categoryError };
  }

  const { data, error } = await supabase
    .from("documents")
    .update({
      name,
      category: input.category,
      category_other: categoryOther,
      property_id: propertyId,
      unit_label: unitLabel,
      tenant_id: tenantId,
    })
    .eq("id", input.id)
    .eq("user_id", user.id)
    .select(DOCUMENT_SELECT)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/documents");

  return { success: true, data: rowToDocument(data as DocumentRow) };
}

export async function deleteDocument(id: string): Promise<ActionResult<null>> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase is not configured. Add keys to .env.local.",
    };
  }

  const supabase = await createClient();

  const user = await getServerUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("documents")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      success: false,
      error: error.message.includes("archived_at")
        ? "Archive column missing. Run supabase/migrations/20250515900000_archive_records.sql in Supabase."
        : error.message,
    };
  }

  revalidatePath("/documents");

  return { success: true, data: null };
}

export async function getDocumentDownloadUrl(
  filePath: string,
): Promise<ActionResult<string>> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase is not configured. Add keys to .env.local.",
    };
  }

  const supabase = await createClient();

  const user = await getServerUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(filePath, 60 * 60);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data.signedUrl };
}
