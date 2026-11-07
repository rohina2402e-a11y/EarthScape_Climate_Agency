import asyncio
import sys
import unittest
from pathlib import Path

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.index import process_dataset  # noqa: E402


class RequestStub:
    def __init__(self, content: bytes) -> None:
        self.content = content

    async def body(self) -> bytes:
        return self.content


class ClimateProcessingApiTests(unittest.TestCase):
    def test_process_endpoint_analyzes_csv_request_body(self) -> None:
        request = RequestStub(
            b"observedAt,temperature,rainfall,humidity\n"
            b"2026-01-01T00:00:00Z,18,0,50\n"
            b"2026-01-02T00:00:00Z,20,2,60\n"
        )

        result = asyncio.run(process_dataset(request, "CSV"))

        self.assertEqual(result["record_count"], 2)
        self.assertEqual(result["summary"]["statistics"]["temperature"]["mean"], 19.0)

    def test_process_endpoint_rejects_unsupported_file_formats(self) -> None:
        with self.assertRaises(HTTPException) as error:
            asyncio.run(process_dataset(RequestStub(b"data"), "XML"))

        self.assertEqual(error.exception.status_code, 415)

    def test_process_endpoint_rejects_empty_files(self) -> None:
        with self.assertRaises(HTTPException) as error:
            asyncio.run(process_dataset(RequestStub(b""), "CSV"))

        self.assertEqual(error.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
