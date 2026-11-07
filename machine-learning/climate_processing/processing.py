from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from .tabular import (
    MEASUREMENT_COLUMNS,
    ClimateDataError,
    climate_data_summary,
    load_tabular_climate_file,
)

ANOMALY_LIMIT = 100
VALID_RANGES = {
    "temperature": (-90.0, 65.0),
    "rainfall": (0.0, None),
    "humidity": (0.0, 100.0),
    "wind_speed": (0.0, None),
    "atmospheric_pressure": (0.0, None),
}


def _json_value(value: Any) -> Any:
    if pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if isinstance(value, np.generic):
        return value.item()
    return value


def _detect_anomalies(frame: pd.DataFrame) -> tuple[int, list[dict[str, Any]]]:
    available_columns = [
        column for column in MEASUREMENT_COLUMNS
        if frame[column].notna().any()
    ]
    if len(frame) < 3 or not available_columns:
        return 0, []

    values = frame.loc[:, available_columns].copy()
    values = values.fillna(values.median()).fillna(0.0)
    detector = IsolationForest(contamination="auto", random_state=42)
    labels = detector.fit_predict(values)
    anomaly_indices = np.flatnonzero(labels == -1)
    anomalies = []
    for index in anomaly_indices[:ANOMALY_LIMIT]:
        record = frame.iloc[int(index)]
        anomalies.append({
            "record_index": int(index),
            "observed_at": _json_value(record["observed_at"]),
            "measurements": {
                column: _json_value(record[column])
                for column in MEASUREMENT_COLUMNS
                if pd.notna(record[column])
            },
        })
    return int(len(anomaly_indices)), anomalies


def process_climate_file(file_path: str | Path) -> dict[str, Any]:
    """Clean, summarize, and flag unusual records from a CSV or JSON file."""
    path = Path(file_path)
    if path.suffix.lower() not in {".csv", ".json"}:
        raise ClimateDataError("Python processing supports CSV and JSON climate datasets.")

    frame = load_tabular_climate_file(path)
    original_count = len(frame)
    frame = frame.drop_duplicates().reset_index(drop=True)
    duplicate_count = original_count - len(frame)

    invalid_date_count = int(frame["observed_at"].isna().sum())
    frame = frame.dropna(subset=["observed_at"]).reset_index(drop=True)
    if frame.empty:
        raise ClimateDataError("The dataset has no records with valid observation dates.")

    invalid_measurement_counts: dict[str, int] = {}
    for column, (minimum, maximum) in VALID_RANGES.items():
        invalid = frame[column].notna()
        if minimum is not None:
            invalid &= frame[column] < minimum
        if maximum is not None:
            invalid |= frame[column].notna() & (frame[column] > maximum)
        invalid_measurement_counts[column] = int(invalid.sum())
        frame.loc[invalid, column] = np.nan

    summary = climate_data_summary(frame)
    anomaly_count, anomalies = _detect_anomalies(frame)
    return {
        "record_count": int(len(frame)),
        "cleaning": {
            "input_records": int(original_count),
            "duplicate_records_removed": int(duplicate_count),
            "invalid_date_records_removed": invalid_date_count,
            "invalid_measurements_replaced_with_missing": invalid_measurement_counts,
        },
        "summary": summary,
        "anomaly_count": anomaly_count,
        "anomalies": anomalies,
    }
