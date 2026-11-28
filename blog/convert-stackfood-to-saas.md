---
title: "Convert StackFood to a Multi-Tenant SaaS"
description: "Turn the StackFood admin and restaurant panel into a multi-tenant SaaS with a database per delivery business, using one phased AI prompt."
pageClass: blog-page
date: 2026-11-26
author: erag
category: saas
tags: [StackFood, SaaS, AI Agents]
---

# Convert StackFood to a Multi-Tenant SaaS for Delivery Businesses

<BlogPostMeta />

To turn StackFood into a multi-tenant SaaS, you sell the whole platform to delivery businesses: each one becomes a tenant with its own database, and the restaurants it signs up stay inside that tenant as users and roles. The Laravel admin and restaurant panels move onto a starter kit that already handles tenants. The Flutter apps are a separate job, because they need a backend API and the kit doesn't ship one. One phased prompt gets an AI coding agent through the panels over a few sessions, with you reviewing each phase.

This is one of our posts on [turning a CodeCanyon Laravel script into a SaaS](/blog/codecanyon-laravel-script-to-saas.html). StackFood already has paying vendors inside it, since restaurants pay commission or a subscription, so your SaaS adds a second layer on top: delivery businesses paying you.

## What StackFood does

[StackFood Multi Restaurant](https://codecanyon.net/item/stackfood-multi-restaurant-food-delivery-app-with-laravel-admin-and-restaurant-panel-v10/33571750) by sixamtech is a food delivery system. Out of the box it gives you:

- **Two Laravel web panels**: an admin panel and a restaurant panel. The 8.5 changelog moved them to Laravel 12.
- **Three Flutter apps**: user, restaurant and deliveryman. The page says the [Restaurant app](https://codecanyon.net/item/stackfood-multi-restaurant-food-ordering-restaurant-app-v10/33935777) and the [Deliveryman app](https://codecanyon.net/item/stackfood-multi-restaurant-delivery-man-app-v10/33571770) are sold separately. From 9.3, Flutter Web is no longer supported, and a React user website is sold as an add-on.
- **A multi-restaurant model**: a default commission for all restaurants, a custom rate per restaurant, and an option to apply commission to delivery charges.
- **Restaurant subscriptions**: packages with a free trial, so restaurants can pay the platform a subscription instead of commission.
- **Zones** drawn on a map, with delivery charges per zone.

The user types are admin (with admin employees), restaurant (with restaurant employees, who can sign in to the restaurant app since 8.3), deliveryman and customer.

## License first

CodeCanyon's [Regular License](https://codecanyon.net/licenses/standard) covers one end product whose end users are not charged. Charging delivery businesses for your platform needs at least the Extended License, and that still covers one end product. The Restaurant and Deliveryman apps are separate items with their own licenses. Check all of them, and confirm your plan with the author.

The item page doesn't mention an official SaaS edition. What StackFood does have is restaurant subscriptions inside one marketplace, and that's a different thing. In StackFood, restaurants pay one delivery business. In your SaaS, many delivery businesses each pay you. Both kinds of billing exist after the conversion, and they must stay separate.

SaaS Laravel fits when you want to run StackFood for several delivery businesses at once:

- **A database per delivery business**, so one operator's orders, restaurants, riders and payouts never mix with another's. Our [database-per-tenant guide](/blog/multi-tenant-saas-laravel-database-per-tenant.html) covers the trade-offs.
- **A modern frontend** for the panels in Vue, React, Svelte or Livewire.
- **Code you own**, with one structure for sign-in, roles, menus and languages.

## How StackFood users map to tenant roles

The key decision: **one tenant is one delivery business**, not one restaurant. Restaurants are its customers, not yours.

| StackFood user | In SaaS Laravel |
| --- | --- |
| You, selling the platform | Central app, `super-admin` role |
| StackFood admin (the delivery business owner) | Tenant `super-admin`, created with the tenant |
| Admin employees | Tenant `admin`, `manager` or custom roles |
| Restaurant owner (vendor) | Tenant user with a custom "Restaurant Owner" role, linked to one restaurant |
| Restaurant employees | Tenant custom role, linked to the same restaurant |
| Deliveryman | Tenant record; signs in through the app, so out of scope until there's an API |
| Customer | Tenant record; orders through the user app, also waiting on the API |

So you end up with two layers of separation. The tenant database keeps delivery businesses apart. Inside it, the restaurant link keeps restaurants apart, just as StackFood does today. A restaurant owner must never see another restaurant's orders, even in the same tenant.

## What's tricky about converting StackFood

**The apps talk to an API the kit doesn't have.** The Flutter apps need a backend API, and the kit doesn't ship one. SaaS Laravel's kits are web apps built on Inertia or Livewire and don't include an HTTP API. That means the port covers the admin and restaurant panels, and the apps come later. When you get there, you'll need an API layer in the kit (our [Sanctum API tokens for SaaS](/blog/laravel-sanctum-api-tokens-saas.html) post is a starting point) and an answer for how each app finds its tenant: a build per delivery business, or a lookup before sign-in. Either way the app configuration changes, because each tenant lives at its own address.

Be honest with yourself about what that means. Until the API exists, customers can't place orders from the apps. You can still test the panels with seeded orders, but you can't launch a delivery business on the panels alone.

**Restaurant scoping must survive the move.** When you [convert Ultimate POS](/blog/convert-ultimate-pos-to-saas.html), you remove the business filter, because the tenant replaces it. Here it's the opposite. The restaurant filter is real business logic inside a tenant and every restaurant panel query keeps it. Ask for tests that prove it, next to the usual tenant isolation tests.

**Zones and delivery charges are geometry.** Zones are shapes on a map, and the app decides which zone an address is in before it prices delivery. Whatever way the source stores and checks those shapes, the port must give the same zone and the same charge for the same coordinates. Fixed test coordinates inside, outside and on the edge of a zone catch most mistakes.

**Commission and restaurant subscriptions are money.** The default rate, the per-restaurant rate and the delivery charge option all change payouts. Port them with the same rounding, and compare totals against the source for the same orders. Restaurant packages and trials are a feature of each delivery business, so they live in the tenant database. They are not your SaaS plans.

**Keys belong to the tenant.** Map keys, payment gateway credentials and mail settings are the delivery business's, not yours. They go in encrypted tenant settings, as described in [tenant settings in Laravel](/blog/laravel-tenant-settings.html). Anything the port sends through the queue, such as order notifications, keeps its tenant, because the kit's queue setup remembers which tenant a job belongs to ([multi-tenant queues](/blog/laravel-multi-tenant-queues.html)).

## Set up the folders

```bash
mkdir my-saas && cd my-saas
git clone https://github.com/the-erag/saas-laravel-starter-kit-vue.git kit
cp -r ~/Downloads/your-script source
cp kit/.env.example kit/.env
```

Edit `kit/.env` (at least `APP_URL`, `APP_DOMAIN` and the `DB_*` keys) and create that database. Then install and seed the kit:

```bash
cd kit && composer setup && php artisan db:seed && cd ..
```

```text
my-saas/
├── kit/      ← the AI agent writes here
└── source/   ← the AI agent only reads here
```

Use the `react`, `svelte` or `livewire` clone URL if you prefer another kit. For StackFood, `your-script` is the unzipped Laravel admin project, not the Flutter app projects, so the agent reads the panels and the API routes without wading through mobile code. The kit repositories are private, so you need [repository access](/docs/purchase/repository-access.html) from your purchase before you clone. The [installation docs](/docs/getting-started/installation.html) explain each setup step.

## The prompt

Paste this into Claude Code, Codex or Junie from the `my-saas` folder. The kit's `AGENTS.md`, `CLAUDE.md` and skill files come from [Laravel Boost](/blog/laravel-boost-ai-agents.html), so the agent knows the kit's conventions before it writes anything.

```text
Task: port the StackFood admin panel and restaurant panel into a multi-tenant
SaaS where each tenant is one food delivery business.

Ground rules for the two folders:
- ./kit is the project you edit, and the only one. Read kit/AGENTS.md and
  kit/CLAUDE.md, plus the skills they reference, before your first change.
- ./source is the StackFood Laravel project. Read it, never modify it.
- If any part of ./source isn't Laravel, document its behavior first, get my approval,
  then rebuild it the Laravel way. Never copy framework code across.

Tenancy model:
- One tenant = one delivery business, with its own database.
- Restaurants live inside a tenant. Restaurant owners and restaurant employees
  are tenant users with custom roles, each linked to one restaurant.
- The kit supplies sign-in, users, roles, permissions, menus, languages and
  notifications. Do not port StackFood's own auth, admin roles, menus or
  translation system.

Before you start: ask me which StackFood license I have. If it does not
allow charging delivery businesses for the platform, stop.

Five phases. After each one, stop, report what you did, and wait for "go".

Phase 1: Understand (read only, no code changes)
- Inventory the admin and restaurant panels: modules, tables, web routes,
  roles and employee permissions, business settings, jobs and schedules,
  uploads and integrations.
- Separately, list every API route the Flutter apps use, grouped by app
  (user, restaurant, deliveryman). Do not plan to port them yet.
- Explain how zones are stored and how an address is matched to a zone, and
  how commission and restaurant subscriptions are calculated.
- Propose a porting order and a plan per module.

Phase 2: Foundation
- Laravel 13 packages the panels need. Tenant migrations and models for
  zones, restaurants, menus and food items, orders, delivery charges,
  commission, restaurant packages and payouts.

Phase 3: Features, one module at a time
- Thin controllers, logic in service classes, validation the kit's way:
  Data objects in the Inertia kits, Form Requests in the Livewire kit.
- Pages in the kit's frontend for both panels, kit permissions, menu entries,
  translations, uploads (restaurant logos, food images) on the tenant disk,
  tenant-aware queued jobs for notifications and order updates.
- Pest tests per module, including tenant isolation (tenant A never sees
  tenant B's data) and restaurant isolation (restaurant X never sees
  restaurant Y's orders inside the same tenant).

Phase 4: Settings
- Delivery business settings (zone defaults, map key, payment gateways,
  commission defaults, business info) become tenant settings, stored
  encrypted where they are secrets. Platform settings become central admin
  settings for me.

Phase 5: Check
- Run tests, lint, static analysis, type checks and the frontend build.
- Create two demo tenants, each with two zones, three restaurants and some
  seeded orders.
- Summarize what was ported, what was skipped and why, and include the API
  route list from phase 1 as the backlog for the mobile apps.

StackFood rules:
- Every restaurant panel query stays scoped to the signed-in user's
  restaurant. Never drop that filter.
- The same coordinates must give the same zone and delivery charge as the
  source. Add tests with points inside, outside and on a zone edge.
- Commission (default, per restaurant, and on delivery charges) must give the
  same amounts and rounding as the source for the same orders.
- Restaurant packages and trials are a tenant feature. Keep them separate
  from my own SaaS billing and never merge the two.
- Do not port the mobile API or change anything the Flutter apps depend on.

Never:
- change ./source;
- build billing for my SaaS (leave a TODO where it would hook in);
- process real payments or integrate a payment gateway for customer orders,
  restaurant packages or payouts (stub them with TODOs);
- invent features StackFood does not have;
- weaken tenancy, auth or permission checks to make a test pass.
When you are stuck or unsure, ask me.
```

Expect phase 1 to take a while. The API route list it produces is worth keeping, because it's the to-do list for the apps. Our guide to [AI coding agents in Laravel](/blog/ai-coding-agents-laravel.html) covers how to check a plan like this before approving it.

## What's left for you

**The mobile apps.** Build an API layer in the kit from the phase 1 route list, decide how each app finds its tenant, and update the app configuration. This is likely the biggest remaining piece.

**Your own billing.** Delivery businesses pay you, which is separate from restaurants paying them. Follow [Laravel Stripe subscriptions for a SaaS](/blog/laravel-saas-stripe-billing.html) to bill the tenant.

**Importing existing installs.** If you already run StackFood for a delivery business, one install maps to one tenant. A sketch of an Artisan command you'd write yourself (not kit code):

```php
// php artisan stackfood:import {legacyConnection} {tenantId}
$tenant = Tenant::findOrFail($this->argument('tenantId'));
$legacy = DB::connection($this->argument('legacyConnection'));

$tenant->run(function () use ($legacy) {
    // zones -> restaurants -> food items -> customers -> orders -> payouts
    // copy uploads to the tenant disk, then compare order counts and
    // commission totals per restaurant with the legacy database
});
```

[Tenant migrations and seeders](/blog/laravel-tenant-migrations-seeders.html) explains how the tenant database is created before you fill it.

**Custom domains.** A delivery business will want its own domain for the panels, and later for the API. See [custom domains for Laravel tenants](/blog/laravel-tenant-custom-domains.html).

## Frequently asked questions

### Is each restaurant a tenant?

No. Each delivery business is a tenant. Restaurants are users and records inside it, kept apart by the same restaurant link StackFood uses today. Making each restaurant a tenant would split up a marketplace that StackFood runs as one: one admin, one set of zones and one customer base across many restaurants.

### Will the Flutter apps work after the conversion?

Not straight away. They need a backend API, and the kit doesn't include one. The prompt ports the web panels and saves the list of API routes the apps use, so you can build the API layer next.

### Does StackFood already have a SaaS version?

The item page doesn't mention one. It has restaurant subscriptions, which let restaurants pay one delivery business. A SaaS lets many delivery businesses run their own copy, each paying you.

### How much work is this?

The panels alone are days to weeks of review, depending on how many modules you keep. The API and app changes come on top of that. Plan for it in stages.

## Start your delivery SaaS

StackFood already solves the hard marketplace parts, and the conversion keeps those rules intact while giving every delivery business its own database. The kit adds sign-in, roles, menus, 17 languages and tenant-aware files and queues, so the agent can focus on orders, zones and payouts. It's a one-time purchase from $49 with weekly updates; see the [pricing page](/pricing.html).

<BlogPostCta title="One database per delivery business" text="SaaS Laravel gives every tenant its own database, with roles, menus, languages and tenant-aware queues built in. Port the StackFood panels onto it with your AI agent, one phase at a time." />
