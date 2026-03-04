import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureTestUser(params: {
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
}) {
  const { email, name, role, passwordHash } = params;

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      password: passwordHash,
    },
    create: {
      email,
      name,
      role,
      password: passwordHash,
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });
}

async function main() {
  const testPassword = process.env.TEST_USERS_PASSWORD || 'AchAquiTest123';
  const passwordHash = await bcrypt.hash(testPassword, 10);

  const [owner, client] = await Promise.all([
    ensureTestUser({
      email: 'owner@achaqui.com',
      name: 'Owner AchAqui',
      role: UserRole.OWNER,
      passwordHash,
    }),
    ensureTestUser({
      email: 'client@achaqui.com',
      name: 'Client AchAqui',
      role: UserRole.CLIENT,
      passwordHash,
    }),
  ]);

  console.log('[seed] test users ready', {
    owner,
    client,
    passwordHint: 'Default password is AchAquiTest123 (override with TEST_USERS_PASSWORD)',
  });
}

main()
  .catch((error) => {
    console.error('[seed] failed to ensure test users', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
