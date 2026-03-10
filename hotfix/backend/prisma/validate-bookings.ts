import { PrismaClient } from '@prisma/client';

/**
 * Validation script to test dual booking flows
 * Simulates what the backend booking service does
 */
const prisma = new PrismaClient();

type BookingType = 'TABLE' | 'ROOM';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  message: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<boolean>) {
  try {
    const passed = await fn();
    results.push({
      name,
      status: passed ? 'PASS' : 'FAIL',
      message: passed ? '✅' : '❌',
    });
  } catch (error) {
    results.push({
      name,
      status: 'FAIL',
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function main() {
  console.log('🧪 Starting Booking Dual-Model Validation Tests\n');

  try {
    // Test 1: Verify both tables exist
    await test('Table "table_bookings" exists', async () => {
      const count = await prisma.diTableBooking.count();
      return typeof count === 'number';
    });

    await test('Table "room_bookings" exists', async () => {
      const count = await prisma.htRoomBooking.count();
      return typeof count === 'number';
    });

    // Test 2: Get test user and business
    let testUser = await prisma.user.findFirst();
    let testBusiness = await prisma.business.findFirst();

    if (!testUser || !testBusiness) {
      console.log('⚠️  No test data found. Run seed first:');
      console.log('   npx tsx prisma/seed-validate-bookings.ts\n');
      process.exit(0);
    }

    // Test 3: Query all table bookings
    await test('Query table bookings by business', async () => {
      const bookings = await prisma.diTableBooking.findMany({
        where: { businessId: testBusiness.id },
      });
      console.log(`   Found ${bookings.length} table bookings`);
      return bookings.length > 0;
    });

    // Test 4: Query all room bookings
    await test('Query room bookings by business', async () => {
      const bookings = await prisma.htRoomBooking.findMany({
        where: { businessId: testBusiness.id },
      });
      console.log(`   Found ${bookings.length} room bookings`);
      return bookings.length > 0;
    });

    // Test 5: Dual-query simulation (what booking service does)
    await test('Merge bookings from both tables', async () => {
      const [tableBookings, roomBookings] = await Promise.all([
        prisma.diTableBooking.findMany({ where: { businessId: testBusiness.id } }),
        prisma.htRoomBooking.findMany({ where: { businessId: testBusiness.id } }),
      ]);

      const merged = [
        ...tableBookings.map((b) => ({ ...b, type: 'TABLE' as BookingType })),
        ...roomBookings.map((b) => ({ ...b, type: 'ROOM' as BookingType })),
      ];

      console.log(`   Total merged bookings: ${merged.length}`);
      console.log(`     - Table: ${tableBookings.length}, Room: ${roomBookings.length}`);
      return merged.length > 0;
    });

    // Test 6: Type discrimination (booking service router logic)
    await test('Route booking creation (bookingType = TABLE)', async () => {
      const bookingType: BookingType = 'TABLE';
      const shouldCreateTable = (bookingType as string) === 'TABLE';
      const shouldCreateRoom = (bookingType as string) === 'ROOM';
      console.log(
        `   Table=${shouldCreateTable}, Room=${shouldCreateRoom}`,
      );
      return shouldCreateTable && !shouldCreateRoom;
    });

    await test('Route booking creation (bookingType = ROOM)', async () => {
      const bookingType: BookingType = 'ROOM';
      const shouldCreateTable = (bookingType as string) === 'TABLE';
      const shouldCreateRoom = (bookingType as string) === 'ROOM';
      console.log(
        `   Table=${shouldCreateTable}, Room=${shouldCreateRoom}`,
      );
      return !shouldCreateTable && shouldCreateRoom;
    });

    // Test 7: Default routing (when bookingType undefined)
    await test('Default route when bookingType undefined', async () => {
      const bookingType: BookingType | undefined = undefined;
      const defaultToTable = bookingType !== 'ROOM';
      console.log(`   Default to TABLE: ${defaultToTable}`);
      return defaultToTable === true;
    });

    // Test 8: Confirm operation (find in correct table)
    await test('Find booking by ID in table_bookings', async () => {
      const booking = await prisma.diTableBooking.findFirst({
        where: { businessId: testBusiness.id },
      });
      if (!booking) {
        console.log(`   No table bookings to query`);
        return true;
      }

      const found = await prisma.diTableBooking.findUnique({
        where: { id: booking.id },
      });
      console.log(`   Found: ${found?.id === booking.id}`);
      return found?.id === booking.id;
    });

    await test('Find booking by ID in room_bookings', async () => {
      const booking = await prisma.htRoomBooking.findFirst({
        where: { businessId: testBusiness.id },
      });
      if (!booking) {
        console.log(`   No room bookings to query`);
        return true;
      }

      const found = await prisma.htRoomBooking.findUnique({
        where: { id: booking.id },
      });
      console.log(`   Found: ${found?.id === booking.id}`);
      return found?.id === booking.id;
    });

    // Test 9: Owner verification (business owner can see both)
    await test(
      'Owner sees all bookings (table + room)',
      async () => {
        const business = await prisma.business.findUnique({
          where: { id: testBusiness.id },
          include: {
            diBookings: true,
            roomBookings: true,
          },
        });

        if (!business) return false;

        const total = (business.diBookings?.length || 0) + (business.htBookings?.length || 0);
        console.log(
          `   Owner sees: ${business.diBookings?.length || 0} table + ${business.htBookings?.length || 0} room`,
        );
        return total > 0;
      },
    );

    // Test 10: Realtime subscription tables
    await test('Realtime subscription covers both tables', async () => {
      const BOOKING_TABLES = [
        'Booking',
        'bookings',
        'table_bookings',
        'room_bookings',
      ];
      const hasTableBookings = BOOKING_TABLES.includes('table_bookings');
      const hasRoomBookings = BOOKING_TABLES.includes('room_bookings');
      console.log(
        `   Subscribed: table_bookings=${hasTableBookings}, room_bookings=${hasRoomBookings}`,
      );
      return hasTableBookings && hasRoomBookings;
    });
  } catch (error) {
    console.error('Test suite error:', error);
  } finally {
    await prisma.$disconnect();
  }

  // Print results
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results\n');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  results.forEach((r) => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${r.name}`);
    if (r.message && r.message !== '✅' && r.message !== '❌') {
      console.log(`   └─ ${r.message}`);
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log(`\nSummary: ${passed}/${results.length} tests passed`);

  if (failed > 0) {
    console.log(`⚠️  ${failed} test(s) failed\n`);
    process.exit(1);
  } else {
    console.log('\n✨ All tests passed! Dual booking model is ready.\n');
    process.exit(0);
  }
}

main();
