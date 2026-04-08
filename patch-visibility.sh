#!/bin/bash
# patch-visibility.sh — corrige negócios não visíveis no home
# Corre na raiz do projecto: bash patch-visibility.sh

set -e
echo "=== A corrigir visibilidade de negócios ==="

# ── 1. AchAqui_Main.jsx — isOpen e isPublic por defeito ─────────────────────
python3 - "src/AchAqui_Main.jsx" << 'PY'
import sys
path = sys.argv[1]
with open(path) as f: src = f.read()
changed = False

# Fix isPublic e isOpen garantidos no normalizeBusiness
old = "    isVerified: true,"
new = "    isVerified: true,\n    isPublic: true,\n    isOpen: rawBusiness.isOpen ?? base.isOpen ?? true,"
if old in src and 'isPublic: true,' not in src[src.find('function normalizeBusiness'):src.find('function normalizeBusiness')+3000]:
    src = src.replace(old, new, 1)  # só a primeira ocorrência (dentro de normalizeBusiness)
    changed = True
    print("  [OK] isPublic e isOpen garantidos")
else:
    print("  [SKIP] ja aplicado ou nao encontrado")

# Fix description + address (se ainda não aplicado)
old_addr = "    address: base.address || meta.address || rawBusiness.description || 'Endereço não informado',"
new_addr  = "    description: typeof rawBusiness.description === 'string' ? rawBusiness.description : (rawBusiness.metadata?.about || rawBusiness.metadata?.description || ''),\n    address: base.address || rawBusiness.metadata?.address || rawBusiness.metadata?.full_address || rawBusiness.metadata?.street || meta.address || 'Endereço não informado',"
if old_addr in src:
    src = src.replace(old_addr, new_addr)
    changed = True
    print("  [OK] description e address corrigidos")
else:
    print("  [SKIP] description/address ja aplicado")

if changed:
    with open(path, 'w') as f: f.write(src)
PY

# ── 2. useBusinessFilters.js — activeFilter default 'all' em vez de 'open' ──
python3 - "src/hooks/useBusinessFilters.js" << 'PY'
import sys
path = sys.argv[1]
with open(path) as f: raw = f.read()
src = raw.replace('\r\n', '\n')

old = "  const [activeFilter, setActiveFilter]         = useState('open');"
new  = "  const [activeFilter, setActiveFilter]         = useState('all');"
if old in src:
    src = src.replace(old, new)
    with open(path, 'w') as f: f.write(src)
    print("  [OK] activeFilter default 'all' -- todos os negocios visiveis")
else:
    print("  [SKIP] ja aplicado")
PY

echo ""
echo "=== Resultado ==="
grep -c "isPublic: true" src/AchAqui_Main.jsx > /dev/null && echo "  ✅ isPublic garantido" || echo "  ❌ isPublic"
grep -c "isOpen.*base.isOpen" src/AchAqui_Main.jsx > /dev/null && echo "  ✅ isOpen garantido" || echo "  ❌ isOpen"
grep -c "useState\('all'\)" src/hooks/useBusinessFilters.js > /dev/null && echo "  ✅ activeFilter = all" || echo "  ❌ activeFilter"
