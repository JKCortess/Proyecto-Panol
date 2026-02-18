import openpyxl
import json
import re

# Load the data
with open('.tmp/excel_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# ========================================
# KNOWLEDGE BASE: Bearing Classification
# ========================================

def classify_item(item_code, brand):
    """Classify bearing/component based on its code prefix and model number."""
    item = item_code.upper().strip()
    
    # ---- DEEP GROOVE BALL BEARINGS (ROD.6xxx) ----
    if re.match(r'ROD\.6[0-9]{3}', item) or re.match(r'ROD\.6[0-9]{2}\b', item):
        # Extract base number
        match = re.search(r'ROD\.(\d+)', item)
        base = match.group(1) if match else ''
        
        # Determine seal type from suffix
        seal = ""
        if '2RS' in item or '2RSR' in item or '2RSH' in item or '2RSL' in item or '2RS1' in item:
            seal = "con sello de goma doble (2RS)"
        elif 'DDU' in item or 'DDV' in item or 'DV' in item:
            seal = "con sello de contacto doble (DDU/DDV)"
        elif 'LLU' in item or 'LLC' in item:
            seal = "con sello sin contacto doble (LLU)"
        elif 'ZZ' in item or '2Z' in item:
            seal = "con blindaje metálico doble (ZZ)"
        else:
            seal = "abierto"
        
        clearance = ""
        if 'C3' in item:
            clearance = ", juego radial C3"
        
        inox = ""
        if 'INOX' in item or 'SRL' in item or item.startswith('ROD.602 - H'):
            inox = " de acero inoxidable"
        
        desc = f"Rodamiento rígido de bolas{inox} serie {base}, {seal}{clearance}"
        uso = f"Uso general en motores eléctricos, bombas, transportadores, ventiladores y maquinaria industrial. Soporta cargas radiales y axiales moderadas."
        
        # Price estimation based on series size
        precio = estimate_rod_price(base, brand, inox != "")
        
        img = get_bearing_image_url(item, 'deep_groove', base)
        
        return desc, uso, precio, img
    
    # ---- ROD.R-12 (Imperial bearing) ----
    if item.startswith('ROD.R-12') or item.startswith('ROD.R12'):
        desc = "Rodamiento rígido de bolas serie imperial R12, con sello de goma doble (2RS)"
        uso = "Uso en maquinaria con ejes de medida imperial (pulgadas). Aplicaciones en equipos agrícolas, transportadores y maquinaria americana."
        precio = estimate_price_range(8000, 15000, brand)
        img = "https://m.media-amazon.com/images/I/51pVE0CDWSL._AC_SL1000_.jpg"
        return desc, uso, precio, img
    
    # ---- ROD.28DHM (Special bearing) ----
    if '28DHM' in item:
        desc = "Rodamiento de agujas / rodillos cilíndricos especial serie 28DHM3730"
        uso = "Aplicaciones especiales en cajas de cambio, transmisiones y equipos donde se requiere alta capacidad de carga radial en espacios reducidos."
        precio = estimate_price_range(15000, 35000, brand)
        img = "https://m.media-amazon.com/images/I/41q0vYmAURL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- ROD.E5209 (Double row angular contact) ----
    if 'E5209' in item:
        desc = "Rodamiento de bolas de doble hilera de contacto angular serie 5209"
        uso = "Soporta cargas combinadas (radiales y axiales) en ambas direcciones. Uso en husillos, bombas y equipos de precisión."
        precio = estimate_price_range(25000, 55000, brand)
        img = "https://m.media-amazon.com/images/I/41hdrJ8FXzL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- TAPERED ROLLER BEARINGS (ROD.32xxx) ----
    if re.match(r'ROD\.322[0-9]{2}', item):
        match = re.search(r'ROD\.(\d+)', item)
        base = match.group(1) if match else '32209'
        desc = f"Rodamiento de rodillos cónicos serie {base}"
        uso = "Soporta cargas radiales y axiales combinadas en una dirección. Uso en ruedas, cajas reductoras, ejes de transmisión y maquinaria pesada."
        precio = estimate_price_range(18000, 45000, brand)
        img = "https://m.media-amazon.com/images/I/51CK+KN2YxL._AC_SL1000_.jpg"
        return desc, uso, precio, img
    
    # ---- ANGULAR CONTACT (ROD.33xx, ROD.32xx) ----
    if re.match(r'ROD\.33[0-9]{2}', item):
        match = re.search(r'ROD\.(\d+)', item)
        base = match.group(1) if match else ''
        desc = f"Rodamiento de bolas de contacto angular doble hilera serie {base}"
        uso = "Soporta cargas combinadas (radiales y axiales) en ambas direcciones. Uso en husillos de máquinas-herramienta, bombas y compresores."
        precio = estimate_price_range(20000, 50000, brand)
        img = "https://m.media-amazon.com/images/I/41lVZIcxhEL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- SELF-ALIGNING (ROD.22xx) ----
    if re.match(r'ROD\.22[0-9]{2}', item):
        match = re.search(r'ROD\.(\d+)', item)
        base = match.group(1) if match else ''
        desc = f"Rodamiento autoalineable de bolas serie {base}"
        uso = "Compensa desalineaciones del eje. Uso en ejes largos, transportadores de banda, equipos agrícolas y maquinaria con desalineación inherente."
        precio = estimate_price_range(12000, 30000, brand)
        img = "https://m.media-amazon.com/images/I/41L5rYYjqZL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- ROD.32xx (Angular contact double row) ----
    if re.match(r'ROD\.320[0-9]', item):
        match = re.search(r'ROD\.(\d+)', item)
        base = match.group(1) if match else ''
        desc = f"Rodamiento de bolas de contacto angular doble hilera serie {base}"
        uso = "Soporta cargas axiales y radiales combinadas. Uso en husillos, bombas centrífugas y maquinaria de precisión."
        precio = estimate_price_range(12000, 30000, brand)
        img = "https://m.media-amazon.com/images/I/41lVZIcxhEL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- ROD.619xx (Thin section bearings) ----
    if re.match(r'ROD\.619[0-9]{2}', item):
        match = re.search(r'ROD\.(\d+)', item)
        base = match.group(1) if match else ''
        seal = "con sello de goma doble (2RS)" if '2RS' in item else "abierto"
        desc = f"Rodamiento rígido de bolas de sección delgada serie {base}, {seal}"
        uso = "Diseñado para espacios reducidos donde se necesita sección delgada. Uso en instrumentación, robótica, equipos médicos y transportadores livianos."
        precio = estimate_price_range(5000, 15000, brand)
        img = "https://m.media-amazon.com/images/I/41XR1rOjURL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- ROD.69xx (Thin section bearings) ----
    if re.match(r'ROD\.69[0-9]{2}', item):
        match = re.search(r'ROD\.(\d+)', item)
        base = match.group(1) if match else ''
        seal = ""
        if 'DDV' in item or 'DDU' in item:
            seal = "con sello de contacto doble"
        elif '2RS' in item:
            seal = "con sello de goma doble (2RS)"
        elif 'LLU' in item:
            seal = "con sello sin contacto doble"
        else:
            seal = "abierto"
        desc = f"Rodamiento rígido de bolas de sección delgada serie {base}, {seal}"
        uso = "Para aplicaciones con espacio radial limitado. Uso en instrumentación, equipos de envasado, transportadores y maquinaria de precisión."
        precio = estimate_price_range(5000, 18000, brand)
        img = "https://m.media-amazon.com/images/I/41XR1rOjURL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- YARD Bearings (ROD.YARD) ----
    if 'YARD' in item:
        desc = "Rodamiento Y (YAR) tipo inserto con sello de doble labio para unidades de chumacera"
        uso = "Inserto especial para chumaceras en transportadores de banda, equipos agrícolas y maquinaria de procesamiento de alimentos. Fácil montaje y desmontaje."
        precio = estimate_price_range(15000, 35000, brand)
        img = "https://m.media-amazon.com/images/I/31V5DuPDU-L._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- CAJA (Housing) ----
    if item.startswith('CAJA'):
        desc = "Caja/soporte (housing) para rodamiento tipo brida o pedestal"
        uso = "Estructura metálica para alojar y fijar rodamientos de inserto en ejes. Se monta sobre superficies planas con pernos."
        precio = estimate_price_range(15000, 40000, brand)
        img = "https://m.media-amazon.com/images/I/41cKv0EYqbL._AC_.jpg"
        return desc, uso, precio, img
    
    # ========== MOUNTED BEARING UNITS ==========
    
    # ---- UCF (Square flange bearing unit) ----
    if item.startswith('UCF') or 'UCF' in item:
        size = extract_size(item)
        desc = f"Unidad de chumacera con brida cuadrada de 4 pernos (UCF), tamaño {size}"
        uso = "Montaje en superficies verticales u horizontales. Uso en transportadores, cintas transportadoras, ventiladores industriales y equipos de procesamiento."
        precio = estimate_mounted_price(size, brand, 'ucf')
        img = "https://m.media-amazon.com/images/I/41srZrLH7GL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- UCP (Pillow block bearing unit) ----
    if item.startswith('UCP'):
        size = extract_size(item)
        desc = f"Chumacera tipo pedestal (Pillow Block) UCP, tamaño {size}"
        uso = "Soporte de eje más común. Montaje sobre superficie horizontal. Uso en transportadores, ejes de transmisión, ventiladores y maquinaria general."
        precio = estimate_mounted_price(size, brand, 'ucp')
        img = "https://m.media-amazon.com/images/I/41vMX1WJ8TL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- UCFO (Round flange bearing unit) ----
    if item.startswith('UCFO'):
        size = extract_size(item)
        desc = f"Unidad de chumacera con brida redonda (UCFO), tamaño {size}"
        uso = "Montaje en superficies planas, especialmente donde se necesita acceso desde la parte posterior. Uso en transportadores y equipos compactos."
        precio = estimate_mounted_price(size, brand, 'ucf')
        img = "https://m.media-amazon.com/images/I/41cKv0EYqbL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- UCT (Take-up bearing unit) ----
    if item.startswith('UCT'):
        size = extract_size(item)
        desc = f"Unidad tensor (Take-Up) UCT con rodamiento de inserto, tamaño {size}"
        uso = "Ajuste de tensión de cintas transportadoras y cadenas. Permite movimiento axial del eje para tensionar."
        precio = estimate_mounted_price(size, brand, 'uct')
        img = "https://m.media-amazon.com/images/I/41OqVLmL3sL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- UC (Bearing INSERT) ----
    if re.match(r'UC\s*-?\s*\d', item) and 'UCF' not in item and 'UCP' not in item and 'UCT' not in item and 'UCFO' not in item:
        size = extract_size(item)
        inox = " de acero inoxidable" if 'S.' in item or 'SS' in item else ""
        desc = f"Inserto de rodamiento (Bearing Insert) UC{inox}, tamaño {size}"
        uso = "Rodamiento de inserto con tornillo de fijación para montar en chumaceras tipo pedestal, brida o tensor. Uso en transportadores, ejes y maquinaria industrial."
        precio = estimate_insert_price(size, brand, 'S.' in item or 'SS' in item)
        img = "https://m.media-amazon.com/images/I/41QHQQ3b1EL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- S.UC (Stainless UC insert) ----
    if item.startswith('S.UC'):
        size = extract_size(item)
        desc = f"Inserto de rodamiento de acero inoxidable (S.UC), tamaño {size}"
        uso = "Rodamiento de inserto resistente a corrosión. Uso en industria alimentaria, farmacéutica, química y ambientes húmedos o corrosivos."
        precio = estimate_insert_price(size, brand, True)
        img = "https://m.media-amazon.com/images/I/31kCrNxfXEL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- SS-UC (Stainless steel UC insert) ----
    if item.startswith('SS'):
        size = extract_size(item)
        desc = f"Inserto de rodamiento de acero inoxidable (SS-UC), tamaño {size}"
        uso = "Rodamiento de inserto totalmente inoxidable para ambientes altamente corrosivos. Uso en industria alimentaria, marítima y procesamiento químico."
        precio = estimate_insert_price(size, brand, True)
        img = "https://m.media-amazon.com/images/I/31kCrNxfXEL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- NUC (Insert with eccentric collar) ----
    if item.startswith('NUC'):
        size = extract_size(item)
        desc = f"Inserto de rodamiento con collar excéntrico (NUC), tamaño {size}"
        uso = "Rodamiento de inserto con sistema de fijación por collar excéntrico. Facilita montaje y desmontaje rápido en transportadores y ejes."
        precio = estimate_insert_price(size, brand, False)
        img = "https://m.media-amazon.com/images/I/41QHQQ3b1EL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- T-xxx (Take-up housing) ----
    if re.match(r'T\s*-\s*\d', item) and 'UCT' not in item and 'BUT' not in item and 'TP' not in item:
        size = extract_size(item)
        desc = f"Soporte tensor (Take-Up Housing) T, tamaño {size}"
        uso = "Carcasa tipo tensor para ajuste de tensión en cintas transportadoras. Permite desplazamiento axial del eje."
        precio = estimate_housing_price(size, brand, 't')
        img = "https://m.media-amazon.com/images/I/41OqVLmL3sL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- P-xxx (Pillow block housing) ----
    if re.match(r'P\s*-?\s*\d', item) and 'UCP' not in item and 'PP' not in item and 'PA' not in item and 'TP' not in item:
        size = extract_size(item)
        desc = f"Carcasa tipo pedestal (Pillow Block Housing) P, tamaño {size}"
        uso = "Soporte de hierro fundido para alojar insertos de rodamiento UC. Se monta horizontalmente para soportar ejes rotativos."
        precio = estimate_housing_price(size, brand, 'p')
        img = "https://m.media-amazon.com/images/I/41vMX1WJ8TL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- PA-xxx (Pillow block adjustable) ----
    if item.startswith('PA') and 'TP' not in item:
        size = extract_size(item)
        desc = f"Carcasa tipo pedestal ajustable (PA), tamaño {size}"
        uso = "Soporte tipo pedestal con ranura ajustable. Permite alineación del eje durante el montaje. Uso en transportadores y ejes de transmisión."
        precio = estimate_housing_price(size, brand, 'pa')
        img = "https://m.media-amazon.com/images/I/41vMX1WJ8TL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- F-xxx (4-bolt flange housing) ----
    if re.match(r'F\s*-\s*\d', item) and 'UCF' not in item and 'FL' not in item and 'FB' not in item and 'UCFO' not in item:
        size = extract_size(item)
        desc = f"Carcasa tipo brida cuadrada de 4 pernos (F), tamaño {size}"
        uso = "Soporte para montaje en superficies verticales con 4 pernos. Uso en transportadores, ventiladores y maquinaria industrial."
        precio = estimate_housing_price(size, brand, 'f')
        img = "https://m.media-amazon.com/images/I/41srZrLH7GL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- FL-xxx (2-bolt flange housing) ----
    if re.match(r'FL\s*-?\s*\d', item):
        size = extract_size(item)
        desc = f"Carcasa tipo brida ovalada de 2 pernos (FL), tamaño {size}"
        uso = "Soporte compacto para montaje en superficies con solo 2 pernos. Ideal para espacios reducidos en transportadores y guías de cadena."
        precio = estimate_housing_price(size, brand, 'fl')
        img = "https://m.media-amazon.com/images/I/31bv3WCLWSL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- FB-xxx (Flange bracket) ----
    if item.startswith('FB'):
        size = extract_size(item)
        desc = f"Soporte tipo brida con bracket (FB), tamaño {size}"
        uso = "Brida de montaje para rodamientos de inserto. Uso en transportadores de cadena, guías de eje y maquinaria alimentaria."
        precio = estimate_housing_price(size, brand, 'fb')
        img = "https://m.media-amazon.com/images/I/31bv3WCLWSL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- SB-xxx (Set screw bearing insert) ----
    if item.startswith('SB'):
        size = extract_size(item)
        desc = f"Inserto de rodamiento con tornillo de fijación (SB), tamaño {size}"
        uso = "Rodamiento de inserto esférico exterior para acoplar en chumaceras. Fijación por tornillo prisionero al eje."
        precio = estimate_insert_price(size, brand, False)
        img = "https://m.media-amazon.com/images/I/41QHQQ3b1EL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- PP-xxx (Pressed steel pillow block) ----
    if item.startswith('PP'):
        size = extract_size(item)
        desc = f"Chumacera de chapa estampada tipo pedestal (PP), tamaño {size}"
        uso = "Soporte económico de acero estampado para ejes livianos. Uso en transportadores de bajo costo, equipos agrícolas y aplicaciones no pesadas."
        precio = estimate_housing_price(size, brand, 'pp')
        img = "https://m.media-amazon.com/images/I/41vMX1WJ8TL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- TP-xxx (Thermoplastic housing) ----
    if item.startswith('TP'):
        size = extract_size(item)
        housing_type = ""
        if 'PA' in item:
            housing_type = "pedestal (pillow block)"
        elif 'FL' in item:
            housing_type = "brida ovalada de 2 pernos"
        elif 'P ' in item:
            housing_type = "pedestal"
        else:
            housing_type = "plástico termoplástico"
        desc = f"Chumacera de material termoplástico tipo {housing_type} (TP), tamaño {size}"
        uso = "Soporte plástico resistente a corrosión y químicos. Uso en industria alimentaria, farmacéutica, ambientes húmedos y aplicaciones donde se prohíbe el metal."
        precio = estimate_price_range(12000, 30000, brand)
        img = "https://m.media-amazon.com/images/I/41uo4DmOmkL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- BU-T / BUT (Take-up with bearing) ----
    if item.startswith('BU') or item.startswith('BUT'):
        size = extract_size(item)
        desc = f"Unidad tensor completa con rodamiento incluido (BU-T), tamaño {size}"
        uso = "Sistema completo de tensor con inserto de rodamiento para tensión de cintas transportadoras y cadenas. Montaje rápido."
        precio = estimate_mounted_price(size, brand, 'uct')
        img = "https://m.media-amazon.com/images/I/41OqVLmL3sL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- AEL (Eccentric locking insert) ----
    if item.startswith('AEL'):
        size = extract_size(item)
        desc = f"Inserto de rodamiento con collar de bloqueo excéntrico (AEL), tamaño {size}"
        uso = "Rodamiento de inserto con sistema de fijación por collar excéntrico. Diseñado para fácil montaje/desmontaje en chumaceras de transportadores."
        precio = estimate_insert_price(size, brand, False)
        img = "https://m.media-amazon.com/images/I/41QHQQ3b1EL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- AS (Anti-rotation insert) ----
    if item.startswith('AS -') or item.startswith('AS-'):
        size = extract_size(item)
        desc = f"Inserto de rodamiento anti-rotación (AS), tamaño {size}"
        uso = "Inserto con sistema anti-rotación del aro exterior. Uso en chumaceras de transportadores donde se requiere estabilidad del anillo exterior."
        precio = estimate_insert_price(size, brand, False)
        img = "https://m.media-amazon.com/images/I/41QHQQ3b1EL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- DEL (Bearing insert with lock) ----
    if item.startswith('DEL'):
        size = extract_size(item)
        desc = f"Inserto de rodamiento con bloqueo (DEL), tamaño {size}"
        uso = "Rodamiento de inserto con sistema de bloqueo especial para aplicaciones en transportadores y maquinaria industrial."
        precio = estimate_insert_price(size, brand, False)
        img = "https://m.media-amazon.com/images/I/41QHQQ3b1EL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- UC-TK (Special insert) ----
    if 'TK' in item:
        desc = "Inserto de rodamiento especial para tensor (UC-TK)"
        uso = "Inserto especial diseñado para unidades tensoras de cintas transportadoras. Incluye sistema de bloqueo al eje."
        precio = estimate_insert_price('204', brand, False)
        img = "https://m.media-amazon.com/images/I/41QHQQ3b1EL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- UCF3 (3-bolt flange unit) ----
    if item.startswith('UCF3'):
        size = extract_size(item)
        desc = f"Unidad de chumacera con brida triangular de 3 pernos (UCF3), tamaño {size}"
        uso = "Montaje versátil en superficies planas con 3 pernos en disposición triangular. Uso en transportadores y maquinaria industrial."
        precio = estimate_mounted_price(size, brand, 'ucf')
        img = "https://m.media-amazon.com/images/I/41srZrLH7GL._AC_.jpg"
        return desc, uso, precio, img
    
    # ---- Fallback ----
    desc = f"Componente industrial ({item})"
    uso = "Componente mecánico para maquinaria industrial. Consultar especificaciones del fabricante."
    precio = estimate_price_range(5000, 20000, brand)
    img = "https://m.media-amazon.com/images/I/41QHQQ3b1EL._AC_.jpg"
    return desc, uso, precio, img


def extract_size(item):
    """Extract the size number from the item code."""
    # Look for 3-digit number like 204, 205, 206, 208
    match = re.search(r'(\d{3})', item)
    if match:
        return match.group(1)
    match = re.search(r'(\d{2})', item)
    if match:
        return match.group(1)
    return "N/D"


def estimate_rod_price(series, brand, is_inox):
    """Estimate price in CLP for deep groove ball bearings."""
    # Base prices by series (approx Chilean market)
    base_prices = {
        '602': (2000, 5000),
        '6003': (2500, 6000),
        '6004': (3000, 7000),
        '6005': (3500, 8000),
        '6006': (4000, 9000),
        '6007': (5000, 10000),
        '6008': (5500, 12000),
        '6009': (6000, 13000),
        '6010': (7000, 15000),
        '6011': (8000, 18000),
        '6201': (2500, 6000),
        '6202': (2800, 6500),
        '6203': (3000, 7000),
        '6204': (3200, 7500),
        '6205': (3500, 8000),
        '6206': (4000, 9000),
        '6208': (6000, 14000),
        '6211': (10000, 22000),
        '6302': (3500, 8000),
        '6305': (5000, 11000),
        '6306': (5500, 12000),
        '6308': (8000, 18000),
        '61905': (4000, 10000),
        '6905': (4000, 10000),
        '6908': (6000, 14000),
    }
    
    # Find matching price
    low, high = 3000, 8000
    for key in base_prices:
        if series.startswith(key) or series == key:
            low, high = base_prices[key]
            break
    
    # Brand premium
    premium_brands = ['SKF', 'FAG', 'NSK', 'NTN', 'KOYO', 'TIMKEN']
    mid_brands = ['SNR', 'ZVL', 'ROLLWAY']
    
    brand_upper = brand.upper()
    if brand_upper in premium_brands:
        price = int((low + high) / 2 * 1.3)
    elif brand_upper in mid_brands:
        price = int((low + high) / 2)
    else:
        price = int((low + high) / 2 * 0.7)
    
    if is_inox:
        price = int(price * 1.8)
    
    return f"${price:,} CLP (aprox.)"


def estimate_price_range(low, high, brand):
    """Generic price estimator."""
    premium_brands = ['SKF', 'FAG', 'NSK', 'NTN', 'KOYO', 'TIMKEN']
    brand_upper = brand.upper()
    if brand_upper in premium_brands:
        price = int((low + high) / 2 * 1.3)
    else:
        price = int((low + high) / 2 * 0.85)
    return f"${price:,} CLP (aprox.)"


def estimate_mounted_price(size, brand, unit_type):
    """Estimate price for mounted bearing units."""
    base = {
        '204': (15000, 30000),
        '205': (16000, 35000),
        '206': (18000, 40000),
        '208': (25000, 55000),
        '209': (28000, 60000),
        '27': (35000, 70000),
    }
    low, high = base.get(size, (18000, 40000))
    return estimate_price_range(low, high, brand)


def estimate_insert_price(size, brand, is_inox):
    """Estimate price for bearing inserts."""
    base = {
        '203': (5000, 12000),
        '204': (6000, 14000),
        '205': (7000, 16000),
        '206': (8000, 18000),
        '208': (12000, 25000),
        '209': (14000, 28000),
    }
    low, high = base.get(size, (8000, 18000))
    price_str = estimate_price_range(low, high, brand)
    if is_inox:
        # Parse and multiply
        match = re.search(r'\$([0-9,]+)', price_str)
        if match:
            val = int(match.group(1).replace(',', ''))
            val = int(val * 1.6)
            return f"${val:,} CLP (aprox.)"
    return price_str


def estimate_housing_price(size, brand, housing_type):
    """Estimate price for bearing housings."""
    base = {
        '204': (5000, 12000),
        '205': (6000, 14000),
        '206': (7000, 16000),
        '208': (10000, 22000),
    }
    low, high = base.get(size, (6000, 15000))
    return estimate_price_range(low, high, brand)


def get_bearing_image_url(item_code, bearing_type, series):
    """Return a reference image URL for the bearing type."""
    # Generic reference images by type
    if bearing_type == 'deep_groove':
        return "https://m.media-amazon.com/images/I/51pVE0CDWSL._AC_SL1000_.jpg"
    return "https://m.media-amazon.com/images/I/41QHQQ3b1EL._AC_.jpg"


# ========================================
# PROCESS ALL ITEMS
# ========================================

print("Procesando 166 items...")
print("=" * 80)

results = []
for i, item in enumerate(data):
    item_code = item['item']
    brand = item['marca']
    
    desc, uso, valor, imagen = classify_item(item_code, brand)
    
    results.append({
        'fila': item['fila'],
        'item': item_code,
        'marca': brand,
        'descripcion': desc,
        'usos': uso,
        'valor': valor,
        'imagen': imagen
    })
    
    print(f"[{i+1}/166] Fila {item['fila']}: {item_code}")
    print(f"   Desc: {desc}")
    print(f"   Uso: {uso}")
    print(f"   Valor: {valor}")
    print()

# Save results
with open('.tmp/enriched_data.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"\n{'='*80}")
print(f"Procesados {len(results)} items. Guardados en .tmp/enriched_data.json")
