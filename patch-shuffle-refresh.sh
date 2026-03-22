#!/bin/bash
# patch-shuffle-refresh.sh
# Corre na raiz do projecto: bash patch-shuffle-refresh.sh

set -e
echo "=== A aplicar patch: shuffle + pull-to-refresh ==="

# ── 1. useBusinessFilters.js ─────────────────────────────────────────────────
python3 - "src/hooks/useBusinessFilters.js" << 'PY'
import sys
path = sys.argv[1]
with open(path) as f: src = f.read()

if 'shuffleSeed' in src:
    print("  [SKIP] useBusinessFilters -- ja tem shuffle")
    sys.exit(0)

# shuffleSeed state
src = src.replace(
    "  const [showSortModal, setShowSortModal]       = useState(false);\n  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);",
    "  const [showSortModal, setShowSortModal]       = useState(false);\n  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);\n  const [shuffleSeed, setShuffleSeed]           = useState(() => Math.random());"
)

# seededShuffle + refreshShuffle antes de toggleAmenity
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

# shuffle no fim do useMemo
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
    const hasFilters = searchWhat.trim() || activeFilter !== 'open' || activeCategoryId ||
      priceFilter !== 'all' || distanceFilter !== 'all' || selectedAmenities.length > 0 || sortBy !== 'recommended';
    return hasFilters ? sorted : seededShuffle(sorted, Math.floor(shuffleSeed * 2147483647));
  }, [
    businesses, searchWhat, activeFilter, sortBy, activeCategoryId,
    priceFilter, distanceFilter, selectedAmenities, includeClosed, isBusinessMode,
    shuffleSeed, seededShuffle,
  ]);"""

src = src.replace(old_end, new_end)

# refreshShuffle no return
src = src.replace(
    "    compareList,    toggleCompare,\n  };",
    "    compareList,    toggleCompare,\n    refreshShuffle,\n  };"
)

with open(path, 'w') as f: f.write(src)
print("  [OK] useBusinessFilters")
PY

# ── 2. HomeModule.js ─────────────────────────────────────────────────────────
python3 - "src/modules/Home/HomeModule.js" << 'PY'
import sys
path = sys.argv[1]
with open(path) as f: raw = f.read()

if 'RefreshControl' in raw:
    print("  [SKIP] HomeModule -- ja tem RefreshControl")
    sys.exit(0)

src = raw.replace('\r\n', '\n')

# import RefreshControl
src = src.replace(
    "  View, Text, TouchableOpacity, ScrollView,",
    "  View, Text, TouchableOpacity, ScrollView, RefreshControl,"
)

# props
src = src.replace(
    "  // Dados extra\n  bookmarkedIds = [],       onToggleBookmark = () => {},",
    "  // Dados extra\n  bookmarkedIds = [],       onToggleBookmark = () => {},\n  onRefresh = null,\n  refreshing = false,"
)

# ScrollView com RefreshControl
src = src.replace(
    "    <ScrollView\n      style={hS.scroll}\n      contentContainerStyle={hS.scrollContent}\n      showsVerticalScrollIndicator={false}\n    >",
    "    <ScrollView\n      style={hS.scroll}\n      contentContainerStyle={hS.scrollContent}\n      showsVerticalScrollIndicator={false}\n      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.red} colors={[COLORS.red]} /> : undefined}\n    >"
)

with open(path, 'w') as f: f.write(src)
print("  [OK] HomeModule")
PY

# ── 3. AchAqui_Main.jsx ──────────────────────────────────────────────────────
python3 - "src/AchAqui_Main.jsx" << 'PY'
import sys
path = sys.argv[1]
with open(path) as f: src = f.read()

if 'handleHomeRefresh' in src:
    print("  [SKIP] AchAqui_Main -- ja tem handleHomeRefresh")
    sys.exit(0)

# estado
src = src.replace(
    "  const filters = useBusinessFilters(businesses, isBusinessMode);",
    "  const filters = useBusinessFilters(businesses, isBusinessMode);\n  const [homeRefreshing, setHomeRefreshing] = React.useState(false);"
)

# função handleHomeRefresh
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

# passar ao HomeModuleFull
src = src.replace(
    "              onOpenAuth={handleOpenAuth}\n              onLogout={handleLogout}\n            />",
    "              onOpenAuth={handleOpenAuth}\n              onLogout={handleLogout}\n              onRefresh={handleHomeRefresh}\n              refreshing={homeRefreshing}\n            />"
)

with open(path, 'w') as f: f.write(src)
print("  [OK] AchAqui_Main")
PY

# ── 4. business.service.ts -- findAll com limit ──────────────────────────────
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
    print("  [OK] business.service -- findAll com limit=60")
else:
    print("  [ERRO] findAll nao encontrado")
PY

echo ""
echo "=== Resultado ==="
grep -c "shuffleSeed" src/hooks/useBusinessFilters.js > /dev/null && echo "  ✅ useBusinessFilters" || echo "  ❌ useBusinessFilters"
grep -c "RefreshControl" src/modules/Home/HomeModule.js > /dev/null && echo "  ✅ HomeModule" || echo "  ❌ HomeModule"
grep -c "handleHomeRefresh" src/AchAqui_Main.jsx > /dev/null && echo "  ✅ AchAqui_Main" || echo "  ❌ AchAqui_Main"
grep -c "limit = 60" backend/src/business/business.service.ts > /dev/null && echo "  ✅ business.service" || echo "  ❌ business.service"

echo ""
echo "Reinicia o backend: cd backend && npm run start:dev"
