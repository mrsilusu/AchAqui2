import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as https from 'https';
import * as http from 'http';

@Injectable()
export class HtIcalService {
  private readonly logger = new Logger(HtIcalService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Fetch + parse de ficheiro .ics ────────────────────────────────────────
  private async fetchIcal(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { timeout: 8000 }, res => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} ao buscar iCal`));
          return;
        }
        let data = '';
        let size = 0;
        res.on('data', chunk => {
          size += chunk.length;
          if (size > 1024 * 1024) { req.destroy(); reject(new Error('Ficheiro .ics demasiado grande (> 1MB)')); return; }
          data += chunk;
        });
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout ao buscar iCal')); });
    });
  }

  // ─── Parse VEVENT → lista de bloqueios {start, end, uid, summary} ──────────
  private parseIcal(text: string): Array<{ uid: string; start: Date; end: Date; summary: string }> {
    const events: Array<{ uid: string; start: Date; end: Date; summary: string }> = [];
    const blocks = text.split('BEGIN:VEVENT');
    for (const block of blocks.slice(1)) {
      const dtStart  = block.match(/DTSTART[^:]*:([\dT Z+-]+)/)?.[1]?.trim();
      const dtEnd    = block.match(/DTEND[^:]*:([\dT Z+-]+)/)?.[1]?.trim();
      const uid      = block.match(/UID:(.+)/)?.[1]?.trim() ?? '';
      const summary  = block.match(/SUMMARY:(.+)/)?.[1]?.trim() ?? 'Bloqueado (iCal)';
      if (!dtStart || !dtEnd) continue;
      const parseDate = (s: string) => {
        // YYYYMMDD ou YYYYMMDDTHHmmssZ
        const clean = s.replace(/[^0-9T]/g, '');
        if (clean.length === 8) {
          return new Date(`${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}T12:00:00.000Z`);
        }
        return new Date(s);
      };
      const start = parseDate(dtStart);
      const end   = parseDate(dtEnd);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;
      events.push({ uid, start, end, summary });
    }
    return events;
  }

  // ─── Sincronizar iCal para um negócio ─────────────────────────────────────
  // Cria HtRoomBooking com status CONFIRMED e userId do owner para bloquear datas
  async syncForBusiness(businessId: string, ownerId: string): Promise<{
    synced: number; skipped: number; errors: string[];
  }> {
    const config = await this.prisma.htPmsConfig.findUnique({
      where: { businessId },
      select: { icalImportUrl: true },
    });
    if (!config?.icalImportUrl) return { synced: 0, skipped: 0, errors: ['Sem URL iCal configurado.'] };

    // Verificar que o owner tem permissão
    const biz = await this.prisma.business.findFirst({ where: { id: businessId, ownerId } });
    if (!biz) throw new Error('Sem permissão.');

    let icalText: string;
    try {
      icalText = await this.fetchIcal(config.icalImportUrl);
    } catch (e: any) {
      return { synced: 0, skipped: 0, errors: [e.message] };
    }

    const events = this.parseIcal(icalText);
    let synced = 0, skipped = 0;
    const errors: string[] = [];

    for (const ev of events) {
      try {
        // Verificar se já existe (por UID guardado nas notes)
        const existing = await this.prisma.htRoomBooking.findFirst({
          where: { businessId, notes: `ical:${ev.uid}` },
        });
        if (existing) { skipped++; continue; }

        // Criar bloqueio com userId do owner e notas identificativas
        await this.prisma.htRoomBooking.create({
          data: {
            businessId,
            userId:    ownerId,
            startDate: ev.start,
            endDate:   ev.end,
            status:    'CONFIRMED' as any,
            guestName: ev.summary,
            notes:     `ical:${ev.uid}`,
            rooms:     1,
          },
        });
        synced++;
      } catch (e: any) {
        errors.push(`UID ${ev.uid}: ${e.message}`);
      }
    }

    this.logger.log(`iCal sync ${businessId}: ${synced} criados, ${skipped} ignorados, ${errors.length} erros`);
    return { synced, skipped, errors };
  }
}
