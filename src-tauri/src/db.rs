use rusqlite::{params, Connection, Result};
use chrono::{Local, NaiveDate, Datelike};
use crate::models::{Borrower, LoanProduct, Loan, ScheduleItem, Transaction, DashboardStats};

pub fn init_db(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS borrowers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            national_id TEXT NOT NULL UNIQUE,
            address TEXT NOT NULL,
            credit_score INTEGER NOT NULL DEFAULT 700,
            status TEXT NOT NULL DEFAULT 'Active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS loan_products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL,
            interest_method TEXT NOT NULL,
            annual_interest_rate REAL NOT NULL,
            min_amount REAL NOT NULL,
            max_amount REAL NOT NULL,
            min_term_months INTEGER NOT NULL,
            max_term_months INTEGER NOT NULL,
            payment_frequency TEXT NOT NULL,
            origination_fee_percent REAL NOT NULL DEFAULT 0.0,
            late_fee_percent REAL NOT NULL DEFAULT 0.0,
            grace_period_days INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS loans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            borrower_id INTEGER NOT NULL,
            loan_product_id INTEGER NOT NULL,
            loan_number TEXT NOT NULL UNIQUE,
            principal_amount REAL NOT NULL,
            annual_interest_rate REAL NOT NULL,
            interest_method TEXT NOT NULL,
            term_months INTEGER NOT NULL,
            payment_frequency TEXT NOT NULL,
            origination_fee REAL NOT NULL DEFAULT 0.0,
            status TEXT NOT NULL,
            application_date TEXT NOT NULL,
            approval_date TEXT,
            disbursement_date TEXT,
            maturity_date TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (borrower_id) REFERENCES borrowers(id),
            FOREIGN KEY (loan_product_id) REFERENCES loan_products(id)
        );

        CREATE TABLE IF NOT EXISTS schedule_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            loan_id INTEGER NOT NULL,
            installment_number INTEGER NOT NULL,
            due_date TEXT NOT NULL,
            principal_due REAL NOT NULL,
            interest_due REAL NOT NULL,
            fee_due REAL NOT NULL DEFAULT 0.0,
            total_installment REAL NOT NULL,
            principal_paid REAL NOT NULL DEFAULT 0.0,
            interest_paid REAL NOT NULL DEFAULT 0.0,
            fee_paid REAL NOT NULL DEFAULT 0.0,
            status TEXT NOT NULL DEFAULT 'PENDING',
            paid_date TEXT,
            FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            loan_id INTEGER NOT NULL,
            receipt_number TEXT NOT NULL UNIQUE,
            transaction_date TEXT NOT NULL,
            amount REAL NOT NULL,
            principal_component REAL NOT NULL,
            interest_component REAL NOT NULL,
            fee_component REAL NOT NULL DEFAULT 0.0,
            payment_method TEXT NOT NULL,
            reference TEXT NOT NULL,
            notes TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (loan_id) REFERENCES loans(id)
        );
        "
    )?;

    seed_default_data(conn)?;
    Ok(())
}

fn seed_default_data(conn: &Connection) -> Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM loan_products", [], |row| row.get(0))?;
    if count == 0 {
        conn.execute(
            "INSERT INTO loan_products (name, code, description, interest_method, annual_interest_rate, min_amount, max_amount, min_term_months, max_term_months, payment_frequency, origination_fee_percent, late_fee_percent, grace_period_days)
             VALUES 
             ('Micro Business Loan', 'MBL-01', 'Working capital loan for small enterprise owners', 'REDUCING_BALANCE', 12.0, 500.0, 10000.0, 3, 24, 'MONTHLY', 1.5, 2.0, 5),
             ('Personal Emergency Loan', 'PEL-01', 'Quick access flat-rate loan for emergency needs', 'FLAT_RATE', 15.0, 100.0, 2000.0, 1, 12, 'MONTHLY', 1.0, 3.0, 3),
             ('Agricultural Harvest Loan', 'AHL-01', 'Bullet principal repayment loan aligned with harvest season', 'INTEREST_ONLY', 10.0, 1000.0, 25000.0, 6, 12, 'MONTHLY', 2.0, 2.5, 7)",
            [],
        )?;
    }

    let borrower_count: i64 = conn.query_row("SELECT COUNT(*) FROM borrowers", [], |row| row.get(0))?;
    if borrower_count == 0 {
        conn.execute(
            "INSERT INTO borrowers (first_name, last_name, email, phone, national_id, address, credit_score, status)
             VALUES
             ('Alice', 'Smith', 'alice.smith@example.com', '+1 555-0192', 'ID-982341', '123 Main St, Springfield', 740, 'Active'),
             ('Robert', 'Johnson', 'robert.j@example.com', '+1 555-0144', 'ID-482019', '456 Oak Ave, Metropolis', 680, 'Active'),
             ('Elena', 'Rostova', 'elena.r@example.com', '+1 555-0188', 'ID-730192', '789 Pine Rd, Gotham', 810, 'Active')",
            [],
        )?;
    }

    Ok(())
}

// Borrower Queries
pub fn get_all_borrowers(conn: &Connection) -> Result<Vec<Borrower>> {
    let mut stmt = conn.prepare("SELECT id, first_name, last_name, email, phone, national_id, address, credit_score, status, created_at FROM borrowers ORDER BY id DESC")?;
    let borrower_iter = stmt.query_map([], |row| {
        Ok(Borrower {
            id: Some(row.get(0)?),
            first_name: row.get(1)?,
            last_name: row.get(2)?,
            email: row.get(3)?,
            phone: row.get(4)?,
            national_id: row.get(5)?,
            address: row.get(6)?,
            credit_score: row.get(7)?,
            status: row.get(8)?,
            created_at: row.get(9)?,
        })
    })?;

    let mut list = Vec::new();
    for b in borrower_iter {
        list.push(b?);
    }
    Ok(list)
}

pub fn create_borrower(conn: &Connection, b: Borrower) -> Result<i64> {
    conn.execute(
        "INSERT INTO borrowers (first_name, last_name, email, phone, national_id, address, credit_score, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![b.first_name, b.last_name, b.email, b.phone, b.national_id, b.address, b.credit_score, b.status],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update_borrower(conn: &Connection, b: Borrower) -> Result<()> {
    conn.execute(
        "UPDATE borrowers SET first_name=?1, last_name=?2, email=?3, phone=?4, national_id=?5, address=?6, credit_score=?7, status=?8 WHERE id=?9",
        params![b.first_name, b.last_name, b.email, b.phone, b.national_id, b.address, b.credit_score, b.status, b.id],
    )?;
    Ok(())
}

pub fn delete_borrower(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM borrowers WHERE id = ?1", params![id])?;
    Ok(())
}

// Loan Product Queries
pub fn get_all_loan_products(conn: &Connection) -> Result<Vec<LoanProduct>> {
    let mut stmt = conn.prepare("SELECT id, name, code, description, interest_method, annual_interest_rate, min_amount, max_amount, min_term_months, max_term_months, payment_frequency, origination_fee_percent, late_fee_percent, grace_period_days, created_at FROM loan_products ORDER BY id DESC")?;
    let product_iter = stmt.query_map([], |row| {
        Ok(LoanProduct {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            code: row.get(2)?,
            description: row.get(3)?,
            interest_method: row.get(4)?,
            annual_interest_rate: row.get(5)?,
            min_amount: row.get(6)?,
            max_amount: row.get(7)?,
            min_term_months: row.get(8)?,
            max_term_months: row.get(9)?,
            payment_frequency: row.get(10)?,
            origination_fee_percent: row.get(11)?,
            late_fee_percent: row.get(12)?,
            grace_period_days: row.get(13)?,
            created_at: row.get(14)?,
        })
    })?;

    let mut list = Vec::new();
    for p in product_iter {
        list.push(p?);
    }
    Ok(list)
}

pub fn create_loan_product(conn: &Connection, p: LoanProduct) -> Result<i64> {
    conn.execute(
        "INSERT INTO loan_products (name, code, description, interest_method, annual_interest_rate, min_amount, max_amount, min_term_months, max_term_months, payment_frequency, origination_fee_percent, late_fee_percent, grace_period_days)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            p.name, p.code, p.description, p.interest_method, p.annual_interest_rate,
            p.min_amount, p.max_amount, p.min_term_months, p.max_term_months,
            p.payment_frequency, p.origination_fee_percent, p.late_fee_percent, p.grace_period_days
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update_loan_product(conn: &Connection, p: LoanProduct) -> Result<()> {
    conn.execute(
        "UPDATE loan_products SET name=?1, code=?2, description=?3, interest_method=?4, annual_interest_rate=?5, min_amount=?6, max_amount=?7, min_term_months=?8, max_term_months=?9, payment_frequency=?10, origination_fee_percent=?11, late_fee_percent=?12, grace_period_days=?13 WHERE id=?14",
        params![
            p.name, p.code, p.description, p.interest_method, p.annual_interest_rate,
            p.min_amount, p.max_amount, p.min_term_months, p.max_term_months,
            p.payment_frequency, p.origination_fee_percent, p.late_fee_percent, p.grace_period_days, p.id
        ],
    )?;
    Ok(())
}

pub fn delete_loan_product(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM loan_products WHERE id = ?1", params![id])?;
    Ok(())
}

// Financial Calculation & Loan Management
pub fn calculate_loan_schedule(
    principal: f64,
    annual_rate: f64,
    term_months: i32,
    interest_method: &str,
    start_date: &str,
) -> Vec<(i32, String, f64, f64, f64)> { // (installment_no, due_date, principal, interest, total)
    let mut schedule = Vec::new();
    let base_date = NaiveDate::parse_from_str(start_date, "%Y-%m-%d").unwrap_or_else(|_| Local::now().date_naive());

    if interest_method == "FLAT_RATE" {
        let total_interest = principal * (annual_rate / 100.0) * (term_months as f64 / 12.0);
        let principal_per_month = principal / term_months as f64;
        let interest_per_month = total_interest / term_months as f64;
        let total_per_month = principal_per_month + interest_per_month;

        for i in 1..=term_months {
            let due_date = add_months(base_date, i as u32).format("%Y-%m-%d").to_string();
            schedule.push((i, due_date, (principal_per_month * 100.0).round() / 100.0, (interest_per_month * 100.0).round() / 100.0, (total_per_month * 100.0).round() / 100.0));
        }
    } else if interest_method == "REDUCING_BALANCE" {
        let r = (annual_rate / 100.0) / 12.0;
        let n = term_months as f64;
        let emi = if r > 0.0 {
            principal * r * (1.0 + r).powf(n) / ((1.0 + r).powf(n) - 1.0)
        } else {
            principal / n
        };

        let mut balance = principal;
        for i in 1..=term_months {
            let interest_due = balance * r;
            let principal_due = if i == term_months { balance } else { emi - interest_due };
            balance -= principal_due;

            let due_date = add_months(base_date, i as u32).format("%Y-%m-%d").to_string();
            schedule.push((
                i,
                due_date,
                (principal_due * 100.0).round() / 100.0,
                (interest_due * 100.0).round() / 100.0,
                ((principal_due + interest_due) * 100.0).round() / 100.0,
            ));
        }
    } else if interest_method == "INTEREST_ONLY" {
        let interest_per_month = principal * (annual_rate / 100.0) / 12.0;

        for i in 1..=term_months {
            let principal_due = if i == term_months { principal } else { 0.0 };
            let due_date = add_months(base_date, i as u32).format("%Y-%m-%d").to_string();
            schedule.push((
                i,
                due_date,
                (principal_due * 100.0).round() / 100.0,
                (interest_per_month * 100.0).round() / 100.0,
                ((principal_due + interest_per_month) * 100.0).round() / 100.0,
            ));
        }
    }

    schedule
}

fn add_months(date: NaiveDate, months: u32) -> NaiveDate {
    let mut year = date.year();
    let mut month = date.month() + months;
    while month > 12 {
        month -= 12;
        year += 1;
    }
    let day = date.day().min(28); // Safe day cap for monthly calculations
    NaiveDate::from_ymd_opt(year, month, day).unwrap_or(date)
}

pub fn get_all_loans(conn: &Connection, status_filter: Option<String>) -> Result<Vec<Loan>> {
    let query = "
        SELECT 
            l.id, l.borrower_id, l.loan_product_id, l.loan_number, l.principal_amount,
            l.annual_interest_rate, l.interest_method, l.term_months, l.payment_frequency,
            l.origination_fee, l.status, l.application_date, l.approval_date,
            l.disbursement_date, l.maturity_date, l.notes, l.created_at,
            (b.first_name || ' ' || b.last_name) as borrower_name,
            lp.name as product_name,
            COALESCE(SUM(s.interest_due), 0.0) as total_interest,
            COALESCE(SUM(s.total_installment), 0.0) as total_payable,
            COALESCE(SUM(s.principal_paid + s.interest_paid + s.fee_paid), 0.0) as amount_paid
        FROM loans l
        JOIN borrowers b ON l.borrower_id = b.id
        JOIN loan_products lp ON l.loan_product_id = lp.id
        LEFT JOIN schedule_items s ON l.id = s.loan_id
        WHERE (?1 IS NULL OR l.status = ?1)
        GROUP BY l.id
        ORDER BY l.id DESC
    ";

    let mut stmt = conn.prepare(query)?;
    let loan_iter = stmt.query_map(params![status_filter], |row| {
        let total_payable: f64 = row.get(20)?;
        let amount_paid: f64 = row.get(21)?;
        let balance_remaining = (total_payable - amount_paid).max(0.0);

        Ok(Loan {
            id: Some(row.get(0)?),
            borrower_id: row.get(1)?,
            loan_product_id: row.get(2)?,
            loan_number: row.get(3)?,
            principal_amount: row.get(4)?,
            annual_interest_rate: row.get(5)?,
            interest_method: row.get(6)?,
            term_months: row.get(7)?,
            payment_frequency: row.get(8)?,
            origination_fee: row.get(9)?,
            status: row.get(10)?,
            application_date: row.get(11)?,
            approval_date: row.get(12)?,
            disbursement_date: row.get(13)?,
            maturity_date: row.get(14)?,
            notes: row.get(15)?,
            created_at: row.get(16)?,
            borrower_name: Some(row.get(17)?),
            product_name: Some(row.get(18)?),
            total_interest: Some(row.get(19)?),
            total_payable: Some(total_payable),
            amount_paid: Some(amount_paid),
            balance_remaining: Some(balance_remaining),
        })
    })?;

    let mut list = Vec::new();
    for l in loan_iter {
        list.push(l?);
    }
    Ok(list)
}

pub fn create_loan(conn: &Connection, loan: Loan) -> Result<i64> {
    let loan_number = format!("LN-{}", Local::now().format("%Y%m%d%H%M%S"));
    let application_date = Local::now().format("%Y-%m-%d").to_string();

    conn.execute(
        "INSERT INTO loans (borrower_id, loan_product_id, loan_number, principal_amount, annual_interest_rate, interest_method, term_months, payment_frequency, origination_fee, status, application_date, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'PENDING_APPROVAL', ?10, ?11)",
        params![
            loan.borrower_id, loan.loan_product_id, loan_number, loan.principal_amount,
            loan.annual_interest_rate, loan.interest_method, loan.term_months,
            loan.payment_frequency, loan.origination_fee, application_date, loan.notes
        ],
    )?;

    let loan_id = conn.last_insert_rowid();

    // Generate schedule
    let schedule = calculate_loan_schedule(
        loan.principal_amount,
        loan.annual_interest_rate,
        loan.term_months,
        &loan.interest_method,
        &application_date,
    );

    for (inst_no, due_date, p_due, i_due, total) in schedule {
        conn.execute(
            "INSERT INTO schedule_items (loan_id, installment_number, due_date, principal_due, interest_due, fee_due, total_installment, status)
             VALUES (?1, ?2, ?3, ?4, ?5, 0.0, ?6, 'PENDING')",
            params![loan_id, inst_no, due_date, p_due, i_due, total],
        )?;
    }

    Ok(loan_id)
}

pub fn update_loan_status(conn: &Connection, loan_id: i64, status: String, notes: Option<String>) -> Result<()> {
    let today = Local::now().format("%Y-%m-%d").to_string();

    if status == "APPROVED" {
        conn.execute(
            "UPDATE loans SET status=?1, approval_date=?2, notes=COALESCE(?3, notes) WHERE id=?4",
            params![status, today, notes, loan_id],
        )?;
    } else if status == "DISBURSED" || status == "ACTIVE" {
        let maturity_item: Option<String> = conn.query_row(
            "SELECT due_date FROM schedule_items WHERE loan_id=?1 ORDER BY installment_number DESC LIMIT 1",
            params![loan_id],
            |row| row.get(0),
        ).ok();

        conn.execute(
            "UPDATE loans SET status='ACTIVE', disbursement_date=?1, maturity_date=?2, notes=COALESCE(?3, notes) WHERE id=?4",
            params![today, maturity_item, notes, loan_id],
        )?;
    } else {
        conn.execute(
            "UPDATE loans SET status=?1, notes=COALESCE(?2, notes) WHERE id=?3",
            params![status, notes, loan_id],
        )?;
    }

    Ok(())
}

pub fn get_loan_schedule(conn: &Connection, loan_id: i64) -> Result<Vec<ScheduleItem>> {
    let mut stmt = conn.prepare(
        "SELECT id, loan_id, installment_number, due_date, principal_due, interest_due, fee_due, total_installment, principal_paid, interest_paid, fee_paid, status, paid_date
         FROM schedule_items WHERE loan_id=?1 ORDER BY installment_number ASC"
    )?;

    let item_iter = stmt.query_map(params![loan_id], |row| {
        Ok(ScheduleItem {
            id: Some(row.get(0)?),
            loan_id: row.get(1)?,
            installment_number: row.get(2)?,
            due_date: row.get(3)?,
            principal_due: row.get(4)?,
            interest_due: row.get(5)?,
            fee_due: row.get(6)?,
            total_installment: row.get(7)?,
            principal_paid: row.get(8)?,
            interest_paid: row.get(9)?,
            fee_paid: row.get(10)?,
            status: row.get(11)?,
            paid_date: row.get(12)?,
        })
    })?;

    let mut list = Vec::new();
    for item in item_iter {
        list.push(item?);
    }
    Ok(list)
}

pub fn get_loan_transactions(conn: &Connection, loan_id: i64) -> Result<Vec<Transaction>> {
    let mut stmt = conn.prepare(
        "SELECT id, loan_id, receipt_number, transaction_date, amount, principal_component, interest_component, fee_component, payment_method, reference, notes, created_at
         FROM transactions WHERE loan_id=?1 ORDER BY id DESC"
    )?;

    let tx_iter = stmt.query_map(params![loan_id], |row| {
        Ok(Transaction {
            id: Some(row.get(0)?),
            loan_id: row.get(1)?,
            receipt_number: row.get(2)?,
            transaction_date: row.get(3)?,
            amount: row.get(4)?,
            principal_component: row.get(5)?,
            interest_component: row.get(6)?,
            fee_component: row.get(7)?,
            payment_method: row.get(8)?,
            reference: row.get(9)?,
            notes: row.get(10)?,
            created_at: row.get(11)?,
        })
    })?;

    let mut list = Vec::new();
    for tx in tx_iter {
        list.push(tx?);
    }
    Ok(list)
}

pub fn record_repayment(
    conn: &Connection,
    loan_id: i64,
    amount: f64,
    payment_method: String,
    reference: String,
    notes: String,
) -> Result<Transaction> {
    let receipt_number = format!("REC-{}", Local::now().format("%Y%m%d%H%M%S"));
    let today = Local::now().format("%Y-%m-%d").to_string();

    let mut remaining = amount;
    let mut total_p = 0.0;
    let mut total_i = 0.0;
    let mut total_f = 0.0;

    let mut schedule = get_loan_schedule(conn, loan_id)?;

    for item in &mut schedule {
        if remaining <= 0.0 {
            break;
        }

        if item.status == "PAID" {
            continue;
        }

        let p_unpaid = (item.principal_due - item.principal_paid).max(0.0);
        let i_unpaid = (item.interest_due - item.interest_paid).max(0.0);
        let f_unpaid = (item.fee_due - item.fee_paid).max(0.0);

        // Pay interest first, then fee, then principal
        let i_pay = remaining.min(i_unpaid);
        remaining -= i_pay;
        total_i += i_pay;
        item.interest_paid += i_pay;

        let f_pay = remaining.min(f_unpaid);
        remaining -= f_pay;
        total_f += f_pay;
        item.fee_paid += f_pay;

        let p_pay = remaining.min(p_unpaid);
        remaining -= p_pay;
        total_p += p_pay;
        item.principal_paid += p_pay;

        let new_status = if (item.principal_paid >= item.principal_due) && (item.interest_paid >= item.interest_due) && (item.fee_paid >= item.fee_due) {
            "PAID"
        } else {
            "PARTIAL"
        };
        item.status = new_status.to_string();

        conn.execute(
            "UPDATE schedule_items SET principal_paid=?1, interest_paid=?2, fee_paid=?3, status=?4, paid_date=?5 WHERE id=?6",
            params![item.principal_paid, item.interest_paid, item.fee_paid, item.status, today, item.id],
        )?;
    }

    conn.execute(
        "INSERT INTO transactions (loan_id, receipt_number, transaction_date, amount, principal_component, interest_component, fee_component, payment_method, reference, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![loan_id, receipt_number, today, amount, total_p, total_i, total_f, payment_method, reference, notes],
    )?;

    let tx_id = conn.last_insert_rowid();

    // Check if entire loan is fully paid
    let unclosed_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM schedule_items WHERE loan_id=?1 AND status != 'PAID'",
        params![loan_id],
        |row| row.get(0),
    )?;

    if unclosed_count == 0 {
        conn.execute("UPDATE loans SET status='CLOSED' WHERE id=?1", params![loan_id])?;
    }

    Ok(Transaction {
        id: Some(tx_id),
        loan_id,
        receipt_number,
        transaction_date: today,
        amount,
        principal_component: total_p,
        interest_component: total_i,
        fee_component: total_f,
        payment_method,
        reference,
        notes,
        created_at: Some(Local::now().to_rfc3339()),
    })
}

pub fn get_dashboard_stats(conn: &Connection) -> Result<DashboardStats> {
    let total_borrowers: i64 = conn.query_row("SELECT COUNT(*) FROM borrowers", [], |row| row.get(0))?;
    let total_active_loans: i64 = conn.query_row("SELECT COUNT(*) FROM loans WHERE status='ACTIVE'", [], |row| row.get(0))?;
    let total_portfolio_value: f64 = conn.query_row("SELECT COALESCE(SUM(principal_amount), 0.0) FROM loans WHERE status IN ('ACTIVE', 'OVERDUE')", [], |row| row.get(0))?;
    
    let total_payable: f64 = conn.query_row("SELECT COALESCE(SUM(total_installment), 0.0) FROM schedule_items s JOIN loans l ON s.loan_id = l.id WHERE l.status IN ('ACTIVE', 'OVERDUE')", [], |row| row.get(0))?;
    let total_paid: f64 = conn.query_row("SELECT COALESCE(SUM(principal_paid + interest_paid + fee_paid), 0.0) FROM schedule_items s JOIN loans l ON s.loan_id = l.id WHERE l.status IN ('ACTIVE', 'OVERDUE')", [], |row| row.get(0))?;
    let total_outstanding_balance = (total_payable - total_paid).max(0.0);

    let total_collected_revenue: f64 = conn.query_row("SELECT COALESCE(SUM(amount), 0.0) FROM transactions", [], |row| row.get(0))?;

    let overdue_loans_count: i64 = conn.query_row("SELECT COUNT(DISTINCT loan_id) FROM schedule_items WHERE status='OVERDUE' OR (status IN ('PENDING', 'PARTIAL') AND due_date < date('now'))", [], |row| row.get(0))?;
    let pending_approvals_count: i64 = conn.query_row("SELECT COUNT(*) FROM loans WHERE status='PENDING_APPROVAL'", [], |row| row.get(0))?;

    let par_30 = if total_portfolio_value > 0.0 {
        (overdue_loans_count as f64 / (total_active_loans.max(1) as f64)) * 100.0
    } else {
        0.0
    };

    Ok(DashboardStats {
        total_borrowers,
        total_active_loans,
        total_portfolio_value,
        total_outstanding_balance,
        total_collected_revenue,
        par_30: (par_30 * 10.0).round() / 10.0,
        overdue_loans_count,
        pending_approvals_count,
    })
}
