"use client";

import { Camera, FileUp, X } from "lucide-react";
import { useRef, useState } from "react";
import { ExpenseCameraCapture } from "@/components/expenses/expense-camera-capture";
import {
  EXPENSE_RECEIPT_ACCEPT,
  EXPENSE_RECEIPT_MAX_BYTES,
} from "@/lib/expense-receipts";
import { cn } from "@/lib/utils";

type ExpenseReceiptFieldProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  existingReceipt?: { fileName: string | null } | null;
  clearExisting?: boolean;
  onClearExisting?: () => void;
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
  existingReceipt,
  clearExisting = false,
  onClearExisting,
  disabled = false,
  error,
}: ExpenseReceiptFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSelected(next: File | null) {
    setLocalError(null);
    if (!next) {
      onFileChange(null);
      return;
    }

    if (next.size > EXPENSE_RECEIPT_MAX_BYTES) {
      setLocalError("File must be 10 MB or smaller.");
      onFileChange(null);
      return;
    }

    onFileChange(next);
  }

  const showExisting =
    existingReceipt && !clearExisting && !file;

  return (
    <div className="space-y-3">
      <ExpenseCameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleSelected}
      />

      <div>
        <p className="text-sm font-medium text-zinc-700">Receipt or invoice</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Photo, PDF, or image file — max 10 MB. Take photo uses your device camera.
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

      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900">{file.name}</p>
            <p className="text-xs text-zinc-500">
              {formatFileLabel(file)} · {(file.size / 1024).toFixed(0)} KB
              {showExisting ? " · replaces current receipt" : ""}
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
      ) : showExisting ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-900">Receipt attached</p>
            <p className="truncate text-xs text-emerald-700">
              {existingReceipt.fileName ?? "Saved receipt"}
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={onClearExisting}
            className="shrink-0 text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : null}

      {!file && (!showExisting || clearExisting) ? (
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
            onClick={() => setCameraOpen(true)}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700",
              "hover:bg-zinc-50 disabled:opacity-50",
            )}
          >
            <Camera className="h-4 w-4" aria-hidden />
            Take photo
          </button>
        </div>
      ) : !file && showExisting ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <FileUp className="h-4 w-4" aria-hidden />
            Replace file
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setCameraOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <Camera className="h-4 w-4" aria-hidden />
            New photo
          </button>
        </div>
      ) : null}

      {error || localError ? (
        <p className="text-xs text-red-600" role="alert">
          {error ?? localError}
        </p>
      ) : null}
    </div>
  );
}
