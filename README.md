# WC 2026 Predictor

Telegram Mini App для прогнозов на исходы матчей чемпионата мира 2026.

## Стек

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend:** Supabase (Postgres + Auth + RLS + Edge Functions)
- **Auth:** Telegram Mini App initData → Next.js server action → Supabase session
- **Deploy:** Vercel (бесплатный домен)

## Роли

| Роль | Описание |
|------|----------|
| `guest` | По умолчанию после входа. Может просматривать матчи и лидерборд |
| `participant` | Может делать прогнозы (назначается админом) |
| `admin` | Управление участниками, результатами матчей, импорт данных |

## Прогноз

- Выбор исхода: победа хозяев / ничья / победа гостей
- Tie-breaker (значение уточняется)
- Логика очков — TBD (см. [docs/scoring.md](docs/scoring.md))

## Быстрый старт

### 1. Supabase

1. Организация **Эйч**, проект: `dlwpiikzuwpvbvnjupmn`
2. Скопируйте `.env.example` → `.env.local` и заполните ключи
3. Примените миграцию `supabase/migrations/001_initial_schema.sql` через SQL Editor
4. Импортируйте расписание:

```bash
pnpm import:schedule
pnpm import:squads
```

### 2. Telegram Bot

1. [@BotFather](https://t.me/BotFather) → настройте Mini App URL (Vercel или tunnel)
2. Добавьте `TELEGRAM_BOT_TOKEN` и `TELEGRAM_AUTH_PEPPER` в `.env.local`

### 3. Первый админ

После первого входа через Telegram:

```sql
update public.profiles set role = 'admin' where telegram_id = YOUR_TELEGRAM_ID;
```

### 4. Запуск

```bash
pnpm install
pnpm setup:hosts      # один раз: sudo, добавляет 127.0.0.1 wcbot.localhost в /etc/hosts
pnpm setup:https      # один раз: доверить CA + HTTPS proxy на :1355
pnpm fix:cert         # если браузер ругается на сертификат — пересоздать TLS для wcbot
pnpm dev              # https://wcbot.localhost:1355
```

**Важно:** без записи в `/etc/hosts` браузер идёт по IPv6 (`::1`) и HTTPS не открывается. Команда `setup:hosts` исправляет это (как уже сделано для `fifawc.localhost`).

**Telegram Mini App (локально):** в BotFather укажите `https://wcbot.localhost:1355`.

Если proxy не запущен: `pnpm proxy:start:https`.

## Скрипты

| Команда | Описание |
|---------|----------|
| `pnpm dev` | Dev-сервер |
| `pnpm build` | Production build |
| `pnpm import:schedule` | Импорт расписания (OpenFootball) |
| `pnpm import:squads` | Импорт составов (Wikipedia) |
| `pnpm test` | Unit-тесты |

## Документация

- [Архитектура](docs/architecture.md)
- [Модель данных](docs/data-model.md)
- [Роли и RLS](docs/roles-and-rls.md)
- [Telegram Auth](docs/telegram-auth.md)
- [Очки](docs/scoring.md)
- [Деплой](docs/deployment.md)
