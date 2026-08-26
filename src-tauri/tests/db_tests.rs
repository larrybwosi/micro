use microfinance_core::*;

#[test]
fn test_schedule_calculations() {
    let flat_schedule = calculate_loan_schedule(1000.0, 12.0, 12, "FLAT_RATE", "2026-01-01");
    assert_eq!(flat_schedule.len(), 12);
    let total_flat_interest: f64 = flat_schedule.iter().map(|s| s.3).sum();
    assert!((total_flat_interest - 120.0).abs() < 0.5);

    let emi_schedule = calculate_loan_schedule(1000.0, 12.0, 12, "REDUCING_BALANCE", "2026-01-01");
    assert_eq!(emi_schedule.len(), 12);
    let total_emi_principal: f64 = emi_schedule.iter().map(|s| s.2).sum();
    assert!((total_emi_principal - 1000.0).abs() < 0.5);

    let bullet_schedule = calculate_loan_schedule(1000.0, 12.0, 12, "INTEREST_ONLY", "2026-01-01");
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
    assert_eq!(settings.currency_symbol, "$");

    // Test update settings
    let new_settings = PlatformSettings {
        org_name: "Acme Finance".to_string(),
        currency_symbol: "€".to_string(),
        default_annual_interest_rate: 14.5,
        default_origination_fee_percent: 2.0,
        theme: "dark".to_string(),
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
fn test_edge_case_calculations() {
    // 0 principal or term
    let zero_principal = calculate_loan_schedule(0.0, 12.0, 12, "FLAT_RATE", "2026-01-01");
    assert!(zero_principal.is_empty());

    let zero_term = calculate_loan_schedule(1000.0, 12.0, 0, "FLAT_RATE", "2026-01-01");
    assert!(zero_term.is_empty());

    // 0 interest rate
    let zero_rate = calculate_loan_schedule(1200.0, 0.0, 12, "REDUCING_BALANCE", "2026-01-01");
    assert_eq!(zero_rate.len(), 12);
    for item in &zero_rate {
        assert_eq!(item.3, 0.0); // Interest due is 0
        assert_eq!(item.2, 100.0); // Principal per month
    }
}
