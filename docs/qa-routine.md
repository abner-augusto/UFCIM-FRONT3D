# Roteiro de QA manual — UFCIM-FRONT3D

Roteiro guiado para validar o fluxo completo por papel e caçar lacunas de UX/interface.
Ambiente: **dev local** (vite `5173` + wrangler `8787`, D1 semeado).
Usuários de teste: `aluno@teste.com`, `professor@teste.com`, `manutencao@teste.com`,
`funcionario@teste.com` / `senha123456`.

## Matriz de permissões (fonte: `src/utils/roles.ts`)

| Recurso | aluno (student) | professor | manutenção (maintenance) | staff | admin* |
|---|:--:|:--:|:--:|:--:|:--:|
| Reservar (`CAN_RESERVE`) | ✅ | ✅ | ❌ | ✅ | — |
| Reserva recorrente (`CAN_CREATE_RECURRING`) | ❌ | ✅ | ❌ | ✅ | — |
| Bloquear (`CAN_BLOCK`) | ❌ | ✅ | ✅ | ✅ | — |
| Chamados manutenção (`CAN_MANAGE_EQUIPMENT`) | ❌ | ❌ | ✅ | ✅ | — |
| Relatórios (`CAN_VIEW_REPORTS`) | ❌ | ✅ | ✅ | ✅ | — |
| Link Admin (`CAN_ADMIN`) | ❌ | ❌ | ❌ | ✅ | — |

\* Não há papel "admin" separado — `CAN_ADMIN` = `staff`.
O usuário `funcionario@teste.com` cobre `staff`/`CAN_ADMIN`.

## A. Cross-cutting (todos os papéis)

- [ ] Login válido → redireciona para `/campus`
- [ ] Login inválido → mensagem de erro clara
- [ ] Logout → volta para `/login`; rota protegida redireciona para login
- [ ] Header desktop (≥1024px): só mostra links permitidos ao papel
- [ ] Bottom bar (mobile) e drawer (tablet): mesmos links/permissões
- [ ] Seleção de campus; campi inativos desabilitados
- [ ] Viewer 3D: carrega, troca de prédio/andar, busca, clique no pin abre popup
- [ ] Filtro de data/turno reflete cores de disponibilidade dos pins
- [ ] Notificações: lista, marcar como lida, badge de não lidas
- [ ] Perfil: ver dados, editar
- [ ] Acesso direto por URL a rota sem permissão → redireciona a `/campus`

## B. aluno (student)
- [ ] Reservar a partir do popup (slot livre) → fluxo `/reserva` → confirmar
- [ ] NÃO vê opção de recorrência
- [ ] Espaços (`/espacos`): lista, filtros, busca, reservar pelo card
- [ ] Minhas Reservas: lista, detalhe, cancelar
- [ ] NÃO vê Bloqueios / Relatórios / Chamados

## C. professor
- [ ] Tudo de aluno +
- [ ] Reserva **recorrente** (descrição, intervalo, conflitos ignorados)
- [ ] Bloquear espaço (popup → `/bloquear`) → Meus Bloqueios → cancelar
- [ ] Relatórios: ocupação (gráfico diário, turnos, salas) + relatório por espaço
- [ ] NÃO vê Chamados de Manutenção

## D. manutenção (maintenance)
- [ ] **NÃO** consegue reservar (ação de reserva oculta/bloqueada no popup)
- [ ] Bloquear espaço (igual professor)
- [ ] Chamados de Manutenção: abas (Pendentes/Em análise/Resolvidos/Descartados)
- [ ] Card mostra localização completa (Sala · Bloco · Departamento)
- [ ] "Ver na maquete 3D" → foca o pin e abre o popup correto
- [ ] Ações: Marcar em análise / Resolver / Descartar (com motivo)
- [ ] Relatórios (tem `CAN_VIEW_REPORTS`)

## E. Negativos / UX
- [ ] aluno acessando `/relatorios`, `/manutencao/chamados`, `/meus-bloqueios` por URL → redireciona
- [ ] Estados vazios (sem reservas/chamados/notificações) têm mensagem amigável
- [ ] Estados de carregamento e erro de rede são comunicados
- [ ] Transição para o viewer (chunk pesado) tem feedback de carregamento
- [ ] Responsivo: nada quebra entre mobile / tablet / desktop

> Resultados e achados de cada rodada ficam registrados fora deste arquivo (relatório de QA).

## Rodadas recentes

- 2026-06-22 — BrowserOS MCP, MEL-009 Phase 7: `.claude/mel009-browseros-qa-2026-06-22.md`.
  - Bloqueia fechamento do MEL-009: aluno acessa `/espacos/:spaceId/relatorio` sem `CAN_VIEW_REPORTS`.
  - Follow-ups: CTA de reserva de período passado no `RoomPopup`, `RoomPopup` móvel como modal central em vez de drawer, confirmar `Escape` no drawer móvel.
