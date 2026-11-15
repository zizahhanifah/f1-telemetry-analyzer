import os
import httpx
from fastapi import FastAPI, HTTPException
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

# 🛑 1. RUTE /sessions WAJIB DI ATAS SEBELUM MOUNT APAPUN
@app.get("/sessions")
async def get_sessions(year: int = 2024):
    url = f"https://api.openf1.org/v1/sessions?year={year}"
    async with httpx.AsyncClient() as client:
        try:
            print(f"Mengambil data sesi untuk tahun {year}...")
            response = await client.get(url, timeout=15.0)
            response.raise_for_status()
            data = response.json()
            print(f"Berhasil! Dapatkan {len(data)} sesi.")
            return data
        except Exception as e:
            print(f"Error OpenF1: {e}")
            return []

from fastapi import HTTPException
import httpx

@app.get("/telemetry") # Sesuaikan endpoint kamu
def get_telemetry(session_key: int, driver_number: int):
    url = f"https://api.openf1.org/v1/laps?session_key={session_key}&driver_number={driver_number}"
    response = httpx.get(url)

    # Jika data tidak ditemukan di OpenF1 (404) atau kosong
    if response.status_code == 404 or not response.json():
        # Kembalikan list kosong atau pesan ramah alih-alih crash
        return [] 

    return response.json()

# 2. ROUTER ANALISIS LAINNYA
app.include_router(analysis_router)

# 3. MOUNT ASSETS
app.mount("/assets", StaticFiles(directory="frontend/assets"), name="assets")

# 4. MOUNT FRONTEND (CATCH-ALL) HARUS DI PALING BAWAH
if os.path.exists("frontend") and not os.environ.get("VERCEL"):
    app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
