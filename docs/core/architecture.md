---
title: "Laravel Multi-Tenant App Architecture"
description: "How a request flows through the kits: modules, central vs tenant context, middleware, Data objects, services, repositories and shared Inertia props."
---

# Architecture

The Vue, React and Svelte kits run on the same Laravel backend. The frontend is an Inertia v3 single-page app, so there's no separate API. The Livewire kit shares the tenancy, auth and roles setup described here but uses Livewire components and Blade views instead of Inertia pages. See [Livewire architecture](/docs/livewire/architecture).

<KeyIdea>

The **host name** decides everything else. Before any route runs, the kit checks the host and puts the request in the central or a tenant context. That switches the database, the auth guard and the default permissions and menus. From there, every request takes the same path: module route, controller, Data object, service.

</KeyIdea>

The path a request takes:

<FlowDiagram label="The path a request takes" :nodes="[
  { label: 'Tenancy check', note: 'central or tenant context, decided by host' },
  { label: 'web middleware', note: 'locale, shared props, tenant status checks' },
  'Module route',
  { label: 'Controller → Data object → Service', note: 'then Model / Repository' },
  { label: 'Inertia page', note: 'or redirect with a toast' },
]" />

## Why a module-based structure

A SaaS app has a lot of moving parts in one codebase: tenants, domains, authentication, roles and permissions, invitations, settings, menus and maintenance. In a default Laravel app all of that ends up mixed together in `app/Http/Controllers`, `app/Models` and `app/Services`, and each new feature makes the code harder to find and change.

So the backend is split into modules. Each module keeps one feature in a single folder under `Modules/`: its routes, controllers, Data objects, services, repositories, enums and jobs.

| Benefit | What it means for your project |
| --- | --- |
| Readable | Everything about a feature is in one folder. To understand tenants, open `Modules/Tenant`. |
| Well structured | Modules share the same folder layout (`Data`, `Enums`, `Http`, `Services`, `Repositories`, `routes`), so the project stays predictable as it grows. |
| Safe to change | A change to one module stays inside it. |
| Easy to extend | Add your own feature (for example `Modules/Billing`) as a new module without touching the existing ones. |
| Team friendly | People can work on different modules with fewer merge conflicts. |

### How modules depend on each other

Modules are loosely coupled:

- `Auth`, `Dashboard`, `RolePermission` and `Settings` don't use any other module.
- When a module needs another one, it only uses that module's services, enums and Data objects. It never reaches into the other module's tables or internals.
- Dependencies only point one way. The foundation modules `RolePermission` and `Settings` never depend on feature modules, so there are no circular dependencies.

```text
Auth, Dashboard, RolePermission, Settings   →  no module dependencies
Menu                                        →  Settings (layout settings)
Notification                                →  RolePermission (super-admin role)
Tenant                                      →  RolePermission (tenant admin role), Settings (languages)
User                                        →  RolePermission (roles and permissions), Notification (invitation notices)
```

::: tip Adding your own module
Keep it self-contained, with its own routes, Data objects, services and service provider. If it needs something from another module, call that module's service rather than querying its tables, and don't make `RolePermission` or `Settings` depend on your module.
:::

## Modules

Modules use the PSR-4 namespace `Modules\`, and each one registers its routes and bindings through its own service provider.

| Module | Responsibility |
| --- | --- |
| `Auth` | Fortify actions, Inertia auth views, rate limiters |
| `Dashboard` | Landing page (`/`) and `/dashboard` |
| `Menu` | Database-driven navigation, reorder and reset |
| `Notification` | In-app notifications, the bell and the notifications page |
| `RolePermission` | Roles CRUD, `RoleEnum`, `PermissionService` |
| `Settings` | Profile, security, language, appearance and layout settings, `SetUserLocale` middleware |
| `Tenant` | Tenants, domains, auth features per domain, maintenance, suspension, tenant invitations |
| `User` | Users CRUD, per-user permissions, user invitations |

::: tip Add routes in a module
`routes/web.php` is empty on purpose. Each module's service provider (registered in `bootstrap/providers.php`) loads that module's own `routes/web.php`.
:::

The folder layout is covered in [Project structure → Inside a module](/docs/getting-started/project-structure#inside-a-module).

## Layered code

Each layer does one job. Controllers stay small, and business logic can be reused and tested on its own.

```text
Controller   → receives validated input → calls a service → returns Inertia page or redirect
Data object  → validation rules + typed input (+ generated TypeScript type)
Service      → business logic, transactions
Repository   → complex queries (only where needed)
```

- Data objects use `spatie/laravel-data`. Their `rules()`, `attributes()` and `messages()` are translated, and any class marked `#[TypeScript]` gets exported to the frontend.
- Toasts go through flash data. After a successful action the controller flashes a `toast` with `Inertia::flash()`, and the frontend shows it with the kit's toast library.

::: details View implementation example
```php
// Modules/Tenant/Http/Controllers/TenantController.php
public function store(TenantRegisterData $data): RedirectResponse
{
    $this->tenantService->createTenant($data);

    Inertia::flash('toast', ['type' => 'success', 'message' => __('modules/tenant.toasts.created')]);

    return to_route('tenants.index');
}
```
:::

Examples of each layer in the kit:

| Layer | Classes |
| --- | --- |
| Services | `TenantService`, `DomainService`, `UserService`, `PermissionService`, `MenuService`, `LayoutService`, ... |
| Repositories | `TenantRepository`, `DomainRepository` |
| Data objects | `TenantRegisterData`, `DomainData`, `UserData`, `MaintenanceModeData`, ... |

## Central vs tenant context

One codebase serves two contexts. The **host name** decides which one a request runs in, and that decision switches the database, the auth guard and the default permissions and menus.

```text
Request host
  ├─ APP_DOMAIN (vue.test)            → central context
  └─ any other host (acme.vue.test)   → look up in the domains table
        ├─ found                      → tenant context
        └─ not found                  → 404
```

| | Central | Tenant |
| --- | --- | --- |
| Host | `APP_DOMAIN` (e.g. `vue.test`) | Any other host, e.g. `acme.vue.test` |
| Database | `DB_DATABASE` | `tenant<id>` |
| Auth guard | `web` | `tenant` |
| User provider / broker | `central_users` | `tenant_users` |
| Permissions config | `config/permissions/*.php` | `config/permissions/tenant/*.php` |
| Menus seeder | `Database\Seeders\MenuSeeder` | `Database\Seeders\tenant\MenuSeeder` |

::: info How the context is chosen
`InitializeTenancyIfTenantDomain` is prepended to the global middleware stack, so it runs before anything else. On the central domain it forces the `web` guard and the `central_users` broker and leaves tenancy off. On any other host it hands the request over to stancl's `InitializeTenancyByDomain`.
:::

### When tenancy starts

When the `TenancyInitialized` event fires, these listeners run in order. `TenancyEnded` runs the matching revert listeners.

| Listener | Effect |
| --- | --- |
| `BootstrapTenancy` | Switches database, cache, filesystem and queue context |
| `ConfigureTenantAuth` | Switches Laravel and Fortify to the `tenant` guard and `tenant_users` broker |
| `ApplyTenantFortifyFeatures` | Applies the domain's enabled auth features |
| `ApplyTenantAppName` | Sets `app.name` to the domain's App name, else the tenant company |

### Routes in each context

Each module registers its routes once, so most pages (users, roles, menus, settings, dashboard) work in both contexts. If a route should only exist on one side, add the middleware for it:

| Route should work on | Add middleware |
| --- | --- |
| Both (default) | nothing extra |
| Central domain only | `central.only` (`PreventAccessFromTenantDomains`) |
| Tenant domains only | stancl's `PreventAccessFromCentralDomains` |

Related files:

- `app/Http/Middleware/InitializeTenancyIfTenantDomain.php`
- `app/Providers/TenancyServiceProvider.php` (event → listener map)
- `app/Listeners/` (`ConfigureTenantAuth`, `RevertTenantAuth`, `ApplyTenantAppName`, `RestoreCentralAppName`)
- `Modules/Tenant/Listeners/` (`ApplyTenantFortifyFeatures`, `RestoreCentralFortifyFeatures`)

More in [Multi-tenancy](/docs/core/multi-tenancy).

## Web middleware

`bootstrap/app.php` appends these to the `web` group, in this order:

| Middleware | Purpose |
| --- | --- |
| `HandleAppearance` | Shares the `appearance` cookie with the Blade root view |
| `SetUserLocale` | Resolves the locale (user → domain → app default) |
| `HandleInertiaRequests` | Shared props (below) |
| `AddLinkHeadersForPreloadedAssets` | Laravel's preload `Link` headers for Vite assets |
| `EnsureTenantAuthFeatureEnabled` | 404 for auth routes disabled on this domain |
| `EnsureTenantIsNotSuspended` | Renders `auth/Suspended` (403) for suspended tenants |
| `EnsureTenantIsNotInMaintenance` | Renders `auth/Maintenance` (503) during tenant maintenance |

Middleware aliases:

| Alias | Class | Note |
| --- | --- | --- |
| `auth` | `TenancyAwareAuthenticate` | Maps the `web` guard to `tenant` inside a tenant |
| `guest` | `TenancyAwareRedirectIfAuthenticated` | Same mapping |
| `central.only` | `PreventAccessFromTenantDomains` | |
| `permission`, `role` | spatie middleware | |

## Shared Inertia props

Every page gets these props from `HandleInertiaRequests::share()`:

| Prop | Content |
| --- | --- |
| `name` | `app.name` (per-domain App name or tenant company on tenant domains) |
| `appUrl`, `domain` | `app.url`, `tenancy.domain` |
| `auth.user` | Current user |
| `auth.isTenant` | `true` on tenant domains |
| `auth.permissions` | All permission names of the user |
| `auth.isSuperAdmin` | User has the `super-admin` role |
| `locale`, `userLocale`, `defaultLocale`, `languages` | Localization state |
| `sidebarOpen` | From the `sidebar_state` cookie |
| `menus`, `setupMenus` | Permission-filtered navigation trees |
| `notifications` | Unread count and latest notifications (`null` for guests) |
| `layout` | Active layout settings |
| `permissionsConfig` | Grouped permissions from `config/permissions` |
| `lang` | Translations (shared by `erag/laravel-lang-sync-inertia`) |

## Error pages

Error responses are rendered by `bootstrap/app.php` as the Inertia page `errors/Error` (`errors/error` in React), with a `status` prop.

| Environment | Rendered as Inertia page |
| --- | --- |
| `local`, `testing` | 403 only (you still see Laravel's debug pages for other errors) |
| Other | 403, 404, 500, 503 |

An unknown host throws a `TenantCouldNotBeIdentifiedException`, which turns into a 404.

## Typed frontend

| Tool | Generates | Import from |
| --- | --- | --- |
| Wayfinder | Typed route and controller functions in `resources/js/routes` and `resources/js/actions` | `@/routes/...`, `@/actions/...` |
| TypeScript transformer | Data and enum types in `resources/js/types/Modules/...` | `@/types/Modules/...` |

Regenerate both after you change the backend (see [Local development](/docs/getting-started/local-development#generated-files)).

<RelatedPages :links="[
  { text: 'Multi-tenancy', link: '/docs/core/multi-tenancy', desc: 'Tenants, identification and working in tenant context from code.' },
  { text: 'Project structure', link: '/docs/getting-started/project-structure#inside-a-module', desc: 'The folder layout inside a module.' },
  { text: 'Domains', link: '/docs/core/domains', desc: 'How a host is mapped to a tenant.' }
]" />
