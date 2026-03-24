import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface OutscraperRow {
  name?: string;
  category?: string;
  subtypes?: string;
  type?: string;
  full_address?: string;
  street?: string;
  city?: string;
  borough?: string;
  postal_code?: string;
  country?: string;
  country_code?: string;
  latitude?: string | number;
  longitude?: string | number;
  phone?: string;
  site?: string;
  email?: string;
  rating?: string | number;
  reviews?: string | number;
  photo?: string;
  logo?: string;
  working_hours?: string | Record<string, unknown>;
  working_hours_old_format?: string | Record<string, unknown>;
  description?: string;
  about?: string;
  business_status?: string;
  place_id?: string;
  google_id?: string;
  located_in?: string;
  verified?: string | boolean;
  [key: string]: unknown;
}

export interface ImportResult {
  total: number;
  imported: number;
  updated: number;
  suggested: number;   // negócios com dono — sugestão criada
  skipped: number;     // sem place_id ou dados inválidos
  errors: number;
  details: {
    imported: string[];
    updated: string[];
    suggested: string[];
    skipped: string[];
    errored: string[];
  };
}

// ─── Serviço ──────────────────────────────────────────────────────────────────

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Parser CSV simples (sem dependências externas) ───────────────────────────
  parseCSV(csvText: string): OutscraperRow[] {
    const lines = csvText.split('\n').filter((l) => l.trim());
    if (lines.length < 2) return [];

    const headers = this.parseCSVLine(lines[0]);
    const rows: OutscraperRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue;
      const row: OutscraperRow = {};
      headers.forEach((h, idx) => {
        row[h.trim()] = values[idx]?.trim() ?? '';
      });
      rows.push(row);
    }

    return rows;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  // ── Parser de horários Outscraper ────────────────────────────────────────────

  /**
   * Converte uma string de horário individual (e.g. "9:00 AM – 6:00 PM") para
   * formato 24h estruturado. Devolve null se o dia estiver fechado ou indecifrável.
   */
  private parseHoursString(str: string): { open: string; close: string } | null {
    if (!str) return null;
    const lower = str.toLowerCase().trim();

    // Fechado — inclui variantes portuguesas e inglesas
    if (['encerrado', 'closed', 'fechado', 'cerrado'].some(w => lower.includes(w))) return null;

    // 24 horas
    if (lower.includes('24 hour') || lower.includes('24h') || lower.includes('24 hora')) {
      return { open: '00:00', close: '23:59' };
    }

    const normalized = str.replace(/[\u2013\u2014\u2012]/g, '-').replace(/\u202f|\u2009/g, ' ');

    // "9:00 AM - 6:00 PM" ou "9 AM - 6 PM"
    const ampm = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (ampm) {
      return {
        open:  this.to24h(+ampm[1], +(ampm[2] ?? '0'), ampm[3].toUpperCase() as 'AM' | 'PM'),
        close: this.to24h(+ampm[4], +(ampm[5] ?? '0'), ampm[6].toUpperCase() as 'AM' | 'PM'),
      };
    }

    // "09:00-18:00" (24h)
    const h24 = normalized.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
    if (h24) {
      return {
        open:  `${h24[1].padStart(2, '0')}:${h24[2]}`,
        close: `${h24[3].padStart(2, '0')}:${h24[4]}`,
      };
    }

    // "9h-18h" ou "9h às 18h"
    const hFmt = normalized.match(/(\d{1,2})h\s*(?:[-–]|às|as)\s*(\d{1,2})h/i);
    if (hFmt) {
      return {
        open:  `${hFmt[1].padStart(2, '0')}:00`,
        close: `${hFmt[2].padStart(2, '0')}:00`,
      };
    }

    return null; // formato não reconhecido → trata como desconhecido
  }

  private to24h(hours: number, minutes: number, period: 'AM' | 'PM'): string {
    let h = hours;
    if (period === 'AM' && h === 12) h = 0;
    if (period === 'PM' && h !== 12) h += 12;
    return `${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  /**
   * Parseia o campo working_hours do Outscraper para um horário semanal estruturado.
   *
   * Suporta três formatos:
   *  1. Objeto já estruturado com nomes em português e valores array
   *     {"domingo": ["Encerrado"], "sábado": ["12:30-23:30"], ...}
   *  2. Python dict string com aspas simples
   *     "{'Monday': '9:00 AM – 6:00 PM', 'Sunday': 'Closed'}"
   *  3. Separado por ';': "Mo-Fr 09:00-18:00; Sa 09:00-14:00"
   */
  private parseWorkingHours(
    raw: string | Record<string, unknown> | null,
  ): Record<string, { open: string; close: string } | null> | null {
    if (!raw) return null;

    const DAY_MAP: Record<string, string> = {
      // English
      monday: 'monday', tuesday: 'tuesday', wednesday: 'wednesday',
      thursday: 'thursday', friday: 'friday', saturday: 'saturday', sunday: 'sunday',
      mon: 'monday', tue: 'tuesday', wed: 'wednesday',
      thu: 'thursday', fri: 'friday', sat: 'saturday', sun: 'sunday',
      mo: 'monday', tu: 'tuesday', we: 'wednesday',
      th: 'thursday', fr: 'friday', sa: 'saturday', su: 'sunday',
      // Portuguese
      'segunda-feira': 'monday', segunda: 'monday',
      'terça-feira': 'tuesday', 'terca-feira': 'tuesday', terça: 'tuesday', terca: 'tuesday',
      'quarta-feira': 'wednesday', quarta: 'wednesday',
      'quinta-feira': 'thursday', quinta: 'thursday',
      'sexta-feira': 'friday', sexta: 'friday',
      sábado: 'saturday', sabado: 'saturday',
      domingo: 'sunday',
    };

    // ── Formato 1: Objeto já estruturado (formato real do DB / Outscraper JSON) ─
    // {"domingo": ["Encerrado"], "sábado": ["12:30-23:30"], ...}
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      const schedule: Record<string, { open: string; close: string } | null> = {};
      for (const [day, val] of Object.entries(raw)) {
        const key = DAY_MAP[day.toLowerCase().trim()];
        if (!key) continue;
        // O valor pode ser array ou string directa
        const hoursStr = Array.isArray(val) ? String(val[0] ?? '') : String(val ?? '');
        schedule[key] = this.parseHoursString(hoursStr);
      }
      if (Object.keys(schedule).length > 0) return schedule;
    }

    // A partir daqui o raw é string
    const rawStr = String(raw);

    // ── Formato 2: Python dict com aspas simples ──────────────────────────────
    // {'Monday': '9:00 AM – 6:00 PM', 'Sunday': 'Closed'}
    try {
      const jsonStr = rawStr
        .replace(/'/g, '"')
        .replace(/[\u2013\u2014\u2012]/g, '-')
        .replace(/\u202f|\u2009/g, ' ');

      const parsed: Record<string, string> = JSON.parse(jsonStr);
      const schedule: Record<string, { open: string; close: string } | null> = {};

      for (const [day, hoursStr] of Object.entries(parsed)) {
        const key = DAY_MAP[day.toLowerCase().trim()];
        if (!key) continue;
        // Pode vir como array após parse (e.g. {"domingo": ["Encerrado"]})
        const str = Array.isArray(hoursStr) ? String((hoursStr as unknown[])[0] ?? '') : String(hoursStr ?? '');
        schedule[key] = this.parseHoursString(str);
      }

      if (Object.keys(schedule).length > 0) return schedule;
    } catch { /* tenta próximo formato */ }

    // ── Formato 3: Separado por ';': "Mo-Fr 09:00-18:00; Sa 09:00-14:00" ──────
    if (rawStr.includes(';') || /\b(mo|tu|we|th|fr|sa|su)\b/i.test(rawStr)) {
      try {
        const schedule: Record<string, { open: string; close: string } | null> = {};
        const allDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const parts = rawStr.split(';').map((p) => p.trim()).filter(Boolean);

        for (const part of parts) {
          const match = part.match(/^([A-Za-záàâãéèêíïóôõöúùüçÇ\-]+)[:\s]+(.+)$/);
          if (!match) continue;

          const daysPart  = match[1].trim().toLowerCase();
          const hoursPart = match[2].trim();
          const dayHours  = this.parseHoursString(hoursPart);

          if (daysPart.includes('-')) {
            const [startKey, endKey] = daysPart.split('-');
            const startIdx = allDays.indexOf(DAY_MAP[startKey] ?? '');
            const endIdx   = allDays.indexOf(DAY_MAP[endKey]   ?? '');
            if (startIdx !== -1 && endIdx !== -1) {
              for (let i = startIdx; i <= endIdx; i++) schedule[allDays[i]] = dayHours;
            }
          } else {
            const key = DAY_MAP[daysPart];
            if (key) schedule[key] = dayHours;
          }
        }

        if (Object.keys(schedule).length > 0) return schedule;
      } catch { /* ignora */ }
    }

    return null;
  }

  /**
   * Calcula isOpen e statusText a partir do horário estruturado e do status
   * do negócio no momento da importação.
   */
  private computeIsOpen(
    schedule: Record<string, { open: string; close: string } | null> | null,
    isTemporarilyClosed: boolean,
  ): { isOpen: boolean; statusText: string } {
    if (isTemporarilyClosed) {
      return { isOpen: false, statusText: 'Temporariamente fechado' };
    }

    if (!schedule) {
      // Sem horário disponível — assume aberto para não esconder o negócio
      return { isOpen: true, statusText: 'Aberto' };
    }

    const now = new Date();
    const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayKey   = DAYS[now.getDay()];
    const todayHours = schedule[todayKey];

    // Dia explicitamente fechado (null) vs. dia não presente no horário (undefined)
    if (todayHours === null) {
      // Encontra próxima abertura
      for (let i = 1; i <= 7; i++) {
        const nextKey   = DAYS[(now.getDay() + i) % 7];
        const nextHours = schedule[nextKey];
        if (nextHours) {
          const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
          const label  = i === 1 ? `amanhã às ${nextHours.open}` : `${labels[(now.getDay() + i) % 7]} às ${nextHours.open}`;
          return { isOpen: false, statusText: `Abre ${label}` };
        }
      }
      return { isOpen: false, statusText: 'Fechado hoje' };
    }

    if (!todayHours) {
      // Dia não especificado no horário — não sabemos, assume aberto
      return { isOpen: true, statusText: 'Aberto' };
    }

    const nowMin   = now.getHours() * 60 + now.getMinutes();
    const [oh, om] = todayHours.open.split(':').map(Number);
    const [ch, cm] = todayHours.close.split(':').map(Number);
    const openMin  = oh * 60 + om;
    const closeMin = ch * 60 + cm;

    if (nowMin >= openMin && nowMin < closeMin) {
      const minsLeft = closeMin - nowMin;
      return {
        isOpen: true,
        statusText: minsLeft <= 60
          ? `Fecha em ${minsLeft} min`
          : `Aberto até ${todayHours.close}`,
      };
    }

    // Fechado agora — quando abre?
    if (nowMin < openMin) {
      return { isOpen: false, statusText: `Abre às ${todayHours.open}` };
    }

    // Passou o horário de hoje — próximo dia
    for (let i = 1; i <= 7; i++) {
      const nextKey   = DAYS[(now.getDay() + i) % 7];
      const nextHours = schedule[nextKey];
      if (nextHours) {
        const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const label  = i === 1 ? `amanhã às ${nextHours.open}` : `${labels[(now.getDay() + i) % 7]} às ${nextHours.open}`;
        return { isOpen: false, statusText: `Abre ${label}` };
      }
    }

    return { isOpen: false, statusText: 'Fechado' };
  }

  // ── Mapear linha Outscraper → dados do negócio ───────────────────────────────
  private resolveCategory(category: string, subtypes?: string): {
    primaryCategoryId: string; businessType: string; subCategoryIds: string[];
  } {
    const all = [category, ...(subtypes ? subtypes.split(',') : [])].map(s => s.trim().toLowerCase());
    const has = (...terms: string[]) => terms.some(t => all.some(a => a.includes(t)));

    // Hotéis & Alojamento
    if (has('lodging','hotel','hostel','resort','pousada','motel','guest_house','extended_stay','boutique_hotel'))
      return { primaryCategoryId:'hotelsTravel', businessType:'accommodation', subCategoryIds:['hotelsTravel','restaurants','food'] };

    // Restaurantes
    if (has('restaurant','meal_takeaway','meal_delivery','fast_food','pizza','seafood','steak_house','restaurante'))
      return { primaryCategoryId:'restaurants', businessType:'food', subCategoryIds:['restaurants','food','delivery'] };

    // Cafés & Pastelarias (antes de 'bar' para evitar conflito)
    if (has('cafe','coffee_shop','tea_house','bakery','donut','dessert','ice_cream','pastelaria','padaria','cafetaria'))
      return { primaryCategoryId:'coffee', businessType:'food', subCategoryIds:['coffee','food','restaurants'] };

    // Bares & Nightlife
    if (has('bar','night_club','cocktail_bar','pub','wine_bar','sports_bar','discoteca'))
      return { primaryCategoryId:'bars', businessType:'food', subCategoryIds:['bars','nightlife','food'] };

    // Spas & Massagens (antes de beautysalons)
    if (has('spa','massage','wellness_center','day_spa'))
      return { primaryCategoryId:'spas', businessType:'beauty', subCategoryIds:['spas','beautysalons','beauty','health'] };

    // Salões de Beleza & Cabeleireiros
    if (has('beauty_salon','hair_salon','hair_care','nail_salon','eyebrow','eyelash','barbearia','barber','cabeleireiro','salão de beleza'))
      return { primaryCategoryId:'beautysalons', businessType:'beauty', subCategoryIds:['beautysalons','beauty','health'] };

    // Saúde: Clínicas, Hospitais, Farmácias
    if (has('pharmacy','drugstore','farmácia','farmacia'))
      return { primaryCategoryId:'health', businessType:'health', subCategoryIds:['health','shopping'] };
    if (has('hospital','doctor','clinic','dentist','physiotherapist','medical_lab','optician','policlínica','clínica'))
      return { primaryCategoryId:'health', businessType:'health', subCategoryIds:['health'] };

    // Fitness & Desporto
    if (has('gym','fitness_center','sports_club','swimming','yoga','pilates','martial_arts','boxing','academia','ginásio','sala de fitness'))
      return { primaryCategoryId:'active', businessType:'sports', subCategoryIds:['active','health'] };

    // Educação
    if (has('school','primary_school','secondary_school','university','language_school','tutoring','driving_school','escola','colégio','instituto','universidade'))
      return { primaryCategoryId:'education', businessType:'education', subCategoryIds:['education'] };

    // Compras & Supermercados
    if (has('supermarket','grocery','convenience_store','shopping_mall','clothing','electronics','furniture','book_store','supermercado','mercado'))
      return { primaryCategoryId:'shopping', businessType:'retail', subCategoryIds:['shopping','delivery'] };

    // Serviços Financeiros
    if (has('bank','atm','insurance','accounting','financial','money_transfer','banco','seguro','contabilidade'))
      return { primaryCategoryId:'financial', businessType:'finance', subCategoryIds:['financial','professional'] };

    // Automóveis
    if (has('car_repair','car_dealer','car_wash','gas_station','tire','auto_parts','oil_change','oficina','mecânico','posto de gasolina'))
      return { primaryCategoryId:'automotive', businessType:'automotive', subCategoryIds:['automotive'] };

    // Serviços Domésticos
    if (has('electrician','plumber','painter','carpenter','locksmith','pest_control','moving','laundry','dry_cleaning','eletricista','lavandaria'))
      return { primaryCategoryId:'homeservices', businessType:'service', subCategoryIds:['homeservices','localservices'] };

    // Eventos & Entretenimento
    if (has('event_venue','wedding','catering','party_planner','photo_studio','espaço de eventos'))
      return { primaryCategoryId:'eventplanning', businessType:'service', subCategoryIds:['eventplanning','arts'] };

    // Animais
    if (has('veterinary','pet_store','pet_grooming','dog_trainer','veterinário'))
      return { primaryCategoryId:'pets', businessType:'service', subCategoryIds:['pets','health'] };

    // Serviços Profissionais
    if (has('lawyer','legal','notary','architect','engineer','photographer','marketing','advertising','consultant','it_company'))
      return { primaryCategoryId:'professional', businessType:'professional', subCategoryIds:['professional','localservices'] };

    // Delivery
    if (has('delivery','courier','logistics','transport'))
      return { primaryCategoryId:'delivery', businessType:'logistics', subCategoryIds:['delivery'] };

    return { primaryCategoryId:'services', businessType:'professional', subCategoryIds:['services'] };
  }

  private mapRow(row: OutscraperRow) {
    const lat = parseFloat(String(row.latitude ?? ''));
    const lng = parseFloat(String(row.longitude ?? ''));

    if (!row.name || isNaN(lat) || isNaN(lng)) return null;

    // Filtrar negócios fechados permanentemente
    const status = String(row.business_status ?? 'OPERATIONAL').toUpperCase();
    if (status === 'CLOSED_PERMANENTLY') return null;

    // Categoria — usa subtypes (mais específico) ou category
    const rawCategory = row.subtypes
      ? String(row.subtypes).split(',')[0].trim()
      : String(row.category ?? 'other').trim();
    const category = rawCategory;
    const { primaryCategoryId, businessType, subCategoryIds } =
      this.resolveCategory(rawCategory, row.subtypes ? String(row.subtypes) : undefined);

    const description = String(row.description || row.about || row.full_address || row.name).slice(0, 500);

    // Município — extrai do borough ou city
    const municipality = String(row.borough || row.city || '').trim() || null;

    // Fotos — principal + logo
    const photos: string[] = [];
    if (row.photo) photos.push(String(row.photo));
    if (row.logo)  photos.push(String(row.logo));

    // Email do dono/negócio (campo owner_title às vezes tem email)
    const email = row.email
      ? String(row.email)
      : null;

    // Horários — parseia o formato Outscraper (string ou objecto já estruturado)
    const rawHours = (row.working_hours ?? row.working_hours_old_format) as string | Record<string, unknown> | null ?? null;
    const schedule = this.parseWorkingHours(rawHours);
    const isTemporarilyClosed = status === 'CLOSED_TEMPORARILY';
    const { isOpen, statusText } = this.computeIsOpen(schedule, isTemporarilyClosed);

    // Rating e reviews
    const rating       = row.rating  ? parseFloat(String(row.rating))  : null;
    const reviewsCount = row.reviews ? parseInt(String(row.reviews))   : null;

    const metadata: Record<string, unknown> = {
      primaryCategoryId,
      businessType,
      subCategoryIds,
      address:      row.full_address  || null,
      street:       row.street        || null,
      city:         row.city          || null,
      country:      row.country       || null,
      postalCode:   row.postal_code   || null,
      phone:        row.phone         || null,
      website:      row.site          || null,
      email,
      rating,
      reviewsCount,
      photos,
      hours:        schedule,          // horário semanal estruturado (ou null se não disponível)
      workingHours: rawHours,          // string raw original do Outscraper (referência)
      isOpen,                          // calculado a partir do schedule + hora actual
      statusText,                      // texto legível: "Aberto até 18:00", "Abre amanhã às 09:00", etc.
      status,                          // OPERATIONAL | CLOSED_TEMPORARILY
      verified:     row.verified === 'TRUE' || row.verified === true,
      placeTypes:   row.type          || null,
      locatedIn:    row.located_in    || null,
    };

    return {
      name:         String(row.name).slice(0, 255),
      category,
      description:  description || 'Sem descrição',
      latitude:     lat,
      longitude:    lng,
      municipality,
      // CLOSED_TEMPORARILY mantém-se activo (isActive:true) mas com isOpen:false no metadata,
      // para aparecer na listagem com o badge "Fechado" em vez de desaparecer completamente.
      isActive:     true,
      googlePlaceId: row.place_id ? String(row.place_id) : null,
      metadata,
    };
  }

  // ── Importação principal ─────────────────────────────────────────────────────
  async importRows(rows: OutscraperRow[]): Promise<ImportResult> {
    const result: ImportResult = {
      total: rows.length,
      imported: 0,
      updated: 0,
      suggested: 0,
      skipped: 0,
      errors: 0,
      details: { imported: [], updated: [], suggested: [], skipped: [], errored: [] },
    };

    // Processar em lotes de 50 para não sobrecarregar a DB
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      await Promise.all(batch.map((row) => this.processRow(row, result)));
    }

    return result;
  }

  private async processRow(row: OutscraperRow, result: ImportResult): Promise<void> {
    const mapped = this.mapRow(row);

    if (!mapped) {
      result.skipped++;
      result.details.skipped.push(String(row.name ?? 'sem nome'));
      return;
    }

    try {
      // Sem place_id — não conseguimos deduplicar, importa sempre
      if (!mapped.googlePlaceId) {
        await this.prisma.business.create({
          data: {
            name:      mapped.name,
            category:  mapped.category,
            description: mapped.description,
            latitude:  mapped.latitude,
            longitude: mapped.longitude,
            municipality: mapped.municipality,
            isActive:  mapped.isActive,
            metadata:  mapped.metadata as any,
            source:    'GOOGLE',
            isClaimed: false,
          },
        });
        result.imported++;
        result.details.imported.push(mapped.name);
        return;
      }

      // Verifica se já existe pelo googlePlaceId
      const existing = await this.prisma.business.findUnique({
        where: { googlePlaceId: mapped.googlePlaceId },
      });

      if (!existing) {
        // Novo negócio — importa directamente
        await this.prisma.business.create({
          data: {
            name:          mapped.name,
            category:      mapped.category,
            description:   mapped.description,
            latitude:      mapped.latitude,
            longitude:     mapped.longitude,
            municipality:  mapped.municipality,
            isActive:      mapped.isActive,
            metadata:      mapped.metadata as any,
            source:        'GOOGLE',
            googlePlaceId: mapped.googlePlaceId,
            isClaimed:     false,
          },
        });
        result.imported++;
        result.details.imported.push(mapped.name);
        return;
      }

      // Já existe — tem dono?
      if (existing.isClaimed && existing.ownerId) {
        // Criar sugestão de actualização para o dono
        await this.createSuggestion(existing.id, mapped, existing);
        result.suggested++;
        result.details.suggested.push(mapped.name);
        return;
      }

      // Sem dono — actualiza directamente
      await this.prisma.business.update({
        where: { id: existing.id },
        data: {
          name:         mapped.name,
          category:     mapped.category,
          description:  mapped.description,
          latitude:     mapped.latitude,
          longitude:    mapped.longitude,
          municipality: mapped.municipality,
          isActive:     mapped.isActive,
          metadata:     mapped.metadata as any,
          source:       'GOOGLE',
        },
      });
      result.updated++;
      result.details.updated.push(mapped.name);

    } catch (err) {
      result.errors++;
      result.details.errored.push(`${mapped.name}: ${String(err)}`);
    }
  }

  // ── Criar sugestão de actualização + notificar dono ──────────────────────────
  private async createSuggestion(
    businessId: string,
    suggested: ReturnType<typeof this.mapRow>,
    current: { name: string; category: string; description: string; metadata: unknown; ownerId: string | null },
  ) {
    if (!suggested) return;

    // Verificar se já existe sugestão PENDING para este negócio
    const existingSuggestion = await this.prisma.dataUpdateSuggestion.findFirst({
      where: { businessId, status: 'PENDING' },
    });

    // Actualiza sugestão existente em vez de criar duplicado
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    if (existingSuggestion) {
      await this.prisma.dataUpdateSuggestion.update({
        where: { id: existingSuggestion.id },
        data: {
          suggestedData: suggested as any,
          expiresAt,
        },
      });
      return;
    }

    await this.prisma.dataUpdateSuggestion.create({
      data: {
        businessId,
        source: 'GOOGLE',
        status: 'PENDING',
        suggestedData: suggested as any,
        currentData: {
          name:        current.name,
          category:    current.category,
          description: current.description,
          metadata:    current.metadata,
        } as any,
        expiresAt,
      },
    });

    // Notificar o dono
    if (current.ownerId) {
      await this.prisma.notification.create({
        data: {
          userId:  current.ownerId,
          title:   '📋 Dados actualizados disponíveis',
          message: `Encontrámos dados mais recentes para "${current.name}". Queres aplicar as actualizações?`,
          data:    { type: 'DATA_UPDATE_SUGGESTION', businessId } as any,
          isRead:  false,
        },
      });
    }
  }

  // ── Ver sugestões pendentes (para o dono) ────────────────────────────────────
  async getMySuggestions(ownerId: string) {
    return this.prisma.dataUpdateSuggestion.findMany({
      where: {
        status: 'PENDING',
        business: { ownerId },
      },
      include: {
        business: { select: { id: true, name: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Responder a uma sugestão (dono aceita ou rejeita) ────────────────────────
  async respondToSuggestion(
    suggestionId: string,
    ownerId: string,
    decision: 'ACCEPTED' | 'REJECTED',
  ) {
    const suggestion = await this.prisma.dataUpdateSuggestion.findFirst({
      where: {
        id: suggestionId,
        status: 'PENDING',
        business: { ownerId },
      },
      include: { business: true },
    });

    if (!suggestion) throw new BadRequestException('Sugestão não encontrada ou já respondida.');

    await this.prisma.dataUpdateSuggestion.update({
      where: { id: suggestionId },
      data: { status: decision, reviewedAt: new Date() },
    });

    if (decision === 'ACCEPTED') {
      const data = suggestion.suggestedData as any;
      await this.prisma.business.update({
        where: { id: suggestion.businessId },
        data: {
          name:        data.name        ?? suggestion.business.name,
          category:    data.category    ?? suggestion.business.category,
          description: data.description ?? suggestion.business.description,
          latitude:    data.latitude    ?? suggestion.business.latitude,
          longitude:   data.longitude   ?? suggestion.business.longitude,
          metadata:    data.metadata    ?? suggestion.business.metadata,
        },
      });
    }

    return { ok: true, decision };
  }

  // ── Estatísticas de importação para o admin ──────────────────────────────────
  async getImportStats() {
    const [totalGoogle, pendingSuggestions, acceptedSuggestions, rejectedSuggestions] =
      await Promise.all([
        this.prisma.business.count({ where: { source: 'GOOGLE' } }),
        this.prisma.dataUpdateSuggestion.count({ where: { status: 'PENDING' } }),
        this.prisma.dataUpdateSuggestion.count({ where: { status: 'ACCEPTED' } }),
        this.prisma.dataUpdateSuggestion.count({ where: { status: 'REJECTED' } }),
      ]);

    return { totalGoogle, pendingSuggestions, acceptedSuggestions, rejectedSuggestions };
  }
}