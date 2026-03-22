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
  working_hours?: string;
  working_hours_old_format?: string;
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

    // Horários — preserva formato raw do Outscraper para parsing posterior
    const workingHours = row.working_hours || row.working_hours_old_format || null;

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
      photos,                              // array com photo + logo
      workingHours,                        // formato raw Outscraper
      status,                              // OPERATIONAL | CLOSED_TEMPORARILY | etc.
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
      isActive:     status !== 'CLOSED_TEMPORARILY',
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