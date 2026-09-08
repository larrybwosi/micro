use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Borrower {
    pub id: Option<i64>,
    pub first_name: String,
    pub last_name: String,
    pub email: String,
    pub phone: String,
    pub national_id: String,
    pub address: String,
    pub credit_score: i32,
    pub status: String, // Active, Pending, Blacklisted
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoanProduct {
    pub id: Option<i64>,
    pub name: String,
    pub code: String,
    pub description: String,
    pub interest_method: String, // FLAT_RATE, REDUCING_BALANCE, INTEREST_ONLY
    pub annual_interest_rate: f64,
    #[serde(default = "default_interest_rate_type")]
    pub interest_rate_type: String, // ANNUAL, MONTHLY
    pub min_amount: f64,
    pub max_amount: f64,
    pub min_term_months: i32,
    pub max_term_months: i32,
    pub payment_frequency: String, // WEEKLY, BIWEEKLY, MONTHLY
    pub origination_fee_percent: f64,
    pub late_fee_percent: f64,
    pub grace_period_days: i32,
    pub created_at: Option<String>,
}

fn default_interest_rate_type() -> String {
    "ANNUAL".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Loan {
    pub id: Option<i64>,
    pub borrower_id: i64,
    pub loan_product_id: i64,
    pub loan_number: String,
    pub principal_amount: f64,
    pub annual_interest_rate: f64,
    #[serde(default = "default_interest_rate_type")]
    pub interest_rate_type: String, // ANNUAL, MONTHLY
    pub interest_method: String,
    pub term_months: i32,
    pub payment_frequency: String,
    pub origination_fee: f64,
    pub status: String, // DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, DISBURSED, ACTIVE, OVERDUE, CLOSED, WRITTEN_OFF
    pub application_date: String,
    pub approval_date: Option<String>,
    pub disbursement_date: Option<String>,
    pub maturity_date: Option<String>,
    pub notes: Option<String>,
    pub created_at: Option<String>,

    // Joined display fields
    pub borrower_name: Option<String>,
    pub product_name: Option<String>,
    pub total_interest: Option<f64>,
    pub total_payable: Option<f64>,
    pub amount_paid: Option<f64>,
    pub balance_remaining: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleItem {
    pub id: Option<i64>,
    pub loan_id: i64,
    pub installment_number: i32,
    pub due_date: String,
    pub principal_due: f64,
    pub interest_due: f64,
    pub fee_due: f64,
    pub total_installment: f64,
    pub principal_paid: f64,
    pub interest_paid: f64,
    pub fee_paid: f64,
    pub status: String, // PENDING, PAID, PARTIAL, OVERDUE
    pub paid_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: Option<i64>,
    pub loan_id: i64,
    pub receipt_number: String,
    pub transaction_date: String,
    pub amount: f64,
    pub principal_component: f64,
    pub interest_component: f64,
    pub fee_component: f64,
    pub payment_method: String, // CASH, BANK_TRANSFER, MOBILE_MONEY, CHECK
    pub reference: String,
    pub notes: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Option<i64>,
    pub username: String,
    pub password: Option<String>,
    pub full_name: String,
    pub role: String,   // "ADMIN" or "USER"
    pub status: String, // "Active" or "Inactive"
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Expense {
    pub id: Option<i64>,
    pub category: String, // OFFICE_SUPPLIES, RENT, UTILITIES, SALARIES, TRAVEL, PETTY_CASH_TOPUP, MISC
    pub description: String,
    pub amount: f64,
    pub expense_date: String,
    pub payment_method: String, // CASH, BANK_TRANSFER, MOBILE_MONEY, CHECK
    pub reference: Option<String>,
    pub status: String, // APPROVED, PENDING_APPROVAL, REJECTED
    pub created_by: Option<String>,
    pub approved_by: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PettyCashSummary {
    pub total_topup: f64,
    pub total_cash_spent: f64,
    pub current_balance: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformSettings {
    pub org_name: String,
    pub currency_symbol: String,
    pub default_annual_interest_rate: f64,
    pub default_origination_fee_percent: f64,
    pub default_interest_rate_type: String, // ANNUAL, MONTHLY
    pub loan_approval_threshold: f64, // Loans above this amount require admin approval or flag
    pub expense_approval_threshold: f64, // Expenses above this amount require admin approval
    pub theme: String,                // "light", "dark", "system"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_borrowers: i64,
    pub total_active_loans: i64,
    pub total_portfolio_value: f64,
    pub total_outstanding_balance: f64,
    pub total_collected_revenue: f64,
    pub par_30: f64, // Portfolio at Risk > 30 days (%)
    pub overdue_loans_count: i64,
    pub pending_approvals_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPayload {
    pub timestamp: String,
    pub users: Vec<User>,
    pub settings: PlatformSettings,
    pub borrowers: Vec<Borrower>,
    pub loan_products: Vec<LoanProduct>,
    pub loans: Vec<Loan>,
    pub schedule_items: Vec<ScheduleItem>,
    pub transactions: Vec<Transaction>,
    pub expenses: Vec<Expense>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatus {
    pub mode: String, // "OFFLINE", "HUB", "SPOKE"
    pub local_ip: String,
    pub port: u16,
    pub pairing_code: String,
    pub hub_ip: Option<String>,
    pub auth_token: Option<String>,
    pub paired_devices: Vec<String>,
    pub last_synced_at: Option<String>,
    pub is_connected: bool,
    pub error_message: Option<String>,
}
