#!/usr/bin/env python3
"""
Run the web chat server for bidirectional claim intake.

Usage:
    python scripts/run_chat.py

Then visit http://localhost:8000/docs to see the API docs,
or use a frontend to POST to /api/chat with:
- message: str
- session_id: str (optional, auto-generated)
- images: List[UploadFile] (optional)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uvicorn
from src.utils.config import settings
from src.web.chat_app import app

if __name__ == "__main__":
    print("=" * 60)
    print("Starting Gana Insurance Chat Server")
    print("=" * 60)
    print(f"Server: http://{settings.host}:{settings.port}")
    print(f"API docs: http://{settings.host}:{settings.port}/docs")
    print(f"Chat endpoint: POST http://{settings.host}:{settings.port}/api/chat")
    print("=" * 60)
    
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
