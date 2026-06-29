# Система очков

## Правила начисления

Прогноз: выбор исхода (`home` / `draw` / `away`). За правильный прогноз начисляются очки в зависимости от раунда:

| `round_key` | Раунд | Очки |
|---|---|---|
| `group_1`, `group_2`, `group_3` | Групповой этап | 1 |
| `round_of_32` | 1/16 финала | 2 |
| `round_of_16` | 1/8 финала | 3 |
| `quarter_final` | 1/4 финала | 4 |
| `semi_final` | 1/2 финала | 5 |
| `final` | Финал | 6 |
| `third_place` | Матч за 3-е место | 0 |

Для плей-офф при наличии `winner` в матче исход определяется по прошедшей команде (учёт пенальти), а не по счёту основного времени.

## Хранение

- Очки хранятся в `predictions.points_awarded` после завершения матча
- Начисление выполняется в edge function `sync-live-matches` при `status = finished`
- Ручной пересчёт: `pnpm award:points`

## Реализация

- `pointsForRound()` / `scorePrediction()` — [`src/entities/prediction/lib/scoring.ts`](../src/entities/prediction/lib/scoring.ts)
- Лидерборд считает очки через `scorePrediction` на лету (с расшифровкой прогнозов)
- Tie-breaker: поле `tiebreaker_value` в `predictions` / таблица `tiebreakers`
