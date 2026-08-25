import { Borrower, LoanProduct, Loan, ScheduleItem, Transaction, DashboardStats } from '../types';

// Mock initial data state for web preview & testing fallback
let mockBorrowers: Borrower[] = [
  {
    id: 1,
    first_name: 'Alice',
    last_name: 'Smith',
    email: 'alice.smith@example.com',
    phone: '+1 555-0192',
    national_id: 'ID-982341',
    address: '123 Main St, Springfield',
    credit_score: 740,
    status: 'Active',
    created_at: '2026-01-10',
  },
  {
    id: 2,
    first_name: 'Robert',
    last_name: 'Johnson',
    email: 'robert.j@example.com',
    phone: '+1 555-0144',
    national_id: 'ID-482019',
    address: '456 Oak Ave, Metropolis',
    credit_score: 680,
    status: 'Active',
    created_at: '2026-01-15',
  },
  {
    id: 3,
    first_name: 'Elena',
    last_name: 'Rostova',
    email: 'elena.r@example.com',
    phone: '+1 555-0188',
    national_id: 'ID-730192',
    address: '789 Pine Rd, Gotham',
    credit_score: 810,
    status: 'Active',
    created_at: '2026-01-20',
  },
];

let mockLoanProducts: LoanProduct[] = [
  {
    id: 1,
    name: 'Micro Business Loan',
    code: 'MBL-01',
    description: 'Working capital loan for small enterprise owners',
    interest_method: 'REDUCING_BALANCE',
    annual_interest_rate: 12.0,
    min_amount: 500.0,
    max_amount: 10000.0,
    min_term_months: 3,
    max_term_months: 24,
    payment_frequency: 'MONTHLY',
    origination_fee_percent: 1.5,
    late_fee_percent: 2.0,
    grace_period_days: 5,
    created_at: '2026-01-01',
  },
  {
    id: 2,
    name: 'Personal Emergency Loan',
    code: 'PEL-01',
    description: 'Quick access flat-rate loan for emergency needs',
    interest_method: 'FLAT_RATE',
    annual_interest_rate: 15.0,
    min_amount: 100.0,
    max_amount: 2000.0,
    min_term_months: 1,
    max_term_months: 12,
    payment_frequency: 'MONTHLY',
    origination_fee_percent: 1.0,
    late_fee_percent: 3.0,
    grace_period_days: 3,
    created_at: '2026-01-01',
  },
  {
    id: 3,
    name: 'Agricultural Harvest Loan',
    code: 'AHL-01',
    description: 'Bullet principal repayment loan aligned with harvest season',
    interest_method: 'INTEREST_ONLY',
    annual_interest_rate: 10.0,
    min_amount: 1000.0,
    max_amount: 25000.0,
    min_term_months: 6,
    max_term_months: 12,
    payment_frequency: 'MONTHLY',
    origination_fee_percent: 2.0,
    late_fee_percent: 2.5,
    grace_period_days: 7,
    created_at: '2026-01-01',
  },
];

let mockLoans: Loan[] = [
  {
    id: 1,
    borrower_id: 1,
    loan_product_id: 1,
    loan_number: 'LN-20260201-001',
    principal_amount: 5000.0,
    annual_interest_rate: 12.0,
    interest_method: 'REDUCING_BALANCE',
    term_months: 12,
    payment_frequency: 'MONTHLY',
    origination_fee: 75.0,
    status: 'ACTIVE',
    application_date: '2026-02-01',
    approval_date: '2026-02-02',
    disbursement_date: '2026-02-03',
    maturity_date: '2027-02-03',
    notes: 'Approved for grocery store inventory expansion.',
    created_at: '2026-02-01',
    borrower_name: 'Alice Smith',
    product_name: 'Micro Business Loan',
    total_interest: 328.0,
    total_payable: 5328.0,
    amount_paid: 888.0,
    balance_remaining: 4440.0,
  },
  {
    id: 2,
    borrower_id: 2,
    loan_product_id: 2,
    loan_number: 'LN-20260210-002',
    principal_amount: 1200.0,
    annual_interest_rate: 15.0,
    interest_method: 'FLAT_RATE',
    term_months: 6,
    payment_frequency: 'MONTHLY',
    origination_fee: 12.0,
    status: 'PENDING_APPROVAL',
    application_date: '2026-02-10',
    notes: 'Emergency home repairs.',
    created_at: '2026-02-10',
    borrower_name: 'Robert Johnson',
    product_name: 'Personal Emergency Loan',
    total_interest: 90.0,
    total_payable: 1290.0,
    amount_paid: 0.0,
    balance_remaining: 1290.0,
  },
];

let mockSchedules: Record<number, ScheduleItem[]> = {
  1: Array.from({ length: 12 }, (_, index) => {
    const inst = index + 1;
    const isPaid = inst <= 2;
    return {
      id: index + 1,
      loan_id: 1,
      installment_number: inst,
      due_date: `2026-0${Math.min(inst + 2, 9)}-03`,
      principal_due: 400.0,
      interest_due: 44.0,
      fee_due: 0.0,
      total_installment: 444.0,
      principal_paid: isPaid ? 400.0 : 0.0,
      interest_paid: isPaid ? 44.0 : 0.0,
      fee_paid: 0.0,
      status: isPaid ? 'PAID' : 'PENDING',
      paid_date: isPaid ? `2026-0${inst + 2}-03` : undefined,
    };
  }),
};

let mockTransactions: Transaction[] = [
  {
    id: 1,
    loan_id: 1,
    receipt_number: 'REC-20260303-01',
    transaction_date: '2026-03-03',
    amount: 444.0,
    principal_component: 400.0,
    interest_component: 44.0,
    fee_component: 0.0,
    payment_method: 'BANK_TRANSFER',
    reference: 'TXN-99812',
    notes: 'Installment #1 payment',
  },
  {
    id: 2,
    loan_id: 1,
    receipt_number: 'REC-20260403-02',
    transaction_date: '2026-04-03',
    amount: 444.0,
    principal_component: 400.0,
    interest_component: 44.0,
    fee_component: 0.0,
    payment_method: 'MOBILE_MONEY',
    reference: 'MP-88210',
    notes: 'Installment #2 payment',
  },
];

const isTauri = () => typeof window !== 'undefined' && '__TAURI_IPC__' in window;

async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<T>(command, args);
    } else {
      // Return mock fallback for dev server browser preview
      return await mockInvokeFallback<T>(command, args);
    }
  } catch (err) {
    console.error(`API command '${command}' failed:`, err);
    throw err;
  }
}

function mockInvokeFallback<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      switch (command) {
        case 'get_borrowers':
          resolve(mockBorrowers as unknown as T);
          break;
        case 'create_borrower_cmd': {
          const b = args?.borrower as Borrower;
          const newB = { ...b, id: mockBorrowers.length + 1, created_at: new Date().toISOString() };
          mockBorrowers.unshift(newB);
          resolve(newB.id as unknown as T);
          break;
        }
        case 'update_borrower_cmd': {
          const b = args?.borrower as Borrower;
          mockBorrowers = mockBorrowers.map((item) => (item.id === b.id ? b : item));
          resolve(undefined as unknown as T);
          break;
        }
        case 'delete_borrower_cmd': {
          const id = args?.id as number;
          mockBorrowers = mockBorrowers.filter((item) => item.id !== id);
          resolve(undefined as unknown as T);
          break;
        }
        case 'get_loan_products_cmd':
          resolve(mockLoanProducts as unknown as T);
          break;
        case 'create_loan_product_cmd': {
          const p = args?.product as LoanProduct;
          const newP = { ...p, id: mockLoanProducts.length + 1, created_at: new Date().toISOString() };
          mockLoanProducts.unshift(newP);
          resolve(newP.id as unknown as T);
          break;
        }
        case 'update_loan_product_cmd': {
          const p = args?.product as LoanProduct;
          mockLoanProducts = mockLoanProducts.map((item) => (item.id === p.id ? p : item));
          resolve(undefined as unknown as T);
          break;
        }
        case 'delete_loan_product_cmd': {
          const id = args?.id as number;
          mockLoanProducts = mockLoanProducts.filter((item) => item.id !== id);
          resolve(undefined as unknown as T);
          break;
        }
        case 'get_loans_cmd': {
          const filter = args?.status_filter as string | undefined;
          if (filter) {
            resolve(mockLoans.filter((l) => l.status === filter) as unknown as T);
          } else {
            resolve(mockLoans as unknown as T);
          }
          break;
        }
        case 'create_loan_cmd': {
          const loanData = args?.loan as Loan;
          const borrower = mockBorrowers.find((b) => b.id === loanData.borrower_id);
          const product = mockLoanProducts.find((p) => p.id === loanData.loan_product_id);
          const newId = mockLoans.length + 1;
          const newLoan: Loan = {
            ...loanData,
            id: newId,
            loan_number: `LN-${Date.now().toString().slice(-8)}`,
            status: 'PENDING_APPROVAL',
            borrower_name: borrower ? `${borrower.first_name} ${borrower.last_name}` : 'Unknown',
            product_name: product ? product.name : 'Unknown',
            total_interest: loanData.principal_amount * (loanData.annual_interest_rate / 100),
            total_payable: loanData.principal_amount * (1 + loanData.annual_interest_rate / 100),
            amount_paid: 0,
            balance_remaining: loanData.principal_amount * (1 + loanData.annual_interest_rate / 100),
          };
          mockLoans.unshift(newLoan);
          resolve(newId as unknown as T);
          break;
        }
        case 'update_loan_status_cmd': {
          const loanId = args?.loan_id as number;
          const status = args?.status as Loan['status'];
          mockLoans = mockLoans.map((l) => {
            if (l.id === loanId) {
              return { ...l, status };
            }
            return l;
          });
          resolve(undefined as unknown as T);
          break;
        }
        case 'get_loan_schedule_cmd': {
          const loanId = args?.loan_id as number;
          resolve((mockSchedules[loanId] || []) as unknown as T);
          break;
        }
        case 'get_loan_transactions_cmd': {
          const loanId = args?.loan_id as number;
          resolve(mockTransactions.filter((t) => t.loan_id === loanId) as unknown as T);
          break;
        }
        case 'record_repayment_cmd': {
          const loanId = args?.loan_id as number;
          const amount = args?.amount as number;
          const payment_method = args?.payment_method as Transaction['payment_method'];
          const reference = args?.reference as string;
          const notes = args?.notes as string;

          const newTx: Transaction = {
            id: mockTransactions.length + 1,
            loan_id: loanId,
            receipt_number: `REC-${Date.now().toString().slice(-8)}`,
            transaction_date: new Date().toISOString().split('T')[0],
            amount,
            principal_component: amount * 0.9,
            interest_component: amount * 0.1,
            fee_component: 0,
            payment_method,
            reference,
            notes,
            created_at: new Date().toISOString(),
          };
          mockTransactions.unshift(newTx);

          mockLoans = mockLoans.map((l) => {
            if (l.id === loanId) {
              const paid = (l.amount_paid || 0) + amount;
              const rem = Math.max(0, (l.total_payable || l.principal_amount) - paid);
              return { ...l, amount_paid: paid, balance_remaining: rem, status: rem === 0 ? 'CLOSED' : l.status };
            }
            return l;
          });

          resolve(newTx as unknown as T);
          break;
        }
        case 'get_dashboard_stats_cmd': {
          const stats: DashboardStats = {
            total_borrowers: mockBorrowers.length,
            total_active_loans: mockLoans.filter((l) => l.status === 'ACTIVE').length,
            total_portfolio_value: mockLoans.reduce((sum, l) => sum + l.principal_amount, 0),
            total_outstanding_balance: mockLoans.reduce((sum, l) => sum + (l.balance_remaining || 0), 0),
            total_collected_revenue: mockTransactions.reduce((sum, t) => sum + t.amount, 0),
            par_30: 2.5,
            overdue_loans_count: mockLoans.filter((l) => l.status === 'OVERDUE').length,
            pending_approvals_count: mockLoans.filter((l) => l.status === 'PENDING_APPROVAL').length,
          };
          resolve(stats as unknown as T);
          break;
        }
        case 'calculate_preview_schedule_cmd': {
          const principal = Math.max(0, (args?.principal as number) || 0);
          const rate = Math.max(0, (args?.annual_rate as number) || 0);
          const term = Math.max(0, (args?.term_months as number) || 0);
          const method = (args?.interest_method as string) || 'FLAT_RATE';
          const items: ScheduleItem[] = [];

          if (principal <= 0 || term <= 0) {
            resolve(items as unknown as T);
            break;
          }

          const monthlyPrincipal = principal / term;
          const monthlyInterest = (principal * (rate / 100)) / 12;

          for (let i = 1; i <= term; i++) {
            const pDue = method === 'INTEREST_ONLY' ? (i === term ? principal : 0) : monthlyPrincipal;
            const iDue = monthlyInterest;
            items.push({
              loan_id: 0,
              installment_number: i,
              due_date: new Date(Date.now() + i * 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
              principal_due: Math.round(pDue * 100) / 100,
              interest_due: Math.round(iDue * 100) / 100,
              fee_due: 0,
              total_installment: Math.round((pDue + iDue) * 100) / 100,
              principal_paid: 0,
              interest_paid: 0,
              fee_paid: 0,
              status: 'PENDING',
            });
          }
          resolve(items as unknown as T);
          break;
        }
        default:
          resolve([] as unknown as T);
      }
    }, 150);
  });
}

export const api = {
  getBorrowers: () => invokeTauri<Borrower[]>('get_borrowers'),
  createBorrower: (borrower: Borrower) => invokeTauri<number>('create_borrower_cmd', { borrower }),
  updateBorrower: (borrower: Borrower) => invokeTauri<void>('update_borrower_cmd', { borrower }),
  deleteBorrower: (id: number) => invokeTauri<void>('delete_borrower_cmd', { id }),

  getLoanProducts: () => invokeTauri<LoanProduct[]>('get_loan_products_cmd'),
  createLoanProduct: (product: LoanProduct) => invokeTauri<number>('create_loan_product_cmd', { product }),
  updateLoanProduct: (product: LoanProduct) => invokeTauri<void>('update_loan_product_cmd', { product }),
  deleteLoanProduct: (id: number) => invokeTauri<void>('delete_loan_product_cmd', { id }),

  getLoans: (status_filter?: string) => invokeTauri<Loan[]>('get_loans_cmd', { status_filter }),
  createLoan: (loan: Loan) => invokeTauri<number>('create_loan_cmd', { loan }),
  updateLoanStatus: (loan_id: number, status: string, notes?: string) => invokeTauri<void>('update_loan_status_cmd', { loan_id, status, notes }),

  getLoanSchedule: (loan_id: number) => invokeTauri<ScheduleItem[]>('get_loan_schedule_cmd', { loan_id }),
  getLoanTransactions: (loan_id: number) => invokeTauri<Transaction[]>('get_loan_transactions_cmd', { loan_id }),
  recordRepayment: (loan_id: number, amount: number, payment_method: string, reference: string, notes: string) =>
    invokeTauri<Transaction>('record_repayment_cmd', { loan_id, amount, payment_method, reference, notes }),

  getDashboardStats: () => invokeTauri<DashboardStats>('get_dashboard_stats_cmd'),
  calculatePreviewSchedule: (principal: number, annual_rate: number, term_months: number, interest_method: string, start_date: string) =>
    invokeTauri<ScheduleItem[]>('calculate_preview_schedule_cmd', { principal, annual_rate, term_months, interest_method, start_date }),
};
