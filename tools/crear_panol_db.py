"""
crear_panol_db.py — Crea el Google Sheet 'Pañol_DB' con las 7 hojas del schema.

Referencia: gemini.md (Constitución del Proyecto)
Scopes requeridos: spreadsheets, drive
"""

import json
import os
import sys
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# ─── Config ───────────────────────────────────────────────────
SPREADSHEET_TITLE = "Pañol_DB"
TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "token.json")
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

# ─── Sheet Definitions ───────────────────────────────────────
SHEETS = {
    "ITEMS": {
        "headers": [
            "SKU", "Nombre", "Categoria", "Stock_Actual", "Stock_Reservado",
            "Ubicacion", "Link_Foto", "Clasificacion", "ROP", "Safety_Stock"
        ],
        "color": {"red": 0.05, "green": 0.35, "blue": 0.95},  # Azul primario
    },
    "MOVIMIENTOS": {
        "headers": [
            "ID_Transaccion", "Fecha", "Tipo", "SKU", "Cantidad",
            "Usuario_ID", "Orden_Trabajo_ID", "ID_Pedido", "Estado_Movimiento"
        ],
        "color": {"red": 0.2, "green": 0.66, "blue": 0.33},  # Verde
    },
    "PEDIDOS": {
        "headers": [
            "ID_Pedido", "Solicitante_ID", "Pañolero_ID", "Orden_Trabajo_ID",
            "Estado", "Token_UUID", "Token_Corto", "Fecha_Solicitud",
            "Fecha_Preparacion", "Fecha_Listo", "Fecha_Entrega",
            "Token_Expiracion", "Email_Origen", "Notas"
        ],
        "color": {"red": 0.95, "green": 0.55, "blue": 0.05},  # Naranja
    },
    "PEDIDOS_ITEMS": {
        "headers": [
            "ID", "ID_Pedido", "SKU", "Cantidad_Solicitada",
            "Cantidad_Entregada", "Estado_Linea"
        ],
        "color": {"red": 0.95, "green": 0.75, "blue": 0.05},  # Amarillo
    },
    "USUARIOS": {
        "headers": ["ID_Empleado", "Nombre", "Rol", "Email"],
        "color": {"red": 0.58, "green": 0.25, "blue": 0.85},  # Púrpura
    },
    "CONFIGURACION": {
        "headers": ["Parametro", "Valor", "Descripcion"],
        "color": {"red": 0.33, "green": 0.33, "blue": 0.33},  # Gris
    },
    "PROVEEDORES": {
        "headers": [
            "ID_Proveedor", "Nombre", "Lead_Time_Dias", "Contacto", "Condiciones"
        ],
        "color": {"red": 0.85, "green": 0.25, "blue": 0.25},  # Rojo
    },
}

# ─── Seed Data ────────────────────────────────────────────────
SEED_CONFIGURACION = [
    ["Lead_Time_Default", "7", "Días de entrega por defecto para proveedores sin datos"],
    ["Factor_Z_Critico", "1.65", "Factor Z para ítems críticos (95% nivel de servicio)"],
    ["Factor_Z_NoCritico", "1.28", "Factor Z para ítems no críticos (90% nivel de servicio)"],
    ["Token_Expiracion_Horas", "48", "Horas de validez del token QR de entrega"],
    ["Limpieza_Expirados_Horas", "6", "Frecuencia de ejecución del limpiador de pedidos expirados"],
    ["Email_Alertas", "", "Email destino para alertas de stock bajo (llenar con email real)"],
    ["ROP_Recalculo_Dia", "Domingo", "Día de la semana para recalcular ROP y Safety Stock"],
]

SEED_USUARIOS = [
    ["USR-001", "Pañolero Principal", "Admin", ""],
    ["USR-002", "Técnico 1", "Técnico", ""],
    ["USR-003", "Técnico 2", "Técnico", ""],
    ["USR-004", "Planificador", "Planificador", ""],
    ["USR-005", "Auditor", "Auditor", ""],
]


def get_credentials():
    """Load and refresh OAuth credentials from token.json."""
    if not os.path.exists(TOKEN_PATH):
        print(f"❌ ERROR: No se encontró {TOKEN_PATH}")
        print("   Ejecuta primero la autenticación OAuth.")
        sys.exit(1)

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

    # Refresh if expired
    if creds.expired or not creds.valid:
        print("🔄 Renovando token de acceso...")
        creds.refresh(Request())
        # Save refreshed token
        token_data["token"] = creds.token
        token_data["expiry"] = creds.expiry.isoformat() + "Z" if creds.expiry else None
        with open(TOKEN_PATH, "w") as f:
            json.dump(token_data, f)
        print("✅ Token renovado.")

    return creds


def create_spreadsheet(sheets_service):
    """Create the Pañol_DB spreadsheet with all 7 sheets."""
    sheet_list = []
    for idx, (name, config) in enumerate(SHEETS.items()):
        sheet_list.append({
            "properties": {
                "title": name,
                "index": idx,
                "tabColorStyle": {
                    "rgbColor": config["color"]
                },
                "gridProperties": {
                    "frozenRowCount": 1,  # Freeze header row
                },
            }
        })

    body = {
        "properties": {
            "title": SPREADSHEET_TITLE,
            "locale": "es_AR",
            "timeZone": "America/Argentina/Buenos_Aires",
        },
        "sheets": sheet_list,
    }

    result = sheets_service.spreadsheets().create(body=body).execute()
    spreadsheet_id = result["spreadsheetId"]
    spreadsheet_url = result["spreadsheetUrl"]
    print(f"✅ Spreadsheet creado: {SPREADSHEET_TITLE}")
    print(f"   ID: {spreadsheet_id}")
    print(f"   URL: {spreadsheet_url}")
    return spreadsheet_id


def write_headers_and_seed(sheets_service, spreadsheet_id):
    """Write headers to all sheets and seed data to CONFIGURACION and USUARIOS."""
    # Prepare batch update data
    data = []

    for name, config in SHEETS.items():
        # Headers
        data.append({
            "range": f"'{name}'!A1",
            "majorDimension": "ROWS",
            "values": [config["headers"]],
        })

    # Seed data
    data.append({
        "range": "'CONFIGURACION'!A2",
        "majorDimension": "ROWS",
        "values": SEED_CONFIGURACION,
    })
    data.append({
        "range": "'USUARIOS'!A2",
        "majorDimension": "ROWS",
        "values": SEED_USUARIOS,
    })

    body = {
        "valueInputOption": "USER_ENTERED",
        "data": data,
    }

    sheets_service.spreadsheets().values().batchUpdate(
        spreadsheetId=spreadsheet_id, body=body
    ).execute()
    print("✅ Headers escritos en las 7 hojas")
    print(f"   + {len(SEED_CONFIGURACION)} parámetros de configuración")
    print(f"   + {len(SEED_USUARIOS)} usuarios de prueba")


def format_headers(sheets_service, spreadsheet_id):
    """Apply bold formatting and background color to header rows."""
    # Get sheet IDs
    spreadsheet = sheets_service.spreadsheets().get(
        spreadsheetId=spreadsheet_id
    ).execute()
    
    sheet_id_map = {}
    for sheet in spreadsheet["sheets"]:
        sheet_id_map[sheet["properties"]["title"]] = sheet["properties"]["sheetId"]

    requests = []
    for name, config in SHEETS.items():
        sid = sheet_id_map[name]
        num_cols = len(config["headers"])

        # Bold + white text on dark background for header row
        requests.append({
            "repeatCell": {
                "range": {
                    "sheetId": sid,
                    "startRowIndex": 0,
                    "endRowIndex": 1,
                    "startColumnIndex": 0,
                    "endColumnIndex": num_cols,
                },
                "cell": {
                    "userEnteredFormat": {
                        "backgroundColor": {
                            "red": 0.15, "green": 0.15, "blue": 0.20,
                        },
                        "textFormat": {
                            "bold": True,
                            "fontSize": 11,
                            "foregroundColor": {
                                "red": 1.0, "green": 1.0, "blue": 1.0,
                            },
                        },
                        "horizontalAlignment": "CENTER",
                    }
                },
                "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
            }
        })

        # Auto-resize columns
        requests.append({
            "autoResizeDimensions": {
                "dimensions": {
                    "sheetId": sid,
                    "dimension": "COLUMNS",
                    "startIndex": 0,
                    "endIndex": num_cols,
                }
            }
        })

    sheets_service.spreadsheets().batchUpdate(
        spreadsheetId=spreadsheet_id,
        body={"requests": requests},
    ).execute()
    print("✅ Formato aplicado: headers en negrita, columnas auto-ajustadas")


def main():
    print("=" * 60)
    print("  📦 Creando Pañol_DB — Google Sheets")
    print("=" * 60)
    print()

    # 1. Auth
    creds = get_credentials()
    sheets_service = build("sheets", "v4", credentials=creds)

    # 2. Create spreadsheet
    spreadsheet_id = create_spreadsheet(sheets_service)

    # 3. Write headers + seed data
    write_headers_and_seed(sheets_service, spreadsheet_id)

    # 4. Format
    format_headers(sheets_service, spreadsheet_id)

    # 5. Save spreadsheet ID for future scripts
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    with open(config_path, "a") as f:
        f.write(f"\nPANOL_DB_SPREADSHEET_ID={spreadsheet_id}\n")
    print(f"\n✅ Spreadsheet ID guardado en .env")

    print()
    print("=" * 60)
    print("  🎉 ¡Pañol_DB creado exitosamente!")
    print(f"  📊 Abre en: https://docs.google.com/spreadsheets/d/{spreadsheet_id}")
    print("=" * 60)

    return spreadsheet_id


if __name__ == "__main__":
    main()
