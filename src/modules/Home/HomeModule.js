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

import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Image, ImageBackground, TextInput,
  Dimensions, Keyboard, Alert,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
}) {
  const b = business;
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
// HOME MODULE — componente principal exportado
// ─────────────────────────────────────────────────────────────────────────────
export function HomeModule({
  // Dados
  businesses = [],
  featuredBusinesses = [],
  onSelectBusiness,

  // Do hook useBusinessFilters
  searchWhat = '',          setSearchWhat = () => {},
  searchWhere = 'Talatona, Luanda', setSearchWhere = () => {},
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
}) {
  // ── Refs do carousel ──────────────────────────────────────────────────────
  const carouselRef   = useRef(null);
  const carouselIndex = useRef(0);
  const [carouselActiveIndex, setCarouselActiveIndex] = useState(0);

  const unreadNotifs = notifications.filter(n => !n.read).length;

  const SPONSORED = useMemo(
    () => (featuredBusinesses.length > 0 ? featuredBusinesses : businesses)
      .filter(b => b.isPublic !== false && b.id !== OWNER_BUSINESS.id)
      .filter(b => b.isPremium || b.promo)
      .slice(0, 5),
    [featuredBusinesses, businesses],
  );

  useEffect(() => {
    carouselIndex.current = 0;
    setCarouselActiveIndex(0);

    if (SPONSORED.length <= 1) return undefined;

    const timer = setInterval(() => {
      const next = (carouselIndex.current + 1) % SPONSORED.length;
      carouselIndex.current = next;
      setCarouselActiveIndex(next);
      carouselRef.current?.scrollTo?.({ x: next * SCREEN_WIDTH, animated: true });
    }, 3000);

    return () => clearInterval(timer);
  }, [SPONSORED]);

  // ── RENDER HEADER ─────────────────────────────────────────────────────────
  const renderHeader = () => (
    <View style={hS.headerWrapper}>
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
                value={searchWhat}
                onChangeText={t => { setSearchWhat(t); setShowAutocomplete(t.length > 0); }}
                onFocus={() => setShowAutocomplete(true)}
                onSubmitEditing={() => {
                  if (searchWhat.trim()) {
                    saveRecentSearch(searchWhat.trim());
                    setShowAutocomplete(false);
                    Keyboard.dismiss();
                  }
                }}
                returnKeyType="search"
              />
              {showAutocomplete && (
                <TouchableOpacity
                  onPress={() => { setShowAutocomplete(false); setSearchWhat(''); Keyboard.dismiss(); }}
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

      {/* Autocomplete dropdown */}
      {showAutocomplete && (
        <>
          <TouchableOpacity style={acS.backdrop} activeOpacity={1} onPress={() => setShowAutocomplete(false)} />
          <View style={acS.absoluteDropdown}>
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

  // ── RENDER HOME (scroll + lista) ──────────────────────────────────────────
  const renderHome = () => (
    <ScrollView
      style={hS.scroll}
      contentContainerStyle={hS.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Carousel patrocinado */}
      {SPONSORED.length > 0 && (
        <View style={hS.carouselSection}>
          <View style={hS.carouselHeader}>
            <Text style={hS.carouselTitle}>✦ Em Destaque</Text>
            <View style={hS.carouselDots}>
              {SPONSORED.map((_, i) => (
                <View key={i} style={[hS.carouselDot, i === carouselActiveIndex && hS.carouselDotActive]} />
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
              carouselIndex.current = idx; setCarouselActiveIndex(idx);
            }}
          >
            {SPONSORED.map(b => (
              <View key={b.id} style={hS.carouselItem}>
                <SponsoredCard business={b} onPress={() => onSelectBusiness(b)} />
              </View>
            ))}
          </ScrollView>
        </View>
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
        <Text style={hS.sectionCount}>({businesses.length} resultados)</Text>
      </View>

      {/* Business list */}
      {businesses.map(b => (
        <BusinessListCell
          key={b.id}
          business={b}
          bookmarked={bookmarkedIds.includes(b.id)}
          isComparing={compareList.includes(b.id)}
          onPress={onSelectBusiness}
          onToggleBookmark={onToggleBookmark}
          onToggleCompare={toggleCompare}
        />
      ))}
    </ScrollView>
  );

  // ── MAIN RENDER ───────────────────────────────────────────────────────────
  return (
    <View style={hS.container}>
      {renderHeader()}
      {renderHome()}
    </View>
  );
}


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

  if (activeNavTab === 'home') return <HomeModule {...rest} />;
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
      authUser={props.authUser}
      onLogin={props.onLogin}
      onLogout={props.onLogout}
      onOpenClaimFlow={props.onOpenClaimFlow}
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
const USER_PROFILE_DEFAULT = {
  id: 'user_001', name: 'João Silva', email: 'joao.silva@email.ao',
  location: 'Luanda, Angola', memberSince: 'Janeiro 2024', avatar: null,
  stats: { businessesViewed: 127, reviewsWritten: 23, checkIns: 45, photosUploaded: 156, favoritesSaved: 34, achievementsUnlocked: 12 },
};

function ProfileTab({
  businesses = [], onSelectBusiness,
  bookmarkedIds = [], onToggleBookmark = () => {},
  insets = { top: 0, bottom: 0 },
  onSetActiveNavTab = () => {},
  onToggleOwnerMode = () => {},
  setActiveBusinessTab = () => {},
  USER_PROFILE = USER_PROFILE_DEFAULT,
  isBusinessMode = false,
  // ── Auth real ──
  authUser = null,          // { id, name, email, role } | null se não logado
  onLogin = () => {},       // abre AuthModal
  onLogout = () => {},      // termina sessão
  onOpenClaimFlow = () => {}, // abre ClaimFlow (adicionar/reclamar negócio)
}) {
  return (
<View style={[profS.overlay, { 
          top: insets.top,
          bottom: (insets.bottom || 0) + 58.5
        }]}>
          {/* Header with close button */}
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={()=>onSetActiveNavTab('home')}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={{width:32}} />
          </View>

          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>

            {/* ── Não logado: CTA login ── */}
            {!authUser && (
              <View style={profAuthS.guestBox}>
                <View style={profAuthS.guestAvatar}>
                  <Icon name="user" size={40} color={COLORS.grayText} strokeWidth={1.5} />
                </View>
                <Text style={profAuthS.guestTitle}>Bem-vindo ao AcheiAqui</Text>
                <Text style={profAuthS.guestDesc}>
                  Entra na tua conta para guardar favoritos, adicionar negócios e muito mais.
                </Text>
                <TouchableOpacity style={profAuthS.loginBtn} onPress={onLogin} activeOpacity={0.85}>
                  <Text style={profAuthS.loginBtnText}>Entrar / Criar conta</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Top Section: Avatar + Name + Stats */}
            {!!authUser && (
            <View style={profS.topSection}>
              <View style={profS.avatarContainer}>
                <View style={profS.avatarLarge}>
                  <Icon name="user" size={64} color={COLORS.grayText} strokeWidth={1.5} />
                </View>
              </View>
              <Text style={profS.userName}>{authUser?.name || USER_PROFILE.name}</Text>
              {/* Stats Badges */}
              <View style={profS.statsBadges}>
                <View style={profS.statBadge}>
                  <Icon name="messageSquare" size={14} color={COLORS.darkText} strokeWidth={2} />
                  <Text style={profS.statBadgeText}>{USER_PROFILE.stats.reviewsWritten}</Text>
                </View>
                <View style={profS.statBadge}>
                  <Icon name="camera" size={14} color={COLORS.darkText} strokeWidth={2} />
                  <Text style={profS.statBadgeText}>{USER_PROFILE.stats.photosUploaded}</Text>
                </View>
                <View style={profS.statBadge}>
                  <Icon name="users" size={14} color={COLORS.darkText} strokeWidth={2} />
                  <Text style={profS.statBadgeText}>0</Text>
                </View>
              </View>
            </View>
            )}

            {/* Action Buttons Grid */}
            <View style={profS.actionGrid}>
              <TouchableOpacity
                style={profS.actionButton}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Avaliações', 'Abra um negócio para avaliar.')}
              >
                <View style={profS.actionIcon}>
                  <Icon name="star" size={22} color={COLORS.darkText} strokeWidth={2} />
                </View>
                <Text style={profS.actionLabel}>Avaliação</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={profS.actionButton}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Fotos e vídeos', 'Abra um negócio para adicionar conteúdo.')}
              >
                <View style={profS.actionIcon}>
                  <Icon name="camera" size={22} color={COLORS.darkText} strokeWidth={2} />
                </View>
                <Text style={profS.actionLabel}>Fotos e vídeos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={profS.actionButton}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Check-in', 'Abra um negócio para fazer check-in.')}
              >
                <View style={profS.actionIcon}>
                  <Icon name="checkCircle" size={22} color={COLORS.darkText} strokeWidth={2} fill={COLORS.darkText} />
                </View>
                <Text style={profS.actionLabel}>Check-in</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={profS.actionButton}
                activeOpacity={0.7}
                onPress={() => {
                  if (!authUser) { onLogin(); return; }
                  onOpenClaimFlow();
                }}
              >
                <View style={profS.actionIcon}>
                  <Icon name="plusSquare" size={22} color={COLORS.darkText} strokeWidth={2} />
                </View>
                <Text style={profS.actionLabel}>Adicionar negócio</Text>
              </TouchableOpacity>
            </View>

            <View style={profS.divider} />

            {/* Visualizados Recentemente - com fotos reais */}
            <View style={profS.section}>
              <Text style={profS.sectionTitle}>Visualizados recentemente</Text>
              {businesses.filter(b => bookmarkedIds.includes(b.id)).slice(0, 5).map((business) => (
                <TouchableOpacity 
                  key={business.id} 
                  style={profS.recentlyViewedCard}
                  activeOpacity={0.7}
                  onPress={()=>{ onSetActiveNavTab('home'); onSelectBusiness(business); }}
                >
                  <View style={profS.recentlyViewedPhoto}>
                    {business.photos?.[0] ? (
                      <Image source={{ uri: business.photos[0] }} style={profS.recentlyViewedPhotoImage} resizeMode="cover" />
                    ) : business.icon ? (
                      <Text style={profS.recentlyViewedIcon}>{business.icon}</Text>
                    ) : (
                      <View style={{width:'100%',height:'100%',backgroundColor:COLORS.grayBg}} />
                    )}
                  </View>
                  <View style={profS.recentlyViewedInfo}>
                    <Text style={profS.recentlyViewedName}>{business.name}</Text>
                    <Text style={profS.recentlyViewedAddress}>{business.address || business.subcategory}</Text>
                    <Text style={profS.recentlyViewedMeta}>{business.subcategory} • {business.distanceText}</Text>
                  </View>
                  <Icon name="bookmark" size={22} color={COLORS.darkText} strokeWidth={2} fill={bookmarkedIds.includes(business.id) ? COLORS.darkText : 'none'} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={profS.divider} />

            {/* Contribuições */}
            <View style={profS.section}>
              <Text style={profS.sectionTitle}>Contribuições</Text>
              <TouchableOpacity
                style={profS.menuRow}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Avaliações', 'Aqui ficará o histórico das suas avaliações.')}
              >
                <Icon name="star" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Avaliações</Text>
                <Text style={profS.menuCount}>{USER_PROFILE.stats.reviewsWritten}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={profS.menuRow}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Negócios adicionados', 'Funcionalidade disponível em breve.')}
              >
                <Icon name="plusSquare" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Negócios adicionados</Text>
                <Text style={profS.menuCount}>0</Text>
              </TouchableOpacity>
            </View>

            <View style={profS.divider} />

            {/* Sua Atividade */}
            <View style={profS.section}>
              <Text style={profS.sectionTitle}>Sua atividade</Text>
              <TouchableOpacity style={profS.menuRow} activeOpacity={0.7} onPress={()=>Alert.alert('Reservas','Histórico de reservas.')}>
                <Icon name="calendar" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Reservas</Text>
                <Text style={profS.menuCount}>3</Text>
              </TouchableOpacity>
            </View>

            <View style={profS.divider} />

            {/* Conta */}
            <View style={profS.section}>
              <Text style={profS.sectionTitle}>Conta</Text>
              <TouchableOpacity
                style={profS.menuRow}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Preferências', 'Configuração de preferências disponível em breve.')}
              >
                <Icon name="heart" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Preferências</Text>
                <Icon name="chevronRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={profS.menuRow}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Perfil', 'Edição de perfil será disponibilizada nesta secção.')}
              >
                <Icon name="user" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Perfil</Text>
                <Icon name="chevronRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={profS.menuRow}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Ajuda e suporte', 'Centro de ajuda será integrado em breve.')}
              >
                <Icon name="helpCircle" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Ajuda e suporte</Text>
                <Icon name="chevronRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={profS.menuRow}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Configurações', 'Configurações avançadas serão adicionadas em breve.')}
              >
                <Icon name="settings" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Configurações</Text>
                <Icon name="chevronRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={profS.menuRow}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Sobre AchAqui', 'AchAqui v2. Informações detalhadas em breve.')}
              >
                <Icon name="info" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Sobre AchAqui</Text>
                <Icon name="chevronRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={profS.divider} />

            {/* Business Mode Trigger — v2.7.0 FASE 3 */}
            {!isBusinessMode && authUser?.role === 'OWNER' && (
              <View style={profS.section}>
                <TouchableOpacity 
                  style={bizS.premiumCard}
                  activeOpacity={0.8}
                  onPress={()=>{
                    onSetActiveNavTab('home');
                    setActiveBusinessTab('dashboard');
                    onToggleOwnerMode();
                  }}
                >
                  <View style={bizS.premiumCardContent}>
                    <View style={bizS.premiumIcon}>
                      <Text style={{fontSize:32}}>👑</Text>
                    </View>
                    <View style={{flex:1}}>
                      <Text style={bizS.premiumTitle}>Gerir o meu Negócio</Text>
                      <Text style={bizS.premiumDesc}>Aceda ao Dashboard e gerencie seu negócio</Text>
                    </View>
                    <Icon name="chevronRight" size={24} color={COLORS.white} strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Logout */}
            {!!authUser && (
              <View style={[profS.section, {paddingTop: 0}]}>
                <TouchableOpacity
                  style={profAuthS.logoutBtn}
                  onPress={onLogout}
                  activeOpacity={0.7}
                >
                  <Icon name="logOut" size={18} color={'#D32323'} strokeWidth={2} />
                  <Text style={profAuthS.logoutBtnText}>Terminar sessão</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>


  // ── NAV BAR ───────────────────────────────────────────────────────────────
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// profAuthS — Auth states inside ProfileTab
// ─────────────────────────────────────────────────────────────────────────────
const profAuthS = StyleSheet.create({
  guestBox: {
    alignItems: 'center', paddingHorizontal: 32, paddingVertical: 40,
  },
  guestAvatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: COLORS.grayBg, alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, borderWidth: 2, borderColor: COLORS.grayLine,
  },
  guestTitle: {
    fontSize: 22, fontWeight: '700', color: COLORS.darkText,
    marginBottom: 10, textAlign: 'center', letterSpacing: -0.4,
  },
  guestDesc: {
    fontSize: 14, color: COLORS.grayText, textAlign: 'center',
    lineHeight: 20, marginBottom: 24,
  },
  loginBtn: {
    backgroundColor: COLORS.red, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 36,
    alignItems: 'center',
  },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#FFCDD2', backgroundColor: '#FFF5F5',
  },
  logoutBtnText: { fontSize: 15, fontWeight: '600', color: '#D32323' },
});