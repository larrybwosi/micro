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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Loan {
    pub id: Option<i64>,
    pub borrower_id: i64,
    pub loan_product_id: i64,
    pub loan_number: String,
    pub principal_amount: f64,
    pub annual_interest_rate: f64,
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
