import pandas as pd
import numpy as np

def analyze_driver_stints(laps_data: list, stints_data: list):
    if not laps_data or not stints_data:
        return {"clean_laps": [], "stint_summary": [], "warning": "Data lap atau stint belum tersedia untuk sesi ini."}

    df_laps = pd.DataFrame(laps_data)
    df_stints = pd.DataFrame(stints_data)

    if "lap_duration" not in df_laps.columns or df_laps["lap_duration"].dropna().empty:
        return {"clean_laps": [], "stint_summary": [], "warning": "Catatan waktu putaran belum tersedia."}

    # Ambil kolom yang dibutuhkan dan buang lap tanpa catatan waktu
    df_laps = df_laps[["lap_number", "lap_duration", "is_pit_out_lap"]].dropna(subset=["lap_duration"])

    # Bersihkan data stint yang lap_start/lap_end-nya kosong
    df_stints = df_stints.dropna(subset=["lap_start", "lap_end"])
    if df_stints.empty:
        return {"clean_laps": [], "stint_summary": [], "warning": "Data stint ban belum lengkap."}

    # Tandai pit-in lap (lap_end sebelum stint terakhir)
    max_stint = df_stints["stint_number"].max()
    pit_in_laps = set(df_stints[df_stints["stint_number"] < max_stint]["lap_end"].tolist())

    def find_compound(lap_num):
        for _, stint in df_stints.iterrows():
            if stint["lap_start"] <= lap_num <= stint["lap_end"]:
                return stint.get("compound", "UNKNOWN"), stint.get("stint_number", 0)
        return "UNKNOWN", 0

    df_laps[["compound", "stint_number"]] = df_laps["lap_number"].apply(
        lambda x: pd.Series(find_compound(x))
    )

    # Filter Outlier: Buang pit-out lap, pit-in lap, lap 1 (start), dan lap lambat (> 103% dari median waktu)
    median_lap = df_laps["lap_duration"].median()
    clean_laps = df_laps[
        (df_laps["is_pit_out_lap"] == False) &
        (~df_laps["lap_number"].isin(pit_in_laps)) &
        (df_laps["lap_number"] > 1) &
        (df_laps["lap_duration"] <= median_lap * 1.03)
    ].copy()

    stint_analysis = []
    for (stint_num, compound), group in clean_laps.groupby(["stint_number", "compound"]):
        if len(group) < 3:
            continue

        lap_age = np.arange(1, len(group) + 1)
        slope, _ = np.polyfit(lap_age, group["lap_duration"].values, 1)

        stint_analysis.append({
            "stint": int(stint_num),
            "compound": compound,
            "total_clean_laps": int(len(group)),
            "avg_lap_time": round(float(group["lap_duration"].mean()), 3),
            "fastest_lap": round(float(group["lap_duration"].min()), 3),
            "degradation_per_lap": round(float(slope), 4)
        })

    return {
        "clean_laps": clean_laps[["lap_number", "lap_duration", "compound", "stint_number"]].to_dict(orient="records"),
        "stint_summary": stint_analysis
    }