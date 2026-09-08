#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use microfinance_core::*;
use rusqlite::Connection;
use std::sync::{Arc, Mutex};
use tauri::{Manager, State};

pub struct AppState {
    pub db: Mutex<Connection>,
}

#[tauri::command]
fn get_sync_status_cmd(sync_state: State<SharedSyncState>) -> Result<SyncStatus, String> {
    let state = sync_state.lock().map_err(|e| e.to_string())?;
    Ok(state.to_status())
}

#[tauri::command]
fn start_hub_cmd(sync_state: State<SharedSyncState>) -> Result<SyncStatus, String> {
    start_hub_server(sync_state.inner().clone())?;
    let state = sync_state.lock().map_err(|e| e.to_string())?;
    Ok(state.to_status())
}

#[tauri::command]
fn pair_spoke_cmd(
    sync_state: State<SharedSyncState>,
    hub_ip: String,
    pairing_code: String,
    device_name: String,
) -> Result<SyncStatus, String> {
    pair_spoke_device(
        sync_state.inner().clone(),
        hub_ip,
        pairing_code,
        device_name,
    )
}

#[tauri::command]
fn sync_api_cmd(
    sync_state: State<SharedSyncState>,
    server_url: String,
) -> Result<SyncStatus, String> {
    sync_with_api_engine(sync_state.inner().clone(), server_url)
}

#[tauri::command]
fn trigger_sync_cmd(sync_state: State<SharedSyncState>) -> Result<SyncStatus, String> {
    trigger_sync_now(sync_state.inner().clone())
}

#[tauri::command]
fn get_local_ip_cmd() -> String {
    get_local_ip()
}

#[tauri::command]
fn login_cmd(
    state: State<AppState>,
    username: String,
    password: String,
) -> Result<Option<User>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    authenticate_user(&conn, &username, &password).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_users_cmd(state: State<AppState>) -> Result<Vec<User>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_all_users(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_user_cmd(state: State<AppState>, user: User) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    create_user(&conn, user).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_user_cmd(state: State<AppState>, user: User) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    update_user(&conn, user).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_user_cmd(state: State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    delete_user(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_settings_cmd(state: State<AppState>) -> Result<PlatformSettings, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_platform_settings(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_settings_cmd(state: State<AppState>, settings: PlatformSettings) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    update_platform_settings(&conn, settings).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_borrowers(state: State<AppState>) -> Result<Vec<Borrower>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_all_borrowers(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_borrower_cmd(state: State<AppState>, borrower: Borrower) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    create_borrower(&conn, borrower).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_borrower_cmd(state: State<AppState>, borrower: Borrower) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    update_borrower(&conn, borrower).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_borrower_cmd(state: State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    delete_borrower(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_loan_products_cmd(state: State<AppState>) -> Result<Vec<LoanProduct>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_all_loan_products(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_loan_product_cmd(state: State<AppState>, product: LoanProduct) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    create_loan_product(&conn, product).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_loan_product_cmd(state: State<AppState>, product: LoanProduct) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    update_loan_product(&conn, product).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_loan_product_cmd(state: State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    delete_loan_product(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_loans_cmd(
    state: State<AppState>,
    status_filter: Option<String>,
) -> Result<Vec<Loan>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_all_loans(&conn, status_filter).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_loan_cmd(state: State<AppState>, loan: Loan) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    create_loan(&conn, loan).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_loan_status_cmd(
    state: State<AppState>,
    loan_id: i64,
    status: String,
    notes: Option<String>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    update_loan_status(&conn, loan_id, status, notes).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_loan_schedule_cmd(
    state: State<AppState>,
    loan_id: i64,
) -> Result<Vec<ScheduleItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_loan_schedule(&conn, loan_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_loan_transactions_cmd(
    state: State<AppState>,
    loan_id: i64,
) -> Result<Vec<Transaction>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_loan_transactions(&conn, loan_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn record_repayment_cmd(
    state: State<AppState>,
    loan_id: i64,
    amount: f64,
    payment_method: String,
    reference: String,
    notes: String,
    payment_date: Option<String>,
) -> Result<Transaction, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    record_repayment(
        &conn,
        loan_id,
        amount,
        payment_method,
        reference,
        notes,
        payment_date,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_dashboard_stats_cmd(state: State<AppState>) -> Result<DashboardStats, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_dashboard_stats(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn calculate_preview_schedule_cmd(
    principal: f64,
    annual_rate: f64,
    term_months: i32,
    interest_method: String,
    start_date: String,
) -> Result<Vec<ScheduleItem>, String> {
    let schedule = calculate_loan_schedule(
        principal,
        annual_rate,
        term_months,
        &interest_method,
        &start_date,
    );
    let items = schedule
        .into_iter()
        .map(|(inst_no, due_date, p_due, i_due, total)| ScheduleItem {
            id: None,
            loan_id: 0,
            installment_number: inst_no,
            due_date,
            principal_due: p_due,
            interest_due: i_due,
            fee_due: 0.0,
            total_installment: total,
            principal_paid: 0.0,
            interest_paid: 0.0,
            fee_paid: 0.0,
            status: "PENDING".to_string(),
            paid_date: None,
        })
        .collect();
    Ok(items)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let db_path = match app.path().app_data_dir() {
                Ok(mut p) => {
                    std::fs::create_dir_all(&p).ok();
                    p.push("scryme_micro.db");
                    p
                }
                Err(_) => std::path::PathBuf::from("scryme_micro.db"),
            };

            let conn = Connection::open(&db_path).expect("Failed to open SQLite database");
            init_db(&conn).expect("Failed to initialize database");

            let sync_state: SharedSyncState =
                Arc::new(Mutex::new(SyncEngineState::new(db_path.clone())));

            app.manage(AppState {
                db: Mutex::new(conn),
            });
            app.manage(sync_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            login_cmd,
            get_users_cmd,
            create_user_cmd,
            update_user_cmd,
            delete_user_cmd,
            get_settings_cmd,
            update_settings_cmd,
            get_borrowers,
            create_borrower_cmd,
            update_borrower_cmd,
            delete_borrower_cmd,
            get_loan_products_cmd,
            create_loan_product_cmd,
            update_loan_product_cmd,
            delete_loan_product_cmd,
            get_loans_cmd,
            create_loan_cmd,
            update_loan_status_cmd,
            get_loan_schedule_cmd,
            get_loan_transactions_cmd,
            record_repayment_cmd,
            get_dashboard_stats_cmd,
            calculate_preview_schedule_cmd,
            get_sync_status_cmd,
            start_hub_cmd,
            pair_spoke_cmd,
            sync_api_cmd,
            trigger_sync_cmd,
            get_local_ip_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
