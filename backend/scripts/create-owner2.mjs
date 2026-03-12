/**
 * Script: criar owner2 com negócio e tipos de quarto para debug
 * Uso: node scripts/create-owner2.mjs
 *
 * Requer BACKEND_URL no .env ou como variável de ambiente
 * Por defeito usa http://localhost:3000
 */

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3000';
const EMAIL    = 'owner2@achaqui.com';
const PASSWORD = 'AchAquiTest123';
const NAME     = 'Owner 2 (Debug)';

async function post(path, body, token) {
  const res = await fetch(`${BACKEND}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    console.error(`[${res.status}] ${path}:`, data);
    throw new Error(`HTTP ${res.status}`);
  }
  return data;
}

async function patch(path, body, token) {
  const res = await fetch(`${BACKEND}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    console.error(`[${res.status}] ${path}:`, data);
    throw new Error(`HTTP ${res.status}`);
  }
  return data;
}

async function main() {
  console.log('Backend:', BACKEND);

  // 1. Criar / re-login owner2
  let session;
  try {
    session = await post('/auth/signup', { email: EMAIL, password: PASSWORD, name: NAME, role: 'OWNER' });
    console.log('✓ owner2 criado:', session.user);
  } catch {
    // Já existe — fazer login
    session = await post('/auth/signin', { email: EMAIL, password: PASSWORD });
    console.log('✓ owner2 login:', session.user);
  }

  const { accessToken, user } = session;
  console.log('\n=== OWNER2 ===');
  console.log('  id         :', user.id);
  console.log('  email      :', user.email);
  console.log('  role       :', user.role);
  console.log('  accessToken:', accessToken.substring(0, 40) + '...');

  // 2. Criar negócio para owner2
  let biz;
  try {
    biz = await post('/businesses', {
      name: 'Hotel Debug Owner2',
      category: 'Hotel',
      address: 'Rua de Teste, 1',
      businessType: 'accommodation',
    }, accessToken);
    console.log('\n✓ Negócio criado:', biz.id, biz.name);
  } catch (e) {
    console.warn('Negócio já pode existir, continua...');
    // Tentar buscar
    const res = await fetch(`${BACKEND}/businesses`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const all = await res.json();
    biz = Array.isArray(all) ? all.find(b => b.ownerId === user.id || b?.owner?.id === user.id) : null;
    if (!biz) { console.error('Não foi possível encontrar/criar o negócio'); process.exit(1); }
    console.log('\n✓ Negócio encontrado:', biz.id, biz.name);
  }

  // 3. Criar tipo de quarto
  const roomType = await post('/items/rooms', {
    businessId: biz.id,
    name: 'Quarto Deluxe Debug',
    description: 'Tipo criado pelo script de debug',
    pricePerNight: 15000,
    maxGuests: 2,
    totalRooms: 3,
    available: true,
    amenities: ['wifi', 'ac'],
  }, accessToken);
  console.log('\n✓ Tipo de quarto criado:', roomType.id, roomType.name);

  // 4. Verificar GET /items/rooms/by-business
  const rooms = await fetch(`${BACKEND}/items/rooms/by-business?businessId=${biz.id}`);
  const roomsData = await rooms.json();
  console.log('\n✓ GET /items/rooms/by-business retorna:', JSON.stringify(roomsData, null, 2));

  console.log('\n========================================');
  console.log('RESUMO PARA TESTAR NA APP:');
  console.log('  Email   :', EMAIL);
  console.log('  Password:', PASSWORD);
  console.log('  userId  :', user.id);
  console.log('  bizId   :', biz.id);
  console.log('========================================');
}

main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
