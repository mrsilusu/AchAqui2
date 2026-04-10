# Regras de Staff HT e Fluxo de Permissões

Data de referência: 2026-04-10

## 1. Objetivo
Este documento descreve, de forma operacional, as regras de autorização do módulo HT para utilizadores de staff.

Abrange:
- perfis HT (`HT_HOUSEKEEPER`, `HT_RECEPTIONIST`, `HT_MANAGER`, `GENERAL_MANAGER`)
- fluxo de autenticação e claims no JWT
- permissões de UI (o que vê e não vê)
- regras de backend (o que pode e não pode executar)

## 2. Perfis HT
Perfis considerados no frontend e backend:
- `HT_HOUSEKEEPER`
- `HT_RECEPTIONIST`
- `HT_MANAGER`
- `GENERAL_MANAGER`

## 3. Claims usadas para autorização
JWT de staff deve conter:
- `role: 'STAFF'`
- `staffRole`
- `businessId`
- `staffId`
- `sub` (user id)
- `email`

`businessId` no JWT define o tenant autorizado para staff.

## 4. Fluxo de autenticação/autorização
1. Login STAFF entra em `AuthService.signIn`.
2. O contexto principal HT é resolvido por `getPrimaryHtStaffContext(user.id)`.
3. A resolução tenta primeiro `coreBusinessStaff` e, se faltar, faz fallback para `ht_staff` (`department -> staffRole`).
4. O token é emitido com `staffRole + businessId + staffId`.
5. No frontend, a visibilidade de secções usa `canSeeSection(token, section)` e/ou `staffRole` passado para os módulos.
6. No backend, valida-se tenant pelo `businessId` do JWT e, para operações sensíveis, valida-se papel de staff adicionalmente nos services.

## 5. Matriz de visibilidade na UI
Fonte: `src/lib/staffPermissions.js` (`SECTION_ACCESS`).

| Perfil | Dashboard | Receção | Housekeeping | Gestor de Reservas | Gestão de Staff | Financeiro |
|---|---:|---:|---:|---:|---:|---:|
| `HT_HOUSEKEEPER` | Nao | Nao | Sim | Nao | Nao | Nao |
| `HT_RECEPTIONIST` | Sim | Sim | Nao | Sim | Nao | Nao |
| `HT_MANAGER` | Sim | Sim | Sim | Sim | Sim | Sim |
| `GENERAL_MANAGER` | Sim | Sim | Sim | Sim | Sim | Sim |

Regras práticas de UI:
- `HT_HOUSEKEEPER` nao deve ver botões de receção, gestor de reservas, staff, financeiro.
- `HT_RECEPTIONIST` nao deve ver housekeeping, staff, financeiro.
- `HT_MANAGER` e `GENERAL_MANAGER` veem todas as secções HT do PMS.

## 6. Regras de backend por dominio

### 6.1 Regras base
- Staff so pode atuar no `businessId` do seu JWT.
- Quando endpoint recebe `businessId`, controllers HT resolvem com prioridade para JWT em modo staff.

### 6.2 Booking/Dashboard/Guests/Rooms
- Os controllers HT usam `resolvedBusinessId` para staff.
- Services HT usam `assertAccess` (ou equivalente) para validar tenant.
- Em varios pontos existe fallback para `ht_staff` quando `coreBusinessStaff` nao tem registo.

### 6.3 Housekeeping
- Conclusao de tarefa (`housekeeping/:id/complete`): permitido para housekeeping e manager (via regras de serviço).
- Aprovação de inspeção (`housekeeping/rooms/:roomId/approve`): permitido para manager.

### 6.4 Gestão de Staff (`/ht/staff`)
- A regra efetiva de serviço permite:
- OWNER do negocio.
- STAFF com `businessId` do JWT igual ao negocio alvo e papel de gestão:
- `HT_MANAGER` ou `GENERAL_MANAGER`.
- STAFF sem papel de gestão recebe `403` para operações de gestão de staff.

Operações cobertas por esta regra:
- listar staff
- criar staff
- atualizar staff
- suspender/reativar
- ver atividade
- atribuir tarefa
- criar conta app de staff

## 7. O que cada perfil pode e nao pode (resumo operacional)

### `HT_HOUSEKEEPER`
Pode:
- ver secção de housekeeping
- completar tarefas de housekeeping permitidas

Nao pode:
- aceder a gestão de staff
- aceder a receção/gestor de reservas/financeiro
- aprovar inspeções finais (manager)

### `HT_RECEPTIONIST`
Pode:
- ver dashboard
- operar receção
- operar gestor de reservas

Nao pode:
- aceder a gestão de staff
- aceder a financeiro
- aprovar housekeeping de manager

### `HT_MANAGER`
Pode:
- ver e operar secções HT
- aceder a gestão de staff
- aprovar inspeções de housekeeping

Nao pode:
- atuar fora do `businessId` do JWT

### `GENERAL_MANAGER`
Pode:
- mesmas permissões operacionais de `HT_MANAGER` neste contexto HT

Nao pode:
- atuar fora do `businessId` do JWT

## 8. Observações de arquitetura
- A UI controla visibilidade de secções, mas a fonte final de segurança é sempre backend.
- Para ambientes legados, existe fallback `ht_staff` para evitar bloqueios quando nao existe sincronização completa em `coreBusinessStaff`.
- Em qualquer dúvida funcional, considerar sempre o par: `staffRole` + `businessId` do JWT.

## 9. Arquivos de referência
- `src/lib/staffPermissions.js`
- `src/operations/DashboardPMS.jsx`
- `src/operations/HospitalityModule.jsx`
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/guards/roles.guard.ts`
- `backend/src/ht-booking/ht-booking.controller.ts`
- `backend/src/ht-booking/ht-rooms.controller.ts`
- `backend/src/ht-booking/ht-guest.controller.ts`
- `backend/src/ht-booking/ht-staff.controller.ts`
- `backend/src/ht-booking/ht-staff.service.ts`
