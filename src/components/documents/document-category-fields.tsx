"use client";

import type { DocumentCategory } from "@/types";

const fieldClass =
  "mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200";

type DocumentCategoryFieldsProps = {
  category: DocumentCategory;
  categoryOther: string;
  onCategoryChange: (category: DocumentCategory) => void;
  onCategoryOtherChange: (value: string) => void;
  disabled?: boolean;
};

export function DocumentCategoryFields({
  category,
  categoryOther,
  onCategoryChange,
  onCategoryOtherChange,
  disabled = false,
}: DocumentCategoryFieldsProps) {
  return (
    <>
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Category</span>
        <select
          value={category}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value as DocumentCategory;
            onCategoryChange(next);
            if (next !== "other") {
              onCategoryOtherChange("");
            }
          }}
          className={fieldClass}
        >
          <option value="lease">Lease</option>
          <option value="receipt">Receipt</option>
          <option value="inspection">Inspection</option>
          <option value="other">Other</option>
        </select>
      </label>

      {category === "other" ? (
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">
            What type of document is this?
          </span>
          <input
            type="text"
            value={categoryOther}
            disabled={disabled}
            onChange={(event) => onCategoryOtherChange(event.target.value)}
            placeholder="e.g. Insurance policy, HOA notice"
            className={fieldClass}
          />
        </label>
      ) : null}
    </>
  );
}
