---
title: "Convert Booking Core to a Multi-Tenant SaaS"
description: "Turn Booking Core into a multi-tenant SaaS: each tenant gets its own booking site and database, with rules that prevent double bookings."
pageClass: blog-page
date: 2026-11-26
author: erag
category: saas
tags: [Booking Core, SaaS, AI Agents]
---

# Convert Booking Core to a Multi-Tenant SaaS with a Booking Site per Tenant

<BlogPostMeta />

To turn Booking Core into a multi-tenant SaaS, every business you sign up becomes a tenant with its own database, its own subdomain and its own public booking site, while sign-in, roles and menus come from a SaaS starter kit. The hard parts are specific to booking software: two guests must never get the same room or seat, the built-in vendor marketplace has to stay inside one tenant, and each tenant should only see the booking types it actually sells. Below is how we'd plan it, plus a phased prompt for an AI coding agent.

This post is part of our series on [turning a CodeCanyon Laravel script into a SaaS](/blog/codecanyon-laravel-script-to-saas.html). Here we only cover what's different about Booking Core.

## What Booking Core does

[Booking Core](https://codecanyon.net/item/booking-core-ultimate-booking-system/24043972) is a Laravel booking system by BookingCore, with an official site at [bookingcore.co](https://bookingcore.co/). Its 4.0.0 release moved it to Laravel 12 and PHP 8.2, and it supports MySQL and MariaDB only.

It's built from booking modules: Hotel (with rooms), Space, Tour, Car, Event, Boat, Flight and, since 4.0.0, Visa. Modules can be disabled (the 1.9.2 changelog fixes an "Issue while Disabling the Car module"). Around those it has calendar availability, iCal sync, multiple languages and currencies, and gateways including Stripe, PayPal, 2Checkout, Paystack and Payrexx.

It's also a multi-vendor marketplace already. The changelog shows a commission system (1.3.0), vendor payouts (1.4.0), vendor dashboards and profiles, vendor coupons (3.6.0) and a way to turn commission off per vendor (1.9.0). Roles are admin, vendor and customer, customers can upgrade to vendor from their panel, and an RBAC module arrived in 3.0.0. A Mobile API was added in 1.8.0.

If you plan to run a business on it for years, note that the item page currently asks buyers whether they want development to continue. Once the features live in your own kit, you own that code either way.

## Check your license first

Under Envato's [standard licenses](https://codecanyon.net/licenses/standard), the Regular License covers one end product whose end users aren't charged. If end users pay to use the end product, you need the Extended License. Both cover one end product.

A paid booking SaaS falls on the Extended side. Read the terms on the item page and ask the author before you build, especially since you'll be serving many businesses from one product. We couldn't find an official SaaS edition of Booking Core on either of its pages, so a conversion like this one is the route if you want a multi-tenant version.

## Vendors are not tenants

This is the distinction to get right before writing any code.

A **tenant** is your customer. It's a business that pays you, gets its own database and subdomain, and runs its own admin. A **vendor** is your tenant's customer. It's a hotel owner or tour guide who lists services on that tenant's marketplace and receives payouts minus the tenant's commission.

So the marketplace moves inside the tenant, unchanged in spirit. Commission rates, payouts and vendor coupons are the tenant's business with its vendors. They have nothing to do with how you bill the tenant. A vendor who works with two of your tenants simply has two accounts, one in each database, and neither can see the other.

There's one exception. If your product idea is "every guesthouse gets its own booking site", then the guesthouse is the tenant and you'd likely drop the multi-vendor module altogether. Decide which product you're building before phase one.

| Booking Core user | In the SaaS |
| --- | --- |
| You, the platform owner | Central app on your main domain (super admin) |
| Admin (the site owner) | Tenant `super-admin`, created with the tenant |
| Admin staff (Booking Core RBAC roles) | Tenant roles and permissions from the kit |
| Vendor | Tenant role, limited to their own services, bookings and payouts |
| Customer with an account | Customer account on that tenant's booking site |
| Guest | No account; books on the tenant's public site where the source allows it |

The customer row needs a decision. The kit's tenant users are workspace staff with roles and menus. Customers can live in that same table with a role that has no admin permissions, or they can get their own guard. We have the agent propose one in phase one and wait for your answer.

## What's tricky about Booking Core

**Double bookings.** Two guests clicking "book" on the last room at the same moment is a real race. Checking availability and then inserting the booking in two separate steps isn't safe. The check and the insert have to happen inside one database transaction, with a row lock on what's being booked. A sketch of the shape (this isn't kit code):

```php
public function book(Unit $unit, BookingData $data): Booking
{
    return DB::transaction(function () use ($unit, $data) {
        $unit = Unit::query()->whereKey($unit->id)->lockForUpdate()->firstOrFail();

        $taken = Booking::query()
            ->whereBelongsTo($unit)
            ->whereIn('status', ['pending', 'confirmed'])
            ->where('start_at', '<', $data->end_at)
            ->where('end_at', '>', $data->start_at)
            ->sum('quantity');

        if ($taken + $data->quantity > $unit->capacity) {
            throw new UnitUnavailableException;
        }

        return $unit->bookings()->create($data->toArray());
    });
}
```

Capacity differs per module (a hotel has a number of rooms, a tour has seats), and dates blocked by an iCal import count as taken too, so the import job should take the same lock on the unit before it writes. Booking Core's booking form has a number-of-rooms field (its 1.5.0 changelog lists "number of rooms"), which is why the sketch sums a `quantity` column instead of counting rows. Find out how the source holds unpaid bookings and keep that behavior.

**Booking modules per tenant.** A car rental company doesn't want Hotel, Flight and Visa menus. Booking Core's changelog shows modules can be disabled; phase 1 finds out how your copy does it. In the SaaS that becomes a tenant setting: a disabled module has no routes, menu entries or permissions for that tenant. The kit's menus are database-driven with permission checks, which helps.

**Guest payments are not your billing.** Guests pay the tenant through the tenant's own Stripe or PayPal account. Those keys are tenant settings, stored encrypted. Your SaaS subscription is a separate system on the central side.

**iCal sync is per-tenant background work.** Each tenant's feeds must be fetched in that tenant's context. The kit's queued jobs remember their tenant; scheduling a loop over tenants is covered in [scheduled tasks for multi-tenant Laravel](/blog/laravel-multi-tenant-scheduled-tasks.html).

**A public site on each tenant domain.** The kit identifies the tenant by subdomain and gives you an authenticated workspace. The public search, service pages and checkout are new routes on the tenant domain, outside the admin's auth middleware, with rate limits on the forms.

**The Mobile API.** The Vue, React and Svelte kits are Inertia apps with no separate HTTP API. Leave the Mobile API out of scope and add an API layer later if you need it.

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

Swap the clone URL for the React, Svelte or Livewire kit if you prefer one of those. The kit repositories are private, so you need [repository access](/docs/purchase/repository-access.html) from your purchase before you clone. `your-script` is the unzipped Booking Core folder. [Installation](/docs/getting-started/installation.html) has the details.

## The prompt

Paste this into Claude Code, Codex or Junie from the `my-saas` folder. It works in phases on purpose: you review each one before the agent moves on. For a script this size, expect several sessions and days of review, not an afternoon. The prompt points the agent at the kit's Laravel Boost guidelines and skills first ([what Boost gives an agent](/blog/laravel-boost-ai-agents.html)), and our guide to [AI coding agents for Laravel](/blog/ai-coding-agents-laravel.html) has tips for long tasks.

```text
This folder holds two projects.

./kit is a SaaS Laravel starter kit and the only project you edit. Read
kit/AGENTS.md and kit/CLAUDE.md first, then the matching skills in
kit/.agents/skills or kit/.claude/skills before each task.

./source is Booking Core, a Laravel booking system. It is read-only. Never
edit, move or delete anything in it.

Goal: rebuild Booking Core inside the kit as a multi-tenant SaaS. Every
business I sign up is a tenant with its own database and subdomain.
Sign-in, users, roles, permissions, menus, languages and notifications come
from the kit, so don't port Booking Core's auth, RBAC module, menus or
translation system. Booking Core is Laravel: read its logic to understand
it, but write new code in the kit's structure (Modules/, services, kit
conventions) instead of copying its module loader or folders.

Before anything else, ask me which CodeCanyon license I hold (Regular or
Extended) and whether the author's terms allow a paid multi-tenant SaaS. If
they don't, stop and tell me.

Work in five phases. After each one, stop, show me what you did and wait
for me to say "go".

Phase 1 - Understand (no code changes)
For each booking module (Hotel, Space, Tour, Car, Event, Boat, Flight,
Visa) list what it stores: services, rooms or units, prices, capacity,
availability, extras. Trace the booking flow from search to payment,
including how unpaid bookings are held or expire and whether guests can
book without an account. Map the vendor features: commission, payouts,
vendor coupons, the vendor dashboard, customer-to-vendor upgrade. Also list
tables, routes, roles, settings, scheduled jobs (iCal sync), uploads,
payment gateways and currencies. Propose how customer accounts fit next to
the kit's tenant users. End with a migration plan and what you'd skip.

Phase 2 - Foundation
Add the Laravel 13 packages the features need, tenant migrations in
database/migrations/tenant, and models. Services, bookings, vendors and
customers all live in the tenant database.

Phase 3 - Features, one booking module at a time, in the order I choose
Thin controllers, logic in service classes, validation the kit's way (Data
objects in the Vue, React and Svelte kits, Form Requests in the Livewire
kit), admin and vendor pages in the kit's frontend, permissions, menu
entries, translations, images on the tenant disk, tenant-aware queued jobs,
and Pest tests. Tests must prove tenant isolation: tenant A never sees
tenant B's services, bookings, vendors or customers. Build each module's
public pages and checkout on the tenant subdomain as you go.

Phase 4 - Settings
Tenant settings: business details, enabled modules, currencies, commission
defaults, the tenant's own gateway keys for guest payments (encrypted), iCal
feeds. Central settings: what I control as the platform owner.

Phase 5 - Check
Run the tests, lint, type checks and the frontend build, and fix failures.
Create two demo tenants with different modules enabled. Write a summary of
what you ported, what you skipped and why.

Booking rules:
- Never double-book. Run the availability check and the insert in one DB
  transaction with a row lock (lockForUpdate) on the unit being booked.
  Count capacity the way the source does and treat iCal-imported blocks
  as taken.
- Each tenant's public booking site lives on its subdomain, outside the
  admin auth. Guests book without an account where the source allows it.
  Rate-limit the booking and enquiry forms.
- A tenant only gets the modules it enables. Disabled modules have no
  routes, menus or permissions for that tenant.
- Vendors belong to one tenant. A vendor is a role inside that tenant's
  database and sees only their own services, bookings and payouts.
- Guest payments go to the tenant's own gateway account, never mine.
- The Mobile API is out of scope. Note what it exposed in the summary.

General rules:
- Never change ./source.
- If any part of ./source isn't Laravel, document its behavior first, get my approval,
  then rebuild it the Laravel way. Never copy framework code across.
- No SaaS billing. Leave a TODO where it would go.
- Don't invent features Booking Core doesn't have.
- Never weaken tenancy, auth or permission checks to make something pass.
- When you're stuck or unsure, stop and ask me.
```

## What's left for you

**Billing.** The prompt leaves a TODO. Bill the tenant on the central side, not the guest; [Stripe subscriptions for a Laravel SaaS](/blog/laravel-saas-stripe-billing.html) walks through it. Later you could tie the number of enabled booking modules to a plan.

**Importing existing installs.** If businesses already run Booking Core, write an Artisan command that creates the tenant, reads their old database and inserts into the new tenant tables. Keep booking references unchanged, import in dependency order (services and units, then customers, then bookings), check future bookings first, and run it twice against a copy so you can compare counts. That command is yours to write; the kit doesn't ship one. [Tenant migrations and seeders](/blog/laravel-tenant-migrations-seeders.html) shows how to work in a tenant's context from the command line.

**Custom domains.** A tenant's booking site on `book.their-hotel.com` looks better than a subdomain. See [custom domains for tenants](/blog/laravel-tenant-custom-domains.html).

## Frequently asked questions

### Can I keep Booking Core's multi-vendor marketplace in the SaaS?

Yes. It moves inside each tenant. Vendors become a role in that tenant's database, and commission and payouts stay between the tenant and its vendors.

### How do I stop double bookings across tenants?

You don't need to, because tenants never share inventory. Each tenant has its own database, so the risk is within one tenant: run the availability check and the insert in one transaction with a row lock.

### Who receives the guest's payment?

The tenant, through its own gateway keys stored in tenant settings. Your SaaS subscription is billed separately on the central side.

### Can each tenant choose its booking types?

Yes. Make the enabled modules a tenant setting, and hide routes, menus and permissions for modules a tenant hasn't turned on.

## Start from the tenant foundation

SaaS Laravel gives you database-per-tenant multi-tenancy, subdomains, Fortify auth, roles, permission-checked menus and 17 languages, so your agent spends its time on bookings instead of plumbing. The [multi-tenancy docs](/docs/core/multi-tenancy.html) show how the central app and tenants fit together, and kits are a one-time purchase on the [pricing page](/pricing.html).

<BlogPostCta title="Your booking SaaS starts here" text="A Laravel 13 kit with a database per tenant, subdomains, auth and roles in Vue, React, Svelte or Livewire. Bring Booking Core, keep the booking rules, own the code." />
