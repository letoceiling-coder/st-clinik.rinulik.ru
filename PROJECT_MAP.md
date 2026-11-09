# PROJECT_MAP — МирКлиник (mirklinik.ru)

Краткая карта для ИИ-агентов и разработчиков. Читать вместо повторного обхода кода. Обновлять при изменении структуры.

## Продукт
Каталог стоматологических клиник и врачей по России с онлайн-записью, ЛК клиник, админкой платформы и платными услугами продвижения. ТЗ (актуальное): `tz.md`. План работ: `docs/production-plan.md`. Сервер/деплой: `docs/server-and-deploy.md`.

## Стек
Laravel 13 (PHP ^8.3), Inertia 3 + React 19 + TypeScript 7, Vite 8 (SSR), ручной CSS (без Tailwind/ESLint), PHPUnit 12 (тесты на sqlite :memory:), Pint, Playwright (только вёрстка). Laravel Boost — MCP `.mcp.json`, skills `.claude/skills/`.

## Backend (`app/`)
- `Http/Controllers/` — публичные (`Catalog`, `Clinic`, `Doctor`, `Booking`, `Lead`, `Review`, `Offer`, `ClaimOffer`, `Search`, `Seo`), `Admin/` (админка), `Cabinet/` (ЛК клиники), `Account/` (ЛК пациента), `Auth/` (в т.ч. `RegisterClinicController`), `Api/` (AI-ассистент), `Max/` (бот и Mini App), `Webhooks/`, `PaymentWebhookController`.
- `Services/` — бизнес-логика: `ModerationService`, `ModerationQueue`, `ClinicModerationDossier`, `ContentModerationSettings`, `SensitiveTextGuard`, `AppointmentBookingService`, `SlotAvailabilityService`, `LeadService` + `Leads/`, `PromotionService`, `Monetization/`, `Payments/`, `YooKassaService`, `Parser/` (импорт организаций и прайсов из Яндекса), `Offers/` (коммерческие предложения), `Cabinet/`, `Clinics/`, `Organization/`, `Notifications/`, `Broadcasts/`, `Assistant/`, `Seo`, `SchemaOrg`.
- `Repositories/`, `Jobs/`, `Notifications/`, `Policies/` (одна), `Support/`.
- Валидация — inline `validate()` в контроллерах/сервисах, FormRequest не используются.
- Роуты: `routes/web.php` (~535 строк), `routes/api.php`.

## Ключевые модели и статусы
- `Organization` (active/blocked) → `Clinic` (филиалы): `draft, pending, approved, published, rejected, hidden, blocked`; публично видны только `published`.
- `OrganizationStaff`, `Role`, `StaffInvitation` — сотрудники клиники (владелец, администратор, менеджер, контент-менеджер — см. ТЗ §6).
- `ClinicService`/`Service`, `ClinicPhoto`, `ClinicDocument`, `Doctor`, `DoctorSchedule`, `ScheduleException`.
- `ClinicPost`: `draft, pending, published, hidden`. `Review`: `pending, published, rejected, hidden` (+ ответы клиники).
- `Lead`, `LeadDispatch`, `Appointment` (+ `AppointmentStatusChange`).
- Парсер: `ParserTask` → `ParsedOrganization` → импорт в `Organization/Clinic`; `Offer`/`OfferTemplate`/`OfferApplication` — КП клинике; `DemoLink` — демо-кабинет.
- Монетизация: `Tariff`, `ClinicSubscription`, `PromotionProduct/Package/Price/Order`, `ClinicPromotion`, `ClinicCardBonus`, `Payment`, `PaymentRefund`.
- `AuditLog`, `HistoryEntry`, `DuplicateFlag`, `StopListEntry`.

## Фронтенд (`resources/js`)
- `pages/` — `Home`, `Search`, `Clinics`, `Doctors`, `Booking`, `Offer`, `Admin/*` (~36 страниц), `Cabinet/*` (~22), `Account/*`, `Max/*`.
- `layouts/` — `PublicLayout`, `AdminLayout`, `CabinetLayout`, `AccountLayout`, `DashboardShell`, `MobileMenu`.
- `components/ui/` — базовые `Button`, `Fields`, `Overlay`, `FileDropzone`, `Misc`; доменные компоненты в `components/`.
- CSS: `resources/css/tokens.css` (токены — единственный источник цветов/отступов/радиусов), `base.css`, `components.css` (~2.2k строк), `layout.css` (~5.8k строк, главный кандидат на чистку дублей), `booking.css`, `offers.css`, `parser.css`, `clinic-card-premium-*.css`.

## Бизнес-правила (целевые, от заказчика 2026-11-09)
1. Клиника регистрирует ЛК самостоятельно → подтверждает аккаунт → только после подтверждения заполняет профиль.
2. Профиль клиники публикуется только после проверки админом или модератором.
3. **Любое** редактирование данных клиники в ЛК → модерация; до одобрения публично остаётся последняя одобренная версия.
3a. Исключение (решение заказчика): цены и график публикуются сразу, модератор проверяет их постфактум (`ContentRevision` mode=post).
4. Парсер собирает клиники → формирует КП → клиника забирает карточку (claim) → модерация → публикация.
   - Карточку без владельца (`Clinic::ownerless()`, статусы `Clinic::CLAIMABLE_STATUSES`, в т.ч. опубликованную) можно забрать по КП или заявкой «Это ваша клиника?» (`ClinicClaimRequest`): SMS-код на номер из карточки — сразу, иначе документ → модератор (тип `claim` в очереди).
   - Если у заявителя уже своя организация, карточка становится её филиалом. При создании филиала совпадение с карточкой без владельца → предложение забрать её (`OwnerlessClinicMatcher`).
   - Заявки пациентов в клиники без владельца получают операторы платформы (`admin.appointments`) → `/admin/leads/unclaimed`.
5. Клиники могут подключать платные услуги (тарифы, продвижение) через ЛК; оплата — YooKassa.
6. Ориентир по функционалу — аналогичные сервисы (ПроДокторов, СберЗдоровье/DocDoc, НаПоправку), итог — коммерческий продукт.
Расхождения текущего кода с этими правилами фиксируются в аудите (`laravel-auditor`) и решаются с заказчиком.

## Проверки
- PHP: `php artisan test --compact --filter=Класс` (полный набор ~5 мин, 263 теста). Pint — автоматически hook-ом.
- TS: `npx tsc --noEmit` (5 старых ошибок: `Dash.tsx`, `YandexMap.tsx`, `lib/web-push.ts`).
- Сборка: `npm run build` — только в конце этапа.
- Playwright: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8000 npx playwright test` — по умолчанию конфиг смотрит на прод!
- Локальный сервер: `.claude/launch.json` → `laravel` (127.0.0.1:8000).

## AI-инфраструктура
- Агенты (read-only, краткие отчёты): `design-auditor`, `laravel-auditor`, `qa-engineer` — `.claude/agents/`.
- Hooks: `.claude/settings.json` → `.claude/hooks/` (Pint на изменённый PHP; на Stop — tsc и связанные PHPUnit, один раз на набор изменений; отключить: `CLAUDE_SKIP_CHECKS=1`).
- Skill проекта: `medical-forms`. Перед релизом — встроенная команда `/security-review`.
