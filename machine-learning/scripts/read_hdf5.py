from pathlib import Path

from _common import load_format, run_reader


def read_hdf5(file_path: str | Path):
    return load_format(file_path, {".h5", ".hdf5", ".hdf"})


if __name__ == "__main__":
    raise SystemExit(run_reader(
        "Read and summarize an HDF5 climate file.",
        {".h5", ".hdf5", ".hdf"}
    ))
