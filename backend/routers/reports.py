"""
Reports router — CRUD and publish endpoints.
"""

import uuid
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any

import database

router = APIRouter()

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").split(",")[0].strip()


class CreateReportBody(BaseModel):
    title: str
    content: Any = None


class UpdateReportBody(BaseModel):
    title: Optional[str] = None
    content: Any = None


@router.get("/reports")
async def list_reports():
    """GET /api/reports — all reports."""
    return await database.list_reports()


@router.get("/reports/public/{public_uuid}")
async def get_public_report(public_uuid: str):
    """GET /api/reports/public/{public_uuid} — no auth required."""
    report = await database.get_report_by_public_uuid(public_uuid)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/reports/{report_id}")
async def get_report(report_id: str):
    """GET /api/reports/{id} — single report with full content."""
    report = await database.get_report(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.post("/reports")
async def create_report(body: CreateReportBody):
    """POST /api/reports — create report."""
    report_id = str(uuid.uuid4())
    return await database.create_report(report_id, body.title, body.content or [])


@router.put("/reports/{report_id}")
async def update_report(report_id: str, body: UpdateReportBody):
    """PUT /api/reports/{id} — replace report content."""
    updated = await database.update_report(report_id, body.title, body.content)
    if updated is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return updated


@router.post("/reports/{report_id}/publish")
async def publish_report(report_id: str):
    """POST /api/reports/{id}/publish — set public_uuid; returns {public_url}."""
    report = await database.get_report(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    # If already published, return existing URL
    if report.get("public_uuid"):
        public_uuid = report["public_uuid"]
    else:
        public_uuid = str(uuid.uuid4())
        report = await database.publish_report(report_id, public_uuid)
        if report is None:
            raise HTTPException(status_code=404, detail="Report not found")
    public_url = f"{FRONTEND_URL}/r/{public_uuid}"
    return {"public_url": public_url, "public_uuid": public_uuid}
