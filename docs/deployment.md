# Деплой

## Supabase

1. Создайте проект в [Supabase Dashboard](https://supabase.com/dashboard)
2. Скопируйте **project ref** и URL из Project Settings → General
3. Примените миграции из `supabase/migrations/`
4. Включите Email auth (для programmatic sign-in)

## Vercel

1. Импортировать репозиторий в Vercel
2. Framework: Next.js
3. Environment variables (Production + Preview):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_AUTH_PEPPER
MINI_APP_URL
PREDICTIONS_ENCRYPTION_KEY
```

4. Deploy → получить URL вида `https://your-app.vercel.app`

## Telegram BotFather

1. `/setmenubutton` или `/newapp` — указать Vercel URL как Mini App
2. Bot token хранить только в env vars (не в репозитории)

## Импорт данных (после деплоя)

Локально с service role key:

```bash
pnpm import:schedule
pnpm import:squads
```

## Edge Functions

Замените `<project-ref>` на ref вашего проекта из Dashboard.

### sync-schedule

Недеструктивное обновление расписания из OpenFootball: подставляет реальные команды в плей-офф по мере завершения раундов, не затирая `status` и счёт (pg_cron каждые 10 минут).

```bash
supabase functions deploy sync-schedule --project-ref <project-ref>
```

Vault secret:

- `sync_schedule_edge_url` = `https://<project-ref>.supabase.co/functions/v1/sync-schedule`
- `cron_secret` — тот же, что у `sync-live-matches`

Секрет edge function:

```bash
supabase secrets set CRON_SECRET=... --project-ref <project-ref>
```

Повторный ручной импорт (`pnpm import:schedule`) тоже безопасен во время турнира — не сбрасывает статус и счёт.

### sync-live-matches

Синхронизация live-данных с football-data.org (pg_cron каждые 20 секунд).

```bash
supabase functions deploy sync-live-matches --project-ref <project-ref>
```

Vault secrets (Dashboard → Project Settings → Vault):

- `sync_edge_url` = `https://<project-ref>.supabase.co/functions/v1/sync-live-matches`
- `cron_secret` = случайная строка (та же, что `CRON_SECRET` у функции)

### send-prediction-reminders

Telegram-напоминания за 6 часов до матча, если нет прогноза (pg_cron каждые 10 минут).

1. Применить миграцию `005_prediction_reminders.sql`
2. Задеплоить функцию:

```bash
supabase functions deploy send-prediction-reminders --project-ref <project-ref>
```

3. Секреты edge functions:

```bash
supabase secrets set \
  CRON_SECRET=... \
  TELEGRAM_BOT_TOKEN=... \
  MINI_APP_URL=https://your-app.vercel.app \
  --project-ref <project-ref>
```

4. Vault secret:

- `reminders_edge_url` = `https://<project-ref>.supabase.co/functions/v1/send-prediction-reminders`
- `cron_secret` — тот же, что у `sync-live-matches`

`MINI_APP_URL` — production URL Mini App (без trailing slash). Используется в inline-кнопке `web_app` → `/matches`.

## MCP (Cursor)

Скопируйте `.mcp.json.example` → `.mcp.json` и подставьте свой project ref.
Файлы `.mcp.json` и `.cursor/mcp.json` не коммитятся (см. `.gitignore`).

URL формата:

```
https://mcp.supabase.com/mcp?project_ref=<project-ref>
```

Скопировать готовый URL можно в Supabase Dashboard → Connect → MCP.
