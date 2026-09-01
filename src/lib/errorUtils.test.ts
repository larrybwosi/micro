import { describe, it, expect } from 'vitest';
import { parseApiError } from './errorUtils';

describe('errorUtils', () => {
  it('returns default message for null or empty error', () => {
    expect(parseApiError(null)).toBe('An unknown error occurred.');
    expect(parseApiError(undefined)).toBe('An unknown error occurred.');
  });

  it('parses SQLite unique constraint for borrowers national_id', () => {
    const rawError = 'Error: UNIQUE constraint failed: borrowers.national_id';
    const parsed = parseApiError(rawError);
    expect(parsed).toBe('A borrower with this National ID or Passport number already exists in the database.');
  });

  it('parses SQLite unique constraint for users username', () => {
    const rawError = 'UNIQUE constraint failed: users.username';
    const parsed = parseApiError(rawError);
    expect(parsed).toBe('This username is already taken. Please enter a different username.');
  });

  it('parses SQLite unique constraint for loan products code', () => {
    const rawError = 'UNIQUE constraint failed: loan_products.code';
    const parsed = parseApiError(rawError);
    expect(parsed).toBe('A loan product with this product code already exists. Please enter a unique code.');
  });

  it('parses SQLite unique constraint for loans loan_number', () => {
    const rawError = 'UNIQUE constraint failed: loans.loan_number';
    const parsed = parseApiError(rawError);
    expect(parsed).toBe('A loan with this loan number already exists in the system.');
  });

  it('passes through standard error messages unchanged if not unique constraint', () => {
    const msg = 'Network timeout while reaching server';
    expect(parseApiError(new Error(msg))).toBe(msg);
  });
});
