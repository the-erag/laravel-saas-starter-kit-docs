---
title: "Convert Stocky POS to a Multi-Tenant SaaS"
description: "Turn Stocky POS and inventory into a multi-tenant SaaS with a database per store, warehouses and stock kept apart, and one AI prompt."
pageClass: blog-page
date: 2026-11-26
author: annu-gupta
category: saas
tags: [Stocky, SaaS, AI Agents]
---

# Convert Stocky POS to a Multi-Tenant SaaS, Screen by Screen

<BlogPostMeta />

Stocky is sold to install once on your own server, and each install appears to serve one company with many warehouses. So turning it into a multi-tenant SaaS is mostly about two things: giving every company its own database, and moving Stocky's single-page Vue frontend onto the kit's frontend, one screen at a time. The data model needs fewer changes than you might expect. The frontend is where most of the hours go. One phased prompt drives an AI coding agent through the work over a few sessions, while you review every phase.

If you're new to this series, start with the overview on [turning a CodeCanyon Laravel script into a SaaS](/blog/codecanyon-laravel-script-to-saas.html). This post sticks to what's different about Stocky.

## What Stocky does

[Stocky POS](https://codecanyon.net/item/stockyultimate-inventory-management-system-with-pos/31445124) by ui-lib is an ERP, inventory, point of sale and invoicing app. The backend is Laravel on PHP 8.x and MySQL 8.x. The frontend is a Vue.js single-page app with Vuex and Vue Router. The item page doesn't state the Laravel or Vue version.

Its feature groups cover a lot of ground:

- Point of sale, product, purchase and sales management.
- HRM, accounting, and a CRM with leads and a sales pipeline.
- A kitchen display system for restaurants and cafes.
- A built-in online store, WooCommerce sync, and an install button for the PWA.
- Role-based access with unlimited custom roles and granular permissions.
- Unlimited warehouses, with stock transfers and per-warehouse reports.

## License, and the official Stocky SaaS

CodeCanyon's [Regular License](https://codecanyon.net/licenses/standard) is for one end product whose end users are not charged. The Extended License is required when end users pay, so a SaaS needs it, and it still covers only one end product. Read the terms and check with the author before you start.

ui-lib also sells [Stocky SaaS](https://codecanyon.net/item/stocky-pos-inventory-management-saas/62663753), a separate item. Each tenant gets a subdomain, a super admin panel manages tenants, plans, subscriptions and payments, and plans can be monthly or yearly with grace periods and automatic suspension. Version 1.5 adds a dedicated database user per tenant, and the 1.4 changelog moved its frontend to Vue 3 with Ant Design. If you want Stocky as a service with billing already built, that item is the shortest road, and we'd look at it first.

SaaS Laravel makes more sense when you want:

- **A database per company that you control**, created and migrated by your own code. The Stocky SaaS page doesn't say outright whether each tenant gets a separate database, so if that matters to you, ask the author. Our [database-per-tenant guide](/blog/multi-tenant-saas-laravel-database-per-tenant.html) explains why we chose it.
- **Your choice of frontend**: Vue, React, Svelte or Livewire, with Inertia instead of a separate SPA.
- **Code you own**, shaped around one kit's conventions, which your AI agent reads before every task.

## How Stocky users map to tenant roles

One Stocky company becomes one tenant. The base product appears to be single-company, so there's probably no business column to remove; phase 1 of the prompt checks this. If it holds, a whole install moves into a tenant as it is.

| Stocky user | In SaaS Laravel |
| --- | --- |
| You, running the platform | Central app, `super-admin` role |
| The company's first admin | Tenant `super-admin` (created with the tenant) |
| Managers | Tenant `manager` role, or a custom role |
| Cashiers and warehouse staff | Tenant custom roles with only the permissions they need |
| HRM employees | Employee records in the tenant database; a login only if they're also users |
| Customers, suppliers and CRM leads | Records in the tenant database, not login users |
| Online store shoppers | Not kit users; decide later how they sign in |

Stocky's own permission list is a good starting point for the kit's permission config files. Ask the agent to map each Stocky permission to a kit permission name, so the custom roles your customers create later behave the same way.

## What's tricky about converting Stocky

**The frontend is a separate app.** In Stocky, the browser runs a Vue SPA. Vue Router decides which screen to show, Vuex holds the state, and screens fetch their data from the Laravel backend. The kit works differently. A Laravel route and a thin controller return a page with its data as props, through Inertia (or a Livewire component in the Livewire kit). So every Stocky screen gets rebuilt:

- Each Vue Router route becomes a Laravel route with a permission check, and links use the kit's typed routes ([Wayfinder](/blog/laravel-wayfinder-typed-routes.html) in the Inertia kits).
- Data a screen used to fetch becomes props from a controller, prepared by a service class.
- Vuex stores mostly disappear. What's left is local form state and page props.
- Tables, forms and dialogs use the kit's components, so Stocky screens look like the rest of your app.

The Vue kit is the closest match, but you still rebuild rather than copy. The agent reads Stocky's components to learn what each screen does, then writes a new page. That keeps the agent from bolting a second frontend onto the kit.

**Warehouses and transfers.** Warehouses stay inside one tenant. A stock transfer takes stock out of one warehouse and puts it into another, and both sides must happen inside one `DB::transaction`, so a failure halfway never loses or creates stock. Sales and purchases need the same care. Stocky lets each product allow or prevent overselling, so keep those rules exactly as the source has them. Where overselling is blocked, check and change stock in one transaction with a row lock, so two cashiers can't sell the last unit twice.

**The POS screen has to stay fast.** Cashiers search or scan, build a cart and take payment. In the rebuilt page, the cart lives in page state and only checkout sends a request. Test it with a barcode scanner, which usually types the code and presses Enter. Stocky's POS can also work fully offline, which a server-rendered page won't do on its own, so decide in phase 1 whether you port that mode.

**WooCommerce, online store and kitchen display.** Each tenant connects its own WooCommerce shop, so the credentials belong in encrypted tenant settings. Sync runs in queued jobs, and the kit's queue setup remembers which tenant a job belongs to (see [multi-tenant queues in Laravel](/blog/laravel-multi-tenant-queues.html)). The online store is a public site for each tenant's shoppers, and the kitchen display is a screen that has to keep up with new orders. Both are worth porting, but after the core modules work.

**There's a lot of it.** POS, inventory, HRM, accounting and CRM are close to five apps. Port them in that order, and don't start HRM until the stock numbers match.

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

The Vue kit is the natural choice for a Vue team, but you can swap the clone URL for `react`, `svelte` or `livewire`. `your-script` is the unzipped Stocky folder. The kit repositories are private, so you need [repository access](/docs/purchase/repository-access.html) from your purchase before you clone. The [installation docs](/docs/getting-started/installation.html) list the steps.

## The prompt

Paste this into Claude Code, Codex or Junie from `my-saas`. Each kit includes `AGENTS.md`, `CLAUDE.md` and skills from [Laravel Boost](/blog/laravel-boost-ai-agents.html), and the prompt tells the agent to read them first.

```text
Goal: turn Stocky POS (Laravel backend + Vue single-page frontend) into a
multi-tenant SaaS built on the starter kit.

Where you may work:
- ./kit is the only project you change. Start by reading kit/AGENTS.md,
  kit/CLAUDE.md and the skills they list.
- ./source is Stocky. Treat it as read-only reference. Never edit it.

How the SaaS works:
- Every Stocky company becomes a tenant with its own database.
- The kit provides sign-in, users, roles, permissions, menus, languages and
  notifications. Do not port Stocky's login, role screens, menus or its
  translation files. Map Stocky's permissions onto the kit's permission config.

First, ask me which Stocky license I hold (Regular or Extended) and whether
the author's terms allow a paid multi-tenant SaaS. If they don't, stop there.

We go in five phases. At the end of each one, stop, summarize, and wait until
I reply "go".

1. Understand. No code changes.
   Inventory ./source: backend modules, tables, API routes, Vue Router routes,
   Vuex stores, roles and permissions, settings, jobs and scheduled tasks,
   uploads, and integrations (WooCommerce and anything else). Pair every Vue
   screen with the backend endpoints it calls. Confirm whether any table keeps
   several companies apart in one database. Propose a porting order and a
   plan for each module.

2. Foundation.
   Add the Laravel 13 packages the features need. Write tenant migrations and
   models for warehouses, products, stock per warehouse, transfers, purchases,
   sales, payments and contacts first; the other modules follow later.

3. Features, one module at a time (POS and inventory, then purchases and
   sales, then accounting, HRM and CRM).
   - Rebuild each Vue screen as a page in the kit's frontend using the kit's
     components and layouts. Read Stocky's components to understand behavior;
     do not copy Vuex stores or the Vue Router setup, and do not add a JSON API
     just to feed pages.
   - Thin controllers, logic in service classes, validation the kit's way
     (Data objects in the Inertia kits, Form Requests in the Livewire kit).
   - Permissions, menu entries, translations, uploads on the tenant disk,
     tenant-aware queued jobs.
   - Pest tests per module, including tenant isolation: tenant A must never
     read or change tenant B's warehouses, stock or sales.

4. Settings.
   Company settings (currency, taxes, receipt details, WooCommerce keys,
   warehouse defaults) become tenant settings. Platform-wide settings become
   central admin settings for me.

5. Check.
   Run tests, lint, static analysis, type checks and the frontend build. Make
   two demo tenants, each with two warehouses and some stock. Write a summary
   of what was ported, what was skipped, and why.

Stocky-specific rules:
- Warehouses stay inside one tenant. Users see the warehouses the source
  would show them, nothing more.
- A stock transfer moves stock out of one warehouse and into another inside
  one DB transaction. Stock is never created or lost. Test a failed transfer.
- Keep each product's overselling rule exactly as the source has it. Where
  overselling is blocked, sales check and change stock inside one DB transaction
  with a row lock, so the last unit can't be sold twice.
- The POS page keeps the cart in page state, supports a barcode scanner
  (typed code plus Enter), and sends one request at checkout.
- Stocky's POS also works offline. In phase 1, explain how its offline mode
  stores and syncs sales, and ask me whether to port it before you plan it.
- WooCommerce credentials are per tenant and stored encrypted; sync runs in
  queued, tenant-aware jobs.
- Ask me before starting the online store or the kitchen display. Leave the
  PWA install and anything from Stocky SaaS out.

Always:
- Never change ./source.
- If any part of ./source isn't Laravel, document its behavior first, get my approval,
  then rebuild it the Laravel way. Never copy framework code across.
- No billing: leave a TODO where plan limits or subscriptions would plug in.
- Do not add features Stocky does not have.
- Never loosen tenancy, auth or permission checks to get past an error.
- If you are stuck or unsure, ask me instead of guessing.
```

Phase 1 is where you'll learn the most. The list that pairs each Vue screen with the endpoints it calls is your map for the frontend work, and it's worth saving. Our post on [AI coding agents in Laravel](/blog/ai-coding-agents-laravel.html) has tips on reviewing an agent's plan before you say "go".

## What's left for you

**Billing.** Not part of the prompt. When you add it, [Laravel Stripe subscriptions for a SaaS](/blog/laravel-saas-stripe-billing.html) shows how to bill the tenant, and plan limits (warehouses, users) can go where the agent left TODOs.

**Moving existing installs.** If your install is single-company, as phase 1 should confirm, each existing install maps to one tenant. You can write an Artisan command that reads an old Stocky database and copies its rows into a new tenant database. It's your code, not the kit's:

```php
// php artisan stocky:import {legacyConnection} {tenantId}
$tenant = Tenant::findOrFail($this->argument('tenantId'));
$legacy = DB::connection($this->argument('legacyConnection'));

$tenant->run(function () use ($legacy) {
    // warehouses -> products -> stock -> contacts -> purchases -> sales -> payments
    // map old column names to the new tenant tables, chunk by id, then
    // compare stock per warehouse with the legacy totals
});
```

The legacy connection has to exist in `config/database.php`, pointing at the old Stocky database. Uploaded files such as product images go to the tenant's disk; see [tenant cache and file storage](/blog/laravel-tenant-cache-filesystem.html).

**Custom domains.** Stores often want their own domain, especially once the online store is live. See [custom domains for Laravel tenants](/blog/laravel-tenant-custom-domains.html).

Building a POS product from scratch instead of converting Stocky? Our guide to [build a POS and inventory SaaS with Laravel](/use-cases/laravel-pos-inventory-saas.html) covers the modules, roles and build order.

## Frequently asked questions

### Should I buy Stocky SaaS instead?

If you want a ready SaaS with plans and a super admin, look at Stocky SaaS first. Convert Stocky onto SaaS Laravel when you want to own the code, choose your frontend, and give each company a database your own code creates.

### Can I reuse Stocky's Vue components in the Vue kit?

Use them as a reference, not as code to paste in. They depend on Vuex and Vue Router, which the kit doesn't use. Rebuilt pages with the kit's components are easier to maintain and match the rest of the app.

### Do I need an API for the new frontend?

No. With Inertia, controllers pass data straight to pages, so there's no separate API to build or secure. If you need one later for a mobile app, add it on purpose.

### How long does a Stocky conversion take?

It depends on how many modules you keep. POS and inventory alone is days of review. With accounting, HRM and CRM, plan for weeks, mostly spent checking screens and stock numbers against the original.

## Build your Stocky SaaS

The hardest part of this conversion, rebuilding the screens, is also the part where you'll be glad to have one frontend instead of two. The kit gives you tenant databases, roles, menus, 17 languages and tenant-aware files and queues, so the agent can spend its time on Stocky's features. It's a one-time purchase from $49 with weekly updates; see the [pricing page](/pricing.html).

<BlogPostCta title="Give every store its own database" text="SaaS Laravel brings database-per-tenant multi-tenancy, roles, menus and languages in Vue, React, Svelte or Livewire. Rebuild Stocky's screens on it with your AI agent, one module at a time." />
