from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import dask.dataframe as dd
import numpy as np
import pandas as pd
from dask import compute

from .tabular import (
    GROUP_COLUMNS,
    MEASUREMENT_ALIASES,
    MEASUREMENT_COLUMNS,
    OUTPUT_COLUMNS,
    ClimateDataError,
    _column_rename_map,
    _normalized_name
)

STRING_COLUMNS = ("location", "quality", "source_type", "source_id")
NUMERIC_COLUMNS = ("latitude", "longitude", *MEASUREMENT_COLUMNS)


def _partition_record_keys(
    partition: pd.DataFrame,
    group_columns: list[str],
    partition_info: dict[str, int] | None = None
) -> pd.Series:
    if group_columns:
        keys = (
            json.dumps(
                [None if pd.isna(value) else str(value) for value in row],
                separators=(",", ":")
            )
            for row in partition[group_columns].itertuples(index=False, name=None)
        )
    else:
        partition_number = (partition_info or {}).get("number", 0)
        keys = (
            f"{partition_number}:{row_number}"
            for row_number in range(len(partition))
        )
    return pd.Series(keys, index=partition.index, dtype="string", name="_record_key")


def _combine_date_and_time(frame: dd.DataFrame) -> dd.DataFrame:
    if "date" in frame.columns:
        date_values = frame["date"].astype("string").str.strip()
        if "time" in frame.columns:
            time_values = frame["time"].astype("string").str.strip()
            frame["observed_at"] = date_values + " " + time_values
            frame = frame.drop(columns=["date", "time"])
        elif "observed_at" not in frame.columns:
            frame["observed_at"] = date_values
            frame = frame.drop(columns=["date"])
    elif "time" in frame.columns and "observed_at" not in frame.columns:
        frame["observed_at"] = frame["time"]
        frame = frame.drop(columns=["time"])
    elif "time" in frame.columns:
        frame = frame.drop(columns=["time"])
    return frame


def _pivot_large_measurements(frame: dd.DataFrame) -> dd.DataFrame:
    group_columns = [column for column in GROUP_COLUMNS if column in frame.columns]
    frame["_record_key"] = frame.map_partitions(
        _partition_record_keys,
        group_columns=group_columns,
        meta=("_record_key", "string")
    )
    record_columns = ["_record_key", *group_columns]
    record_keys = frame[record_columns].drop_duplicates(subset=["_record_key"])

    frame["_measurement"] = frame["measurement_name"].map(
        lambda value: MEASUREMENT_ALIASES.get(_normalized_name(value)),
        meta=("_measurement", "object")
    ).astype(pd.CategoricalDtype(categories=MEASUREMENT_COLUMNS))
    frame["_value"] = dd.to_numeric(frame["value"], errors="coerce")
    frame["_value"] = frame["_value"].where(np.isfinite(frame["_value"]))
    recognized = frame[~frame["_measurement"].isna()]

    pivoted = recognized.pivot_table(
        index="_record_key",
        columns="_measurement",
        values="_value",
        aggfunc="mean"
    ).reset_index()
    result = record_keys.merge(pivoted, on="_record_key", how="left")
    return result.drop(columns=["_record_key"])


def normalize_large_climate_data(frame: dd.DataFrame) -> dd.DataFrame:
    if not isinstance(frame, dd.DataFrame):
        raise ClimateDataError("Large climate data must be represented as a Dask DataFrame.")
    if "measurement_name" in frame.columns and "value" in frame.columns:
        frame = _pivot_large_measurements(frame)
    else:
        frame = _combine_date_and_time(frame)

    if "observed_at" in frame.columns:
        frame["observed_at"] = dd.to_datetime(frame["observed_at"], errors="coerce", utc=True)
    else:
        frame["observed_at"] = pd.NaT

    for column in STRING_COLUMNS:
        if column in frame.columns:
            values = frame[column].astype("string").str.strip()
            frame[column] = values.mask(values == "", pd.NA)
        else:
            frame[column] = pd.NA

    for column in NUMERIC_COLUMNS:
        if column in frame.columns:
            values = dd.to_numeric(frame[column], errors="coerce")
            frame[column] = values.where(np.isfinite(values))
        else:
            frame[column] = np.nan

    frame["latitude"] = frame["latitude"].where(frame["latitude"].between(-90, 90))
    frame["longitude"] = frame["longitude"].where(frame["longitude"].between(-180, 180))
    return frame.loc[:, list(OUTPUT_COLUMNS)]


def load_large_climate_csv(
    file_path: str | Path,
    blocksize: str | int | None = "64MB"
) -> dd.DataFrame:
    path = Path(file_path)
    if path.suffix.lower() != ".csv":
        raise ClimateDataError("Dask large-file loading currently supports CSV files.")

    try:
        header = pd.read_csv(path, nrows=0)
        rename = _column_rename_map(header.columns)
        frame = dd.read_csv(path, blocksize=blocksize, assume_missing=True).rename(columns=rename)
    except (OSError, UnicodeDecodeError, pd.errors.EmptyDataError, pd.errors.ParserError, ValueError) as error:
        raise ClimateDataError(f"Could not load large climate CSV data: {error}") from error
    return normalize_large_climate_data(frame)


def summarize_large_climate_data(frame: dd.DataFrame) -> dict[str, Any]:
    if not isinstance(frame, dd.DataFrame):
        raise ClimateDataError("Large climate summaries require a Dask DataFrame.")

    task_names: list[tuple[str, str | None]] = []
    tasks = []

    def add_task(name: str, column: str | None, task: Any) -> None:
        task_names.append((name, column))
        tasks.append(task)

    row_count = frame.map_partitions(len).sum()
    add_task("record_count", None, row_count)
    for column in OUTPUT_COLUMNS:
        if column in frame.columns:
            add_task("missing_values", column, frame[column].isna().sum())

    has_location = ~frame["location"].isna() | (
        ~frame["latitude"].isna() & ~frame["longitude"].isna()
    )
    complete = ~frame[["observed_at", *MEASUREMENT_COLUMNS]].isna().any(axis=1) & has_location
    add_task("complete_record_count", None, complete.sum())

    for column in MEASUREMENT_COLUMNS:
        values = dd.to_numeric(frame[column], errors="coerce").dropna()
        add_task("statistics_count", column, values.count())
        add_task("statistics_mean", column, values.mean())
        add_task("statistics_median", column, values.quantile(0.5))
        add_task("statistics_std", column, values.std())
        add_task("statistics_minimum", column, values.min())
        add_task("statistics_maximum", column, values.max())

    computed = compute(*tasks)
    results = {
        name if column is None else (name, column): value
        for (name, column), value in zip(task_names, computed)
    }
    record_count = int(results["record_count"])
    missing_values = {
        column: int(results[("missing_values", column)])
        for column in OUTPUT_COLUMNS
        if ("missing_values", column) in results
    }

    statistics = {}
    for column in MEASUREMENT_COLUMNS:
        count = int(results[("statistics_count", column)])
        statistics[column] = {
            "count": count,
            "missing": record_count - count,
            "mean": _optional_float(results[("statistics_mean", column)]),
            "median": _optional_float(results[("statistics_median", column)]),
            "standard_deviation": _optional_float(results[("statistics_std", column)]) if count > 1 else None,
            "minimum": _optional_float(results[("statistics_minimum", column)]),
            "maximum": _optional_float(results[("statistics_maximum", column)])
        }

    complete_count = int(results["complete_record_count"])
    return {
        "record_count": record_count,
        "complete_record_count": complete_count,
        "incomplete_record_count": record_count - complete_count,
        "missing_values": missing_values,
        "statistics": statistics
    }


def _optional_float(value: Any) -> float | None:
    if pd.isna(value) or not np.isfinite(value):
        return None
    return float(value)
