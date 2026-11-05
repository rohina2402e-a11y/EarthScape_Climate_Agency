from __future__ import annotations

import argparse
from pathlib import Path

from _common import ClimateDataError, load_climate_file


def clean_data(source: str | Path, destination: str | Path) -> int:
    source_path = Path(source).resolve()
    destination_path = Path(destination).resolve()
    if source_path == destination_path:
        raise ClimateDataError("The cleaned output must not overwrite the original dataset.")

    frame = load_climate_file(source_path)
    if destination_path.suffix.lower() != ".csv":
        raise ClimateDataError("Cleaned climate data must be saved with a .csv extension.")
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(destination_path, index=False, date_format="%Y-%m-%dT%H:%M:%S%z")
    return len(frame)


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize a climate file and save clean CSV data.")
    parser.add_argument("source", type=Path, help="Path to a supported climate dataset")
    parser.add_argument("destination", type=Path, help="Path for the normalized .csv output")
    options = parser.parse_args()
    try:
        record_count = clean_data(options.source, options.destination)
    except (ClimateDataError, OSError) as error:
        parser.error(str(error))
    print(f"Saved {record_count} normalized climate records to {options.destination}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
