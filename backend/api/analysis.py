from fastapi import APIRouter, HTTPException
from backend.services.openf1_service import get_sessions, get_drivers, get_driver_laps_and_stints
from backend.algorithms.degradation import analyze_driver_stints

router = APIRouter(prefix="/api", tags=["F1 Telemetry Analysis"])

@router.get("/sessions")
async def list_sessions(year: int = 2024):
    sessions = await get_sessions(year)
    result = []
    for s in sessions:
        # Lewati slot jadwal awal Bahrain GP April 2026 (11261) yang dipindah ke Oktober (11731)
        if s["session_key"] == 11261:
            continue

        country = s["country_name"]
        circuit = s["circuit_short_name"]

        if year == 2026 and (country == "Bahrain" or circuit == "Sakhir"):
            country = "Bahrain"
            circuit = "Sepang"

        result.append({
            "session_key": s["session_key"],
            "country": country,
            "circuit": circuit,
            "session_name": s.get("session_name", "Race"),
            "circuit_image": s.get("circuit_image", ""),
            "date": s["date_start"]
        })
    return result

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
async def compare_drivers(session_key: int, driver_1: int, driver_2: int):
    try:
        laps_1, stints_1 = await get_driver_laps_and_stints(session_key, driver_1)
        laps_2, stints_2 = await get_driver_laps_and_stints(session_key, driver_2)

        result_1 = analyze_driver_stints(laps_1, stints_1)
        result_2 = analyze_driver_stints(laps_2, stints_2)

        return {
            "session_key": session_key,
            "driver_1": {"number": driver_1, "analysis": result_1},
            "driver_2": {"number": driver_2, "analysis": result_2}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))