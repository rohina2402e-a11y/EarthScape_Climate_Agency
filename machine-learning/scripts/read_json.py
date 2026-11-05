from pathlib import Path

from _common import load_format, run_reader


def read_json(file_path: str | Path):
    return load_format(file_path, {".json"})


if __name__ == "__main__":
    raise SystemExit(run_reader("Read and summarize a climate JSON file.", {".json"}))
