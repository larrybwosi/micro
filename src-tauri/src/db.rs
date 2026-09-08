use crate::models::{
    Borrower, DashboardStats, Expense, Loan, LoanProduct, PettyCashSummary, PlatformSettings,
    ScheduleItem, SyncPayload, Transaction, User,
};
use chrono::{Datelike, Local, NaiveDate};
use rusqlite::{params, Connection, Result};
use sha2::{Digest, Sha256};

pub fn hash_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn init_db(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'USER',
            status TEXT NOT NULL DEFAULT 'Active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS platform_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

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
            interest_rate_type TEXT NOT NULL DEFAULT 'ANNUAL',
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
            interest_rate_type TEXT NOT NULL DEFAULT 'ANNUAL',
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

        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            expense_date TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            reference TEXT,
            status TEXT NOT NULL DEFAULT 'APPROVED',
            created_by TEXT,
            approved_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

        CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans(borrower_id);
        CREATE INDEX IF NOT EXISTS idx_loans_product ON loans(loan_product_id);
        CREATE INDEX IF NOT EXISTS idx_schedule_loan ON schedule_items(loan_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_loan ON transactions(loan_id);
        CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
        ",
    )?;

    // Run safe migrations for existing tables missing new columns
    let _ = conn.execute(
        "ALTER TABLE loan_products ADD COLUMN interest_rate_type TEXT NOT NULL DEFAULT 'ANNUAL'",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE loans ADD COLUMN interest_rate_type TEXT NOT NULL DEFAULT 'ANNUAL'",
        [],
    );

    seed_default_data(conn)?;
    Ok(())
}

fn seed_default_data(conn: &Connection) -> Result<()> {
    // Seed default admin user if users table is empty
    let user_count: i64 = conn.query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))?;
    if user_count == 0 {
        let admin_pass_hash = hash_password("admin123");
        conn.execute(
            "INSERT INTO users (username, password_hash, full_name, role, status) VALUES (?1, ?2, ?3, ?4, ?5)",
            params!["admin", admin_pass_hash, "System Administrator", "ADMIN", "Active"],
        )?;
    }

    // Seed default platform settings if platform_settings table is empty
    let settings_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM platform_settings", [], |row| {
            row.get(0)
        })?;
    if settings_count == 0 {
        conn.execute("INSERT INTO platform_settings (key, value) VALUES ('org_name', 'MicroFinance Systems')", [])?;
        conn.execute(
            "INSERT INTO platform_settings (key, value) VALUES ('currency_symbol', 'KSh')",
            [],
        )?;
        conn.execute("INSERT INTO platform_settings (key, value) VALUES ('default_annual_interest_rate', '12.0')", [])?;
        conn.execute("INSERT INTO platform_settings (key, value) VALUES ('default_origination_fee_percent', '1.5')", [])?;
        conn.execute("INSERT INTO platform_settings (key, value) VALUES ('default_interest_rate_type', 'ANNUAL')", [])?;
        conn.execute("INSERT INTO platform_settings (key, value) VALUES ('loan_approval_threshold', '50000.0')", [])?;
        conn.execute("INSERT INTO platform_settings (key, value) VALUES ('expense_approval_threshold', '10000.0')", [])?;
        conn.execute(
            "INSERT INTO platform_settings (key, value) VALUES ('theme', 'light')",
            [],
        )?;
    }

    Ok(())
}

// User & Auth Queries
pub fn authenticate_user(
    conn: &Connection,
    username: &str,
    password: &str,
) -> Result<Option<User>> {
    let password_hash = hash_password(password);
    let mut stmt = conn.prepare("SELECT id, username, full_name, role, status, created_at FROM users WHERE username = ?1 AND password_hash = ?2 AND status = 'Active'")?;
    let mut user_iter = stmt.query_map(params![username, password_hash], |row| {
        Ok(User {
            id: Some(row.get(0)?),
            username: row.get(1)?,
            password: None,
            full_name: row.get(2)?,
            role: row.get(3)?,
            status: row.get(4)?,
            created_at: row.get(5)?,
        })
    })?;

    if let Some(user_res) = user_iter.next() {
        Ok(Some(user_res?))
    } else {
        Ok(None)
    }
}

pub fn get_all_users(conn: &Connection) -> Result<Vec<User>> {
    let mut stmt = conn.prepare(
        "SELECT id, username, full_name, role, status, created_at FROM users ORDER BY id ASC",
    )?;
    let user_iter = stmt.query_map([], |row| {
        Ok(User {
            id: Some(row.get(0)?),
            username: row.get(1)?,
            password: None,
            full_name: row.get(2)?,
            role: row.get(3)?,
            status: row.get(4)?,
            created_at: row.get(5)?,
        })
    })?;

    let mut list = Vec::new();
    for u in user_iter {
        list.push(u?);
    }
    Ok(list)
}

pub fn create_user(conn: &Connection, user: User) -> Result<i64> {
    let raw_pass = user.password.as_deref().unwrap_or("123456");
    let pass_hash = hash_password(raw_pass);
    conn.execute(
        "INSERT INTO users (username, password_hash, full_name, role, status) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![user.username, pass_hash, user.full_name, user.role, user.status],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update_user(conn: &Connection, user: User) -> Result<()> {
    if let Some(ref pass) = user.password {
        if !pass.trim().is_empty() {
            let pass_hash = hash_password(pass);
            conn.execute(
                "UPDATE users SET username=?1, password_hash=?2, full_name=?3, role=?4, status=?5 WHERE id=?6",
                params![user.username, pass_hash, user.full_name, user.role, user.status, user.id],
            )?;
            return Ok(());
        }
    }

    conn.execute(
        "UPDATE users SET username=?1, full_name=?2, role=?3, status=?4 WHERE id=?5",
        params![
            user.username,
            user.full_name,
            user.role,
            user.status,
            user.id
        ],
    )?;
    Ok(())
}

pub fn delete_user(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM users WHERE id = ?1", params![id])?;
    Ok(())
}

// Platform Settings Queries
pub fn get_platform_settings(conn: &Connection) -> Result<PlatformSettings> {
    let mut stmt = conn.prepare("SELECT key, value FROM platform_settings")?;
    let rows = stmt.query_map([], |row| {
        let key: String = row.get(0)?;
        let val: String = row.get(1)?;
        Ok((key, val))
    })?;

    let mut org_name = "MicroFinance Systems".to_string();
    let mut currency_symbol = "KSh".to_string();
    let mut default_annual_interest_rate = 12.0;
    let mut default_origination_fee_percent = 1.5;
    let mut default_interest_rate_type = "ANNUAL".to_string();
    let mut loan_approval_threshold = 50000.0;
    let mut expense_approval_threshold = 10000.0;
    let mut theme = "light".to_string();

    for (k, v) in rows.flatten() {
        match k.as_str() {
            "org_name" => org_name = v,
            "currency_symbol" => currency_symbol = v,
            "default_annual_interest_rate" => {
                default_annual_interest_rate = v.parse().unwrap_or(12.0)
            }
            "default_origination_fee_percent" => {
                default_origination_fee_percent = v.parse().unwrap_or(1.5)
            }
            "default_interest_rate_type" => default_interest_rate_type = v,
            "loan_approval_threshold" => loan_approval_threshold = v.parse().unwrap_or(50000.0),
            "expense_approval_threshold" => {
                expense_approval_threshold = v.parse().unwrap_or(10000.0)
            }
            "theme" => theme = v,
            _ => {}
        }
    }

    Ok(PlatformSettings {
        org_name,
        currency_symbol,
        default_annual_interest_rate,
        default_origination_fee_percent,
        default_interest_rate_type,
        loan_approval_threshold,
        expense_approval_threshold,
        theme,
    })
}

pub fn update_platform_settings(conn: &Connection, settings: PlatformSettings) -> Result<()> {
    conn.execute("INSERT INTO platform_settings (key, value) VALUES ('org_name', ?1) ON CONFLICT(key) DO UPDATE SET value=?1", params![settings.org_name])?;
    conn.execute("INSERT INTO platform_settings (key, value) VALUES ('currency_symbol', ?1) ON CONFLICT(key) DO UPDATE SET value=?1", params![settings.currency_symbol])?;
    conn.execute("INSERT INTO platform_settings (key, value) VALUES ('default_annual_interest_rate', ?1) ON CONFLICT(key) DO UPDATE SET value=?1", params![settings.default_annual_interest_rate.to_string()])?;
    conn.execute("INSERT INTO platform_settings (key, value) VALUES ('default_origination_fee_percent', ?1) ON CONFLICT(key) DO UPDATE SET value=?1", params![settings.default_origination_fee_percent.to_string()])?;
    conn.execute("INSERT INTO platform_settings (key, value) VALUES ('default_interest_rate_type', ?1) ON CONFLICT(key) DO UPDATE SET value=?1", params![settings.default_interest_rate_type])?;
    conn.execute("INSERT INTO platform_settings (key, value) VALUES ('loan_approval_threshold', ?1) ON CONFLICT(key) DO UPDATE SET value=?1", params![settings.loan_approval_threshold.to_string()])?;
    conn.execute("INSERT INTO platform_settings (key, value) VALUES ('expense_approval_threshold', ?1) ON CONFLICT(key) DO UPDATE SET value=?1", params![settings.expense_approval_threshold.to_string()])?;
    conn.execute("INSERT INTO platform_settings (key, value) VALUES ('theme', ?1) ON CONFLICT(key) DO UPDATE SET value=?1", params![settings.theme])?;
    Ok(())
}

pub struct PersistentSyncConfig {
    pub mode: String,
    pub hub_ip: Option<String>,
    pub auth_token: Option<String>,
    pub pairing_code: Option<String>,
}

pub fn save_sync_config(
    conn: &Connection,
    mode: &str,
    hub_ip: Option<&str>,
    auth_token: Option<&str>,
    pairing_code: Option<&str>,
) -> Result<()> {
    conn.execute(
        "INSERT INTO platform_settings (key, value) VALUES ('sync_mode', ?1) ON CONFLICT(key) DO UPDATE SET value=?1",
        params![mode],
    )?;

    if let Some(ip) = hub_ip {
        conn.execute(
            "INSERT INTO platform_settings (key, value) VALUES ('sync_hub_ip', ?1) ON CONFLICT(key) DO UPDATE SET value=?1",
            params![ip],
        )?;
    }

    if let Some(token) = auth_token {
        conn.execute(
            "INSERT INTO platform_settings (key, value) VALUES ('sync_auth_token', ?1) ON CONFLICT(key) DO UPDATE SET value=?1",
            params![token],
        )?;
    }

    if let Some(code) = pairing_code {
        conn.execute(
            "INSERT INTO platform_settings (key, value) VALUES ('sync_pairing_code', ?1) ON CONFLICT(key) DO UPDATE SET value=?1",
            params![code],
        )?;
    }

    Ok(())
}

pub fn get_sync_config(conn: &Connection) -> Result<PersistentSyncConfig> {
    let mut stmt =
        conn.prepare("SELECT key, value FROM platform_settings WHERE key LIKE 'sync_%'")?;
    let rows = stmt.query_map([], |row| {
        let key: String = row.get(0)?;
        let val: String = row.get(1)?;
        Ok((key, val))
    })?;

    let mut mode = "OFFLINE".to_string();
    let mut hub_ip = None;
    let mut auth_token = None;
    let mut pairing_code = None;

    for (k, v) in rows.flatten() {
        match k.as_str() {
            "sync_mode" => mode = v,
            "sync_hub_ip" => hub_ip = Some(v),
            "sync_auth_token" => auth_token = Some(v),
            "sync_pairing_code" => pairing_code = Some(v),
            _ => {}
        }
    }

    Ok(PersistentSyncConfig {
        mode,
        hub_ip,
        auth_token,
        pairing_code,
    })
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
    let mut stmt = conn.prepare("SELECT id, name, code, description, interest_method, annual_interest_rate, interest_rate_type, min_amount, max_amount, min_term_months, max_term_months, payment_frequency, origination_fee_percent, late_fee_percent, grace_period_days, created_at FROM loan_products ORDER BY id DESC")?;
    let product_iter = stmt.query_map([], |row| {
        Ok(LoanProduct {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            code: row.get(2)?,
            description: row.get(3)?,
            interest_method: row.get(4)?,
            annual_interest_rate: row.get(5)?,
            interest_rate_type: row.get(6)?,
            min_amount: row.get(7)?,
            max_amount: row.get(8)?,
            min_term_months: row.get(9)?,
            max_term_months: row.get(10)?,
            payment_frequency: row.get(11)?,
            origination_fee_percent: row.get(12)?,
            late_fee_percent: row.get(13)?,
            grace_period_days: row.get(14)?,
            created_at: row.get(15)?,
        })
    })?;

    let mut list = Vec::new();
    for p in product_iter {
        list.push(p?);
    }
    Ok(list)
}

pub fn create_loan_product(conn: &Connection, p: LoanProduct) -> Result<i64> {
    let rate_type = if p.interest_rate_type.trim().is_empty() {
        "ANNUAL".to_string()
    } else {
        p.interest_rate_type.clone()
    };
    conn.execute(
        "INSERT INTO loan_products (name, code, description, interest_method, annual_interest_rate, interest_rate_type, min_amount, max_amount, min_term_months, max_term_months, payment_frequency, origination_fee_percent, late_fee_percent, grace_period_days)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            p.name, p.code, p.description, p.interest_method, p.annual_interest_rate,
            rate_type, p.min_amount, p.max_amount, p.min_term_months, p.max_term_months,
            p.payment_frequency, p.origination_fee_percent, p.late_fee_percent, p.grace_period_days
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update_loan_product(conn: &Connection, p: LoanProduct) -> Result<()> {
    let rate_type = if p.interest_rate_type.trim().is_empty() {
        "ANNUAL".to_string()
    } else {
        p.interest_rate_type.clone()
    };
    conn.execute(
        "UPDATE loan_products SET name=?1, code=?2, description=?3, interest_method=?4, annual_interest_rate=?5, interest_rate_type=?6, min_amount=?7, max_amount=?8, min_term_months=?9, max_term_months=?10, payment_frequency=?11, origination_fee_percent=?12, late_fee_percent=?13, grace_period_days=?14 WHERE id=?15",
        params![
            p.name, p.code, p.description, p.interest_method, p.annual_interest_rate,
            rate_type, p.min_amount, p.max_amount, p.min_term_months, p.max_term_months,
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
    rate: f64,
    interest_rate_type: &str,
    term_months: i32,
    interest_method: &str,
    start_date: &str,
) -> Vec<(i32, String, f64, f64, f64)> {
    // (installment_no, due_date, principal, interest, total)
    let mut schedule = Vec::new();
    if principal <= 0.0 || term_months <= 0 {
        return schedule;
    }

    let base_date = NaiveDate::parse_from_str(start_date, "%Y-%m-%d")
        .unwrap_or_else(|_| Local::now().date_naive());
    let safe_rate = rate.max(0.0);

    // Convert monthly rate vs annual rate to monthly fractional rate r
    let r = if interest_rate_type == "MONTHLY" {
        safe_rate / 100.0
    } else {
        (safe_rate / 100.0) / 12.0
    };

    if interest_method == "FLAT_RATE" {
        let total_interest = principal * r * term_months as f64;
        let principal_per_month = principal / term_months as f64;
        let interest_per_month = total_interest / term_months as f64;
        let total_per_month = principal_per_month + interest_per_month;

        for i in 1..=term_months {
            let due_date = add_months(base_date, i as u32)
                .format("%Y-%m-%d")
                .to_string();
            schedule.push((
                i,
                due_date,
                (principal_per_month * 100.0).round() / 100.0,
                (interest_per_month * 100.0).round() / 100.0,
                (total_per_month * 100.0).round() / 100.0,
            ));
        }
    } else if interest_method == "REDUCING_BALANCE" {
        let n = term_months as f64;
        let emi = if r > 0.0 {
            let factor = (1.0 + r).powf(n);
            if (factor - 1.0).abs() < f64::EPSILON {
                principal / n
            } else {
                principal * r * factor / (factor - 1.0)
            }
        } else {
            principal / n
        };

        let mut balance = principal;
        for i in 1..=term_months {
            let interest_due = balance * r;
            let principal_due = if i == term_months {
                balance
            } else {
                emi - interest_due
            };
            balance -= principal_due;

            let due_date = add_months(base_date, i as u32)
                .format("%Y-%m-%d")
                .to_string();
            schedule.push((
                i,
                due_date,
                (principal_due * 100.0).round() / 100.0,
                (interest_due * 100.0).round() / 100.0,
                ((principal_due + interest_due) * 100.0).round() / 100.0,
            ));
        }
    } else if interest_method == "INTEREST_ONLY" {
        let interest_per_month = principal * r;

        for i in 1..=term_months {
            let principal_due = if i == term_months { principal } else { 0.0 };
            let due_date = add_months(base_date, i as u32)
                .format("%Y-%m-%d")
                .to_string();
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
            l.annual_interest_rate, l.interest_rate_type, l.interest_method, l.term_months, l.payment_frequency,
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
        let total_payable: f64 = row.get(21)?;
        let amount_paid: f64 = row.get(22)?;
        let balance_remaining = (total_payable - amount_paid).max(0.0);

        Ok(Loan {
            id: Some(row.get(0)?),
            borrower_id: row.get(1)?,
            loan_product_id: row.get(2)?,
            loan_number: row.get(3)?,
            principal_amount: row.get(4)?,
            annual_interest_rate: row.get(5)?,
            interest_rate_type: row.get(6)?,
            interest_method: row.get(7)?,
            term_months: row.get(8)?,
            payment_frequency: row.get(9)?,
            origination_fee: row.get(10)?,
            status: row.get(11)?,
            application_date: row.get(12)?,
            approval_date: row.get(13)?,
            disbursement_date: row.get(14)?,
            maturity_date: row.get(15)?,
            notes: row.get(16)?,
            created_at: row.get(17)?,
            borrower_name: Some(row.get(18)?),
            product_name: Some(row.get(19)?),
            total_interest: Some(row.get(20)?),
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
    let loan_number = if loan.loan_number.trim().is_empty() {
        format!(
            "LN-{}-{:03}",
            Local::now().format("%Y%m%d%H%M%S"),
            Local::now().timestamp_subsec_millis() % 1000
        )
    } else {
        loan.loan_number.clone()
    };
    let application_date = Local::now().format("%Y-%m-%d").to_string();

    let rate_type = if loan.interest_rate_type.trim().is_empty() {
        "ANNUAL".to_string()
    } else {
        loan.interest_rate_type.clone()
    };

    let tx = conn.unchecked_transaction()?;

    tx.execute(
        "INSERT INTO loans (borrower_id, loan_product_id, loan_number, principal_amount, annual_interest_rate, interest_rate_type, interest_method, term_months, payment_frequency, origination_fee, status, application_date, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'PENDING_APPROVAL', ?11, ?12)",
        params![
            loan.borrower_id, loan.loan_product_id, loan_number, loan.principal_amount,
            loan.annual_interest_rate, rate_type, loan.interest_method, loan.term_months,
            loan.payment_frequency, loan.origination_fee, application_date, loan.notes
        ],
    )?;

    let loan_id = tx.last_insert_rowid();

    // Generate schedule
    let schedule = calculate_loan_schedule(
        loan.principal_amount,
        loan.annual_interest_rate,
        &rate_type,
        loan.term_months,
        &loan.interest_method,
        &application_date,
    );

    for (inst_no, due_date, p_due, i_due, total) in schedule {
        tx.execute(
            "INSERT INTO schedule_items (loan_id, installment_number, due_date, principal_due, interest_due, fee_due, total_installment, status)
             VALUES (?1, ?2, ?3, ?4, ?5, 0.0, ?6, 'PENDING')",
            params![loan_id, inst_no, due_date, p_due, i_due, total],
        )?;
    }

    tx.commit()?;
    Ok(loan_id)
}

pub fn update_loan_status(
    conn: &Connection,
    loan_id: i64,
    status: String,
    notes: Option<String>,
) -> Result<()> {
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
    payment_date: Option<String>,
) -> Result<Transaction> {
    let receipt_number = format!(
        "REC-{}-{:03}",
        Local::now().format("%Y%m%d%H%M%S"),
        Local::now().timestamp_subsec_millis() % 1000
    );
    let today = Local::now().format("%Y-%m-%d").to_string();
    let tx_date = payment_date
        .filter(|d| !d.trim().is_empty())
        .unwrap_or(today);

    let safe_amount = amount.max(0.0);
    let mut remaining = safe_amount;
    let mut total_p = 0.0;
    let mut total_i = 0.0;
    let mut total_f = 0.0;

    let tx = conn.unchecked_transaction()?;

    let mut schedule = get_loan_schedule(&tx, loan_id)?;

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

        let new_status = if (item.principal_paid >= item.principal_due)
            && (item.interest_paid >= item.interest_due)
            && (item.fee_paid >= item.fee_due)
        {
            "PAID"
        } else {
            "PARTIAL"
        };
        item.status = new_status.to_string();

        tx.execute(
            "UPDATE schedule_items SET principal_paid=?1, interest_paid=?2, fee_paid=?3, status=?4, paid_date=?5 WHERE id=?6",
            params![item.principal_paid, item.interest_paid, item.fee_paid, item.status, tx_date, item.id],
        )?;
    }

    tx.execute(
        "INSERT INTO transactions (loan_id, receipt_number, transaction_date, amount, principal_component, interest_component, fee_component, payment_method, reference, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![loan_id, receipt_number, tx_date, safe_amount, total_p, total_i, total_f, payment_method, reference, notes],
    )?;

    let tx_id = tx.last_insert_rowid();

    // Check if entire loan is fully paid
    let unclosed_count: i64 = tx.query_row(
        "SELECT COUNT(*) FROM schedule_items WHERE loan_id=?1 AND status != 'PAID'",
        params![loan_id],
        |row| row.get(0),
    )?;

    if unclosed_count == 0 {
        tx.execute(
            "UPDATE loans SET status='CLOSED' WHERE id=?1",
            params![loan_id],
        )?;
    }

    tx.commit()?;

    Ok(Transaction {
        id: Some(tx_id),
        loan_id,
        receipt_number,
        transaction_date: tx_date,
        amount: safe_amount,
        principal_component: total_p,
        interest_component: total_i,
        fee_component: total_f,
        payment_method,
        reference,
        notes,
        created_at: Some(Local::now().to_rfc3339()),
    })
}

// Expense Queries
pub fn get_all_expenses(conn: &Connection) -> Result<Vec<Expense>> {
    let mut stmt = conn.prepare("SELECT id, category, description, amount, expense_date, payment_method, reference, status, created_by, approved_by, created_at FROM expenses ORDER BY expense_date DESC, id DESC")?;
    let expense_iter = stmt.query_map([], |row| {
        Ok(Expense {
            id: Some(row.get(0)?),
            category: row.get(1)?,
            description: row.get(2)?,
            amount: row.get(3)?,
            expense_date: row.get(4)?,
            payment_method: row.get(5)?,
            reference: row.get(6)?,
            status: row.get(7)?,
            created_by: row.get(8)?,
            approved_by: row.get(9)?,
            created_at: row.get(10)?,
        })
    })?;

    let mut list = Vec::new();
    for e in expense_iter {
        list.push(e?);
    }
    Ok(list)
}

pub fn create_expense(conn: &Connection, exp: Expense) -> Result<i64> {
    let settings = get_platform_settings(conn)?;
    let exp_date = if exp.expense_date.trim().is_empty() {
        Local::now().format("%Y-%m-%d").to_string()
    } else {
        exp.expense_date.clone()
    };

    // If expense amount exceeds expense_approval_threshold, mark status as PENDING_APPROVAL unless already approved/specified
    let initial_status = if exp.status.trim().is_empty() {
        if exp.amount > settings.expense_approval_threshold {
            "PENDING_APPROVAL".to_string()
        } else {
            "APPROVED".to_string()
        }
    } else {
        exp.status.clone()
    };

    conn.execute(
        "INSERT INTO expenses (category, description, amount, expense_date, payment_method, reference, status, created_by, approved_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            exp.category,
            exp.description,
            exp.amount,
            exp_date,
            exp.payment_method,
            exp.reference,
            initial_status,
            exp.created_by,
            exp.approved_by
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update_expense_status(
    conn: &Connection,
    expense_id: i64,
    status: &str,
    approved_by: Option<&str>,
) -> Result<()> {
    conn.execute(
        "UPDATE expenses SET status = ?1, approved_by = COALESCE(?2, approved_by) WHERE id = ?3",
        params![status, approved_by, expense_id],
    )?;
    Ok(())
}

pub fn delete_expense(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM expenses WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_petty_cash_summary(conn: &Connection) -> Result<PettyCashSummary> {
    let total_topup: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0.0) FROM expenses WHERE category = 'PETTY_CASH_TOPUP' AND status = 'APPROVED'",
        [],
        |row| row.get(0),
    )?;

    let total_cash_spent: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0.0) FROM expenses WHERE category != 'PETTY_CASH_TOPUP' AND payment_method = 'CASH' AND status = 'APPROVED'",
        [],
        |row| row.get(0),
    )?;

    let current_balance = (total_topup - total_cash_spent).max(0.0);

    Ok(PettyCashSummary {
        total_topup,
        total_cash_spent,
        current_balance,
    })
}

pub fn get_dashboard_stats(conn: &Connection) -> Result<DashboardStats> {
    let total_borrowers: i64 =
        conn.query_row("SELECT COUNT(*) FROM borrowers", [], |row| row.get(0))?;
    let total_active_loans: i64 = conn.query_row(
        "SELECT COUNT(*) FROM loans WHERE status='ACTIVE'",
        [],
        |row| row.get(0),
    )?;
    let total_portfolio_value: f64 = conn.query_row("SELECT COALESCE(SUM(principal_amount), 0.0) FROM loans WHERE status IN ('ACTIVE', 'OVERDUE')", [], |row| row.get(0))?;

    let total_payable: f64 = conn.query_row("SELECT COALESCE(SUM(total_installment), 0.0) FROM schedule_items s JOIN loans l ON s.loan_id = l.id WHERE l.status IN ('ACTIVE', 'OVERDUE')", [], |row| row.get(0))?;
    let total_paid: f64 = conn.query_row("SELECT COALESCE(SUM(principal_paid + interest_paid + fee_paid), 0.0) FROM schedule_items s JOIN loans l ON s.loan_id = l.id WHERE l.status IN ('ACTIVE', 'OVERDUE')", [], |row| row.get(0))?;
    let total_outstanding_balance = (total_payable - total_paid).max(0.0);

    let total_collected_revenue: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0.0) FROM transactions",
        [],
        |row| row.get(0),
    )?;

    let overdue_loans_count: i64 = conn.query_row("SELECT COUNT(DISTINCT loan_id) FROM schedule_items WHERE status='OVERDUE' OR (status IN ('PENDING', 'PARTIAL') AND due_date < date('now'))", [], |row| row.get(0))?;
    let pending_approvals_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM loans WHERE status='PENDING_APPROVAL'",
        [],
        |row| row.get(0),
    )?;

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

// Data Sync Engine Queries
pub fn export_sync_data(conn: &Connection) -> Result<SyncPayload> {
    let users = get_all_users(conn)?;
    let settings = get_platform_settings(conn)?;
    let borrowers = get_all_borrowers(conn)?;
    let loan_products = get_all_loan_products(conn)?;
    let loans = get_all_loans(conn, None)?;
    let expenses = get_all_expenses(conn)?;

    let mut schedule_items = Vec::new();
    let mut transactions = Vec::new();

    for loan in &loans {
        if let Some(lid) = loan.id {
            if let Ok(mut items) = get_loan_schedule(conn, lid) {
                schedule_items.append(&mut items);
            }
            if let Ok(mut txs) = get_loan_transactions(conn, lid) {
                transactions.append(&mut txs);
            }
        }
    }

    Ok(SyncPayload {
        timestamp: Local::now().to_rfc3339(),
        users,
        settings,
        borrowers,
        loan_products,
        loans,
        schedule_items,
        transactions,
        expenses,
    })
}

pub fn import_sync_data(conn: &Connection, payload: &SyncPayload) -> Result<()> {
    let tx = conn.unchecked_transaction()?;

    // Update Platform Settings
    update_platform_settings(&tx, payload.settings.clone())?;

    // Upsert Users by username
    for u in &payload.users {
        let pass_hash = u
            .password
            .as_deref()
            .map(hash_password)
            .unwrap_or_else(|| hash_password("123456"));
        tx.execute(
            "INSERT INTO users (username, password_hash, full_name, role, status) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(username) DO UPDATE SET full_name=?3, role=?4, status=?5",
            params![u.username, pass_hash, u.full_name, u.role, u.status],
        )?;
    }

    // Upsert Borrowers by national_id
    for b in &payload.borrowers {
        tx.execute(
            "INSERT INTO borrowers (first_name, last_name, email, phone, national_id, address, credit_score, status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(national_id) DO UPDATE SET first_name=?1, last_name=?2, email=?3, phone=?4, address=?6, credit_score=?7, status=?8",
            params![b.first_name, b.last_name, b.email, b.phone, b.national_id, b.address, b.credit_score, b.status],
        )?;
    }

    // Upsert Loan Products by code
    for p in &payload.loan_products {
        let rate_type = if p.interest_rate_type.trim().is_empty() {
            "ANNUAL".to_string()
        } else {
            p.interest_rate_type.clone()
        };
        tx.execute(
            "INSERT INTO loan_products (name, code, description, interest_method, annual_interest_rate, interest_rate_type, min_amount, max_amount, min_term_months, max_term_months, payment_frequency, origination_fee_percent, late_fee_percent, grace_period_days)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
             ON CONFLICT(code) DO UPDATE SET name=?1, description=?3, interest_method=?4, annual_interest_rate=?5, interest_rate_type=?6, min_amount=?7, max_amount=?8, min_term_months=?9, max_term_months=?10, payment_frequency=?11, origination_fee_percent=?12, late_fee_percent=?13, grace_period_days=?14",
            params![
                p.name, p.code, p.description, p.interest_method, p.annual_interest_rate,
                rate_type, p.min_amount, p.max_amount, p.min_term_months, p.max_term_months,
                p.payment_frequency, p.origination_fee_percent, p.late_fee_percent, p.grace_period_days
            ],
        )?;
    }

    // Upsert Loans by loan_number
    for l in &payload.loans {
        let b_id: Option<i64> = tx
            .query_row(
                "SELECT id FROM borrowers WHERE national_id = (SELECT national_id FROM borrowers WHERE id=?1) OR id=?1 LIMIT 1",
                params![l.borrower_id],
                |r| r.get(0),
            )
            .ok();

        let p_id: Option<i64> = tx
            .query_row(
                "SELECT id FROM loan_products WHERE code = (SELECT code FROM loan_products WHERE id=?1) OR id=?1 LIMIT 1",
                params![l.loan_product_id],
                |r| r.get(0),
            )
            .ok();

        let rate_type = if l.interest_rate_type.trim().is_empty() {
            "ANNUAL".to_string()
        } else {
            l.interest_rate_type.clone()
        };

        if let (Some(borrower_id), Some(loan_product_id)) = (b_id, p_id) {
            tx.execute(
                "INSERT INTO loans (borrower_id, loan_product_id, loan_number, principal_amount, annual_interest_rate, interest_rate_type, interest_method, term_months, payment_frequency, origination_fee, status, application_date, approval_date, disbursement_date, maturity_date, notes)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
                 ON CONFLICT(loan_number) DO UPDATE SET status=?11, approval_date=?13, disbursement_date=?14, maturity_date=?15, notes=?16",
                params![
                    borrower_id, loan_product_id, l.loan_number, l.principal_amount,
                    l.annual_interest_rate, rate_type, l.interest_method, l.term_months,
                    l.payment_frequency, l.origination_fee, l.status, l.application_date,
                    l.approval_date, l.disbursement_date, l.maturity_date, l.notes
                ],
            )?;

            let loan_db_id: i64 = tx.query_row(
                "SELECT id FROM loans WHERE loan_number=?1",
                params![l.loan_number],
                |r| r.get(0),
            )?;

            // Insert schedule items for this loan
            for s in &payload.schedule_items {
                if s.loan_id == l.id.unwrap_or(-1) || s.loan_id == loan_db_id {
                    tx.execute(
                        "INSERT INTO schedule_items (loan_id, installment_number, due_date, principal_due, interest_due, fee_due, total_installment, principal_paid, interest_paid, fee_paid, status, paid_date)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
                         ON CONFLICT(id) DO UPDATE SET principal_paid=?8, interest_paid=?9, fee_paid=?10, status=?11, paid_date=?12",
                        params![
                            loan_db_id, s.installment_number, s.due_date, s.principal_due, s.interest_due,
                            s.fee_due, s.total_installment, s.principal_paid, s.interest_paid,
                            s.fee_paid, s.status, s.paid_date
                        ],
                    )?;
                }
            }

            // Insert transactions for this loan
            for t in &payload.transactions {
                if t.loan_id == l.id.unwrap_or(-1) || t.loan_id == loan_db_id {
                    tx.execute(
                        "INSERT INTO transactions (loan_id, receipt_number, transaction_date, amount, principal_component, interest_component, fee_component, payment_method, reference, notes)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
                         ON CONFLICT(receipt_number) DO NOTHING",
                        params![
                            loan_db_id, t.receipt_number, t.transaction_date, t.amount,
                            t.principal_component, t.interest_component, t.fee_component,
                            t.payment_method, t.reference, t.notes
                        ],
                    )?;
                }
            }
        }
    }

    // Upsert Expenses
    for e in &payload.expenses {
        if let Some(eid) = e.id {
            tx.execute(
                "INSERT INTO expenses (id, category, description, amount, expense_date, payment_method, reference, status, created_by, approved_by)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
                 ON CONFLICT(id) DO UPDATE SET status=?8, approved_by=?10",
                params![
                    eid, e.category, e.description, e.amount, e.expense_date,
                    e.payment_method, e.reference, e.status, e.created_by, e.approved_by
                ],
            )?;
        }
    }

    tx.commit()?;
    Ok(())
}
