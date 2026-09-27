# DESIGN.md — MediQueue Design System ("Clinical Swiss")

Every page (marketing, auth, dashboards) follows this file. Read it before any UI work.
Reference implementations: the homepage (`components/home/`) and the login page (`app/(auth)/login`).

---

## 1. Direction

Information-architecture school (Vignelli / Swiss International). Calm, precise, institutional.
Trust comes from order: a strict grid, hairline rules, one accent, no decoration.
If a choice makes the UI look "friendly", "bubbly" or "fun", it is the wrong choice.

## 2. Color tokens

Defined in `app/globals.css` under `@theme`. Use the Tailwind classes, never raw hex or `gray-*` / `blue-*`.

| Token | Hex | Class examples | Use |
|---|---|---|---|
| `mq-ground` | `#FAFAF8` | `bg-mq-ground` | Page background |
| white | `#FFFFFF` | `bg-white` | Panels, tables, alternating sections |
| `mq-ink` | `#0B0F0E` | `text-mq-ink` `bg-mq-ink` `border-mq-ink` | Text, primary buttons, emphasis rules, dark CTA block |
| `mq-muted` | `#5B6361` | `text-mq-muted` | Body copy, secondary text |
| `mq-subtle` | `#8A918F` | `text-mq-subtle` | Labels, metadata, inactive states |
| `mq-line` | `#E3E5E3` | `border-mq-line` | All hairlines and dividers |
| `mq-accent` | `#0F5257` | `text-mq-accent` `bg-mq-accent` | The ONE accent: icons, active state, live indicator, primary hover |
| `mq-tint` | `#E8F0EF` | `bg-mq-tint` | Selected row, highlight, text selection |
| `mq-danger` | `#B42318` | `text-mq-danger` | Errors and "no show" only. Never decorative |

Rules: accent covers under 5% of any screen. No new hues. No gradients on backgrounds.
The only gradient allowed is the marketing hero heading text (`from-[#000000] to-[#666666]`).

## 3. Typography

- **IBM Plex Sans** (400 / 500 / 600) for everything. Loaded once in `app/layout.tsx`, exposed as `font-sans`.
- **IBM Plex Mono** (`font-mono`) only for data: token numbers (A-14), times, ETAs, table column headers.
- Never italic. Never above weight 600. Headings use `font-medium` (500), buttons `font-semibold` (600).
- Only Tailwind's type scale (`text-xs` … `text-7xl`). No arbitrary sizes like `text-[15px]`. No custom `leading-*`.
- Headings: `tracking-tight text-balance`. Body: `text-pretty`. Numbers in tables/prices: `tabular-nums`.
- Sentence case everywhere. No Title Case Headings.

| Role | Marketing | App (dashboards) |
|---|---|---|
| Page / hero title | `text-4xl sm:text-5xl lg:text-6xl` | `text-2xl md:text-3xl` |
| Section title | `text-3xl md:text-5xl` | `text-xl` |
| Card / panel title | `text-lg` / `text-xl` | `text-base font-medium` |
| Body | `text-base text-mq-muted` | `text-sm text-mq-muted` |
| Label / meta | `text-xs text-mq-subtle` | `text-xs text-mq-subtle` |
| Big stat / price | `text-5xl`–`text-7xl` | `text-3xl`–`text-5xl` |

## 4. Spacing and layout

- Allowed spacing only: `0 0.5 1 2 3 4 6 8 10 12 16 20 24` (2px … 96px). Nothing else (no `p-5`, `mt-14`, `py-32`).
- Container: `mx-auto max-w-[1200px] px-4 md:px-8` (use `<Container>`).
- 12-column grid (`md:grid-cols-12 md:gap-8`). Labels in the left 3 columns, content in the right 9.
- Marketing sections: `py-20 md:py-24`, separated by `border-t border-mq-line`, alternating `bg-mq-ground` / `bg-white`.
- App screens: denser. Page padding `p-6 md:p-8`, panel padding `p-4`–`p-6`, gaps `gap-4`–`gap-6`.
- Left-align text. Center only for rare ceremonial moments.

## 5. Shape, borders, depth

- **Radius: 0 everywhere.** No `rounded-*` (except true circles like avatars and status dots, which should be squares anyway).
- Borders: `border border-mq-line` for containers; `border-mq-ink` for emphasis (hero rule, table header, featured panel).
- **No shadows.** Depth comes from hairlines and `bg-white` on `bg-mq-ground`.
- Group with rows, tables and shared surfaces. Do not wrap every item in its own card.
- Grids of cells: `grid gap-px bg-mq-line border border-mq-line` with `bg-white` cells.
- Never a colored border on only one side of a card (no left/top accent stripes). Highlight = full `ring-1 ring-inset ring-mq-ink`.

## 6. Components

**Buttons** — `ButtonLink` for links, `buttonClasses(variant, size)` for `<button>` (`components/shared/primitives.tsx`).

| Variant | Classes |
|---|---|
| primary | `bg-mq-ink text-white hover:bg-mq-accent` |
| secondary | `border border-mq-ink text-mq-ink hover:bg-mq-ink hover:text-white` |
| inverse (on ink) | `bg-white text-mq-ink hover:bg-mq-tint` |
| inverseGhost (on ink) | `border border-white/30 text-white hover:border-white` |

Base: `px-3 py-2 font-semibold text-base` (header/app: `text-sm`), square, `active:translate-y-px`,
focus `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mq-accent`.
Disabled: `disabled:opacity-40 disabled:pointer-events-none`. Loading: keep width, swap label for "Saving…".

**Text links** — `text-mq-ink underline decoration-mq-line underline-offset-4 hover:decoration-mq-ink`.

**Inputs** — square, `h-10 border border-mq-line bg-white px-3 text-sm text-mq-ink`,
`focus:border-mq-ink focus:outline-none`. Label above: `text-sm text-mq-ink`, `mt-2` gap.
Error: `border-mq-danger` + inline `text-sm text-mq-danger` message under the field. Never `alert()`.
Exception (owner decision, keep as is): the consultation notes box in the doctor console
(`NotesPanel` in `components/doctor/NowServingPanel.tsx`) and its copy in the live demo
(`components/demo/DoctorScreen.tsx`) keep their own style: `rounded-lg` textarea with a light gray hairline (`border-mq-line`, focus: `border-mq-subtle` + `ring-2 ring-mq-line`), small uppercase
"Consultation notes" label, rounded `Ctrl+S` key hint. Do not migrate it to the square input style. Change both together.

**Panels** — `border border-mq-line bg-white`. Header row `h-12 px-4 border-b border-mq-line`
with title `text-sm font-medium` left and meta (mono `text-xs`) right.

**Tables** — header row: `font-mono text-xs uppercase tracking-wider text-mq-subtle`, `h-10 border-b`.
Rows: `h-12 border-b border-mq-line last:border-b-0`. Selected row `bg-mq-tint`. Tokens and ETAs in mono.

**Tabs** — underline style: `border-b-2 pb-3`, active `border-mq-ink text-mq-ink`,
inactive `border-transparent text-mq-subtle hover:text-mq-ink`, container `border-b border-mq-line`.

**Queue status** — text color plus an optional 6px square dot. No colored pills.

| Status | Style |
|---|---|
| waiting | `text-mq-subtle` |
| called / next | `text-mq-ink font-medium` |
| checked_in / in room | `text-mq-accent font-medium` + `bg-mq-accent` dot |
| completed | `text-mq-muted` |
| skipped | `text-mq-muted line-through` |
| no_show | `text-mq-danger` |

**Icons** — `lucide-react`, `strokeWidth={1.5}`, `h-4 w-4` or `h-5 w-5`, `text-mq-accent` or `text-mq-ink`.
Never inside tinted rounded tiles. No emoji.

**Toasts** — `sonner`. Direct copy: "Queue updated." / "Connection failed. Please try again."

**Loading / empty** — skeleton blocks `bg-mq-line animate-pulse` shaped like the real layout, not spinners.
Empty states: one line of `text-mq-muted` plus the next action as a secondary button.

## 7. Motion

- Easing: `ease-[cubic-bezier(0.32,0.72,0,1)]` (`EASE` constant). Hover/color: `duration-500`.
- No bounce, no spring overshoot, no default `ease-in-out`.
- Marketing only: scroll reveals with `<Reveal>` (IntersectionObserver, never scroll listeners).
- App screens: no entrance animations; only state feedback (hover, active, focus, row highlight).
- Always respect `motion-reduce:`.

## 8. Copy

- Sentence case, active voice, matter of fact. No exclamation marks, no "Oops".
- No hyphens inside marketing copy; rewrite the phrase.
- No fabricated stats, testimonials or logos. Use real data or leave the slot out.
- Primary CTA label is always "Register your clinic". Patient path: "Create a free account".
- Avoid: seamless, elevate, unleash, next gen, game changer.

## 9. Marketing vs app pages

| | Marketing (`/`) | Auth + dashboards |
|---|---|---|
| Tokens, font, radius 0, no shadow | Yes | Yes |
| Indexed sections ("01 — Problem") | Yes | No |
| Reveal animations, tagline reveal | Yes | No |
| Density | Airy | Compact, text-sm base |
| Hero heading gradient | Yes | No |

## 10. Where things live

- Tokens: `app/globals.css` (`@theme`). Fonts: `app/layout.tsx`.
- Shared primitives: `components/shared/` — `primitives.tsx` (`Container`, `Section`, `ButtonLink`,
  `buttonClasses`, `EASE`, `MONO`), `Logo.tsx`, `Reveal.tsx`, `QueuePreview.tsx` (product preview;
  `surface="dark"` on ink backgrounds).
- Auth building blocks: `components/auth/` — `AuthField` (input with optional `hint` and `trailing`),
  `AuthLabel` ("Optional" tag), `PasswordField` (Show/Hide), `PhoneField`, `PlanPicker` (radio group,
  name + price only), `AuthNotice` (status message), `AuthAside`.
- Patient app: `components/patient/` — `PatientHeader` (logo, account, underline tabs), `ActiveTokenPanel`,
  `AheadSquares`, `QueueStates` (skeleton, empty, error), `ProfileForm` (settings layout: label column
  left, fields right, hairline between sections; Save enabled only when dirty), `ChannelPicker`.
  `search/` — `SearchBox`, `SearchResults` (grouped rows), `ClinicQueue` + `SessionRow` (table on md+,
  stacked with a 3 column stat row on mobile).
  Reference for app screens.
- Staff app: `components/dashboard/AppHeader.tsx` (shared header for tenant_admin and doctor via the
  `(dashboard)` layout; underline tabs only when a role has 2+ sections). `components/admin/` — `AdminDialog` (Radix, square), `SelectField`,
  `ConfirmAction` (two click destructive), `StatusMark` + `TOKEN_STATUS`, `TabHeader`/`EmptyPanel`/`ListSkeleton`,
  and `sessions/`, `doctors/`, `departments/` tab folders. Staff pages use `max-w-5xl`.
- Receptionist: `components/reception/` — `GiveTokenForm` (PhoneInput with `defaultCountry` BD, last
  country remembered per device), `ReceptionSessionPanel`. Phone numbers are always sent in E.164 (+880…),
  matching how patients register; never ask staff to type country codes by hand.
- Doctor console (`/doctor`): `components/doctor/` — `DoctorQueueView` (ink bordered console: now serving
  left 8 cols, 2x2 figures + `BreakPicker` right 4 cols), `NowServingPanel` ("Seen, call next" one click
  primary, Skip, Seen only), `BreakPanel` (mono countdown, hairline progress, danger when overdue),
  `QueueTable`, `SeenList` (collapsed), `DoctorProfileForm` (collapsed "Your details"), `DoctorStates`.
  Admins with several open queues switch by underline tabs; `/doctor?session=<id>` preselects one.
- Settings (`/admin/settings`): `components/settings/` — `SettingsSection` (shared label column row, use for
  any settings screen), `ClinicDetailsForm` (mount with `key={clinic.updated_at}`; Save only when dirty),
  `LogoPreview` (square, initial fallback), `PlanPanel` (read only account rows + plan limits grid).
- Horizontally scrolling tab rows: `no-scrollbar overflow-x-auto overflow-y-hidden -mb-px` on the row and no
  `translate-y-px` on tabs, so the underline sits on the rule without a stray scrollbar (`@utility no-scrollbar`).
- Plans: `lib/plans.ts` is the only place plan names, prices and features live (homepage pricing and
  `/register/tenant` both read it). Link to a preselected plan with `planRegisterHref('solo')`.
  `components/ui/phone-input.tsx` is already restyled to this system.
  The `(auth)` layout is the shared shell for login, register and setup password: header and footer
  with hairlines, form in the left 5 columns (`max-w-sm`, vertically centered), white `AuthAside`
  role panel in the right 6 columns (lg+ only).
- Live demo (`/demo`, public): `components/demo/`. `demoStore.ts` is a browser only reducer (no API, nothing saved)
  that mirrors the real queue rules (issue order, one click call next, ETA, one near turn push at 3 or fewer ahead).
  Three `ScreenFrame`s (reception 3 cols, doctor 6, patient phone 3 at xl; underline tabs below xl), a 7 step
  `StepRail` + sticky `TaskBar` (Do this step for me, Play the rest, Reset) and `ActivityLog`. When a real screen
  changes, update its demo copy too.
- `components/ui/*` (shadcn) still use the old blue, rounded style. Restyle a component to this
  system before using it on a new or migrated page.

## 11. Checklist before shipping any screen

- [ ] Only `mq-*` colors, one accent, no gradients, no shadows, no `rounded-*`
- [ ] Only Tailwind type scale and allowed spacing values
- [ ] Plex Sans; mono only for data
- [ ] Hover, active, focus, disabled, loading, empty and error states present
- [ ] Left-aligned, on the 12-column grid, hairlines for structure
- [ ] Copy: sentence case, no fake data, consistent CTA labels
