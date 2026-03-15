"""
Rendara — FastAPI Backend
Skeleton with CORS middleware and placeholder routers.
Business logic implemented by ANVIL agent.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import database
from routers import chat, conversations, dashboards, pinned, stories
from services.mcp_client import load_mcp_tools


@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.init_db()
    await load_mcp_tools()
    yield


app = FastAPI(
    title="Rendara API",
    version="0.1.0",
    description="Business Data Analysis Agent — FastAPI backend",
    lifespan=lifespan,
)

# CORS — per SDD Section 10.6
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
cors_origins = [origin.strip() for origin in frontend_url.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
)

# Routers
app.include_router(chat.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")
app.include_router(dashboards.router, prefix="/api")
app.include_router(pinned.router, prefix="/api")
app.include_router(stories.router, prefix="/api")
