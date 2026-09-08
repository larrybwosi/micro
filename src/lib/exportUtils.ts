import { Borrower, Expense, Loan, Transaction } from '../types';
import { formatCurrency } from './utils';

/**
 * Escapes a single cell value for CSV output.
 * Prevents formula injection (=, +, -, @) and handles quotes, commas, and newlines.
 */
export function escapeCSVField(val: unknown): string {
  if (val === null || val === undefined) {
    return '""';
  }

  let str = String(val);

  // Formula injection defense: if a string starts with =, +, -, @, prepend single quote
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }

  // Escape double quotes by doubling them
  const escapedStr = str.replace(/"/g, '""');

  // Wrap in double quotes
  return `"${escapedStr}"`;
}

export interface CSVGenerationOptions {
  title?: string;
  orgName?: string;
  meta?: Record<string, string>;
  summaryRow?: (string | number | boolean | null | undefined)[];
}

/**
 * Generates a clean, UTF-8 BOM encoded CSV string with optional title headers and summary totals.
 */
export function generateCSV(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  options: CSVGenerationOptions = {}
): string {
  const lines: string[] = [];

  // UTF-8 BOM so Excel opens special characters correctly
  const BOM = '\uFEFF';

  // Optional Organization & Report Title Header Block
  if (options.orgName || options.title) {
    if (options.orgName) {
      lines.push(`${escapeCSVField(options.orgName)}`);
    }
    if (options.title) {
      lines.push(`${escapeCSVField(options.title)}`);
    }
    lines.push(`${escapeCSVField(`Generated Date: ${new Date().toLocaleString()}`)}`);

    if (options.meta) {
      Object.entries(options.meta).forEach(([key, value]) => {
        lines.push(`${escapeCSVField(`${key}: ${value}`)}`);
      });
    }

    lines.push(''); // Blank line before data table
  }

  // Column Headers
  lines.push(headers.map(escapeCSVField).join(','));

  // Data Rows
  rows.forEach((row) => {
    lines.push(row.map(escapeCSVField).join(','));
  });

  // Optional Summary Footer Row
  if (options.summaryRow && options.summaryRow.length > 0) {
    lines.push(''); // Blank separator line before summary
    lines.push(options.summaryRow.map(escapeCSVField).join(','));
  }

  return BOM + lines.join('\r\n');
}

/**
 * Triggers a browser download of a CSV file.
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Borrowers Directory as a structured CSV file.
 */
export function exportBorrowersCSV(borrowers: Borrower[], orgName = 'MicroFinance Systems'): void {
  const headers = [
    'Borrower ID',
    'First Name',
    'Last Name',
    'National ID / Passport',
    'Email Address',
    'Phone Number',
    'Residential Address',
    'Credit Score',
    'Status',
    'Registration Date',
  ];

  const rows = borrowers.map((b) => [
    b.id ?? '',
    b.first_name,
    b.last_name,
    b.national_id,
    b.email,
    b.phone,
    b.address,
    b.credit_score,
    b.status,
    b.created_at ? b.created_at.split('T')[0] : '',
  ]);

  const activeCount = borrowers.filter((b) => b.status === 'Active').length;
  const avgCreditScore = borrowers.length
    ? Math.round(borrowers.reduce((acc, b) => acc + b.credit_score, 0) / borrowers.length)
    : 0;

  const summaryRow = [
    'SUMMARY TOTALS',
    `Total Borrowers: ${borrowers.length}`,
    `Active Borrowers: ${activeCount}`,
    '',
    '',
    '',
    'Average Credit Score:',
    avgCreditScore,
    '',
    '',
  ];

  const csvContent = generateCSV(headers, rows, {
    title: 'Borrowers Directory & Credit Profiles Report',
    orgName,
    meta: {
      'Total Borrower Records': String(borrowers.length),
      'Active Borrowers': String(activeCount),
    },
    summaryRow,
  });

  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`borrowers_directory_${dateStr}.csv`, csvContent);
}

/**
 * Export Loan Portfolio as a structured CSV file.
 */
export function exportLoansCSV(loans: Loan[], orgName = 'MicroFinance Systems'): void {
  const headers = [
    'Loan Number',
    'Borrower Name',
    'Product Name',
    'Principal Amount',
    'Annual Rate (%)',
    'Interest Method',
    'Term (Months)',
    'Payment Frequency',
    'Origination Fee',
    'Total Payable',
    'Amount Paid',
    'Balance Remaining',
    'Status',
    'Application Date',
    'Approval Date',
    'Disbursement Date',
    'Maturity Date',
  ];

  const rows = loans.map((l) => [
    l.loan_number,
    l.borrower_name || '',
    l.product_name || '',
    l.principal_amount,
    l.annual_interest_rate,
    l.interest_method,
    l.term_months,
    l.payment_frequency,
    l.origination_fee || 0,
    l.total_payable || 0,
    l.amount_paid || 0,
    l.balance_remaining || 0,
    l.status,
    l.application_date || '',
    l.approval_date || '',
    l.disbursement_date || '',
    l.maturity_date || '',
  ]);

  const totalPrincipal = loans.reduce((sum, l) => sum + l.principal_amount, 0);
  const totalPayable = loans.reduce((sum, l) => sum + (l.total_payable || 0), 0);
  const totalPaid = loans.reduce((sum, l) => sum + (l.amount_paid || 0), 0);
  const totalBalance = loans.reduce((sum, l) => sum + (l.balance_remaining || 0), 0);

  const summaryRow = [
    'SUMMARY TOTALS',
    `Total Loans: ${loans.length}`,
    '',
    totalPrincipal,
    '',
    '',
    '',
    '',
    '',
    totalPayable,
    totalPaid,
    totalBalance,
    '',
    '',
    '',
    '',
    '',
  ];

  const csvContent = generateCSV(headers, rows, {
    title: 'Loan Portfolio & Financial Performance Report',
    orgName,
    meta: {
      'Total Loans Issued': String(loans.length),
      'Gross Portfolio Value': formatCurrency(totalPrincipal),
      'Total Amount Outstanding': formatCurrency(totalBalance),
    },
    summaryRow,
  });

  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`loan_portfolio_report_${dateStr}.csv`, csvContent);
}

/**
 * Export Repayments / Transactions as a structured CSV file.
 */
export function exportRepaymentsCSV(
  transactions: Transaction[],
  loans: Loan[],
  orgName = 'MicroFinance Systems'
): void {
  const loanMap = new Map<number, Loan>();
  loans.forEach((l) => {
    if (l.id) loanMap.set(l.id, l);
  });

  const headers = [
    'Receipt Number',
    'Payment Date',
    'Loan Number',
    'Borrower Name',
    'Payment Method',
    'Reference / Cheque No',
    'Total Amount Paid',
    'Principal Component',
    'Interest Component',
    'Fee Component',
    'Officer Notes',
  ];

  const rows = transactions.map((t) => {
    const loan = loanMap.get(t.loan_id);
    return [
      t.receipt_number,
      t.transaction_date,
      loan?.loan_number || `Loan #${t.loan_id}`,
      loan?.borrower_name || 'N/A',
      t.payment_method,
      t.reference,
      t.amount,
      t.principal_component,
      t.interest_component,
      t.fee_component,
      t.notes,
    ];
  });

  const totalPaid = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalPrincipal = transactions.reduce((sum, t) => sum + t.principal_component, 0);
  const totalInterest = transactions.reduce((sum, t) => sum + t.interest_component, 0);
  const totalFee = transactions.reduce((sum, t) => sum + t.fee_component, 0);

  const summaryRow = [
    'SUMMARY TOTALS',
    `Total Transactions: ${transactions.length}`,
    '',
    '',
    '',
    '',
    totalPaid,
    totalPrincipal,
    totalInterest,
    totalFee,
    '',
  ];

  const csvContent = generateCSV(headers, rows, {
    title: 'Repayments & Collection Voucher Log',
    orgName,
    meta: {
      'Total Transactions Recorded': String(transactions.length),
      'Total Cash Collected': formatCurrency(totalPaid),
    },
    summaryRow,
  });

  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`repayments_collections_${dateStr}.csv`, csvContent);
}

/**
 * Export Expenses & Petty Cash Ledger as a structured CSV file.
 */
export function exportExpensesCSV(expenses: Expense[], orgName = 'MicroFinance Systems'): void {
  const headers = [
    'Expense ID',
    'Date',
    'Category',
    'Description',
    'Amount',
    'Payment Method',
    'Reference / Receipt',
    'Status',
    'Created By',
    'Approved By',
  ];

  const rows = expenses.map((e) => [
    e.id ?? '',
    e.expense_date,
    e.category,
    e.description,
    e.amount,
    e.payment_method,
    e.reference || '',
    e.status,
    e.created_by || '',
    e.approved_by || '',
  ]);

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const summaryRow = [
    'SUMMARY TOTALS',
    `Total Expenses: ${expenses.length}`,
    '',
    '',
    totalAmount,
    '',
    '',
    '',
    '',
    '',
  ];

  const csvContent = generateCSV(headers, rows, {
    title: 'Expenses & Petty Cash Audit Ledger',
    orgName,
    meta: {
      'Total Expense Count': String(expenses.length),
      'Total Expenditure': formatCurrency(totalAmount),
    },
    summaryRow,
  });

  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`expenses_petty_cash_${dateStr}.csv`, csvContent);
}

/**
 * Export Comprehensive Audit & Financial Summary Report.
 */
export function exportCompleteFinancialReportCSV(
  loans: Loan[],
  borrowers: Borrower[],
  orgName = 'MicroFinance Systems'
): void {
  exportLoansCSV(loans, orgName);
}
