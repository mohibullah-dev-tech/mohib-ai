"""Windows Computer Control package."""

from app.services.computer.path_guard import PathGuard, SecurityViolationError
from app.services.computer.permission_engine import (
    permission_engine,
    ActionType,
    RiskLevel,
    ApprovalStatus,
    ApprovalRequest,
)
from app.services.computer.windows_agent import windows_agent, WindowsComputerAgent
from app.services.computer.project_inspector import project_inspector, ProjectInspector
from app.services.computer.intent_dispatcher import computer_intent_dispatcher, ComputerIntentDispatcher

__all__ = [
    "PathGuard",
    "SecurityViolationError",
    "permission_engine",
    "ActionType",
    "RiskLevel",
    "ApprovalStatus",
    "ApprovalRequest",
    "windows_agent",
    "WindowsComputerAgent",
    "project_inspector",
    "ProjectInspector",
    "computer_intent_dispatcher",
    "ComputerIntentDispatcher",
]

