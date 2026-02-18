import json

with open('.tmp/excel_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total items: {len(data)}")
print("=" * 100)

for d in data:
    print(f"Fila {d['fila']:3d}: ITEM=[{d['item']:40s}] | MARCA=[{d['marca']:10s}]")
