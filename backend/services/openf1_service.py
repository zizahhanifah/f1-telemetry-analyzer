import httpx

BASE_URL = "https://api.openf1.org/v1"

async def get_sessions(year: int = 2024):
    """Mengambil daftar balapan pada tahun tertentu."""
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(f"{BASE_URL}/sessions", params={"year": year, "session_type": "Race"})
        response.raise_for_status()
        return response.json()

async def get_drivers(session_key: int):
    """Mengambil daftar pembalap pada sesi balapan tertentu."""
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(f"{BASE_URL}/drivers", params={"session_key": session_key})
        response.raise_for_status()
        return response.json()

async def get_driver_laps_and_stints(session_key: int, driver_number: int):
    """Mengambil data waktu putaran (laps) dan penggunaan ban (stints) untuk satu pembalap."""
    async with httpx.AsyncClient(timeout=25.0) as client:
        laps_res = await client.get(f"{BASE_URL}/laps", params={"session_key": session_key, "driver_number": driver_number})
        stints_res = await client.get(f"{BASE_URL}/stints", params={"session_key": session_key, "driver_number": driver_number})
        
        laps_res.raise_for_status()
        stints_res.raise_for_status()
        
        return laps_res.json(), stints_res.json()