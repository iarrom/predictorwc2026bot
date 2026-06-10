# Роли и RLS

## Роли

| Роль | Права |
|------|-------|
| `guest` | Просмотр матчей, лидерборда, профилей. Без голосования |
| `participant` | Всё выше + создание/редактирование прогнозов до kickoff |
| `admin` | Всё выше + управление ролями, результатами матчей, игроками |

## Назначение ролей

- **guest** — автоматически при первом входе (триггер `handle_new_user`)
- **participant** — админ повышает гостя через админку (UI — в следующей фазе)
- **admin** — вручную через SQL при bootstrap:

```sql
update public.profiles set role = 'admin' where telegram_id = YOUR_ID;
```

## RLS-политики

### profiles

- `SELECT` — все authenticated
- `UPDATE` — свой профиль или админ (для смены ролей)

### matches / teams / players

- `SELECT` — все authenticated
- `UPDATE/INSERT/DELETE` (players) — только admin

### predictions

- `SELECT` — все authenticated
- `INSERT/UPDATE/DELETE` — только `is_participant()` и до `kickoff_at`

## Хелперы

```sql
public.is_admin()       -- role = 'admin'
public.is_participant() -- role IN ('participant', 'admin')
```

## TypeScript

```typescript
import { isAdmin, isParticipant, getCurrentUserRole } from "@/shared/lib/auth";
```
