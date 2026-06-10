# Система очков

> **Статус: TBD** — логика будет уточнена позже.

## Что уже определено

- Прогноз: выбор исхода (`home` / `draw` / `away`)
- Tie-breaker: поле `tiebreaker_value` в `predictions` (формат уточняется)
- Очки хранятся в `predictions.points_awarded` после завершения матча

## Заготовка в схеме

```sql
outcome text check (outcome in ('home', 'draw', 'away')),
tiebreaker_value int,
points_awarded int
```

## Следующие шаги

1. Уточнить правила начисления очков
2. Реализовать `calculatePredictionPoints()` в `src/entities/prediction/lib/`
3. Добавить Edge Function или cron для пересчёта после ввода результатов
4. Обновить UI лидерборда
