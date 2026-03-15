"""
Pydantic request/response models for all API endpoints.

SDD Section 10 — API Design
"""

from typing import Any, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------
class ChatStreamRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    new_conversation: bool = False


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------
class ConversationSummary(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str


class MessageRecord(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: Any  # parsed JSON
    created_at: str


class ConversationDetail(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    messages: list[MessageRecord]


class UpdateConversationRequest(BaseModel):
    title: str


# ---------------------------------------------------------------------------
# Dashboards
# ---------------------------------------------------------------------------
class CreateDashboardRequest(BaseModel):
    title: str
    description: Optional[str] = None


class DashboardSummary(BaseModel):
    id: str
    title: str
    description: Optional[str]
    created_at: str
    updated_at: str
    pin_count: int


class PinRecord(BaseModel):
    id: str
    dashboard_id: str
    conversation_id: str
    message_id: str
    block_index: int
    block_type: str
    block_content: Any  # parsed JSON
    note: Optional[str]
    position: int
    created_at: str


class DashboardDetail(BaseModel):
    id: str
    title: str
    description: Optional[str]
    created_at: str
    updated_at: str
    pins: list[PinRecord]


class AddPinRequest(BaseModel):
    conversation_id: str
    message_id: str
    block_index: int
    block_type: str
    block_content: Any
    note: Optional[str] = None
    position: int = 0


class ReorderPinsRequest(BaseModel):
    pin_ids: list[str]


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------
class CreateReportRequest(BaseModel):
    title: str
    content: Any  # JSON array of report section blocks


class UpdateReportRequest(BaseModel):
    title: Optional[str] = None
    content: Any  # JSON array of report section blocks


class ReportSummary(BaseModel):
    id: str
    title: str
    public_uuid: Optional[str]
    created_at: str
    updated_at: str


class ReportDetail(BaseModel):
    id: str
    title: str
    content: Any  # parsed JSON
    public_uuid: Optional[str]
    created_at: str
    updated_at: str


class PublishReportResponse(BaseModel):
    public_url: str
    public_uuid: str
