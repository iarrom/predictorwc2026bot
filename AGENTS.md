# AGENTS.md — WC 2026 Predictor

## Стек

Next.js 16 + TypeScript + Tailwind + shadcn/ui + Supabase + Telegram Mini App

## Структура (FSD)

```
src/
  app/           # Next.js App Router (pages, layouts)
  features/      # auth, matches, predictions, admin
  entities/      # match, prediction, leaderboard
  shared/        # lib, ui, types
  components/ui/ # shadcn components
```

## Команды

```bash
pnpm dev              # dev server via portless → http://wcbot.localhost:1355
pnpm dev:plain        # next dev без portless
pnpm proxy:start      # portless proxy :1355
pnpm build            # production build
pnpm lint             # eslint
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest
pnpm import:schedule  # OpenFootball fixtures
pnpm import:squads    # Wikipedia squads
```

## Конвенции

- Пакетный менеджер: **pnpm**
- Алиас импортов: `@/*` → `src/*`
- Server actions для мутаций и Telegram auth
- RLS в Supabase — основной механизм авторизации
- Роли: `guest` → `participant` (админ) → `admin`
- Bot token и service role key — только server-side

## Supabase

- Организация: **Эйч**
- Project ref: `dlwpiikzuwpvbvnjupmn`
- Миграции: `supabase/migrations/`
- MCP: `.mcp.json` / `.cursor/mcp.json` → `https://mcp.supabase.com/mcp?project_ref=dlwpiikzuwpvbvnjupmn`
- При OAuth-авторизации MCP вручную выбрать организацию **Эйч** (не личную org по email)

## Документация

См. `docs/` для архитектуры, модели данных, ролей, auth и деплоя.
