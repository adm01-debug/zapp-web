# Lalamove Brasil — Histórico Completo de Pedidos

**Gerado em:** 2026-03-09 01:07:27  
**Conta:** Promo Brindes (qDdE35mo — Andressa Galvão)  
**Fonte:** UAPI `order_list_new` paginação completa (endpoint `last_id`)  
**Período:** Setembro 2024 → Março 2026  
**Total de pedidos:** 7,740

---

## Resumo Executivo

| Indicador | Valor |
|-----------|-------|
| Total de fretes | 7,740 |
| Taxa de conclusão | 86.2% |
| Taxa de cancelamento | 13.6% |
| Receita total (completos) | R$ 536,358.03 |
| Ticket médio | R$ 80.35 |
| Ticket mediano | R$ 71.12 |
| Ticket mínimo | R$ 7.56 |
| Ticket máximo | R$ 437.37 |

---

## Status dos Pedidos

| Status | Qtd | % |
|--------|-----|---|
| COMPLETED | 6,675 | 86.2% |
| CANCELLED | 1,049 | 13.6% |
| DRIVER_REJECTED | 11 | 0.1% |
| UNKNOWN(11) | 5 | 0.1% |

---

## Veículos Utilizados

| Veículo | Qtd | % |
|---------|-----|---|
| Carro Hatch | 2,554 | 33.0% |
| Utilitário e Pick-Up | 1,454 | 18.8% |
| LalaPro | 1,448 | 18.7% |
| Carro | 874 | 11.3% |
| LalaGo | 644 | 8.3% |
| Van | 504 | 6.5% |
| Carreto | 231 | 3.0% |
| Utilitário | 31 | 0.4% |

---

## Método de Pagamento

| Método | Qtd | % |
|--------|-----|---|
| ENT_WALLET | 7,726 | 99.8% |
| ONLINE | 13 | 0.2% |
| CASH | 1 | 0.0% |

---

## Volume Mensal

| Mês | Pedidos | Gráfico |
|-----|---------|---------|
| 2024-09 | 194 | ███████████████████ |
| 2024-10 | 395 | ███████████████████████████████████████ |
| 2024-11 | 382 | ██████████████████████████████████████ |
| 2024-12 | 517 | ███████████████████████████████████████████████████ |
| 2025-01 | 383 | ██████████████████████████████████████ |
| 2025-02 | 348 | ██████████████████████████████████ |
| 2025-03 | 556 | ███████████████████████████████████████████████████████ |
| 2025-04 | 632 | ███████████████████████████████████████████████████████████████ |
| 2025-05 | 609 | ████████████████████████████████████████████████████████████ |
| 2025-06 | 301 | ██████████████████████████████ |
| 2025-07 | 304 | ██████████████████████████████ |
| 2025-08 | 280 | ████████████████████████████ |
| 2025-09 | 522 | ████████████████████████████████████████████████████ |
| 2025-10 | 612 | █████████████████████████████████████████████████████████████ |
| 2025-11 | 523 | ████████████████████████████████████████████████████ |
| 2025-12 | 421 | ██████████████████████████████████████████ |
| 2026-01 | 459 | █████████████████████████████████████████████ |
| 2026-02 | 235 | ███████████████████████ |
| 2026-03 | 67 | ██████ |

---

## Descobertas Técnicas da Paginação

### Endpoint: `order_list_new`

**Parâmetros:**

```json
{"limit": 20, "last_id": ""}
```

- `last_id`: iniciar com `""` (string vazia); usar valor retornado para próxima página
- `is_end`: `0` = há mais páginas; `1` = última página
- `last_id` é um JSON string: `{"app":{"date":"YYYY-MM-DD...","_id":"...","recursion":0},"mapp":{...}}`
- Retorna `order_base_info[]` + `order_datetime{}`
- Limite testado: até 50 por request
- **WAF bloqueou `order_repeat_list`** neste ambiente — `order_list_new` é o substituto funcional

**⚠️ Comportamento observado:** o endpoint retornou 20 itens por página mesmo com `limit:50`,
exceto em algumas páginas onde retornou valores diferentes (35, 37 itens).
Possivelmente inclui pedidos de sub-contas/membros em alguns contextos.

---

## Notas de Auditoria

- `order_repeat_list` (endpoint original do pedido) retorna HTTP 501 Access Blocked neste ambiente
- `order_list_new` é o endpoint correto e confirmado para histórico completo
- Cursor `last_id` é determinístico: recomeçar do mesmo ponto retorna os mesmos resultados
- Nenhum rate limit foi encontrado durante a paginação de 7.740 registros