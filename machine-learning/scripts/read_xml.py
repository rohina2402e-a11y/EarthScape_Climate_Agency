from pathlib import Path

from _common import load_format, run_reader


def read_xml(file_path: str | Path):
    return load_format(file_path, {".xml"})


if __name__ == "__main__":
    raise SystemExit(run_reader("Read and summarize a climate XML file.", {".xml"}))
