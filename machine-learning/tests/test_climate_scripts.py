import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / "machine-learning" / "scripts"


class ClimateScriptTests(unittest.TestCase):
    def test_reader_script_prints_a_json_summary(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "sample.csv"
            source.write_text(
                "observedAt,location,temperature,rainfall,humidity,windSpeed,pressure\n"
                "2026-01-01T00:00:00Z,Harbor,18,2,55,4,1012\n",
                encoding="utf-8"
            )
            result = subprocess.run(
                [sys.executable, str(SCRIPTS / "read_csv.py"), str(source)],
                check=True,
                capture_output=True,
                cwd=ROOT,
                text=True
            )

        summary = json.loads(result.stdout)
        self.assertEqual(summary["record_count"], 1)
        self.assertEqual(summary["statistics"]["temperature"]["mean"], 18.0)
        self.assertEqual(summary["monthly_trends"][0]["period"], "2026-01")

    def test_clean_data_saves_normalized_csv_without_overwriting_source(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "sample.json"
            destination = Path(directory) / "clean" / "normalized.csv"
            source.write_text(
                '[{"observedAt":"2026-02-01T00:00:00Z","location":"Valley",'
                '"temperature":"12","rainfall":"1"}]',
                encoding="utf-8"
            )
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPTS / "clean_data.py"),
                    str(source),
                    str(destination)
                ],
                check=True,
                capture_output=True,
                cwd=ROOT,
                text=True
            )

            cleaned_csv = destination.read_text(encoding="utf-8")

        self.assertIn("observed_at,location,latitude,longitude,temperature", cleaned_csv)
        self.assertIn("2026-02-01T00:00:00+0000,Valley", cleaned_csv)
        self.assertIn("Saved 1 normalized climate records", result.stdout)


if __name__ == "__main__":
    unittest.main()
