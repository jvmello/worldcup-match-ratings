#!/usr/bin/env python3
"""Local mode: reads a "Notas da Copa" workbook straight off disk and serves
the dashboard on localhost. No Docker, no database — everything lives in
memory for the life of the process, re-read from the file on every request.

Usage:
    python run.py [caminho/para/sua-planilha.xlsx]

Defaults to Notas_da_Copa_2026.xlsx in the current directory.
"""
from __future__ import annotations

import argparse
import sys
import threading
import webbrowser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

import uvicorn

from match_ratings.api import create_app
from match_ratings.data_source import XlsxDataSource
from match_ratings.xlsx_loader import WorkbookFormatError


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "xlsx_path",
        nargs="?",
        default="Notas_da_Copa_2026.xlsx",
        help="Caminho para a planilha preenchida (padrão: Notas_da_Copa_2026.xlsx)",
    )
    parser.add_argument("--port", type=int, default=8420)
    parser.add_argument("--no-browser", action="store_true", help="Não abrir o navegador automaticamente")
    args = parser.parse_args()

    xlsx_path = Path(args.xlsx_path)
    if not xlsx_path.exists():
        print(f"Planilha não encontrada: {xlsx_path}", file=sys.stderr)
        print("Uso: python run.py caminho/para/sua-planilha.xlsx", file=sys.stderr)
        raise SystemExit(1)

    data_source = XlsxDataSource(xlsx_path)
    try:
        data_source.load()
    except WorkbookFormatError as e:
        print(f"A planilha não tem o formato esperado: {e}", file=sys.stderr)
        raise SystemExit(1)

    app = create_app(data_source)
    url = f"http://127.0.0.1:{args.port}"
    print(f"Lendo {xlsx_path}")
    print(f"Dashboard em {url} (Ctrl+C para parar)")

    if not args.no_browser:
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()

    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
