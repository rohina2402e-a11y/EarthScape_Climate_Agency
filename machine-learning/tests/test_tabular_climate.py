import json
import sys
import tempfile
import unittest
from pathlib import Path

import h5py
import numpy as np
import pandas as pd
import rasterio
import xarray as xr
from rasterio.transform import from_origin

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from climate_processing import (  # noqa: E402
    ClimateDataError,
    climate_data_summary,
    load_climate_file,
    load_tabular_climate_file
)


class TabularClimateTests(unittest.TestCase):
    def load_text(self, filename: str, content: str) -> pd.DataFrame:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / filename
            path.write_text(content, encoding="utf-8")
            return load_tabular_climate_file(path)

    def test_csv_aliases_and_date_time_are_normalized_and_missing_rows_are_retained(self) -> None:
        frame = self.load_text(
            "weather.csv",
            (
                "Date,Time,Location,Lat,Lon,Temp,Rainfall,Humidity,Wind Speed,Pressure\n"
                "2026-01-01,12:00:00,Harbor,34,-118,20,1.5,50,5,1012\n"
                "2026-01-02,13:00:00,Harbor,34,-118,,2,,bad,1008\n"
            )
        )

        self.assertEqual(len(frame), 2)
        self.assertEqual(frame.loc[0, "observed_at"], pd.Timestamp("2026-01-01 12:00:00Z"))
        self.assertTrue(pd.isna(frame.loc[1, "temperature"]))
        self.assertTrue(pd.isna(frame.loc[1, "wind_speed"]))
        summary = climate_data_summary(frame)
        self.assertEqual(summary["complete_record_count"], 1)
        self.assertEqual(summary["incomplete_record_count"], 1)
        self.assertEqual(summary["statistics"]["rainfall"]["mean"], 1.75)
        self.assertEqual(summary["statistics"]["temperature"]["count"], 1)

    def test_json_long_measurements_are_pivoted_into_one_observation(self) -> None:
        records = [
            {
                "sourceType": "weather_station",
                "sourceId": "station-7",
                "observedAt": "2026-02-01T10:00:00Z",
                "latitude": 36,
                "longitude": -119,
                "measurementName": name,
                "value": value,
                "unit": unit
            }
            for name, value, unit in (
                ("temperature", 22, "C"),
                ("rainfall", 3, "mm"),
                ("humidity", 61, "%"),
                ("wind_speed", 4, "m/s"),
                ("pressure", 1008, "hPa")
            )
        ]
        frame = self.load_text(
            "weather.json",
            '{"observations":' + json.dumps(records) + '}'
        )

        self.assertEqual(len(frame), 1)
        self.assertEqual(frame.loc[0, "source_id"], "station-7")
        self.assertEqual(frame.loc[0, "atmospheric_pressure"], 1008)
        self.assertEqual(climate_data_summary(frame)["complete_record_count"], 1)

    def test_xml_records_keep_incomplete_observations(self) -> None:
        frame = self.load_text(
            "weather.xml",
            (
                "<climate><observation><date>2026-03-01T00:00:00Z</date>"
                "<location>Valley</location><latitude>40</latitude><longitude>-120</longitude>"
                "<temperature>18</temperature><rainfall>0</rainfall><humidity>42</humidity>"
                "<wind_speed>2</wind_speed><pressure>1009</pressure></observation>"
                "<observation><date>2026-03-02T00:00:00Z</date><location>Valley</location>"
                "<temperature>19</temperature></observation></climate>"
            )
        )

        self.assertEqual(len(frame), 2)
        self.assertEqual(climate_data_summary(frame)["incomplete_record_count"], 1)
        self.assertTrue(pd.isna(frame.loc[1, "latitude"]))

    def test_invalid_values_become_missing_without_dropping_the_record(self) -> None:
        frame = self.load_text(
            "partial.csv",
            "timestamp,location,latitude,longitude,temperature,pressure\n"
            "not-a-date,Outpost,100,20,not-a-number,inf\n"
        )

        self.assertEqual(len(frame), 1)
        self.assertTrue(pd.isna(frame.loc[0, "observed_at"]))
        self.assertTrue(pd.isna(frame.loc[0, "latitude"]))
        self.assertTrue(pd.isna(frame.loc[0, "temperature"]))
        self.assertTrue(pd.isna(frame.loc[0, "atmospheric_pressure"]))
        summary = climate_data_summary(frame)
        self.assertEqual(summary["record_count"], 1)
        self.assertEqual(summary["statistics"]["rainfall"]["count"], 0)
        self.assertIsNone(summary["statistics"]["rainfall"]["mean"])

    def test_unsupported_format_returns_a_clear_error(self) -> None:
        with self.assertRaisesRegex(ClimateDataError, "Unsupported tabular climate format"):
            load_tabular_climate_file("unknown.bin")

    def test_duplicate_alias_columns_are_rejected(self) -> None:
        with self.assertRaisesRegex(ClimateDataError, "same climate field"):
            self.load_text(
                "duplicate.csv",
                "temperature,temp\n20,21\n"
            )

    def test_netcdf_grid_is_expanded_to_location_time_records(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "grid.nc"
            dataset = xr.Dataset(
                {
                    "air_temperature": (("time", "latitude", "longitude"), [[[18.0, 20.0]]]),
                    "rainfall": (("time", "latitude", "longitude"), [[[0.0, 2.0]]]),
                    "humidity": (("time", "latitude", "longitude"), [[[40.0, 60.0]]]),
                    "wind_speed": (("time", "latitude", "longitude"), [[[3.0, 5.0]]]),
                    "pressure": (("time", "latitude", "longitude"), [[[1010.0, 1008.0]]])
                },
                coords={
                    "time": [np.datetime64("2026-04-01T12:00:00")],
                    "latitude": [35.0],
                    "longitude": [-118.0, -117.5]
                }
            )
            dataset.to_netcdf(path, engine="netcdf4")
            frame = load_climate_file(path)

        self.assertEqual(len(frame), 2)
        self.assertEqual(frame["temperature"].tolist(), [18.0, 20.0])
        self.assertTrue(frame["observed_at"].notna().all())
        self.assertEqual(climate_data_summary(frame)["complete_record_count"], 2)

    def test_hdf5_column_datasets_are_loaded_and_string_values_decoded(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "weather.h5"
            with h5py.File(path, "w") as dataset:
                dataset.create_dataset(
                    "observedAt",
                    data=np.asarray(
                        ["2026-05-01T10:00:00Z", "2026-05-01T11:00:00Z"],
                        dtype=h5py.string_dtype(encoding="utf-8")
                    )
                )
                dataset.create_dataset("location", data=np.asarray(["Hill", "Hill"], dtype=h5py.string_dtype()))
                dataset.create_dataset("latitude", data=[41.0, 41.0])
                dataset.create_dataset("longitude", data=[-122.0, -122.0])
                dataset.create_dataset("temperature", data=[16.0, 17.0])
                dataset.create_dataset("rainfall", data=[1.0, 0.0])
                dataset.create_dataset("humidity", data=[55.0, 54.0])
                dataset.create_dataset("wind_speed", data=[2.5, 3.0])
                dataset.create_dataset("pressure", data=[1009.0, 1010.0])
            frame = load_climate_file(path)

        self.assertEqual(len(frame), 2)
        self.assertEqual(frame.loc[0, "location"], "Hill")
        self.assertEqual(frame.loc[1, "atmospheric_pressure"], 1010.0)
        self.assertEqual(climate_data_summary(frame)["complete_record_count"], 2)

    def test_geotiff_bands_create_pixel_records_and_respect_nodata(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "climate.tif"
            with rasterio.open(
                path,
                "w",
                driver="GTiff",
                height=2,
                width=2,
                count=2,
                dtype="float32",
                crs="EPSG:4326",
                transform=from_origin(-120.0, 41.0, 0.5, 0.5),
                nodata=-9999.0
            ) as dataset:
                dataset.write(np.asarray([[20.0, 21.0], [22.0, -9999.0]], dtype="float32"), 1)
                dataset.write(np.asarray([[0.0, 1.0], [2.0, 3.0]], dtype="float32"), 2)
                dataset.set_band_description(1, "temperature")
                dataset.set_band_description(2, "rainfall")
                dataset.update_tags(observed_at="2026-06-01T00:00:00Z")
            frame = load_climate_file(path)

        self.assertEqual(len(frame), 4)
        self.assertEqual(frame["temperature"].isna().sum(), 1)
        self.assertEqual(frame["rainfall"].mean(), 1.5)
        self.assertTrue(frame["latitude"].between(40.0, 41.0).all())


if __name__ == "__main__":
    unittest.main()
