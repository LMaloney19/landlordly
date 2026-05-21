"use client";

import { Camera, FileUp, X } from "lucide-react";
import { useRef } from "react";
import {
  EXPENSE_RECEIPT_ACCEPT,
  EXPENSE_RECEIPT_MAX_BYTES,
} from "@/lib/expense-receipts";
import { cn } from "@/lib/utils";

type ExpenseReceiptFieldProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  error?: string | null;
};

function formatFileLabel(file: File) {
  if (file.type.startsWith("image/")) return "Photo";
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return "PDF";
  }
  return "File";
}

export function ExpenseReceiptField({
  file,
  onFileChange,
  disabled = false,
  error,
}: ExpenseReceiptFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function handleSelected(next: File | null) {
    if (!next) {
      onFileChange(null);
      return;
    }

    if (next.size > EXPENSE_RECEIPT_MAX_BYTES) {
      onFileChange(null);
      return;
    }

    onFileChange(next);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-zinc-700">Receipt or invoice</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Photo, PDF, or image file — max 10 MB. Use your camera on phone or laptop.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={EXPENSE_RECEIPT_ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          handleSelected(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          handleSelected(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />

      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900">{file.name}</p>
            <p className="text-xs text-zinc-500">
              {formatFileLabel(file)} · {(file.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onFileChange(null)}
            className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 disabled:opacity-50"
            aria-label="Remove receipt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700",
              "hover:bg-zinc-50 disabled:opacity-50",
            )}
          >
            <FileUp className="h-4 w-4" aria-hidden />
            Upload file
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => cameraInputRef.current?.click()}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700",
              "hover:bg-zinc-50 disabled:opacity-50",
            )}
          >
            <Camera className="h-4 w-4" aria-hidden />
            Take photo
          </button>
        </div>
      )}

      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
