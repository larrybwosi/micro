/**
 * Parses raw API/database error messages into user-friendly notifications,
 * especially handling SQLite UNIQUE constraint violations.
 */
export function parseApiError(err: unknown): string {
  if (!err) return 'An unknown error occurred.';

  const message = typeof err === 'string' ? err : (err as Error).message || String(err);

  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('unique constraint failed') || lowerMsg.includes('is not unique')) {
    if (lowerMsg.includes('borrowers.national_id')) {
      return 'A borrower with this National ID or Passport number already exists in the database.';
    }
    if (lowerMsg.includes('users.username')) {
      return 'This username is already taken. Please enter a different username.';
    }
    if (lowerMsg.includes('loan_products.code')) {
      return 'A loan product with this product code already exists. Please enter a unique code.';
    }
    if (lowerMsg.includes('loans.loan_number')) {
      return 'A loan with this loan number already exists in the system.';
    }
    if (lowerMsg.includes('transactions.receipt_number')) {
      return 'A transaction receipt with this receipt number already exists.';
    }
    return 'A duplicate entry error occurred. A record with one of these unique values already exists.';
  }

  return message;
}
