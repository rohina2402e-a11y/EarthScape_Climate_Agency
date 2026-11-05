from pathlib import Path

from _common import load_format, run_reader


def read_netcdf(file_path: str | Path):
    return load_format(file_path, {".nc", ".nc4", ".netcdf"})


if __name__ == "__main__":
    raise SystemExit(run_reader(
        "Read and summarize a NetCDF climate file.",
        {".nc", ".nc4", ".netcdf"}
    ))
