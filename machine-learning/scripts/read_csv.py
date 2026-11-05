from pathlib import Path

from _common import load_format, run_csv_reader


def read_csv(file_path: str | Path):
    return load_format(file_path, {".csv"})


if __name__ == "__main__":
    raise SystemExit(run_csv_reader())
