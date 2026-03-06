import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter!: Transporter;

  async onModuleInit() {
    try {
      if (process.env.ETHEREAL_USER && process.env.ETHEREAL_PASS) {
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: process.env.ETHEREAL_USER,
            pass: process.env.ETHEREAL_PASS,
          },
        });
        return;
      }

      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao configurar Ethereal, a usar mock local: ${String(error)}`,
      );
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  async sendNewBookingEmail(params: {
    ownerEmail: string;
    clientEmail: string;
    businessName: string;
    startDate: Date;
    endDate: Date;
  }) {
    const subject = `Nova Reserva - ${params.businessName}`;
    const text = `Nova reserva criada para ${params.businessName} de ${params.startDate.toISOString()} até ${params.endDate.toISOString()}.`;

    const ownerResult = await this.transporter.sendMail({
      from: 'no-reply@achaqui.app',
      to: params.ownerEmail,
      subject,
      text,
    });

    const clientResult = await this.transporter.sendMail({
      from: 'no-reply@achaqui.app',
      to: params.clientEmail,
      subject,
      text,
    });

    return {
      ownerPreview: nodemailer.getTestMessageUrl(ownerResult),
      clientPreview: nodemailer.getTestMessageUrl(clientResult),
    };
  }
}
