from importlib import import_module

__all__ = [
    "ClimateDataError",
    "climate_data_summary",
    "load_climate_file",
    "load_large_climate_csv",
    "normalize_large_climate_data",
    "load_tabular_climate_file",
    "normalize_climate_data",
    "summarize_large_climate_data",
    "process_climate_file"
]


def __getattr__(name):
    if name in {
        "ClimateDataError",
        "climate_data_summary",
        "load_climate_file",
        "load_tabular_climate_file",
        "normalize_climate_data",
    }:
        tabular = import_module(".tabular", __name__)
        return getattr(tabular, name)
    if name in {
        "load_large_climate_csv",
        "normalize_large_climate_data",
        "summarize_large_climate_data",
    }:
        large_data = import_module(".large_data", __name__)
        return getattr(large_data, name)
    if name == "process_climate_file":
        processing = import_module(".processing", __name__)
        return processing.process_climate_file
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
