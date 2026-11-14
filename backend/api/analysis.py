from fastapi import APIRouter, HTTPException
from backend.services.openf1_service import get_drivers, get_driver_laps_and_stints
from backend.algorithms.degradation import analyze_driver_stints
import traceback

router = APIRouter(tags=["F1 Telemetry Analysis"])

@router.get("/drivers/{session_key}")
async def list_drivers(session_key: int):
    drivers = await get_drivers(session_key)
    return [
        {
            "driver_number": d["driver_number"],
            "name": d["full_name"],
            "acronym": d["name_acronym"],
            "team": d["team_name"],
            "headshot_url": d.get("headshot_url", ""),
            "team_colour": f"#{d['team_colour']}" if d.get("team_colour") else "#00f0ff"
        }
        for d in drivers
    ]

@router.get("/analyze")
async def analyze_telemetry(session_key: int, driver_1: int, driver_2: int):
    try:
        laps_d1, stints_d1 = await get_driver_laps_and_stints(session_key, driver_1)
        laps_d2, stints_d2 = await get_driver_laps_and_stints(session_key, driver_2)
        
        analysis_d1 = analyze_driver_stints(laps_d1, stints_d1)
        analysis_d2 = analyze_driver_stints(laps_d2, stints_d2)
        
        return {
            "driver_1": {"analysis": analysis_d1},
            "driver_2": {"analysis": analysis_d2}
        }
    except Exception as e:
        print("--- ERROR SAAT ANALISIS ---")
        traceback.print_exc()
        empty_result = {
            "clean_laps": [],
            "stint_summary": [],
            "warning": f"Gagal memproses data: {str(e)}"
        }
        return {
            "driver_1": {"analysis": empty_result},
            "driver_2": {"analysis": empty_result}
        }