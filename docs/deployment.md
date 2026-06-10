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

## Edge Functions (будущее)

```bash
supabase functions deploy --project-ref dlwpiikzuwpvbvnjupmn
```

Секреты edge functions:

```
supabase secrets set TELEGRAM_BOT_TOKEN=... --project-ref dlwpiikzuwpvbvnjupmn
```

## MCP (Cursor)

Файлы `.mcp.json` и `.cursor/mcp.json` подключают Supabase MCP, привязанный к проекту:

```
https://mcp.supabase.com/mcp?project_ref=dlwpiikzuwpvbvnjupmn
```

### Авторизация MCP

При окне **Authorize Cursor** поле ORGANIZATION может быть предзаполнено личной org (`...@gmail.com's Org`). Это нормально — **откройте выпадающий список и выберите организацию «Эйч»** вручную, затем нажмите Authorize.

Альтернатива: в [Supabase Dashboard](https://supabase.com/dashboard/project/dlwpiikzuwpvbvnjupmn) (организация Эйч) → Connect → MCP — скопировать готовый URL оттуда.
