use crate::db::{export_sync_data, import_sync_data, save_sync_config};
use crate::models::{SyncPayload, SyncStatus};
use chrono::Local;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::net::UdpSocket;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;
use tiny_http::{Header, Response, Server};

fn json_response(status: u16, body: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let res = Response::from_string(body).with_status_code(status);
    if let Ok(header) = Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]) {
        res.with_header(header)
    } else {
        res
    }
}

pub fn lock_state<'a, T>(mutex: &'a Mutex<T>) -> std::sync::MutexGuard<'a, T> {
    match mutex.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    }
}

pub fn get_local_ip() -> String {
    if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(addr) = socket.local_addr() {
                return addr.ip().to_string();
            }
        }
    }
    "127.0.0.1".to_string()
}

pub fn generate_pairing_code() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(123456);
    let code = (nanos % 900_000) + 100_000;
    format!("{}", code)
}

pub struct SyncEngineState {
    pub mode: String, // "OFFLINE", "HUB", "SPOKE"
    pub local_ip: String,
    pub port: u16,
    pub pairing_code: String,
    pub hub_ip: Option<String>,
    pub auth_token: Option<String>,
    pub paired_devices: Vec<String>,
    pub valid_tokens: Vec<String>,
    pub last_synced_at: Option<String>,
    pub is_connected: bool,
    pub error_message: Option<String>,
    pub db_path: PathBuf,
    pub hub_running: bool,
}

impl SyncEngineState {
    pub fn new(db_path: PathBuf) -> Self {
        Self {
            mode: "OFFLINE".to_string(),
            local_ip: get_local_ip(),
            port: 8765,
            pairing_code: generate_pairing_code(),
            hub_ip: None,
            auth_token: None,
            paired_devices: Vec::new(),
            valid_tokens: Vec::new(),
            last_synced_at: None,
            is_connected: false,
            error_message: None,
            db_path,
            hub_running: false,
        }
    }

    pub fn to_status(&self) -> SyncStatus {
        SyncStatus {
            mode: self.mode.clone(),
            local_ip: self.local_ip.clone(),
            port: self.port,
            pairing_code: self.pairing_code.clone(),
            hub_ip: self.hub_ip.clone(),
            auth_token: self.auth_token.clone(),
            paired_devices: self.paired_devices.clone(),
            last_synced_at: self.last_synced_at.clone(),
            is_connected: self.is_connected,
            error_message: self.error_message.clone(),
        }
    }
}

pub type SharedSyncState = Arc<Mutex<SyncEngineState>>;

#[derive(Serialize, Deserialize)]
pub struct PairRequest {
    pub pairing_code: String,
    pub device_name: String,
}

#[derive(Serialize, Deserialize)]
pub struct PairResponse {
    pub status: String,
    pub auth_token: String,
}

pub fn start_hub_server(shared_state: SharedSyncState) -> Result<(), String> {
    let mut state = lock_state(&shared_state);
    if state.hub_running {
        return Ok(());
    }

    state.mode = "HUB".to_string();
    state.is_connected = true;
    if state.pairing_code.is_empty() {
        state.pairing_code = generate_pairing_code();
    }
    state.hub_running = true;
    state.local_ip = get_local_ip();

    if let Ok(conn) = Connection::open(&state.db_path) {
        let _ = save_sync_config(&conn, "HUB", None, None, Some(&state.pairing_code));
    }

    let port = state.port;
    let db_path = state.db_path.clone();
    let state_clone = Arc::clone(&shared_state);

    thread::spawn(move || {
        let server_addr = format!("0.0.0.0:{}", port);
        let server = match Server::http(&server_addr) {
            Ok(s) => s,
            Err(e) => {
                let mut st = lock_state(&state_clone);
                st.error_message = Some(format!("Failed to bind Hub server: {}", e));
                st.hub_running = false;
                st.is_connected = false;
                return;
            }
        };

        for mut request in server.incoming_requests() {
            let url = request.url().to_string();
            let method = request.method().as_str().to_string();

            if url == "/api/status" {
                let json = r#"{"status":"online","role":"HUB"}"#;
                let _ = request.respond(json_response(200, json));
                continue;
            }

            if url == "/api/pair" && method == "POST" {
                let mut body = String::new();
                let _ = request.as_reader().read_to_string(&mut body);
                if let Ok(pair_req) = serde_json::from_str::<PairRequest>(&body) {
                    let mut st = lock_state(&state_clone);
                    if pair_req.pairing_code.trim() == st.pairing_code.trim() {
                        let token = format!("TOK-{}", Local::now().format("%Y%m%d%H%M%S%f"));
                        st.valid_tokens.push(token.clone());
                        let dev_name = if pair_req.device_name.is_empty() {
                            format!("Spoke-{}", st.paired_devices.len() + 1)
                        } else {
                            pair_req.device_name
                        };
                        st.paired_devices.push(dev_name);

                        let resp = PairResponse {
                            status: "paired".to_string(),
                            auth_token: token,
                        };
                        if let Ok(json) = serde_json::to_string(&resp) {
                            let _ = request.respond(json_response(200, &json));
                            continue;
                        }
                    }
                }
                let _ = request.respond(json_response(401, r#"{"error":"Invalid pairing code"}"#));
                continue;
            }

            if url == "/api/sync/import" && method == "POST" {
                let mut authorized = false;
                for header in request.headers() {
                    if header.field.equiv("Authorization") {
                        let val = header.value.as_str();
                        let token = val.trim_start_matches("Bearer ").trim();
                        let st = lock_state(&state_clone);
                        if st.valid_tokens.iter().any(|t| t == token) {
                            authorized = true;
                        }
                    }
                }

                if !authorized {
                    let _ =
                        request.respond(json_response(401, r#"{"error":"Unauthorized token"}"#));
                    continue;
                }

                let mut body = String::new();
                let _ = request.as_reader().read_to_string(&mut body);

                if let Ok(incoming_payload) = serde_json::from_str::<SyncPayload>(&body) {
                    if let Ok(conn) = Connection::open(&db_path) {
                        let _ = import_sync_data(&conn, &incoming_payload);
                        if let Ok(updated_payload) = export_sync_data(&conn) {
                            let mut st = lock_state(&state_clone);
                            st.last_synced_at = Some(Local::now().to_rfc3339());
                            if let Ok(json) = serde_json::to_string(&updated_payload) {
                                let _ = request.respond(json_response(200, &json));
                                continue;
                            }
                        }
                    }
                }

                let _ = request.respond(json_response(500, r#"{"error":"Sync failed"}"#));
                continue;
            }

            let res = Response::from_string("Not Found").with_status_code(404);
            let _ = request.respond(res);
        }
    });

    Ok(())
}

pub fn pair_spoke_device(
    shared_state: SharedSyncState,
    hub_ip: String,
    pairing_code: String,
    device_name: String,
) -> Result<SyncStatus, String> {
    let clean_ip = hub_ip.trim();
    let url = format!("http://{}:8765/api/pair", clean_ip);

    let req_body = PairRequest {
        pairing_code: pairing_code.trim().to_string(),
        device_name,
    };

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .post(&url)
        .json(&req_body)
        .send()
        .map_err(|e| format!("Could not connect to Hub at {}: {}", clean_ip, e))?;

    if resp.status().is_success() {
        let pair_res = resp
            .json::<PairResponse>()
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        {
            let mut st = lock_state(&shared_state);
            st.mode = "SPOKE".to_string();
            st.hub_ip = Some(clean_ip.to_string());
            st.auth_token = Some(pair_res.auth_token.clone());
            st.is_connected = true;
            st.error_message = None;

            if let Ok(conn) = Connection::open(&st.db_path) {
                let _ = save_sync_config(
                    &conn,
                    "SPOKE",
                    Some(clean_ip),
                    Some(&pair_res.auth_token),
                    None,
                );
            }
        }

        // Auto sync all data immediately after connecting as a spoke
        let sync_res = trigger_sync_now(shared_state.clone());
        if let Err(e) = sync_res {
            eprintln!("Auto-sync on spoke pairing encountered warning: {}", e);
        }

        let st = lock_state(&shared_state);
        Ok(st.to_status())
    } else {
        Err("Pairing rejected by Hub. Please check pairing code.".to_string())
    }
}

pub fn trigger_sync_now(shared_state: SharedSyncState) -> Result<SyncStatus, String> {
    let (hub_ip, auth_token, db_path) = {
        let st = lock_state(&shared_state);
        if st.mode != "SPOKE" {
            return Ok(st.to_status());
        }
        let ip = st.hub_ip.clone().ok_or("Hub IP not set")?;
        let token = st.auth_token.clone().ok_or("Not paired with Hub")?;
        (ip, token, st.db_path.clone())
    };

    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    let local_payload = export_sync_data(&conn).map_err(|e| e.to_string())?;

    let url = format!("http://{}:8765/api/sync/import", hub_ip);
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", auth_token))
        .json(&local_payload)
        .send()
        .map_err(|e| format!("Failed sync request to Hub: {}", e))?;

    if resp.status().is_success() {
        let hub_payload = resp
            .json::<SyncPayload>()
            .map_err(|e| format!("Failed to decode Hub sync payload: {}", e))?;

        import_sync_data(&conn, &hub_payload).map_err(|e| e.to_string())?;

        let mut st = lock_state(&shared_state);
        st.last_synced_at = Some(Local::now().to_rfc3339());
        st.is_connected = true;
        st.error_message = None;
        Ok(st.to_status())
    } else {
        let mut st = lock_state(&shared_state);
        st.is_connected = false;
        st.error_message = Some("Sync failed with Hub".to_string());
        Err("Hub returned error status during sync".to_string())
    }
}
