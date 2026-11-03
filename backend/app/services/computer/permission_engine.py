"""Permission and Approval Queue Engine for Windows Local Computer Control.

Enforces:
- Action categorization: READ, WRITE, DESTRUCTIVE, EXECUTION.
- Single-use approval tokens.
- Expiration and status lifecycle tracking.
- Zero automatic execution of modifying, destructive, or execution commands.
"""

import uuid
from enum import Enum
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field


class ActionType(str, Enum):
    READ = "read"
    WRITE = "write"
    DESTRUCTIVE = "destructive"
    EXECUTION = "execution"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXECUTED = "executed"
    EXPIRED = "expired"


class ApprovalRequest(BaseModel):
    """An explicit permission request requiring user consent."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action_type: ActionType
    action_name: str
    target: str
    details: Dict[str, Any] = Field(default_factory=dict)
    risk_level: RiskLevel = RiskLevel.MEDIUM
    status: ApprovalStatus = ApprovalStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc) + timedelta(minutes=15)
    )
    approved_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    result_message: Optional[str] = None


class ActionAuditEntry(BaseModel):
    """Historical audit log entry for transparency."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    approval_id: Optional[str] = None
    action_type: ActionType
    action_name: str
    target: str
    status: str
    details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PermissionEngine:
    """Manages pending approval requests and historical audit logs."""

    def __init__(self):
        self._pending_requests: Dict[str, ApprovalRequest] = {}
        self._audit_log: List[ActionAuditEntry] = []

    def create_request(
        self,
        action_type: ActionType,
        action_name: str,
        target: str,
        details: Dict[str, Any],
        risk_level: Optional[RiskLevel] = None,
    ) -> ApprovalRequest:
        """Create a new pending approval request with appropriate risk rating."""
        if risk_level is None:
            if action_type == ActionType.DESTRUCTIVE:
                risk_level = RiskLevel.CRITICAL
            elif action_type == ActionType.EXECUTION:
                risk_level = RiskLevel.HIGH
            elif action_type == ActionType.WRITE:
                risk_level = RiskLevel.MEDIUM
            else:
                risk_level = RiskLevel.LOW

        request = ApprovalRequest(
            action_type=action_type,
            action_name=action_name,
            target=target,
            details=details,
            risk_level=risk_level,
        )
        self._pending_requests[request.id] = request
        return request

    def get_pending_requests(self) -> List[ApprovalRequest]:
        """Return non-expired pending approval requests."""
        now = datetime.now(timezone.utc)
        valid: List[ApprovalRequest] = []
        for req in self._pending_requests.values():
            if req.status == ApprovalStatus.PENDING:
                if req.expires_at < now:
                    req.status = ApprovalStatus.EXPIRED
                else:
                    valid.append(req)
        return valid

    def get_request(self, approval_id: str) -> Optional[ApprovalRequest]:
        """Fetch request by ID and check expiration."""
        req = self._pending_requests.get(approval_id)
        if req and req.status == ApprovalStatus.PENDING:
            if req.expires_at < datetime.now(timezone.utc):
                req.status = ApprovalStatus.EXPIRED
        return req

    def approve_request(self, approval_id: str) -> ApprovalRequest:
        """User explicitly approves a pending request.

        Note: Does not execute the action yet; marks approved for immediate execution.
        """
        req = self.get_request(approval_id)
        if not req:
            raise ValueError(f"Approval request '{approval_id}' not found.")
        if req.status != ApprovalStatus.PENDING:
            raise ValueError(
                f"Cannot approve request with status '{req.status}' (must be pending)."
            )

        req.status = ApprovalStatus.APPROVED
        req.approved_at = datetime.now(timezone.utc)
        return req

    def reject_request(self, approval_id: str, reason: str = "Rejected by user") -> ApprovalRequest:
        """User rejects a pending request."""
        req = self.get_request(approval_id)
        if not req:
            raise ValueError(f"Approval request '{approval_id}' not found.")
        if req.status != ApprovalStatus.PENDING:
            raise ValueError(
                f"Cannot reject request with status '{req.status}'."
            )

        req.status = ApprovalStatus.REJECTED
        req.result_message = reason

        self.log_action(
            approval_id=req.id,
            action_type=req.action_type,
            action_name=req.action_name,
            target=req.target,
            status="rejected",
            details={"reason": reason},
        )
        return req

    def mark_executed(self, approval_id: str, result_message: str = "Executed successfully"):
        """Mark single-use approval as executed so it cannot be reused."""
        req = self.get_request(approval_id)
        if not req:
            raise ValueError(f"Approval request '{approval_id}' not found.")
        if req.status != ApprovalStatus.APPROVED:
            raise ValueError(
                f"Cannot execute request with status '{req.status}' (must be approved first)."
            )

        req.status = ApprovalStatus.EXECUTED
        req.executed_at = datetime.now(timezone.utc)
        req.result_message = result_message

        self.log_action(
            approval_id=req.id,
            action_type=req.action_type,
            action_name=req.action_name,
            target=req.target,
            status="executed",
            details={"message": result_message},
        )

    def mark_failed(self, approval_id: str, error_message: str):
        """Mark action as failed during execution."""
        req = self.get_request(approval_id)
        if req:
            req.status = ApprovalStatus.REJECTED
            req.result_message = f"Execution failed: {error_message}"

        self.log_action(
            approval_id=approval_id,
            action_type=req.action_type if req else ActionType.WRITE,
            action_name=req.action_name if req else "action",
            target=req.target if req else "unknown",
            status="failed",
            details={"error": error_message},
        )

    def log_action(
        self,
        action_type: ActionType,
        action_name: str,
        target: str,
        status: str,
        approval_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        """Append an entry to the audit log."""
        entry = ActionAuditEntry(
            approval_id=approval_id,
            action_type=action_type,
            action_name=action_name,
            target=target,
            status=status,
            details=details or {},
        )
        self._audit_log.insert(0, entry)
        # Keep last 100 entries
        if len(self._audit_log) > 100:
            self._audit_log = self._audit_log[:100]

    def get_audit_log(self, limit: int = 50) -> List[ActionAuditEntry]:
        """Return recent audit log entries."""
        return self._audit_log[:limit]


permission_engine = PermissionEngine()
