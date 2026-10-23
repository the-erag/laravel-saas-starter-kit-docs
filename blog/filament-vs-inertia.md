---
title: "Filament vs Inertia: Admin Panel or Customer App?"
description: "Filament vs Inertia explained for Laravel SaaS teams: what each tool is for, when one is enough, the cost of running both, and how their multi-tenancy differs."
pageClass: blog-page
date: 2026-10-24
author: annu-gupta
category: frontend
tags: [Filament, Inertia, Admin Panel]
---

# Filament vs Inertia: Different Tools, and When to Use Both in a Laravel SaaS

<BlogPostMeta />

"Should I use Filament or Inertia?" sounds like a choice between two frontend stacks. It's really a question about two different jobs. Filament is a framework for building admin panels and back-office tools quickly. Inertia is the bridge that lets you build your customer-facing app in Vue, React or Svelte with Laravel controllers behind it. So the Filament vs Inertia question is less "which one?" and more "which one for which part of my product?"

Below we'll explain what each tool actually is, when Filament alone is enough, when Inertia alone is the better call, and the popular combination of Filament at `/admin` with an Inertia app for customers. We'll also be honest about what that combination costs you, and compare Filament's built-in multi-tenancy with database-per-tenant setups like stancl/tenancy. Versions: Laravel 13, PHP 8.4, Filament 5 and Inertia v3.

## What Filament is

Filament calls itself a server-driven UI framework for Laravel. In practice, most people use its panel builder (`filament/filament`) to get a full admin area: login, navigation, tables with filters and bulk actions, create and edit forms, dashboards with widgets and notifications. Under the hood it's built on Livewire. Filament 5 exists mainly to support Livewire 4, and it needs PHP 8.2+, Laravel 11.28+ and Tailwind CSS 4.

Install it and generate a resource, and you have a working CRUD screen for a model in minutes:

```bash
composer require filament/filament:"^5.0"
php artisan filament:install --panels
php artisan make:filament-resource Customer --generate
```

The panel lives at `/admin` by default, and the `--generate` flag builds the form and table from the model's columns. You describe screens in PHP (tables, form fields, actions), and Filament renders them. You don't write Blade templates for each page, and you don't write any JavaScript.

Filament is MIT licensed and free.

## What Inertia is

[Inertia](https://inertiajs.com) isn't a UI kit at all. It's the glue between Laravel and a JavaScript framework. Your routes and controllers stay in Laravel, and each controller returns a page component (Vue, React or Svelte) with props:

```php
public function index(): Response
{
    return Inertia::render('projects/Index', [
        'projects' => $this->projects->forCurrentUser(),
    ]);
}
```

You design every page yourself, usually with a component library like shadcn-vue, shadcn/ui or shadcn-svelte. That's more work per screen than a Filament resource, and in return you have complete control over how the product looks and behaves.

## Filament vs Inertia at a glance

| | Filament 5 | Inertia v3 |
| --- | --- | --- |
| What it is | Admin panel and back-office framework | Adapter between Laravel and Vue/React/Svelte |
| Built on | Livewire 4, Blade, Alpine, Tailwind | Your JS framework and Vite |
| You write | PHP configuration for tables, forms and actions | Controllers in PHP, pages in Vue/React/Svelte |
| Speed for CRUD screens | Very fast | Slower; you build each screen |
| Design freedom | Within Filament's layout and theming | Anything you can build in your framework |
| Typical users | Your staff, support team, operators | Your paying customers |
| Authorization | Model policies, `canAccessPanel()` | Policies, middleware, shared permission props |
| Multi-tenancy | Built-in team-style tenancy per panel | None of its own; uses whatever your backend does |

## When Filament alone is enough

Filament on its own is a perfectly good choice for some products:

- **Internal tools.** A CRM for your sales team, an inventory system, an approvals tool. The users are employees, and "looks like a good admin panel" is exactly what they need.
- **B2B products where the customer UI is basically CRUD.** If customers mostly manage records in tables and forms, a customer-facing Filament panel (with its own tenancy, see below) can take you a long way.
- **Prototypes and MVPs.** When you need to test whether anyone will pay, Filament gets a functional product in front of people very quickly.

Filament supports several panels in one app, so you can have `/admin` for staff and `/app` for customers, each with its own auth rules.

## When Inertia alone is the better choice

We'd use Inertia without Filament when:

- **The product UI is the product.** Custom dashboards, editors, onboarding flows, a branded look that has to match your marketing site. You'll fight a panel framework to get there.
- **Your team writes Vue, React or Svelte.** Building the admin screens in the same stack means one set of components, one design system and one way of doing things.
- **Your admin is small.** If "admin" means a tenants table, a users table and a settings page, building those with Inertia isn't much more work than configuring Filament, and you avoid a second UI stack.

## The common combo: Filament for /admin, Inertia for customers

Plenty of teams run both: customers use an Inertia app, staff use a Filament panel at `/admin`. It's a reasonable setup, and the panel gives your support team a lot of tooling almost for free. Just know what you're signing up for.

### Two UI stacks

Your customer app is Vue, React or Svelte with your own components. Your admin is Livewire and Blade with Filament's components. That's two sets of patterns for forms, tables, modals and notifications, and two places to fix a bug in "how we show dates".

### Two styling setups

Filament ships its own compiled stylesheet. If you want your own Tailwind classes inside the panel, Filament's docs say you need a custom theme (`php artisan make:filament-theme`), which adds a separate CSS entry to your Vite config. Brand colours are easy to share through `->colors()`, but don't expect the admin to look exactly like your app without effort.

### Auth and routes

The panel has its own login page, guard and middleware stack. The generated panel provider lists its own middleware (cookies, session, CSRF and so on) instead of using the `web` group, so anything you appended to `web` for your Inertia app (shared props, locale, tenant checks) doesn't run on panel routes. Global middleware still does.

Be explicit about who gets in. Filament lets every user into a panel when running locally, but in production you must implement `FilamentUser`:

```php
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;

class User extends Authenticatable implements FilamentUser
{
    public function canAccessPanel(Panel $panel): bool
    {
        return $panel->getId() === 'admin' && $this->hasRole('super-admin');
    }
}
```

### Shared business logic

The cleanest way to keep both sides consistent is to put the logic in service classes and call them from both. An Inertia controller and a Filament action should end up in the same method:

```php
use App\Models\Tenant;
use Filament\Actions\Action;
use Modules\Tenant\Services\TenantService;

Action::make('resendInvitation')
    ->requiresConfirmation()
    ->action(function (Tenant $record): void {
        abort_unless(auth()->user()->can('Edit Tenant'), 403);

        app(TenantService::class)->sendInvitation($record);
    });
```

Notice the permission check inside the action. Filament's docs warn that a record held by a Livewire component isn't re-authorized on later requests, so check it where the work happens.

If the logic lives inside Filament resources instead, your customer app can't reuse it, and the two sides drift apart. Our [service layer guide](/blog/laravel-service-layer-pattern.html) covers the pattern.

## Filament multi-tenancy vs stancl/tenancy

This is where a lot of people get confused, because both use the word "tenancy".

**Filament's tenancy** is a panel feature. You call `->tenant(Team::class)` on the panel, your `User` implements `HasTenants` with `getTenants()` and `canAccessTenant()`, and users can belong to several teams and switch between them. URLs include the tenant (`/admin/1` by default), or you can use `tenantDomain()` for subdomains. Filament adds a global scope to models used by tenant-aware resources, so tables and record pages only show the current team's rows. The examples use a shared database with ownership relationships to the team.

Filament's own docs list the limits clearly: tenant scoping isn't record authorization, `withoutGlobalScopes()` removes the isolation, and queries outside the panel (jobs, commands, your Inertia controllers) need their own constraints.

**stancl/tenancy with a database per tenant** works at a lower level. It identifies the tenant (by domain, in the SaaS Laravel kits) before the request hits your code and switches the database connection, cache, filesystem and queue context. Every query in that request, from any package, runs against that tenant's database. There's no scope to forget.

| | Filament tenancy | stancl/tenancy, database per tenant |
| --- | --- | --- |
| Layer | One Filament panel | The whole application |
| Data isolation | Global scope on tenant-aware models | Separate database per tenant |
| User to tenant | Many-to-many (switch teams) | Up to you; often a users table in each tenant database |
| Covers jobs, commands, other routes | No, add your own scoping | Yes, when tenancy is initialized |
| Setup effort | Low | Higher (migrations, provisioning, queues) |

Which one is right depends on your isolation needs. We compare the bigger trade-off in [single vs multi-database tenancy](/blog/single-vs-multi-database-tenancy-laravel.html).

If you use Filament inside a stancl tenant context, two things matter. Panel middleware runs on the first page load but not on later Livewire requests unless you pass `isPersistent: true`, so tenancy middleware has to be persistent. And Livewire's own update and upload endpoints need the tenancy middleware too, which stancl documents on its [Livewire integration page](https://tenancyforlaravel.com/docs/v3/integrations/livewire).

## Mistakes we see with Filament and Inertia

- **Returning `true` from `canAccessPanel()`.** Locally every user can open the panel, and in production nobody can until you implement `FilamentUser`. The quick fix people reach for is `return true;`, which lets every customer in. Check a role.
- **Assuming missing policies mean "deny".** Filament allows an operation when the policy or the method is missing, unless you turn on strict authorization. Write the policies, or enable it.
- **Treating Filament tenancy as security.** It scopes the panel's queries. It doesn't protect your API, jobs or Inertia controllers.
- **Duplicating logic in resources.** Creating a tenant in a Filament form and in an Inertia controller with two different code paths ends badly. Call one service.
- **Sharing a guard without meaning to.** If the panel and the app share a guard, logging out of one logs you out of both. Decide on purpose whether that's what you want.
- **Expecting Inertia middleware in the panel.** Shared props, locale and tenant status checks appended to `web` won't run there.

## Frequently asked questions

### Can I use Filament with Inertia and Vue?

Yes, side by side in the same Laravel app. Filament runs its panel on its own routes (for example `/admin`), and your Inertia app with Vue, React or Svelte handles the rest. They don't share components, but they can share models, policies and service classes.

### Is Filament built on Livewire?

Yes. Filament 5 uses Livewire 4, together with Blade, Alpine.js and Tailwind CSS. You configure panels and resources in PHP, and Filament renders them as Livewire components.

### Is Filament free?

Yes. Filament is open source under the MIT license. The panel builder and its packages cost nothing to use.

### Does Filament support multi-tenancy?

Yes. Panels support team-style tenancy where users belong to several tenants and switch between them, with automatic query scoping for tenant-aware resources. It scopes queries rather than switching databases, so if you need a database per tenant you'd combine Filament with a package like stancl/tenancy.

### Should I build my admin panel with Filament or Inertia?

Use Filament if your admin is large, CRUD-heavy and used only by staff. Use Inertia if the admin is small, if your team already writes Vue, React or Svelte, or if you want one design system across the whole product.

## Filament and Inertia in the SaaS Laravel kits

The [SaaS Laravel kits](/) use Inertia for everything, including the central admin. Managing tenants and their domains, users, roles and permissions, menus, layout settings and tenant maintenance are all Vue, React or Svelte pages (depending on the kit) built with the same shadcn-style components as the rest of the app. Access is controlled with spatie/laravel-permission middleware and the `super-admin` role, and every action goes through module services like `TenantService` and `UserService`. Filament is not included.

You can add Filament next to it. A few things to keep in mind, all based on how the kits are wired (see [Architecture](/docs/core/architecture.html)):

- Central admin routes use the `central.only` middleware and the `web` guard with the `central_users` provider. Tenant domains use the `tenant` guard. Put the panel on the central domain only and set the guard explicitly (code below).
- `InitializeTenancyIfTenantDomain` is global middleware, so it runs on panel routes too. Inertia middleware like `HandleInertiaRequests` and `SetUserLocale` is appended to `web` and won't.
- Restrict `canAccessPanel()` to the `super-admin` role, and call the existing services from Filament actions so both UIs behave the same.
- Keep it out of tenant domains unless you add the tenancy setup described above.

The panel provider would then start like this:

```php
// app/Providers/Filament/AdminPanelProvider.php
return $panel
    ->default()
    ->id('admin')
    ->path('admin')
    ->domain(config('tenancy.domain')) // APP_DOMAIN in the kits
    ->authGuard('web')
    // keep the generated ->middleware() and ->authMiddleware() lists here
    ->login();
```

For most buyers we'd stay with the Inertia admin that ships with the kit and add screens in the same style. Reach for Filament when your staff tooling grows into dozens of CRUD screens. The [permission-based menus guide](/blog/laravel-inertia-permission-menus.html) shows how new admin pages plug into the existing navigation.

<BlogPostCta title="An admin already built in Inertia" text="SaaS Laravel ships tenant, user, role and menu management as Vue, React or Svelte pages on one Laravel backend." />
