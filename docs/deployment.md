# Деплой

## Supabase

- **Организация:** Эйч
- **Project ref:** `dlwpiikzuwpvbvnjupmn`
- **URL:** `https://dlwpiikzuwpvbvnjupmn.supabase.co`
- Применить миграции из `supabase/migrations/`
- Включить Email auth (для programmatic sign-in)

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
```

4. Deploy → получить URL вида `https://predictorwc2026bot.vercel.app`

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

### sync-live-matches

Синхронизация live-данных с football-data.org (pg_cron каждые 20 секунд).

```bash
supabase functions deploy sync-live-matches --project-ref dlwpiikzuwpvbvnjupmn
```

Vault secrets (Dashboard → Project Settings → Vault):

- `sync_edge_url` = `https://dlwpiikzuwpvbvnjupmn.supabase.co/functions/v1/sync-live-matches`
- `cron_secret` = случайная строка (та же, что `CRON_SECRET` у функции)

### send-prediction-reminders

Telegram-напоминания за 6 часов до матча, если нет прогноза (pg_cron каждые 10 минут).

1. Применить миграцию `005_prediction_reminders.sql`
2. Задеплоить функцию:

```bash
supabase functions deploy send-prediction-reminders --project-ref dlwpiikzuwpvbvnjupmn
```

3. Секреты edge functions:

```bash
supabase secrets set \
  CRON_SECRET=... \
  TELEGRAM_BOT_TOKEN=... \
  MINI_APP_URL=https://predictorwc2026bot.vercel.app \
  --project-ref dlwpiikzuwpvbvnjupmn
```

4. Vault secret:

- `reminders_edge_url` = `https://dlwpiikzuwpvbvnjupmn.supabase.co/functions/v1/send-prediction-reminders`
- `cron_secret` — тот же, что у `sync-live-matches`

`MINI_APP_URL` — production URL Mini App (без trailing slash). Используется в inline-кнопке `web_app` → `/matches`.

## MCP (Cursor)

Файлы `.mcp.json` и `.cursor/mcp.json` подключают Supabase MCP, привязанный к проекту:

```
https://mcp.supabase.com/mcp?project_ref=dlwpiikzuwpvbvnjupmn
```

### Авторизация MCP

При окне **Authorize Cursor** поле ORGANIZATION может быть предзаполнено личной org (`...@gmail.com's Org`). Это нормально — **откройте выпадающий список и выберите организацию «Эйч»** вручную, затем нажмите Authorize.

Альтернатива: в [Supabase Dashboard](https://supabase.com/dashboard/project/dlwpiikzuwpvbvnjupmn) (организация Эйч) → Connect → MCP — скопировать готовый URL оттуда.
