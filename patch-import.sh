#!/bin/bash
# patch-import.sh
# Corre no terminal do Codespace na raiz do projecto:
#   bash patch-import.sh

set -e
echo "=== A aplicar patch de importação Outscraper ==="

# ── 1. admin.controller.ts ──────────────────────────────────────────────────
CTRL="backend/src/admin/admin.controller.ts"
if grep -q "importFromOutscraper" "$CTRL"; then
  echo "  [SKIP] controller -- ja tem a rota"
else
  python3 - "$CTRL" << 'PY'
import sys
path = sys.argv[1]
with open(path) as f: src = f.read()
old = "  @Post('import/google-places')\n  importFromGooglePlaces(@Body() body: { query: string; location: string }) {\n    const apiKey = this.configService.get<string>('GOOGLE_PLACES_API_KEY');\n    return this.adminService.importFromGooglePlaces(body.query, body.location, apiKey);\n  }"
new = old + "\n\n  @Post('import/outscraper')\n  importFromOutscraper(\n    @Body() body: { query: string; limit?: number; coordinates?: string; language?: string; region?: string },\n  ) {\n    const apiKey = this.configService.get<string>('OUTSCRAPER_API_KEY');\n    if (!apiKey) throw new Error('OUTSCRAPER_API_KEY nao configurada no .env do backend.');\n    return this.adminService.importFromOutscraper(body.query, body.limit ?? 100, apiKey, body.coordinates, body.language ?? 'pt', body.region ?? 'ao');\n  }"
if old in src:
    with open(path, 'w') as f: f.write(src.replace(old, new))
    print("  [OK] controller")
else:
    print("  [ERRO] ancora nao encontrada no controller")
PY
fi

# ── 2. admin.service.ts ─────────────────────────────────────────────────────
SVC="backend/src/admin/admin.service.ts"
if grep -q "importFromOutscraper" "$SVC"; then
  echo "  [SKIP] service -- ja tem o metodo"
else
  python3 - "$SVC" << 'PY'
import sys
path = sys.argv[1]
with open(path) as f: src = f.read()

# import
src = src.replace(
    "import { PrismaService } from '../prisma/prisma.service';",
    "import { PrismaService } from '../prisma/prisma.service';\nimport { ImportService } from '../import/import.service';"
)

# constructor
src = src.replace(
    "constructor(private readonly prisma: PrismaService) {}",
    "constructor(\n    private readonly prisma: PrismaService,\n    private readonly importService: ImportService,\n  ) {}"
)

# metodo -- inserir antes de importFromGooglePlaces
new_method = """
  async importFromOutscraper(query: string, limit: number, apiKey: string, coordinates?: string, language = 'pt', region = 'ao') {
    const params = new URLSearchParams({ query, limit: String(Math.min(limit, 500)), language, region, ...(coordinates ? { coordinates } : {}), fields: 'query,name,place_id,google_id,full_address,street,city,borough,postal_code,country,country_code,latitude,longitude,phone,site,email,rating,reviews,photo,logo,working_hours,working_hours_old_format,description,about,business_status,category,subtypes,type,located_in,verified' });
    const response = await fetch(`https://api.outscraper.cloud/google-maps-search?${params}`, { headers: { 'X-API-KEY': apiKey } });
    if (!response.ok) { const body = await response.text().catch(() => ''); throw new BadRequestException(`Outscraper API erro ${response.status}: ${body.slice(0, 200)}`); }
    const json = await response.json();
    if (json.status !== 'Success' && json.status !== 'Pending') throw new BadRequestException(`Outscraper: status "${json.status}"`);
    return this.importService.importRows((json.data ?? []).flat());
  }

  async importFromGooglePlaces"""

src = src.replace("  async importFromGooglePlaces", new_method)
with open(path, 'w') as f: f.write(src)
print("  [OK] service")
PY
fi

# ── 3. ImportModal.jsx ──────────────────────────────────────────────────────
MODAL="src/modules/Admin/ImportModal.jsx"
if grep -q "STEPS.API" "$MODAL"; then
  echo "  [SKIP] ImportModal -- ja tem modo API"
else
  python3 - "$MODAL" << 'PY'
import sys
path = sys.argv[1]
with open(path) as f: src = f.read()

src = src.replace(
    "const STEPS = { CHOOSE: 'CHOOSE', PASTE: 'PASTE', PREVIEW: 'PREVIEW', LOADING: 'LOADING', RESULT: 'RESULT' };",
    "const STEPS = { CHOOSE: 'CHOOSE', PASTE: 'PASTE', PREVIEW: 'PREVIEW', LOADING: 'LOADING', RESULT: 'RESULT', API: 'API' };"
)
src = src.replace(
    "  const [error, setError] = useState('');",
    "  const [error, setError] = useState('');\n  const [apiQuery, setApiQuery] = useState('');\n  const [apiLimit, setApiLimit] = useState('100');\n  const [apiLoading, setApiLoading] = useState(false);"
)
src = src.replace(
    "  function reset() { setStep(STEPS.CHOOSE); setFormat(null); setContent(''); setPreview([]); setResult(null); setError(''); }",
    "  function reset() { setStep(STEPS.CHOOSE); setFormat(null); setContent(''); setPreview([]); setResult(null); setError(''); setApiQuery(''); setApiLimit('100'); }"
)
src = src.replace(
    "  async function handleImport() {",
    """  async function handleApiImport() {
    if (!apiQuery.trim()) return;
    setApiLoading(true); setError('');
    try {
      const data = await apiRequest('/admin/import/outscraper', { method: 'POST', body: { query: apiQuery.trim(), limit: parseInt(apiLimit,10)||100, coordinates: '-8.8368,13.2343', language: 'pt', region: 'ao' }, accessToken });
      setResult(data); setStep(STEPS.RESULT);
    } catch (err) { setError(err?.message || 'Erro. Verifica OUTSCRAPER_API_KEY no servidor.'); }
    finally { setApiLoading(false); }
  }

  async function handleImport() {"""
)
old_json_card = """            <TouchableOpacity style={s.formatCard} activeOpacity={0.7} onPress={() => { setFormat('json'); setStep(STEPS.PASTE); }}>
              <Text style={s.formatIcon}>{'{ }'}</Text>
              <View style={{ flex: 1 }}><Text style={s.formatTitle}>JSON</Text><Text style={s.formatSub}>Exporta do Outscraper como JSON e cola o conteúdo</Text></View>
              <Icon name="arrowRight" size={18} color={COLORS.red} strokeWidth={2} />
            </TouchableOpacity>"""
src = src.replace(old_json_card, old_json_card + """
            <TouchableOpacity style={[s.formatCard, { borderWidth: 2, borderColor: '#1565C0' }]} activeOpacity={0.7} onPress={() => setStep(STEPS.API)}>
              <Text style={s.formatIcon}>\U0001f50c</Text>
              <View style={{ flex: 1 }}><Text style={s.formatTitle}>API Directa</Text><Text style={s.formatSub}>Importa directamente do Google Maps sem exportar ficheiros</Text></View>
              <Icon name="arrowRight" size={18} color='#1565C0' strokeWidth={2} />
            </TouchableOpacity>""")
src = src.replace("else if (step === STEPS.PASTE) setStep(STEPS.CHOOSE);", "else if (step === STEPS.PASTE || step === STEPS.API) setStep(STEPS.CHOOSE);")
src = src.replace("{step === STEPS.LOADING && 'A importar...'}", "{step === STEPS.API && 'API Directa'}{step === STEPS.LOADING && 'A importar...'}")
api_step = """{step === STEPS.API && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Importar via API</Text>
            <Text style={s.sectionSub}>Pesquisa no Google Maps e importa directamente. Coordenadas centradas em Luanda.</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.darkText, marginBottom: 8 }}>Categorias rapidas:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {['hoteis Luanda','restaurantes Luanda','saloes beleza Luanda','clinicas Luanda','ginasios Luanda','farmacias Luanda','barbearias Luanda','cafes Luanda','supermercados Luanda','escolas Luanda'].map(q => (
                <TouchableOpacity key={q} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: apiQuery === q + ' Angola' ? '#1565C0' : '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' }} onPress={() => setApiQuery(q + ' Angola')}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: apiQuery === q + ' Angola' ? '#fff' : '#1565C0' }}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.grayText, marginBottom: 6 }}>Pesquisa personalizada:</Text>
            <TextInput style={[s.pasteArea, { minHeight: 50, paddingVertical: 12 }]} placeholder="ex: pousadas Viana Angola" placeholderTextColor={COLORS.grayText} value={apiQuery} onChangeText={setApiQuery} autoCapitalize="none" autoCorrect={false} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.grayText, marginBottom: 6 }}>Limite:</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {['20','50','100','200','500'].map(n => (
                <TouchableOpacity key={n} style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: apiLimit === n ? '#1565C0' : '#F7F7F8', borderWidth: 1, borderColor: apiLimit === n ? '#1565C0' : '#E5E7EB' }} onPress={() => setApiLimit(n)}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: apiLimit === n ? '#fff' : COLORS.darkText }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {error ? <Text style={s.errorText}>{error}</Text> : null}
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: '#1565C0' }, (!apiQuery.trim() || apiLoading) && s.primaryBtnDisabled]} onPress={handleApiImport} disabled={!apiQuery.trim() || apiLoading} activeOpacity={0.8}>
              {apiLoading ? <ActivityIndicator size="small" color="#fff" /> : <><Icon name="upload" size={16} color="#fff" strokeWidth={2} /><Text style={s.primaryBtnText}>Importar agora</Text></>}
            </TouchableOpacity>
            <View style={[s.infoBox, { marginTop: 14 }]}><Text style={s.infoBoxText}>Pode demorar 5-15 segundos. Usa limites menores para testar.</Text></View>
          </View>
        )}
        """
src = src.replace("        {step === STEPS.LOADING && (", api_step + "{step === STEPS.LOADING && (")
with open(path, 'w') as f: f.write(src)
print("  [OK] ImportModal")
PY
fi

echo ""
echo "=== Resultado ==="
grep -c "importFromOutscraper" backend/src/admin/admin.controller.ts > /dev/null && echo "  ✅ controller" || echo "  ❌ controller"
grep -c "importFromOutscraper" backend/src/admin/admin.service.ts > /dev/null && echo "  ✅ service" || echo "  ❌ service"
grep -c "STEPS.API" src/modules/Admin/ImportModal.jsx > /dev/null && echo "  ✅ ImportModal" || echo "  ❌ ImportModal"

echo ""
echo "=== Reinicia o backend ==="
echo "  cd backend && npm run start:dev"
