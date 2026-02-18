"""
leer_link_imagenes.py — Lee el contenido del Google Sheet "Link imágenes"
Spreadsheet ID: 1Ic7x6ikmKr9UPej_RstOdGCv7v0Mc1V1UK3lyF7Ec6w
"""

import json
import os

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# ─── Config ───────────────────────────────────────────────────
TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "token.json")
SPREADSHEET_ID = "1Ic7x6ikmKr9UPej_RstOdGCv7v0Mc1V1UK3lyF7Ec6w"
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


def get_credentials():
    """Load OAuth credentials and refresh if needed."""
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
    print("  📖 Leyendo Google Sheet: Link imágenes")
    print("=" * 60)

    # Auth
    creds = get_credentials()
    service = build("sheets", "v4", credentials=creds)

    # Get spreadsheet metadata
    spreadsheet = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    print(f"\n📄 Título: {spreadsheet['properties']['title']}")
    print(f"📑 Hojas disponibles:")
    for sheet in spreadsheet['sheets']:
        title = sheet['properties']['title']
        print(f"   - {title}")

    # Read Hoja 1 (first sheet)
    first_sheet_title = spreadsheet['sheets'][0]['properties']['title']
    print(f"\n📋 Leyendo hoja: '{first_sheet_title}'")
    print("-" * 60)

    result = service.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID,
        range=f"'{first_sheet_title}'!A:Z",
    ).execute()

    values = result.get("values", [])

    if not values:
        print("⚠️  La hoja está vacía.")
        return

    print(f"   Total filas: {len(values)}")
    print(f"   Columnas: {len(values[0]) if values else 0}")
    print()

    # Print headers
    headers = values[0] if values else []
    print(f"📊 Encabezados: {headers}")
    print("-" * 60)

    # Print all rows
    for i, row in enumerate(values):
        if i == 0:
            print(f"  [HEADER] {row}")
        else:
            print(f"  [Fila {i}] {row}")

    print()
    print("=" * 60)
    print(f"  ✅ Lectura completada — {len(values)} filas leídas")
    print("=" * 60)


if __name__ == "__main__":
    main()
