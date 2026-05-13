use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;

pub struct BackendChild(pub Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(BackendChild(Mutex::new(None)))
        .setup(|app| {
            start_backend(app.handle())?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("erro ao montar aplicação Tauri")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                stop_backend(&app_handle);
            }
        });
}

fn backend_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if cfg!(debug_assertions) {
        Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../backend"))
    } else {
        app.path()
            .resource_dir()
            .map_err(|e| e.to_string())
            .map(|p| p.join("backend"))
    }
}

fn python_executable(backend: &PathBuf) -> PathBuf {
    if cfg!(target_os = "windows") {
        backend.join(".venv").join("Scripts").join("python.exe")
    } else {
        backend.join(".venv").join("bin").join("python")
    }
}

fn start_backend(handle: &tauri::AppHandle) -> Result<(), String> {
    let dir = backend_dir(handle)?;
    let py = python_executable(&dir);
    if !py.exists() {
        return Err(format!(
            "Venv não encontrado em {:?}.\nCrie com: cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt",
            py
        ));
    }

    let child = Command::new(&py)
        .args([
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
        ])
        .current_dir(&dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Falha ao iniciar uvicorn: {e}"))?;

    let state = handle.state::<BackendChild>();
    *state.0.lock().map_err(|e| e.to_string())? = Some(child);
    Ok(())
}

fn stop_backend(handle: &tauri::AppHandle) {
    let Some(state) = handle.try_state::<BackendChild>() else {
        return;
    };
    let Ok(mut guard) = state.0.lock() else {
        return;
    };
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
}
