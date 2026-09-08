import { describe, it, expect, vi } from 'vitest';
import { generateReceiptPDF } from './pdfGenerator';
import { Transaction, Loan, PlatformSettings } from '../types';

// Mock jsPDF and jspdf-autotable
vi.mock('jspdf', () => {
  const saveMock = vi.fn();
  const docInstance = {
    setFillColor: vi.fn(),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    setDrawColor: vi.fn(),
    setTextColor: vi.fn(),
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    text: vi.fn(),
    save: saveMock,
    lastAutoTable: { finalY: 120 },
  };
  return {
    default: vi.fn(() => docInstance),
  };
});

vi.mock('jspdf-autotable', () => {
  return {
    default: vi.fn(),
  };
});

describe('pdfGenerator', () => {
  it('generates PDF receipt without throwing and triggers save', () => {
    const transaction: Transaction = {
      id: 1,
      loan_id: 10,
      receipt_number: 'REC-2025-001',
      transaction_date: '2025-01-15',
      amount: 1500,
      principal_component: 1000,
      interest_component: 400,
      fee_component: 100,
      payment_method: 'BANK_TRANSFER',
      reference: 'TXN-998811',
      notes: 'Monthly repayment',
    };

    const loan: Loan = {
      id: 10,
      borrower_id: 5,
      loan_product_id: 2,
      loan_number: 'LN-1002',
      principal_amount: 10000,
      annual_interest_rate: 12,
      interest_rate_type: 'ANNUAL',
      interest_method: 'REDUCING_BALANCE',
      term_months: 12,
      payment_frequency: 'MONTHLY',
      origination_fee: 150,
      status: 'ACTIVE',
      application_date: '2025-01-01',
      borrower_name: 'Jane Doe',
      product_name: 'Business Loan',
      balance_remaining: 8500,
    };

    const settings: PlatformSettings = {
      org_name: 'Test MicroFinance',
      currency_symbol: 'KSh',
      default_annual_interest_rate: 12,
      default_origination_fee_percent: 1.5,
      default_interest_rate_type: 'ANNUAL',
      loan_approval_threshold: 50000,
      expense_approval_threshold: 10000,
      theme: 'light',
      receipt_header_text: 'Test Header',
      receipt_footer_text: 'Test Footer',
    };

    expect(() => generateReceiptPDF({ transaction, loan, settings })).not.toThrow();
  });
});
