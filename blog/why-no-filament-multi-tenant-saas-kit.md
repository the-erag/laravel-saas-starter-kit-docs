---
title: "Why We Didn't Use Filament in Our Multi-Tenant SaaS Kit"
description: "Filament is a great admin framework. Here is why we built SaaS Laravel's admin in the kit's own stack instead, and when Filament is still the better choice."
pageClass: blog-page
date: 2026-11-21
author: erag
category: architecture
tags: [Filament, Admin Panel, Multi-Tenancy]
---

# Why We Didn't Use Filament as the Admin Panel in Our Multi-Tenant SaaS Kit

<BlogPostMeta />

One of the questions we get most often is "why doesn't SaaS Laravel ship with Filament?" It's a fair question. Filament is popular, it's free, and several Laravel SaaS kits build their admin on it. So leaving it out was a decision, not an oversight, and this post explains it.

This is our reasoning for our product: a set of multi-tenant starter kits with a database per tenant. It's not a claim that Filament is the wrong tool in general. For the basics of what Filament and Inertia each do, read [Filament vs Inertia](/blog/filament-vs-inertia.html) first. We won't repeat that here.

Versions in this post: Laravel 13, Filament 5 (the latest GitHub release was v5.11.4 when we checked in November 2026), stancl/tenancy 3 and Inertia v3.

## First: Filament is a great tool

"We didn't use X" posts often read like "X is bad". Filament isn't. It describes itself as an open-source framework for building business software with Laravel, it's MIT licensed, and its site lists 1.3K+ community plugins (as of November 2026, on [filamentphp.com](https://filamentphp.com)). You describe a table or a form in PHP and get a working screen. For a lot of teams, that's exactly the right trade.

Other kits made the opposite call from us, and that's fine. As of November 2026, [Wave](https://devdojo.com/wave), [SaaSykit](https://saasykit.com) and [Larafast](https://larafast.com/pricing) all use Filament for their admin. If you want a Filament admin out of the box, those are the kits to look at.

## What we were building

The decision makes more sense once you see the constraints we had:

- **Four kits, one backend.** Vue, React and Svelte (all Inertia v3) and Livewire 4. The Laravel 13 backend features are the same in every kit.
- **Two kinds of admin.** The central app on your main domain manages tenants, domains, your admin users, roles, menus, layouts and tenant maintenance. Each tenant workspace has its own admin too: its own users, roles and permissions, menus, layout settings and notifications.
- **A database per tenant.** stancl/tenancy in multi-database mode, with each tenant on its own subdomain and separate auth guards for central and tenant users.
- **Built on Laravel's official starter kits.** Same folders, same conventions, Fortify for auth.

That second point matters more than it looks. In a multi-tenant B2B product, the "admin" isn't only a staff back office. The tenant's own admin, where a customer invites users and sets roles, is part of the product your customers pay for. It has to look and behave like the rest of the app.

## Reason 1: one way to build screens

If we had added Filament, every kit would have two ways to build a screen. The customer app would be Vue, React or Svelte pages (or plain Livewire components), and the admin would be Filament resources. A buyer adding a feature would first have to decide which side it belongs on, then learn that side's patterns.

We wanted one answer. In every kit, an admin screen is a route, a thin controller, a service and a page. Here is the store action for creating a tenant in the Vue kit:

```php
public function store(TenantRegisterData $data): RedirectResponse
{
    $this->tenantService->createTenant($data);

    Inertia::flash('toast', ['type' => 'success', 'message' => __('modules/tenant.toasts.created')]);

    return to_route('tenants.index');
}
```

The Data object validates the input, `TenantService` does the work, and the page is a normal Vue component using the same shadcn-vue components as the rest of the app. The React and Svelte kits follow the same shape. The Livewire kit uses Livewire components with Form Requests instead, and the same services underneath.

The Livewire kit is the interesting case, because Filament is itself built on Livewire. Even there we kept plain Livewire components with Flux UI, the same way Laravel's official Livewire kit builds screens. Sharing a runtime isn't the same as sharing conventions.

## Reason 2: one set of conventions to learn

Filament is a framework on top of Laravel, with its own ideas about resources, forms, tables, actions and panels. Those ideas are good, but they're one more thing a buyer has to learn before they can change the admin with confidence.

A starter kit is code you'll own for years. We'd rather you only need to know Laravel and your chosen frontend. The tenants module holds things you already know: routes, controllers, Data objects or Form Requests, services and a repository. The [architecture docs](/docs/core/architecture.html) describe the pattern in one page, because there's only one.

It helps AI coding tools too: every kit ships Laravel Boost guidelines, and fewer patterns means fewer rules to describe.

## Reason 3: upgrades and customization over time

A starter kit gets updated after you buy it. Ours reach you through git, with the kit as an `upstream` remote (see [how updates work](/docs/purchase/updates.html)). Every dependency we add is one more thing we have to keep current across four kits, and one more thing you have to merge.

A UI framework adds its own major versions on top of Laravel's, Inertia's or Livewire's. Plugins add theirs. That's normal, but it adds up across four kits and every buyer's fork.

Then there's customization. A panel framework is fastest while your screen fits its model. For something unusual, like tenant provisioning with domain checks or a drag-and-drop menu builder, you work through its extension points. With plain pages, the unusual screen is built the same way as the usual one.

## Reason 4: two kinds of "tenancy" in one app

This was the deciding point for us.

Filament has multi-tenancy built in, and it's a good fit for team-based apps. Its docs (checked in November 2026) describe users who belong to many tenants, a tenant switcher and `canAccessTenant()` checks. The [tenancy docs](https://filamentphp.com/docs/5.x/users/tenancy) scope records by a tenant foreign key on shared tables, such as `team_id`. Multi-database tenancy isn't mentioned.

SaaS Laravel works differently. stancl/tenancy identifies the tenant by its subdomain and switches the database connection for the whole request. Cache is tagged per tenant, the filesystem is suffixed per tenant, and queued jobs remember the tenant. There's no `team_id` on tenant tables, because each tenant's tables live in their own database.

Running both would mean two models of "tenant" in one codebase: team-style tenancy inside the panel, and database switching everywhere else. Filament can run inside a stancl tenant context with extra wiring, covered in [Filament vs Inertia](/blog/filament-vs-inertia.html). SaaSykit, for example, ships a separate plugin that integrates Tenancy for Laravel with Filament for its multi-database mode (per [their docs](https://saasykit.com/docs/multi-tenancy/multi-database-tenancy), November 2026). But it's another layer to understand, and we wanted tenancy to mean one thing in our kits. Our [single vs multi-database tenancy](/blog/single-vs-multi-database-tenancy-laravel.html) post explains why we chose a database per tenant in the first place.

## Reason 5: the same structure as Laravel's official kits

Laravel's own [starter kits](https://laravel.com/docs/starter-kits) don't ship an admin panel. We built SaaS Laravel on top of them, keeping their folders and conventions: `resources/js/pages`, `components/ui`, Fortify auth. That way, new features in the official kits can come to yours too. Adding Filament would have moved us further from that base.

## Reason 6: one set of checks for both apps

Every kit ships Pint, Pest 5 feature tests, Larastan (PHPStan) at level 7 and a GitHub Actions workflow. Because admin screens are ordinary controllers, services and pages, the admin and the customer app follow the same code style and are tested the same way. There's no second set of rules for "the panel part". One honest note: Larastan's `paths` currently cover `app/`, config, database and routes, not the `Modules/` folders yet.

## What this decision costs

Building admin screens ourselves has a cost:

- **More code per CRUD screen.** A Filament resource gets you a table, filters and forms with very little code. We wrote ours.
- **No plugin ecosystem.** If you want an activity log viewer or an import tool, you build it or find a Laravel package and add your own screen.
- **Slower to add the tenth admin screen.** Once you have a table and form pattern it gets faster, but it's still more work than generating a resource.

For a multi-tenant product where the tenant admin is customer-facing, we think that cost is worth it. For other products it isn't.

## When Filament is still the right call

We'd pick Filament ourselves in these cases:

- **Internal tools.** A CRM, an inventory system or an approvals tool for your own staff. They need a good admin panel, and that's exactly what Filament is.
- **CRUD-heavy back offices.** If your staff tooling is dozens of resources with tables, filters and bulk actions, Filament saves real time.
- **Admin-only apps.** When the admin is the whole product, Filament gets a solo developer far, fast.
- **Teams that already know Filament.** Experience with a tool counts for more than our preferences.
- **Team-based apps on a shared database.** Filament's built-in tenancy fits that model directly.

If you're weighing this for your own large SaaS, our neutral take on [Filament vs a custom admin](/blog/filament-vs-custom-admin-laravel-saas.html) walks through the trade-offs factor by factor.

## You can still add Filament to SaaS Laravel

Nothing in the kits blocks Filament. It's a normal Laravel app. The last section of [Filament vs Inertia](/blog/filament-vs-inertia.html) shows how to put a panel on the central domain only, with the right guard and the `super-admin` role check. A common setup is Filament for staff back-office tooling on the central domain, and the kit's own screens for everything tenants see.

For the wider picture, see [Best Laravel SaaS starter kits in 2026, compared](/blog/best-laravel-saas-starter-kits.html).

## Frequently asked questions

### Does SaaS Laravel include Filament?

No. The central admin and the tenant admin are built in each kit's own frontend: Vue, React or Svelte pages with shadcn-style components, or Livewire components with Flux UI.

### Does Filament support a database per tenant?

When we checked its tenancy docs in November 2026, they described team-style tenancy scoped by a tenant foreign key, and didn't mention multi-database tenancy. To get a database per tenant you'd combine Filament with a package like stancl/tenancy and test the setup carefully.

### Is the Livewire kit built on Filament?

No. It uses plain Livewire 4 components, Blade, Alpine.js and Flux UI (free), like Laravel's official Livewire kit.

## Where SaaS Laravel fits

SaaS Laravel is for teams building a B2B SaaS where each customer gets its own database and subdomain, and where you want one stack from the login page to the admin. You pick [Vue](/kits/vue.html), [React](/kits/react.html), [Svelte](/kits/svelte.html) or [Livewire](/kits/livewire.html), and every screen, admin included, is built the same way. The [multi-tenancy docs](/docs/core/multi-tenancy.html) show how the central and tenant sides fit together.

It's not the right pick if you want a Filament admin ready on day one, if you're building an internal tool, or if a shared-database team model is all you need. In those cases a Filament-based kit or Filament on its own is likely the better fit; our [SaaS Laravel vs SaaSykit](/blog/saas-laravel-vs-saasykit.html) post compares one of them directly. It also doesn't include billing, so you add Cashier or your provider of choice. Prices are on the [pricing page](/pricing.html).

<BlogPostCta title="One stack, admin included" text="SaaS Laravel builds its central and tenant admin in the same Vue, React, Svelte or Livewire code as the rest of your app, on a database-per-tenant backend." />
