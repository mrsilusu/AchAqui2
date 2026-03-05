import 'dotenv/config';
import { PrismaClient, BusinessCategory, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const OWNER_EMAIL   = 'owner@achaqui.com';
const PIZZARIA_ID   = 'c74f2850-0dcd-4f2c-a61a-aa9fd2c7459e';
const PIZZARIA_NAME = 'Pizzaria Bela Vista';

async function run() {
  const owner = await prisma.user.findUnique({
    where: { email: OWNER_EMAIL },
    select: { id: true, email: true, role: true, name: true },
  });

  if (!owner) throw new Error(`Owner não encontrado: ${OWNER_EMAIL}`);
  if (owner.role !== UserRole.OWNER) throw new Error(`Utilizador não tem role OWNER.`);

  console.log('[pizzaria] owner encontrado:', { id: owner.id, email: owner.email });

  const businessData = {
    ownerId: owner.id,
    name: PIZZARIA_NAME,
    category: BusinessCategory.HOSPITALITY,
    description: 'Pizzaria italiana com quartos disponíveis para hospedagem. Talatona, Luanda.',
    latitude: -8.8388,
    longitude: 13.2894,
    metadata: {
      source: 'bootstrap-pizzaria',
      icon: '🍕',
      rating: 4.8,
      reviews: 120,
      priceLevel: 2,
      isPremium: true,
      verifiedBadge: true,
      isVerified: true,
      businessType: 'food',
      primaryCategoryId: 'restaurants',
      subCategoryIds: ['food', 'nightlife', 'hotelsTravel'],
      neighborhood: 'Talatona, Luanda',
      phone: '+244 923 456 789',
      website: 'https://pizzariabelavista.ao',
      promo: '20% OFF em pizzas grandes',
      distance: 0.85,
      distanceText: '850m',
      isOpen: true,
      statusText: 'Aberto até 23:00',
      isPublic: true,
      amenities: ['wifi', 'parking', 'delivery', 'outdoor', 'wheelchair'],
      photos: [
        'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',
        'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',
      ],
      deals: [{ id: 'd1', title: '20% OFF Pizzas Grandes', description: 'Válido Seg-Qui', expires: '2026-12-31', code: 'PIZZA20' }],
      popularDishes: [
        { name: 'Pizza Margherita', price: '3.500 Kz', orders: 156 },
        { name: 'Carbonara', price: '4.200 Kz', orders: 89 },
      ],
      modules: { gastronomy: true, accommodation: true, retail: true, customorder: true, delivery: true },
      roomTypes: [
        {
          id: '1',
          name: 'Quarto Standard',
          description: 'Quarto confortável com vista para o jardim.',
          pricePerNight: 12000,
          maxGuests: 2,
          totalRooms: 5,
          minNights: 1,
          weekendMultiplier: 1.2,
          amenities: ['wifi', 'ac', 'tv'],
          available: true,
          taxRate: 14,
          bookedRanges: [],
          seasonalRates: [],
        },
        {
          id: '2',
          name: 'Quarto Deluxe',
          description: 'Quarto espaçoso com varanda e vista para a cidade.',
          pricePerNight: 18000,
          maxGuests: 3,
          totalRooms: 3,
          minNights: 2,
          weekendMultiplier: 1.3,
          amenities: ['wifi', 'ac', 'tv', 'balcony', 'minibar'],
          available: true,
          taxRate: 14,
          bookedRanges: [],
          seasonalRates: [{ from: '2026-12-15', to: '2027-01-05', pricePerNight: 24000 }],
        },
      ],
    },
  };

  const business = await prisma.business.upsert({
    where: { id: PIZZARIA_ID },
    create: { id: PIZZARIA_ID, ...businessData },
    update: businessData,
  });

  console.log('[pizzaria] negócio pronto:', { id: business.id, name: business.name, ownerId: business.ownerId });

  const MENU_ITEMS = [
    { name: 'Pizza Margherita', price: 3500, capacity: 1, description: 'Molho de tomate, mozzarella e manjericão.' },
    { name: 'Pizza Pepperoni',  price: 4200, capacity: 1, description: 'Pepperoni, mozzarella e orégãos.' },
    { name: 'Carbonara',        price: 4200, capacity: 1, description: 'Pasta cremosa com pancetta e parmesão.' },
    { name: 'Tiramisù',         price: 2500, capacity: 1, description: 'Sobremesa italiana clássica.' },
  ];

  const existingItems  = await prisma.item.findMany({ where: { businessId: business.id }, select: { id: true, name: true } });
  const existingByName = new Map(existingItems.map(i => [i.name, i]));

  for (const item of MENU_ITEMS) {
    const existing = existingByName.get(item.name);
    if (existing) {
      await prisma.item.update({ where: { id: existing.id }, data: { price: item.price, description: item.description } });
    } else {
      await prisma.item.create({ data: { businessId: business.id, ...item } });
    }
  }

  console.log('\n✅ Pizzaria Bela Vista pronta no Supabase!');
  console.log(`  Business ID : ${business.id}`);
  console.log(`  Quartos     : ${businessData.metadata.roomTypes.length} tipos configurados\n`);
}

run()
  .catch((error) => { console.error('[pizzaria] FAILED', error); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });