#!/bin/bash
# patch-all.sh — aplica TODOS os fixes pendentes
# Corre na raiz do projecto: bash patch-all.sh

set -e
echo "=== A aplicar todos os fixes ==="

# ── 1. AchAqui_Main.jsx — description + address + handleHomeRefresh ──────────
python3 - "src/AchAqui_Main.jsx" << 'PY'
import sys
path = sys.argv[1]
with open(path) as f: src = f.read()
changed = False

# Fix description + address
old = "    address: base.address || meta.address || rawBusiness.description || 'Endereço não informado',"
new = "    description: typeof rawBusiness.description === 'string' ? rawBusiness.description : (typeof (rawBusiness.metadata||{}).description === 'string' ? rawBusiness.metadata.description : (rawBusiness.metadata?.about || '')),\n    address: base.address || rawBusiness.metadata?.address || rawBusiness.metadata?.full_address || rawBusiness.metadata?.street || 'Endereço não informado',"
if old in src:
    src = src.replace(old, new); changed = True
    print("  [OK] description mapeado, address usa full_address")
else:
    print("  [SKIP] description/address ja aplicado")

# handleHomeRefresh + homeRefreshing
if 'handleHomeRefresh' not in src:
    src = src.replace(
        "  const filters = useBusinessFilters(businesses, isBusinessMode);",
        "  const filters = useBusinessFilters(businesses, isBusinessMode);\n  const [homeRefreshing, setHomeRefreshing] = React.useState(false);"
    )
    src = src.replace(
        "  // ── Dados globais ──────────────────────────────────────────────────────────",
        """  const handleHomeRefresh = React.useCallback(async () => {
    setHomeRefreshing(true);
    try {
      const response = await backendApi.getBusinesses();
      const fromApi = (Array.isArray(response) ? response : []).map(normalizeBusiness).filter(Boolean);
      const apiIds = new Set(fromApi.map(b => b.id));
      setBusinesses([...fromApi, ...MOCK_BUSINESSES_INITIAL.filter(b => !apiIds.has(b.id))]);
      filters.refreshShuffle?.();
    } catch {}
    finally { setHomeRefreshing(false); }
  }, [filters]);

  // ── Dados globais ──────────────────────────────────────────────────────────"""
    )
    src = src.replace(
        "              onOpenAuth={handleOpenAuth}\n              onLogout={handleLogout}\n            />",
        "              onOpenAuth={handleOpenAuth}\n              onLogout={handleLogout}\n              onRefresh={handleHomeRefresh}\n              refreshing={homeRefreshing}\n            />"
    )
    changed = True
    print("  [OK] handleHomeRefresh adicionado")
else:
    print("  [SKIP] handleHomeRefresh ja existe")

if changed:
    with open(path, 'w') as f: f.write(src)
PY

# ── 2. BusinessDetailModal.js — Direções reais + mapa ───────────────────────
python3 - "src/modules/Detail/BusinessDetailModal.js" << 'PY'
import sys
path = sys.argv[1]
with open(path) as f: src = f.read()
changed = False

# Fix Direções
old_dir = "              <TouchableOpacity style={s.directionsBtn} onPress={() => Alert.alert('Direções', 'Em breve...')}>\n                <Text style={s.directionsBtnText}>Direcoes →</Text>\n              </TouchableOpacity>"
new_dir = """              <TouchableOpacity style={s.directionsBtn} onPress={() => {
                const lat = business.latitude || -8.8368;
                const lng = business.longitude || 13.2343;
                Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`).catch(() =>
                  Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`)
                );
              }}>
                <Text style={s.directionsBtnText}>Direções →</Text>
              </TouchableOpacity>"""
if old_dir in src:
    src = src.replace(old_dir, new_dir); changed = True
    print("  [OK] Direções abre Google Maps")
else:
    print("  [SKIP] Direções ja aplicado")

# Fix mapa placeholder → pin clicável
old_map = """          {/* Mapa placeholder */}
          {business.address && (
            <View style={s.mapPlaceholder}>
              <Text style={s.mapPlaceholderText}>Mini mapa</Text>
            </View>
          )}"""
new_map = """          {/* Mini mapa clicável */}
          {(business.latitude || business.longitude) && (() => {
            const lat = business.latitude || -8.8368;
            const lng = business.longitude || 13.2343;
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                style={[s.mapPlaceholder, { overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F0FE' }]}
                onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`).catch(() => {})}
              >
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.25 }}>
                  {[0,1,2,3].map(i => <View key={'h'+i} style={{ position: 'absolute', left: 0, right: 0, top: `${i*33}%`, height: 1, backgroundColor: '#6B7280' }} />)}
                  {[0,1,2,3].map(i => <View key={'v'+i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${i*33}%`, width: 1, backgroundColor: '#6B7280' }} />)}
                </View>
                <Icon name="mapPin" size={32} color={COLORS.red} strokeWidth={2} />
                <Text style={{ fontSize: 11, color: '#1F2937', fontWeight: '600', marginTop: 6, textAlign: 'center', paddingHorizontal: 12 }} numberOfLines={2}>
                  {business.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
                </Text>
                <Text style={{ fontSize: 11, color: '#1565C0', marginTop: 4, fontWeight: '600' }}>Toca para abrir no Google Maps ↗</Text>
              </TouchableOpacity>
            );
          })()}"""
if old_map in src:
    src = src.replace(old_map, new_map); changed = True
    print("  [OK] Mini mapa clicável")
else:
    print("  [SKIP] mapa ja aplicado")

if changed:
    with open(path, 'w') as f: f.write(src)
PY

# ── 3. useBusinessFilters.js — shuffle + refreshShuffle ─────────────────────
python3 - "src/hooks/useBusinessFilters.js" << 'PY'
import sys
path = sys.argv[1]
with open(path) as f: raw = f.read()
src = raw.replace('\r\n', '\n')

if 'shuffleSeed' in src:
    print("  [SKIP] useBusinessFilters -- ja tem shuffle")
    sys.exit(0)

src = src.replace(
    "  const [showSortModal, setShowSortModal]       = useState(false);\n  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);",
    "  const [showSortModal, setShowSortModal]       = useState(false);\n  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);\n  const [shuffleSeed, setShuffleSeed]           = useState(() => Math.random());"
)
src = src.replace(
    "  const toggleAmenity = useCallback((id) => {",
    """  const seededShuffle = useCallback((arr, seed) => {
    const a = [...arr]; let s = seed;
    for (let i = a.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      const j = Math.abs(s) % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);
  const refreshShuffle = useCallback(() => setShuffleSeed(Math.random()), []);

  const toggleAmenity = useCallback((id) => {"""
)
old_end = """      .sort((a, b2) => {
        // Premium sobe sempre
        if (b2.isPremium !== a.isPremium) return b2.isPremium ? 1 : -1;
        switch (sortBy) {
          case 'rating':   return b2.rating - a.rating;
          case 'distance': return (a.distance || 99) - (b2.distance || 99);
          case 'reviews':  return (b2.reviews || 0) - (a.reviews || 0);
          default:         return 0;
        }
      });
  }, [
    businesses, searchWhat, activeFilter, sortBy, activeCategoryId,
    priceFilter, distanceFilter, selectedAmenities, includeClosed, isBusinessMode,
  ]);"""
new_end = """      .sort((a, b2) => {
        // Premium sobe sempre
        if (b2.isPremium !== a.isPremium) return b2.isPremium ? 1 : -1;
        switch (sortBy) {
          case 'rating':   return b2.rating - a.rating;
          case 'distance': return (a.distance || 99) - (b2.distance || 99);
          case 'reviews':  return (b2.reviews || 0) - (a.reviews || 0);
          default:         return 0;
        }
      });
    const hasFilters = !!(searchWhat.trim() || activeFilter !== 'open' || activeCategoryId ||
      priceFilter !== 'all' || distanceFilter !== 'all' || selectedAmenities.length > 0 || sortBy !== 'recommended');
    return hasFilters ? sorted : seededShuffle(sorted, Math.floor(shuffleSeed * 2147483647));
  }, [
    businesses, searchWhat, activeFilter, sortBy, activeCategoryId,
    priceFilter, distanceFilter, selectedAmenities, includeClosed, isBusinessMode,
    shuffleSeed, seededShuffle,
  ]);"""
src = src.replace(old_end, new_end)
src = src.replace(
    "    compareList,    toggleCompare,\n  };",
    "    compareList,    toggleCompare,\n    refreshShuffle,\n  };"
)
with open(path, 'w') as f: f.write(src)
print("  [OK] useBusinessFilters -- shuffle + refreshShuffle")
PY

# ── 4. HomeModule.js — RefreshControl ───────────────────────────────────────
python3 - "src/modules/Home/HomeModule.js" << 'PY'
import sys
path = sys.argv[1]
with open(path) as f: raw = f.read()
src = raw.replace('\r\n', '\n')

if 'RefreshControl' in src:
    print("  [SKIP] HomeModule -- ja tem RefreshControl")
    sys.exit(0)

src = src.replace(
    "  View, Text, TouchableOpacity, ScrollView,",
    "  View, Text, TouchableOpacity, ScrollView, RefreshControl,"
)
src = src.replace(
    "  // Dados extra\n  bookmarkedIds = [],       onToggleBookmark = () => {},",
    "  // Dados extra\n  bookmarkedIds = [],       onToggleBookmark = () => {},\n  onRefresh = null,\n  refreshing = false,"
)
src = src.replace(
    "    <ScrollView\n      style={hS.scroll}\n      contentContainerStyle={hS.scrollContent}\n      showsVerticalScrollIndicator={false}\n    >",
    "    <ScrollView\n      style={hS.scroll}\n      contentContainerStyle={hS.scrollContent}\n      showsVerticalScrollIndicator={false}\n      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.red} colors={[COLORS.red]} /> : undefined}\n    >"
)
with open(path, 'w') as f: f.write(src)
print("  [OK] HomeModule -- RefreshControl")
PY

# ── 5. business.service.ts — findAll com limit ───────────────────────────────
python3 - "backend/src/business/business.service.ts" << 'PY'
import sys
path = sys.argv[1]
with open(path) as f: src = f.read()

if 'limit = 60' in src:
    print("  [SKIP] business.service -- ja tem limit")
    sys.exit(0)

old = """  findAll() {
    return this.prisma.business.findMany({
      where: { isActive: true },
      include: {
        owner: {
          select: { id: true, name: true },
        },
        htRoomTypes: {
          where: { rooms: { some: {} } },
          select: {
            id: true, name: true, description: true,
            pricePerNight: true, maxGuests: true,
            totalRooms: true, available: true,
            amenities: true, photos: true,
            _count: { select: { rooms: true } },
          },
        },
      },
    });
  }"""
new = """  findAll(limit = 60) {
    return this.prisma.business.findMany({
      where:   { isActive: true },
      take:    limit,
      orderBy: { id: 'asc' },
      select: {
        id: true, name: true, category: true, description: true,
        latitude: true, longitude: true, municipality: true,
        isActive: true, isClaimed: true, googlePlaceId: true,
        metadata: true,
        owner:       { select: { id: true, name: true } },
        htRoomTypes: {
          where:  { rooms: { some: {} } },
          select: {
            id: true, name: true, pricePerNight: true,
            maxGuests: true, amenities: true, photos: true,
            _count: { select: { rooms: true } },
          },
        },
      },
    });
  }"""
if old in src:
    src = src.replace(old, new)
    with open(path, 'w') as f: f.write(src)
    print("  [OK] business.service -- findAll limit=60")
else:
    print("  [ERRO] findAll nao encontrado em business.service.ts")
PY

echo ""
echo "=== Resultado ==="
grep -c "description.*typeof.*rawBusiness" src/AchAqui_Main.jsx > /dev/null && echo "  ✅ description/address" || echo "  ❌ description/address"
grep -c "google.com/maps/dir" src/modules/Detail/BusinessDetailModal.js > /dev/null && echo "  ✅ Direções" || echo "  ❌ Direções"
grep -c "Toca para abrir" src/modules/Detail/BusinessDetailModal.js > /dev/null && echo "  ✅ Mapa" || echo "  ❌ Mapa"
grep -c "shuffleSeed" src/hooks/useBusinessFilters.js > /dev/null && echo "  ✅ Shuffle" || echo "  ❌ Shuffle"
grep -c "RefreshControl" src/modules/Home/HomeModule.js > /dev/null && echo "  ✅ RefreshControl" || echo "  ❌ RefreshControl"
grep -c "handleHomeRefresh" src/AchAqui_Main.jsx > /dev/null && echo "  ✅ handleHomeRefresh" || echo "  ❌ handleHomeRefresh"
grep -c "limit = 60" backend/src/business/business.service.ts > /dev/null && echo "  ✅ findAll limit" || echo "  ❌ findAll limit"

echo ""
echo "Reinicia o backend: cd backend && npm run start:dev"
