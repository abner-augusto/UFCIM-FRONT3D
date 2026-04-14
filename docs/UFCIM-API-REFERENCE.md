# UFCIM — Referência de API para o Frontend

> Documento de consulta rápida para o frontend. Cada tela deve conferir aqui o contrato exato da rota antes de implementar qualquer chamada.

---

## Índice

1. [Configuração Base](#1-configuração-base)
2. [Autenticação](#2-autenticação)
3. [Códigos de Status HTTP](#3-códigos-de-status-http)
4. [Formato Padrão de Resposta](#4-formato-padrão-de-resposta)
5. [Enums e Tipos](#5-enums-e-tipos)
6. [Rotas — Health](#6-health)
7. [Rotas — Usuários](#7-usuários)
8. [Rotas — Espaços](#8-espaços)
9. [Rotas — Equipamentos](#9-equipamentos)
10. [Rotas — Reservas](#10-reservas)
11. [Rotas — Bloqueios](#11-bloqueios)
    - `GET /blockings/mine`
    - `GET /blockings/space/:spaceId`
    - `POST /blockings`
    - `PATCH /blockings/:id/remove`
12. [Rotas — Notificações](#12-notificações)
13. [Rotas — Stats](#13-stats)
14. [Rotas — Logs de Auditoria](#14-logs-de-auditoria)
15. [Regras de Negócio Críticas](#15-regras-de-negócio-críticas)
16. [UUIDs de Seed (Dev)](#16-uuids-de-seed-dev)
17. [Armadilhas Comuns (Erros 204 / Silenciosos)](#17-armadilhas-comuns)

---

## 1. Configuração Base

| Ambiente | Base URL |
|----------|----------|
| Desenvolvimento local | `http://localhost:8787/api/v1` |
| Prototype (Workers) | `https://ufcim.<account>.workers.dev/api/v1` |
| Produção (universidade) | `https://ufcim.ufc.br/api/v1` |

O painel admin usa prefixo separado: `/admin` (mesmo host, sem `/api/v1`).

---

## 2. Autenticação

Todas as rotas exceto `GET /health` e `GET /api/v1/stats` exigem:

```
Authorization: Bearer <jwt>
```

O JWT é um token RS256 emitido pelo Keycloak. Em desenvolvimento, use os tokens gerados por `node scripts/generate-test-token.mjs [role]`.

O papel do usuário é extraído do campo `realm_access.roles` do JWT:

| Keycloak role | Papel interno |
|--------------|---------------|
| `ufcim-student` | `student` |
| `ufcim-professor` | `professor` |
| `ufcim-staff` | `staff` |
| `ufcim-maintenance` | `maintenance` |

---

## 3. Códigos de Status HTTP

| Código | Quando ocorre |
|--------|---------------|
| `200` | Sucesso em GET e PATCH |
| `201` | Recurso criado (POST) |
| `400` | Erro de validação ou regra de negócio violada |
| `401` | JWT ausente ou inválido |
| `403` | Papel sem permissão para a ação |
| `404` | Recurso não encontrado |
| `409` | Conflito (slot ocupado, bloqueio duplicado) |
| `500` | Erro interno |

> ⚠️ **Importante:** A API **nunca retorna 204**. Se você está recebendo 204, é sinal de que a rota está errada (path incorreto, método errado, ou ausência do prefixo `/api/v1`).

---

## 4. Formato Padrão de Resposta

### Sucesso — objeto único
```json
{
  "id": "uuid",
  "campo": "valor"
}
```

### Sucesso — lista paginada
```json
{
  "data": [ { "id": "...", "..." : "..." } ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 85
  }
}
```

### Erro
```json
{
  "error": "Mensagem legível por humanos",
  "code": "CODIGO_MAQUINA",
  "details": [
    { "field": "date", "message": "Date cannot be in the past" }
  ]
}
```

Códigos de máquina comuns: `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `FORBIDDEN`, `UNAUTHORIZED`, `ALREADY_CANCELED`.

---

## 5. Enums e Tipos

### Papel de usuário (`role`)
`student` | `professor` | `staff` | `maintenance`

### Tipo de espaço (`type`)
`classroom` | `study_room` | `meeting_room` | `hall`

### Status de reserva
`confirmed` | `canceled` | `modified` | `overridden`

> `overridden` — reserva sobreposta automaticamente por um bloqueio. O usuário recebe notificação.

### Status de bloqueio
`active` | `removed`

### Tipo de bloqueio (`blockType`)
`administrative` | `maintenance`

### Status de equipamento
`working` | `broken` | `under_repair` | `replacement_scheduled`

### Status de slot de disponibilidade
`available` | `reserved` | `blocked` | `closed`

### Formato de tempo
Horários usam `HH:00` (horas cheias). Ex: `"08:00"`, `"14:00"`. Datas usam `YYYY-MM-DD`.

---

## 6. Health

### `GET /health`

Não requer autenticação.

**Response 200:**
```json
{ "status": "ok", "timestamp": "2026-04-05T12:00:00.000Z" }
```

---

## 7. Usuários

### `GET /api/v1/users/me`
**Roles:** qualquer autenticado

Retorna o perfil do usuário atual extraído do JWT e sincronizado no banco.

**Response 200:**
```json
{
  "id": "uuid",
  "name": "João Silva",
  "registration": "2023001001",
  "role": "student",
  "department": "Ciência da Computação",
  "email": "joao.silva@alu.ufc.br",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "unreadCount": 2
}
```

> `unreadCount` — quantidade de notificações com `read: false` do usuário. Usar para exibir badge no header sem chamada extra à API.

---

### `GET /api/v1/users`
**Roles:** `staff`

Lista todos os usuários com paginação.

**Query params:**
| Param | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `page` | number | `1` | Página |
| `limit` | number | `20` | Itens por página (máx 100) |

**Response 200:**
```json
{
  "data": [ { "id": "...", "name": "...", "role": "student", "..." : "..." } ],
  "pagination": { "page": 1, "limit": 20, "total": 4 }
}
```

---

## 8. Espaços

### `GET /api/v1/spaces`
**Roles:** qualquer autenticado

Lista espaços com filtros opcionais.

**Query params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `campus` | string | Filtra por campus |
| `block` | string | Filtra por bloco |
| `department` | string | Filtra por departamento |
| `type` | `classroom` \| `study_room` \| `meeting_room` \| `hall` | Filtra por tipo |
| `page` | number | Padrão `1` |
| `limit` | number | Padrão `20`, máx `100` |

**Response 200:**
```json
[
  {
    "id": "uuid",
    "number": "A101",
    "type": "classroom",
    "block": "A",
    "campus": "Pici",
    "department": "Ciência da Computação",
    "capacity": 40,
    "furniture": "Mesas e cadeiras para 40 pessoas",
    "lighting": "Fluorescente",
    "hvac": "Ar condicionado split 18000 BTU",
    "multimedia": "Projetor + tela retrátil",
    "closedFrom": "22:00",
    "closedTo": "07:00",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
]
```

> ⚠️ Esta rota retorna **array direto**, não objeto com `data`/`pagination`. Não há paginação no envelope — a paginação é via query params internamente.

---

### `GET /api/v1/spaces/:id`
**Roles:** qualquer autenticado

Retorna espaço com seus equipamentos embutidos.

**Response 200:**
```json
{
  "id": "uuid",
  "number": "A101",
  "type": "classroom",
  "block": "A",
  "campus": "Pici",
  "department": "Ciência da Computação",
  "capacity": 40,
  "furniture": "...",
  "lighting": "...",
  "hvac": "...",
  "multimedia": "...",
  "closedFrom": "22:00",
  "closedTo": "07:00",
  "createdAt": "...",
  "updatedAt": "...",
  "equipment": [
    {
      "id": "uuid",
      "assetId": "0000000021",
      "spaceId": "uuid",
      "name": "Projetor Epson X41+",
      "type": "projector",
      "status": "working",
      "notes": null,
      "updatedBy": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### `GET /api/v1/spaces/:id/availability`
**Roles:** qualquer autenticado

Retorna disponibilidade **hora a hora** (24 slots) para uma data específica. Não há `timeSlot` — use `startTime`/`endTime`.

**Query params obrigatórios:**
| Param | Formato | Exemplo |
|-------|---------|---------|
| `date` | `YYYY-MM-DD` | `2026-06-10` |

**Response 200 — array de 24 objetos:**
```json
[
  { "startTime": "00:00", "endTime": "01:00", "status": "closed" },
  { "startTime": "01:00", "endTime": "02:00", "status": "closed" },
  { "startTime": "07:00", "endTime": "08:00", "status": "available" },
  { "startTime": "08:00", "endTime": "09:00", "status": "blocked" },
  { "startTime": "09:00", "endTime": "10:00", "status": "reserved" },
  { "startTime": "14:00", "endTime": "15:00", "status": "available" },
  { "startTime": "22:00", "endTime": "23:00", "status": "closed" },
  { "startTime": "23:00", "endTime": "24:00", "status": "closed" }
]
```

**Prioridade dos status:** `closed` > `blocked` > `reserved` > `available`

**Erros possíveis:**
- `400` — `date` não informado ou formato inválido
- `404` — espaço não encontrado

---

### `POST /api/v1/spaces`
**Roles:** `staff`

**Body:**
```json
{
  "number": "D402",
  "type": "classroom",
  "block": "D",
  "campus": "Pici",
  "department": "Ciência da Computação",
  "capacity": 30,
  "furniture": "Mesas e cadeiras",
  "lighting": "LED",
  "hvac": "Ar condicionado split",
  "multimedia": "Projetor",
  "closedFrom": "22:00",
  "closedTo": "07:00"
}
```

`furniture`, `lighting`, `hvac`, `multimedia` são opcionais. `closedFrom`/`closedTo` têm padrão `"22:00"`/`"07:00"`.

**Response 201:** objeto do espaço criado.

---

### `PUT /api/v1/spaces/:id`
**Roles:** `staff`

Atualização parcial (todos os campos são opcionais). Mesmo body do POST, todos opcionais.

**Response 200:** objeto do espaço atualizado.

---

## 9. Equipamentos

### `GET /api/v1/equipment/space/:spaceId`
**Roles:** qualquer autenticado

Lista todos os equipamentos de um espaço.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "assetId": "0000000021",
    "spaceId": "uuid",
    "name": "Projetor Epson X41+",
    "type": "projector",
    "status": "working",
    "notes": null,
    "updatedBy": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

---

### `POST /api/v1/equipment`
**Roles:** `staff`, `maintenance`

**Body:**
```json
{
  "assetId": "0000000099",
  "spaceId": "uuid-do-espaco",
  "name": "Ar condicionado Springer 18000 BTU",
  "type": "hvac",
  "status": "working",
  "notes": "Instalado em março de 2026"
}
```

`assetId` deve ter exatamente 10 dígitos numéricos. `notes` é opcional.

**Response 201:** objeto do equipamento criado.

---

### `PATCH /api/v1/equipment/:id/status`
**Roles:** `staff`, `maintenance`

**Body:**
```json
{
  "status": "under_repair",
  "notes": "Compressor com defeito, aguardando peça"
}
```

`notes` é opcional.

**Response 200:** objeto do equipamento atualizado.

---

## 10. Reservas

### `GET /api/v1/reservations/mine`
**Roles:** qualquer autenticado

Lista as reservas do usuário autenticado.

**Query params:**
| Param | Tipo | Padrão |
|-------|------|--------|
| `page` | number | `1` |
| `limit` | number | `20` |

**Response 200:**
```json
[
  {
    "id": "uuid",
    "spaceId": "uuid",
    "userId": "uuid",
    "date": "2026-06-10",
    "startTime": "14:00",
    "endTime": "15:00",
    "status": "confirmed",
    "purpose": "class",
    "changeOrigin": null,
    "recurrenceId": null,
    "createdAt": "...",
    "updatedAt": "...",
    "space": { "id": "...", "number": "A101", "name": "Sala A101", "..." : "..." }
  }
]
```

> `purpose` pode ser `null` em reservas criadas antes da adição do campo.

---

### `GET /api/v1/reservations/space/:spaceId`
**Roles:** qualquer autenticado

Lista reservas confirmadas de um espaço. Pode filtrar por data.

**Query params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `date` | `YYYY-MM-DD` | Opcional. Filtra por data exata |

**Response 200:** array de reservas com `user` embutido.

---

### `POST /api/v1/reservations`
**Roles:** `student`, `professor`, `staff`

**Body:**
```json
{
  "spaceId": "uuid-do-espaco",
  "date": "2026-06-10",
  "startTime": "14:00",
  "endTime": "15:00",
  "purpose": "class"
}
```

`date` não pode ser no passado. `startTime`/`endTime` devem ser horas cheias (`HH:00`). `purpose` é opcional (máx. 100 caracteres). Valores sugeridos: `class`, `group_study`, `meeting`, `event`, `other`.

**Regras de negócio:**
- Estudantes podem ter no máximo **1 reserva ativa** simultânea.
- O intervalo não pode sobrepor reservas existentes ou bloqueios ativos.
- O intervalo não pode cair dentro do horário fechado do espaço (`closedFrom`/`closedTo`).

**Response 201:** objeto da reserva criada.

**Erros possíveis:**
- `400` — horário no fechado do espaço
- `409` — conflito com reserva existente
- `409` — estudante já tem reserva ativa

---

### `POST /api/v1/reservations/recurring`
**Roles:** `professor`, `staff`

Cria uma série de reservas recorrentes semanais.

**Body:**
```json
{
  "spaceId": "uuid-do-espaco",
  "startDate": "2026-06-02",
  "endDate": "2026-07-28",
  "dayOfWeek": 2,
  "startTime": "14:00",
  "endTime": "15:00",
  "description": "Aula de POO — turma 2026.1",
  "purpose": "class"
}
```

`dayOfWeek`: 0 = domingo, 1 = segunda ... 6 = sábado.
`startDate` deve ser anterior a `endDate`. `purpose` é opcional.

**Response 201:**
```json
{
  "recurrenceId": "uuid",
  "created": [ { "id": "...", "date": "2026-06-03", "..." : "..." } ],
  "skipped": [ "2026-06-10" ]
}
```

`skipped` lista as datas que foram puladas por conflito.

---

### `PATCH /api/v1/reservations/:id/cancel`
**Roles:** `student`, `professor`, `staff`

**Body:** nenhum (PATCH sem body).

**Regras:**
- `student` só pode cancelar **suas próprias** reservas.
- `professor` e `staff` podem cancelar reservas de terceiros.
- `maintenance` não pode cancelar reservas.
- Reserva já cancelada retorna `400` com code `ALREADY_CANCELED`.

**Response 200:** objeto da reserva com `status: "canceled"`.

---

## 11. Bloqueios

### `GET /api/v1/blockings/mine`
**Roles:** `professor`, `staff`, `maintenance`

Lista os bloqueios **ativos criados pelo usuário autenticado**, com o objeto `space` embutido.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "spaceId": "uuid",
    "createdBy": "uuid",
    "date": "2026-06-15",
    "startTime": "10:00",
    "endTime": "12:00",
    "reason": "Reunião do Conselho",
    "blockType": "administrative",
    "status": "active",
    "createdAt": "...",
    "updatedAt": "...",
    "space": {
      "id": "uuid",
      "number": "A101",
      "name": "Sala A101",
      "block": "A",
      "campus": "Pici"
    }
  }
]
```

> Retorna apenas bloqueios com `status = 'active'`. Bloqueios removidos não aparecem.
> `student` recebe `403`.

---

### `GET /api/v1/blockings/space/:spaceId`
**Roles:** qualquer autenticado

Lista bloqueios **ativos** de um espaço. Pode filtrar por data.

**Query params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `date` | `YYYY-MM-DD` | Opcional |

**Response 200:**
```json
[
  {
    "id": "uuid",
    "spaceId": "uuid",
    "createdBy": "uuid",
    "date": "2026-06-15",
    "startTime": "10:00",
    "endTime": "12:00",
    "reason": "Reunião do Conselho",
    "blockType": "administrative",
    "status": "active",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

---

### `POST /api/v1/blockings`
**Roles:** `professor`, `staff`, `maintenance`

Cria um bloqueio. **Cancela automaticamente** qualquer reserva confirmada que sobreponha o intervalo, notificando os usuários afetados.

**Body:**
```json
{
  "spaceId": "uuid-do-espaco",
  "date": "2026-06-15",
  "startTime": "10:00",
  "endTime": "12:00",
  "reason": "Reunião do Conselho Departamental",
  "blockType": "administrative"
}
```

`blockType`: `administrative` ou `maintenance`.

**Response 201:** objeto do bloqueio criado.

**Erros possíveis:**
- `409` — já existe bloqueio ativo no mesmo intervalo

---

### `PATCH /api/v1/blockings/:id/remove`
**Roles:** `professor`, `staff`, `maintenance`

**Body:** nenhum.

**Response 200:** objeto do bloqueio com `status: "removed"`.

---

## 12. Notificações

### `GET /api/v1/notifications`
**Roles:** qualquer autenticado

Lista notificações do usuário autenticado, da mais recente para a mais antiga.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "title": "Reserva cancelada",
    "message": "Sua reserva para A101 em 2026-06-15 foi cancelada devido a um bloqueio administrativo.",
    "type": "reservation_canceled",
    "read": false,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

---

### `PATCH /api/v1/notifications/:id/read`
**Roles:** qualquer autenticado

Marca uma notificação como lida. Só funciona para notificações do próprio usuário.

**Body:** nenhum.

**Response 200:** objeto da notificação com `read: true`.

---

### `PATCH /api/v1/notifications/read-all`
**Roles:** qualquer autenticado

Marca **todas** as notificações do usuário como lidas.

**Body:** nenhum.

**Response 200:**
```json
{ "updated": 3 }
```

> ⚠️ **Atenção à ordem das rotas:** `read-all` deve ser chamado como `/notifications/read-all`. Não confundir com `/notifications/:id/read` passando `"read-all"` como ID.

---

## 13. Stats

### `GET /api/v1/stats`
**Roles:** qualquer autenticado (usado pelo painel admin)

Retorna contagens do dashboard para o dia atual (ou data informada).

**Query params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `date` | `YYYY-MM-DD` | Opcional. Padrão: hoje |

**Response 200:**
```json
{
  "totalSpaces": 3,
  "activeReservationsToday": 2,
  "activeBlockings": 1,
  "totalUsers": 4
}
```

---

## 14. Logs de Auditoria

### `GET /api/v1/logs`
**Roles:** `staff`

Lista o log de auditoria (append-only, imutável).

**Query params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `userId` | string (UUID) | Filtra por usuário |
| `actionType` | string | Ex: `create_space`, `cancel_reservation` |
| `referenceType` | string | `space`, `reservation`, `blocking`, `equipment` |
| `dateFrom` | `YYYY-MM-DD` | Início do intervalo |
| `dateTo` | `YYYY-MM-DD` | Fim do intervalo |
| `page` | number | Padrão `1` |
| `limit` | number | Padrão `20` |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "actionType": "create_space",
      "referenceId": "uuid",
      "referenceType": "space",
      "details": "Created space A101",
      "createdAt": "..."
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 42 }
}
```

---

## 15. Regras de Negócio Críticas

| Regra | Detalhe |
|-------|---------|
| Estudante: limite de reservas | Máximo 1 reserva com status `confirmed` ativa simultaneamente |
| Horário fechado | Reservas e bloqueios não podem sobrepor `closedFrom`/`closedTo` do espaço |
| Bloqueio cancela reservas | Criar um bloqueio cancela automaticamente reservas conflitantes e notifica os usuários |
| Disponibilidade calculada | Não existe campo `status` em espaços — status é sempre calculado consultando reservas e bloqueios |
| Soft delete | Reservas canceladas e bloqueios removidos nunca são apagados — apenas mudam de status |
| `maintenance` não reserva | O papel `maintenance` não pode criar ou cancelar reservas |
| Cancelamento por estudante | Estudante só pode cancelar reservas cujo `userId` é o seu próprio |

---

## 16. UUIDs de Seed (Dev)

Use estes IDs em chamadas de teste sem precisar consultar o banco:

| Entidade | UUID |
|----------|------|
| Usuário: `student` (João Silva) | `00000000-0000-0000-0000-000000000001` |
| Usuário: `professor` (Dra. Maria Costa) | `00000000-0000-0000-0000-000000000002` |
| Usuário: `staff` (Carlos Oliveira) | `00000000-0000-0000-0000-000000000003` |
| Usuário: `maintenance` (Pedro Santos) | `00000000-0000-0000-0000-000000000004` |
| Espaço: Sala A101 (classroom, Pici) | `00000000-0000-0000-0000-000000000011` |
| Espaço: Sala B205 (study_room, Pici) | `00000000-0000-0000-0000-000000000012` |
| Espaço: Sala C301 (meeting_room, Pici) | `00000000-0000-0000-0000-000000000013` |
| Equipamento: Projetor Epson | `00000000-0000-0000-0000-000000000021` |
| Equipamento: Ar condicionado | `00000000-0000-0000-0000-000000000022` |
| Recorrência: Aula semanal | `00000000-0000-0000-0000-000000000051` |
| Reserva: hoje (confirmed) | `00000000-0000-0000-0000-000000000061` |
| Reserva: recorrente 1 | `00000000-0000-0000-0000-000000000062` |
| Reserva: recorrente 2 | `00000000-0000-0000-0000-000000000063` |
| Reserva: cancelada | `00000000-0000-0000-0000-000000000064` |
| Bloqueio: ativo 1 | `00000000-0000-0000-0000-000000000071` |
| Bloqueio: ativo 2 | `00000000-0000-0000-0000-000000000072` |
| Bloqueio: removido | `00000000-0000-0000-0000-000000000073` |

---

## 17. Armadilhas Comuns

### Erro 204 / resposta vazia

A API **nunca** retorna 204. Se você receber 204 ou body vazio inesperado, verifique:

1. **Prefixo ausente** — todas as rotas de dados ficam em `/api/v1/...`. Chamadas para `/spaces` sem o prefixo caem no 404 ou no admin shell (que retorna HTML).
2. **Método errado** — ex: `GET /reservations/:id/cancel` em vez de `PATCH`.
3. **Rota `/notifications/read-all` antes de `/:id/read`** — no servidor a ordem está correta, mas se o cliente montar a URL errada (ex: ID = `"read-all"`), receberá 404 ou comportamento inesperado.
4. **`Content-Type` ausente em POST/PUT/PATCH** — envie sempre `Content-Type: application/json` com body JSON. Sem ele, o parser retorna 400.
5. **Token expirado** — os tokens de dev gerados pelo script têm validade. Regenere com `node scripts/generate-test-token.mjs [role]` se estiver recebendo 401.

### Disponibilidade retorna array, não objeto

`GET /spaces/:id/availability` retorna **array de 24 objetos**, não `{ data: [...] }`. Itere diretamente sobre o array.

### Lista de espaços retorna array direto

`GET /spaces` retorna **array direto**, diferente de `/logs` e `/users` que retornam `{ data, pagination }`.

### `startTime`/`endTime`, não `timeSlot`

O sistema migrou de `timeSlot` (`morning`/`afternoon`/`evening`) para intervalos explícitos por hora. O campo `timeSlot` ainda existe nas reservas como legado derivado, mas ao **criar** reservas e bloqueios use sempre `startTime` e `endTime` no formato `HH:00`.

### Body vazio em PATCH

As rotas de ação (`/cancel`, `/remove`, `/read`, `/read-all`) não exigem body. Envie o PATCH sem body ou com `{}`.