---
title: "Convert Ultimate POS to a Multi-Tenant SaaS"
description: "Turn Ultimate POS into a multi-tenant SaaS with a database per business, keeping barcode scanning, receipts and stock rules intact."
pageClass: blog-page
date: 2026-11-26
author: erag
category: saas
tags: [Ultimate POS, SaaS, AI Agents]
---

# Convert Ultimate POS to a Multi-Tenant SaaS with a Database per Business

<BlogPostMeta />

Turning Ultimate POS into a multi-tenant SaaS means taking an app that already holds many businesses in one database and giving each business its own database instead. You keep the selling screen, barcode scanning, receipts and stock rules working exactly as before, and you move sign-in, roles, menus and languages onto a starter kit that was built for tenants. One phased prompt drives an AI coding agent through the port over a few sessions, and you review each phase. For an app this size, plan on days to weeks of review and testing.

This post is part of our series on [turning a CodeCanyon Laravel script into a SaaS](/blog/codecanyon-laravel-script-to-saas.html). Here we cover what's specific to a point of sale: stock that must never go negative by accident, cashiers at several locations, and hardware at the counter.

## What Ultimate POS does

[Ultimate POS](https://codecanyon.net/item/ultimate-pos-stock-management-point-of-sale-application/21216332) by thewebfosters is a Laravel point of sale, stock and invoicing app. The item page lists PHP 8.x and MySQL. It doesn't state the Laravel version. The main feature groups on the page are:

- **Products**: single and variable products, brands, categories, SKUs and low-stock alerts.
- **Sell**: an Ajax-based selling screen.
- **Purchases**, **contacts** (customers and suppliers) and **expenses**.
- **Reports**: purchase and sale, tax, stock, cash register and sales representative.

It ships with Admin and Cashier roles, supports custom roles and permissions, and assigns locations per user. Two facts matter most for a conversion. First, the core app is already multi-business, with inventory and accounting kept separately per business. Second, multi-location means storefronts or warehouses inside a business, each with its own stock, purchases and sales.

## Check your license first

CodeCanyon's [Regular License](https://codecanyon.net/licenses/standard) covers one end product whose end users are not charged. A SaaS charges its users, so you need at least the Extended License, and it still covers one end product. Read the license terms and confirm with the author before you build.

Ultimate POS has an official route too. The author sells the [SaaS & Superadmin Module for UltimatePOS Advance](https://codecanyon.net/item/saas-superadmin-module-for-ultimatepos-advance/22394431), an optional extension, not a standalone app. Its page lists subscription packages with trials, limits on locations, users, products and invoices, a superadmin who can add, view, deactivate or delete businesses, and several payment gateways. The item page also says the author does not support that item, and it links to a support page on ultimatefosters.com. If you want the quickest path to selling Ultimate POS as a service, start there.

SaaS Laravel is the better fit when you want something different from that module:

- **A database per business**, so one business's sales and stock can never show up in another's reports, and backups, restores and deletions happen one customer at a time. Our [database-per-tenant guide](/blog/multi-tenant-saas-laravel-database-per-tenant.html) explains the trade-offs.
- **A modern frontend** in Vue, React, Svelte or Livewire, with the same components on every screen.
- **Code you own** and change freely, in a structure your AI agent can follow.

## How Ultimate POS users map to tenant roles

Each Ultimate POS business becomes one tenant. You, the SaaS owner, live in the central app.

| Ultimate POS user | In SaaS Laravel |
| --- | --- |
| Superadmin (from the SaaS module) | Central app, `super-admin` role |
| Business owner | Tenant, `super-admin` role (created with the tenant) |
| Admin | Tenant `admin` role |
| Cashier | Tenant custom role "Cashier", limited to the selling screen and their register |
| Any custom role the business created | Tenant custom role with the same permissions |
| Customers and suppliers | Contact records in the tenant database, not login users |

Location access is not a role. A cashier at the north store and a cashier at the airport kiosk share the same "Cashier" role but have different locations assigned. That assignment stays as data on the user, as it is in the source.

## What's tricky about converting Ultimate POS

**The business column goes, the location column stays.** Because the source already separates businesses inside one database, most tables carry a business reference and most queries filter by it. Inside a tenant database there is only one business, so that filtering becomes dead weight and the agent should remove it carefully, one module at a time. Location filtering is different. It's real business logic inside a tenant and must stay exactly as it works today.

**Stock rules must stay exact.** Two cashiers selling the last unit at the same moment is a normal day in retail. If your copy has an overselling setting, keep it as it is, and where overselling isn't allowed, the stock check and the decrement have to happen inside one `DB::transaction` with a row lock, so the second sale sees the real quantity. Ask the agent to find every place stock changes: sales, purchases, returns, transfers between locations and manual adjustments.

**Barcode scanning and receipts are hardware facing.** Most USB scanners type the code and press Enter, and the Ajax selling screen is built around that. When the screen is rebuilt in the kit's frontend, the search field must keep focus, react to Enter, and add the item without a page reload. Receipt and invoice layouts must print at the same paper widths as before. Test these with a real scanner and printer, not just a browser.

**Cash registers and reports are per location and per shift.** Opening and closing a register, the cash register report and the tax report all depend on dates and locations. The agent should port them with the same totals and prove it with tests.

**Add-ons are separate products.** The author sells add-ons marked as SaaS compatible, such as [Essentials & HRM](https://codecanyon.net/item/essentials-module-for-ultimatepos/23643267) and the [WooCommerce addon](https://codecanyon.net/item/ultimatepos-to-woocommerce-addon-with-saas-compatible/22874559). Each has its own license. Leave them out unless you own them.

## Set up the folders

Keep the kit and the original script side by side, so the agent can read one and write the other.

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

Swap the clone URL for `react`, `svelte` or `livewire` if you prefer another kit, and replace `your-script` with the unzipped Ultimate POS folder. The kit repositories are private, so you need [repository access](/docs/purchase/repository-access.html) from your purchase before you clone. The [installation docs](/docs/getting-started/installation.html) explain each step.

## The prompt

Paste this into Claude Code, Codex or Junie from the `my-saas` folder. The kit ships `AGENTS.md`, `CLAUDE.md` and skill files from [Laravel Boost](/blog/laravel-boost-ai-agents.html), so the agent learns the kit's conventions before writing code.

```text
You are converting Ultimate POS (a Laravel point of sale) into a multi-tenant SaaS.

Projects:
- ./kit is the only project you edit. Read kit/AGENTS.md and kit/CLAUDE.md, and the
  skills they point to, before you change anything.
- ./source is Ultimate POS. It is read-only. Never change, move or delete anything in it.

Target model:
- Each Ultimate POS business becomes one tenant with its own database.
- Sign-in, users, roles, permissions, menus, languages and notifications come from the
  kit. Do not port Ultimate POS's own auth, role, menu or translation systems.
- Locations stay inside a tenant. One tenant can have many locations.

Before anything else: ask me which license I hold for Ultimate POS (Regular or
Extended) and whether the author's terms allow a paid multi-tenant SaaS. If they
don't, stop and tell me.

Work in five phases. Stop after each phase, report, and wait for me to say "go".

Phase 1 - Understand (no code changes)
- List the modules, tables, routes, roles and permissions, settings, scheduled and
  queued jobs, uploads and third-party integrations in ./source.
- Show every table and query that filters by business, and every one that filters by
  location. Mark which filters become unnecessary inside a tenant database.
- List every code path that changes stock (sale, purchase, return, transfer,
  adjustment) and every receipt or invoice layout.
- Write a migration plan, module by module, in the order you propose to port them.

Phase 2 - Foundation
- Add the Laravel 13 packages the features need (for example PDF or barcode libraries,
  only if the source uses them).
- Write tenant migrations and models for products, variations, stock per location,
  contacts, sales, purchases, payments, expenses and cash registers. Keep the business
  column for now and keep location columns. Remove business filters later, one module
  at a time, with tests showing nothing else changed.

Phase 3 - Features, one module at a time
- Thin controllers, logic in service classes, validation the kit's way: Data objects
  in the Inertia kits, Form Requests in the Livewire kit.
- Pages in the kit's frontend, permissions in the kit's config, menu entries,
  translations for every string, uploads on the tenant disk, queued jobs that are
  tenant-aware.
- Pest tests for each module, including tenant isolation: a user in tenant A can never
  see or change tenant B's products, sales or stock.

Phase 4 - Settings
- Split per-business settings (invoice layout, tax rates, currency, receipt printer
  options, location details) into tenant settings, and platform settings into central
  admin settings for me, the owner.

Phase 5 - Check
- Run the tests, lint, static analysis, type checks and the frontend build.
- Create two demo tenants with two locations each and sample stock.
- Write a summary: what was ported, what was skipped and why.

Ultimate POS rules:
- Barcode scanning must keep working: the sell screen search keeps focus, accepts a
  scanner's Enter key and adds the item without a page reload.
- Receipt and invoice printing must keep the source's layouts and paper widths.
- If the source has an overselling setting, keep it. Where overselling is not allowed, check and
  change stock inside one DB transaction with a row lock, on every path that changes
  stock. Add a test where two sales race for the last unit.
- Multi-location stays inside one tenant. A user only sees the locations assigned to
  them, exactly as in the source.
- Cash register open, close and report totals must match the source for the same data.
- Do not port the SaaS & Superadmin module or any paid add-on unless I say so.

General rules:
- Never change ./source.
- If any part of ./source isn't Laravel, document its behavior first, get my approval,
  then rebuild it the Laravel way. Never copy framework code across.
- No billing. Leave a TODO where subscription checks would go.
- Do not invent features Ultimate POS does not have.
- Never weaken tenancy, authentication or permission checks to make something work.
- When you are stuck or unsure, stop and ask me.
```

Expect the Understand phase alone to produce a long list. Read it properly, because the order of modules you approve decides how smoothly the rest goes. Products and stock come first, then sales, then reports. Our post on [working with AI coding agents in Laravel](/blog/ai-coding-agents-laravel.html) covers how to review each phase without rubber-stamping it.

## What's left for you

**Billing.** The prompt leaves billing out on purpose. When you're ready, follow [Laravel Stripe subscriptions for a SaaS](/blog/laravel-saas-stripe-billing.html) to bill the tenant, and map plan limits (locations, users) onto the TODOs the agent left.

**Importing existing businesses.** If you already run Ultimate POS for several shops, each business needs to move into its own tenant database. That's an Artisan command you write after the port, not something the kit ships. A sketch:

```php
// app/Console/Commands/ImportPosBusiness.php (your code, not the kit's)
// php artisan pos:import-business {businessId} {tenantId}
$tenant = Tenant::findOrFail($this->argument('tenantId'));

$tenant->run(function () {
    $old = DB::connection('legacy_pos');
    $id = $this->argument('businessId');

    // copy in dependency order: locations, products, variations,
    // stock, contacts, sales and their lines, payments, expenses
    $old->table('business_locations')->where('business_id', $id)
        ->orderBy('id')->chunk(500, function ($rows) {
            DB::table('business_locations')->insert(
                $rows->map(fn ($row) => (array) $row)->all()
            );
        });
});
```

The `legacy_pos` connection has to exist in `config/database.php`, pointing at the old Ultimate POS database. Check the real table names in your Ultimate POS version, then compare stock totals and sale counts per location before and after. Run it once per business, on a copy first. Our guide to [tenant migrations and seeders](/blog/laravel-tenant-migrations-seeders.html) shows how tenant databases are created and migrated.

**Custom domains.** Shops like their own address on receipts and in the browser. See [custom domains for Laravel tenants](/blog/laravel-tenant-custom-domains.html).

Building a POS product from scratch instead of converting Ultimate POS? Our guide to [build a POS and inventory SaaS with Laravel](/use-cases/laravel-pos-inventory-saas.html) covers the modules, roles and build order.

## Frequently asked questions

### Can I keep using the Ultimate POS SaaS & Superadmin Module instead?

Yes, if it fits you. It's the author's own route and it works with the rest of Ultimate POS. Pick a conversion to SaaS Laravel when you want a separate database per business, a new frontend and full control of the code.

### Do I have to remove the business ID from every table?

Not on day one. Inside a tenant database every row belongs to the same business, so the filter is redundant but harmless. The agent can remove it module by module, with tests proving nothing else changed.

### Will my barcode scanner and receipt printer still work?

They should, as long as the rebuilt screens keep the same behavior. That's why the prompt makes it a rule. Most scanners act like a keyboard, so the search field matters more than the scanner. Test both devices before you trust it.

### How do I stop two cashiers selling the same last item?

Check and decrement stock inside one database transaction and lock the stock row while you do it. The second sale then waits, sees zero and fails cleanly. The [Pest testing guide for multi-tenant apps](/blog/test-multi-tenant-laravel-pest.html) shows how to write the isolation tests around it.

## Start your Ultimate POS SaaS

Moving a POS onto a tenant-first base is real work, and you'll spend most of it reviewing stock logic and testing at the counter. The kit gives you sign-in, roles, menus, 17 languages, tenant-aware files and queues, and a database per business from the start. It's a one-time purchase from $49 with weekly updates, and the details are on the [pricing page](/pricing.html).

<BlogPostCta title="A database per business, ready for your POS" text="SaaS Laravel gives every customer their own database, with roles, menus, languages and tenant-aware queues already in place. Point your AI agent at it and port Ultimate POS one module at a time." />
