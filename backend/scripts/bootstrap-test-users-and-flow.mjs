const BASE_URL = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const DEFAULT_PASSWORD = process.env.TEST_USERS_PASSWORD || 'AchAquiTest123';

const OWNER = {
  email: 'owner@achaqui.com',
  name: 'Owner AchAqui',
  role: 'OWNER',
  password: DEFAULT_PASSWORD,
};

const CLIENT = {
  email: 'client@achaqui.com',
  name: 'Client AchAqui',
  role: 'CLIENT',
  password: DEFAULT_PASSWORD,
};

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw || null;
  }

  if (!response.ok) {
    const error = new Error(`[${response.status}] ${path} failed`);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

async function ensureUser(user) {
  try {
    const signIn = await request('/auth/signin', {
      method: 'POST',
      body: { email: user.email, password: user.password },
    });
    return signIn;
  } catch (error) {
    if (error.status !== 401) throw error;
  }

  await request('/auth/signup', {
    method: 'POST',
    body: {
      email: user.email,
      password: user.password,
      name: user.name,
      role: user.role,
    },
  });

  return request('/auth/signin', {
    method: 'POST',
    body: { email: user.email, password: user.password },
  });
}

function plusDaysIso(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString();
}

async function ensureBusiness(ownerToken) {
  const existing = await request('/businesses');
  const normalized = Array.isArray(existing) ? existing : [];
  const myBiz = normalized.find((biz) => biz?.name === 'AchAqui Test Business');
  if (myBiz?.id) return myBiz;

  return request('/businesses', {
    method: 'POST',
    token: ownerToken,
    body: {
      name: 'AchAqui Test Business',
      category: 'RESTAURANT',
      description: 'Business de teste automático para fluxo cliente/dono.',
      latitude: -8.8383,
      longitude: 13.2344,
      metadata: { source: 'bootstrap-script' },
    },
  });
}

async function run() {
  console.log(`[bootstrap] BASE_URL=${BASE_URL}`);

  const ownerSession = await ensureUser(OWNER);
  const clientSession = await ensureUser(CLIENT);

  const ownerToken = ownerSession?.accessToken;
  const clientToken = clientSession?.accessToken;

  if (!ownerToken || !clientToken) {
    throw new Error('Falha ao obter access tokens para owner/client.');
  }

  const ownerMe = await request('/auth/me', { token: ownerToken });
  const clientMe = await request('/auth/me', { token: clientToken });

  if (ownerMe?.role !== 'OWNER') {
    throw new Error(`Role inválida para owner@achaqui.com: ${ownerMe?.role || 'undefined'}`);
  }
  if (clientMe?.role !== 'CLIENT') {
    throw new Error(`Role inválida para client@achaqui.com: ${clientMe?.role || 'undefined'}`);
  }

  const business = await ensureBusiness(ownerToken);

  const booking = await request('/bookings', {
    method: 'POST',
    token: clientToken,
    body: {
      businessId: business.id,
      startDate: plusDaysIso(1),
      endDate: plusDaysIso(2),
      status: 'PENDING',
    },
  });

  const ownerBookings = await request('/bookings', { token: ownerToken });
  const clientBookings = await request('/bookings', { token: clientToken });

  const ownerHasBooking = Array.isArray(ownerBookings)
    ? ownerBookings.some((item) => item?.id === booking?.id)
    : false;
  const clientHasBooking = Array.isArray(clientBookings)
    ? clientBookings.some((item) => item?.id === booking?.id)
    : false;

  if (!ownerHasBooking || !clientHasBooking) {
    throw new Error('Reserva criada mas não visível nos dois fluxos (owner/client).');
  }

  console.log('[bootstrap] OK', {
    owner: { email: OWNER.email, role: ownerMe.role },
    client: { email: CLIENT.email, role: clientMe.role },
    businessId: business.id,
    bookingId: booking.id,
    ownerBookings: Array.isArray(ownerBookings) ? ownerBookings.length : 0,
    clientBookings: Array.isArray(clientBookings) ? clientBookings.length : 0,
  });
}

run().catch((error) => {
  console.error('[bootstrap] FAILED', {
    message: error?.message || String(error),
    status: error?.status,
    payload: error?.payload,
  });
  process.exit(1);
});
