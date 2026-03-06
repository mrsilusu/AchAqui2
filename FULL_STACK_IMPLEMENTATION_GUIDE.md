# 🏗️ AchAqui Full-Stack Implementation Guide

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React Native/Expo)                 │
│                                                                   │
│  ┌─────────────────┐         ┌──────────────────┐               │
│  │ OwnerModule     │────────▶│ backendApi.js    │               │
│  │ (Modo Dono)     │         │ (Consumo de APIs) │               │
│  └─────────────────┘         └────────┬─────────┘               │
│                                       │                         │
│              ┌────────────────────────┼────────────────────────┐│
│              │                        │                        ││
│  ┌──────────────────┐      ┌─────────▼──────┐     ┌──────────┴┴┐
│  │ ClientModals     │      │ DetailModal    │     │ Subscriptions
│  │ (Modo Cliente)   │      │ (Public View)  │     │ (Live Updates)
│  └──────────────────┘      └────────────────┘     └─────────────┘
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTP/HTTPS
                              │ Bearer Token (JWT)
                              │
┌─────────────────────────────▼─────────────────────────────────────┐
│                   BACKEND (NestJS)                                 │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Auth Module                                                 │ │
│  │  • JWT Guard (validação de token)                          │ │
│  │  • Role-based Access Control (Owner, Client, Admin)        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Business Module (Controllers/Services)                      │ │
│  │  • PATCH /businesses/:id            (Update Business)      │ │
│  │  • PATCH /businesses/:id/status     (Toggle Open/Closed)   │ │
│  │  • PATCH /businesses/:id/info       (Update Info)          │ │
│  │  • GET  /businesses/:id             (Fetch Public View)    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Item Module (Menu, Inventory, Services, Rooms, etc)        │ │
│  │  • CRUD operations para cada tipo de item                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Booking Module                                              │ │
│  │  • Logging de interações do cliente                         │ │
│  │  • Histórico de buscas e visualizações                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Prisma ORM ◄──────────────────────────────────────────────┐ │
│  └────────────┬──────────────────────────────────────────────┘ │
│               │                                                  │
└───────────────┼──────────────────────────────────────────────────┘
                │
                │ PostgreSQL (Supabase)
                │
        ┌───────┴────────┐
        │                │
   ┌────▼────┐      ┌───▼─────┐
   │  Users  │      │ Business │
   │  Table  │      │  Table   │
   └─────────┘      ├──────────┤
                    │ Items    │
                    │ Bookings │
                    │ Promos   │
                    └──────────┘
```

---

## 📋 Endpoints da API (Backend)

### 🔓 Autenticação (Public)
```
POST   /auth/signup                  Registrar novo usuário
POST   /auth/signin                  Login
POST   /auth/refresh                 Renovar token JWT
POST   /auth/logout                  Logout
GET    /auth/me          ✓ JWT       Dados do usuário autenticado
```

### 🏢 Business (Negócio)

#### Owner Only (Requer role='OWNER')
```
POST   /businesses                       ✓ JWT    Criar novo negócio
PATCH  /businesses/:id                   ✓ JWT    Atualizar informações gerais
PATCH  /businesses/:id/status            ✓ JWT    Toggle open/closed
PATCH  /businesses/:id/info              ✓ JWT    Atualizar dados específicos
```

#### Public (Qualquer um)
```
GET    /businesses                       -        Listar todos os negócios
GET    /businesses/:id                   -        Obter detalhes públicos
GET    /businesses/search?lat=X&lon=Y    -        Busca por proximidade
```

### 📦 Items (Menu, Inventory, Services, Rooms)

#### Owner Only
```
POST   /items/menu                       ✓ JWT    Criar item de menu
PATCH  /items/menu/:id                   ✓ JWT    Atualizar item de menu
DELETE /items/menu/:id                   ✓ JWT    Deletar item

POST   /items/inventory                  ✓ JWT    Criar item inventário
PATCH  /items/inventory/:id              ✓ JWT    Atualizar
DELETE /items/inventory/:id              ✓ JWT    Deletar

POST   /items/services                   ✓ JWT    Criar serviço
PATCH  /items/services/:id               ✓ JWT    Atualizar
DELETE /items/services/:id               ✓ JWT    Deletar

POST   /items/rooms                      ✓ JWT    Criar quarto
PATCH  /items/rooms/:id                  ✓ JWT    Atualizar
DELETE /items/rooms/:id                  ✓ JWT    Deletar
```

#### Public (Read)
```
GET    /items/menu/by-business?businessId=X      -        Listar menu
GET    /items/services/by-business?businessId=X  -        Listar serviços
GET    /items/rooms/by-business?businessId=X     -        Listar quartos
```

### 📅 Bookings & Analytics
```
GET    /bookings                         ✓ JWT    Listar bookings do owner
POST   /bookings                         ✓ JWT    Cliente criar booking
PATCH  /bookings/:id/confirm             ✓ JWT    Owner confirmar
PATCH  /bookings/:id/reject              ✓ JWT    Owner rejeitar

GET    /analytics/owner/dashboard        ✓ JWT    Dashboard do owner
```

### 🎉 Promotions
```
POST   /businesses/:businessId/promos    ✓ JWT    Criar promoção
GET    /businesses/:businessId/promos    -        Listar promoções públicas
PATCH  /businesses/promos/:promoId       ✓ JWT    Atualizar promoção
DELETE /businesses/promos/:promoId       ✓ JWT    Deletar promoção
```

### 🔔 Notifications
```
GET    /notifications                    ✓ JWT    Listar notificações
PATCH  /notifications/:id/read           ✓ JWT    Marcar como lida
PATCH  /notifications/read-all           ✓ JWT    Marcar todas como lidas
```

---

## 🔐 Segurança & Autenticação

### JWT Flow
```javascript
// 1. LOGIN
POST /auth/signin
{
  "email": "owner@example.com",
  "password": "password123"
}

// Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "owner@example.com",
    "role": "OWNER",
    "name": "João Silva"
  }
}

// 2. USAR ACCESS TOKEN
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// 3. REFRESH TOKEN (quando expirar)
POST /auth/refresh
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Role-Based Access Control (RBAC)
```
┌─────────┬─────────────────────────────────┐
│  Role   │  Permissões                     │
├─────────┼─────────────────────────────────┤
│ OWNER   │ • Editar seu(s) negócio(s)      │
│         │ • Gerenciar itens/promoções     │
│         │ • Ver bookings/reservas         │
│         │ • Acessar dashboard             │
├─────────┼─────────────────────────────────┤
│ CLIENT  │ • Visualizar negócios públicos  │
│         │ • Fazer bookings                │
│         │ • Ver promoções                 │
│         │ • Deixar reviews (future)       │
├─────────┼─────────────────────────────────┤
│ ADMIN   │ • Acesso total                  │
│         │ • Gerenciar usuários            │
│         │ • Relatórios                    │
└─────────┴─────────────────────────────────┘
```

### Validação de Propriedade
```typescript
// Apenas o dono pode editar seu negócio
async update(id: string, ownerId: string, updateBusinessDto: UpdateBusinessDto) {
  const business = await this.prisma.business.findFirst({
    where: {
      id,
      ownerId,  // ◄─── VALIDAÇÃO CRÍTICA
    },
  });

  if (!business) {
    throw new NotFoundException(
      'Estabelecimento não encontrado para este proprietário.',
    );
  }

  return this.prisma.business.update({
    where: { id },
    data: updateBusinessDto,
  });
}
```

---

## 📝 DTOs (Data Transfer Objects) - Backend

### UpdateBusinessDto
```typescript
export class UpdateBusinessDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(BusinessCategory)
  category?: BusinessCategory;

  @IsOptional()
  @IsString()
  @MinLength(5)
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
```

### UpdateBusinessStatusDto
```typescript
export class UpdateBusinessStatusDto {
  @IsBoolean()
  isOpen: boolean;
}
```

### UpdateBusinessInfoDto
```typescript
export class UpdateBusinessInfoDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  phone?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  website?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  email?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  address?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number;
}
```

---

## 🎯 Fluxos de Dados (Frontend → Backend → Database)

### Fluxo 1: Owner Edita Negócio (Status)

```
┌─ Frontend (OwnerModule) ──────────────────────────────┐
│                                                         │
│  TouchableOpacity onPress={() => setBusinessOpen(!...)}│
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │ setBusinessOpen(isOpen)                          │ │
│  │  → if accessToken {                              │ │
│  │      await backendApi.updateBusinessStatus(...)  │ │
│  │         businessId: ownerBusinessId              │ │
│  │         payload: { isOpen: true/false }          │ │
│  │  → else {                                        │ │
│  │      alert('Faça login primeiro')               │ │
│  └──────────────────────────────────────────────────┘ │
│                │                                       │
└────────────────┼───────────────────────────────────────┘
                 │ PATCH /businesses/:id/status
                 │ Authorization: Bearer {token}
                 │ {"isOpen": true}
                 │
┌────────────────▼────────────────────────────────────────┐
│ Backend (NestJS)                                        │
│                                                         │
│ @Patch(':id/status')                                   │
│ @Roles(UserRole.OWNER)                                 │
│ async updateStatus(                                    │
│   @Param('id') id,                                     │
│   @Req() req,                                          │
│   @Body() { isOpen }                                   │
│ ) {                                                    │
│   // 1. Validar propriedade                            │
│   const business = findFirst({                         │
│     id, ownerId: req.user.userId                       │
│   })                                                   │
│                                                         │
│   // 2. Atualizar metadata                             │
│   const metadata = {                                   │
│     isOpen,                                            │
│     statusText: isOpen ? 'Aberto' : 'Fechado'         │
│   }                                                    │
│                                                         │
│   // 3. Persistir no BD                                │
│   return update({                                      │
│     where: { id },                                     │
│     data: { metadata }                                 │
│   })                                                   │
│ }                                                      │
│                                                         │
└────────────────┬────────────────────────────────────────┘
                 │ UPDATE Business SET metadata = ...
                 │ WHERE id = :id AND ownerId = :ownerId
                 │
┌────────────────▼────────────────────────────────────────┐
│ PostgreSQL (Database)                                   │
│                                                         │
│ UPDATE business                                        │
│ SET metadata = '{"isOpen": true, ...}'                │
│ WHERE id = '123' AND owner_id = 'owner-123'           │
│                                                         │
│ ✅ Status persistido                                   │
└─────────────────────────────────────────────────────────┘
```

### Fluxo 2: Cliente Visualiza Detalhes (Público)

```
┌─ Frontend (DetailModal) ───────────────────────────────┐
│                                                         │
│  useEffect(() => {                                     │
│    if (!business) {                                    │
│      fetch(`/businesses/${businessId}`)                │
│      .then(saveToDB)                                   │
│    }                                                   │
│  }, [businessId])                                      │
│                                                         │
└────────────────┬───────────────────────────────────────┘
                 │ GET /businesses/:id (SEM autenticação)
                 │
┌────────────────▼────────────────────────────────────────┐
│ Backend (NestJS)                                        │
│                                                         │
│ @Get(':id')                                            │
│ @Public()  ◄─── Sem JWT necessário                    │
│ async findOne(@Param('id') id) {                       │
│   const business = findUnique({                        │
│     where: { id },                                     │
│     include: { owner: { select: [...] } }             │
│   })                                                   │
│                                                         │
│   if (!business) throw new NotFoundException(...)      │
│   return business                                      │
│ }                                                      │
│                                                         │
└────────────────┬────────────────────────────────────────┘
                 │ SELECT * FROM business WHERE id = :id
                 │
┌────────────────▼────────────────────────────────────────┐
│ PostgreSQL                                              │
│                                                         │
│ SELECT *, metadata->>'statusText' as status            │
│ FROM business                                          │
│ WHERE id = '123'                                       │
│                                                         │
│ ✅ Retorna dados públicos (sem info sensível)          │
└─────────────────────────────────────────────────────────┘
```

### Fluxo 3: Cliente Faz Booking (Analytics)

```
┌─ Frontend (ClientModal) ────────────────────────────────┐
│                                                         │
│  onPress={() => {                                      │
│    navigate('BookingForm', {                           │
│      businessId, startDate, endDate                    │
│    })                                                  │
│  }}                                                    │
│                                                         │
│  • Registra: timestamp, businessId, userId (opcional) │
│  • Objetivo: Analytics/histórico de interações         │
│                                                         │
└────────────────┬───────────────────────────────────────┘
                 │ POST /bookings
                 │ {
                 │   "businessId": "123",
                 │   "startDate": "2026-03-10",
                 │   "endDate": "2026-03-12",
                 │   "userId": "client-123" (optional)
                 │ }
                 │
┌────────────────▼────────────────────────────────────────┐
│ Backend (NestJS)                                        │
│                                                         │
│ @Post()                                                │
│ async createBooking(                                   │
│   @Body() createBookingDto                             │
│ ) {                                                    │
│   // 1. Validar datas                                  │
│   if (startDate >= endDate) {                          │
│     throw new BadRequestException(...)                 │
│   }                                                    │
│                                                         │
│   // 2. Criar registro                                 │
│   const booking = await create({                       │
│     businessId,                                        │
│     userId: req.user?.userId,                          │
│     startDate,                                         │
│     endDate,                                           │
│     status: 'PENDING',                                 │
│     createdAt: now()                                   │
│   })                                                   │
│                                                         │
│   // 3. Notificar owner                                │
│   emit('newBooking', { business, client })             │
│                                                         │
│   return { bookingId, status, ... }                    │
│ }                                                      │
│                                                         │
└────────────────┬────────────────────────────────────────┘
                 │ INSERT INTO bookings (...)
                 │ INSERT INTO notifications (...)
                 │
┌────────────────▼────────────────────────────────────────┐
│ PostgreSQL                                              │
│                                                         │
│ INSERT INTO booking VALUES (...)                       │
│ INSERT INTO notification VALUES (                      │
│   'Nova Reserva', 'Cliente XYZ', owner_id, ...         │
│ )                                                      │
│                                                         │
│ ✅ Booking e notificação criados                       │
└─────────────────────────────────────────────────────────┘
```

---

## 💻 Implementação Frontend (React Native)

### Padrão de Consumo de API

```javascript
// src/lib/backendApi.js

import { BACKEND_URL } from './runtimeConfig';

export async function apiRequest(path, { 
  method = 'GET', 
  body, 
  accessToken 
} = {}) {
  const url = `${BACKEND_URL}${path}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error(`API Error [${method} ${path}]:`, error);
    throw error;
  }
}

export const backendApi = {
  // Business
  updateBusinessStatus: (businessId, payload, accessToken) =>
    apiRequest(`/businesses/${businessId}/status`, { 
      method: 'PATCH', 
      body: payload, 
      accessToken 
    }),
  
  updateBusinessInfo: (businessId, payload, accessToken) =>
    apiRequest(`/businesses/${businessId}/info`, { 
      method: 'PATCH', 
      body: payload, 
      accessToken 
    }),
  
  getBusinessDetail: (businessId) =>
    apiRequest(`/businesses/${businessId}`),
  
  // Bookings
  createBooking: (payload, accessToken) =>
    apiRequest('/bookings', { 
      method: 'POST', 
      body: payload, 
      accessToken 
    }),
  
  getBusinessBookings: (businessId, accessToken) =>
    apiRequest(`/bookings?businessId=${businessId}`, { 
      accessToken 
    }),
};
```

### Implementação no OwnerModule

```javascript
// src/modules/Owner/OwnerModule.jsx

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { backendApi } from '../../lib/backendApi';

export function OwnerModule({
  accessToken,
  authUserId,
  businesses,
  onUpdateBusiness,
  // ... autres props
}) {
  const [loading, setLoading] = useState(false);
  
  const ownerBiz = businesses?.find(b => b?.owner?.id === authUserId);
  const ownerBusinessId = ownerBiz?.id;

  // ─────────────────────────────────────────────────────────────
  // ATUALIZAR STATUS DO NEGÓCIO (Aberto/Fechado)
  // ─────────────────────────────────────────────────────────────
  const setBusinessOpen = useCallback(async (isOpen) => {
    if (!accessToken) {
      Alert.alert('Autenticação', 'Faça login para editar seu negócio.');
      return;
    }

    if (!ownerBusinessId) {
      Alert.alert('Erro', 'Negócio não encontrado.');
      return;
    }

    setLoading(true);
    try {
      // Chamar API para atualizar status
      const response = await backendApi.updateBusinessStatus(
        ownerBusinessId,
        { isOpen },
        accessToken
      );

      // Atualizar estado local com resposta do servidor
      onUpdateBusiness({
        isOpen: response.metadata?.isOpen,
        statusText: response.metadata?.statusText,
      });

      Alert.alert(
        'Sucesso',
        `Negócio marcado como ${isOpen ? 'aberto' : 'fechado'}.`
      );
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, ownerBusinessId, onUpdateBusiness]);

  // ─────────────────────────────────────────────────────────────
  // EDITAR INFORMAÇÕES DO NEGÓCIO
  // ─────────────────────────────────────────────────────────────
  const saveBusinessInfo = useCallback(async (editedFields) => {
    if (!accessToken) {
      Alert.alert('Autenticação', 'Faça login para editar seu negócio.');
      return;
    }

    if (!ownerBusinessId) {
      Alert.alert('Erro', 'Negócio não encontrado.');
      return;
    }

    setLoading(true);
    try {
      const response = await backendApi.updateBusinessInfo(
        ownerBusinessId,
        editedFields,
        accessToken
      );

      // Atualizar estado local
      onUpdateBusiness(editedFields);

      Alert.alert('Sucesso', 'Informações atualizadas!');
    } catch (error) {
      console.error('Erro ao atualizar informações:', error);
      Alert.alert(
        'Erro',
        error.message || 'Não foi possível atualizar as informações.'
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, ownerBusinessId, onUpdateBusiness]);

  // ─────────────────────────────────────────────────────────────
  // CAPTAR LOCALIZAÇÃO (para atualizar GPS)
  // ─────────────────────────────────────────────────────────────
  const captarLocalizacao = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão', 'Ative a localização nas configurações.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.High 
      });

      const { latitude, longitude } = loc.coords;

      // Atualizar localização no backend
      await saveBusinessInfo({ latitude, longitude });
      
      Alert.alert('Sucesso', 'Localização atualizada!');
    } catch (error) {
      console.error('Erro ao captar localização:', error);
      Alert.alert('Erro', 'Não foi possível captar sua localização.');
    } finally {
      setLoading(false);
    }
  }, [saveBusinessInfo]);

  // ─────────────────────────────────────────────────────────────
  // EXEMPLOS DE USO NOS BOTÕES
  // ─────────────────────────────────────────────────────────────

  return (
    <>
      {/* Botão de Status (Aberto/Fechado) */}
      <TouchableOpacity 
        style={styles.statusButton}
        onPress={() => setBusinessOpen(!ownerBiz?.isOpen)}
        disabled={loading}
      >
        <Text>{ownerBiz?.isOpen ? 'Aberto' : 'Fechado'}</Text>
      </TouchableOpacity>

      {/* Botão para Captar Localização */}
      <TouchableOpacity 
        style={styles.locationButton}
        onPress={captarLocalizacao}
        disabled={loading}
      >
        <Text>📍 Atualizar Localização</Text>
      </TouchableOpacity>

      {/* Exemplo: Modal de Edição */}
      <Modal visible={showEditModal}>
        <TextInput
          placeholder="Nome do negócio"
          value={editName}
          onChangeText={setEditName}
        />
        <TouchableOpacity
          onPress={() => {
            saveBusinessInfo({ name: editName });
            setShowEditModal(false);
          }}
        >
          <Text>Salvar</Text>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
```

---

## 🧪 Test Profiles & Seeds

### Seed Script (Backend)

Arquivo: `backend/scripts/bootstrap-test-users-and-flow.mjs`

```javascript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // ───────────────────────────────────────────────────────────────
  // 1. CRIAR USUÁRIOS DE TESTE
  // ───────────────────────────────────────────────────────────────
  
  // Owner 1: Pizza Shop
  const ownerPizza = await prisma.user.upsert({
    where: { email: 'owner.pizza@test.com' },
    update: {},
    create: {
      email: 'owner.pizza@test.com',
      password: await bcrypt.hash('TestPassword123!', 10),
      role: 'OWNER',
      name: 'João Pizza',
    },
  });

  console.log('✓ Owner Pizza criado:', ownerPizza.id);

  // Owner 2: Hotel
  const ownerHotel = await prisma.user.upsert({
    where: { email: 'owner.hotel@test.com' },
    update: {},
    create: {
      email: 'owner.hotel@test.com',
      password: await bcrypt.hash('TestPassword123!', 10),
      role: 'OWNER',
      name: 'Maria Hotel',
    },
  });

  console.log('✓ Owner Hotel criado:', ownerHotel.id);

  // Cliente 1
  const clientAna = await prisma.user.upsert({
    where: { email: 'client.ana@test.com' },
    update: {},
    create: {
      email: 'client.ana@test.com',
      password: await bcrypt.hash('ClientPass123!', 10),
      role: 'CLIENT',
      name: 'Ana Silva',
    },
  });

  console.log('✓ Cliente Ana criado:', clientAna.id);

  // Cliente 2
  const clientBob = await prisma.user.upsert({
    where: { email: 'client.bob@test.com' },
    update: {},
    create: {
      email: 'client.bob@test.com',
      password: await bcrypt.hash('ClientPass123!', 10),
      role: 'CLIENT',
      name: 'Bob Santos',
    },
  });

  console.log('✓ Cliente Bob criado:', clientBob.id);

  // ───────────────────────────────────────────────────────────────
  // 2. CRIAR NEGÓCIOS COM DADOS INICIAIS
  // ───────────────────────────────────────────────────────────────

  // Pizza Shop
  const pizzaShop = await prisma.business.upsert({
    where: { id: 'pizza-shop-123' },
    update: {},
    create: {
      id: 'pizza-shop-123',
      name: 'Pizzaria do João',
      category: 'DINING',
      description: 'Pizzas artesanais feitas no forno a lenha',
      latitude: -8.8383,
      longitude: 13.2344,
      metadata: {
        isOpen: true,
        statusText: 'Aberto agora',
        phone: '+244 923 456 789',
        address: 'Rua do Comércio, 123 - Luanda',
        website: 'pizzariadojoao.ao',
        email: 'contato@pizzariadojoao.ao',
      },
      ownerId: ownerPizza.id,
    },
  });

  console.log('✓ Pizzaria criada:', pizzaShop.id);

  // Hotel
  const hotel = await prisma.business.upsert({
    where: { id: 'hotel-123' },
    update: {},
    create: {
      id: 'hotel-123',
      name: 'Hotel Luxo Luanda',
      category: 'HOSPITALITY',
      description: '5 estrelas com vista para o oceano',
      latitude: -8.8395,
      longitude: 13.2348,
      metadata: {
        isOpen: true,
        statusText: 'Aberto agora',
        phone: '+244 923 987 654',
        address: 'Avenida 4 de Fevereiro, Luanda',
        website: 'hotelluxoluanda.ao',
        email: 'reservas@hotelluxoluanda.ao',
      },
      ownerId: ownerHotel.id,
    },
  });

  console.log('✓ Hotel criado:', hotel.id);

  // ───────────────────────────────────────────────────────────────
  // 3. CRIAR ITEMS (MENU, QUARTOS, SERVIÇOS)
  // ───────────────────────────────────────────────────────────────

  // Menu Items (Pizza)
  await prisma.item.createMany({
    data: [
      {
        name: 'Margherita',
        price: 4500,
        capacity: 1,
        description: 'Tomate, mozzarella, manjericão',
        businessId: pizzaShop.id,
      },
      {
        name: 'Pepperoni',
        price: 5000,
        capacity: 1,
        description: 'Tomate, mozzarella, pepperoni',
        businessId: pizzaShop.id,
      },
      {
        name: 'Carbonara',
        price: 5500,
        capacity: 1,
        description: 'Ovos, bacon, queijo parmesão',
        businessId: pizzaShop.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✓ Items de menu criados para Pizzaria');

  // Quartos (Hotel)
  await prisma.item.createMany({
    data: [
      {
        name: 'Quarto Executivo',
        price: 85000,
        capacity: 2,
        description: 'Suite com vista para o oceano',
        businessId: hotel.id,
      },
      {
        name: 'Quarto Standard',
        price: 45000,
        capacity: 2,
        description: 'Confortável e bem equipado',
        businessId: hotel.id,
      },
      {
        name: 'Penthouse',
        price: 150000,
        capacity: 4,
        description: 'Luxo total no topo do prédio',
        businessId: hotel.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✓ Quartos criados para Hotel');

  // ───────────────────────────────────────────────────────────────
  // 4. CRIAR OPERATING HOURS
  // ───────────────────────────────────────────────────────────────

  for (let day = 0; day < 7; day++) {
    await prisma.operatingHour.upsert({
      where: {
        businessId_dayOfWeek: {
          businessId: pizzaShop.id,
          dayOfWeek: day,
        },
      },
      update: {},
      create: {
        businessId: pizzaShop.id,
        dayOfWeek: day,
        openTime: '11:00',
        closeTime: '23:00',
        isClosed: false,
      },
    });
  }

  console.log('✓ Horários de funcionamento criados');

  // ───────────────────────────────────────────────────────────────
  // 5. CRIAR PROMOÇÕES
  // ───────────────────────────────────────────────────────────────

  // (Adicionar endpoint de promoção se necessário)

  console.log('\n✅ SEED COMPLETADO\n');
  console.log('Credenciais de Teste:');
  console.log('─────────────────────────────────────────');
  console.log('OWNER (Pizzaria):');
  console.log('  Email: owner.pizza@test.com');
  console.log('  Senha: TestPassword123!');
  console.log('');
  console.log('OWNER (Hotel):');
  console.log('  Email: owner.hotel@test.com');
  console.log('  Senha: TestPassword123!');
  console.log('');
  console.log('CLIENT 1:');
  console.log('  Email: client.ana@test.com');
  console.log('  Senha: ClientPass123!');
  console.log('');
  console.log('CLIENT 2:');
  console.log('  Email: client.bob@test.com');
  console.log('  Senha: ClientPass123!');
  console.log('─────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Comando para executar Seed
```bash
npm run test:bootstrap-flow
```

---

## 🔄 Fluxo de Reflexão em Tempo Real

### Opção 1: WebSocket (Real-time)
```javascript
// Quando owner edita, notificar todos os clientes vendo esse negócio

// Backend (eventos.gateway.ts)
@WebSocketGateway()
export class EventsGateway {
  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, data: { businessId: string }) {
    client.join(`business-${data.businessId}`);
  }

  // Quando business é atualizado:
  handleBusinessUpdate(businessId: string, updatedData: any) {
    this.server
      .to(`business-${businessId}`)
      .emit('businessUpdated', updatedData);
  }
}

// Frontend (DetailModal)
useEffect(() => {
  if (!socket) return;
  
  socket.emit('joinRoom', { businessId });
  
  const handleUpdate = (data) => {
    setBusinessData(prev => ({ ...prev, ...data }));
  };
  
  socket.on('businessUpdated', handleUpdate);
  
  return () => {
    socket.off('businessUpdated', handleUpdate);
  };
}, [businessId, socket]);
```

### Opção 2: Polling (Simples)
```javascript
// Frontend (DetailModal)
useEffect(() => {
  if (!businessId) return;
  
  const interval = setInterval(async () => {
    try {
      const data = await backendApi.getBusinessDetail(businessId);
      setBusinessData(data);
    } catch (error) {
      console.error('Erro ao fazer fetch:', error);
    }
  }, 5000); // A cada 5 segundos
  
  return () => clearInterval(interval);
}, [businessId]);
```

---

## 📊 Padrão de Resposta da API

### Sucesso (200-201)
```json
{
  "id": "business-123",
  "name": "Pizzaria do João",
  "category": "DINING",
  "description": "...",
  "metadata": {
    "isOpen": true,
    "statusText": "Aberto agora",
    "phone": "+244 923 456 789"
  },
  "latitude": -8.8383,
  "longitude": 13.2344,
  "createdAt": "2026-03-01T10:00:00Z",
  "updatedAt": "2026-03-05T14:30:00Z"
}
```

### Erro (4xx-5xx)
```json
{
  "statusCode": 404,
  "message": "Estabelecimento não encontrado para este proprietário.",
  "error": "Not Found"
}
```

---

## ✅ Checklist de Implementação

### Backend (NestJS)
- [x] Controllers com PATCH endpoints
- [x] DTOs com validação
- [x] JWT Guard para autenticação
- [x] Validação de propriedade (ownership)
- [x] Prisma ORM com relacionamentos
- [x] PostgreSQL configurado
- [ ] WebSocket para atualizações real-time
- [ ] Tratamento de erros robusto
- [ ] Logging estruturado

### Frontend (React Native)
- [ ] API consumer (backendApi.js) com todos endpoints
- [ ] Integração no OwnerModule
- [ ] Error handling com retry logic
- [ ] Loading states
- [ ] Toast/Alert notifications
- [ ] Offline support (AsyncStorage)
- [ ] Refresh token handling
- [ ] Validação de dados no frontend (antes de enviar)

### Database
- [ ] Migrations prismáticas aplicadas
- [ ] Seed com dados de teste
- [ ] Índices de performance
- [ ] Backups configurados

### Testes
- [ ] Unit tests no backend
- [ ] Integration tests (E2E)
- [ ] Manual testing com test profiles
- [ ] Load testing (optional)

---

## 🚀 Deploy (Production)

### Variáveis de Ambiente

**Backend (.env)**
```
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
DIRECT_URL="postgresql://user:pass@host:port/db"
JWT_SECRET="use-generated-secret-here"
JWT_REFRESH_SECRET="use-generated-secret-here"
BACKEND_URL="https://achaqu-api.com"
NODE_ENV="production"
```

**Frontend (.env.local)**
```
EXPO_PUBLIC_BACKEND_URL="https://achaqu-api.com"
EXPO_PUBLIC_ENV="production"
```

### SSL/TLS
```
sslmode=require (produção)
sslmode=disable (desenvolvimento)
```

---

## 📚 Referências

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma ORM](https://www.prisma.io/docs/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [React Native Fetch API](https://reactnative.dev/docs/network)
- [REST API Design](https://restfulapi.net/)

---

**Última atualização**: 05/03/2026 - v1.0
