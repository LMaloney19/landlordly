export const EXPENSE_RECEIPT_BUCKET = "expense-receipts";

export const EXPENSE_RECEIPT_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,image/*,application/pdf";

export const EXPENSE_RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

export function buildExpenseReceiptPath(
  userId: string,
  expenseId: string,
  fileName: string,
) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${expenseId}/${safeName}`;
}

export function isImageMimeType(mimeType: string | null) {
  return mimeType?.startsWith("image/") ?? false;
}
