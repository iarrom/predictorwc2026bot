# Архитектура

## Обзор

```mermaid
flowchart TB
  subgraph client [Telegram Mini App]
    TWA[Telegram WebApp SDK]
    NextUI[Next.js UI]
  end

  subgraph vercel [Vercel]
    NextApp[Next.js App Router]
    ServerActions[Server Actions]
    Middleware[Auth Middleware]
  end

  subgraph supabase [Supabase]
    Auth[Supabase Auth]
    PG[(Postgres + RLS)]
    Edge[Edge Functions]
  end

  subgraph external [External]
    TG[Telegram Bot API]
    OF[OpenFootball JSON]
    Wiki[Wikipedia API]
  end

  TWA --> NextUI
  NextUI --> NextApp
  NextApp --> Middleware
  Middleware --> Auth
  ServerActions --> Auth
  ServerActions --> PG
  NextApp --> PG
  Edge --> TG
  Edge --> PG
```

## Слои приложения

| Слой | Назначение |
|------|------------|
| `app/` | Маршруты, layouts, страницы |
| `features/` | Бизнес-логика по фичам (auth, matches, admin) |
| `entities/` | Доменные типы и утилиты |
| `shared/` | Переиспользуемые UI, Supabase-клиенты, типы |
| `components/ui/` | shadcn/ui примитивы |

## Поток аутентификации

1. Пользователь открывает Mini App в Telegram
2. `Telegram.WebApp.initData` передаётся в server action
3. `@tma.js/init-data-node` валидирует подпись bot token
4. Server action создаёт/обновляет Supabase user и сессию
5. Middleware обновляет cookies на каждом запросе

## Edge Functions (зарезервировано)

- Уведомления через Telegram Bot API
- Пересчёт очков по расписанию (cron)
- Webhook-обработчики бота
