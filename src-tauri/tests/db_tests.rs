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
