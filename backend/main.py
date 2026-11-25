"""
FastAPI Server for Startup Financial Model Demo
Serves API endpoints and compiled React frontend at http://127.0.0.1:8000
"""
import os
import json
import uuid
from pathlib import Path
from typing import Dict, List, Any, Optional

import re
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from model_engine import (
    ModelAssumptions,
    SavedScenarioAssumptions,
    ModelCalculationResponse,
    run_financial_model,
    get_default_assumptions,
    get_raw_defaults,
)

app = FastAPI(
    title="Startup Financial Models API",
    description="Local Financial Calculation Engine and Scenario Platform replicating Startup_Financial_Models.xlsx",
    version="1.0.0"
)

# CORS middleware for local development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent.parent
SCENARIOS_DIR = BASE_DIR / "scenarios"
SCENARIOS_DIR.mkdir(parents=True, exist_ok=True)
FRONTEND_DIST_DIR = BASE_DIR / "frontend" / "dist"

# Scenario IDs become file names, so only allow plain names: letters, digits,
# "_" and "-". This covers generated UUIDs and the hand-named sample scenarios
# (e.g. "conservative_bootstrapping") while ruling out "/", "\\", ".." etc.
SCENARIO_ID_PATTERN = re.compile(r"[A-Za-z0-9_-]{1,64}")


def scenario_file_path(scenario_id: str) -> Path:
    """Returns the JSON file for a scenario ID, rejecting anything unsafe."""
    if not isinstance(scenario_id, str) or not SCENARIO_ID_PATTERN.fullmatch(scenario_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid scenario ID. Use only letters, numbers, '_' and '-'.",
        )
    scenarios_root = SCENARIOS_DIR.resolve()
    file_path = (scenarios_root / f"{scenario_id}.json").resolve()
    # Belt and braces: the resolved file must still sit directly in the scenarios folder.
    if file_path.parent != scenarios_root:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid scenario ID.")
    return file_path


def format_validation_errors(error: ValidationError) -> str:
    """Turns Pydantic errors into one readable sentence per problem."""
    messages = []
    for err in error.errors():
        msg = err.get("msg", "Invalid value").removeprefix("Value error, ")
        field = " > ".join(str(part) for part in err.get("loc", ()) if part != "body")
        messages.append(f"{field}: {msg}" if field else msg)
    return " ".join(messages)


# 1. Health Endpoint
@app.get("/api/health")
def get_health():
    """Health check endpoint confirming engine and server status."""
    return {
        "status": "healthy",
        "service": "Startup Financial Models API",
        "model_version": "1.0.0",
        "excel_source": "Startup_Financial_Models.xlsx"
    }


# 2. Defaults Endpoint
@app.get("/api/defaults")
def get_defaults():
    """Returns baseline assumptions and raw defaults extracted from workbook."""
    try:
        raw = get_raw_defaults()
        defaults_model = get_default_assumptions()
        calc_response = run_financial_model(defaults_model)
        return {
            "defaults": defaults_model.model_dump(),
            "raw_metadata": raw["assumptions"],
            "periods": raw["periods"],
            "leads_list": raw["leads_list"],
            "baseline_results": calc_response.model_dump()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error loading defaults from workbook: {str(e)}"
        )


# 3. Calculate Endpoint
@app.post("/api/calculate", response_model=ModelCalculationResponse)
def calculate_model(assumptions: ModelAssumptions):
    """
    Validates submitted assumptions, executes the Python financial calculation engine,
    and returns full monthly results, annual rollups, and summary KPIs.
    """
    try:
        results = run_financial_model(assumptions)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Financial calculation failed: {str(e)}"
        )


# 4. Scenario Management Endpoints (Local JSON Storage)
@app.get("/api/scenarios")
def list_scenarios():
    """Lists all saved scenarios from local JSON storage."""
    scenarios = []
    for file_path in SCENARIOS_DIR.glob("*.json"):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                scenarios.append({
                    "id": data.get("id", file_path.stem),
                    "name": data.get("name", file_path.stem),
                    "description": data.get("description", ""),
                    "created_at": data.get("created_at"),
                    "updated_at": data.get("updated_at"),
                    "summary_kpis": data.get("summary_kpis")
                })
        except Exception:
            continue
    return sorted(scenarios, key=lambda s: s.get("updated_at", ""), reverse=True)


@app.post("/api/scenarios")
def save_scenario(payload: Dict[str, Any]):
    """
    Saves or updates a scenario in local JSON storage.
    Payload must contain 'name' and 'assumptions'.
    """
    name = payload.get("name", "Untitled Scenario").strip()
    scenario_id = payload.get("id") or str(uuid.uuid4())
    file_path = scenario_file_path(scenario_id)
    assumptions_dict = payload.get("assumptions")
    description = payload.get("description", "")
    
    if not assumptions_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scenario must contain 'assumptions' payload."
        )
        
    try:
        # Validate assumptions with engine schema
        assumptions = SavedScenarioAssumptions(**assumptions_dict)
        results = run_financial_model(assumptions)
    except ValidationError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Scenario not saved. {format_validation_errors(ve)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Calculation validation error: {str(e)}"
        )
        
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()
    
    scenario_data = {
        "id": scenario_id,
        "name": name,
        "description": description,
        "created_at": payload.get("created_at", now_iso),
        "updated_at": now_iso,
        "assumptions": assumptions.model_dump(),
        "summary_kpis": results.summary_kpis.model_dump()
    }
    
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(scenario_data, f, indent=2)
        
    return scenario_data


@app.get("/api/scenarios/{scenario_id}")
def get_scenario(scenario_id: str):
    """Retrieves full scenario details by ID."""
    file_path = scenario_file_path(scenario_id)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read scenario: {str(e)}")


@app.delete("/api/scenarios/{scenario_id}")
def delete_scenario(scenario_id: str):
    """Deletes a saved scenario."""
    file_path = scenario_file_path(scenario_id)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")
    try:
        file_path.unlink()
        return {"status": "deleted", "id": scenario_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete scenario: {str(e)}")


# 5. Serve React frontend
if FRONTEND_DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        # Don't intercept /api routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_candidate = FRONTEND_DIST_DIR / full_path
        if full_path and file_candidate.exists() and file_candidate.is_file():
            return FileResponse(file_candidate)
        index_file = FRONTEND_DIST_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return JSONResponse(
            status_code=404,
            content={"detail": "Frontend build files not found. Please compile frontend."}
        )
else:
    @app.get("/")
    def index_placeholder():
        return {
            "message": "FastAPI Financial Model Server is active. Frontend is building...",
            "api_endpoints": {
                "health": "/api/health",
                "defaults": "/api/defaults",
                "calculate": "/api/calculate",
                "scenarios": "/api/scenarios"
            }
        }
