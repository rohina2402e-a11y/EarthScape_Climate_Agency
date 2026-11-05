import csv
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from climate_processing import load_large_climate_csv, summarize_large_climate_data  # noqa: E402


class LargeClimateTests(unittest.TestCase):
    def write_csv(self, directory: str, filename: str, headers: list[str], rows: list[list[str]]) -> Path:
        path = Path(directory) / filename
        with path.open("w", newline="", encoding="utf-8") as output:
            writer = csv.writer(output)
            writer.writerow(headers)
            writer.writerows(rows)
        return path

    def test_large_wide_csv_is_processed_lazily_and_summarized(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            rows = [
                [
                    f"2026-07-{index // 24 + 1:02}T{index % 24:02}:00:00Z",
                    "Coast",
                    "35",
                    "-120",
                    str(index),
                    str(index / 10),
                    "" if index % 5 == 0 else "55",
                    "4.5",
                    "1012"
                ]
                for index in range(40)
            ]
            path = self.write_csv(
                directory,
                "wide.csv",
                [
                    "observedAt", "location", "latitude", "longitude", "temperature",
                    "rainfall", "humidity", "windSpeed", "pressure"
                ],
                rows
            )
            frame = load_large_climate_csv(path, blocksize=256)
            summary = summarize_large_climate_data(frame)

        self.assertGreater(frame.npartitions, 1)
        self.assertEqual(summary["record_count"], 40)
        self.assertEqual(summary["complete_record_count"], 32)
        self.assertEqual(summary["incomplete_record_count"], 8)
        self.assertAlmostEqual(summary["statistics"]["temperature"]["mean"], 19.5)
        self.assertEqual(summary["statistics"]["temperature"]["maximum"], 39.0)
        self.assertEqual(summary["missing_values"]["humidity"], 8)

    def test_large_legacy_measurements_from_multiple_partitions_are_grouped(self) -> None:
        rows = []
        measurement_values = {
            "temperature": "20",
            "rainfall": "1",
            "humidity": "50",
            "wind_speed": "3",
            "pressure": "1010"
        }
        for station_index in range(12):
            for name, value in measurement_values.items():
                rows.append([
                    "weather_station",
                    f"station-{station_index}",
                    f"2026-08-{station_index + 1:02}T10:00:00Z",
                    "36",
                    "-119",
                    name,
                    value,
                    "unit"
                ])

        with tempfile.TemporaryDirectory() as directory:
            path = self.write_csv(
                directory,
                "legacy.csv",
                [
                    "sourceType", "sourceId", "observedAt", "latitude", "longitude",
                    "measurementName", "value", "unit"
                ],
                rows
            )
            frame = load_large_climate_csv(path, blocksize=256)
            summary = summarize_large_climate_data(frame)

        self.assertGreater(frame.npartitions, 1)
        self.assertEqual(summary["record_count"], 12)
        self.assertEqual(summary["complete_record_count"], 12)
        self.assertEqual(summary["statistics"]["temperature"]["mean"], 20.0)
        self.assertEqual(summary["statistics"]["atmospheric_pressure"]["count"], 12)


if __name__ == "__main__":
    unittest.main()
