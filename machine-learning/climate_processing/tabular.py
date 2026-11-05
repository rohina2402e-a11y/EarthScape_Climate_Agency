from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import rasterio
import xarray as xr
from rasterio.warp import transform as transform_coordinates

import h5py


class ClimateDataError(ValueError):
    pass


MEASUREMENT_COLUMNS = (
    "temperature",
    "rainfall",
    "humidity",
    "wind_speed",
    "atmospheric_pressure"
)

OUTPUT_COLUMNS = (
    "observed_at",
    "location",
    "latitude",
    "longitude",
    *MEASUREMENT_COLUMNS,
    "quality",
    "source_type",
    "source_id"
)

COLUMN_ALIASES = {
    "observed_at": {
        "observed_at", "observedat", "timestamp", "datetime", "date_time",
        "valid_time", "time_utc"
    },
    "date": {"date", "observation_date"},
    "time": {"time", "observation_time"},
    "location": {"location", "location_name", "station", "station_name", "site"},
    "latitude": {"latitude", "lat"},
    "longitude": {"longitude", "lon", "lng"},
    "measurement_name": {"measurement", "measurement_name", "measurementname", "parameter", "variable"},
    "value": {"value", "measurement_value", "measurementvalue"},
    "unit": {"unit", "units"},
    "quality": {"quality", "quality_flag"},
    "source_type": {"source_type", "sourcetype"},
    "source_id": {"source_id", "sourceid"},
    "temperature": {"temperature", "temp", "air_temperature", "air_temp", "t2m", "tas"},
    "rainfall": {
        "rainfall", "rain", "rain_mm", "precipitation", "precipitation_mm",
        "precip", "total_precipitation", "pr"
    },
    "humidity": {"humidity", "relative_humidity", "relativehumidity", "humidity_percent", "rh"},
    "wind_speed": {"wind_speed", "windspeed", "wind_speed_10m", "wind", "ws"},
    "atmospheric_pressure": {
        "atmospheric_pressure", "pressure", "surface_pressure", "sea_level_pressure",
        "pressure_msl", "mslp"
    }
}

ALIAS_TO_COLUMN = {
    alias: canonical
    for canonical, aliases in COLUMN_ALIASES.items()
    for alias in aliases
}

MEASUREMENT_ALIASES = {
    alias: canonical
    for canonical in MEASUREMENT_COLUMNS
    for alias in COLUMN_ALIASES[canonical]
}

GROUP_COLUMNS = (
    "observed_at",
    "location",
    "latitude",
    "longitude",
    "source_type",
    "source_id",
    "quality"
)

XML_RECORD_TAGS = {"observation", "record", "row", "item", "point"}
HDF5_FIELD_NAMES = set(ALIAS_TO_COLUMN)


def _normalized_name(name: Any) -> str:
    separated = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", str(name).strip())
    return re.sub(r"[^a-z0-9]+", "_", separated.lower()).strip("_")


def _local_tag(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _xml_record(element: ET.Element) -> dict[str, str]:
    values = {_normalized_name(_local_tag(key)): value for key, value in element.attrib.items()}
    for child in element.iter():
        if child is element or len(child) > 0 or child.text is None:
            continue
        values[_normalized_name(_local_tag(child.tag))] = child.text.strip()
    return values


def _read_xml(path: Path) -> pd.DataFrame:
    try:
        root = ET.parse(path).getroot()
    except (ET.ParseError, OSError) as error:
        raise ClimateDataError(f"Could not read XML climate data: {error}") from error

    record_elements = [
        element for element in root.iter()
        if _local_tag(element.tag).lower() in XML_RECORD_TAGS
    ]
    if record_elements:
        records = [_xml_record(element) for element in record_elements]
    else:
        records = [_xml_record(root)]
    if not any(records):
        raise ClimateDataError("The XML file does not contain climate records.")
    return pd.DataFrame(records)


def _read_json(path: Path) -> pd.DataFrame:
    try:
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, OSError, UnicodeDecodeError) as error:
        raise ClimateDataError(f"Could not read JSON climate data: {error}") from error

    if isinstance(payload, list):
        records = payload
    elif isinstance(payload, dict):
        records = next(
            (payload[key] for key in ("records", "observations", "data") if isinstance(payload.get(key), list)),
            [payload]
        )
    else:
        raise ClimateDataError("JSON climate data must be an object or an array of records.")
    if not records or not all(isinstance(record, dict) for record in records):
        raise ClimateDataError("JSON climate data must contain one or more object records.")
    return pd.DataFrame(records)


def _read_netcdf(path: Path) -> pd.DataFrame:
    try:
        with xr.open_dataset(path) as dataset:
            if not dataset.data_vars:
                raise ClimateDataError("The NetCDF file does not contain climate variables.")
            return dataset.to_dataframe().reset_index()
    except ClimateDataError:
        raise
    except (OSError, ValueError, TypeError) as error:
        raise ClimateDataError(f"Could not read NetCDF climate data: {error}") from error


def _decode_hdf5_values(values: np.ndarray) -> np.ndarray:
    if values.dtype.kind not in {"S", "O", "U"}:
        return values
    return np.asarray(
        [
            value.decode("utf-8") if isinstance(value, bytes) else value
            for value in values.reshape(-1)
        ],
        dtype=object
    )


def _read_hdf5(path: Path) -> pd.DataFrame:
    fields: dict[str, np.ndarray] = {}
    try:
        with h5py.File(path, "r") as source:
            def collect_field(_name: str, dataset: h5py.Dataset | h5py.Group) -> None:
                if not isinstance(dataset, h5py.Dataset):
                    return
                field_name = _normalized_name(dataset.name.rsplit("/", 1)[-1])
                if field_name not in HDF5_FIELD_NAMES:
                    return
                canonical_name = ALIAS_TO_COLUMN[field_name]
                if canonical_name in fields:
                    raise ClimateDataError(f"The HDF5 file contains multiple datasets for {canonical_name}.")
                values = np.asarray(dataset[()])
                if values.ndim == 0:
                    values = values.reshape(1)
                fields[canonical_name] = _decode_hdf5_values(values)

            source.visititems(collect_field)
    except ClimateDataError:
        raise
    except (OSError, ValueError, TypeError) as error:
        raise ClimateDataError(f"Could not read HDF5 climate data: {error}") from error

    if not fields:
        raise ClimateDataError("The HDF5 file contains no recognized climate datasets.")

    row_counts = {len(values) for values in fields.values() if len(values) > 1}
    if len(row_counts) > 1:
        raise ClimateDataError("HDF5 climate columns must have equal lengths or contain one scalar value.")
    row_count = next(iter(row_counts), 1)
    expanded_fields = {
        name: values if len(values) == row_count else np.repeat(values, row_count)
        for name, values in fields.items()
    }
    return pd.DataFrame(expanded_fields)


def _tag_value(tags: dict[str, str], *names: str) -> str | None:
    normalized_tags = {_normalized_name(name): value for name, value in tags.items()}
    return next(
        (normalized_tags[name] for name in names if normalized_tags.get(name)),
        None
    )


def _read_geotiff(path: Path) -> pd.DataFrame:
    try:
        with rasterio.open(path) as dataset:
            if dataset.count < 1:
                raise ClimateDataError("The GeoTIFF file does not contain any raster bands.")
            if dataset.crs is None:
                raise ClimateDataError("The GeoTIFF file must define a coordinate reference system.")

            global_tags = dataset.tags()
            band_values: dict[str, np.ndarray] = {}
            valid_pixels = np.zeros((dataset.height, dataset.width), dtype=bool)
            for band_number in range(1, dataset.count + 1):
                band_tags = dataset.tags(band_number)
                variable = _tag_value(
                    band_tags,
                    "climate_variable",
                    "variable",
                    "measurement_name",
                    "measurement"
                )
                if not variable:
                    variable = dataset.descriptions[band_number - 1]
                if not variable and dataset.count == 1:
                    variable = _tag_value(
                        global_tags,
                        "climate_variable",
                        "variable",
                        "measurement_name",
                        "measurement"
                    ) or path.stem
                canonical_name = ALIAS_TO_COLUMN.get(_normalized_name(variable or ""))
                if canonical_name not in MEASUREMENT_COLUMNS:
                    raise ClimateDataError(
                        f"GeoTIFF band {band_number} must identify a supported climate variable."
                    )
                if canonical_name in band_values:
                    raise ClimateDataError(f"The GeoTIFF contains multiple bands for {canonical_name}.")

                values = np.ma.asarray(dataset.read(band_number, masked=True), dtype=np.float64).filled(np.nan)
                values[~np.isfinite(values)] = np.nan
                band_values[canonical_name] = values
                valid_pixels |= np.isfinite(values)

            rows, columns = np.nonzero(valid_pixels)
            if len(rows) == 0:
                raise ClimateDataError("The GeoTIFF contains no valid climate pixels.")
            x_coordinates, y_coordinates = rasterio.transform.xy(
                dataset.transform,
                rows,
                columns,
                offset="center"
            )
            longitudes, latitudes = transform_coordinates(
                dataset.crs,
                "EPSG:4326",
                x_coordinates,
                y_coordinates
            )

            records: dict[str, Any] = {
                "latitude": latitudes,
                "longitude": longitudes
            }
            location = _tag_value(global_tags, "location", "location_name")
            observed_at = _tag_value(global_tags, "observed_at", "timestamp", "date_time", "date")
            if location:
                records["location"] = [location] * len(rows)
            if observed_at:
                records["observed_at"] = [observed_at] * len(rows)
            for name, values in band_values.items():
                records[name] = values[rows, columns]
            return pd.DataFrame(records)
    except ClimateDataError:
        raise
    except (OSError, ValueError, TypeError, rasterio.errors.RasterioError) as error:
        raise ClimateDataError(f"Could not read GeoTIFF climate data: {error}") from error


def _column_rename_map(columns: Any) -> dict[Any, str]:
    renamed = {}
    for original in columns:
        normalized = _normalized_name(original)
        renamed[original] = ALIAS_TO_COLUMN.get(normalized, normalized)

    canonical_names = list(renamed.values())
    duplicates = sorted({name for name in canonical_names if canonical_names.count(name) > 1})
    if duplicates:
        raise ClimateDataError(f"Multiple input columns map to the same climate field: {', '.join(duplicates)}.")
    return renamed


def _canonicalize_columns(frame: pd.DataFrame) -> pd.DataFrame:
    renamed = _column_rename_map(frame.columns)
    result = frame.rename(columns=renamed).copy()
    if "date" in result.columns:
        date_values = result.pop("date").astype("string").str.strip()
        if "time" in result.columns:
            time_values = result.pop("time").astype("string").str.strip()
            result["observed_at"] = date_values + " " + time_values
        elif "observed_at" not in result.columns:
            result["observed_at"] = date_values
    elif "time" in result.columns and "observed_at" not in result.columns:
        result["observed_at"] = result.pop("time")
    elif "time" in result.columns:
        result = result.drop(columns=["time"])
    return result


def _pivot_long_measurements(frame: pd.DataFrame) -> pd.DataFrame:
    if "measurement_name" not in frame.columns or "value" not in frame.columns:
        return frame

    rows = frame.copy()
    rows["_measurement"] = rows["measurement_name"].map(
        lambda value: MEASUREMENT_ALIASES.get(_normalized_name(value))
    )
    rows["_value"] = pd.to_numeric(rows["value"], errors="coerce")
    group_columns = [column for column in GROUP_COLUMNS if column in rows.columns]
    if not group_columns:
        rows["_source_row"] = range(len(rows))
        group_columns = ["_source_row"]

    record_keys = rows[group_columns].drop_duplicates()
    recognized = rows[rows["_measurement"].notna()]
    if recognized.empty:
        pivoted = record_keys.iloc[0:0].copy()
    else:
        pivoted = recognized.pivot_table(
            index=group_columns,
            columns="_measurement",
            values="_value",
            aggfunc="mean"
        ).reset_index()
        pivoted.columns.name = None

    return record_keys.merge(pivoted, on=group_columns, how="left")


def normalize_climate_data(frame: pd.DataFrame) -> pd.DataFrame:
    if not isinstance(frame, pd.DataFrame):
        raise ClimateDataError("Climate data must be loaded into a Pandas DataFrame.")
    if frame.empty:
        raise ClimateDataError("The climate dataset does not contain any records.")

    result = _pivot_long_measurements(_canonicalize_columns(frame))
    if "observed_at" in result.columns:
        result["observed_at"] = pd.to_datetime(result["observed_at"], errors="coerce", utc=True)
    else:
        result["observed_at"] = pd.Series(pd.NaT, index=result.index, dtype="datetime64[ns, UTC]")

    for column in ("location", "quality", "source_type", "source_id"):
        if column in result.columns:
            result[column] = result[column].astype("string").str.strip().replace("", pd.NA)
        else:
            result[column] = pd.Series(pd.NA, index=result.index, dtype="string")

    for column in ("latitude", "longitude", *MEASUREMENT_COLUMNS):
        if column in result.columns:
            numeric_values = pd.to_numeric(result[column], errors="coerce")
            result[column] = numeric_values.where(np.isfinite(numeric_values))
        else:
            result[column] = float("nan")

    result.loc[~result["latitude"].between(-90, 90), "latitude"] = float("nan")
    result.loc[~result["longitude"].between(-180, 180), "longitude"] = float("nan")
    return result.loc[:, OUTPUT_COLUMNS].reset_index(drop=True)


def load_tabular_climate_file(file_path: str | Path) -> pd.DataFrame:
    path = Path(file_path)
    extension = path.suffix.lower()
    try:
        if extension == ".csv":
            raw_frame = pd.read_csv(path)
        elif extension == ".json":
            raw_frame = _read_json(path)
        elif extension == ".xml":
            raw_frame = _read_xml(path)
        else:
            raise ClimateDataError(f"Unsupported tabular climate format: {extension or 'no file extension'}.")
    except (OSError, UnicodeDecodeError, pd.errors.EmptyDataError, pd.errors.ParserError) as error:
        raise ClimateDataError(f"Could not read climate data from {path.name}: {error}") from error
    return normalize_climate_data(raw_frame)


def load_climate_file(file_path: str | Path) -> pd.DataFrame:
    path = Path(file_path)
    extension = path.suffix.lower()
    if extension in {".csv", ".json", ".xml"}:
        return load_tabular_climate_file(path)
    if extension in {".nc", ".nc4", ".netcdf"}:
        raw_frame = _read_netcdf(path)
    elif extension in {".h5", ".hdf5", ".hdf"}:
        raw_frame = _read_hdf5(path)
    elif extension in {".tif", ".tiff"}:
        raw_frame = _read_geotiff(path)
    else:
        raise ClimateDataError(f"Unsupported climate data format: {extension or 'no file extension'}.")
    return normalize_climate_data(raw_frame)


def climate_data_summary(frame: pd.DataFrame) -> dict[str, Any]:
    missing_counts = {
        column: int(frame[column].isna().sum())
        for column in OUTPUT_COLUMNS
        if column in frame.columns
    }
    record_count = len(frame)
    missing_percentages = {
        column: 0.0 if record_count == 0 else count / record_count * 100
        for column, count in missing_counts.items()
    }
    has_location = frame["location"].notna() | (
        frame["latitude"].notna() & frame["longitude"].notna()
    )
    required_for_completeness = (
        "observed_at",
        *MEASUREMENT_COLUMNS
    )
    complete = frame.loc[:, required_for_completeness].notna().all(axis=1) & has_location

    statistics = {}
    for column in MEASUREMENT_COLUMNS:
        values = pd.to_numeric(frame[column], errors="coerce").dropna()
        statistics[column] = {
            "count": int(values.count()),
            "missing": int(len(frame) - values.count()),
            "mean": None if values.empty else float(values.mean()),
            "median": None if values.empty else float(values.median()),
            "standard_deviation": None if values.count() < 2 else float(values.std()),
            "minimum": None if values.empty else float(values.min()),
            "maximum": None if values.empty else float(values.max())
        }

    def summarize_trends(period_format: str) -> list[dict[str, Any]]:
        timestamps = pd.to_datetime(frame["observed_at"], errors="coerce", utc=True)
        periods = timestamps.dt.strftime(period_format)
        climate_frame = frame.assign(_period=periods).dropna(subset=["_period"])
        trends = []
        for period, group in climate_frame.groupby("_period", sort=True):
            trend: dict[str, Any] = {
                "period": str(period),
                "record_count": int(len(group))
            }
            for column in MEASUREMENT_COLUMNS:
                values = pd.to_numeric(group[column], errors="coerce").dropna()
                trend[column] = {
                    "mean": None if values.empty else float(values.mean()),
                    "minimum": None if values.empty else float(values.min()),
                    "maximum": None if values.empty else float(values.max())
                }
            trends.append(trend)
        return trends

    return {
        "record_count": int(record_count),
        "complete_record_count": int(complete.sum()),
        "incomplete_record_count": int((~complete).sum()),
        "missing_values": missing_counts,
        "missing_percentages": missing_percentages,
        "statistics": statistics,
        "monthly_trends": summarize_trends("%Y-%m"),
        "yearly_trends": summarize_trends("%Y")
    }
