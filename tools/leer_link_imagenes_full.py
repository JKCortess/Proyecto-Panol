"""
leer_link_imagenes_full.py — Lee el contenido completo y lo guarda en .tmp
"""

import json
import os

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "token.json")
SPREADSHEET_ID = "1Ic7x6ikmKr9UPej_RstOdGCv7v0Mc1V1UK3lyF7Ec6w"
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


def get_credentials():
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
    creds = get_credentials()
    service = build("sheets", "v4", credentials=creds)

    result = service.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID,
        range="'Hoja 1'!A:F",
    ).execute()

    values = result.get("values", [])

    # Save to .tmp
    tmp_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    output_path = os.path.join(tmp_dir, "link_imagenes_content.txt")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(f"Google Sheet: Link imágenes\n")
        f.write(f"Total filas: {len(values)} (incluyendo encabezado)\n")
        f.write(f"Columnas: {values[0] if values else 'N/A'}\n")
        f.write("=" * 120 + "\n\n")

        for i, row in enumerate(values):
            if i == 0:
                f.write(f"--- ENCABEZADOS ---\n")
                for j, col in enumerate(row):
                    f.write(f"  Col {j+1}: {col}\n")
                f.write("\n")
            else:
                f.write(f"--- Fila {i} ---\n")
                for j, col in enumerate(row):
                    header = values[0][j] if j < len(values[0]) else f"Col {j+1}"
                    f.write(f"  {header}: {col}\n")
                f.write("\n")

    print(f"✅ Contenido guardado en: {output_path}")
    print(f"   Total: {len(values)} filas\n")

    # Also print summary to console
    if values:
        headers = values[0]
        print(f"📊 Encabezados: {headers}\n")
        print(f"{'#':<4} {'Nombre del Archivo':<35} {'Link (primeros 60 chars)':<62}")
        print("-" * 100)
        for i, row in enumerate(values[1:], 1):
            nombre = row[0] if len(row) > 0 else ""
            link = row[5] if len(row) > 5 else ""
            link_short = link[:60] + "..." if len(link) > 60 else link
            print(f"{i:<4} {nombre:<35} {link_short:<62}")


if __name__ == "__main__":
    main()
