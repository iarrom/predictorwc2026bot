# Модель данных

## ER-диаграмма

```mermaid
erDiagram
  auth_users ||--|| profiles : "1:1"
  teams ||--o{ players : has
  teams ||--o{ matches : home
  teams ||--o{ matches : away
  auth_users ||--o{ predictions : makes
  matches ||--o{ predictions : receives

  profiles {
    uuid id PK
    text display_name
    bigint telegram_id UK
    text photo_url
    text role
  }

  teams {
    uuid id PK
    text name UK
  }

  matches {
    uuid id PK
    text external_key UK
    text round_key
    timestamptz kickoff_at
    text home_team_name
    text away_team_name
    text status
    int home_score
    int away_score
  }

  players {
    uuid id PK
    uuid team_id FK
    text name
    text position
    int shirt_number
  }

  predictions {
    uuid id PK
    uuid user_id FK
    uuid match_id FK
    text outcome
    int tiebreaker_value
    int points_awarded
  }
```

## Таблицы

### profiles

Профиль пользователя, связанный с `auth.users`. Роль по умолчанию — `guest`.

### teams / matches / players

Данные ЧМ-2026: команды, расписание (OpenFootball), составы (Wikipedia).

### predictions

Прогноз участника на матч:

- `outcome`: `home` | `draw` | `away`
- `tiebreaker_value`: целое число (логика TBD)
- `points_awarded`: начисленные очки (заполняется после матча)

### leaderboard_base (view)

Агрегация: `total_points`, `predictions_count` для участников.

## Импорт данных

```bash
pnpm import:schedule  # → teams, matches
pnpm import:squads    # → players (требует teams)
```
