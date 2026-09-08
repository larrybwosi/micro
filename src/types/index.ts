export interface Borrower {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  national_id: string;
  address: string;
  credit_score: number;
  status: 'Active' | 'Pending' | 'Blacklisted';
  created_at?: string;
}

export interface LoanProduct {
  id?: number;
  name: string;
  code: string;
  description: string;
  interest_method: 'FLAT_RATE' | 'REDUCING_BALANCE' | 'INTEREST_ONLY';
  annual_interest_rate: number;
  interest_rate_type: 'ANNUAL' | 'MONTHLY';
  min_amount: number;
  max_amount: number;
  min_term_months: number;
  max_term_months: number;
  payment_frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  origination_fee_percent: number;
  late_fee_percent: number;
  grace_period_days: number;
  created_at?: string;
}

export interface Loan {
  id?: number;
  borrower_id: number;
  loan_product_id: number;
  loan_number: string;
  principal_amount: number;
  annual_interest_rate: number;
  interest_rate_type: 'ANNUAL' | 'MONTHLY';
  interest_method: 'FLAT_RATE' | 'REDUCING_BALANCE' | 'INTEREST_ONLY';
  term_months: number;
  payment_frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  origination_fee: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'DISBURSED' | 'ACTIVE' | 'OVERDUE' | 'CLOSED' | 'WRITTEN_OFF';
  application_date: string;
  approval_date?: string;
  disbursement_date?: string;
  maturity_date?: string;
  notes?: string;
  created_at?: string;
  borrower_name?: string;
  product_name?: string;
  total_interest?: number;
  total_payable?: number;
  amount_paid?: number;
  balance_remaining?: number;
}

export interface Expense {
  id?: number;
  category: 'OFFICE_SUPPLIES' | 'RENT' | 'UTILITIES' | 'SALARIES' | 'TRAVEL' | 'PETTY_CASH_TOPUP' | 'MISC';
  description: string;
  amount: number;
  expense_date: string;
  payment_method: 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CHECK';
  reference?: string;
  status: 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED';
  created_by?: string;
  approved_by?: string;
  created_at?: string;
}

export interface PettyCashSummary {
  total_topup: number;
  total_cash_spent: number;
  current_balance: number;
}

export interface ScheduleItem {
  id?: number;
  loan_id: number;
  installment_number: number;
  due_date: string;
  principal_due: number;
  interest_due: number;
  fee_due: number;
  total_installment: number;
  principal_paid: number;
  interest_paid: number;
  fee_paid: number;
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE';
  paid_date?: string;
}

export interface Transaction {
  id?: number;
  loan_id: number;
  receipt_number: string;
  transaction_date: string;
  amount: number;
  principal_component: number;
  interest_component: number;
  fee_component: number;
  payment_method: 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CHECK';
  reference: string;
  notes: string;
  created_at?: string;
}

export interface User {
  id?: number;
  username: string;
  password?: string;
  full_name: string;
  role: 'ADMIN' | 'USER';
  status: 'Active' | 'Inactive';
  created_at?: string;
}

export interface PlatformSettings {
  org_name: string;
  currency_symbol: string;
  default_annual_interest_rate: number;
  default_origination_fee_percent: number;
  default_interest_rate_type: 'ANNUAL' | 'MONTHLY';
  loan_approval_threshold: number;
  expense_approval_threshold: number;
  theme: 'light' | 'dark' | 'system';
}

export interface DashboardStats {
  total_borrowers: number;
  total_active_loans: number;
  total_portfolio_value: number;
  total_outstanding_balance: number;
  total_collected_revenue: number;
  par_30: number;
  overdue_loans_count: number;
  pending_approvals_count: number;
}

export interface SyncStatus {
  mode: 'OFFLINE' | 'HUB' | 'SPOKE' | 'API';
  local_ip: string;
  port: number;
  pairing_code: string;
  hub_ip?: string;
  auth_token?: string;
  paired_devices: string[];
  last_synced_at?: string;
  is_connected: boolean;
  error_message?: string;
}
