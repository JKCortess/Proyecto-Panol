"""
verificar_panol_db.py — Verifica que Pañol_DB tiene la estructura correcta.

Referencia: gemini.md (Schema de Datos)
"""

import json
import os
import sys
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "token.json")
ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

EXPECTED_SHEETS = {
    "ITEMS": 10,
    "MOVIMIENTOS": 9,
    "PEDIDOS": 14,
    "PEDIDOS_ITEMS": 6,
    "USUARIOS": 4,
    "CONFIGURACION": 3,
    "PROVEEDORES": 5,
}


def get_spreadsheet_id():
    """Read spreadsheet ID from .env."""
    with open(ENV_PATH, "r") as f:
        for line in f:
            if line.strip().startswith("PANOL_DB_SPREADSHEET_ID="):
                return line.strip().split("=", 1)[1]
    print("❌ No se encontró PANOL_DB_SPREADSHEET_ID en .env")
    sys.exit(1)


def get_credentials():
    """Load OAuth credentials."""
    with open(TOKEN_PATH, "r") as f:
        token_data = json.load(f)
    creds = Credentials(
        token=token_data["token"],
        refresh_token=token_data["refresh_token"],
        token_uri=token_data["token_uri"],
        client_id=token_data["client_id"],
        client_secret=token_data["client_secret"],
        scopes=token_data.get("scopes", SCOPES),
    )
    if creds.expired or not creds.valid:
        creds.refresh(Request())
        token_data["token"] = creds.token
        token_data["expiry"] = creds.expiry.isoformat() + "Z" if creds.expiry else None
        with open(TOKEN_PATH, "w") as f:
            json.dump(token_data, f)
    return creds


def main():
    print("=" * 60)
    print("  🔍 Verificando Pañol_DB")
    print("=" * 60)
    print()

    spreadsheet_id = get_spreadsheet_id()
    creds = get_credentials()
    service = build("sheets", "v4", credentials=creds)

    # 1. Verify spreadsheet exists and has correct title
    spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    title = spreadsheet["properties"]["title"]
    print(f"📊 Título: {title} {'✅' if title == 'Pañol_DB' else '❌'}")

    # 2. Verify all 7 sheets exist
    sheets = {s["properties"]["title"]: s for s in spreadsheet["sheets"]}
    print(f"\n📋 Hojas encontradas: {len(sheets)}/7")

    all_ok = True
    for name, expected_cols in EXPECTED_SHEETS.items():
        if name in sheets:
            # Read headers
            result = service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=f"'{name}'!1:1",
            ).execute()
            headers = result.get("values", [[]])[0]
            cols_ok = len(headers) == expected_cols
            status = "✅" if cols_ok else f"❌ ({len(headers)}/{expected_cols} cols)"
            print(f"  {status} {name}: {', '.join(headers[:5])}{'...' if len(headers) > 5 else ''}")
            if not cols_ok:
                all_ok = False
        else:
            print(f"  ❌ {name}: NO ENCONTRADA")
            all_ok = False

    # 3. Verify seed data
    print()
    config_result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id,
        range="'CONFIGURACION'!A2:A10",
    ).execute()
    config_rows = len(config_result.get("values", []))
    print(f"⚙️  Configuración: {config_rows} parámetros {'✅' if config_rows >= 7 else '❌'}")

    users_result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id,
        range="'USUARIOS'!A2:A10",
    ).execute()
    user_rows = len(users_result.get("values", []))
    print(f"👥 Usuarios: {user_rows} registros {'✅' if user_rows >= 5 else '❌'}")

    # Summary
    print()
    if all_ok:
        print("=" * 60)
        print("  ✅ VERIFICACIÓN COMPLETA — Pañol_DB tiene estructura correcta")
        print(f"  🔗 https://docs.google.com/spreadsheets/d/{spreadsheet_id}")
        print("=" * 60)
    else:
        print("❌ Hay problemas en la estructura. Revisar errores arriba.")
        sys.exit(1)


if __name__ == "__main__":
    main()
