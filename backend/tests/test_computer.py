"""Tests for Safe Windows Computer Control (Milestone 4).

Validates:
- Allowed folder listing
- File search
- Text file reading
- Unauthorized path rejection
- Directory traversal protection
- Sensitive file protection (.env, id_rsa)
- File modification approval flow
- File deletion rejection without approval
- Command execution rejection without approval
"""

import os
import tempfile
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.computer import (
    PathGuard,
    SecurityViolationError,
    windows_agent,
    permission_engine,
    ActionType,
    ApprovalStatus,
)

client = TestClient(app)


@pytest.fixture
def sandbox_env():
    """Create a temporary directory simulating an allowed project directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a sample allowed file
        sample_file = os.path.join(tmpdir, "sample.txt")
        with open(sample_file, "w", encoding="utf-8") as f:
            f.write("Hello from Friday Safe Agent!")

        # Create a sample python file
        py_file = os.path.join(tmpdir, "main.py")
        with open(py_file, "w", encoding="utf-8") as f:
            f.write("print('Hello Friday')\n")

        # Create a simulated sensitive file (.env)
        env_file = os.path.join(tmpdir, ".env")
        with open(env_file, "w", encoding="utf-8") as f:
            f.write("SECRET_KEY=supersecret123\n")

        # Create a binary file
        bin_file = os.path.join(tmpdir, "image.png")
        with open(bin_file, "wb") as f:
            f.write(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR")

        # Add tmpdir to allowed directories
        guard = windows_agent.path_guard
        canonical = guard.add_allowed_directory(tmpdir)

        yield {
            "tmpdir": canonical,
            "sample_file": sample_file,
            "py_file": py_file,
            "env_file": env_file,
            "bin_file": bin_file,
        }

        # Cleanup allowed dir
        guard.remove_allowed_directory(tmpdir)


def test_system_info_endpoint():
    """Verify system info endpoint returns OS, status, and allowed dir count."""
    response = client.get("/api/computer/system-info")
    assert response.status_code == 200
    data = response.json()
    assert "os" in data
    assert "cpu_cores" in data
    assert data["agent_status"] == "online"
    assert data["binding"] == "127.0.0.1:8000"


def test_allowed_folder_listing(sandbox_env):
    """Verify allowed folder listing returns valid metadata."""
    response = client.get("/api/computer/allowed-dirs")
    assert response.status_code == 200
    dirs = response.json()
    assert isinstance(dirs, list)
    paths = [d["path"] for d in dirs]
    assert sandbox_env["tmpdir"] in paths


def test_file_listing_in_allowed_folder(sandbox_env):
    """Verify listing files within an allowed folder."""
    response = client.get(f"/api/computer/files/list?path={sandbox_env['tmpdir']}")
    assert response.status_code == 200
    files = response.json()
    filenames = [f["name"] for f in files]
    assert "sample.txt" in filenames
    assert "main.py" in filenames


def test_file_search_within_allowed_folder(sandbox_env):
    """Verify search finds files by name within allowed directories."""
    response = client.get(f"/api/computer/files/search?query=sample&path={sandbox_env['tmpdir']}")
    assert response.status_code == 200
    results = response.json()
    assert len(results) >= 1
    assert any(r["name"] == "sample.txt" for r in results)


def test_text_file_reading(sandbox_env):
    """Verify reading a text/source file succeeds."""
    response = client.get(f"/api/computer/files/read?path={sandbox_env['sample_file']}")
    assert response.status_code == 200
    data = response.json()
    assert "Hello from Friday Safe Agent!" in data["content"]
    assert data["lines"] == 1


def test_unauthorized_path_rejection():
    """Verify accessing a path outside allowed folders is rejected with 403."""
    unauthorized_path = r"C:\Windows\System32\drivers\etc\hosts"
    response = client.get(f"/api/computer/files/read?path={unauthorized_path}")
    assert response.status_code == 403
    assert "outside permitted directories" in response.json()["detail"].lower()


def test_directory_traversal_protection(sandbox_env):
    """Verify directory traversal (..) is blocked."""
    traversal_path = os.path.join(sandbox_env["tmpdir"], "..", "..", "Windows", "System32", "calc.exe")
    response = client.get(f"/api/computer/files/read?path={traversal_path}")
    assert response.status_code == 403
    assert "outside permitted directories" in response.json()["detail"].lower()


def test_sensitive_file_protection(sandbox_env):
    """Verify reading protected files like .env is strictly blocked even inside allowed folder."""
    response = client.get(f"/api/computer/files/read?path={sandbox_env['env_file']}")
    assert response.status_code == 403
    assert "sensitive file pattern" in response.json()["detail"].lower()


def test_binary_file_reading_rejected(sandbox_env):
    """Verify binary files are rejected from text reading."""
    response = client.get(f"/api/computer/files/read?path={sandbox_env['bin_file']}")
    assert response.status_code == 403
    assert "binary file" in response.json()["detail"].lower()


def test_file_modification_approval_flow(sandbox_env):
    """Verify file modification requires explicit approval and is single-use."""
    new_content = "Hello Friday Updated Content!"
    # 1. Request modify
    req_payload = {
        "action_name": "modify_file",
        "target": sandbox_env["sample_file"],
        "content": new_content,
        "explanation": "Update welcome greeting",
    }
    req_res = client.post("/api/computer/actions/request", json=req_payload)
    assert req_res.status_code == 200
    req_data = req_res.json()
    approval_id = req_data["id"]
    assert req_data["status"] == "pending"
    assert req_data["risk_level"] == "medium"
    assert "diff" in req_data["details"]

    # File should not be modified yet!
    with open(sandbox_env["sample_file"], "r", encoding="utf-8") as f:
        assert f.read() == "Hello from Friday Safe Agent!"

    # 2. Approve and Execute
    appr_res = client.post(f"/api/computer/actions/{approval_id}/approve")
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "executed"

    # Now file is modified
    with open(sandbox_env["sample_file"], "r", encoding="utf-8") as f:
        assert f.read() == new_content

    # 3. Verify single-use: Re-approving fails
    reuse_res = client.post(f"/api/computer/actions/{approval_id}/approve")
    assert reuse_res.status_code == 400


def test_file_deletion_rejection(sandbox_env):
    """Verify destructive delete action can be rejected and file remains untouched."""
    target = sandbox_env["py_file"]
    assert os.path.exists(target)

    # 1. Request delete
    req_res = client.post(
        "/api/computer/actions/request",
        json={"action_name": "delete_path", "target": target, "explanation": "Remove script"},
    )
    assert req_res.status_code == 200
    approval_id = req_res.json()["id"]
    assert req_res.json()["risk_level"] == "critical"

    # 2. Reject request
    rej_res = client.post(
        f"/api/computer/actions/{approval_id}/reject",
        json={"reason": "User denied deletion"},
    )
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == "rejected"

    # File must still exist
    assert os.path.exists(target)


def test_command_execution_rejection(sandbox_env):
    """Verify execution action requires explicit approval and is never run automatically."""
    req_res = client.post(
        "/api/computer/actions/request",
        json={
            "action_name": "execute_command",
            "target": "echo test",
            "cwd": sandbox_env["tmpdir"],
            "explanation": "Test echo command",
        },
    )
    assert req_res.status_code == 200
    data = req_res.json()
    assert data["status"] == "pending"
    assert data["risk_level"] == "high"


def test_project_inspector_endpoint():
    """Verify project inspection returns tech stack, key files, and tree summary."""
    response = client.post("/api/computer/inspect-project")
    assert response.status_code == 200
    data = response.json()
    assert "project_name" in data
    assert "tech_stack" in data
    assert "key_files" in data
    assert "tree" in data
    assert "summary_bn" in data
    assert "summary_en" in data


def test_voice_chat_system_info_intent():
    """Verify speaking 'ল্যাপটপ ইনফো দেখাও' returns live system hardware information."""
    payload = {"message": "ল্যাপটপ ইনফো দেখাও", "history": []}
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "local-windows-agent"
    assert "সিপিইউ" in data["reply"] or "অপারেটিং সিস্টেম" in data["reply"]


def test_voice_chat_inspect_project_intent():
    """Verify speaking 'প্রজেক্ট ইন্সপেক্ট করো' returns codebase analysis."""
    payload = {"message": "প্রজেক্ট ইন্সপেক্ট করো", "history": []}
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "local-windows-agent"
    assert "প্রজেক্ট" in data["reply"]
    assert "টেক স্ট্যাক" in data["reply"] or "কনফিগারেশন" in data["reply"]


def test_voice_chat_list_files_intent():
    """Verify speaking 'ফাইলগুলো দেখাও' lists permitted files."""
    payload = {"message": "ফাইলগুলো দেখাও", "history": []}
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "local-windows-agent"
    assert "ডিরেক্টরি" in data["reply"] or "ফাইলসমূহ" in data["reply"]


def test_voice_chat_create_file_intent():
    """Verify speaking 'নতুন ফাইল তৈরি করো test_voice.txt' generates an explicit approval request."""
    payload = {"message": "নতুন ফাইল তৈরি করো test_voice.txt", "history": []}
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "local-windows-agent"
    assert "অনুমোদন" in data["reply"] or "Approval" in data["reply"]


def test_voice_chat_shutdown_laptop_intent():
    """Verify speaking 'shut down laptop' generates a critical approval request instead of mock demo."""
    payload = {"message": "shut down laptop", "history": []}
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "local-windows-agent"
    assert "Confirmation Required" in data["reply"] or "শাটডাউন অনুমোদন" in data["reply"]
    # Verify a pending request was actually created
    pending = permission_engine.get_pending_requests()
    assert any(p.action_name == "power_shutdown" for p in pending)



