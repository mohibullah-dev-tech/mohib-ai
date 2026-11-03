"""Windows Local Computer Agent Service.

Provides safe, restricted inspection, file management, and approved execution
within user-permitted directories only.
"""

import os
import platform
import shutil
import difflib
import subprocess
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import settings
from app.services.computer.path_guard import PathGuard, SecurityViolationError
from app.services.computer.permission_engine import (
    permission_engine,
    ActionType,
    RiskLevel,
    ApprovalStatus,
    ApprovalRequest,
)

logger = logging.getLogger("mohib_ai.services.computer.windows_agent")


class WindowsComputerAgent:
    """Agent that safely manages Windows desktop interactions confined to allowed directories."""

    def __init__(self, path_guard: Optional[PathGuard] = None):
        self.path_guard = path_guard or PathGuard()

    # -------------------------------------------------------------------------
    # 1. System Information & Status
    # -------------------------------------------------------------------------
    def get_system_info(self) -> Dict[str, Any]:
        """Return safe, non-sensitive Windows system overview."""
        allowed = self.path_guard.allowed_directories

        # Safe drive disk usage for first allowed folder
        disk_stats = None
        if allowed and os.path.exists(allowed[0]):
            try:
                usage = shutil.disk_usage(allowed[0])
                disk_stats = {
                    "total_gb": round(usage.total / (1024**3), 2),
                    "used_gb": round(usage.used / (1024**3), 2),
                    "free_gb": round(usage.free / (1024**3), 2),
                    "percent_used": round((usage.used / usage.total) * 100, 1),
                }
            except Exception:
                disk_stats = None

        return {
            "os": platform.system(),
            "os_release": platform.release(),
            "os_version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "cpu_cores": os.cpu_count() or 1,
            "python_version": platform.python_version(),
            "agent_status": "online" if settings.LOCAL_AGENT_ENABLED else "disabled",
            "binding": f"{settings.BACKEND_HOST}:{settings.BACKEND_PORT}",
            "allowed_directories_count": len(allowed),
            "pending_approvals_count": len(permission_engine.get_pending_requests()),
            "disk": disk_stats,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # -------------------------------------------------------------------------
    # 2. Allowed Directories Management
    # -------------------------------------------------------------------------
    def get_allowed_directories(self) -> List[Dict[str, Any]]:
        """List currently permitted directories and basic metadata."""
        results = []
        for d in self.path_guard.allowed_directories:
            exists = os.path.isdir(d)
            item = {
                "path": d,
                "exists": exists,
                "name": os.path.basename(d) or d,
            }
            if exists:
                try:
                    entries = list(os.scandir(d))
                    item["files_count"] = sum(1 for e in entries if e.is_file())
                    item["folders_count"] = sum(1 for e in entries if e.is_dir())
                except Exception:
                    item["files_count"] = 0
                    item["folders_count"] = 0
            results.append(item)
        return results

    def add_allowed_directory(self, folder_path: str) -> Dict[str, Any]:
        """Add a directory to permitted folders."""
        canonical = self.path_guard.add_allowed_directory(folder_path)
        permission_engine.log_action(
            action_type=ActionType.READ,
            action_name="add_allowed_directory",
            target=canonical,
            status="success",
            details={"path": canonical},
        )
        return {"status": "added", "path": canonical}

    def remove_allowed_directory(self, folder_path: str) -> Dict[str, Any]:
        """Remove a directory from permitted folders."""
        removed = self.path_guard.remove_allowed_directory(folder_path)
        if removed:
            permission_engine.log_action(
                action_type=ActionType.READ,
                action_name="remove_allowed_directory",
                target=folder_path,
                status="success",
                details={"path": folder_path},
            )
        return {"status": "removed" if removed else "not_found", "path": folder_path}

    # -------------------------------------------------------------------------
    # 3. Read Operations (Directory Listing, File Search, Text Reading)
    # -------------------------------------------------------------------------
    def list_directory(self, target_path: Optional[str] = None) -> List[Dict[str, Any]]:
        """List files and folders in an allowed directory."""
        if not target_path or not target_path.strip():
            # If no target path, list the first allowed directory
            allowed = self.path_guard.allowed_directories
            if not allowed:
                return []
            target_path = allowed[0]

        canonical = self.path_guard.validate_path(target_path)
        if not os.path.isdir(canonical):
            raise FileNotFoundError(f"Directory not found: '{target_path}'")

        items = []
        with os.scandir(canonical) as it:
            for entry in it:
                # Skip hidden/protected internal patterns
                if entry.name in {".git", ".next", "node_modules", "venv", "__pycache__"}:
                    continue
                try:
                    stat = entry.stat()
                    is_dir = entry.is_dir()
                    is_text, _ = self.path_guard.is_text_file(entry.path) if not is_dir else (False, "")
                    items.append({
                        "name": entry.name,
                        "path": entry.path,
                        "is_dir": is_dir,
                        "size_bytes": stat.st_size if not is_dir else 0,
                        "modified_at": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
                        "is_text": is_text,
                    })
                except Exception:
                    continue

        items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
        permission_engine.log_action(
            action_type=ActionType.READ,
            action_name="list_directory",
            target=canonical,
            status="success",
            details={"count": len(items)},
        )
        return items

    def search_files(self, query: str, base_path: Optional[str] = None, max_results: int = 40) -> List[Dict[str, Any]]:
        """Search files by name within allowed directories."""
        query_clean = query.strip().lower()
        if not query_clean:
            return []

        search_roots = [self.path_guard.validate_path(base_path)] if base_path else self.path_guard.allowed_directories
        matches = []

        skip_dirs = {".git", ".next", "node_modules", "venv", "__pycache__", ".pytest_cache"}

        for root_dir in search_roots:
            if not os.path.isdir(root_dir):
                continue
            for root, dirs, files in os.walk(root_dir):
                # Filter out heavy and hidden directories
                dirs[:] = [d for d in dirs if d not in skip_dirs and not d.startswith(".")]

                for f in files:
                    if query_clean in f.lower():
                        full_path = os.path.join(root, f)
                        try:
                            valid_path = self.path_guard.validate_path(full_path)
                            stat = os.stat(valid_path)
                            is_text, _ = self.path_guard.is_text_file(valid_path)
                            matches.append({
                                "name": f,
                                "path": valid_path,
                                "size_bytes": stat.st_size,
                                "modified_at": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
                                "is_text": is_text,
                            })
                            if len(matches) >= max_results:
                                break
                        except SecurityViolationError:
                            # Skip protected files like .env
                            continue
                        except Exception:
                            continue
                if len(matches) >= max_results:
                    break

        permission_engine.log_action(
            action_type=ActionType.READ,
            action_name="search_files",
            target=query,
            status="success",
            details={"matches_found": len(matches)},
        )
        return matches

    def read_text_file(self, target_path: str) -> Dict[str, Any]:
        """Safely read supported text/code file within allowed directories."""
        canonical = self.path_guard.validate_path(target_path)

        if not os.path.isfile(canonical):
            raise FileNotFoundError(f"File not found: '{target_path}'")

        stat = os.stat(canonical)
        if stat.st_size > settings.MAX_FILE_READ_BYTES:
            raise SecurityViolationError(
                f"File size ({stat.st_size} bytes) exceeds maximum read limit ({settings.MAX_FILE_READ_BYTES} bytes)."
            )

        is_text, reason = self.path_guard.is_text_file(canonical)
        if not is_text:
            raise SecurityViolationError(f"Cannot read binary file as text: {reason}")

        try:
            with open(canonical, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
        except Exception as e:
            raise IOError(f"Failed to read file: {e}")

        permission_engine.log_action(
            action_type=ActionType.READ,
            action_name="read_text_file",
            target=canonical,
            status="success",
            details={"size_bytes": stat.st_size, "lines": len(content.splitlines())},
        )

        return {
            "path": canonical,
            "filename": os.path.basename(canonical),
            "size_bytes": stat.st_size,
            "lines": len(content.splitlines()),
            "content": content,
            "modified_at": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
        }

    def get_file_metadata(self, target_path: str) -> Dict[str, Any]:
        """Retrieve file metadata (size, timestamps, readability)."""
        canonical = self.path_guard.validate_path(target_path)
        if not os.path.exists(canonical):
            raise FileNotFoundError(f"Path not found: '{target_path}'")

        stat = os.stat(canonical)
        is_dir = os.path.isdir(canonical)
        is_text, _ = self.path_guard.is_text_file(canonical) if not is_dir else (False, "")

        return {
            "path": canonical,
            "filename": os.path.basename(canonical),
            "is_dir": is_dir,
            "size_bytes": stat.st_size if not is_dir else 0,
            "is_text": is_text,
            "created_at": datetime.fromtimestamp(stat.st_ctime, timezone.utc).isoformat(),
            "modified_at": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
            "readable": os.access(canonical, os.R_OK),
            "writable": os.access(canonical, os.W_OK),
        }

    # -------------------------------------------------------------------------
    # 4. Action Approval Requests (WRITE, DESTRUCTIVE, EXECUTION)
    # -------------------------------------------------------------------------
    def request_create_file(self, target_path: str, content: str, explanation: str = "") -> ApprovalRequest:
        """Create a pending request to write a new file."""
        canonical = self.path_guard.validate_path(target_path)
        if os.path.exists(canonical):
            # Overwrite scenario is DESTRUCTIVE
            return self.request_modify_file(
                target_path=canonical,
                new_content=content,
                explanation=explanation or "Overwrite existing file content",
            )

        details = {
            "operation": "create",
            "content_preview": content[:1500],
            "total_chars": len(content),
            "lines_count": len(content.splitlines()),
            "explanation": explanation or f"Create new file '{os.path.basename(canonical)}'",
            "raw_content": content,
        }

        return permission_engine.create_request(
            action_type=ActionType.WRITE,
            action_name="create_file",
            target=canonical,
            details=details,
            risk_level=RiskLevel.MEDIUM,
        )

    def request_modify_file(self, target_path: str, new_content: str, explanation: str = "") -> ApprovalRequest:
        """Create a pending request to edit an existing file with unified diff preview."""
        canonical = self.path_guard.validate_path(target_path)
        if not os.path.isfile(canonical):
            raise FileNotFoundError(f"File to modify does not exist: '{target_path}'")

        # Read existing file for diff
        with open(canonical, "r", encoding="utf-8", errors="replace") as f:
            old_content = f.read()

        old_lines = old_content.splitlines(keepends=True)
        new_lines = new_content.splitlines(keepends=True)
        diff_lines = list(
            difflib.unified_diff(
                old_lines,
                new_lines,
                fromfile=f"a/{os.path.basename(canonical)}",
                tofile=f"b/{os.path.basename(canonical)}",
            )
        )
        diff_text = "".join(diff_lines) or "No changes detected."

        details = {
            "operation": "modify",
            "diff": diff_text,
            "explanation": explanation or f"Modify file '{os.path.basename(canonical)}'",
            "old_lines_count": len(old_lines),
            "new_lines_count": len(new_lines),
            "raw_content": new_content,
        }

        return permission_engine.create_request(
            action_type=ActionType.WRITE,
            action_name="modify_file",
            target=canonical,
            details=details,
            risk_level=RiskLevel.MEDIUM,
        )

    def request_delete_file(self, target_path: str, explanation: str = "") -> ApprovalRequest:
        """Create a pending request to delete a file or directory with DESTRUCTIVE risk."""
        canonical = self.path_guard.validate_path(target_path)
        if not os.path.exists(canonical):
            raise FileNotFoundError(f"Path to delete does not exist: '{target_path}'")

        is_dir = os.path.isdir(canonical)
        stat = os.stat(canonical)

        details = {
            "operation": "delete",
            "is_dir": is_dir,
            "size_bytes": stat.st_size if not is_dir else 0,
            "explanation": explanation or f"Permanently delete {'folder' if is_dir else 'file'} '{os.path.basename(canonical)}'",
            "warning": "⚠️ DESTRUCTIVE ACTION: The target will be permanently deleted from disk. This cannot be undone.",
        }

        return permission_engine.create_request(
            action_type=ActionType.DESTRUCTIVE,
            action_name="delete_path",
            target=canonical,
            details=details,
            risk_level=RiskLevel.CRITICAL,
        )

    def request_execute_command(self, command: str, cwd: Optional[str] = None, explanation: str = "") -> ApprovalRequest:
        """Create a pending request to execute a terminal command."""
        cmd_clean = command.strip()
        if not cmd_clean:
            raise ValueError("Command cannot be empty.")

        # Determine and validate cwd
        if cwd:
            valid_cwd = self.path_guard.validate_path(cwd)
        else:
            allowed = self.path_guard.allowed_directories
            valid_cwd = allowed[0] if allowed else os.path.abspath(".")

        details = {
            "command": cmd_clean,
            "cwd": valid_cwd,
            "explanation": explanation or f"Execute command '{cmd_clean}' in '{valid_cwd}'",
            "warning": "⚠️ EXECUTION ACTION: This command will run in a local subprocess with user privileges.",
        }

        return permission_engine.create_request(
            action_type=ActionType.EXECUTION,
            action_name="execute_command",
            target=cmd_clean,
            details=details,
            risk_level=RiskLevel.HIGH,
        )

    def request_power_action(self, action: str, explanation: str = "") -> ApprovalRequest:
        """Create a pending approval request for system power operations (shutdown, restart, lock)."""
        action_clean = action.lower().strip()
        if action_clean in {"shutdown", "shut_down", "power_off"}:
            cmd = "shutdown /s /t 30 /c \"Friday AI: System shutdown authorized by user\""
            details = {
                "command": cmd,
                "power_action": "shutdown",
                "explanation": explanation or "Windows laptop shutdown requested via Friday voice/chat.",
                "warning": "⚠️ DESTRUCTIVE ACTION: Windows will close all running applications and shut down in 30 seconds. Unsaved work will be lost.",
            }
            return permission_engine.create_request(
                action_type=ActionType.DESTRUCTIVE,
                action_name="power_shutdown",
                target=cmd,
                details=details,
                risk_level=RiskLevel.CRITICAL,
            )
        elif action_clean in {"restart", "reboot"}:
            cmd = "shutdown /r /t 30 /c \"Friday AI: System restart authorized by user\""
            details = {
                "command": cmd,
                "power_action": "restart",
                "explanation": explanation or "Windows laptop restart requested via Friday voice/chat.",
                "warning": "⚠️ DESTRUCTIVE ACTION: Windows will close all running applications and restart in 30 seconds.",
            }
            return permission_engine.create_request(
                action_type=ActionType.DESTRUCTIVE,
                action_name="power_restart",
                target=cmd,
                details=details,
                risk_level=RiskLevel.CRITICAL,
            )
        elif action_clean in {"lock", "lock_screen", "lock_workstation"}:
            cmd = "rundll32.exe user32.dll,LockWorkStation"
            details = {
                "command": cmd,
                "power_action": "lock",
                "explanation": explanation or "Lock Windows desktop screen.",
                "warning": "Locks your desktop workstation immediately.",
            }
            return permission_engine.create_request(
                action_type=ActionType.EXECUTION,
                action_name="power_lock",
                target=cmd,
                details=details,
                risk_level=RiskLevel.LOW,
            )
        elif action_clean in {"cancel", "cancel_shutdown", "abort"}:
            cmd = "shutdown /a"
            details = {
                "command": cmd,
                "power_action": "cancel_shutdown",
                "explanation": explanation or "Cancel scheduled Windows shutdown.",
            }
            return permission_engine.create_request(
                action_type=ActionType.EXECUTION,
                action_name="cancel_shutdown",
                target=cmd,
                details=details,
                risk_level=RiskLevel.LOW,
            )
        else:
            raise ValueError(f"Unsupported power action '{action}'.")

    # -------------------------------------------------------------------------
    # 5. Execution of Approved Actions
    # -------------------------------------------------------------------------
    def approve_and_execute(self, approval_id: str) -> Dict[str, Any]:
        """Approve and execute a pending action in a single atomic flow."""
        # Approve
        req = permission_engine.approve_request(approval_id)

        try:
            result_data = self._dispatch_execution(req)
            permission_engine.mark_executed(
                approval_id=req.id,
                result_message=f"Action '{req.action_name}' on '{req.target}' completed successfully.",
            )
            return {
                "approval_id": req.id,
                "status": "executed",
                "action_name": req.action_name,
                "target": req.target,
                "result": result_data,
            }
        except Exception as e:
            logger.error(f"Execution failed for approval {approval_id}: {e}")
            permission_engine.mark_failed(approval_id=req.id, error_message=str(e))
            raise e

    def _dispatch_execution(self, req: ApprovalRequest) -> Dict[str, Any]:
        """Execute the approved action securely."""
        action_name = req.action_name
        target = req.target
        details = req.details

        if action_name in {"create_file", "modify_file"}:
            valid_path = self.path_guard.validate_path(target)
            content = details.get("raw_content", "")
            # Ensure parent directory exists
            parent_dir = os.path.dirname(valid_path)
            if parent_dir and not os.path.exists(parent_dir):
                os.makedirs(parent_dir, exist_ok=True)

            with open(valid_path, "w", encoding="utf-8") as f:
                f.write(content)

            return {
                "message": f"Successfully wrote {len(content)} characters to '{os.path.basename(valid_path)}'",
                "path": valid_path,
                "bytes_written": len(content.encode("utf-8")),
            }

        elif action_name == "delete_path":
            valid_path = self.path_guard.validate_path(target)
            if not os.path.exists(valid_path):
                return {"message": "Path already did not exist", "path": valid_path}

            if os.path.isdir(valid_path):
                shutil.rmtree(valid_path)
                return {"message": f"Successfully deleted directory '{valid_path}'", "path": valid_path}
            else:
                os.remove(valid_path)
                return {"message": f"Successfully deleted file '{valid_path}'", "path": valid_path}

        elif action_name in {"execute_command", "power_shutdown", "power_restart", "power_lock", "cancel_shutdown"}:
            cmd = details.get("command") or target
            cwd = details.get("cwd")
            valid_cwd = self.path_guard.validate_path(cwd) if (cwd and os.path.exists(cwd)) else None

            # Execute with safe 15s timeout
            proc = subprocess.run(
                cmd,
                cwd=valid_cwd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=20,
            )
            return {
                "command": cmd,
                "exit_code": proc.returncode,
                "stdout": proc.stdout[:4000],
                "stderr": proc.stderr[:2000],
            }

        else:
            raise ValueError(f"Unknown action name '{action_name}'.")

    def reject_action(self, approval_id: str, reason: str = "Rejected by user") -> Dict[str, Any]:
        """Explicitly reject a pending action."""
        req = permission_engine.reject_request(approval_id, reason=reason)
        return {
            "approval_id": req.id,
            "status": "rejected",
            "action_name": req.action_name,
            "target": req.target,
            "reason": reason,
        }


windows_agent = WindowsComputerAgent()

