"""API routes for Safe Windows Computer Control and Local Agent."""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.models.schemas import (
    AddAllowedDirRequest,
    ActionRequestPayload,
    ActionDecisionPayload,
    InspectProjectPayload,
)
from app.services.computer import (
    windows_agent,
    project_inspector,
    permission_engine,
    SecurityViolationError,
)

logger = logging.getLogger("mohib_ai.api.computer")

router = APIRouter(prefix="/computer", tags=["Windows Computer Control"])


@router.get("/system-info")
def get_system_info():
    """Get safe Windows host system details and agent status."""
    return windows_agent.get_system_info()


@router.get("/allowed-dirs")
def get_allowed_directories():
    """List permitted directories."""
    return windows_agent.get_allowed_directories()


@router.post("/allowed-dirs")
def add_allowed_directory(payload: AddAllowedDirRequest):
    """Add a directory to permitted list."""
    try:
        return windows_agent.add_allowed_directory(payload.path)
    except SecurityViolationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/allowed-dirs")
def remove_allowed_directory(path: str = Query(..., description="Directory path to remove")):
    """Remove a directory from permitted list."""
    try:
        return windows_agent.remove_allowed_directory(path)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/files/list")
def list_files(path: Optional[str] = Query(default=None, description="Directory path to list")):
    """List files in an allowed directory."""
    try:
        return windows_agent.list_directory(path)
    except SecurityViolationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/files/search")
def search_files(
    query: str = Query(..., description="Search query string"),
    path: Optional[str] = Query(default=None, description="Optional root search directory"),
):
    """Search files by name within allowed directories."""
    try:
        return windows_agent.search_files(query=query, base_path=path)
    except SecurityViolationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/files/read")
def read_file(path: str = Query(..., description="Path to file to read")):
    """Read a text or code file within permitted directories."""
    try:
        return windows_agent.read_text_file(path)
    except SecurityViolationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/files/metadata")
def get_metadata(path: str = Query(..., description="Path to inspect")):
    """Get metadata for a file or folder."""
    try:
        return windows_agent.get_file_metadata(path)
    except SecurityViolationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/actions/request")
def request_action(payload: ActionRequestPayload):
    """Create a pending request for write, destructive, or execution action."""
    action = payload.action_name.lower().strip()
    try:
        if action == "create_file":
            req = windows_agent.request_create_file(
                target_path=payload.target,
                content=payload.content or "",
                explanation=payload.explanation or "",
            )
        elif action == "modify_file":
            req = windows_agent.request_modify_file(
                target_path=payload.target,
                new_content=payload.content or "",
                explanation=payload.explanation or "",
            )
        elif action in {"delete_file", "delete_path"}:
            req = windows_agent.request_delete_file(
                target_path=payload.target,
                explanation=payload.explanation or "",
            )
        elif action in {"execute_command", "run_command"}:
            req = windows_agent.request_execute_command(
                command=payload.command or payload.target,
                cwd=payload.cwd,
                explanation=payload.explanation or "",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported action_name '{payload.action_name}'. Must be create_file, modify_file, delete_path, or execute_command.",
            )
        return req
    except SecurityViolationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/actions/pending")
def get_pending_actions():
    """List all currently pending approval requests."""
    return permission_engine.get_pending_requests()


@router.post("/actions/{approval_id}/approve")
def approve_action(approval_id: str):
    """Explicitly approve and execute an action (single-use)."""
    try:
        return windows_agent.approve_and_execute(approval_id)
    except SecurityViolationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/actions/{approval_id}/reject")
def reject_action(approval_id: str, payload: Optional[ActionDecisionPayload] = None):
    """Explicitly reject a pending action."""
    reason = payload.reason if payload else "Rejected by user"
    try:
        return windows_agent.reject_action(approval_id, reason=reason)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/actions/history")
def get_action_history():
    """Return historical audit log of recent computer actions."""
    return permission_engine.get_audit_log(limit=50)


@router.post("/inspect-project")
def inspect_project(payload: Optional[InspectProjectPayload] = None):
    """Analyze a project folder, detect tech stack, and generate tree summary."""
    target_path = payload.project_path if payload else None
    try:
        return project_inspector.inspect_project(target_path)
    except SecurityViolationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

