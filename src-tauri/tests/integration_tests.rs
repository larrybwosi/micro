use microfinance_core::*;

#[test]
fn test_database_lifecycle_integration() {
    let conn = rusqlite::Connection::open_in_memory().unwrap();
    init_db(&conn).unwrap();

    let borrower_id = create_borrower(&conn, Borrower {
        id: None,
        first_name: "John".to_string(),
        last_name: "Doe".to_string(),
        email: "john@example.com".to_string(),
        phone: "123456".to_string(),
        national_id: "NAT-123".to_string(),
        address: "123 Main St".to_string(),
        credit_score: 750,
        status: "Active".to_string(),
        created_at: None,
    }).unwrap();

    let product_id = create_loan_product(&conn, LoanProduct {
        id: None,
        name: "Standard Loan".to_string(),
        code: "STD-01".to_string(),
        description: "Standard interest loan".to_string(),
        interest_method: "REDUCING_BALANCE".to_string(),
        annual_interest_rate: 12.0,
        min_amount: 100.0,
        max_amount: 10000.0,
        min_term_months: 1,
        max_term_months: 24,
        payment_frequency: "MONTHLY".to_string(),
        origination_fee_percent: 1.0,
        late_fee_percent: 2.0,
        grace_period_days: 5,
        created_at: None,
    }).unwrap();

    let borrowers = get_all_borrowers(&conn).unwrap();
    let products = get_all_loan_products(&conn).unwrap();

    // Create a new loan
    let new_loan = Loan {
        id: None,
        borrower_id: borrowers[0].id.unwrap(),
        loan_product_id: products[0].id.unwrap(),
        loan_number: "".to_string(),
        principal_amount: 5000.0,
        annual_interest_rate: 12.0,
        interest_method: "REDUCING_BALANCE".to_string(),
        term_months: 6,
        payment_frequency: "MONTHLY".to_string(),
        origination_fee: 75.0,
        status: "PENDING_APPROVAL".to_string(),
        application_date: "2026-01-01".to_string(),
        approval_date: None,
        disbursement_date: None,
        maturity_date: None,
        notes: Some("Test loan for verification".to_string()),
        created_at: None,
        borrower_name: None,
        product_name: None,
        total_interest: None,
        total_payable: None,
        amount_paid: None,
        balance_remaining: None,
    };

    let loan_id = create_loan(&conn, new_loan).unwrap();
    assert!(loan_id > 0);

    // Verify initial schedule generated
    let schedule = get_loan_schedule(&conn, loan_id).unwrap();
    assert_eq!(schedule.len(), 6);
    assert_eq!(schedule[0].status, "PENDING");

    // Approve loan
    update_loan_status(
        &conn,
        loan_id,
        "APPROVED".to_string(),
        Some("Approved by Admin".to_string()),
    )
    .unwrap();
    let loans = get_all_loans(&conn, None).unwrap();
    let approved_loan = loans.iter().find(|l| l.id == Some(loan_id)).unwrap();
    assert_eq!(approved_loan.status, "APPROVED");

    // Disburse loan
    update_loan_status(&conn, loan_id, "DISBURSED".to_string(), None).unwrap();
    let loans_active = get_all_loans(&conn, None).unwrap();
    let active_loan = loans_active.iter().find(|l| l.id == Some(loan_id)).unwrap();
    assert_eq!(active_loan.status, "ACTIVE");

    // Record repayment
    let installment_total = schedule[0].total_installment;
    let tx = record_repayment(
        &conn,
        loan_id,
        installment_total,
        "CASH".to_string(),
        "REF-1001".to_string(),
        "First monthly installment".to_string(),
    )
    .unwrap();
    assert_eq!(tx.amount, installment_total);

    // Verify schedule updated to PAID
    let updated_schedule = get_loan_schedule(&conn, loan_id).unwrap();
    assert_eq!(updated_schedule[0].status, "PAID");

    // Check stats
    let stats = get_dashboard_stats(&conn).unwrap();
    assert!(stats.total_collected_revenue >= installment_total);
}

#[test]
fn test_full_repayment_and_loan_closure() {
    let conn = rusqlite::Connection::open_in_memory().unwrap();
    init_db(&conn).unwrap();

    let b_id = create_borrower(&conn, Borrower {
        id: None,
        first_name: "Jane".to_string(),
        last_name: "Smith".to_string(),
        email: "jane@example.com".to_string(),
        phone: "987654".to_string(),
        national_id: "NAT-456".to_string(),
        address: "456 Oak St".to_string(),
        credit_score: 700,
        status: "Active".to_string(),
        created_at: None,
    }).unwrap();

    let p_id = create_loan_product(&conn, LoanProduct {
        id: None,
        name: "Flat Rate Loan".to_string(),
        code: "FLT-01".to_string(),
        description: "Flat rate interest loan".to_string(),
        interest_method: "FLAT_RATE".to_string(),
        annual_interest_rate: 12.0,
        min_amount: 100.0,
        max_amount: 5000.0,
        min_term_months: 1,
        max_term_months: 12,
        payment_frequency: "MONTHLY".to_string(),
        origination_fee_percent: 1.0,
        late_fee_percent: 2.0,
        grace_period_days: 3,
        created_at: None,
    }).unwrap();

    let borrowers = get_all_borrowers(&conn).unwrap();
    let products = get_all_loan_products(&conn).unwrap();

    let loan = Loan {
        id: None,
        borrower_id: borrowers[0].id.unwrap(),
        loan_product_id: products[0].id.unwrap(),
        loan_number: "".to_string(),
        principal_amount: 1000.0,
        annual_interest_rate: 12.0,
        interest_method: "FLAT_RATE".to_string(),
        term_months: 2,
        payment_frequency: "MONTHLY".to_string(),
        origination_fee: 10.0,
        status: "PENDING_APPROVAL".to_string(),
        application_date: "2026-01-01".to_string(),
        approval_date: None,
        disbursement_date: None,
        maturity_date: None,
        notes: None,
        created_at: None,
        borrower_name: None,
        product_name: None,
        total_interest: None,
        total_payable: None,
        amount_paid: None,
        balance_remaining: None,
    };

    let loan_id = create_loan(&conn, loan).unwrap();
    update_loan_status(&conn, loan_id, "APPROVED".to_string(), None).unwrap();
    update_loan_status(&conn, loan_id, "DISBURSED".to_string(), None).unwrap();

    let schedule = get_loan_schedule(&conn, loan_id).unwrap();
    let total_payable: f64 = schedule.iter().map(|s| s.total_installment).sum();

    // Pay full loan balance in single transaction
    record_repayment(
        &conn,
        loan_id,
        total_payable,
        "BANK_TRANSFER".to_string(),
        "PAY-FULL".to_string(),
        "Full lump-sum settlement".to_string(),
    )
    .unwrap();

    let updated_loans = get_all_loans(&conn, None).unwrap();
    let closed_loan = updated_loans
        .iter()
        .find(|l| l.id == Some(loan_id))
        .unwrap();
    assert_eq!(closed_loan.status, "CLOSED");
    assert_eq!(closed_loan.balance_remaining.unwrap(), 0.0);
}
