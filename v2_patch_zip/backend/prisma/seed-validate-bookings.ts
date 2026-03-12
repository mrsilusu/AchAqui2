import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Find or create a test user
    let testUser = await prisma.user.findFirst({
      where: { email: 'test@achaqui.com' },
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'test@achaqui.com',
          password: 'hashed-password-test',
          role: 'CLIENT',
          name: 'Test User',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log('✅ Created test user:', testUser.id);
    } else {
      console.log('✅ Found existing test user:', testUser.id);
    }

    // Find or create a test owner
    let testOwner = await prisma.user.findFirst({
      where: { email: 'owner@achaqui.com' },
    });

    if (!testOwner) {
      testOwner = await prisma.user.create({
        data: {
          email: 'owner@achaqui.com',
          password: 'hashed-password-owner',
          role: 'OWNER',
          name: 'Test Owner',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log('✅ Created test owner:', testOwner.id);
    } else {
      console.log('✅ Found existing test owner:', testOwner.id);
    }

    // Create or find a test business
    let testBusiness = await prisma.business.findFirst({
      where: { ownerId: testOwner.id },
    });

    if (!testBusiness) {
      testBusiness = await prisma.business.create({
        data: {
          name: 'Casa de Hóspedes Test',
          category: 'HOSPITALITY',
          description: 'Casa de hóspedes para testes de reservas',
          latitude: 38.7223,
          longitude: -9.1393,
          ownerId: testOwner.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log('✅ Created test business:', testBusiness.id);
    } else {
      console.log('✅ Found existing test business:', testBusiness.id);
    }

    // Seed TABLE bookings (mesa reservations)
    const tableBookings = [
      {
        id: `table-booking-1-${Date.now()}`,
        userId: testUser.id,
        businessId: testBusiness.id,
        startDate: new Date('2026-03-10T19:00:00Z'),
        endDate: new Date('2026-03-10T21:00:00Z'),
        status: 'PENDING' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: `table-booking-2-${Date.now()}`,
        userId: testUser.id,
        businessId: testBusiness.id,
        startDate: new Date('2026-03-12T12:30:00Z'),
        endDate: new Date('2026-03-12T14:00:00Z'),
        status: 'CONFIRMED' as const,
        createdAt: new Date('2026-03-08T10:00:00Z'),
        updatedAt: new Date(),
      },
    ];

    for (const booking of tableBookings) {
      const existing = await prisma.diTableBooking.findUnique({
        where: { id: booking.id },
      });

      if (!existing) {
        await prisma.diTableBooking.create({ data: booking });
        console.log('✅ Created table booking:', booking.id);
      } else {
        console.log('⏭️  Table booking already exists:', booking.id);
      }
    }

    // Seed ROOM bookings (quarto reservations)
    const roomBookings = [
      {
        id: `room-booking-1-${Date.now()}`,
        userId: testUser.id,
        businessId: testBusiness.id,
        startDate: new Date('2026-03-15T14:00:00Z'),
        endDate: new Date('2026-03-18T11:00:00Z'),
        status: 'PENDING' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: `room-booking-2-${Date.now()}`,
        userId: testUser.id,
        businessId: testBusiness.id,
        startDate: new Date('2026-03-20T15:00:00Z'),
        endDate: new Date('2026-03-22T11:00:00Z'),
        status: 'CONFIRMED' as const,
        createdAt: new Date('2026-03-09T08:30:00Z'),
        updatedAt: new Date(),
      },
    ];

    for (const booking of roomBookings) {
      const existing = await prisma.htRoomBooking.findUnique({
        where: { id: booking.id },
      });

      if (!existing) {
        await prisma.htRoomBooking.create({ data: booking });
        console.log('✅ Created room booking:', booking.id);
      } else {
        console.log('⏭️  Room booking already exists:', booking.id);
      }
    }

    // Verify dual-table query works
    console.log('\n📊 Verification Query Results:');
    const allTableBookings = await prisma.diTableBooking.findMany({
      where: { businessId: testBusiness.id },
    });
    console.log(`📌 Table bookings found: ${allTableBookings.length}`);

    const allRoomBookings = await prisma.htRoomBooking.findMany({
      where: { businessId: testBusiness.id },
    });
    console.log(`🚪 Room bookings found: ${allRoomBookings.length}`);

    console.log('\n✨ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
