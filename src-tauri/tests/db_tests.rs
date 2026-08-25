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
