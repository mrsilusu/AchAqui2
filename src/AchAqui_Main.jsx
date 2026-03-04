/**
 * ============================================================================
 * ACHAQUI MAIN  (v3.0.0 — Fase 3.5: Orquestrador Final)
 * ============================================================================
 * Ficheiro < 300 linhas. Responsabilidades únicas:
 *   1. AppProvider + contexto
 *   2. Dados globais (businesses, bookmarks, notifications)
 *   3. Hook useBusinessFilters → filteredBusinesses
 *   4. Hook useMetaAnimation  → swipeProgress, homeAnimatedStyle, appLayers
 *   5. Interruptor isBusinessMode: <HomeModuleFull> | <OwnerModule>
 *   6. BottomNavBar inline
 *   7. SortModal + AdvancedFiltersModal
 *   8. AppLayers (allCategories, notifications)
 *   9. BusinessDetailModal
 * ============================================================================
 */

import React, {
  useState, useCallback, useEffect,
} from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  SafeAreaView, StyleSheet, Animated, Alert,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  Icon, COLORS, AppProvider,
  ALL_CATEGORIES, ALL_CAT_LABEL, ALL_CAT_ICON,
  OWNER_BUSINESS, SORT_OPTIONS, NAV_BAR_STYLES,
} from './core/AchAqui_Core';
import { BusinessDetailModal }  from './modules/Detail/BusinessDetailModal';
import { useOperationalLayer }  from './hooks/useOperationalLayer';
import { OperationalLayerRenderer } from './shared/Modals/OperationalLayerRenderer';
import { OwnerModule }          from './modules/Owner/OwnerModule';
import { HomeModuleFull }       from './modules/Home/HomeModule';
import { AdvancedFiltersModal } from './modules/Home/AdvancedFiltersModal';
import { useBusinessFilters }   from './hooks/useBusinessFilters';
import { useMetaAnimation }     from './hooks/useMetaAnimation';
import { useAuthSession } from './hooks/useAuthSession';
import { useLiveSync } from './hooks/useLiveSync';

import { sortS } from './styles/Main.styles';

const USER_PROFILE = { id:'user_001', name:'João Silva', email:'joao.silva@email.ao', location:'Luanda, Angola', memberSince:'Janeiro 2024', avatar:null, stats:{businessesViewed:127,reviewsWritten:23,checkIns:45,photosUploaded:156,favoritesSaved:34,achievementsUnlocked:12} };

const MOCK_BUSINESSES_INITIAL = [
  {
    id:'1', name:'Pizzaria Bela Vista', category:'Restaurante Italiano', subcategory:'Pizza, Massa, Italiana',
    businessType:'food', primaryCategoryId:'restaurants', subCategoryIds:['food','nightlife','hotelsTravel'],
    icon:'🍕', rating:4.8, reviews:120, priceLevel:2, isPremium:true, verifiedBadge:true, isVerified:true,
    modules:{gastronomy:true,accommodation:true,retail:true,customorder:true,delivery:true},
    address:'Rua Comandante Valodia, 123, Talatona', neighborhood:'Talatona, Luanda',
    phone:'+244 923 456 789', website:'https://pizzariabelavista.ao',
    promo:'20% OFF em pizzas grandes', distance:0.85, distanceText:'850m',
    isOpen:true, statusText:'Aberto ate 23:00', isPublic:true,
    latitude:-8.8388, longitude:13.2894,
    photos:['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800','https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800'],
    amenities:['wifi','parking','delivery','outdoor','wheelchair'],
    deals:[{id:'d1',title:'20% OFF Pizzas Grandes',description:'Válido Seg-Qui',expires:'2026-02-28',code:'PIZZA20'}],
    popularDishes:[{name:'Pizza Margherita',price:'3.500 Kz',orders:156},{name:'Carbonara',price:'4.200 Kz',orders:89}],
    roomTypes:[{id:'1',name:'Quarto Standard',pricePerNight:12000,maxGuests:2,amenities:['wifi','ac'],totalRooms:5,minNights:1,taxRate:14,weekendMultiplier:1.2,bookedRanges:[],seasonalRates:[],available:true}],
  },
  {
    id:'2', name:'Farmacia Sao Pedro', category:'Farmacia', subcategory:'Medicamentos, Saude',
    businessType:'health', primaryCategoryId:'health', subCategoryIds:['health'],
    icon:'💊', rating:4.5, reviews:85, priceLevel:1,
    address:'Avenida 4 de Fevereiro, 567, Maianga', phone:'+244 923 789 456',
    distance:1.2, distanceText:'1.2km', isOpen:true, statusText:'Aberto 24 horas', isPublic:true,
    photos:['https://images.unsplash.com/photo-1576602975921-8c18f8b4c8b0?w=800'],
    amenities:['delivery','wheelchair'], modules:{health:true},
    popularDishes:[],
  },
  {
    id:'3', name:'Supermercado Kero', category:'Supermercado', subcategory:'Alimentacao, Bebidas',
    businessType:'retail', primaryCategoryId:'shopping', subCategoryIds:['shopping','food'],
    icon:'🛒', rating:4.7, reviews:203, priceLevel:2, promo:'Promocao fim de semana',
    address:'Rua Rainha Ginga, 89, Maculusso', phone:'+244 923 321 654',
    distance:2.1, distanceText:'2.1km', isOpen:true, statusText:'Aberto ate 20:00', isPublic:true,
    photos:['https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800'],
    amenities:['parking','wifi','delivery'], modules:{retail:true,delivery:true},
    popularDishes:[],
  },
  {
    id:'4', name:'Cafe Atlantico', category:'Cafe & Bar', subcategory:'Cafe, Pastelaria, Brunch',
    businessType:'food', primaryCategoryId:'coffee', subCategoryIds:['coffee','bars'],
    icon:'☕', rating:4.6, reviews:156, priceLevel:2,
    address:'Avenida Marginal, 45, Ilha de Luanda', phone:'+244 923 111 222',
    distance:1.5, distanceText:'1.5km', isOpen:true, statusText:'Aberto ate 22:00', isPublic:true,
    photos:['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800'],
    amenities:['wifi','outdoor'], modules:{gastronomy:true},
    popularDishes:[{name:'Cappuccino',price:'800 Kz',orders:234},{name:'Croissant',price:'600 Kz',orders:189}],
  },
  {
    id:'5', name:'Restaurante Tempero Africano', category:'Restaurante Angolano', subcategory:'Culinaria Angolana, Africana',
    businessType:'food', primaryCategoryId:'restaurants', subCategoryIds:['food','localflavor'],
    icon:'🍲', rating:4.9, reviews:234, priceLevel:3, isPremium:true, isVerified:true,
    address:'Largo do Kinaxixi, 12, Luanda', phone:'+244 923 777 888',
    distance:3.2, distanceText:'3.2km', isOpen:true, statusText:'Aberto ate 22:00', isPublic:true,
    photos:['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'],
    amenities:['wifi','parking','outdoor'], modules:{gastronomy:true},
    popularDishes:[{name:'Muamba de Galinha',price:'5.500 Kz',orders:312}],
  },
  {
    id:'6', name:'Barbearia Style Premium', category:'Barbearia', subcategory:'Cortes, Barba, Tratamentos',
    businessType:'beauty', primaryCategoryId:'beautysalons', subCategoryIds:['beauty','localservices'],
    icon:'✂️', rating:4.9, reviews:78, priceLevel:2,
    address:'Kilamba, Bloco C12', phone:'+244 923 444 555',
    distance:1.5, distanceText:'1.5km', isOpen:true, statusText:'Aberto ate 20:00', isPublic:true,
    photos:['https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800'],
    amenities:['wifi','appointment'], modules:{health:true},
    popularDishes:[],
  },
  {
    id:'7', name:'Studio Design Criativo', category:'Freelancer', subcategory:'Design Grafico, Branding',
    businessType:'freelancer', primaryCategoryId:'professional', subCategoryIds:['arts','professional'],
    icon:'🎨', rating:4.4, reviews:32, priceLevel:3,
    address:'Online / Luanda', phone:'+244 923 999 000',
    distance:5.2, distanceText:'5.2km', isOpen:true, statusText:'Disponivel agora', isPublic:true,
    photos:['https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800'],
    amenities:['portfolio','online'], modules:{professional:true,customorder:true},
    popularDishes:[],
  },
  {
    id:'8', name:'FitCoach Angola - Personal Training', category:'Fitness', subcategory:'Personal Trainer, Nutricao',
    businessType:'health', primaryCategoryId:'active', subCategoryIds:['health','active'],
    icon:'💪', rating:4.8, reviews:94, priceLevel:2, promo:'Primeira aula gratis',
    address:'Talatona Sports Center', phone:'+244 923 777 666',
    distance:1.1, distanceText:'1.1km', isOpen:true, statusText:'Aberto ate 21:00', isPublic:true,
    photos:['https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800'],
    amenities:['certified','online'], modules:{health:true},
    popularDishes:[],
  },
  {
    id:'9', name:'Dr. Carlos Mendes - Advogado', category:'Servicos Juridicos', subcategory:'Direito Civil, Empresarial',
    businessType:'professional', primaryCategoryId:'professional', subCategoryIds:['professional','financial'],
    icon:'⚖️', rating:4.7, reviews:52, priceLevel:4,
    address:'Edificio Atlas, Av. 4 de Fevereiro', phone:'+244 923 555 444',
    distance:2.5, distanceText:'2.5km', isOpen:true, statusText:'Aberto ate 17:00', isPublic:true,
    photos:['https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800'],
    amenities:['certified','appointment','parking'], modules:{professional:true},
    popularDishes:[],
  },
  {
    id:'10', name:'English Pro - Explicacoes', category:'Educacao', subcategory:'Ingles, Preparacao Exames',
    businessType:'education', primaryCategoryId:'education', subCategoryIds:['education','localservices'],
    icon:'📚', rating:4.9, reviews:128, priceLevel:2, promo:'Aula experimental gratis',
    address:'Maianga, Luanda', phone:'+244 923 222 333',
    distance:1.8, distanceText:'1.8km', isOpen:true, statusText:'Disponivel agora', isPublic:true,
    photos:['https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800'],
    amenities:['online','certified'], modules:{education:true},
    popularDishes:[],
  },
  {
    id:'11', name:'Miguel Santos - Fotografo Profissional', category:'Freelancer', subcategory:'Fotografia, Eventos',
    businessType:'freelancer', primaryCategoryId:'arts', subCategoryIds:['arts','professional'],
    icon:'📸', rating:5.0, reviews:89, priceLevel:3,
    address:'Atendimento em todo Luanda', phone:'+244 923 111 000',
    distance:0, distanceText:'Flexivel', isOpen:true, statusText:'Aceita reservas', isPublic:true,
    photos:['https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800'],
    amenities:['portfolio','professional'], modules:{professional:true},
    popularDishes:[],
  },
];

export default function AchAquiMain() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </SafeAreaProvider>
  );
}

function BottomNavBar({ isBusinessMode, activeNavTab, activeBusinessTab, insets, onTabPress }) {
  const tabs = isBusinessMode
    ? [{id:'dashboard',icon:'analytics',label:'Dashboard'},{id:'notifications',icon:'bell',label:'Notificações'},{id:'mybusiness',icon:'briefcase',label:'Meu Negócio'},{id:'exitbusiness',icon:'x',label:'Sair'}]
    : [{id:'home',icon:'outdoor',label:'Início'},{id:'search',icon:'search',label:'Pesquisar'},{id:'featured',icon:'diamond4',label:'Destaque'},{id:'profile',icon:'user',label:'Perfil'}];
  return (
    <View style={[NAV_BAR_STYLES.bar, { paddingBottom: insets.bottom + 8 }]}>
      {tabs.map(tab => {
        const active = isBusinessMode ? activeBusinessTab === tab.id : activeNavTab === tab.id;
        return (
          <TouchableOpacity key={tab.id} style={NAV_BAR_STYLES.tab} activeOpacity={0.7} onPress={() => onTabPress(tab.id)}>
            <View style={[NAV_BAR_STYLES.iconWrap, active && NAV_BAR_STYLES.iconWrapActive]}>
              <Icon name={tab.icon} size={22} color={active ? COLORS.red : COLORS.grayText} strokeWidth={active ? 2.5 : 1.5} />
            </View>
            <Text style={[NAV_BAR_STYLES.label, active && NAV_BAR_STYLES.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const authSession = useAuthSession();
  const liveSync = useLiveSync({
    user: authSession.user,
    accessToken: authSession.accessToken,
  });

  // ── Dados globais ──────────────────────────────────────────────────────────
  const [businesses, setBusinesses] = useState([OWNER_BUSINESS, ...(MOCK_BUSINESSES_INITIAL || [])]);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const fallbackNotifications = [{id:'n1',title:'Nova oferta!',message:'Pizzaria Bela Vista: 20% OFF',time:'5 min atrás',read:false},{id:'n2',title:'Reserva confirmada',message:'Personal Trainer amanhã às 10h',time:'1h atrás',read:false}];
  const notifications = authSession.user ? liveSync.notifications : fallbackNotifications;
  const [locationPermission, setLocationPermission] = useState('denied');
  // ── Navegação ──────────────────────────────────────────────────────────────
  const [isBusinessMode, setIsBusinessMode]   = useState(false);
  const [activeNavTab, setActiveNavTab]         = useState('home');
  const [activeBusinessTab, setActiveBusinessTab] = useState('dashboard');

  // ── Business detail ────────────────────────────────────────────────────────
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const selectedBusiness = selectedBusinessId ? businesses.find(b => b.id === selectedBusinessId) ?? null : null;

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const filters = useBusinessFilters(businesses, isBusinessMode);
  const meta    = useMetaAnimation({ showDetail });
  const layer   = useOperationalLayer(); // Nível 2 — módulos operacionais

  // ── Helpers ────────────────────────────────────────────────────────────────
  const updateOwnerBiz = useCallback((fields) => {
    setBusinesses(prev => prev.map(b => b.id === OWNER_BUSINESS.id ? { ...b, ...fields } : b));
  }, []);

  const syncPromoDeals = useCallback((updatedPromotions) => {
    const deals = updatedPromotions.filter(p => p.active).map(p => ({
      id: p.id, title: p.title, description: p.description || '',
      expires: p.endDate || '', code: p.type === 'percent' ? `${p.discount}%OFF` : `${p.discount}KZ`,
    }));
    const activePromo = updatedPromotions.find(p => p.active);
    OWNER_BUSINESS.promo = activePromo ? activePromo.title : null;
    updateOwnerBiz({ deals, promo: activePromo ? activePromo.title : null });
  }, [updateOwnerBiz]);

  const toggleBookmark = useCallback(async (id) => {
    setBookmarkedIds(prev => {
      const u = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      AsyncStorage.setItem('bookmarks', JSON.stringify(u)).catch(() => {});
      return u;
    });
  }, []);

  const handleBusinessPress = useCallback((b) => {
    meta.swipeProgress.setValue(0);
    setSelectedBusinessId(b.id);
    setShowDetail(true);
  }, [meta.swipeProgress]);

  const requestLocationPermission = () => {
    Alert.alert('Permitir Localização', 'AchAqui precisa da sua localização.', [
      { text: 'Não Permitir', onPress: () => setLocationPermission('denied')  },
      { text: 'Permitir',     onPress: () => setLocationPermission('granted') },
    ]);
  };

  useEffect(() => {
    AsyncStorage.getItem('bookmarks').then(s => s && setBookmarkedIds(JSON.parse(s))).catch(() => {});
  }, []);

  const handleTabPress = useCallback((tabId) => {
    if (tabId === 'exitbusiness') { setIsBusinessMode(false); setActiveNavTab('home'); return; }
    if (isBusinessMode) setActiveBusinessTab(tabId);
    else setActiveNavTab(tabId);
  }, [isBusinessMode]);

  const handleToggleOwnerMode = useCallback(() => {
    if (!authSession.isOwner) {
      Alert.alert('Acesso restrito', 'Apenas utilizadores com perfil OWNER podem entrar no modo Dono.');
      return;
    }

    setIsBusinessMode((current) => !current);
  }, [authSession.isOwner]);

  useEffect(() => {
    if (!authSession.isOwner && isBusinessMode) {
      setIsBusinessMode(false);
      setActiveNavTab('home');
    }
  }, [authSession.isOwner, isBusinessMode]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
      {/* ── HOME / OWNER — animado pelo Meta pattern ─── */}
      <Animated.View style={meta.homeAnimatedStyle}>
        <View style={{ flex: 1, backgroundColor: '#F7F7F8' }}>

          {/* Cliente: todas as tabs via HomeModuleFull */}
          {!isBusinessMode && (
            <HomeModuleFull
              {...filters}
              activeNavTab={activeNavTab}
              onSetActiveNavTab={setActiveNavTab}
              onSetIsBusinessMode={setIsBusinessMode}
              setActiveBusinessTab={setActiveBusinessTab}
              USER_PROFILE={USER_PROFILE}
              businesses={filters.filteredBusinesses}
              featuredBusinesses={businesses}
              onSelectBusiness={handleBusinessPress}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={toggleBookmark}
              notifications={notifications}
              onOpenAppLayer={meta.openAppLayer}
              onToggleOwnerMode={handleToggleOwnerMode}
              isBusinessMode={isBusinessMode}
              locationPermission={locationPermission}
              onRequestLocation={requestLocationPermission}
              onOpenSortModal={() => filters.setShowSortModal(true)}
              onOpenFilters={() => filters.setShowAdvancedFilters(true)}
              insets={insets}
            />
          )}

          {/* Dono */}
          {isBusinessMode && (
            <OwnerModule
              businesses={businesses}
              activeBusinessTab={activeBusinessTab}
              setActiveBusinessTab={setActiveBusinessTab}
              insets={insets}
              onUpdateBusiness={updateOwnerBiz}
              onSyncPromoDeals={syncPromoDeals}
              onExitOwnerMode={() => { setIsBusinessMode(false); setActiveNavTab('home'); }}
              onViewBusiness={handleBusinessPress}
              liveBookings={liveSync.bookings}
              liveNotifications={notifications}
              onMarkNotificationRead={liveSync.markNotificationRead}
              onMarkAllNotificationsRead={liveSync.markAllNotificationsRead}
              authRole={authSession.user?.role || 'CLIENT'}
            />
          )}

          <BottomNavBar isBusinessMode={isBusinessMode} activeNavTab={activeNavTab} activeBusinessTab={activeBusinessTab} insets={insets} onTabPress={handleTabPress} />
        </View>
      </Animated.View>

      {/* ── SORT MODAL ──────────────────────────────── */}
      <Modal visible={filters.showSortModal} transparent animationType="fade" onRequestClose={() => filters.setShowSortModal(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => filters.setShowSortModal(false)}>
          <View style={sortS.sheet}>
            <Text style={sortS.title}>Ordenar por</Text>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.id} style={sortS.sortOption} onPress={() => { filters.setSortBy(opt.id); filters.setShowSortModal(false); }}>
                <Text style={[sortS.sortOptionText, filters.sortBy === opt.id && sortS.sortOptionTextActive]}>{opt.label}</Text>
                {filters.sortBy === opt.id && <Text style={sortS.sortCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── ADVANCED FILTERS ────────────────────────── */}
      <AdvancedFiltersModal
        visible={filters.showAdvancedFilters}
        onClose={() => filters.setShowAdvancedFilters(false)}
        includeClosed={filters.includeClosed}
        onSetIncludeClosed={filters.setIncludeClosed}
        priceFilter={filters.priceFilter}
        onSetPriceFilter={filters.setPriceFilter}
        distanceFilter={filters.distanceFilter}
        onSetDistanceFilter={filters.setDistanceFilter}
        selectedAmenities={filters.selectedAmenities}
        onToggleAmenity={filters.toggleAmenity}
        onClearAll={filters.clearAllFilters}
      />

      {/* ── APP LAYER: ALL CATEGORIES ───────────────── */}
      {meta.activeAppLayer === 'allCategories' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: meta.appLayerX }] }]} {...meta.appLayerPan.panHandlers}>
            <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.grayLine }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.darkText }}>Todas as Categorias</Text>
                <TouchableOpacity onPress={meta.closeAppLayer} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.grayBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="close" size={18} color={COLORS.darkText} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {ALL_CATEGORIES.map((section) => (
                  <View key={section.section}>
                    <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8, backgroundColor: COLORS.grayBg }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.grayText, textTransform: 'uppercase', letterSpacing: 0.8 }}>{section.section}</Text>
                    </View>
                    {section.items.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.grayLine, backgroundColor: COLORS.white }}
                        onPress={() => { filters.setActiveCategoryId(cat.id); meta.closeAppLayer(); }}
                      >
                        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.grayBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                          <Icon name={cat.icon} size={16} color={COLORS.darkText} strokeWidth={1.8} />
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText, flex: 1 }}>{cat.label}</Text>
                        <Icon name="chevronRight" size={16} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </View>
      )}

      {/* ── APP LAYER: NOTIFICATIONS ─────────────────── */}
      {meta.activeAppLayer === 'notifications' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: meta.appLayerX }] }]} {...meta.appLayerPan.panHandlers}>
            <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.grayLine }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.darkText }}>Notificações</Text>
                <TouchableOpacity onPress={meta.closeAppLayer} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.grayBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="close" size={18} color={COLORS.darkText} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {notifications.map(n => (
                  <TouchableOpacity key={n.id} style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.grayLine, backgroundColor: n.read ? COLORS.white : '#FFF5F5' }}
                    onPress={() => liveSync.markNotificationRead(n.id)}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: n.read ? 'transparent' : COLORS.red, marginTop: 6, marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.darkText }}>{n.title}</Text>
                      <Text style={{ fontSize: 12, color: COLORS.grayText, marginTop: 2 }}>{n.message}</Text>
                      <Text style={{ fontSize: 11, color: COLORS.grayText, marginTop: 6 }}>{n.time}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </View>
      )}

      {/* ── BUSINESS DETAIL — Nível 1 (Meta pattern) ─── */}
      {showDetail && selectedBusiness && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <BusinessDetailModal
            business={selectedBusiness}
            isOwner={isBusinessMode}
            bookmarkedIds={bookmarkedIds}
            onToggleBookmark={toggleBookmark}
            swipeProgress={meta.swipeProgress}
            layer={layer}
            onClose={() => {
              // Fecha também a layer operacional se estiver activa
              if (layer.activeLayer) layer.closeImmediate();
              meta.swipeProgress.setValue(1);
              setShowDetail(false);
              setSelectedBusinessId(null);
              requestAnimationFrame(() => meta.swipeProgress.setValue(0));
            }}
          />
        </View>
      )}

      {/* ── NÍVEL 2: MÓDULOS OPERACIONAIS ─────────────────────────────── */}
      {/* Sobrepõe o BusinessDetailModal (Nível 1) — absoluteFill completo  */}
      {showDetail && selectedBusiness && layer.activeLayer && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <OperationalLayerRenderer
            layer={layer}
            isOwner={isBusinessMode}
            tenantId={selectedBusiness?.id}
          />
        </View>
      )}
    </View>
  );
}