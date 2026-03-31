/**
 * ============================================================================
 * HOMEMODULE  (v2.11.0 — Fase 3.5: limpeza de estilos e props do hook)
 * ============================================================================
 * Responsável pela Home do cliente: header de pesquisa, chips de categoria,
 * carousel de patrocinados, filtros e lista de negócios.
 *
 * Props obrigatórias:
 *   businesses        — array de negócios JÁ filtrados (vem de useBusinessFilters)
 *   featuredBusinesses— array base para o carrossel "Em Destaque" (sem filtro de categoria)
 *   onSelectBusiness  — callback ao premir um negócio (handleBusinessPress)
 *
 * Props do hook useBusinessFilters (spread ou individuais):
 *   searchWhat / setSearchWhat     — texto "O QUE"
 *   searchWhere / setSearchWhere   — texto "ONDE"
 *   showAutocomplete / setShowAutocomplete
 *   autocompleteSuggestions        — sugestões filtradas
 *   recentSearches / saveRecentSearch / clearRecentSearches
 *   activeCategoryId / setActiveCategoryId
 *   activeFilter / setActiveFilter
 *   sortBy / currentSortLabel
 *   priceFilter / setActivePriceFilter  (renomeado para evitar conflito)
 *   distanceFilter
 *   selectedAmenities / toggleAmenity
 *   hasActiveFilters / activeFiltersCount
 *   onOpenSortModal    — fn()
 *   onOpenFilters      — fn() → abre AdvancedFiltersModal
 *   compareList / toggleCompare
 *
 * Props de sistema:
 *   bookmarkedIds / onToggleBookmark
 *   notifications      — para badge de notificações
 *   onOpenAppLayer     — fn(layerName) — para notifications / allCategories
 *   onToggleOwnerMode  — fn() — botão da mala/utilizador no header
 *   isBusinessMode     — bool (para ícone do header)
 *   locationPermission / onRequestLocation
 *   insets             — SafeAreaInsets
 *
 * Estilos: importados de Main.styles.js (hS, acS, fbS, spS)
 * Constantes e helpers: importados de AchAqui_Core
 * ============================================================================
 */

import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, FlatList,
  Image, ImageBackground, TextInput,
  StyleSheet, Dimensions, Keyboard, Alert, Animated,
  ActivityIndicator,
} from 'react-native';

import {
  Icon, COLORS,
  CATEGORIES, ALL_CAT_IDS, ALL_CAT_LABEL,
  SORT_OPTIONS, PRICE_FILTERS, DISTANCE_FILTERS,
  AMENITY_ICON_MAP, AMENITY_FILTERS,
  TRENDING_SEARCHES, AUTOCOMPLETE_SUGGESTIONS,
  renderStars, renderHeroStars, getBusinessStatus,
  OWNER_BUSINESS,
} from '../../core/AchAqui_Core';

import { hS, acS, fbS, spS, profS, bizS } from '../../styles/Main.styles';
import { backendApi } from '../../lib/backendApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FEED_SLOT_LABEL = {
  SPONSORED_1: 'Patrocinado',
  SPONSORED_2: 'Patrocinado',
  NOVELTY_10KM: 'Novidade',
  NOVELTY_FALLBACK: 'Novidade',
  EXPLORE_FAR_HIGH_RATING: 'Explorar',
  LOCAL_EXPLORATION: 'Local',
  UTILITY_NEARBY: 'Perto de Ti',
};

function getDistanceBadge(km) {
  if (!Number.isFinite(km)) return null;
  if (km < 0.5) return { label: 'A 5 min a pé', color: '#16a34a' };
  if (km < 2) return { label: 'Perto de Ti', color: '#2563eb' };
  if (km < 5) return { label: 'A poucos minutos', color: '#d97706' };
  if (km < 10) return { label: 'Próximo', color: '#ea580c' };
  return { label: 'Noutra zona', color: '#6b7280' };
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME SKELETON — shimmer pulsante enquanto os dados carregam
// ─────────────────────────────────────────────────────────────────────────────
const skS = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F7F7F8' },
  rect:        { borderRadius: 10, backgroundColor: '#E1E9EE' },
  banner:      { marginHorizontal: 16, marginVertical: 10, borderRadius: 16, backgroundColor: '#E1E9EE', height: 180 },
  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 12, gap: 12, borderWidth: 1, borderColor: '#EBEBEB' },
  cardImg:     { borderRadius: 10, backgroundColor: '#E1E9EE' },
  cardLines:   { flex: 1, gap: 8 },
});

function HomeSkeleton({ insets = { top: 0 } }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
  const S = (style) => <Animated.View style={[style, { opacity }]} />;

  return (
    <View style={[skS.container, { paddingTop: insets.top }]}>
      {/* Featured banner */}
      {S(skS.banner)}
      {/* Business cards */}
      {[1, 2, 3, 4].map((_, i) => (
        <Animated.View key={i} style={[skS.card, { opacity }]}>
          <View style={[skS.cardImg, { width: 72, height: 72 }]} />
          <View style={skS.cardLines}>
            <View style={[skS.rect, { height: 14, width: '75%' }]} />
            <View style={[skS.rect, { height: 12, width: '50%' }]} />
            <View style={[skS.rect, { height: 11, width: '35%' }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPONSORED CARD — memoizado
// ─────────────────────────────────────────────────────────────────────────────
const SponsoredCard = React.memo(function SponsoredCard({ business, onPress }) {
  const heroUri = business.photos?.[0] ?? 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800';
  return (
    <TouchableOpacity style={spS.card} onPress={onPress} activeOpacity={0.9}>
      <ImageBackground source={{ uri: heroUri }} style={spS.image} imageStyle={spS.imageFill}>
        <View style={spS.scrim} />
        <View style={spS.topRow}>
          <View style={spS.sponsoredPill}><Text style={spS.sponsoredPillText}>Patrocinado</Text></View>
          {business.isPremium && <View style={spS.premiumPill}><Text style={spS.premiumPillText}>👑 Premium</Text></View>}
        </View>
        <View style={spS.infoStrip}>
          <View style={spS.nameRow}>
            <Text style={spS.name} numberOfLines={1}>{business.name}</Text>
            {business.isVerified && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.blue, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 6, gap: 3 }}>
                <Icon name="check" size={11} color={COLORS.white} strokeWidth={3} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.white, letterSpacing: 0.5 }}>VERIFICADO</Text>
              </View>
            )}
          </View>
          <Text style={spS.category} numberOfLines={1}>{business.subcategory}</Text>
          <View style={spS.metaRow}>
            {renderHeroStars(business.rating)}
            <Text style={spS.ratingTxt}>{business.rating}</Text>
            <Text style={spS.reviewsTxt}>({business.reviews})</Text>
            <View style={spS.dot} />
            <Text style={[spS.statusDot, business.isOpen ? spS.dotOpen : spS.dotClosed]}>●</Text>
            <Text style={[spS.statusTxt, business.isOpen ? spS.statusOpen : spS.statusClosed]}>
              {business.isOpen ? 'Aberto agora' : 'Fechado'}
            </Text>
          </View>
          {!!business.promo && (
            <View style={spS.promoBanner}>
              <Text style={spS.promoIcon}>🏷️</Text>
              <Text style={spS.promoTxt} numberOfLines={1}>{business.promo}</Text>
            </View>
          )}
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS LIST CELL — memoizado
// ─────────────────────────────────────────────────────────────────────────────
const BusinessListCell = React.memo(function BusinessListCell({
  business, bookmarked, isComparing, onPress, onToggleBookmark, onToggleCompare,
  locationPermission = 'denied',
}) {
  const b = business;
  const slotLabel = FEED_SLOT_LABEL[b.feedSlot] || null;
  const distanceBadge = locationPermission === 'granted' ? getDistanceBadge(b.distance) : null;
  return (
    <TouchableOpacity style={hS.listCell} onPress={() => onPress(b)} activeOpacity={0.8}>
      <View style={hS.listCellImage}>
        {b.deals?.length > 0 && (
          <View style={hS.dealBadgeOverlay}>
            <Text style={hS.dealBadgeText} numberOfLines={1}>🔥 {b.deals.length} {b.deals.length > 1 ? 'Ofertas' : 'Oferta'}</Text>
          </View>
        )}
        {b.modules?.delivery && (
          <View style={hS.deliveryBadge}>
            <Icon name="delivery" size={10} color={COLORS.white} strokeWidth={2} />
            <Text style={hS.deliveryBadgeText}>Entrega</Text>
          </View>
        )}
        {b.photos?.[0]
          ? <Image source={{ uri: b.photos[0] }} style={hS.listCellPhoto} resizeMode="cover" />
          : <Text style={hS.listCellIcon}>{b.icon}</Text>
        }
        <TouchableOpacity style={hS.bookmarkIcon} onPress={() => onToggleBookmark(b.id)}>
          <Icon name={bookmarked ? 'heartFilled' : 'heart'} size={16} color={bookmarked ? COLORS.red : COLORS.white} strokeWidth={2} />
        </TouchableOpacity>
      </View>
      <View style={hS.listCellInfo}>
        <View style={hS.listCellTitleRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Text style={hS.listCellTitle} numberOfLines={1}>{b.name}</Text>
            {b.isPremium && <Icon name="certified" size={14} color={COLORS.green} strokeWidth={2} />}
            {b.isVerified && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.blue, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, marginLeft: 4, gap: 2 }}>
                <Icon name="check" size={9} color={COLORS.white} strokeWidth={3} />
                <Text style={{ fontSize: 8, fontWeight: '800', color: COLORS.white, letterSpacing: 0.4 }}>VERIFICADO</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={hS.compareCheckbox} onPress={e => { e.stopPropagation?.(); onToggleCompare(b.id); }}>
            <Icon name={isComparing ? 'check' : 'info'} size={16} color={isComparing ? COLORS.red : COLORS.grayText} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={hS.listCellMeta}>
          {renderStars(b.rating)}
          <Text style={hS.listCellRating}>{b.rating}</Text>
          <Text style={hS.listCellReviews}>({b.reviews})</Text>
        </View>
        <Text style={hS.listCellCategory} numberOfLines={1}>{b.subcategory}</Text>
        {b.address && <Text style={hS.listCellAddress} numberOfLines={1}>{b.address}</Text>}
        {(distanceBadge || slotLabel || b.hasActiveStatus || b.isNew || b.hasPromo) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
            {distanceBadge && (
              <View style={{ backgroundColor: distanceBadge.color + '18', borderColor: distanceBadge.color + '55', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: distanceBadge.color }}>{distanceBadge.label}</Text>
              </View>
            )}
            {slotLabel && (
              <View style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#1D4ED8' }}>{slotLabel}</Text>
              </View>
            )}
            {b.hasActiveStatus && (
              <View style={{ backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#047857' }}>Status</Text>
              </View>
            )}
            {b.isNew && (
              <View style={{ backgroundColor: '#FFF7ED', borderColor: '#FDBA74', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#C2410C' }}>Novo</Text>
              </View>
            )}
            {b.hasPromo && (
              <View style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#B91C1C' }}>Promo</Text>
              </View>
            )}
          </View>
        )}
        {(b.amenities || []).length > 0 && (
          <View style={hS.amenitiesRow}>
            {b.amenities.slice(0, 3).map(a => (
              <View key={a} style={hS.amenityChip}>
                <Icon name={AMENITY_ICON_MAP[a] || 'check'} size={11} color={COLORS.grayText} strokeWidth={1.5} />
              </View>
            ))}
          </View>
        )}
        <View style={hS.listCellFooter}>
          <Text style={hS.listCellDistance}>{b.distanceText}</Text>
          {(() => {
            const status = getBusinessStatus(b.statusText, b.isOpen);
            if (status.minsLeft !== null) return <Text style={hS.closingSoonText}>Fecha em {status.minsLeft} min</Text>;
            if (status.isClosed) return <Text style={hS.closedText}>Fechado</Text>;
            return <Text style={hS.openText}>Aberto agora</Text>;
          })()}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// PREMIUM INTERSTITIAL — bloco escuro entre grupos de negócios regulares
// ─────────────────────────────────────────────────────────────────────────────
const piS = StyleSheet.create({
  wrapper:  { marginVertical: 8, backgroundColor: '#F7F7F8', paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#EBEBEB' },
  header:   { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 6 },
  title:    { fontSize: 16, fontWeight: '800', color: '#111111', letterSpacing: -0.3 },
  subtitle: { fontSize: 11, fontWeight: '600', color: '#888888', letterSpacing: 0.2 },
  cardWrap: { paddingHorizontal: 16, marginBottom: 10 },
});

const PREMIUM_EVERY = 6;

const PremiumInterstitialBlock = React.memo(function PremiumInterstitialBlock({ businesses, onSelectBusiness }) {
  if (!businesses || businesses.length === 0) return null;
  return (
    <View style={piS.wrapper}>
      <View style={piS.header}>
        <Text style={piS.title}>👑 Em Destaque</Text>
        <Text style={piS.subtitle}>Negócios Premium</Text>
      </View>
      {businesses.map(b => (
        <View key={b.id} style={piS.cardWrap}>
          <SponsoredCard business={b} onPress={() => onSelectBusiness(b)} />
        </View>
      ))}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CAROUSEL SECTION — estado isolado para evitar re-render do HomeModule
// ─────────────────────────────────────────────────────────────────────────────
const CarouselSection = React.memo(function CarouselSection({ sponsored, onSelectBusiness }) {
  const carouselRef = useRef(null);
  const carouselIdx = useRef(0);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    carouselIdx.current = 0;
    setActiveIdx(0);
    if (sponsored.length <= 1) return undefined;
    const timer = setInterval(() => {
      const next = (carouselIdx.current + 1) % sponsored.length;
      carouselIdx.current = next;
      setActiveIdx(next);
      carouselRef.current?.scrollTo?.({ x: next * SCREEN_WIDTH, animated: true });
    }, 3000);
    return () => clearInterval(timer);
  }, [sponsored]);

  if (sponsored.length === 0) return null;

  return (
    <View style={hS.carouselSection}>
      <View style={hS.carouselHeader}>
        <Text style={hS.carouselTitle}>✦ Em Destaque</Text>
        <View style={hS.carouselDots}>
          {sponsored.map((_, i) => (
            <View key={i} style={[hS.carouselDot, i === activeIdx && hS.carouselDotActive]} />
          ))}
        </View>
      </View>
      <ScrollView
        ref={carouselRef}
        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        decelerationRate="fast" snapToInterval={SCREEN_WIDTH} snapToAlignment="start"
        contentContainerStyle={hS.carouselScroll}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          carouselIdx.current = idx;
          setActiveIdx(idx);
        }}
      >
        {sponsored.map(b => (
          <View key={b.id} style={hS.carouselItem}>
            <SponsoredCard business={b} onPress={() => onSelectBusiness(b)} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// HOME MODULE — componente principal exportado
// ─────────────────────────────────────────────────────────────────────────────
export const HomeModule = React.memo(function HomeModule({
  // Dados
  businesses = [],
  featuredBusinesses = [],
  onSelectBusiness,

  // Do hook useBusinessFilters
  searchWhat = '',          setSearchWhat = () => {},
  searchWhere = '',         setSearchWhere = () => {},
  showAutocomplete = false, setShowAutocomplete = () => {},
  autocompleteSuggestions = [],
  recentSearches = [],      saveRecentSearch = () => {}, clearRecentSearches = () => {},
  activeCategoryId = null,  setActiveCategoryId = () => {},
  activeFilter = 'open',    setActiveFilter = () => {},
  sortBy = 'recommended',   currentSortLabel = 'Ordenar',
  priceFilter = 'all',      setPriceFilter = () => {},
  distanceFilter = 'all',   setDistanceFilter = () => {},
  selectedAmenities = [],   toggleAmenity = () => {},
  hasActiveFilters = false, activeFiltersCount = 0,
  compareList = [],         toggleCompare = () => {},

  // Callbacks para Main
  onOpenSortModal = () => {},
  onOpenFilters = () => {},
  onOpenAppLayer = () => {},
  onToggleOwnerMode = () => {},
  isBusinessMode = false,

  // Dados extra
  bookmarkedIds = [],       onToggleBookmark = () => {},
  notifications = [],

  // Localização
  locationPermission = 'denied', onRequestLocation = () => {},

  // Safe area
  insets = { top: 0 },

  // Skeleton
  isLoading = false,
}) {
  // ── Estado do header ──────────────────────────────────────────────────────
  const [headerHeight, setHeaderHeight] = useState(140);

  // ── Debounced search: inputWhat is the live input; searchWhat is the debounced filter value
  const [inputWhat, setInputWhat] = useState(searchWhat);
  const [searchPending, setSearchPending] = useState(false);
  const searchDebounceRef = useRef(null);

  const handleSearchInput = useCallback((t) => {
    setInputWhat(t);
    setShowAutocomplete(t.length > 0);
    setSearchPending(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchWhat(t);
      setSearchPending(false);
    }, 300);
  }, [setSearchWhat, setShowAutocomplete]);

  // Sync inputWhat when searchWhat is cleared externally
  useEffect(() => {
    if (!searchWhat) { setInputWhat(''); setSearchPending(false); }
  }, [searchWhat]);

  useEffect(() => () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); }, []);

  const unreadNotifs = notifications.filter(n => !n.read).length;
  const isHybridFeed = useMemo(
    () => businesses.some((b) => typeof b.feedSlot === 'string' && b.feedSlot.length > 0),
    [businesses],
  );

  const SPONSORED = useMemo(
    () => (featuredBusinesses.length > 0 ? featuredBusinesses : businesses)
      .filter(b => b.isPublic !== false && b.id !== OWNER_BUSINESS.id)
      .filter(b => b.isPremium || b.promo)
      .slice(0, 5),
    [featuredBusinesses, businesses],
  );

  const premiumBiz = useMemo(
    () => (featuredBusinesses.length > 0 ? featuredBusinesses : businesses)
      .filter(b => b.isPublic !== false && b.id !== OWNER_BUSINESS.id && b.isPremium)
      .slice(0, 5),
    [featuredBusinesses, businesses],
  );

  const interleavedItems = useMemo(() => {
    const items = [];
    let pIdx = 0;
    for (let i = 0; i < businesses.length; i++) {
      items.push({ type: 'biz', b: businesses[i] });
      if ((i + 1) % PREMIUM_EVERY === 0 && i + 1 < businesses.length && SPONSORED.length > 0) {
        items.push({ type: 'sponsored', b: SPONSORED[pIdx % SPONSORED.length] });
        pIdx++;
      }
    }
    return items;
  }, [businesses, SPONSORED]);

  // ── RENDER HEADER ─────────────────────────────────────────────────────────
  const renderHeader = () => (
    <View style={hS.headerWrapper} onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}>
      <View style={[hS.header, { paddingTop: insets.top + 8 }]}>
        {/* Top row */}
        <View style={hS.headerTopRow}>
          <View style={hS.versionRow}>
            <Text style={hS.logo}>AchAqui</Text>
            <Text style={hS.versionText}>  v2.11.0</Text>
          </View>
          <View style={hS.headerActions}>
            <TouchableOpacity style={hS.headerActionBtn} onPress={onToggleOwnerMode}>
              <Icon name={isBusinessMode ? 'user' : 'briefcase'} size={18} color={isBusinessMode ? COLORS.red : COLORS.darkText} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={hS.headerActionBtn} onPress={() => onOpenAppLayer('notifications')}>
              <Icon name="bell" size={18} color={COLORS.darkText} strokeWidth={2} />
              {unreadNotifs > 0 && (
                <View style={hS.notifBadge}>
                  <Text style={hS.notifBadgeText}>{unreadNotifs > 9 ? '9+' : unreadNotifs}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        <View style={hS.searchBar}>
          <View style={hS.searchColumn}>
            <Text style={hS.searchLabel}>O QUE</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                style={[hS.searchInput, { flex: 1 }]}
                placeholder="restaurantes, farmacias, cafes"
                placeholderTextColor={COLORS.grayText}
                value={inputWhat}
                onChangeText={handleSearchInput}
                onFocus={() => setShowAutocomplete(true)}
                onSubmitEditing={() => {
                  if (inputWhat.trim()) {
                    setSearchWhat(inputWhat.trim());
                    saveRecentSearch(inputWhat.trim());
                    setShowAutocomplete(false);
                    Keyboard.dismiss();
                  }
                }}
                returnKeyType="search"
              />
              {searchPending && (
                <ActivityIndicator size="small" color={COLORS.red} style={{ marginRight: 6 }} />
              )}
              {(showAutocomplete || inputWhat.length > 0) && !searchPending && (
                <TouchableOpacity
                  onPress={() => { setShowAutocomplete(false); setSearchWhat(''); setInputWhat(''); setSearchPending(false); Keyboard.dismiss(); }}
                  style={hS.searchCloseBtn}
                >
                  <Icon name="close" size={16} color={COLORS.grayText} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={hS.searchDivider} />
          <View style={hS.searchColumn}>
            <Text style={hS.searchLabel}>ONDE</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                style={[hS.searchInput, { flex: 1 }]}
                placeholder="bairro, cidade"
                placeholderTextColor={COLORS.grayText}
                value={searchWhere}
                onChangeText={setSearchWhere}
              />
              <TouchableOpacity onPress={onRequestLocation}>
                <Icon name="location" size={18} color={locationPermission === 'granted' ? COLORS.red : COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Category chips */}
      <View style={hS.categoryRowWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={hS.categoryRow}>
          {CATEGORIES.map(cat => {
            const isActive     = activeCategoryId === cat.id;
            const isMoreActive = cat.id === 'more' && ALL_CAT_IDS.has(activeCategoryId);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[hS.categoryChip, (isActive || isMoreActive) && { backgroundColor: COLORS.red + '15', borderColor: COLORS.red, borderWidth: 1.5 }]}
                activeOpacity={0.7}
                onPress={() => {
                  if (cat.id === 'more') { onOpenAppLayer('allCategories'); return; }
                  setActiveCategoryId(prev => prev === cat.id ? null : cat.id);
                }}
              >
                <View style={hS.categoryChipIconWrap}>
                  <Icon name={cat.icon} size={14} color={(isActive || isMoreActive) ? COLORS.red : COLORS.darkText} strokeWidth={(isActive || isMoreActive) ? 2.5 : 1.5} />
                </View>
                <Text style={[hS.categoryChipLabel, (isActive || isMoreActive) && { color: COLORS.red, fontWeight: '700' }]}>
                  {isMoreActive ? (ALL_CAT_LABEL[activeCategoryId] || cat.label) : cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  // ── RENDER HOME (lista virtualizada via FlatList) ─────────────────────────
  const renderHome = () => {
    if (isLoading && businesses.length === 0) return <HomeSkeleton />;
    return (
    <FlatList
      style={hS.scroll}
      contentContainerStyle={hS.scrollContent}
      showsVerticalScrollIndicator={false}
      data={interleavedItems}
      keyExtractor={(item, idx) => item.type === 'sponsored' ? `spons-${item.b.id}-${idx}` : item.b.id}
      renderItem={({ item }) =>
        item.type === 'sponsored'
          ? (
            <View style={{ marginHorizontal: 16, marginVertical: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#F59E0B', marginBottom: 4, letterSpacing: 0.5 }}>✦ PATROCINADO</Text>
              <SponsoredCard business={item.b} onPress={() => onSelectBusiness(item.b)} />
            </View>
          )
          : (
            <BusinessListCell
              business={item.b}
              bookmarked={bookmarkedIds.includes(item.b.id)}
              isComparing={compareList.includes(item.b.id)}
              onPress={onSelectBusiness}
              onToggleBookmark={onToggleBookmark}
              onToggleCompare={toggleCompare}
              locationPermission={locationPermission}
            />
          )
      }
      ListHeaderComponent={(
        <>
          {/* Carousel patrocinado */}
          {SPONSORED.length > 0 && (
            <CarouselSection sponsored={SPONSORED} onSelectBusiness={onSelectBusiness} />
          )}

          {/* Filter grid — 2 linhas */}
          <View style={hS.controlsSection}>
            <View style={hS.unifiedFilterContainer}>
              <View style={hS.filterRow}>
                {[
                  { id: 'all',   icon: 'globe', label: 'Todos'          },
                  { id: 'open',  icon: 'live',  label: 'Aberto agora'   },
                  { id: 'deals', icon: 'tag',   label: 'Promoções'      },
                  { id: 'top',   icon: 'star',  label: 'Mais avaliados' },
                ].map(f => (
                  <TouchableOpacity key={f.id} style={[hS.filterItem, activeFilter === f.id && hS.filterItemActive]} onPress={() => setActiveFilter(f.id)} activeOpacity={0.7}>
                    <Icon name={f.icon} size={13} color={activeFilter === f.id ? COLORS.red : COLORS.darkText} strokeWidth={2} />
                    <Text style={[hS.filterItemText, activeFilter === f.id && hS.filterItemTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={hS.filtersSpacer} />
              <View style={hS.filterRow}>
                <TouchableOpacity style={hS.filterItem} onPress={onOpenSortModal}>
                  <Text style={hS.filterItemText}>{currentSortLabel}</Text>
                  <Icon name="chevronDown" size={12} color={COLORS.darkText} strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity style={[hS.filterItem, hasActiveFilters && hS.filterItemActive]} onPress={onOpenFilters}>
                  <Icon name="filter" size={13} color={hasActiveFilters ? COLORS.red : COLORS.darkText} strokeWidth={2} />
                  <Text style={[hS.filterItemText, hasActiveFilters && hS.filterItemTextActive]}>Filtros</Text>
                  {hasActiveFilters && <View style={hS.controlBadge}><Text style={hS.controlBadgeText}>{activeFiltersCount}</Text></View>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={hS.filterItem}
                  onPress={() =>
                    Alert.alert('Mapa', 'Visualização em mapa será ativada nesta secção.')
                  }
                >
                  <Icon name="map" size={13} color={COLORS.darkText} strokeWidth={2} />
                  <Text style={hS.filterItemText}>Mapa</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Active filter badges */}
          {hasActiveFilters && (
            <View style={fbS.container}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fbS.scroll}>
                {priceFilter !== 'all' && (
                  <View style={fbS.badge}>
                    <Text style={fbS.badgeText}>{PRICE_FILTERS.find(p => p.id === priceFilter)?.label}</Text>
                    <TouchableOpacity onPress={() => setPriceFilter('all')} style={fbS.badgeClose}><Text style={fbS.badgeCloseText}>✕</Text></TouchableOpacity>
                  </View>
                )}
                {distanceFilter !== 'all' && (
                  <View style={fbS.badge}>
                    <Text style={fbS.badgeText}>{DISTANCE_FILTERS.find(d => d.id === distanceFilter)?.label}</Text>
                    <TouchableOpacity onPress={() => setDistanceFilter('all')} style={fbS.badgeClose}><Text style={fbS.badgeCloseText}>✕</Text></TouchableOpacity>
                  </View>
                )}
                {selectedAmenities.map(aid => {
                  const am = AMENITY_FILTERS.find(a => a.id === aid);
                  return am ? (
                    <View key={aid} style={fbS.badge}>
                      <Text style={fbS.badgeText}>{am.label}</Text>
                      <TouchableOpacity onPress={() => toggleAmenity(aid)} style={fbS.badgeClose}><Text style={fbS.badgeCloseText}>✕</Text></TouchableOpacity>
                    </View>
                  ) : null;
                })}
              </ScrollView>
            </View>
          )}

          {/* Section header */}
          <View style={hS.sectionHeader}>
            <Text style={hS.sectionTitle}>Perto de ti</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {searchPending && <ActivityIndicator size="small" color={COLORS.red} />}
              <Text style={hS.sectionCount}>({businesses.length} resultados)</Text>
            </View>
          </View>
        </>
      )}
      initialNumToRender={8}
      maxToRenderPerBatch={10}
      windowSize={5}
    />
    );
  };

  // ── MAIN RENDER ───────────────────────────────────────────────────────────
  return (
    <View style={hS.container}>
      {renderHeader()}
      {renderHome()}
      {/* Autocomplete — fora do FlatList para funcionar correctamente no iOS */}
      {showAutocomplete && (
        <>
          <TouchableOpacity
            style={[acS.backdrop, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }]}
            activeOpacity={1}
            onPress={() => setShowAutocomplete(false)}
          />
          <View style={[acS.absoluteDropdown, { zIndex: 999, top: headerHeight }]}>
            <View style={acS.container}>
              <ScrollView style={acS.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {autocompleteSuggestions.length > 0 && (
                  <>
                    <Text style={acS.sectionTitle}>Sugestões</Text>
                    {autocompleteSuggestions.map((s, i) => (
                      <TouchableOpacity key={i} style={acS.item} onPress={() => { setSearchWhat(s); saveRecentSearch(s); setShowAutocomplete(false); Keyboard.dismiss(); }}>
                        <Icon name="search" size={14} color={COLORS.grayText} strokeWidth={1.5} />
                        <Text style={acS.text}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                {recentSearches.length > 0 && (
                  <>
                    <View style={acS.recentHeader}>
                      <Text style={acS.sectionTitle}>Recentes</Text>
                      <TouchableOpacity onPress={clearRecentSearches}><Text style={acS.clearText}>Limpar</Text></TouchableOpacity>
                    </View>
                    {recentSearches.map((s, i) => (
                      <TouchableOpacity key={i} style={acS.item} onPress={() => { setSearchWhat(s); saveRecentSearch(s); setShowAutocomplete(false); Keyboard.dismiss(); }}>
                        <Icon name="clock" size={14} color={COLORS.grayText} strokeWidth={1.5} />
                        <Text style={acS.text}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                <Text style={acS.sectionTitle}>Trending</Text>
                {TRENDING_SEARCHES.map((s, i) => (
                  <TouchableOpacity key={i} style={acS.item} onPress={() => { setSearchWhat(s); saveRecentSearch(s); setShowAutocomplete(false); Keyboard.dismiss(); }}>
                    <Icon name="fire" size={14} color={COLORS.red} strokeWidth={1.5} />
                    <Text style={acS.text}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </>
      )}
    </View>
  );
});


// ─────────────────────────────────────────────────────────────────────────────
// TAB VIEWS: Search, Featured, Profile
// Exportadas separadamente para uso interno em HomeModuleFull
// ─────────────────────────────────────────────────────────────────────────────
export function HomeModuleFull(props) {
  const {
    activeNavTab = 'home',
    onSetActiveNavTab = () => {},
    onToggleOwnerMode = () => {},
    setActiveBusinessTab = () => {},
    USER_PROFILE,
    isBusinessMode = false,
    ...rest
  } = props;

  if (activeNavTab === 'home') return <HomeModule {...rest} onToggleOwnerMode={onToggleOwnerMode} isBusinessMode={isBusinessMode} isLoading={props.isLoading} />;
  if (activeNavTab === 'search')   return <SearchTab {...rest} onSetActiveNavTab={onSetActiveNavTab} />;
  if (activeNavTab === 'featured') return <FeaturedTab {...rest} onSetActiveNavTab={onSetActiveNavTab} />;
  if (activeNavTab === 'profile')  return (
    <ProfileTab
      {...rest}
      onSetActiveNavTab={onSetActiveNavTab}
      onToggleOwnerMode={onToggleOwnerMode}
      setActiveBusinessTab={setActiveBusinessTab}
      USER_PROFILE={USER_PROFILE}
      isBusinessMode={isBusinessMode}
      authUser={props.authUser || null}
      onOpenAuth={props.onOpenAuth || (() => {})}
      onLogout={props.onLogout || (() => {})}
    />
  );
  return null;
}

// ── SEARCH TAB ────────────────────────────────────────────────────────────────
function SearchTab({
  businesses = [], onSelectBusiness, searchWhat = '', setSearchWhat = () => {},
  activeCategoryId, setActiveCategoryId = () => {}, onSetActiveNavTab = () => {},
  insets = { top: 0 },
}) {
  const [recentSearches, setRecentSearches] = React.useState([]);
  const saveRecentSearch = (term) => {
    setRecentSearches(prev => [term, ...prev.filter(s => s !== term)].slice(0, 8));
  };
  const clearRecentSearches = () => setRecentSearches([]);

  return (
<View style={{flex:1,backgroundColor:COLORS.grayBg}}>
      {/* Search header */}
      <View style={{backgroundColor:COLORS.white,paddingHorizontal:16,paddingTop:insets.top+10,paddingBottom:16,borderBottomWidth:1,borderBottomColor:COLORS.grayLine}}>
        <Text style={{fontSize:22,fontWeight:'800',color:COLORS.darkText,marginBottom:12}}>Pesquisar</Text>
        <View style={{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.grayBg,borderRadius:12,paddingHorizontal:12,paddingVertical:10,gap:8}}>
          <Icon name="search" size={16} color={COLORS.grayText} strokeWidth={2}/>
          <TextInput
            style={{flex:1,fontSize:14,color:COLORS.darkText}}
            placeholder="restaurantes, farmácias, barbearias..."
            placeholderTextColor={COLORS.grayText}
            value={searchWhat}
            onChangeText={t=>{setSearchWhat(t);}}
            returnKeyType="search"
            onSubmitEditing={()=>{if(searchWhat.trim()){saveRecentSearch(searchWhat.trim());}}}
          />
          {searchWhat.length>0&&<TouchableOpacity onPress={()=>setSearchWhat('')}><Icon name="close" size={14} color={COLORS.grayText} strokeWidth={2}/></TouchableOpacity>}
        </View>
      </View>
      <ScrollView contentContainerStyle={{paddingBottom:80}} showsVerticalScrollIndicator={false}>
        {/* Category grid */}
        {!searchWhat.trim() && (
          <>
            <Text style={{fontSize:14,fontWeight:'700',color:COLORS.darkText,paddingHorizontal:16,paddingTop:16,paddingBottom:10}}>Categorias Populares</Text>
            <View style={{flexDirection:'row',flexWrap:'wrap',paddingHorizontal:12,gap:8,marginBottom:16}}>
              {[
                {id:'restaurants',label:'Restaurantes',icon:'fire',color:'#EA580C'},
                {id:'hotels',label:'Hotéis',icon:'hotel',color:'#0EA5E9'},
                {id:'health',label:'Saúde',icon:'certified',color:'#10B981'},
                {id:'beautysalons',label:'Beleza',icon:'heart',color:'#EC4899'},
                {id:'shopping',label:'Compras',icon:'payment',color:'#D97706'},
                {id:'professional',label:'Serviços',icon:'professional',color:'#059669'},
                {id:'education',label:'Educação',icon:'users',color:'#DC2626'},
                {id:'active',label:'Fitness',icon:'star',color:'#16A34A'},
              ].map(cat=>(
                <TouchableOpacity key={cat.id}
                  style={{width:'47%',backgroundColor:COLORS.white,borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:COLORS.grayLine}}
                  onPress={()=>{ setActiveCategoryId(cat.id); onSetActiveNavTab('home'); }}
                >
                  <View style={{width:36,height:36,borderRadius:18,backgroundColor:cat.color+'18',alignItems:'center',justifyContent:'center'}}>
                    <Icon name={cat.icon} size={18} color={cat.color} strokeWidth={1.5}/>
                  </View>
                  <Text style={{fontSize:13,fontWeight:'700',color:COLORS.darkText,flex:1}}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Recent searches */}
            {recentSearches.length>0 && (
              <>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,marginBottom:10}}>
                  <Text style={{fontSize:14,fontWeight:'700',color:COLORS.darkText}}>Pesquisas Recentes</Text>
                  <TouchableOpacity onPress={clearRecentSearches}><Text style={{fontSize:12,color:COLORS.red,fontWeight:'700'}}>Limpar</Text></TouchableOpacity>
                </View>
                {recentSearches.map((s,i)=>(
                  <TouchableOpacity key={i} style={{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.grayLine}}
                    onPress={()=>{setSearchWhat(s);}}>
                    <Icon name="clock" size={16} color={COLORS.grayText} strokeWidth={1.5}/>
                    <Text style={{fontSize:14,color:COLORS.darkText,flex:1}}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}
        {/* Search results */}
        {searchWhat.trim() && (
          <>
            <Text style={{fontSize:13,fontWeight:'600',color:COLORS.grayText,paddingHorizontal:16,paddingTop:12,paddingBottom:8}}>{businesses.length} resultados para "{searchWhat}"</Text>
            {businesses.map(b=>(
              <TouchableOpacity key={b.id} style={{flexDirection:'row',backgroundColor:COLORS.white,marginHorizontal:16,marginBottom:8,borderRadius:14,padding:12,borderWidth:1,borderColor:COLORS.grayLine}} onPress={()=>onSelectBusiness(b)}>
                <View style={{width:56,height:56,borderRadius:10,marginRight:12,overflow:'hidden',backgroundColor:COLORS.grayBg,alignItems:'center',justifyContent:'center'}}>
                  {b.photos?.[0]?<Image source={{uri:b.photos[0]}} style={{width:'100%',height:'100%'}} resizeMode="cover"/>:<Text style={{fontSize:24}}>{b.icon}</Text>}
                </View>
                <View style={{flex:1}}>
                  <Text style={{fontSize:14,fontWeight:'700',color:COLORS.darkText}} numberOfLines={1}>{b.name}</Text>
                  <Text style={{fontSize:12,color:COLORS.grayText,marginTop:2}} numberOfLines={1}>{b.subcategory||b.category}</Text>
                  <View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:4}}>
                    <Text style={{fontSize:12,fontWeight:'700',color:COLORS.darkText}}>★ {b.rating}</Text>
                    <Text style={{fontSize:11,color:COLORS.grayText}}>({b.reviews})</Text>
                    <Text style={{fontSize:11,color:b.isOpen?COLORS.green:COLORS.red,fontWeight:'600'}}>{b.isOpen?'Aberto':'Fechado'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            {businesses.length===0&&(
              <View style={{alignItems:'center',paddingTop:60,gap:12}}>
                <Text style={{fontSize:40}}>🔍</Text>
                <Text style={{fontSize:16,fontWeight:'700',color:COLORS.darkText}}>Sem resultados</Text>
                <Text style={{fontSize:13,color:COLORS.grayText,textAlign:'center',paddingHorizontal:32}}>Tente outros termos ou explore as categorias acima.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>

  // ── RENDER FEATURED (cliente) ─────────────────────────────────────────────
  );
}

// ── FEATURED TAB ──────────────────────────────────────────────────────────────
function FeaturedTab({
  businesses = [], featuredBusinesses = [], onSelectBusiness,
  insets = { top: 0 }, onSetActiveNavTab = () => {},
}) {
  const BASE_FEATURED = featuredBusinesses.length > 0 ? featuredBusinesses : businesses;

  return (
<View style={{flex:1,backgroundColor:COLORS.grayBg}}>
      <View style={{backgroundColor:COLORS.white,paddingHorizontal:16,paddingTop:insets.top+10,paddingBottom:16,borderBottomWidth:1,borderBottomColor:COLORS.grayLine}}>
        <Text style={{fontSize:22,fontWeight:'800',color:COLORS.darkText}}>Em Destaque</Text>
        <Text style={{fontSize:13,color:COLORS.grayText,marginTop:4}}>Os melhores negócios de Luanda</Text>
      </View>
      <ScrollView contentContainerStyle={{paddingBottom:80}} showsVerticalScrollIndicator={false}>
        {/* Premium businesses */}
        <Text style={{fontSize:14,fontWeight:'700',color:COLORS.darkText,paddingHorizontal:16,paddingTop:16,paddingBottom:10}}>👑 Premium</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:16,gap:12,paddingBottom:8}}>
          {BASE_FEATURED.filter(b => b.isPublic !== false && b.id !== OWNER_BUSINESS.id).filter(b=>b.isPremium).map(b=>(
            <TouchableOpacity key={b.id} style={{width:220,backgroundColor:COLORS.white,borderRadius:14,overflow:'hidden',borderWidth:1,borderColor:COLORS.grayLine}} onPress={()=>onSelectBusiness(b)}>
              {b.photos?.[0]?<Image source={{uri:b.photos[0]}} style={{width:'100%',height:120}} resizeMode="cover"/>:<View style={{width:'100%',height:120,backgroundColor:COLORS.grayBg,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:40}}>{b.icon}</Text></View>}
              <View style={{padding:10}}>
                <Text style={{fontSize:13,fontWeight:'700',color:COLORS.darkText}} numberOfLines={1}>{b.name}</Text>
                <Text style={{fontSize:11,color:COLORS.grayText,marginTop:2}} numberOfLines={1}>{b.subcategory}</Text>
                <View style={{flexDirection:'row',alignItems:'center',gap:4,marginTop:4}}>
                  <Text style={{fontSize:12,fontWeight:'700',color:'#F59E0B'}}>★ {b.rating}</Text>
                  <Text style={{fontSize:10,color:COLORS.grayText}}>({b.reviews})</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {/* Top rated */}
        <Text style={{fontSize:14,fontWeight:'700',color:COLORS.darkText,paddingHorizontal:16,paddingTop:16,paddingBottom:10}}>⭐ Mais Avaliados</Text>
        {[...BASE_FEATURED].filter(b=>b.isPublic!==false&&b.id!==OWNER_BUSINESS.id).sort((a,b)=>b.rating-a.rating).slice(0,5).map(b=>(
          <TouchableOpacity key={b.id} style={{flexDirection:'row',backgroundColor:COLORS.white,marginHorizontal:16,marginBottom:8,borderRadius:14,padding:12,borderWidth:1,borderColor:COLORS.grayLine}} onPress={()=>onSelectBusiness(b)}>
            <View style={{width:56,height:56,borderRadius:10,marginRight:12,overflow:'hidden',backgroundColor:COLORS.grayBg,alignItems:'center',justifyContent:'center'}}>
              {b.photos?.[0]?<Image source={{uri:b.photos[0]}} style={{width:'100%',height:'100%'}} resizeMode="cover"/>:<Text style={{fontSize:24}}>{b.icon}</Text>}
            </View>
            <View style={{flex:1}}>
              <Text style={{fontSize:14,fontWeight:'700',color:COLORS.darkText}} numberOfLines={1}>{b.name}</Text>
              <Text style={{fontSize:12,color:COLORS.grayText}} numberOfLines={1}>{b.subcategory||b.category}</Text>
              <View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:4}}>
                <Text style={{fontSize:13,fontWeight:'800',color:'#F59E0B'}}>★ {b.rating}</Text>
                <Text style={{fontSize:11,color:COLORS.grayText}}>({b.reviews} avaliações)</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
        {/* Promos */}
        <Text style={{fontSize:14,fontWeight:'700',color:COLORS.darkText,paddingHorizontal:16,paddingTop:16,paddingBottom:10}}>🔥 Com Promoções</Text>
        {BASE_FEATURED.filter(b=>b.promo&&b.isPublic!==false&&b.id!==OWNER_BUSINESS.id).map(b=>(
          <TouchableOpacity key={b.id} style={{marginHorizontal:16,marginBottom:10,borderRadius:14,overflow:'hidden',backgroundColor:COLORS.white,borderWidth:1,borderColor:'#FFE082'}} onPress={()=>onSelectBusiness(b)}>
            <View style={{backgroundColor:'#FFFDE7',paddingHorizontal:14,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:8}}>
              <Text style={{fontSize:14}}>🔥</Text>
              <Text style={{fontSize:13,fontWeight:'700',color:'#B45309',flex:1}} numberOfLines={1}>{b.promo}</Text>
            </View>
            <View style={{flexDirection:'row',alignItems:'center',padding:12,gap:10}}>
              <View style={{width:44,height:44,borderRadius:10,overflow:'hidden',backgroundColor:COLORS.grayBg,alignItems:'center',justifyContent:'center'}}>
                {b.photos?.[0]?<Image source={{uri:b.photos[0]}} style={{width:'100%',height:'100%'}} resizeMode="cover"/>:<Text style={{fontSize:22}}>{b.icon}</Text>}
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:14,fontWeight:'700',color:COLORS.darkText}}>{b.name}</Text>
                <Text style={{fontSize:12,color:COLORS.grayText}}>{b.distanceText}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>

  // ── RENDER PROFILE (cliente) ──────────────────────────────────────────────
  );
}



// ── PROFILE TAB ───────────────────────────────────────────────────────────────
function ProfileTab({
  businesses = [], onSelectBusiness,
  bookmarkedIds = [], onToggleBookmark = () => {},
  insets = { top: 0, bottom: 0 },
  onSetActiveNavTab = () => {},
  onToggleOwnerMode = () => {},
  setActiveBusinessTab = () => {},
  USER_PROFILE = {},
  isBusinessMode = false,
  authUser = null,
  accessToken = null,
  liveBookings = [],
  onOpenAuth = () => {},
  onLogout = () => {},
}) {
  const isLoggedIn = Boolean(authUser);
  const isOwner    = authUser?.role === 'OWNER';
  const isAdmin    = authUser?.role === 'ADMIN';

  const [stats, setStats]               = useState(null);
  const [myReviews, setMyReviews]       = useState([]);
  const [expandedSection, setExpanded]  = useState(null);
  const [editName, setEditName]         = useState(authUser?.name || '');
  const [savingName, setSavingName]     = useState(false);
  const [saveNameMsg, setSaveNameMsg]   = useState('');

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([
      backendApi.getMyStats(accessToken).catch(() => null),
      backendApi.getMyReviews(accessToken).catch(() => []),
    ]).then(([s, r]) => {
      if (s) setStats(s);
      if (Array.isArray(r)) setMyReviews(r);
    });
  }, [accessToken]);

  const toggleSection = (section) =>
    setExpanded(prev => (prev === section ? null : section));

  const handleSaveName = async () => {
    if (!editName.trim() || !accessToken) return;
    setSavingName(true);
    setSaveNameMsg('');
    try {
      await backendApi.updateProfile({ name: editName.trim() }, accessToken);
      setSaveNameMsg('Nome actualizado com sucesso.');
    } catch {
      setSaveNameMsg('Erro ao guardar. Tente novamente.');
    } finally {
      setSavingName(false);
    }
  };

  const bookmarkedBusinesses = businesses.filter(b => bookmarkedIds.includes(b.id));

  const roleLabel = isAdmin ? 'Administrador' : isOwner ? 'Proprietário' : 'Cliente';

  return (
    <View style={[profS.overlay, { top: insets.top, bottom: (insets.bottom || 0) + 58.5 }]}>
      {/* Header */}
      <View style={profS.header}>
        <TouchableOpacity style={profS.backBtn} onPress={() => onSetActiveNavTab('home')}>
          <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>

        {/* ── GUEST: não logado ─────────────────────────────────────────── */}
        {!isLoggedIn && (
          <View style={guestS.wrap}>
            <View style={guestS.avatarWrap}>
              <View style={profS.avatarLarge}>
                <Icon name="user" size={64} color={COLORS.grayText} strokeWidth={1.5} />
              </View>
            </View>
            <Text style={guestS.title}>Bem-vindo ao AchAqui</Text>
            <Text style={guestS.subtitle}>
              Inicia sessão para guardar favoritos, fazer reservas e gerir o teu negócio.
            </Text>
            <TouchableOpacity style={guestS.loginBtn} activeOpacity={0.85} onPress={() => onOpenAuth('login')}>
              <Icon name="user" size={18} color={COLORS.white} strokeWidth={2.5} />
              <Text style={guestS.loginBtnTxt}>Entrar na conta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={guestS.registerBtn} activeOpacity={0.85} onPress={() => onOpenAuth('register')}>
              <Text style={guestS.registerBtnTxt}>Criar conta</Text>
            </TouchableOpacity>
            <View style={guestS.dividerRow}>
              <View style={guestS.dividerLine} />
              <Text style={guestS.dividerTxt}>ou continua a explorar</Text>
              <View style={guestS.dividerLine} />
            </View>
            <View style={profS.actionGrid}>
              <TouchableOpacity style={profS.actionButton} activeOpacity={0.7} onPress={() => onSetActiveNavTab('home')}>
                <View style={profS.actionIcon}><Icon name="search" size={22} color={COLORS.darkText} strokeWidth={2} /></View>
                <Text style={profS.actionLabel}>Explorar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={profS.actionButton} activeOpacity={0.7} onPress={() => onOpenAuth('login')}>
                <View style={profS.actionIcon}><Icon name="star" size={22} color={COLORS.darkText} strokeWidth={2} /></View>
                <Text style={profS.actionLabel}>Avaliação</Text>
              </TouchableOpacity>
              <TouchableOpacity style={profS.actionButton} activeOpacity={0.7} onPress={() => onOpenAuth('login')}>
                <View style={profS.actionIcon}><Icon name="camera" size={22} color={COLORS.darkText} strokeWidth={2} /></View>
                <Text style={profS.actionLabel}>Fotos e vídeos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={profS.actionButton} activeOpacity={0.7} onPress={() => onOpenAuth('register', 'OWNER')}>
                <View style={profS.actionIcon}><Icon name="plusSquare" size={22} color={COLORS.darkText} strokeWidth={2} /></View>
                <Text style={profS.actionLabel}>Adicionar negócio</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 32 }} />
          </View>
        )}

        {/* ── LOGADO ──────────────────────────────────────────────────────── */}
        {isLoggedIn && (
          <>
            {/* Avatar + Nome + Stats badges */}
            <View style={profS.topSection}>
              <View style={profS.avatarContainer}>
                <View style={profS.avatarLarge}>
                  <Icon name="user" size={64} color={COLORS.grayText} strokeWidth={1.5} />
                </View>
              </View>
              <Text style={profS.userName}>{authUser.name || USER_PROFILE.name || 'Utilizador'}</Text>
              <View style={profS.statsBadges}>
                <View style={profS.statBadge}>
                  <Icon name="star" size={14} color={COLORS.darkText} strokeWidth={2} />
                  <Text style={profS.statBadgeText}>{stats?.reviews ?? 0}</Text>
                </View>
                <View style={profS.statBadge}>
                  <Icon name="check" size={14} color={COLORS.darkText} strokeWidth={2} />
                  <Text style={profS.statBadgeText}>{stats?.checkIns ?? 0}</Text>
                </View>
                <View style={profS.statBadge}>
                  <Icon name="heart" size={14} color={COLORS.darkText} strokeWidth={2} />
                  <Text style={profS.statBadgeText}>{stats?.bookmarks ?? bookmarkedIds.length}</Text>
                </View>
              </View>
            </View>

            {/* Acções rápidas — acordeões */}
            <View style={profS.actionGrid}>
              {[
                { id:'reviews',  icon:'star',      label:'Avaliações' },
                { id:'bookmarks',icon:'heart',      label:'Guardados' },
                { id:'bookings', icon:'calendar',   label:'Reservas' },
                { id:'editProfile', icon:'user',    label:'Editar Perfil' },
              ].map(action => (
                <TouchableOpacity
                  key={action.id}
                  style={profS.actionButton}
                  activeOpacity={0.7}
                  onPress={() => toggleSection(action.id)}
                >
                  <View style={[profS.actionIcon, expandedSection === action.id && { backgroundColor: '#FFECEC' }]}>
                    <Icon name={action.icon} size={22} color={expandedSection === action.id ? COLORS.red : COLORS.darkText} strokeWidth={2} />
                  </View>
                  <Text style={[profS.actionLabel, expandedSection === action.id && { color: COLORS.red }]}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Acordeão: Avaliações ─────────────────────────────────── */}
            {expandedSection === 'reviews' && (
              <View style={profAccS.accordion}>
                {myReviews.length === 0
                  ? <Text style={profAccS.emptyTxt}>Ainda não fizeste nenhuma avaliação.</Text>
                  : myReviews.map(r => (
                    <View key={r.id} style={profAccS.reviewItem}>
                      <Text style={profAccS.reviewBiz}>{r.business?.name || '—'}</Text>
                      <Text style={profAccS.reviewStars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                      <Text style={profAccS.reviewComment} numberOfLines={3}>{r.comment}</Text>
                      <Text style={profAccS.reviewDate}>{new Date(r.createdAt).toLocaleDateString('pt-PT')}</Text>
                    </View>
                  ))
                }
              </View>
            )}

            {/* ── Acordeão: Guardados ──────────────────────────────────── */}
            {expandedSection === 'bookmarks' && (
              <View style={profAccS.accordion}>
                {bookmarkedBusinesses.length === 0
                  ? <Text style={profAccS.emptyTxt}>Ainda não guardaste nenhum negócio.</Text>
                  : bookmarkedBusinesses.map(b => (
                    <View key={b.id} style={profAccS.bookmarkItem}>
                      <View style={profAccS.bookmarkPhoto}>
                        {b.photos?.[0]
                          ? <Image source={{ uri: b.photos[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          : <Text style={{ fontSize: 28 }}>{b.icon}</Text>
                        }
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={profAccS.bookmarkName} numberOfLines={1}>{b.name}</Text>
                        <Text style={profAccS.bookmarkMeta} numberOfLines={1}>{b.subcategory} · {b.distanceText}</Text>
                        {!!b.address && <Text style={profAccS.bookmarkAddr} numberOfLines={1}>{b.address}</Text>}
                      </View>
                      <TouchableOpacity onPress={() => onToggleBookmark(b.id)} style={{ padding: 8 }}>
                        <Icon name="heartFilled" size={18} color={COLORS.red} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                  ))
                }
              </View>
            )}

            {/* ── Acordeão: Reservas ───────────────────────────────────── */}
            {expandedSection === 'bookings' && (
              <View style={profAccS.accordion}>
                {liveBookings.length === 0
                  ? <Text style={profAccS.emptyTxt}>Ainda não tens reservas.</Text>
                  : liveBookings.map(b => {
                    const statusColor = b.status === 'confirmed' ? COLORS.green : b.status === 'rejected' ? COLORS.red : '#F59E0B';
                    const statusLabel = b.status === 'confirmed' ? 'Confirmada' : b.status === 'rejected' ? 'Rejeitada' : 'Pendente';
                    return (
                      <View key={b.id} style={profAccS.bookingItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={profAccS.bookingBiz} numberOfLines={1}>{b.business?.name || b.businessId || '—'}</Text>
                          <Text style={profAccS.bookingDates}>{b.startDate ? new Date(b.startDate).toLocaleDateString('pt-PT') : '—'} → {b.endDate ? new Date(b.endDate).toLocaleDateString('pt-PT') : '—'}</Text>
                        </View>
                        <View style={[profAccS.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
                          <Text style={[profAccS.statusBadgeTxt, { color: statusColor }]}>{statusLabel}</Text>
                        </View>
                      </View>
                    );
                  })
                }
              </View>
            )}

            {/* ── Acordeão: Editar Perfil ──────────────────────────────── */}
            {expandedSection === 'editProfile' && (
              <View style={profAccS.accordion}>
                <Text style={profAccS.fieldLabel}>Nome</Text>
                <TextInput
                  style={profAccS.textInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="O teu nome"
                  placeholderTextColor={COLORS.grayText}
                />
                <Text style={profAccS.fieldLabel}>Email</Text>
                <View style={profAccS.readonlyField}>
                  <Text style={profAccS.readonlyTxt}>{authUser.email || '—'}</Text>
                </View>
                <Text style={profAccS.fieldLabel}>Função</Text>
                <View style={profAccS.readonlyField}>
                  <Text style={profAccS.readonlyTxt}>{roleLabel}</Text>
                </View>
                <TouchableOpacity
                  style={[profAccS.saveBtn, savingName && { opacity: 0.6 }]}
                  onPress={handleSaveName}
                  disabled={savingName}
                  activeOpacity={0.8}
                >
                  <Text style={profAccS.saveBtnTxt}>{savingName ? 'A guardar...' : 'Guardar alterações'}</Text>
                </TouchableOpacity>
                {!!saveNameMsg && (
                  <Text style={[profAccS.feedbackMsg, saveNameMsg.startsWith('Erro') && { color: COLORS.red }]}>{saveNameMsg}</Text>
                )}
              </View>
            )}

            <View style={profS.divider} />

            {/* Contribuições */}
            <View style={profS.section}>
              <Text style={profS.sectionTitle}>Contribuições</Text>
              <TouchableOpacity style={profS.menuRow} activeOpacity={0.7} onPress={() => toggleSection('reviews')}>
                <Icon name="star" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Avaliações</Text>
                <Text style={profS.menuCount}>{stats?.reviews ?? 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={profS.menuRow} activeOpacity={0.7} onPress={() => toggleSection('bookmarks')}>
                <Icon name="heart" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Negócios guardados</Text>
                <Text style={profS.menuCount}>{stats?.bookmarks ?? bookmarkedIds.length}</Text>
              </TouchableOpacity>
              {isOwner && (
                <View style={profS.menuRow}>
                  <Icon name="plusSquare" size={22} color={COLORS.darkText} strokeWidth={2} />
                  <Text style={profS.menuLabel}>Negócios adicionados</Text>
                  <Text style={profS.menuCount}>{stats?.businesses ?? 0}</Text>
                </View>
              )}
            </View>

            <View style={profS.divider} />

            {/* Atividade */}
            <View style={profS.section}>
              <Text style={profS.sectionTitle}>Atividade</Text>
              <TouchableOpacity style={profS.menuRow} activeOpacity={0.7} onPress={() => toggleSection('bookings')}>
                <Icon name="calendar" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Reservas</Text>
                <Text style={profS.menuCount}>{liveBookings.length}</Text>
              </TouchableOpacity>
              <View style={profS.menuRow}>
                <Icon name="check" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Check-ins realizados</Text>
                <Text style={profS.menuCount}>{stats?.checkIns ?? 0}</Text>
              </View>
            </View>

            <View style={profS.divider} />

            {/* Conta */}
            <View style={profS.section}>
              <Text style={profS.sectionTitle}>Conta</Text>
              <TouchableOpacity style={profS.menuRow} activeOpacity={0.7} onPress={() => toggleSection('editProfile')}>
                <Icon name="user" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Editar Perfil</Text>
                <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity style={profS.menuRow} activeOpacity={0.7} onPress={() => toggleSection('help')}>
                <Icon name="helpCircle" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Ajuda e suporte</Text>
                <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>
              {expandedSection === 'help' && (
                <View style={profAccS.accordion}>
                  {[
                    ['Como reservar um negócio?', 'Abre o negócio, ativa o módulo desejado e segue os passos de reserva.'],
                    ['Como editar o meu perfil?', 'Clica em "Editar Perfil" acima para alterar o teu nome.'],
                    ['Como contactar o suporte?', 'Envia um email para suporte@achaqui.ao'],
                    ['Como desativar a minha conta?', 'Contacta o suporte para desativar a conta permanentemente.'],
                  ].map(([q, a], i) => (
                    <View key={i} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.grayLine }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.darkText, marginBottom: 4 }}>{q}</Text>
                      <Text style={{ fontSize: 13, color: COLORS.grayText, lineHeight: 18 }}>{a}</Text>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity style={profS.menuRow} activeOpacity={0.7} onPress={() => toggleSection('about')}>
                <Icon name="info" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Sobre AchAqui</Text>
                <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>
              {expandedSection === 'about' && (
                <View style={profAccS.accordion}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.darkText, marginBottom: 4 }}>Versão 3.0.0</Text>
                  <Text style={{ fontSize: 13, color: COLORS.grayText, lineHeight: 18, marginBottom: 8 }}>
                    AchAqui é uma plataforma angolana para descobrir, reservar e gerir negócios locais.
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.grayText }}>© 2026 AchAqui. Todos os direitos reservados.</Text>
                </View>
              )}
            </View>

            <View style={profS.divider} />

            {/* Modo Dono — só para OWNER */}
            {isOwner && !isBusinessMode && (
              <View style={profS.section}>
                <TouchableOpacity
                  style={bizS.premiumCard} activeOpacity={0.8}
                  onPress={() => { onSetActiveNavTab('home'); setActiveBusinessTab('dashboard'); onToggleOwnerMode(); }}
                >
                  <View style={bizS.premiumCardContent}>
                    <View style={bizS.premiumIcon}><Text style={{ fontSize: 32 }}>👑</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={bizS.premiumTitle}>Gerir o meu Negócio</Text>
                      <Text style={bizS.premiumDesc}>Aceda ao Dashboard e gerencie o seu negócio</Text>
                    </View>
                    <Icon name="arrowRight" size={24} color={COLORS.white} strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Logout */}
            <View style={profS.section}>
              <TouchableOpacity
                style={guestS.logoutBtn} activeOpacity={0.8}
                onPress={() => Alert.alert('Terminar sessão', 'Tens a certeza que queres sair?', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Sair', style: 'destructive', onPress: onLogout },
                ])}
              >
                <Icon name="x" size={18} color="#B00020" strokeWidth={2.5} />
                <Text style={guestS.logoutTxt}>Terminar sessão</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// guestS — Estilos da vista de convidado no ProfileTab
const guestS = StyleSheet.create({
  wrap:          { paddingHorizontal: 24, paddingTop: 8 },
  avatarWrap:    { alignItems: 'center', marginBottom: 20, marginTop: 8 },
  title:         { fontSize: 24, fontWeight: '700', color: '#111111', textAlign: 'center', marginBottom: 8, letterSpacing: -0.4 },
  subtitle:      { fontSize: 14, color: '#8A8A8A', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#D32323', borderRadius: 14, paddingVertical: 15, marginBottom: 10,
  },
  loginBtnTxt:   { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  registerBtn: {
    borderWidth: 1.5, borderColor: '#D32323', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginBottom: 24,
  },
  registerBtnTxt: { color: '#D32323', fontSize: 15, fontWeight: '700' },
  dividerRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  dividerLine:   { flex: 1, height: 1, backgroundColor: '#EBEBEB' },
  dividerTxt:    { fontSize: 12, color: '#8A8A8A', fontWeight: '500' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#FFCDD2', borderRadius: 14,
    paddingVertical: 14, backgroundColor: '#FFF5F5',
  },
  logoutTxt:     { color: '#B00020', fontSize: 15, fontWeight: '700' },
});

// profAccS — Estilos dos acordeões do ProfileTab
const profAccS = StyleSheet.create({
  accordion:       { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F7F7F8', marginBottom: 4 },
  emptyTxt:        { fontSize: 13, color: '#8A8A8A', textAlign: 'center', paddingVertical: 16 },
  reviewItem:      { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  reviewBiz:       { fontSize: 14, fontWeight: '700', color: '#111111', marginBottom: 2 },
  reviewStars:     { fontSize: 14, color: '#D32323', marginBottom: 2 },
  reviewComment:   { fontSize: 13, color: '#444444', lineHeight: 18, marginBottom: 4 },
  reviewDate:      { fontSize: 11, color: '#8A8A8A' },
  bookmarkItem:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EBEBEB', gap: 12 },
  bookmarkPhoto:   { width: 56, height: 56, borderRadius: 8, backgroundColor: '#EBEBEB', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bookmarkName:    { fontSize: 14, fontWeight: '700', color: '#111111', marginBottom: 2 },
  bookmarkMeta:    { fontSize: 12, color: '#8A8A8A' },
  bookmarkAddr:    { fontSize: 11, color: '#8A8A8A', marginTop: 2 },
  bookingItem:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EBEBEB', gap: 12 },
  bookingBiz:      { fontSize: 14, fontWeight: '700', color: '#111111', marginBottom: 2 },
  bookingDates:    { fontSize: 12, color: '#8A8A8A' },
  statusBadge:     { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusBadgeTxt:  { fontSize: 11, fontWeight: '700' },
  fieldLabel:      { fontSize: 12, fontWeight: '600', color: '#8A8A8A', marginBottom: 4, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  textInput:       { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111111', borderWidth: 1.5, borderColor: '#EBEBEB', marginBottom: 4 },
  readonlyField:   { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1.5, borderColor: '#EBEBEB', marginBottom: 4 },
  readonlyTxt:     { fontSize: 15, color: '#8A8A8A' },
  saveBtn: {
    backgroundColor: '#D32323', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 12, marginBottom: 4,
  },
  saveBtnTxt:      { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  feedbackMsg:     { fontSize: 13, color: '#22A06B', textAlign: 'center', marginTop: 4 },
});
