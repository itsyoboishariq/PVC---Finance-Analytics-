"""
Shared test setup.

Every test gets its own temporary scenarios folder, pre-filled with copies of
the sample scenarios in /scenarios, so tests never create, change or delete the
real scenario files.
"""
import shutil
from pathlib import Path

import pytest

import backend.main as backend_main

REAL_SCENARIOS_DIR = Path(__file__).resolve().parent.parent / "scenarios"


@pytest.fixture(autouse=True)
def isolated_scenarios_dir(tmp_path, monkeypatch):
    scenarios_dir = tmp_path / "scenarios"
    scenarios_dir.mkdir()
    for sample in REAL_SCENARIOS_DIR.glob("*.json"):
        shutil.copy(sample, scenarios_dir / sample.name)
    monkeypatch.setattr(backend_main, "SCENARIOS_DIR", scenarios_dir)
    return scenarios_dir
