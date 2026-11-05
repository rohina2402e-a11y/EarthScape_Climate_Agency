from __future__ import annotations

import argparse
import json
from pathlib import Path

from _common import ClimateDataError, summarize_file


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze a climate dataset.")
    parser.add_argument("file", type=Path, help="Path to a supported climate dataset")
    parser.add_argument(
        "--large",
        action="store_true",
        help="Use Dask for a large CSV dataset"
    )
    parser.add_argument(
        "--blocksize",
        default="64MB",
        help="Approximate Dask partition size (default: 64MB)"
    )
    options = parser.parse_args()
    try:
        summary = summarize_file(options.file, options.large, options.blocksize)
    except ClimateDataError as error:
        parser.error(str(error))
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
