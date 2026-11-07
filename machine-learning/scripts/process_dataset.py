from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from climate_processing import ClimateDataError
from climate_processing.processing import process_climate_file


def main() -> int:
    parser = argparse.ArgumentParser(description="Clean and analyze a CSV or JSON climate dataset.")
    parser.add_argument("file", type=Path, help="Path to the original CSV or JSON file")
    arguments = parser.parse_args()

    try:
        result = process_climate_file(arguments.file)
    except (ClimateDataError, OSError, ValueError) as error:
        logging.error("Climate dataset processing failed: %s", error)
        return 1

    print(json.dumps(result, allow_nan=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
