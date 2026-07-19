import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

WORKBOOK_PATH = ROOT / "Notas_da_Copa_2026.xlsx"


@pytest.fixture(scope="session")
def workbook_path() -> Path:
    return WORKBOOK_PATH
