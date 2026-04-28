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
7. [Rotas — Auth](#7-auth)
   - `POST /auth/login`
   - `POST /auth/refresh`
   - `POST /auth/logout`
   - `GET /auth/invitations/:token`
   - `POST /auth/invitations/:token/accept`
8. [Rotas — Usuários](#8-usuários)
9. [Rotas — Espaços](#9-espaços)
10. [Rotas — Equipamentos](#10-equipamentos)
11. [Rotas — Reservas](#11-reservas)
    - `GET /reservations/mine`
    - `GET /reservations/space/:spaceId`
    - `POST /reservations`
    - `POST /reservations/recurring`
    - `PATCH /reservations/:id/cancel`
    - `PATCH /reservations/series/:recurrenceId/cancel`
12. [Rotas — Bloqueios](#12-bloqueios)
13. [Rotas — Notificações](#13-notificações)
14. [Rotas — Stats](#14-stats)
15. [Rotas — Logs de Auditoria](#15-logs-de-auditoria)
16. [Regras de Negócio Críticas](#16-regras-de-negócio-críticas)
17. [UUIDs de Seed (Dev)](#17-uuids-de-seed-dev)
18. [Armadilhas Comuns](#18-armadilhas-comuns)

---

## 1. Configuração Base

| Ambiente              | Base URL                              |
|-----------------------|---------------------------------------|
| Desenvolvimento local | `http://localhost:8787`               |
| Prototype (Workers)   | `https://ufcim.<account>.workers.dev` |

Rotas de dados usam o prefixo `/api/v1`. Rotas de autenticação usam `/auth` (sem `/api/v1`).

| Tipo de rota                    | Prefixo       |
|---------------------------------|---------------|
| Auth (login, refresh, convites) | `/auth/...`   |
| API de dados                    | `/api/v1/...` |
| Painel admin (HTMX)             | `/admin/...`  |

---

## 2. Autenticação

### Rotas protegidas (`/api/v1/...`)

Envie o access token em todas as chamadas:

```http
Authorization: Bearer <accessToken>
```

### Tokens

O `accessToken` é um JWT de curta duração (15 min). O `refreshToken` é um token opaco de longa duração (7 dias), armazenado no cliente e usado para renovar o access token sem relogin.

**Fluxo normal:**

1. `POST /auth/login` → recebe `{ accessToken, refreshToken, user }`
2. Guarda ambos no cliente (ex: localStorage ou memória)
3. Envia `Authorization: Bearer <accessToken>` em cada chamada
4. Ao receber `401`, chama `POST /auth/refresh` com o `refreshToken` para obter um novo par
5. `POST /auth/logout` invalida o `refreshToken` no servidor

### Rate limits

| Rota                                     | Limite                    |
|------------------------------------------|---------------------------|
| `POST /auth/login`                       | 10 tentativas / 60s por IP |
| `POST /auth/refresh`                     | 30 tentativas / 60s por IP |
| `POST /auth/invitations/:token/accept`   | 20 tentativas / 60s por IP |

Ao exceder o limite, a API retorna `429` com header `Retry-After: <segundos>` e body:

```json
{ "error": "Muitas tentativas. Aguarde um momento e tente novamente.", "code": "RATE_LIMITED" }
```

---

## 3. Códigos de Status HTTP

| Código | Quando ocorre |
|--------|---------------|
| `200`  | Sucesso em GET e PATCH |
| `201`  | Recurso criado (POST) |
| `400`  | Erro de validação ou regra de negócio violada |
| `401`  | Credenciais inválidas, JWT ausente/expirado, ou conta bloqueada |
| `403`  | Papel sem permissão para a ação |
| `404`  | Recurso não encontrado |
| `409`  | Conflito (slot ocupado, bloqueio duplicado, convite já aceito) |
| `429`  | Rate limit excedido |
| `500`  | Erro interno |

> ⚠️ **A API nunca retorna 204.** Se você está recebendo 204, é sinal de que a rota está errada (path incorreto, método errado, ou ausência do prefixo correto).

---

## 4. Formato Padrão de Resposta

### Sucesso — objeto único

```json
{ "id": "uuid", "campo": "valor" }
```

### Sucesso — lista paginada

```json
{
  "data": [ { "id": "...", "...": "..." } ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 85,
    "totalPages": 5
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

Códigos de máquina comuns: `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `FORBIDDEN`, `UNAUTHORIZED`, `ALREADY_CANCELED`, `RATE_LIMITED`, `RESERVATION_LIMIT`.

---

## 5. Enums e Tipos

### Papel de usuário (`role`)

`student` | `professor` | `staff` | `maintenance`

### Tipo de espaço (`type`)

`classroom` | `study_room` | `meeting_room` | `hall` | `other`

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

### Política de senha (convites e bootstrap)

- Mínimo 10 caracteres
- Pelo menos uma letra
- Pelo menos um número

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

## 7. Auth

> Estas rotas ficam em `/auth/...` — **sem** o prefixo `/api/v1`.

---

### `POST /auth/login`

Autentica com e-mail e senha. O e-mail é normalizado para minúsculas antes da comparação.

**Body:**

```json
{
  "email": "joao.silva@alu.ufc.br",
  "password": "minhasenha123"
}
```

**Response 200:**

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "a1b2c3...",
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao.silva@alu.ufc.br",
    "registration": "2023001001",
    "role": "student",
    "department": "Ciência da Computação",
    "isMasterAdmin": false
  }
}
```

**Erros possíveis:**

- `401` — credenciais inválidas
- `401` — conta desativada (`"Conta desativada"`)
- `401` — conta temporariamente bloqueada após 5 tentativas erradas (bloqueio de 15 min)
- `429` — rate limit excedido

---

### `POST /auth/refresh`

Renova o par de tokens sem relogin. O token antigo é invalidado (rotação de refresh token).

**Body:**

```json
{ "refreshToken": "a1b2c3..." }
```

**Response 200:**

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "d4e5f6..."
}
```

> ⚠️ O `refreshToken` anterior é invalidado após o refresh. Sempre substitua o token armazenado pelo novo.

**Erros possíveis:**

- `401` — token desconhecido ou expirado
- `401` — token já utilizado (indica possível roubo; a cadeia inteira é revogada)
- `429` — rate limit excedido

---

### `POST /auth/logout`

Invalida o refresh token no servidor.

**Body:**

```json
{ "refreshToken": "a1b2c3..." }
```

**Response 200:**

```json
{ "ok": true }
```

> Idempotente: chamar com um token já revogado retorna `200` sem erro.

---

### `GET /auth/invitations/:token`

Prévia de um convite antes de aceitar. Use para pré-preencher o formulário de cadastro.

**Params:** `:token` — o token opaco da URL de convite.

**Response 200:**

```json
{
  "email": "novo@ufc.br",
  "name": "Ana Lima",
  "role": "professor",
  "department": "Ciência da Computação",
  "inviterName": "Carlos Oliveira",
  "expiresAt": "2026-05-01T00:00:00.000Z",
  "valid": true
}
```

> Se o token não existir, estiver expirado, já aceito ou revogado, retorna `valid: false` com os demais campos vazios — nunca retorna `404`. Verifique `valid` antes de exibir o formulário.

---

### `POST /auth/invitations/:token/accept`

Aceita o convite e cria a conta. Retorna tokens prontos para uso (o usuário já fica logado).

**Body:**

```json
{ "password": "minhasenha123" }
```

A senha deve seguir a política: mínimo 10 caracteres, pelo menos uma letra e um número.

**Response 201:**

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "a1b2c3...",
  "user": {
    "id": "uuid",
    "name": "Ana Lima",
    "email": "novo@ufc.br",
    "registration": null,
    "role": "professor",
    "department": "Ciência da Computação",
    "isMasterAdmin": false
  }
}
```

**Erros possíveis:**

- `400` — senha fraca (não atende à política)
- `401` — convite inválido ou expirado
- `429` — rate limit excedido

---

## 8. Usuários

### `GET /api/v1/users/me`

**Roles:** qualquer autenticado

Retorna o perfil do usuário atual sincronizado no banco, incluindo contagem de notificações não lidas.

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

> `unreadCount` — quantidade de notificações não lidas. Use para o badge do header sem chamada extra à API.

---

### `GET /api/v1/users`

**Roles:** `staff`

Lista todos os usuários com paginação.

**Query params:**

| Param   | Tipo   | Padrão | Descrição                    |
|---------|--------|--------|------------------------------|
| `page`  | number | `1`    | Página                       |
| `limit` | number | `20`   | Itens por página (máx 100)   |

**Response 200:**

```json
{
  "data": [ { "id": "...", "name": "...", "role": "student", "...": "..." } ],
  "pagination": { "page": 1, "limit": 20, "total": 4, "totalPages": 1 }
}
```

---

### `GET /api/v1/users/:userId/managed-spaces`

**Roles:** qualquer autenticado

Lista os espaços que um usuário gerencia (como `coordinator` ou `manager`).

**Response 200:** array de objetos `{ spaceId, role, space: { id, number, name, ... } }`.

---

## 9. Espaços

### `GET /api/v1/spaces`

**Roles:** qualquer autenticado

Lista espaços com filtros opcionais.

**Query params:**

| Param        | Tipo                                                            | Descrição             |
|--------------|-----------------------------------------------------------------|-----------------------|
| `campus`     | string                                                          | Filtra por campus     |
| `block`      | string                                                          | Filtra por bloco      |
| `department` | string                                                          | Filtra por departamento |
| `type`       | `classroom` \| `study_room` \| `meeting_room` \| `hall` \| `other` | Filtra por tipo  |
| `page`       | number                                                          | Padrão `1`            |
| `limit`      | number                                                          | Padrão `20`, máx `100` |

**Response 200 — array direto** (não envelope `{ data, pagination }`):

```json
[
  {
    "id": "uuid",
    "number": "B1-01",
    "name": "Sala 01 — Bloco 1",
    "type": "classroom",
    "block": "B1",
    "campus": "Benfica",
    "department": "IAUD",
    "capacity": 40,
    "furniture": "Mesas e cadeiras para 40 pessoas",
    "lighting": "Fluorescente",
    "hvac": "Ar condicionado split 18000 BTU",
    "multimedia": "Projetor + tela retrátil",
    "reservable": true,
    "closedFrom": "22:00",
    "closedTo": "07:00",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
]
```

> ⚠️ Retorna **array direto**, não `{ data, pagination }`.

---

### `GET /api/v1/spaces/:id`

**Roles:** qualquer autenticado

Retorna espaço com seus equipamentos embutidos.

**Response 200:**

```json
{
  "id": "uuid",
  "number": "B1-01",
  "name": "Sala 01 — Bloco 1",
  "type": "classroom",
  "block": "B1",
  "campus": "Benfica",
  "department": "IAUD",
  "capacity": 40,
  "furniture": "...",
  "lighting": "...",
  "hvac": "...",
  "multimedia": "...",
  "reservable": true,
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
      "updatedAt": "..."
    }
  ]
}
```

---

### `GET /api/v1/spaces/:id/availability`

**Roles:** qualquer autenticado

Retorna disponibilidade **hora a hora** (24 slots) para uma data específica.

**Query params obrigatórios:**

| Param  | Formato      | Exemplo      |
|--------|--------------|--------------|
| `date` | `YYYY-MM-DD` | `2026-06-10` |

**Response 200 — array de 24 objetos:**

```json
[
  { "startTime": "00:00", "endTime": "01:00", "status": "closed" },
  { "startTime": "07:00", "endTime": "08:00", "status": "available" },
  { "startTime": "08:00", "endTime": "09:00", "status": "blocked" },
  { "startTime": "09:00", "endTime": "10:00", "status": "reserved" },
  { "startTime": "14:00", "endTime": "15:00", "status": "available" },
  { "startTime": "22:00", "endTime": "23:00", "status": "closed" }
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
  "number": "B1-10",
  "name": "Sala 10 — Bloco 1",
  "type": "classroom",
  "block": "B1",
  "campus": "Benfica",
  "department": "IAUD",
  "capacity": 30,
  "furniture": "Mesas e cadeiras",
  "lighting": "LED",
  "hvac": "Ar condicionado split",
  "multimedia": "Projetor",
  "reservable": true,
  "closedFrom": "22:00",
  "closedTo": "07:00"
}
```

`furniture`, `lighting`, `hvac`, `multimedia` são opcionais. `closedFrom`/`closedTo` têm padrão `"22:00"`/`"07:00"`. `reservable` tem padrão `true`.

**Response 201:** objeto do espaço criado.

---

### `PUT /api/v1/spaces/:id`

**Roles:** `staff`

Atualização parcial — todos os campos são opcionais. Mesmo body do POST.

**Response 200:** objeto do espaço atualizado.

---

## 10. Equipamentos

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

## 11. Reservas

### `GET /api/v1/reservations/mine`

**Roles:** qualquer autenticado

Lista as reservas do usuário autenticado, da mais recente para a mais antiga.

**Query params:**

| Param   | Tipo   | Padrão |
|---------|--------|--------|
| `page`  | number | `1`    |
| `limit` | number | `20`   |

**Response 200:**

```json
[
  {
    "id": "uuid",
    "spaceId": "uuid",
    "userId": "uuid",
    "date": "2026-06-10",
    "timeSlot": "afternoon",
    "startTime": "14:00",
    "endTime": "15:00",
    "status": "confirmed",
    "purpose": "class",
    "cancelReason": null,
    "changeOrigin": null,
    "recurrenceId": "uuid-ou-null",
    "createdAt": "...",
    "updatedAt": "...",
    "space": { "id": "...", "number": "B1-01", "name": "Sala 01 — Bloco 1", "...": "..." }
  }
]
```

> `recurrenceId` — presente quando a reserva faz parte de uma série recorrente. Use para agrupar ou para cancelar a série inteira via `PATCH /reservations/series/:recurrenceId/cancel`.

---

### `GET /api/v1/reservations/space/:spaceId`

**Roles:** qualquer autenticado

Lista reservas confirmadas de um espaço.

**Query params:**

| Param  | Tipo         | Descrição                      |
|--------|--------------|--------------------------------|
| `date` | `YYYY-MM-DD` | Opcional — filtra por data exata |

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

`date` não pode ser no passado. `startTime`/`endTime` devem ser horas cheias (`HH:00`). `purpose` é opcional (máx. 100 chars). Valores sugeridos: `class`, `group_study`, `meeting`, `event`, `other`.

**Limites de reservas ativas simultâneas por papel:**

| Papel         | Limite           |
|---------------|------------------|
| `student`     | 5                |
| `professor`   | 10               |
| `staff`       | ilimitado        |
| `maintenance` | não pode reservar |

> Reservas passadas não contam para o limite — apenas reservas com `date >= hoje` e `status = confirmed`.

**Erros possíveis:**

- `400` — horário no período fechado do espaço
- `400` com code `RESERVATION_LIMIT` — limite de reservas ativas atingido
- `403` — `maintenance` não pode criar reservas
- `409` — conflito com reserva ou bloqueio existente

**Response 201:** objeto da reserva criada.

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

`dayOfWeek`: `0` = domingo, `1` = segunda … `6` = sábado. `startDate` deve ser anterior a `endDate`. `purpose` é opcional.

**Response 201:**

```json
{
  "recurrenceId": "uuid",
  "created": [
    { "id": "...", "date": "2026-06-03", "startTime": "14:00", "endTime": "15:00", "status": "confirmed", "...": "..." }
  ],
  "skipped": ["2026-06-10"]
}
```

`skipped` lista as datas que foram puladas por conflito com reservas ou bloqueios existentes.

---

### `PATCH /api/v1/reservations/:id/cancel`

**Roles:** `student`, `professor`, `staff`

Cancela uma reserva individual.

**Body:** opcional

```json
{ "cancelReason": "Aula desmarcada" }
```

**Regras:**

- `student` só pode cancelar **suas próprias** reservas.
- `professor` e `staff` podem cancelar reservas de terceiros.
- `maintenance` não pode cancelar reservas.
- Reserva já cancelada retorna `400` com code `ALREADY_CANCELED`.

**Response 200:** objeto da reserva com `status: "canceled"`.

---

### `PATCH /api/v1/reservations/series/:recurrenceId/cancel`

**Roles:** `professor`, `staff`

Cancela todas as ocorrências **futuras** (data >= hoje) de uma série recorrente de uma só vez. Ocorrências passadas não são afetadas.

**Params:** `:recurrenceId` — o `recurrenceId` presente nas reservas da série.

**Body:** opcional

```json
{ "cancelReason": "Disciplina encerrada" }
```

**Response 200:** array com as reservas que foram canceladas.

**Erros possíveis:**

- `400` com code `ALREADY_CANCELED` — todas as ocorrências futuras já estão canceladas ou já passaram
- `403` — `student` ou `maintenance` não podem usar esta rota
- `404` — `recurrenceId` não encontrado

---

## 12. Bloqueios

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
    "timeSlot": "morning",
    "startTime": "10:00",
    "endTime": "12:00",
    "reason": "Reunião do Conselho",
    "blockType": "administrative",
    "status": "active",
    "createdAt": "...",
    "updatedAt": "...",
    "space": {
      "id": "uuid",
      "number": "B1-01",
      "name": "Sala 01 — Bloco 1",
      "block": "B1",
      "campus": "Benfica"
    }
  }
]
```

> Retorna apenas bloqueios com `status = 'active'`. `student` recebe `403`.

---

### `GET /api/v1/blockings/space/:spaceId`

**Roles:** qualquer autenticado

Lista bloqueios **ativos** de um espaço.

**Query params:**

| Param  | Tipo         | Descrição |
|--------|--------------|-----------|
| `date` | `YYYY-MM-DD` | Opcional  |

**Response 200:** array de bloqueios ativos.

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

## 13. Notificações

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
    "message": "Sua reserva para B1-01 em 2026-06-15 foi cancelada devido a um bloqueio administrativo.",
    "type": "canceled",
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

> ⚠️ Monte a URL como `/notifications/read-all`, não `/notifications/:id/read` com `id = "read-all"`.

---

## 14. Stats

### `GET /api/v1/stats`

**Roles:** qualquer autenticado

Retorna contagens do dashboard para o dia atual ou data informada.

**Query params:**

| Param  | Tipo         | Descrição              |
|--------|--------------|------------------------|
| `date` | `YYYY-MM-DD` | Opcional. Padrão: hoje |

**Response 200:**

```json
{
  "totalSpaces": 23,
  "activeReservationsToday": 8,
  "activeBlockings": 2,
  "totalUsers": 47
}
```

---

## 15. Logs de Auditoria

### `GET /api/v1/logs`

**Roles:** `staff`

Lista o log de auditoria (append-only, imutável).

**Query params:**

| Param           | Tipo          | Descrição                                                          |
|-----------------|---------------|--------------------------------------------------------------------|
| `userId`        | string (UUID) | Filtra por usuário                                                 |
| `actionType`    | string        | Ex: `create_space`, `cancel_reservation`                           |
| `referenceType` | string        | `space`, `reservation`, `blocking`, `equipment`, `invitation`, `user` |
| `dateFrom`      | `YYYY-MM-DD`  | Início do intervalo                                                |
| `dateTo`        | `YYYY-MM-DD`  | Fim do intervalo                                                   |
| `page`          | number        | Padrão `1`                                                         |
| `limit`         | number        | Padrão `20`                                                        |

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "actionType": "cancel_recurring_reservation",
      "referenceId": "uuid",
      "referenceType": "reservation",
      "details": "Cancelou a série recorrente Aula de POO (8 reservas)",
      "createdAt": "..."
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

---

## 16. Regras de Negócio Críticas

| Regra                       | Detalhe |
|-----------------------------|---------|
| Limites de reserva por papel | `student`: 5, `professor`: 10, `staff`: ilimitado, `maintenance`: proibido |
| Contagem de limite          | Apenas reservas com `date >= hoje` e `status = confirmed` contam — reservas passadas não bloqueiam novas |
| Horário fechado             | Reservas e bloqueios não podem sobrepor `closedFrom`/`closedTo` do espaço |
| Bloqueio cancela reservas   | Criar um bloqueio cancela automaticamente reservas conflitantes e notifica os usuários |
| Cancelamento em série       | `PATCH /series/:recurrenceId/cancel` só cancela ocorrências futuras; as passadas ficam intactas |
| Disponibilidade calculada   | Não existe campo `status` em espaços — status é sempre calculado consultando reservas e bloqueios |
| Soft delete                 | Reservas canceladas e bloqueios removidos nunca são apagados — apenas mudam de status |
| Cancelamento por estudante  | Estudante só pode cancelar suas próprias reservas individuais; não pode cancelar séries |
| `maintenance`               | Não pode criar ou cancelar reservas; pode criar e remover bloqueios |
| Token refresh               | O `refreshToken` é rotacionado a cada uso — salve sempre o novo token retornado |

---

## 17. UUIDs de Seed (Dev)

Use estes IDs em chamadas de teste sem precisar consultar o banco:

| Entidade                              | UUID                                   |
|---------------------------------------|----------------------------------------|
| Usuário: `student` (João Silva)       | `00000000-0000-0000-0000-000000000001` |
| Usuário: `professor` (Dra. Maria Costa) | `00000000-0000-0000-0000-000000000002` |
| Usuário: `staff` (Carlos Oliveira)    | `00000000-0000-0000-0000-000000000003` |
| Usuário: `maintenance` (Pedro Santos) | `00000000-0000-0000-0000-000000000004` |
| Espaço: Sala A101 (classroom, Pici)   | `00000000-0000-0000-0000-000000000011` |
| Espaço: Sala B205 (study_room, Pici)  | `00000000-0000-0000-0000-000000000012` |
| Espaço: Sala C301 (meeting_room, Pici) | `00000000-0000-0000-0000-000000000013` |
| Equipamento: Projetor Epson           | `00000000-0000-0000-0000-000000000021` |
| Equipamento: Ar condicionado          | `00000000-0000-0000-0000-000000000022` |
| Recorrência: Aula semanal             | `00000000-0000-0000-0000-000000000051` |
| Reserva: hoje (confirmed)             | `00000000-0000-0000-0000-000000000061` |
| Reserva: recorrente 1                 | `00000000-0000-0000-0000-000000000062` |
| Reserva: recorrente 2                 | `00000000-0000-0000-0000-000000000063` |
| Reserva: cancelada                    | `00000000-0000-0000-0000-000000000064` |
| Bloqueio: ativo 1                     | `00000000-0000-0000-0000-000000000071` |
| Bloqueio: ativo 2                     | `00000000-0000-0000-0000-000000000072` |
| Bloqueio: removido                    | `00000000-0000-0000-0000-000000000073` |

Para gerar tokens JWT de teste: `node scripts/generate-test-token.mjs [role]`

---

## 18. Armadilhas Comuns

### Erro 204 / resposta vazia

A API **nunca** retorna 204. Se você receber 204 ou body vazio inesperado, verifique:

1. **Prefixo errado** — rotas de dados exigem `/api/v1/...`. Rotas de auth ficam em `/auth/...` (sem `/api/v1`). Chamadas sem o prefixo correto retornam 404 ou HTML do shell admin.
2. **Método errado** — ex: `GET /reservations/:id/cancel` em vez de `PATCH`.
3. **`Content-Type` ausente em POST/PATCH com body** — envie sempre `Content-Type: application/json`. Sem ele o parser retorna `400`.
4. **Token expirado** — o access token dura 15 minutos. Ao receber `401`, faça refresh via `POST /auth/refresh` antes de repetir a chamada.

### `GET /spaces` e `GET /spaces/:id/availability` retornam array direto

Essas duas rotas retornam **array**, não `{ data, pagination }`. Itere diretamente. As demais rotas paginadas usam o envelope padrão.

### `startTime`/`endTime`, não `timeSlot`

O campo `timeSlot` (`morning`/`afternoon`/`evening`) ainda existe nas respostas como legado, mas ao **criar** reservas e bloqueios use sempre `startTime` e `endTime` no formato `HH:00`.

### `recurrenceId` para cancelamento em série

Para cancelar uma série de uma vez, use o `recurrenceId` que aparece em cada reserva pertencente à série, não o `id` da reserva individual. Endpoint: `PATCH /api/v1/reservations/series/:recurrenceId/cancel`.

### Refresh token é de uso único

Cada chamada a `POST /auth/refresh` invalida o token anterior e emite um novo. Se duas abas tentarem fazer refresh simultaneamente, a segunda receberá `401`. Implemente um mecanismo de fila/deduplicação no cliente se necessário.

### Body vazio em PATCH de ação

As rotas de ação (`/cancel`, `/remove`, `/read`, `/read-all`) não exigem body. Envie o PATCH sem body ou com `{}`. `cancelReason` é opcional e pode ser omitido.
