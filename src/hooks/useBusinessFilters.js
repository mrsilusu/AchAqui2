/**
 * ============================================================================
 * useBusinessFilters  (v2.11.0 — Fase 3.5)
 * ============================================================================
 * Hook que centraliza toda a lógica de filtro e pesquisa da home screen.
 * Extrai de AcheiAqui_Main os estados:
 *   searchWhat, searchWhere, showAutocomplete, recentSearches
 *   activeFilter, sortBy, activeCategoryId
 *   priceFilter, distanceFilter, selectedAmenities, includeClosed
 *   showSortModal, showAdvancedFilters, compareList
 *
 * Devolve:
 *   { filteredBusinesses, autocompleteSuggestions, currentSortLabel,
 *     hasActiveFilters, activeFiltersCount,
 *     searchWhat, setSearchWhat, searchWhere, setSearchWhere,
 *     showAutocomplete, setShowAutocomplete,
 *     recentSearches, saveRecentSearch, clearRecentSearches,
 *     activeFilter, setActiveFilter,
 *     sortBy, setSortBy,
 *     activeCategoryId, setActiveCategoryId,
 *     priceFilter, setPriceFilter,
 *     distanceFilter, setDistanceFilter,
 *     selectedAmenities, toggleAmenity, clearAllFilters,
 *     includeClosed, setIncludeClosed,
 *     showSortModal, setShowSortModal,
 *     showAdvancedFilters, setShowAdvancedFilters,
 *     compareList, toggleCompare }
 *
 * FASE 2+: Substituir useMemo + useState por TanStack Query + Zustand.
 * ============================================================================
 */

import { useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ALL_CAT_IDS, CATEGORY_TO_BUSINESS_TYPES, isAccommodationBusiness,
  SORT_OPTIONS, PRICE_FILTERS, DISTANCE_FILTERS,
  AUTOCOMPLETE_SUGGESTIONS, OWNER_BUSINESS,
} from '../core/AcheiAqui_Core';

/**
 * @param {Array} businesses — lista completa de negócios (do AppContext ou useState)
 * @param {boolean} isBusinessMode — modo dono activo
 */
export function useBusinessFilters(businesses, isBusinessMode) {
  // ── Search ────────────────────────────────────────────────────────────────
  const [searchWhat, setSearchWhat]             = useState('');
  const [searchWhere, setSearchWhere]           = useState('Talatona, Luanda');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [recentSearches, setRecentSearches]     = useState([]);

  // ── Quick filter pills ─────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter]         = useState('open');

  // ── Sort & Category ────────────────────────────────────────────────────────
  const [sortBy, setSortBy]                     = useState('recommended');
  const [activeCategoryId, setActiveCategoryId] = useState(null);

  // ── Advanced filters ───────────────────────────────────────────────────────
  const [priceFilter, setPriceFilter]           = useState('all');
  const [distanceFilter, setDistanceFilter]     = useState('all');
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [includeClosed, setIncludeClosed]       = useState(false);

  // ── Modal visibility ───────────────────────────────────────────────────────
  const [showSortModal, setShowSortModal]       = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // ── Compare list ────────────────────────────────────────────────────────────
  const [compareList, setCompareList]           = useState([]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentSortLabel     = SORT_OPTIONS.find(o => o.id === sortBy)?.label || 'Ordenar';
  const hasActiveFilters     = priceFilter !== 'all' || distanceFilter !== 'all' || selectedAmenities.length > 0;
  const activeFiltersCount   = (priceFilter !== 'all' ? 1 : 0) + (distanceFilter !== 'all' ? 1 : 0) + selectedAmenities.length;

  // ── Search helpers ─────────────────────────────────────────────────────────
  const saveRecentSearch = useCallback(async (q) => {
    const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 5);
    setRecentSearches(updated);
    AsyncStorage.setItem('recentSearches', JSON.stringify(updated)).catch(() => {});
  }, [recentSearches]);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    AsyncStorage.removeItem('recentSearches').catch(() => {});
  }, []);

  // ── Amenity helpers ────────────────────────────────────────────────────────
  const toggleAmenity = useCallback((id) => {
    setSelectedAmenities(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  }, []);

  const clearAllFilters = useCallback(() => {
    setPriceFilter('all');
    setDistanceFilter('all');
    setSelectedAmenities([]);
    setIncludeClosed(false);
  }, []);

  // ── Compare helpers ────────────────────────────────────────────────────────
  const toggleCompare = useCallback((id) => {
    setCompareList(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 3) { Alert.alert('Limite', 'Máximo 3 negócios para comparar.'); return prev; }
      return [...prev, id];
    });
  }, []);

  // ── Autocomplete suggestions (memoized) ────────────────────────────────────
  const autocompleteSuggestions = useMemo(() =>
    searchWhat.trim()
      ? AUTOCOMPLETE_SUGGESTIONS
          .filter(s => s.toLowerCase().includes(searchWhat.toLowerCase()))
          .slice(0, 5)
      : [],
  [searchWhat]);

  // ── Core filter logic (igual ao v2.9.32) ──────────────────────────────────
  const filteredBusinesses = useMemo(() => {
    return businesses
      .filter(b => {
        // Visibilidade
        if (!b.isPublic && b.id !== OWNER_BUSINESS.id) return false;
        if (b.id === OWNER_BUSINESS.id && !isBusinessMode) return false;

        // Pesquisa por texto
        if (searchWhat.trim()) {
          const q = searchWhat.toLowerCase();
          const hit =
            b.name.toLowerCase().includes(q) ||
            (b.category    || '').toLowerCase().includes(q) ||
            (b.subcategory || '').toLowerCase().includes(q) ||
            (b.neighborhood|| '').toLowerCase().includes(q);
          if (!hit) return false;
        }

        // Estado (aberto/fechado/promoção/top)
        if (!includeClosed && activeFilter !== 'all' && !b.isOpen) return false;
        if (activeFilter === 'deals' && !b.promo)  return false;
        if (activeFilter === 'top'   && b.rating < 4.5) return false;

        // Preço
        if (priceFilter !== 'all') {
          const pf = PRICE_FILTERS.find(p => p.id === priceFilter);
          if (pf && !pf.levels.includes(b.priceLevel)) return false;
        }

        // Distância
        if (distanceFilter !== 'all') {
          const df = DISTANCE_FILTERS.find(d => d.id === distanceFilter);
          if (df && (b.distance || 99) > df.max) return false;
        }

        // Comodidades
        if (selectedAmenities.length > 0) {
          if (!selectedAmenities.every(a => (b.amenities || []).includes(a))) return false;
        }

        // Categoria
        if (activeCategoryId) {
          const matchPrimary = b.primaryCategoryId === activeCategoryId;
          const matchSub     = Array.isArray(b.subCategoryIds) && b.subCategoryIds.includes(activeCategoryId);
          if (ALL_CAT_IDS.has(activeCategoryId)) {
            if (!matchPrimary && !matchSub) return false;
          } else if (activeCategoryId === 'hotels' || activeCategoryId === 'hotelsTravel') {
            if (!isAccommodationBusiness(b) && !matchPrimary && !matchSub) return false;
          } else {
            const types       = CATEGORY_TO_BUSINESS_TYPES[activeCategoryId] || [];
            const matchType   = types.includes(b.businessType);
            const moduleMap   = { restaurants:'gastronomy', delivery:'delivery', shopping:'retail', health:'health', services:'professional' };
            const matchMod    = moduleMap[activeCategoryId] && b.modules?.[moduleMap[activeCategoryId]];
            if (!matchType && !matchMod && !matchPrimary && !matchSub) return false;
          }
        }

        return true;
      })
      .sort((a, b2) => {
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
  ]);

  return {
    // Dados filtrados
    filteredBusinesses,
    autocompleteSuggestions,
    currentSortLabel,
    hasActiveFilters,
    activeFiltersCount,

    // Search
    searchWhat,     setSearchWhat,
    searchWhere,    setSearchWhere,
    showAutocomplete, setShowAutocomplete,
    recentSearches, saveRecentSearch, clearRecentSearches,

    // Filtros rápidos
    activeFilter,   setActiveFilter,

    // Sort & Category
    sortBy,         setSortBy,
    activeCategoryId, setActiveCategoryId,

    // Filtros avançados
    priceFilter,    setPriceFilter,
    distanceFilter, setDistanceFilter,
    selectedAmenities, toggleAmenity, clearAllFilters,
    includeClosed,  setIncludeClosed,

    // Modal visibility
    showSortModal,        setShowSortModal,
    showAdvancedFilters,  setShowAdvancedFilters,

    // Compare
    compareList,    toggleCompare,
  };
}