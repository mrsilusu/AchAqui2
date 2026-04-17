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
  useState, useCallback, useEffect, useMemo,
} from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  SafeAreaView, StyleSheet, Animated, Alert, Linking,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import {
  Icon, COLORS, AppProvider,
  ALL_CATEGORIES, ALL_CAT_LABEL, ALL_CAT_ICON,
  OWNER_BUSINESS, SORT_OPTIONS, NAV_BAR_STYLES,
} from './core/AchAqui_Core';
import { BusinessDetailModal }  from './modules/Detail/BusinessDetailModal';
import { useOperationalLayer }  from './hooks/useOperationalLayer';
import { OperationalLayerRenderer } from './shared/Modals/OperationalLayerRenderer';
import { OwnerModule }          from './modules/Owner/OwnerModule';
import { AdminModule }          from './modules/Admin/AdminModule';
import { StaffHospitalityView } from './operations/StaffHospitalityView';
import { HomeModuleFull }       from './modules/Home/HomeModule';
import { AdvancedFiltersModal } from './modules/Home/AdvancedFiltersModal';
import { AuthModal } from './modules/Auth/AuthModal';
import { useBusinessFilters }   from './hooks/useBusinessFilters';
import { useMetaAnimation }     from './hooks/useMetaAnimation';
import { useAuthSession } from './hooks/useAuthSession';
import { useLiveSync } from './hooks/useLiveSync';
import { backendApi } from './lib/backendApi';

import { sortS } from './styles/Main.styles';

// Chave AsyncStorage para persistir o negócio do dono entre falhas de rede.
// Garante que o OwnerModule nunca mostra o onboarding por causa de um 503/timeout.
const OWNER_BIZ_CACHE_KEY = '@achaqui:ownerBiz_v1';

const MOCK_BUSINESSES_INITIAL = [
  {
    id:'c74f2850-0dcd-4f2c-a61a-aa9fd2c7459e', name:'Pizzaria Bela Vista', category:'Restaurante Italiano', subcategory:'Pizza, Massa, Italiana',
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

const HOURS_DAY_KEY_MAP = {
  monday: 'monday',
  mon: 'monday',
  segunda: 'monday',
  'segunda-feira': 'monday',
  tuesday: 'tuesday',
  tue: 'tuesday',
  tues: 'tuesday',
  terca: 'tuesday',
  'terca-feira': 'tuesday',
  'terça': 'tuesday',
  'terça-feira': 'tuesday',
  wednesday: 'wednesday',
  wed: 'wednesday',
  quarta: 'wednesday',
  'quarta-feira': 'wednesday',
  thursday: 'thursday',
  thu: 'thursday',
  thurs: 'thursday',
  quinta: 'thursday',
  'quinta-feira': 'thursday',
  friday: 'friday',
  fri: 'friday',
  sexta: 'friday',
  'sexta-feira': 'friday',
  saturday: 'saturday',
  sat: 'saturday',
  sabado: 'saturday',
  'sábado': 'saturday',
  sunday: 'sunday',
  sun: 'sunday',
  domingo: 'sunday',
};

const ORDERED_HOURS_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function normalizeHoursDayLabel(label) {
  if (typeof label !== 'string') return null;
  const normalized = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return HOURS_DAY_KEY_MAP[normalized] || null;
}

function extractHoursValue(raw) {
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const value = extractHoursValue(item);
      if (value) return value;
    }
    return null;
  }

  if (typeof raw === 'string') {
    const value = raw.trim();
    return value || null;
  }

  if (typeof raw === 'number' || typeof raw === 'boolean') {
    return String(raw);
  }

  return null;
}

function parseHourToken(raw) {
  const token = String(raw || '').trim().toLowerCase();
  if (!token) return null;

  const twelveHour = token.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (twelveHour) {
    let hours = parseInt(twelveHour[1], 10);
    const minutes = parseInt(twelveHour[2] || '0', 10);
    const meridiem = twelveHour[3].toLowerCase();
    if (hours === 12) hours = 0;
    if (meridiem === 'pm') hours += 12;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const twentyFourHour = token.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (twentyFourHour) {
    const hours = parseInt(twentyFourHour[1], 10);
    const minutes = parseInt(twentyFourHour[2] || '0', 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  const hFormat = token.match(/^(\d{1,2})h(?:(\d{2}))?$/);
  if (hFormat) {
    const hours = parseInt(hFormat[1], 10);
    const minutes = parseInt(hFormat[2] || '0', 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  return null;
}

function parseHoursEntry(raw) {
  const value = extractHoursValue(raw);
  if (!value) return null;

  const lowered = value.toLowerCase();
  if (['closed', 'fechado', 'encerrado', 'fechado temporariamente'].some((word) => lowered.includes(word))) {
    return null;
  }

  if (['24 hours', '24h', '24 horas', 'open 24', 'aberto 24 horas'].some((word) => lowered.includes(word))) {
    return { open: '00:00', close: '23:59', is24h: true };
  }

  const parts = value.split(/\s*[\-–]\s*/);
  if (parts.length < 2) return null;

  const open = parseHourToken(parts[0]);
  const close = parseHourToken(parts[1]);
  if (!open || !close) return null;
  return { open, close };
}

function toMinutes(hhmm) {
  const [hours, minutes] = String(hhmm).split(':').map((value) => parseInt(value, 10));
  return (hours * 60) + minutes;
}

function buildHoursSchedule(meta) {
  const normalizedHours = meta?.hours;
  if (normalizedHours && typeof normalizedHours === 'object' && !Array.isArray(normalizedHours)) {
    const schedule = {};
    for (const [label, value] of Object.entries(normalizedHours)) {
      const day = normalizeHoursDayLabel(label);
      if (!day || !value || typeof value !== 'object') continue;
      const open = parseHourToken(value.open);
      const close = parseHourToken(value.close);
      if (!open || !close) continue;
      schedule[day] = { open, close, is24h: Boolean(value.is24h) };
    }
    if (Object.keys(schedule).length > 0) return schedule;
  }

  const rawHours = meta?.working_hours ?? meta?.workingHours ?? meta?.hours_raw;
  if (!rawHours) return null;

  const schedule = {};

  if (typeof rawHours === 'object' && !Array.isArray(rawHours)) {
    for (const [label, value] of Object.entries(rawHours)) {
      const day = normalizeHoursDayLabel(label);
      if (!day) continue;
      const parsed = parseHoursEntry(value);
      if (parsed) schedule[day] = parsed;
    }
    if (Object.keys(schedule).length > 0) return schedule;
  }

  if (Array.isArray(rawHours)) {
    for (const chunk of rawHours) {
      const text = extractHoursValue(chunk);
      if (!text) continue;
      const separatorIndex = text.indexOf(':');
      if (separatorIndex <= 0) continue;
      const day = normalizeHoursDayLabel(text.slice(0, separatorIndex));
      if (!day) continue;
      const parsed = parseHoursEntry(text.slice(separatorIndex + 1));
      if (parsed) schedule[day] = parsed;
    }
    if (Object.keys(schedule).length > 0) return schedule;
  }

  if (typeof rawHours === 'string') {
    const dictRegex = /'([^']+)'\s*:\s*'([^']*)'/g;
    let match = null;
    while ((match = dictRegex.exec(rawHours)) !== null) {
      const day = normalizeHoursDayLabel(match[1]);
      if (!day) continue;
      const parsed = parseHoursEntry(match[2]);
      if (parsed) schedule[day] = parsed;
    }
    if (Object.keys(schedule).length > 0) return schedule;

    for (const chunk of rawHours.split(';').map((item) => item.trim()).filter(Boolean)) {
      const separatorIndex = chunk.indexOf(':');
      if (separatorIndex <= 0) continue;
      const day = normalizeHoursDayLabel(chunk.slice(0, separatorIndex));
      if (!day) continue;
      const parsed = parseHoursEntry(chunk.slice(separatorIndex + 1));
      if (parsed) schedule[day] = parsed;
    }
  }

  return Object.keys(schedule).length > 0 ? schedule : null;
}

function computeIsOpenFromMeta(meta) {
  if (!meta || typeof meta !== 'object') return { isOpen: null, statusText: null };
  if (meta.status === 'CLOSED_TEMPORARILY') {
    return { isOpen: false, statusText: 'Fechado temporariamente' };
  }

  const schedule = buildHoursSchedule(meta);
  if (!schedule) return { isOpen: null, statusText: null };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dayIndex = (now.getDay() + 6) % 7;
  const today = ORDERED_HOURS_DAYS[dayIndex];
  const todayHours = schedule[today];

  if (todayHours) {
    const openMinutes = toMinutes(todayHours.open);
    let closeMinutes = toMinutes(todayHours.close);
    const wrapsPastMidnight = closeMinutes <= openMinutes;
    if (wrapsPastMidnight) closeMinutes += 24 * 60;
    const comparableCurrentMinutes = wrapsPastMidnight && currentMinutes < openMinutes
      ? currentMinutes + 24 * 60
      : currentMinutes;
    const isOpenNow = comparableCurrentMinutes >= openMinutes && comparableCurrentMinutes < closeMinutes;

    if (isOpenNow) {
      const remaining = closeMinutes - comparableCurrentMinutes;
      if (remaining <= 30) {
        return { isOpen: true, statusText: `Fecha em ${Math.max(0, Math.floor(remaining))} min` };
      }
      return { isOpen: true, statusText: `Aberto ate ${todayHours.close}` };
    }

    if (comparableCurrentMinutes < openMinutes) {
      return { isOpen: false, statusText: `Abre as ${todayHours.open}` };
    }
  }

  const dayLabel = {
    monday: 'Seg',
    tuesday: 'Ter',
    wednesday: 'Qua',
    thursday: 'Qui',
    friday: 'Sex',
    saturday: 'Sab',
    sunday: 'Dom',
  };

  for (let offset = 1; offset <= 7; offset += 1) {
    const nextIndex = (dayIndex + offset) % 7;
    const day = ORDERED_HOURS_DAYS[nextIndex];
    const hours = schedule[day];
    if (!hours) continue;
    if (offset === 1) {
      return { isOpen: false, statusText: `Abre amanha as ${hours.open}` };
    }
    return { isOpen: false, statusText: `Abre ${dayLabel[day]} as ${hours.open}` };
  }

  return { isOpen: false, statusText: 'Fechado' };
}

function normalizeBusiness(rawBusiness) {
  if (!rawBusiness?.id) return null;

  // Procura o negócio nos mocks locais pelo id (inclui OWNER_BUSINESS e todos os outros)
  const isOwnerBusiness = rawBusiness.id === OWNER_BUSINESS.id;
  const localMock = MOCK_BUSINESSES_INITIAL.find(b => b.id === rawBusiness.id);
  const base = isOwnerBusiness ? OWNER_BUSINESS : (localMock || {});

  // Se vem da API, metadata contém os campos ricos guardados pelo bootstrap
  const meta = rawBusiness.metadata || {};
  const hoursState = computeIsOpenFromMeta(meta);
  const financeText = [
    rawBusiness.name,
    rawBusiness.category,
    rawBusiness.description,
    meta.category,
    meta.subcategory,
    meta.description,
    base.name,
    base.category,
  ].filter(Boolean).join(' ').toLowerCase();
  const existingSubCategoryIds = [
    ...(Array.isArray(meta.subCategoryIds) ? meta.subCategoryIds : []),
    ...(Array.isArray(rawBusiness.subCategoryIds) ? rawBusiness.subCategoryIds : []),
    ...(Array.isArray(base.subCategoryIds) ? base.subCategoryIds : []),
  ];
  const isAtmBusiness = existingSubCategoryIds.includes('atm')
    || /\batm\b|multicaixa|caixa electr[oó]nic|caixa eletr[oó]nic|terminal de levantamento/.test(financeText);
  const isBankBusiness = !isAtmBusiness && (
    existingSubCategoryIds.includes('bank')
    || /\bbank\b|\bbanco\b|banc[oá]rio|ag[eê]ncia banc[aá]ria/.test(financeText)
  );
  const normalizedSubCategoryIds = Array.from(new Set([
    ...existingSubCategoryIds,
    ...(isAtmBusiness ? ['financial', 'atm'] : []),
    ...(isBankBusiness ? ['financial', 'bank'] : []),
  ]));

  return {
    ...base,
    id: rawBusiness.id,
    name: rawBusiness.name || base.name || 'Negócio',
    category: rawBusiness.category || meta.category || base.category || 'Serviços',
    subcategory: meta.subcategory || rawBusiness.category || base.subcategory || 'Serviços',
    businessType: meta.businessType || rawBusiness.businessType || base.businessType || '',
    primaryCategoryId: meta.primaryCategoryId || rawBusiness.primaryCategoryId || base.primaryCategoryId || '',
    subCategoryIds: normalizedSubCategoryIds,
    icon: base.icon || meta.icon || '🏢',
    rating: base.rating || meta.rating || 4.8,
    reviews: base.reviews || meta.reviews || 0,
    priceLevel: base.priceLevel || meta.priceLevel || 2,
    isPremium: base.isPremium || meta.isPremium || false,
    verifiedBadge: true,
    isVerified: true,
    modules: base.modules || meta.modules || (() => {
      const cat = (rawBusiness.category || meta.category || '').toLowerCase();
      const pid = meta.primaryCategoryId || base.primaryCategoryId || rawBusiness.primaryCategoryId || '';
      const subs = (meta.subCategoryIds || base.subCategoryIds || rawBusiness.subCategoryIds || []);
      const c = (s) => cat.includes(s);
      const pis = (id) => pid === id || subs.includes(id);
      const isHotel     = pis('hotelsTravel') || c('hotel') || c('hostel') || c('pousada') || c('resort') || c('lodging') || c('motel');
      const isFood      = pis('restaurants')  || c('restaur') || c('meal') || c('fast_food') || c('pizza');
      const isCoffee    = pis('coffee')       || c('café') || c('cafe') || c('pastelaria') || c('padaria') || c('cafetaria');
      const isBar       = pis('bars')         || c('bar') || c('night_club') || c('pub') || c('discoteca');
      const isSpa       = pis('spas')         || c('spa') || c('massag') || c('wellness');
      const isBeauty    = pis('beautysalons') || c('beleza') || c('salão') || c('salon') || c('beauty') || c('hair') || c('nail') || c('barber') || c('barbearia');
      const isHealth    = pis('health')       || c('saúde') || c('clínica') || c('clinic') || c('médic') || c('hospital') || c('doctor') || c('pharmacy') || c('farmácia') || c('dentist');
      const isSports    = pis('active')       || c('gym') || c('fitness') || c('sport') || c('swimming') || c('yoga') || c('pilates') || c('academia');
      const isRetail    = pis('shopping')     || c('supermarket') || c('supermercado') || c('grocery') || c('mercado') || c('loja');
      const isEdu       = pis('education')    || c('school') || c('escola') || c('colégio') || c('universit') || c('training');
      const isFinancial = pis('financial')    || c('bank') || c('banco') || c('financ') || c('insurance') || c('seguro') || c('contabilid');
      const isAuto      = pis('automotive')   || c('car_repair') || c('oficina') || c('mecânico') || c('gas_station') || c('posto de gasolina');
      const isHome      = pis('homeservices') || c('electrician') || c('eletricista') || c('plumber') || c('laundry') || c('lavandaria') || c('cleaning');
      const isEvents    = pis('eventplanning')|| c('event_venue') || c('catering') || c('wedding') || c('espaço de eventos');
      const isPets      = pis('pets')         || c('veterinary') || c('veterinário') || c('pet_store') || c('pet shop');
      const isPro       = pis('professional') || c('lawyer') || c('advogado') || c('architect') || c('consultant') || c('photographer');
      const isDelivery  = pis('delivery')     || c('courier') || c('logistics');
      const isAny = isHotel||isFood||isCoffee||isBar||isSpa||isBeauty||isHealth||isSports||isRetail||isEdu||isFinancial||isAuto||isHome||isEvents||isPets||isPro||isDelivery;
      return {
        ...(isHotel    && { accommodation: true }),
        ...((isFood||isCoffee||isBar) && { gastronomy: true }),
        ...((isBeauty||isSpa) && { beauty: true }),
        ...(isHealth   && { health: true }),
        ...(isSports   && { health: true }),
        ...(isRetail   && { retail: true }),
        ...(isEdu      && { education: true }),
        ...(isDelivery && { delivery: true }),
        ...(!isAny     && { professional: true }),
      };
    })(),
    description: typeof rawBusiness.description === 'string' ? rawBusiness.description : (meta.description || meta.about || ''),
    address: base.address || meta.address || meta.full_address || meta.street || 'Endereço não informado',
    neighborhood: base.neighborhood || meta.neighborhood || '',
    phone: base.phone || meta.phone || '',
    website: base.website || meta.website || '',
    promo: base.promo || meta.promo || null,
    distance: 0,
    distanceText: '—',
    isOpen:     hoursState.isOpen ?? base.isOpen ?? meta.isOpen ?? true,
    statusText: hoursState.statusText || base.statusText || meta.statusText || 'Aberto',
    isPublic: true,
    latitude: Number(rawBusiness.latitude) || Number(base.latitude) || -8.8388,
    longitude: Number(rawBusiness.longitude) || Number(base.longitude) || 13.2344,
    photos: base.photos?.length ? base.photos : (meta.photos || []),
    amenities: base.amenities?.length ? base.amenities : (meta.amenities || []),
    deals: base.deals?.length ? base.deals : (meta.deals || []),
    popularDishes: base.popularDishes?.length ? base.popularDishes : (meta.popularDishes || []),
    roomTypes: ((rawBusiness.htRoomTypes?.length ? rawBusiness.htRoomTypes : null) || (rawBusiness.roomTypes?.length ? rawBusiness.roomTypes : null) || (base.roomTypes?.length ? base.roomTypes : null) || (meta.roomTypes || [])).map(rt => ({
      ...rt,
      physicalRoomsCount: rt._count?.rooms ?? rt.physicalRoomsCount ?? rt.totalRooms ?? 1,
    })),
    metadata: meta,
    feedSlot: rawBusiness.feedSlot || null,
    rankingScore: Number.isFinite(rawBusiness.rankingScore) ? Number(rawBusiness.rankingScore) : null,
    position: Number.isFinite(rawBusiness.position) ? Number(rawBusiness.position) : null,
    hasActiveStatus: !!(rawBusiness.hasActiveStatus ?? meta.hasActiveStatus ?? base.hasActiveStatus),
    isNew: !!(rawBusiness.isNew ?? meta.isNew),
    hasPromo: !!(rawBusiness.hasPromo ?? meta.hasPromo ?? base.promo ?? meta.promo),
    isSponsored: !!(rawBusiness.isSponsored ?? meta.isSponsored ?? meta.isPatrocinado ?? base.isPremium ?? meta.isPremium),
    owner: rawBusiness.owner || null,
  };
}

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
  const isStaff = authSession.isStaff ?? false;
  const staffRole = authSession.staffRole ?? null;
  const staffBusinessId = authSession.staffBusinessId ?? null;
  const liveSync = useLiveSync({
    user: authSession.user,
    accessToken: authSession.accessToken,
  });
  const [profileData, setProfileData] = useState(null);
  const [ownerDashboardData, setOwnerDashboardData] = useState(null);

  const userProfile = useMemo(() => {
    const createdAt = profileData?.createdAt
      ? new Date(profileData.createdAt).toLocaleDateString('pt-PT', {
          month: 'long',
          year: 'numeric',
        })
      : '—';

    const stats = profileData?.stats || {};

    return {
      id: profileData?.id || authSession.user?.id || 'anonymous',
      name: profileData?.name || authSession.user?.name || 'Utilizador',
      email: profileData?.email || authSession.user?.email || '',
      location: 'Luanda, Angola',
      memberSince: createdAt,
      avatar: null,
      stats: {
        businessesViewed: Number(stats.bookings || 0),
        reviewsWritten: Number(stats.notifications || 0),
        checkIns: Number(stats.bookings || 0),
        photosUploaded: Number(stats.businesses || 0),
        favoritesSaved: Number(stats.notifications || 0),
        achievementsUnlocked: Number(stats.businesses || 0),
      },
    };
  }, [authSession.user?.email, authSession.user?.id, authSession.user?.name, profileData]);

  const ownerMetrics = useMemo(() => ({
    views: Number(ownerDashboardData?.totalBookings || 0),
    viewsChange: 0,
    clicks: Number(ownerDashboardData?.confirmedBookings || 0),
    clicksChange: 0,
    checkIns: Number(ownerDashboardData?.pendingBookings || 0),
    checkInsChange: 0,
    favorites: Number(ownerDashboardData?.totalBusinesses || 0),
    favoritesChange: 0,
  }), [ownerDashboardData]);

  const refreshOwnerData = useCallback(async () => {
    if (!authSession.accessToken || !authSession.isOwner) return;

    // Recarregar lista de negócios (inclui o novo negócio criado)
    try {
      const response = await backendApi.getBusinesses();
      const fromApi = (Array.isArray(response) ? response : [])
        .map(normalizeBusiness)
        .filter(Boolean);
      const apiIds = new Set(fromApi.map(b => b.id));
      const mocksNotInApi = MOCK_BUSINESSES_INITIAL.filter(b => !apiIds.has(b.id));
      const merged = [...fromApi, ...mocksNotInApi];

      // Garantir que o negócio do dono está na lista + actualizar cache
      const userId = authSession.user?.id;
      const found = userId ? merged.find(b => b?.owner?.id === userId) : null;
      if (found) {
        AsyncStorage.setItem(OWNER_BIZ_CACHE_KEY, JSON.stringify(found)).catch(() => {});
        setBusinesses(merged);
      } else {
        // Tentar recuperar da cache se a API não devolveu o negócio do dono
        try {
          const raw = await AsyncStorage.getItem(OWNER_BIZ_CACHE_KEY);
          const cached = raw ? JSON.parse(raw) : null;
          setBusinesses(cached?.owner?.id === userId ? [cached, ...merged] : merged);
        } catch {
          setBusinesses(merged);
        }
      }
    } catch { /* manter lista actual */ }

    await liveSync.reloadAll();
    try {
      const response = await backendApi.getOwnerDashboard(authSession.accessToken);
      setOwnerDashboardData(response || null);
    } catch {
      // Keep current dashboard snapshot if owner metrics refresh fails.
    }
  }, [authSession.accessToken, authSession.isOwner, liveSync]);

  const handleHomeRefresh = useCallback(async () => {
    setHomeRefreshing(true);
    try {
      if (userLocation?.latitude && userLocation?.longitude) {
        const [feedRes, allRes] = await Promise.all([
          backendApi.getHybridHomeFeed({
            lat: userLocation.latitude,
            lng: userLocation.longitude,
            radiusKm: 20,
            limit: 15,
          }).catch(() => null),
          backendApi.getBusinesses(),
        ]);

        const feedItems = Array.isArray(feedRes?.items) ? feedRes.items : [];
        if (feedItems.length > 0) {
          const fromFeed = feedItems
            .map(normalizeBusiness)
            .filter(Boolean)
            .map((biz, idx) => {
              const raw = feedItems[idx] || {};
              return {
                ...biz,
                recommendationScore: Number(raw.rankingScore || biz.recommendationScore || 0),
                recommendationReason: raw.feedSlot || biz.recommendationReason || 'Feed híbrido',
              };
            });

          const feedIds = new Set(fromFeed.map((b) => b.id));
          const fromApi = (Array.isArray(allRes) ? allRes : [])
            .map(normalizeBusiness)
            .filter(Boolean)
            .filter((b) => !feedIds.has(b.id));

          const mergedIds = new Set([...fromFeed, ...fromApi].map((b) => b.id));
          const mocksFallback = MOCK_BUSINESSES_INITIAL.filter((b) => !mergedIds.has(b.id));
          setBusinesses([...fromFeed, ...fromApi, ...mocksFallback]);
          return;
        }
      }

      const response = await backendApi.getBusinesses();
      const fromApi = (Array.isArray(response) ? response : [])
        .map(normalizeBusiness).filter(Boolean);
      const apiIds = new Set(fromApi.map(b => b.id));
      setBusinesses([...fromApi, ...MOCK_BUSINESSES_INITIAL.filter(b => !apiIds.has(b.id))]);
      filters.refreshShuffle?.();
    } catch {}
    finally { setHomeRefreshing(false); }
  }, [filters, userLocation?.latitude, userLocation?.longitude]);

  // ── Dados globais ──────────────────────────────────────────────────────────
  const [businesses, setBusinesses] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [isStartupLoading, setIsStartupLoading] = useState(true);

  // ── Reservas de quartos partilhadas (dono ↔ cliente) ──────────────────────
  // Deriva directamente de liveSync.bookings (actualizado pelo Supabase Realtime).
  // Converte o formato da API para o formato interno do HospitalityModule.
  const ownerRoomBookings = useMemo(() => {
    const all = liveSync.bookings;
    if (!Array.isArray(all) || all.length === 0) return [];
    return all
      .filter(b => b.bookingType === 'ROOM')
      .map(b => {
        const toDisplay = (iso) => {
          if (!iso) return '';
          const d = new Date(iso);
          return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`;
        };
        const checkIn  = toDisplay(b.startDate);
        const checkOut = toDisplay(b.endDate);
        const nights   = b.startDate && b.endDate
          ? Math.round((new Date(b.endDate) - new Date(b.startDate)) / 86400000)
          : 0;
        return {
          id:          b.id,
          businessId:  b.businessId || b.business?.id,
          roomTypeId:  b.roomTypeId || '1',
          bookingType: 'ROOM',
          guestName:   b.guestName  || b.user?.name  || 'Hóspede',
          guestPhone:  b.guestPhone || b.user?.phone || b.user?.email || '',
          checkIn,
          checkOut,
          nights,
          adults:      b.adults    ?? 1,
          children:    b.children  ?? 0,
          rooms:       b.rooms     ?? 1,
          totalPrice:  b.totalPrice ?? 0,
          status:      b.status?.toLowerCase() ?? 'pending',
          notes:       b.notes ?? '',
        };
      });
  }, [liveSync.bookings]);

  // setOwnerRoomBookings — mantido para compatibilidade com optimistic updates no HospitalityModule
  const setOwnerRoomBookings = useCallback((updater) => {
    // Sem-op: liveSync.bookings é a fonte de verdade; Realtime actualiza automaticamente
  }, []);
  const fallbackNotifications = [{id:'n1',title:'Nova oferta!',message:'Pizzaria Bela Vista: 20% OFF',time:'5 min atrás',read:false},{id:'n2',title:'Reserva confirmada',message:'Personal Trainer amanhã às 10h',time:'1h atrás',read:false}];
  const notifications = authSession.user ? liveSync.notifications : fallbackNotifications;
  const [locationPermission, setLocationPermission] = useState('loading');
  const [userLocation, setUserLocation] = useState(null); // { latitude, longitude }
  const [isLocationBootstrapLoading, setIsLocationBootstrapLoading] = useState(true);
  const locationPermissionRequestedRef = React.useRef(false);
  // ── Navegação ──────────────────────────────────────────────────────────────
  const [isBusinessMode, setIsBusinessMode]   = useState(false);
  const [isStaffMode, setIsStaffMode]         = useState(false);
  const [activeNavTab, setActiveNavTab]         = useState('home');
  const [activeBusinessTab, setActiveBusinessTab] = useState('dashboard');
  const [adminSessionBackup, setAdminSessionBackup] = useState(null);

  // ── Business detail ────────────────────────────────────────────────────────
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab]   = useState('login');
  const [authModalRole, setAuthModalRole] = useState('CLIENT');
  const selectedBusiness = selectedBusinessId ? businesses.find(b => b.id === selectedBusinessId) ?? null : null;

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const filters = useBusinessFilters(businesses, isBusinessMode);
  const [homeRefreshing, setHomeRefreshing] = useState(false);
  const meta    = useMetaAnimation({ showDetail });
  const layer   = useOperationalLayer(); // Nível 2 — módulos operacionais

  // ── Helpers ────────────────────────────────────────────────────────────────
  const updateOwnerBiz = useCallback((fields, explicitBusinessId = null) => {
    setBusinesses((prev) => {
      const ownerBusinessFromSession = authSession.user?.id
        ? prev.find((b) => b?.owner?.id === authSession.user.id)
        : null;
      const targetBusinessId =
        explicitBusinessId ||
        ownerBusinessFromSession?.id ||
        null;

      // Sem negócio associado -- não actualizar nada
      if (!targetBusinessId) return prev;
      return prev.map((b) => (b.id === targetBusinessId ? { ...b, ...fields } : b));
    });
  }, [authSession.user?.id]);

  const syncPromoDeals = useCallback((updatedPromotions) => {
    const deals = updatedPromotions.filter(p => p.active).map(p => ({
      id: p.id, title: p.title, description: p.description || '',
      expires: p.endDate || '', code: p.type === 'percent' ? `${p.discount}%OFF` : `${p.discount}KZ`,
    }));
    const activePromo = updatedPromotions.find(p => p.active);
    updateOwnerBiz({ deals, promo: activePromo ? activePromo.title : null });
  }, [updateOwnerBiz]);

  const toggleBookmark = useCallback(async (id) => {
    setBookmarkedIds(prev => {
      const u = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      AsyncStorage.setItem('bookmarks', JSON.stringify(u)).catch(() => {});
      return u;
    });
  }, []);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleOpenAuth = useCallback((tab = 'login', role = 'CLIENT') => {
    setAuthModalTab(tab);
    setAuthModalRole(role);
    setShowAuthModal(true);
  }, []);

  const handleAuthSuccess = useCallback(async (session) => {
    setShowAuthModal(false);
    await authSession.saveSession(session);
    const hasHtStaffAssignment = Array.isArray(session?.user?.staffRoles)
      && session.user.staffRoles.some((r) => r?.module === 'HT' || String(r?.role || '').startsWith('HT_'));
    // Verificar também os claims do JWT (cobre fallback sem coreBusinessStaff)
    let jwtHasStaffClaims = false;
    try {
      const jwtPayload = session?.accessToken
        ? JSON.parse(atob(session.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
        : null;
      jwtHasStaffClaims = !!(jwtPayload?.staffRole && jwtPayload?.businessId);
    } catch { /* token inválido ou não-JWT */ }
    if (session?.user?.role === 'OWNER') {
      setIsBusinessMode(true);
      setActiveBusinessTab('dashboard');
    }
    if (session?.user?.role === 'STAFF' || hasHtStaffAssignment || jwtHasStaffClaims) {
      setIsBusinessMode(true);
      setActiveBusinessTab('dashboard');
      setIsStaffMode(true);
    }
  }, [authSession]);

  const handleLogout = useCallback(async () => {
    try {
      if (authSession.accessToken) {
        await backendApi.logout({ refreshToken: authSession.refreshToken }).catch(() => {});
      }
    } finally {
      await authSession.saveSession(null);
      setAdminSessionBackup(null);
      setIsBusinessMode(false);
      setIsStaffMode(false);
      setActiveNavTab('home');
    }
  }, [authSession]);

  const handleImpersonationSession = useCallback(async (impersonationSession) => {
    if (!impersonationSession?.accessToken || !impersonationSession?.user) {
      Alert.alert('Erro', 'Sessão de impersonação inválida.');
      return;
    }

    if (authSession.user?.role !== 'ADMIN' || !authSession.accessToken) {
      Alert.alert('Sessão inválida', 'Só um administrador autenticado pode iniciar impersonação.');
      return;
    }

    setAdminSessionBackup({
      accessToken: authSession.accessToken,
      refreshToken: authSession.refreshToken,
      user: authSession.user,
    });

    await authSession.saveSession({
      accessToken: impersonationSession.accessToken,
      refreshToken: impersonationSession.refreshToken || null,
      user: impersonationSession.user,
      impersonation: impersonationSession.impersonation || { active: true },
    });

    setIsBusinessMode(true);
    setActiveBusinessTab('dashboard');
    setActiveNavTab('home');
  }, [authSession]);

  const handleExitOwnerMode = useCallback(async () => {
    if (authSession.session?.impersonation?.active && adminSessionBackup) {
      await authSession.saveSession(adminSessionBackup);
      setAdminSessionBackup(null);
      setIsBusinessMode(false);
      setActiveNavTab('home');
      return;
    }

    setIsBusinessMode(false);
    setActiveNavTab('home');
  }, [adminSessionBackup, authSession]);

    const handleBusinessPress = useCallback((b) => {
    meta.swipeProgress.setValue(0);
    setSelectedBusinessId(b.id);
    setShowDetail(true);

    // Sempre buscar quartos da BD — actualiza se existirem, no-op se não
    backendApi.getRoomsByBusiness(b.id).then(rooms => {
      if (Array.isArray(rooms)) {
        setBusinesses(prev => prev.map(biz =>
          biz.id === b.id ? { ...biz, roomTypes: rooms } : biz
        ));
      }
    }).catch(() => {});
  }, [meta.swipeProgress]);

  // Haversine -- distância em linha recta (crow-flies) entre dois pontos GPS
  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const formatDistanceText = (km) => (km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`);

  // Ref que rastreia a localização actual (acessível de dentro de closures assíncronas)
  const userLocationRef = React.useRef(null);
  const roadDistanceSyncRef = React.useRef({ key: '', requestId: 0 });

  // Distância estimada para cards: haversine * 1.35 (aproxima estrada em malha urbana)
  const applyEstimatedDistances = (arr, loc) => {
    if (!loc) return arr;
    return arr.map(b => {
      const lat = Number(b.latitude);
      const lng = Number(b.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return b;
      const km = haversineKm(loc.latitude, loc.longitude, lat, lng) * 1.35;
      const distanceText = formatDistanceText(km);
      return { ...b, distance: km, distanceText };
    });
  };

  // Distância real de estrada para vários cards via OSRM Table API (em lotes)
  const fetchRoadDistancesMap = async (loc, candidates) => {
    const result = new Map();
    const chunkSize = 20;
    for (let i = 0; i < candidates.length; i += chunkSize) {
      const chunk = candidates.slice(i, i + chunkSize);
      const coords = [`${loc.longitude},${loc.latitude}`, ...chunk.map(c => `${c.lng},${c.lat}`)].join(';');
      const url = `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data?.code !== 'Ok' || !Array.isArray(data?.distances?.[0])) continue;
        chunk.forEach((c, idx) => {
          const meters = Number(data.distances[0][idx + 1]);
          if (Number.isFinite(meters) && meters > 0) result.set(c.id, meters / 1000);
        });
      } catch {
        // Falha silenciosa por lote; mantém distância estimada
      }
    }
    return result;
  };

  // Ref para guardar a subscription do watch -- permite parar e reiniciar
  const locationWatchRef = React.useRef(null);
  const hybridFeedLoadedRef = React.useRef(false);

  const requestLocationPermission = async () => {
    if (locationPermissionRequestedRef.current) return;
    locationPermissionRequestedRef.current = true;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      if (status === 'granted') {
        // Posição imediata
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc) setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        // Iniciar watch se ainda não está activo
        if (!locationWatchRef.current) {
          locationWatchRef.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, distanceInterval: 50, timeInterval: 30000 },
            (l) => setUserLocation({ latitude: l.coords.latitude, longitude: l.coords.longitude })
          );
        }
      }
    } catch {
      setLocationPermission('denied');
    } finally {
      setIsLocationBootstrapLoading(false);
    }
  };
  // Chamada explícita pelo utilizador (ícone de localização na search bar).
  // Não usa a guarda do ref — força sempre o pedido ao SO.
  // Se a permissão foi negada definitivamente abre as Definições do dispositivo.
  const handleLocationIconPress = useCallback(async () => {
    locationPermissionRequestedRef.current = false; // libertar guarda
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      if (status === 'granted') {
        locationPermissionRequestedRef.current = true;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc) setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (!locationWatchRef.current) {
          locationWatchRef.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, distanceInterval: 50, timeInterval: 30000 },
            (l) => setUserLocation({ latitude: l.coords.latitude, longitude: l.coords.longitude })
          );
        }
      } else {
        Alert.alert(
          'Localização desactivada',
          'Para ver negócios perto de si, active a localização nas definições do dispositivo.',
          [
            { text: 'Agora não', style: 'cancel' },
            { text: 'Abrir Definições', onPress: () => Linking.openSettings() },
          ],
        );
      }
    } catch {
      setLocationPermission('denied');
    } finally {
      setIsLocationBootstrapLoading(false);
    }
  }, []);

  // Localização: pede permissão ao arrancar + watch contínuo para actualizar com deslocação
  useEffect(() => {
    let subscription = null;

    const startLocation = async () => {
      try {
        // Verificar permissão actual
        let { status } = await Location.getForegroundPermissionsAsync();

        if (status !== 'granted') {
          setLocationPermission(status);
          await requestLocationPermission();
          return;
        }

        locationPermissionRequestedRef.current = true;
        setLocationPermission(status);

        // Posição inicial imediata
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(() => null);
        if (initial) {
          setUserLocation({
            latitude:  initial.coords.latitude,
            longitude: initial.coords.longitude,
          });
        }

        // Watch contínuo — actualiza distâncias conforme o utilizador se desloca
        // distanceInterval: 50m -- só dispara se o utilizador andar mais de 50 metros
        subscription = await Location.watchPositionAsync(
          {
            accuracy:         Location.Accuracy.Balanced,
            distanceInterval: 50,    // metros mínimos entre updates
            timeInterval:     30000, // máximo a cada 30 segundos
          },
          (loc) => {
            setUserLocation({
              latitude:  loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        );
        locationWatchRef.current = subscription;
      } catch {
        setLocationPermission('denied');
      } finally {
        setIsLocationBootstrapLoading(false);
      }
    };

    startLocation();

    // Cleanup: parar o watch quando o componente desmonta
    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

    useEffect(() => {
    AsyncStorage.getItem('bookmarks').then(s => s && setBookmarkedIds(JSON.parse(s))).catch(() => {});
  }, []);

  // Recalcular distâncias sempre que a localização muda; manter ref actualizada
  useEffect(() => {
    userLocationRef.current = userLocation;
    if (!userLocation) return;
    setBusinesses(prev => applyEstimatedDistances(prev, userLocation));

    // Reverse geocode to update the search location label (only if user hasn't typed a custom location)
    Location.reverseGeocodeAsync(userLocation)
      .then(results => {
        if (!results?.length) return;
        const r = results[0];
        const parts = [r.district || r.subregion, r.city || r.region].filter(Boolean);
        const label = parts.join(', ');
        if (label) filters.setSearchWhere(prev => prev === '' || prev === 'Talatona, Luanda' ? label : prev);
      })
      .catch(() => {});
  }, [userLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Upgrade assíncrono dos cards para distância real de estrada via OSRM.
  // Corre após ter localização + lista de negócios e evita requests repetidos.
  useEffect(() => {
    if (!userLocation) return;
    const candidates = businesses
      .map((b) => ({ id: b.id, lat: Number(b.latitude), lng: Number(b.longitude) }))
      .filter((b) => b.id && Number.isFinite(b.lat) && Number.isFinite(b.lng));
    if (!candidates.length) return;

    const locKey = `${userLocation.latitude.toFixed(4)},${userLocation.longitude.toFixed(4)}`;
    const bizKey = candidates.map((b) => `${b.id}:${b.lat.toFixed(4)},${b.lng.toFixed(4)}`).join('|');
    const key = `${locKey}|${bizKey}`;
    if (roadDistanceSyncRef.current.key === key) return;

    roadDistanceSyncRef.current.key = key;
    const requestId = roadDistanceSyncRef.current.requestId + 1;
    roadDistanceSyncRef.current.requestId = requestId;

    (async () => {
      const map = await fetchRoadDistancesMap(userLocation, candidates);
      if (!map.size) return;
      if (roadDistanceSyncRef.current.requestId !== requestId) return;
      setBusinesses(prev => prev.map((b) => {
        const km = map.get(b.id);
        if (!Number.isFinite(km)) return b;
        return { ...b, distance: km, distanceText: formatDistanceText(km) };
      }));
    })();
  }, [businesses, userLocation]);

  useEffect(() => {
    if (!userLocation?.latitude || !userLocation?.longitude) return;
    if (isStartupLoading) return;
    if (hybridFeedLoadedRef.current) return;
    hybridFeedLoadedRef.current = true;
    handleHomeRefresh();
  }, [userLocation?.latitude, userLocation?.longitude, isStartupLoading, handleHomeRefresh]);

  // ── Startup — carrega perfil, dashboard do dono e negócios em paralelo ────
  //
  // IMPORTANTE: usa Promise.allSettled em vez de Promise.all para que a falha
  // de uma chamada (ex: getBusinesses() → 503) não cancele as restantes nem
  // substitua toda a lista de negócios por mocks sem owner.id, o que causaria
  // o OwnerModule a mostrar o ecrã de onboarding ("Ainda não tens um negócio").
  //
  // Adicionalmente, o negócio do dono é persistido em AsyncStorage (OWNER_BIZ_CACHE_KEY)
  // e injectado na lista sempre que não seja encontrado na resposta da API.
  useEffect(() => {
    let cancelled = false;

    const startup = async () => {
      // 1. Ler negócio do dono da cache antes das chamadas de rede
      let cachedOwnerBiz = null;
      if (authSession.isOwner && authSession.user?.id) {
        try {
          const raw = await AsyncStorage.getItem(OWNER_BIZ_CACHE_KEY);
          cachedOwnerBiz = raw ? JSON.parse(raw) : null;
        } catch { /* ignorar erros de leitura da cache */ }
      }

      // 2. Helper: garante que o negócio do dono está sempre na lista de negócios.
      //    Se estiver na lista → actualiza a cache; se não estiver → injeccta da cache.
      const ensureOwnerBizInList = (list) => {
        if (!authSession.isOwner || !authSession.user?.id) return list;
        const userId = authSession.user.id;
        const found = list.find((b) => b?.owner?.id === userId);
        if (found) {
          // Negócio encontrado — persistir para uso offline
          AsyncStorage.setItem(OWNER_BIZ_CACHE_KEY, JSON.stringify(found)).catch(() => {});
          return list;
        }
        // Não encontrado na lista (API falhou ou não retornou owner) — injectar da cache
        if (cachedOwnerBiz?.owner?.id === userId) {
          return [cachedOwnerBiz, ...list];
        }
        return list;
      };

      try {
        // 3. Chamadas paralelas independentes — rejeições individuais não afectam as outras
        const [meSettled, dashSettled, bizSettled, recSettled, hybridSettled] = await Promise.allSettled([
          authSession.accessToken
            ? backendApi.getMe(authSession.accessToken)
            : Promise.resolve(null),
          authSession.accessToken && authSession.isOwner
            ? backendApi.getOwnerDashboard(authSession.accessToken)
            : Promise.resolve(null),
          backendApi.getBusinesses(),
          authSession.accessToken
            ? backendApi.getRecommendations(40, authSession.accessToken).catch(() => [])
            : Promise.resolve([]),
          userLocation?.latitude && userLocation?.longitude
            ? backendApi.getHybridHomeFeed({
                lat: userLocation.latitude,
                lng: userLocation.longitude,
                radiusKm: 20,
                limit: 15,
              }).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        const meRes     = meSettled.status     === 'fulfilled' ? meSettled.value     : null;
        const dashRes   = dashSettled.status   === 'fulfilled' ? dashSettled.value   : null;
        const bizRes    = bizSettled.status    === 'fulfilled' ? bizSettled.value    : null;
        const recRes    = recSettled.status    === 'fulfilled' ? recSettled.value    : null;
        const hybridRes = hybridSettled.status === 'fulfilled' ? hybridSettled.value : null;

        if (bizSettled.status === 'rejected') {
          console.warn('[Startup][getBusinesses falhou — usando cache do dono se disponível]',
            bizSettled.reason?.message || '');
        }

        setProfileData(meRes || null);
        setOwnerDashboardData(authSession.isOwner ? (dashRes || null) : null);

        const hybridItems = Array.isArray(hybridRes?.items) ? hybridRes.items : [];
        if (hybridItems.length > 0) {
          const fromFeed = hybridItems
            .map(normalizeBusiness)
            .filter(Boolean)
            .map((biz, idx) => {
              const raw = hybridItems[idx] || {};
              return {
                ...biz,
                recommendationScore: Number(raw.rankingScore || biz.recommendationScore || 0),
                recommendationReason: raw.feedSlot || biz.recommendationReason || 'Feed híbrido',
              };
            });

          const feedIds = new Set(fromFeed.map((b) => b.id));
          const fromApi = (Array.isArray(bizRes) ? bizRes : [])
            .map(normalizeBusiness)
            .filter(Boolean)
            .filter((b) => !feedIds.has(b.id));

          const mergedIds = new Set([...fromFeed, ...fromApi].map((b) => b.id));
          const mocksFallback = MOCK_BUSINESSES_INITIAL.filter((b) => !mergedIds.has(b.id));
          setBusinesses(ensureOwnerBizInList(
            applyEstimatedDistances([...fromFeed, ...fromApi, ...mocksFallback], userLocationRef.current),
          ));
          return;
        }

        const fromApi = (Array.isArray(bizRes) ? bizRes : [])
          .map(normalizeBusiness)
          .filter(Boolean);
        const recMap = new Map((Array.isArray(recRes) ? recRes : []).map(r => [r.id, r]));
        const apiIds = new Set(fromApi.map(b => b.id));
        const merged = [...fromApi, ...MOCK_BUSINESSES_INITIAL.filter(b => !apiIds.has(b.id))]
          .map((biz) => {
            const rec = recMap.get(biz.id);
            return rec
              ? { ...biz, recommendationScore: rec.recommendationScore, recommendationReason: rec.reason }
              : biz;
          })
          .sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
        setBusinesses(ensureOwnerBizInList(applyEstimatedDistances(merged, userLocationRef.current)));
      } catch (error) {
        // Erro inesperado fora do allSettled (ex: erro de parsing)
        console.error('[Startup][ERRO_INESPERADO]', {
          reason: error?.type || 'unknown',
          status: error?.status || null,
          message: error?.message || 'Falha no startup.',
        });
        if (!cancelled) {
          setProfileData(null);
          setOwnerDashboardData(null);
          // Mesmo em erro inesperado, tentar preservar o negócio do dono
          const fallback = ensureOwnerBizInList(MOCK_BUSINESSES_INITIAL);
          setBusinesses(fallback);
        }
      } finally {
        if (!cancelled) setIsStartupLoading(false);
      }
    };

    startup();

    return () => {
      cancelled = true;
    };
  }, [authSession.accessToken, authSession.isOwner, authSession.user?.id, userLocation?.latitude, userLocation?.longitude]);

  useEffect(() => {
    if (!authSession.accessToken) return;
    backendApi.syncOfflineMutations(authSession.accessToken).catch(() => {});
  }, [authSession.accessToken]);

  const handleTabPress = useCallback((tabId) => {
    if (tabId === 'exitbusiness') { setIsBusinessMode(false); setActiveNavTab('home'); return; }
    if (isBusinessMode) setActiveBusinessTab(tabId);
    else setActiveNavTab(tabId);
  }, [isBusinessMode]);

  const handleToggleOwnerMode = useCallback(() => {
    if (authSession.isOwner) {
      setIsBusinessMode((current) => !current);
      return;
    }
    // Staff pode entrar no módulo PMS via este botão
    if (authSession.isStaff) {
      setIsBusinessMode(true);
      setActiveBusinessTab('dashboard');
      setIsStaffMode(true);
      return;
    }
    Alert.alert('Acesso restrito', 'Apenas utilizadores com perfil OWNER podem entrar no modo Dono.');
  }, [authSession.isOwner, authSession.isStaff]);

  useEffect(() => {
    if (authSession.loading) return;
    if (!authSession.isOwner && !authSession.isStaff && isBusinessMode) {
      setIsBusinessMode(false);
      setActiveNavTab('home');
    }
    if (!authSession.isStaff && isStaffMode) {
      setIsStaffMode(false);
    }
  }, [authSession.loading, authSession.isOwner, authSession.isStaff, isBusinessMode, isStaffMode]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
      {/* ── HOME / OWNER — animado pelo Meta pattern ─── */}
      <Animated.View style={meta.homeAnimatedStyle}>
        <View style={{ flex: 1, backgroundColor: '#F7F7F8' }}>

          {/* Admin */}
          {authSession.isAdmin && (
            <AdminModule
              accessToken={authSession.accessToken}
              onImpersonationSession={handleImpersonationSession}
              onExit={() => {}}
              onLogout={handleLogout}
              insets={insets}
            />
          )}

          {/* Staff */}
          {isStaff && isBusinessMode && staffBusinessId && (
            <StaffHospitalityView
              businesses={businesses}
              businessId={staffBusinessId}
              staffRole={staffRole}
              accessToken={authSession.accessToken}
              liveBookings={liveSync.bookings}
              onLogout={handleLogout}
            />
          )}

          {/* Cliente: todas as tabs via HomeModuleFull */}
          {!isBusinessMode && !authSession.isAdmin && (
            <HomeModuleFull
              {...filters}
              activeNavTab={activeNavTab}
              onSetActiveNavTab={setActiveNavTab}
              onToggleOwnerMode={handleToggleOwnerMode}
              setActiveBusinessTab={setActiveBusinessTab}
              USER_PROFILE={userProfile}
              businesses={filters.filteredBusinesses}
              featuredBusinesses={businesses}
              onSelectBusiness={handleBusinessPress}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={toggleBookmark}
              notifications={notifications}
              onOpenAppLayer={meta.openAppLayer}
              isBusinessMode={isBusinessMode}
              locationPermission={locationPermission}
              onRequestLocation={handleLocationIconPress}
              onOpenSortModal={() => filters.setShowSortModal(true)}
              onOpenFilters={() => filters.setShowAdvancedFilters(true)}
              insets={insets}
              authUser={authSession.accessToken ? authSession.user : null}
              accessToken={authSession.accessToken}
              liveBookings={liveSync.bookings}
              onOpenAuth={handleOpenAuth}
              onLogout={handleLogout}
              onRefresh={handleHomeRefresh}
              refreshing={homeRefreshing}
              isLoading={isStartupLoading || isLocationBootstrapLoading}
            />
          )}

          {/* Dono */}
          {isBusinessMode && !isStaff && !authSession.isAdmin && (
            <OwnerModule
              businesses={businesses}
              activeBusinessTab={activeBusinessTab}
              setActiveBusinessTab={setActiveBusinessTab}
              insets={insets}
              onUpdateBusiness={updateOwnerBiz}
              onSyncPromoDeals={syncPromoDeals}
              onExitOwnerMode={handleExitOwnerMode}
              onViewBusiness={handleBusinessPress}
              liveBookings={liveSync.bookings}
              liveNotifications={notifications}
              onMarkNotificationRead={liveSync.markNotificationRead}
              onMarkAllNotificationsRead={liveSync.markAllNotificationsRead}
              authRole={authSession.user?.role || 'CLIENT'}
              authEmail={authSession.user?.email || ''}
              authUserId={authSession.user?.id || null}
              accessToken={authSession.accessToken}
              onRefreshOwnerData={refreshOwnerData}
              ownerMetrics={ownerMetrics}
              ownerRoomBookings={ownerRoomBookings}
              onOwnerRoomBookingsChange={setOwnerRoomBookings}
            />
          )}

          {!authSession.isAdmin && !isStaff && <BottomNavBar isBusinessMode={isBusinessMode} activeNavTab={activeNavTab} activeBusinessTab={activeBusinessTab} insets={insets} onTabPress={handleTabPress} />}
        </View>
      </Animated.View>

            {/* ── AUTH MODAL ─────────────────────────────────────── */}
      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        initialTab={authModalTab}
        initialRole={authModalRole}
      />

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
            userLocation={userLocation}
            authSession={{
              accessToken: authSession.accessToken,
              userId: authSession.user?.id,
              role: authSession.user?.role,
            }}
            onOpenAuth={handleOpenAuth}
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
      {showDetail && selectedBusiness && layer.activeLayer && authSession.accessToken && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <OperationalLayerRenderer
            layer={layer}
            isOwner={authSession.isOwner || isBusinessMode}
            tenantId={selectedBusiness?.id}
            accessToken={authSession.accessToken}
            createBooking={liveSync.createBooking}
            liveBookings={liveSync.bookings}
            updateOwnerBiz={updateOwnerBiz}
            ownerRoomBookings={ownerRoomBookings}
            onOwnerRoomBookingsChange={setOwnerRoomBookings}
            liveBusiness={businesses.find(b => b.id === layer.activeBusiness?.id) || layer.activeBusiness}
          />
        </View>
      )}

      {locationPermission === 'undetermined' && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }]}>
          <View style={{ width: '100%', maxWidth: 360, backgroundColor: COLORS.white, borderRadius: 16, padding: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.darkText, marginBottom: 10 }}>
              O AchAqui precisa da tua localização para mostrar negócios perto de ti
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: COLORS.red, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
              onPress={requestLocationPermission}
              activeOpacity={0.85}
            >
              <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '700' }}>Permitir localização</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}