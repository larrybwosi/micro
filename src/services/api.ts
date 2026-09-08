import { Borrower, LoanProduct, Loan, ScheduleItem, Transaction, DashboardStats, User, PlatformSettings, SyncStatus } from '../types';

// Clean state for web preview & testing fallback
let mockBorrowers: Borrower[] = [];
let mockLoanProducts: LoanProduct[] = [];
let mockLoans: Loan[] = [];
let mockUsers: User[] = [
  {
    id: 1,
    username: 'admin',
    full_name: 'System Administrator',
    role: 'ADMIN',
    status: 'Active',
    created_at: new Date().toISOString(),
  },
];
let mockSettings: PlatformSettings = {
  org_name: 'MicroFinance Systems',
  currency_symbol: 'KSh',
  default_annual_interest_rate: 12.0,
  default_origination_fee_percent: 1.5,
  theme: 'light',
};
let mockSyncStatus: SyncStatus = {
  mode: 'OFFLINE',
  local_ip: '192.168.1.100',
  port: 8765,
  pairing_code: '849201',
  paired_devices: [],
  is_connected: false,
};
const mockSchedules: Record<number, ScheduleItem[]> = {};
const mockTransactions: Transaction[] = [];

const isTauri = () =>
  typeof window !== 'undefined' &&
  ('__TAURI_INTERNALS__' in window || '__TAURI_IPC__' in window || '__TAURI__' in window);

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
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      switch (command) {
        case 'get_borrowers':
          resolve(mockBorrowers as unknown as T);
          break;
        case 'create_borrower_cmd': {
          const b = args?.borrower as Borrower;
          if (mockBorrowers.some((item) => item.national_id.trim().toLowerCase() === b.national_id.trim().toLowerCase())) {
            reject(new Error('UNIQUE constraint failed: borrowers.national_id'));
            return;
          }
          const newB = { ...b, id: mockBorrowers.length + 1, created_at: new Date().toISOString() };
          mockBorrowers.unshift(newB);
          resolve(newB.id as unknown as T);
          break;
        }
        case 'update_borrower_cmd': {
          const b = args?.borrower as Borrower;
          if (mockBorrowers.some((item) => item.id !== b.id && item.national_id.trim().toLowerCase() === b.national_id.trim().toLowerCase())) {
            reject(new Error('UNIQUE constraint failed: borrowers.national_id'));
            return;
          }
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
          if (mockLoanProducts.some((item) => item.code.trim().toLowerCase() === p.code.trim().toLowerCase())) {
            reject(new Error('UNIQUE constraint failed: loan_products.code'));
            return;
          }
          const newP = { ...p, id: mockLoanProducts.length + 1, created_at: new Date().toISOString() };
          mockLoanProducts.unshift(newP);
          resolve(newP.id as unknown as T);
          break;
        }
        case 'update_loan_product_cmd': {
          const p = args?.product as LoanProduct;
          if (mockLoanProducts.some((item) => item.id !== p.id && item.code.trim().toLowerCase() === p.code.trim().toLowerCase())) {
            reject(new Error('UNIQUE constraint failed: loan_products.code'));
            return;
          }
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
          const filter = (args?.statusFilter ?? args?.status_filter) as string | undefined;
          if (filter) {
            resolve(mockLoans.filter((l) => l.status === filter) as unknown as T);
          } else {
            resolve(mockLoans as unknown as T);
          }
          break;
        }
        case 'create_loan_cmd': {
          const loanData = args?.loan as Loan;
          let loanNum = loanData.loan_number;
          if (!loanNum || loanNum.trim() === '') {
            loanNum = `LN-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
          } else if (mockLoans.some((l) => l.loan_number === loanNum)) {
            reject(new Error('UNIQUE constraint failed: loans.loan_number'));
            return;
          }

          const borrower = mockBorrowers.find((b) => b.id === loanData.borrower_id);
          const product = mockLoanProducts.find((p) => p.id === loanData.loan_product_id);
          const newId = mockLoans.length + 1;
          const newLoan: Loan = {
            ...loanData,
            id: newId,
            loan_number: loanNum,
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
          const loanId = (args?.loanId ?? args?.loan_id) as number;
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
          const loanId = (args?.loanId ?? args?.loan_id) as number;
          resolve((mockSchedules[loanId] || []) as unknown as T);
          break;
        }
        case 'get_loan_transactions_cmd': {
          const loanId = (args?.loanId ?? args?.loan_id) as number;
          resolve(mockTransactions.filter((t) => t.loan_id === loanId) as unknown as T);
          break;
        }
        case 'record_repayment_cmd': {
          const loanId = (args?.loanId ?? args?.loan_id) as number;
          const amount = args?.amount as number;
          const payment_method = (args?.paymentMethod ?? args?.payment_method) as Transaction['payment_method'];
          const reference = args?.reference as string;
          const notes = args?.notes as string;
          const payment_date = ((args?.paymentDate ?? args?.payment_date) as string) || new Date().toISOString().split('T')[0];

          const receiptNum = `REC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

          const newTx: Transaction = {
            id: mockTransactions.length + 1,
            loan_id: loanId,
            receipt_number: receiptNum,
            transaction_date: payment_date,
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
        case 'login_cmd': {
          const username = args?.username as string;
          const password = args?.password as string;
          if (username === 'admin' && password === 'admin123') {
            resolve(mockUsers[0] as unknown as T);
          } else {
            const found = mockUsers.find((u) => u.username === username && u.status === 'Active');
            resolve((found || null) as unknown as T);
          }
          break;
        }
        case 'get_users_cmd':
          resolve(mockUsers as unknown as T);
          break;
        case 'create_user_cmd': {
          const u = args?.user as User;
          if (mockUsers.some((item) => item.username.trim().toLowerCase() === u.username.trim().toLowerCase())) {
            reject(new Error('UNIQUE constraint failed: users.username'));
            return;
          }
          const newU = { ...u, id: mockUsers.length + 1, created_at: new Date().toISOString() };
          mockUsers.push(newU);
          resolve(newU.id as unknown as T);
          break;
        }
        case 'update_user_cmd': {
          const u = args?.user as User;
          if (mockUsers.some((item) => item.id !== u.id && item.username.trim().toLowerCase() === u.username.trim().toLowerCase())) {
            reject(new Error('UNIQUE constraint failed: users.username'));
            return;
          }
          mockUsers = mockUsers.map((item) => (item.id === u.id ? { ...item, ...u } : item));
          resolve(undefined as unknown as T);
          break;
        }
        case 'delete_user_cmd': {
          const id = args?.id as number;
          mockUsers = mockUsers.filter((item) => item.id !== id);
          resolve(undefined as unknown as T);
          break;
        }
        case 'get_settings_cmd':
          resolve(mockSettings as unknown as T);
          break;
        case 'update_settings_cmd': {
          const s = args?.settings as PlatformSettings;
          mockSettings = { ...s };
          resolve(undefined as unknown as T);
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
          const rate = Math.max(0, ((args?.annualRate ?? args?.annual_rate) as number) || 0);
          const term = Math.max(0, ((args?.termMonths ?? args?.term_months) as number) || 0);
          const method = ((args?.interestMethod ?? args?.interest_method) as string) || 'FLAT_RATE';
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
        case 'get_sync_status_cmd':
          resolve(mockSyncStatus as unknown as T);
          break;
        case 'start_hub_cmd':
          mockSyncStatus = {
            ...mockSyncStatus,
            mode: 'HUB',
            is_connected: true,
            paired_devices: ['Field-Tablet-01'],
          };
          resolve(mockSyncStatus as unknown as T);
          break;
        case 'pair_spoke_cmd':
          mockSyncStatus = {
            ...mockSyncStatus,
            mode: 'SPOKE',
            hub_ip: ((args?.hubIp ?? args?.hub_ip) as string) || '192.168.1.50',
            auth_token: 'TOK-MOCK-999',
            is_connected: true,
            last_synced_at: new Date().toISOString(),
          };
          resolve(mockSyncStatus as unknown as T);
          break;
        case 'sync_api_cmd':
          mockSyncStatus = {
            ...mockSyncStatus,
            mode: 'API',
            hub_ip: ((args?.serverUrl ?? args?.server_url) as string) || 'http://localhost:3000',
            is_connected: true,
            last_synced_at: new Date().toISOString(),
          };
          resolve(mockSyncStatus as unknown as T);
          break;
        case 'trigger_sync_cmd':
          mockSyncStatus = {
            ...mockSyncStatus,
            last_synced_at: new Date().toISOString(),
            is_connected: true,
          };
          resolve(mockSyncStatus as unknown as T);
          break;
        case 'get_local_ip_cmd':
          resolve('192.168.1.100' as unknown as T);
          break;
        default:
          resolve([] as unknown as T);
      }
    }, 150);
  });
}

export const api = {
  login: (username: string, password: string) => invokeTauri<User | null>('login_cmd', { username, password }),
  getUsers: () => invokeTauri<User[]>('get_users_cmd'),
  createUser: (user: User) => invokeTauri<number>('create_user_cmd', { user }),
  updateUser: (user: User) => invokeTauri<void>('update_user_cmd', { user }),
  deleteUser: (id: number) => invokeTauri<void>('delete_user_cmd', { id }),

  getSettings: () => invokeTauri<PlatformSettings>('get_settings_cmd'),
  updateSettings: (settings: PlatformSettings) => invokeTauri<void>('update_settings_cmd', { settings }),

  getBorrowers: () => invokeTauri<Borrower[]>('get_borrowers'),
  createBorrower: (borrower: Borrower) => invokeTauri<number>('create_borrower_cmd', { borrower }),
  updateBorrower: (borrower: Borrower) => invokeTauri<void>('update_borrower_cmd', { borrower }),
  deleteBorrower: (id: number) => invokeTauri<void>('delete_borrower_cmd', { id }),

  getLoanProducts: () => invokeTauri<LoanProduct[]>('get_loan_products_cmd'),
  createLoanProduct: (product: LoanProduct) => invokeTauri<number>('create_loan_product_cmd', { product }),
  updateLoanProduct: (product: LoanProduct) => invokeTauri<void>('update_loan_product_cmd', { product }),
  deleteLoanProduct: (id: number) => invokeTauri<void>('delete_loan_product_cmd', { id }),

  getLoans: (status_filter?: string) => invokeTauri<Loan[]>('get_loans_cmd', { statusFilter: status_filter }),
  createLoan: (loan: Loan) => invokeTauri<number>('create_loan_cmd', { loan }),
  updateLoanStatus: (loan_id: number, status: string, notes?: string) => invokeTauri<void>('update_loan_status_cmd', { loanId: loan_id, status, notes }),

  getLoanSchedule: (loan_id: number) => invokeTauri<ScheduleItem[]>('get_loan_schedule_cmd', { loanId: loan_id }),
  getLoanTransactions: (loan_id: number) => invokeTauri<Transaction[]>('get_loan_transactions_cmd', { loanId: loan_id }),
  recordRepayment: (loan_id: number, amount: number, payment_method: string, reference: string, notes: string, payment_date?: string) =>
    invokeTauri<Transaction>('record_repayment_cmd', { loanId: loan_id, amount, paymentMethod: payment_method, reference, notes, paymentDate: payment_date }),

  getDashboardStats: () => invokeTauri<DashboardStats>('get_dashboard_stats_cmd'),
  calculatePreviewSchedule: (principal: number, annual_rate: number, term_months: number, interest_method: string, start_date: string) =>
    invokeTauri<ScheduleItem[]>('calculate_preview_schedule_cmd', { principal, annualRate: annual_rate, termMonths: term_months, interestMethod: interest_method, startDate: start_date }),

  getSyncStatus: () => invokeTauri<SyncStatus>('get_sync_status_cmd'),
  startHub: () => invokeTauri<SyncStatus>('start_hub_cmd'),
  pairSpoke: (hub_ip: string, pairing_code: string, device_name: string) =>
    invokeTauri<SyncStatus>('pair_spoke_cmd', { hubIp: hub_ip, pairingCode: pairing_code, deviceName: device_name }),
  syncApi: (server_url: string) => invokeTauri<SyncStatus>('sync_api_cmd', { serverUrl: server_url }),
  triggerSync: () => invokeTauri<SyncStatus>('trigger_sync_cmd'),
  getLocalIp: () => invokeTauri<string>('get_local_ip_cmd'),
};
