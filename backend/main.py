import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.api.analysis import router as analysis_router

app = FastAPI(
    title="F1 Lap Time & Tyre Degradation Analyzer",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_router)

# Mount folder frontend hanya jika berjalan secara lokal (di Vercel sudah ditangani vercel.json)
if os.path.exists("frontend") and not os.environ.get("VERCEL"):
    app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")