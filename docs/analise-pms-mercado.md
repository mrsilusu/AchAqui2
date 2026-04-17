# Análise do Módulo PMS — AchAqui2 vs. Mercado

**Data:** Abril 2026  
**Base analisada:** `/backend/src/ht-booking/` + `/backend/prisma/schema.prisma` + `HospitalityModule.jsx`

---

## 1. Visão Geral

O módulo PMS do AchAqui2 é um sistema de gestão hoteleira multi-tenant (SaaS) construído com NestJS + Prisma + React Native/Expo. Abaixo segue a comparação com os principais PMS do mercado: **Opera Cloud (Oracle)**, **Cloudbeds**, **Mews**, **Little Hotelier**, **Hostaway** e **Clock PMS+**.

---

## 2. Matriz de Funcionalidades — Implementado vs. Mercado

### 2.1 Gestão de Reservas

| Funcionalidade | AchAqui2 | Opera Cloud | Cloudbeds | Mews | Observação |
|---|---|---|---|---|---|
| Criar/confirmar reserva | ✅ | ✅ | ✅ | ✅ | OK |
| Check-in / Check-out | ✅ | ✅ | ✅ | ✅ | OK |
| No-show com penalidade | ✅ | ✅ | ✅ | ✅ | OK |
| Reverter no-show | ✅ | ✅ | ⚠️ | ✅ | Diferencial positivo |
| Extensão de estadia | ✅ | ✅ | ✅ | ✅ | OK |
| Adiamento de reserva | ✅ | ✅ | ⚠️ | ⚠️ | Diferencial positivo |
| Troca de quarto | ✅ | ✅ | ✅ | ✅ | OK |
| Reservas de grupo | ❌ | ✅ | ✅ | ✅ | **Gap crítico** |
| Waitlist (lista de espera) | ❌ | ✅ | ⚠️ | ✅ | Gap relevante |
| Reservas de longa duração | ❌ | ✅ | ✅ | ✅ | Gap relevante |
| Bloqueio de quarto | ❌ | ✅ | ✅ | ✅ | Gap relevante |
| Timeline/mapa de ocupação | ✅ | ✅ | ✅ | ✅ | OK |

### 2.2 Gestão de Quartos e Inventário

| Funcionalidade | AchAqui2 | Opera Cloud | Cloudbeds | Mews |
|---|---|---|---|---|
| Status do quarto (CLEAN/DIRTY/MAINTENANCE) | ✅ | ✅ | ✅ | ✅ |
| Tipos de quarto com preços e amenidades | ✅ | ✅ | ✅ | ✅ |
| Buffer de overbooking configurável | ✅ | ✅ | ✅ | ⚠️ |
| Quartos fora de serviço (out-of-order) | ⚠️ (via MAINTENANCE) | ✅ | ✅ | ✅ |
| Gestão de inventário multi-propriedade | ❌ | ✅ | ✅ | ✅ |
| Yield management automático | ❌ | ✅ | ✅ | ✅ |

### 2.3 Pricing / Revenue Management

| Funcionalidade | AchAqui2 | Opera Cloud | Cloudbeds | Mews |
|---|---|---|---|---|
| Preço base por tipo de quarto | ✅ | ✅ | ✅ | ✅ |
| Tarifas sazonais | ✅ | ✅ | ✅ | ✅ |
| Multiplicador fim-de-semana | ✅ | ✅ | ✅ | ✅ |
| Estadia mínima | ✅ | ✅ | ✅ | ✅ |
| Códigos de voucher/desconto | ✅ | ✅ | ✅ | ✅ |
| Tarifas por canal de venda | ❌ | ✅ | ✅ | ✅ |
| Precificação dinâmica (demand-based) | ❌ | ✅ | ✅ | ✅ |
| Rate parity enforcement | ❌ | ✅ | ✅ | ✅ |
| RevPAR / ADR / Occupancy % automatizados | ❌ | ✅ | ✅ | ✅ |
| Pacotes (café, spa, transfer) | ❌ | ✅ | ✅ | ✅ |

### 2.4 Perfil do Hóspede (Guest Profile / CRM)

| Funcionalidade | AchAqui2 | Opera Cloud | Cloudbeds | Mews |
|---|---|---|---|---|
| Perfil centralizado (nome, doc, contato) | ✅ | ✅ | ✅ | ✅ |
| Dados encriptados (LGPD/GDPR) | ✅ | ✅ | ✅ | ✅ |
| Flag VIP e blacklist | ✅ | ✅ | ✅ | ✅ |
| Histórico de estadias | ⚠️ (via booking) | ✅ | ✅ | ✅ |
| Preferências (andar, travesseiro, etc.) | ⚠️ (campo notes) | ✅ | ✅ | ✅ |
| Programa de fidelidade (loyalty) | ❌ | ✅ | ⚠️ | ✅ |
| Portal do hóspede (self-service) | ❌ | ✅ | ✅ | ✅ |
| Check-in online / pré-chegada digital | ❌ | ✅ | ✅ | ✅ |
| Comunicação automatizada (e-mail/SMS) | ❌ | ✅ | ✅ | ✅ |

### 2.5 Faturamento / Folio

| Funcionalidade | AchAqui2 | Opera Cloud | Cloudbeds | Mews |
|---|---|---|---|---|
| Folio por reserva (hospedagem + extras) | ✅ | ✅ | ✅ | ✅ |
| Tipos de item: minibar, lavandaria, spa, etc. | ✅ | ✅ | ✅ | ✅ |
| Taxas e descontos | ✅ | ✅ | ✅ | ✅ |
| Métodos: dinheiro, cartão, transferência, MULTICAIXA | ✅ | ✅ | ✅ | ✅ |
| Pagamento parcial (depósito) | ✅ | ✅ | ✅ | ✅ |
| IVA / NIF Angola (AGT) | ✅ (parcial) | ✅ | ❌ | ❌ |
| Emissão de fatura automatizada | ❌ | ✅ | ✅ | ✅ |
| Split de folio (empresarial/pessoal) | ❌ | ✅ | ⚠️ | ✅ |
| Integração gateway de pagamento | ❌ | ✅ | ✅ | ✅ |
| Reconciliação financeira | ❌ | ✅ | ✅ | ✅ |

### 2.6 Housekeeping

| Funcionalidade | AchAqui2 | Opera Cloud | Cloudbeds | Mews |
|---|---|---|---|---|
| Tarefas com ciclo completo (criação→inspeção) | ✅ | ✅ | ✅ | ✅ |
| Prioridade (NORMAL/URGENT) | ✅ | ✅ | ✅ | ✅ |
| Atribuição por andar/staff | ✅ | ✅ | ✅ | ✅ |
| App mobile para housekeeping | ❌ | ✅ | ✅ | ✅ |
| Checklist por quarto | ❌ | ✅ | ⚠️ | ✅ |
| Limpeza profunda programada | ❌ | ✅ | ⚠️ | ✅ |
| Gestão de linho/estoque | ❌ | ✅ | ⚠️ | ⚠️ |
| Manutenção preventiva com alertas | ❌ | ✅ | ⚠️ | ✅ |

### 2.7 Gestão de Funcionários

| Funcionalidade | AchAqui2 | Opera Cloud | Cloudbeds | Mews |
|---|---|---|---|---|
| Perfis com departamento e turno | ✅ | ✅ | ✅ | ✅ |
| Controle de permissões granular | ✅ | ✅ | ✅ | ✅ |
| Suspensão e reativação | ✅ | ✅ | ✅ | ✅ |
| Autenticação por PIN | ✅ | ✅ | ⚠️ | ⚠️ |
| Registo de atividade / audit | ✅ | ✅ | ✅ | ✅ |
| Gestão de horários (escala) | ❌ | ✅ | ⚠️ | ⚠️ |
| Comissionamento de vendas | ❌ | ✅ | ⚠️ | ⚠️ |

### 2.8 Channel Manager / Distribuição

| Funcionalidade | AchAqui2 | Opera Cloud | Cloudbeds | Mews |
|---|---|---|---|---|
| Sync iCal (Booking.com, Airbnb) | ✅ | ✅ | ✅ | ✅ |
| ARI (Availability, Rates, Inventory) em tempo real | ❌ | ✅ | ✅ | ✅ |
| API OTA nativa (Booking.com XML, Expedia EQC) | ❌ | ✅ | ✅ | ✅ |
| Booking engine próprio (widget para site) | ❌ | ✅ | ✅ | ✅ |
| Comparação de performance por canal | ❌ | ✅ | ✅ | ✅ |
| Gestão de restrições (min stay, stop sell) | ❌ | ✅ | ✅ | ✅ |

### 2.9 Relatórios e Analytics

| Funcionalidade | AchAqui2 | Opera Cloud | Cloudbeds | Mews |
|---|---|---|---|---|
| Dashboard em tempo real | ✅ | ✅ | ✅ | ✅ |
| Lista de chegadas/saídas do dia | ✅ | ✅ | ✅ | ✅ |
| Hóspedes em casa | ✅ | ✅ | ✅ | ✅ |
| KPIs (RevPAR, ADR, Occupancy) | ❌ | ✅ | ✅ | ✅ |
| Relatório de receita por período | ❌ | ✅ | ✅ | ✅ |
| Previsão de ocupação | ❌ | ✅ | ✅ | ✅ |
| Análise de segmento de mercado | ❌ | ✅ | ✅ | ✅ |
| Relatório de housekeeping | ❌ | ✅ | ✅ | ✅ |
| Relatório de funcionários | ⚠️ (activity log) | ✅ | ✅ | ✅ |
| Construtor de relatórios personalizado | ❌ | ✅ | ✅ | ✅ |
| Exportação para Excel/PDF | ❌ | ✅ | ✅ | ✅ |

### 2.10 Segurança e Conformidade

| Funcionalidade | AchAqui2 | Opera Cloud | Cloudbeds | Mews |
|---|---|---|---|---|
| JWT + refresh tokens | ✅ | ✅ | ✅ | ✅ |
| RBAC (papéis e permissões) | ✅ | ✅ | ✅ | ✅ |
| Isolamento multi-tenant (businessId) | ✅ | ✅ | ✅ | ✅ |
| Audit log imutável (GDPR) | ✅ | ✅ | ✅ | ✅ |
| Encriptação de dados pessoais | ✅ | ✅ | ✅ | ✅ |
| Locking otimista (concorrência ACID) | ✅ | ✅ | ✅ | ✅ |
| Rate limiting | ✅ | ✅ | ✅ | ✅ |
| 2FA (autenticação de dois fatores) | ❌ | ✅ | ✅ | ✅ |
| PCI-DSS (tratamento de cartões) | ❌ | ✅ | ✅ | ✅ |
| GDPR export/delete tools | ❌ | ✅ | ✅ | ✅ |
| SSO (Single Sign-On) | ❌ | ✅ | ⚠️ | ✅ |

---

## 3. Pontuação Geral

| Área | Pontuação AchAqui2 | Maturidade |
|---|---|---|
| Gestão de Reservas | 7/10 | ★★★★☆ |
| Gestão de Quartos | 6/10 | ★★★☆☆ |
| Revenue Management | 4/10 | ★★☆☆☆ |
| Perfil do Hóspede / CRM | 5/10 | ★★★☆☆ |
| Faturamento / Folio | 6/10 | ★★★☆☆ |
| Housekeeping | 5/10 | ★★★☆☆ |
| Gestão de Funcionários | 7/10 | ★★★★☆ |
| Channel Manager | 3/10 | ★★☆☆☆ |
| Relatórios e Analytics | 3/10 | ★★☆☆☆ |
| Segurança e Conformidade | 7/10 | ★★★★☆ |
| **TOTAL** | **53/100** | **★★★☆☆** |

---

## 4. Diferenciais Positivos (vs. mercado)

1. **Conformidade Angola (AGT):** Suporte a NIF, MULTICAIXA e prefixo de fatura para o contexto angolano — algo que Opera Cloud, Cloudbeds e Mews não oferecem nativamente.
2. **Reversão de No-Show:** Funcionalidade rara no mercado (maioria não permite reverter facilmente).
3. **Adiamento de Reserva (postpone):** Pouco comum como operação atómica em PMS concorrentes.
4. **Audit Log GDPR sem dados pessoais:** Abordagem mais segura que muitos concorrentes que loggam dados sensíveis.
5. **Locking otimista em check-in/checkout:** Proteção de concorrência que muitos PMS de menor porte não implementam.
6. **Permissões seccionais granulares:** Sistema de `sectionOverrides` por funcionário é mais flexível que RBAC simples.

---

## 5. Gaps Críticos por Prioridade

### Prioridade Alta (bloqueia competitividade)

| # | Gap | Impacto |
|---|---|---|
| 1 | **Relatórios financeiros básicos** (RevPAR, ADR, receita por período) | Gestores não conseguem tomar decisões sem KPIs |
| 2 | **Emissão automatizada de faturas** (PDF com NIF/IVA Angola) | Requisito legal/fiscal |
| 3 | **Reservas de grupo** (N quartos numa reserva) | Hotéis perdem segmento corporativo e eventos |
| 4 | **Bloqueio de quarto** (out-of-order com motivo e data) | Operacional básico de qualquer hotel |
| 5 | **Exportação de dados** (Excel/CSV para contabilidade) | Integração com sistemas externos |

### Prioridade Média (afeta conversão e retenção)

| # | Gap | Impacto |
|---|---|---|
| 6 | **Check-in online / pré-chegada digital** | Tendência pós-COVID, reduz filas na receção |
| 7 | **Comunicação automatizada** (confirmação, lembrete, pós-estadia) | Reduz no-shows e aumenta satisfação |
| 8 | **Booking engine** (widget para o site do hotel) | Canal direto sem comissão OTA |
| 9 | **Channel manager ARI** (Booking.com XML nativo) | iCal é unidirecional e tem delay |
| 10 | **Split de folio** (separar pessoal de empresa) | Obrigatório para clientes corporativos |

### Prioridade Baixa (diferenciação avançada)

| # | Gap | Impacto |
|---|---|---|
| 11 | Programa de fidelidade (loyalty points) | Retenção de hóspedes recorrentes |
| 12 | Precificação dinâmica (demand-based) | Revenue management avançado |
| 13 | App mobile para housekeeping | Eficiência operacional |
| 14 | Integração com fechaduras inteligentes | Experiência do hóspede |
| 15 | Manutenção preventiva com alertas | Gestão de ativos hoteleiros |

---

## 6. Arquitetura — Pontos Fortes e Melhorias

### Pontos Fortes
- Multi-tenant SaaS com isolamento correto por `businessId`
- Schema Prisma bem normalizado com enums tipados
- Separação clara de serviços (booking, folio, rooms, staff, housekeeping, dashboard)
- Locking otimista previne double-booking em alta concorrência
- Audit log imutável e GDPR-compliant desde o início

### Melhorias Arquiteturais Recomendadas

1. **Event-driven para notificações:** Adicionar um sistema de eventos (Bull/BullMQ) para disparar e-mails/SMS em check-in, check-out, pré-chegada. Hoje não existe qualquer notificação automatizada.
2. **Módulo de relatórios separado:** O `ht-dashboard.service.ts` está a crescer (16KB). Criar um módulo `ht-reports` com geração de PDF/Excel.
3. **WebSockets para dashboard em tempo real:** O dashboard atual é polling. Adicionar WebSocket para updates de status de quartos e housekeeping em tempo real.
4. **Cache de disponibilidade:** Para hotéis com alto volume, calcular disponibilidade em cada pedido é custoso. Adicionar Redis para cache de inventário.
5. **Separação do channel manager:** O `ht-ical.service.ts` (iCal apenas) deve evoluir para um módulo `ht-channels` com suporte a múltiplos protocolos (iCal, OTA XML, REST).

---

## 7. Conclusão

O módulo PMS do AchAqui2 tem uma **base sólida para operações hoteleiras básicas**, com boas práticas de segurança, conformidade Angola e funcionalidades operacionais bem implementadas. Com ~53% de paridade com PMS líderes de mercado, o sistema é competitivo para **pequenos e médios hotéis que operam maioritariamente offline** (receção presencial, sem OTAs complexas).

Para escalar e competir diretamente com Cloudbeds ou Mews no segmento SMB, os gaps mais críticos a endereçar na próxima fase são:
1. Relatórios financeiros + exportação
2. Faturação automatizada com conformidade AGT
3. Reservas de grupo
4. Check-in online + comunicação automatizada
5. Channel manager bidirecional (substituir iCal unidirecional)
