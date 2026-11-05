from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Sequence

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from climate_processing import (  # noqa: E402
    ClimateDataError,
    climate_data_summary,
    load_climate_file,
    load_large_climate_csv,
    summarize_large_climate_data
)


def load_format(file_path: str | Path, supported_extensions: set[str]):
    path = Path(file_path)
    if path.suffix.lower() not in supported_extensions:
        extensions = ", ".join(sorted(supported_extensions))
        raise ClimateDataError(f"This reader supports these extensions: {extensions}.")
    return load_climate_file(path)


def summarize_file(file_path: str | Path, use_dask: bool = False, blocksize: str = "64MB"):
    if use_dask:
        return summarize_large_climate_data(load_large_climate_csv(file_path, blocksize=blocksize))
    return climate_data_summary(load_climate_file(file_path))


def run_reader(
    description: str,
    supported_extensions: set[str],
    arguments: Sequence[str] | None = None
) -> int:
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("file", type=Path, help="Path to the climate dataset")
    options = parser.parse_args(arguments)
    try:
        frame = load_format(options.file, supported_extensions)
    except ClimateDataError as error:
        parser.error(str(error))
    print(json.dumps(climate_data_summary(frame), indent=2))
    return 0


def run_csv_reader(arguments: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Read and summarize a climate CSV file.")
    parser.add_argument("file", type=Path, help="Path to the climate CSV dataset")
    parser.add_argument(
        "--large",
        action="store_true",
        help="Use Dask to process the CSV in partitions"
    )
    parser.add_argument(
        "--blocksize",
        default="64MB",
        help="Approximate Dask partition size (default: 64MB)"
    )
    options = parser.parse_args(arguments)
    try:
        summary = summarize_file(options.file, options.large, options.blocksize)
    except ClimateDataError as error:
        parser.error(str(error))
    print(json.dumps(summary, indent=2))
    return 0
