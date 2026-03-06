import 'dotenv/config';
import { PrismaClient, BusinessCategory, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const OWNER_EMAIL = 'owner@achaqui.com';
const REAL_BUSINESS_ID = '5d5f1a56-0b74-4e40-b4d7-fdb2c438efaa';
const REAL_BUSINESS_NAME = 'AchAqui Real';

const REAL_SERVICES = [
  {
    name: 'Corte de Cabelo',
    price: 3500,
    capacity: 1,
    description: 'Corte profissional com acabamento moderno.',
  },
  {
    name: 'Barba',
    price: 2200,
    capacity: 1,
    description: 'Modelagem e acabamento completo de barba.',
  },
  {
    name: 'Hidratação Capilar',
    price: 4800,
    capacity: 1,
    description: 'Tratamento capilar com hidratação profunda.',
  },
];

async function run() {
  const owner = await prisma.user.findUnique({
    where: { email: OWNER_EMAIL },
    select: { id: true, email: true, role: true, name: true },
  });

  if (!owner) {
    throw new Error(`Owner não encontrado: ${OWNER_EMAIL}`);
  }

  if (owner.role !== UserRole.OWNER) {
    throw new Error(`Utilizador ${OWNER_EMAIL} não tem role OWNER.`);
  }

  const business = await prisma.business.upsert({
    where: { id: REAL_BUSINESS_ID },
    create: {
      id: REAL_BUSINESS_ID,
      ownerId: owner.id,
      name: REAL_BUSINESS_NAME,
      category: BusinessCategory.PROFESSIONAL,
      description: 'Negócio real para testes end-to-end AchAqui.',
      latitude: -8.8388,
      longitude: 13.2344,
      metadata: {
        source: 'bootstrap-real-business',
        modules: {
          professional: true,
          beauty: true,
        },
      },
    },
    update: {
      ownerId: owner.id,
      name: REAL_BUSINESS_NAME,
      category: BusinessCategory.PROFESSIONAL,
      description: 'Negócio real para testes end-to-end AchAqui.',
      latitude: -8.8388,
      longitude: 13.2344,
      metadata: {
        source: 'bootstrap-real-business',
        modules: {
          professional: true,
          beauty: true,
        },
      },
    },
  });

  const existingItems = await prisma.item.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true },
  });

  const existingByName = new Map(existingItems.map((item) => [item.name, item]));

  for (const service of REAL_SERVICES) {
    const existing = existingByName.get(service.name);

    if (existing) {
      await prisma.item.update({
        where: { id: existing.id },
        data: {
          price: service.price,
          capacity: service.capacity,
          description: service.description,
        },
      });
      continue;
    }

    await prisma.item.create({
      data: {
        businessId: business.id,
        name: service.name,
        price: service.price,
        capacity: service.capacity,
        description: service.description,
      },
    });
  }

  const items = await prisma.item.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true, price: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log('[real-business] ready', {
    owner,
    business: {
      id: business.id,
      name: business.name,
      ownerId: business.ownerId,
    },
    services: items,
  });
}

run()
  .catch((error) => {
    console.error('[real-business] failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
