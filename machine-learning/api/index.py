from __future__ import annotations

import logging
import sys
import tempfile
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Request

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from climate_processing import ClimateDataError, process_climate_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("earthscape.climate-processing")
app = FastAPI(title="EarthScape Climate Processor")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/process")
async def process_dataset(
    request: Request,
    file_format: str = Header(alias="X-Climate-File-Format"),
) -> dict:
    suffix_by_format = {"CSV": ".csv", "JSON": ".json"}
    suffix = suffix_by_format.get(file_format.upper())
    if suffix is None:
        raise HTTPException(status_code=415, detail="Only CSV and JSON files can be processed.")

    try:
        content = await request.body()
        if not content:
            raise HTTPException(status_code=400, detail="The uploaded dataset is empty.")
        with tempfile.TemporaryDirectory(prefix="earthscape-climate-") as directory:
            file_path = Path(directory) / f"dataset{suffix}"
            file_path.write_bytes(content)
            return process_climate_file(file_path)
    except ClimateDataError as error:
        logger.info("Climate dataset was rejected: %s", error)
        raise HTTPException(status_code=422, detail=str(error)) from error
    except OSError as error:
        logger.exception("Could not process climate dataset.")
        raise HTTPException(status_code=500, detail="Could not process the uploaded climate dataset.") from error
