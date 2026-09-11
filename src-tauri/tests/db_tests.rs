use microfinance_core::*;

#[test]
fn test_schedule_calculations() {
    let flat_schedule =
        calculate_loan_schedule(1000.0, 12.0, "ANNUAL", "SIMPLE", 12, "FLAT_RATE", "2026-01-01");
    assert_eq!(flat_schedule.len(), 12);
    let total_flat_interest: f64 = flat_schedule.iter().map(|s| s.3).sum();
    assert!((total_flat_interest - 120.0).abs() < 0.5);

    // Compound Flat Rate schedule
    let compound_flat_schedule =
        calculate_loan_schedule(1000.0, 12.0, "ANNUAL", "COMPOUND", 12, "FLAT_RATE", "2026-01-01");
    assert_eq!(compound_flat_schedule.len(), 12);
    let total_compound_flat_interest: f64 = compound_flat_schedule.iter().map(|s| s.3).sum();
    // 1000 * ((1 + 0.01)^12 - 1) = 126.825
    assert!((total_compound_flat_interest - 126.83).abs() < 0.5);

    // Monthly rate test
    let monthly_flat_schedule =
        calculate_loan_schedule(1000.0, 1.0, "MONTHLY", "SIMPLE", 12, "FLAT_RATE", "2026-01-01");
    assert_eq!(monthly_flat_schedule.len(), 12);
    let monthly_flat_interest: f64 = monthly_flat_schedule.iter().map(|s| s.3).sum();
    assert!((monthly_flat_interest - 120.0).abs() < 0.5);

    let emi_schedule =
        calculate_loan_schedule(1000.0, 12.0, "ANNUAL", "COMPOUND", 12, "REDUCING_BALANCE", "2026-01-01");
    assert_eq!(emi_schedule.len(), 12);
    let total_emi_principal: f64 = emi_schedule.iter().map(|s| s.2).sum();
    assert!((total_emi_principal - 1000.0).abs() < 0.5);

    let simple_reducing_schedule =
        calculate_loan_schedule(1000.0, 12.0, "ANNUAL", "SIMPLE", 12, "REDUCING_BALANCE", "2026-01-01");
    assert_eq!(simple_reducing_schedule.len(), 12);
    let total_simple_reducing_principal: f64 = simple_reducing_schedule.iter().map(|s| s.2).sum();
    assert!((total_simple_reducing_principal - 1000.0).abs() < 0.5);

    let bullet_schedule =
        calculate_loan_schedule(1000.0, 12.0, "ANNUAL", "SIMPLE", 12, "INTEREST_ONLY", "2026-01-01");
    assert_eq!(bullet_schedule.len(), 12);
    assert_eq!(bullet_schedule[0].2, 0.0);
    assert_eq!(bullet_schedule[11].2, 1000.0);
}

#[test]
fn test_user_and_settings_db() {
    let conn = rusqlite::Connection::open_in_memory().unwrap();
    init_db(&conn).unwrap();

    // Test default admin login
    let admin_user = authenticate_user(&conn, "admin", "admin123").unwrap();
    assert!(admin_user.is_some());
    let admin = admin_user.unwrap();
    assert_eq!(admin.role, "ADMIN");

    // Test invalid login
    let invalid_user = authenticate_user(&conn, "admin", "wrongpassword").unwrap();
    assert!(invalid_user.is_none());

    // Test default settings
    let settings = get_platform_settings(&conn).unwrap();
    assert_eq!(settings.org_name, "MicroFinance Systems");
    assert_eq!(settings.currency_symbol, "KSh");

    // Test update settings
    let new_settings = PlatformSettings {
        org_name: "Acme Finance".to_string(),
        currency_symbol: "€".to_string(),
        default_annual_interest_rate: 14.5,
        default_origination_fee_percent: 2.0,
        default_interest_rate_type: "ANNUAL".to_string(),
        default_interest_type: "SIMPLE".to_string(),
        loan_approval_threshold: 50000.0,
        expense_approval_threshold: 10000.0,
        theme: "dark".to_string(),
        default_penalty_type: Some("PERCENTAGE".to_string()),
        default_late_fee_percent: Some(2.0),
        default_fixed_penalty_fee: Some(0.0),
        default_penalty_interest_rate: Some(0.0),
        default_grace_period_days: Some(5),
        receipt_header_text: Some("Header".to_string()),
        receipt_footer_text: Some("Footer".to_string()),
        receipt_logo_url: Some("".to_string()),
    };
    update_platform_settings(&conn, new_settings).unwrap();
    let updated_settings = get_platform_settings(&conn).unwrap();
    assert_eq!(updated_settings.org_name, "Acme Finance");
    assert_eq!(updated_settings.currency_symbol, "€");

    // Test User CRUD
    let new_user = User {
        id: None,
        username: "officer1".to_string(),
        password: Some("pass123".to_string()),
        full_name: "Loan Officer 1".to_string(),
        role: "USER".to_string(),
        status: "Active".to_string(),
        created_at: None,
    };
    let u_id = create_user(&conn, new_user).unwrap();
    assert!(u_id > 0);

    let users = get_all_users(&conn).unwrap();
    assert_eq!(users.len(), 2);

    let officer_auth = authenticate_user(&conn, "officer1", "pass123").unwrap();
    assert!(officer_auth.is_some());
}

#[test]
fn test_expenses_and_petty_cash() {
    let conn = rusqlite::Connection::open_in_memory().unwrap();
    init_db(&conn).unwrap();

    // Top up petty cash float
    let topup = Expense {
        id: None,
        category: "PETTY_CASH_TOPUP".to_string(),
        description: "Initial float replenishment".to_string(),
        amount: 2000.0,
        expense_date: "2026-01-01".to_string(),
        payment_method: "BANK_TRANSFER".to_string(),
        reference: Some("REF-TOPUP-01".to_string()),
        status: "APPROVED".to_string(),
        created_by: Some("admin".to_string()),
        approved_by: Some("admin".to_string()),
        created_at: None,
    };
    let topup_id = create_expense(&conn, topup).unwrap();
    assert!(topup_id > 0);

    // Record cash expense under approval threshold ($10,000)
    let exp1 = Expense {
        id: None,
        category: "OFFICE_SUPPLIES".to_string(),
        description: "Stationery and printing paper".to_string(),
        amount: 150.0,
        expense_date: "2026-01-02".to_string(),
        payment_method: "CASH".to_string(),
        reference: Some("REC-001".to_string()),
        status: "".to_string(), // will auto-approve as 150 < 10000 threshold
        created_by: Some("user1".to_string()),
        approved_by: None,
        created_at: None,
    };
    let exp1_id = create_expense(&conn, exp1).unwrap();
    assert!(exp1_id > 0);

    // Record cash expense above approval threshold ($10,000) -> should be PENDING_APPROVAL
    let exp2 = Expense {
        id: None,
        category: "RENT".to_string(),
        description: "Office annual lease payment".to_string(),
        amount: 15000.0,
        expense_date: "2026-01-03".to_string(),
        payment_method: "BANK_TRANSFER".to_string(),
        reference: Some("LEASE-2026".to_string()),
        status: "".to_string(), // auto marks PENDING_APPROVAL
        created_by: Some("user1".to_string()),
        approved_by: None,
        created_at: None,
    };
    let exp2_id = create_expense(&conn, exp2).unwrap();
    assert!(exp2_id > 0);

    let all_expenses = get_all_expenses(&conn).unwrap();
    assert_eq!(all_expenses.len(), 3);

    let pending_exp = all_expenses.iter().find(|e| e.id == Some(exp2_id)).unwrap();
    assert_eq!(pending_exp.status, "PENDING_APPROVAL");

    // Approve the pending expense
    update_expense_status(&conn, exp2_id, "APPROVED", Some("admin")).unwrap();
    let approved_exp = get_all_expenses(&conn)
        .unwrap()
        .into_iter()
        .find(|e| e.id == Some(exp2_id))
        .unwrap();
    assert_eq!(approved_exp.status, "APPROVED");

    // Verify petty cash summary (Topup: 2000, Cash spent: 150 -> Balance: 1850)
    let summary = get_petty_cash_summary(&conn).unwrap();
    assert_eq!(summary.total_topup, 2000.0);
    assert_eq!(summary.total_cash_spent, 150.0);
    assert_eq!(summary.current_balance, 1850.0);
}

#[test]
fn test_edge_case_calculations() {
    // 0 principal or term
    let zero_principal =
        calculate_loan_schedule(0.0, 12.0, "ANNUAL", "SIMPLE", 12, "FLAT_RATE", "2026-01-01");
    assert!(zero_principal.is_empty());

    let zero_term = calculate_loan_schedule(1000.0, 12.0, "ANNUAL", "SIMPLE", 0, "FLAT_RATE", "2026-01-01");
    assert!(zero_term.is_empty());

    // 0 interest rate
    let zero_rate =
        calculate_loan_schedule(1200.0, 0.0, "ANNUAL", "SIMPLE", 12, "REDUCING_BALANCE", "2026-01-01");
    assert_eq!(zero_rate.len(), 12);
    for item in &zero_rate {
        assert_eq!(item.3, 0.0); // Interest due is 0
        assert_eq!(item.2, 100.0); // Principal per month
    }
}
