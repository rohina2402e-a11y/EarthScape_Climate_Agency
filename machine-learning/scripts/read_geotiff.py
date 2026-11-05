from pathlib import Path

from _common import load_format, run_reader


def read_geotiff(file_path: str | Path):
    return load_format(file_path, {".tif", ".tiff"})


if __name__ == "__main__":
    raise SystemExit(run_reader(
        "Read and summarize a GeoTIFF climate file.",
        {".tif", ".tiff"}
    ))
