import httpx
import asyncio

OPENF1_BASE_URL = "https://api.openf1.org/v1"

async def fetch_with_retry(client: httpx.AsyncClient, url: str, params: dict = None, retries: int = 3, delay: float = 1.0):
    """Fungsi pembantu untuk menembak API OpenF1 dengan pengaman otomatis jika terkena 429 Too Many Requests"""
    for attempt in range(retries):
        try:
            response = await client.get(url, params=params, timeout=15.0)
            if response.status_code == 429:
                # Jika kena rate limit, tunggu beberapa detik sebelum mencoba ulang
                await asyncio.sleep(delay * (attempt + 1))
                continue
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429 and attempt < retries - 1:
                await asyncio.sleep(delay * (attempt + 1))
                continue
            raise e
    raise Exception("OpenF1 API sedang sibuk (Rate Limited). Coba beberapa saat lagi.")

async def get_driver_laps_and_stints(session_key: int, driver_number: int):
    async with httpx.AsyncClient() as client:
        # Ambil data laps dengan jeda aman
        laps_url = f"{OPENF1_BASE_URL}/laps"
        laps_data = await fetch_with_retry(client, laps_url, params={"session_key": session_key, "driver_number": driver_number})
        
        # Beri jeda kecil agar tidak langsung menembak endpoint stints bersamaan
        await asyncio.sleep(0.25)
        
        # Ambil data stints
        stints_url = f"{OPENF1_BASE_URL}/stints"
        stints_data = await fetch_with_retry(client, stints_url, params={"session_key": session_key, "driver_number": driver_number})
        
        return laps_data, stints_data

async def get_sessions(year: int):
    async with httpx.AsyncClient() as client:
        url = f"{OPENF1_BASE_URL}/sessions"
        return await fetch_with_retry(client, url, params={"year": year})

async def get_drivers(session_key: int):
    async with httpx.AsyncClient() as client:
        url = f"{OPENF1_BASE_URL}/drivers"
        return await fetch_with_retry(client, url, params={"session_key": session_key})