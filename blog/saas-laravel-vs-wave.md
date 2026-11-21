---
title: "SaaS Laravel vs Wave: Free SaaS Kit or Multi-Tenant Kit?"
description: "SaaS Laravel vs Wave compared: free MIT Wave with billing, blog and Filament admin, or a paid kit with database-per-tenant tenancy and four frontends."
pageClass: blog-page
date: 2026-11-21
author: erag
category: saas
tags: [Wave, Starter Kits, Comparison]
---

# SaaS Laravel vs Wave: A Free All-in-One SaaS Kit or a Paid Multi-Tenant Foundation?

<BlogPostMeta />

Wave from DevDojo is one of the best-known free Laravel SaaS kits. SaaS Laravel is our paid kit. People often look at both, and they're built for different kinds of products, so a feature-by-feature race doesn't help much. This post explains what each one gives you and who each one suits.

We make SaaS Laravel, so keep that in mind. To stay fair, every fact about Wave below comes from Wave's own website, docs and GitHub repository, checked in November 2026. Where we couldn't confirm something, we say so instead of guessing.

The short version: Wave is free, MIT-licensed and ships billing, a blog and a Filament admin panel on a Livewire stack. SaaS Laravel is paid, has no billing, and is built around a separate database for each tenant, with a choice of Vue, React, Svelte or Livewire.

## What Wave is

[Wave](https://devdojo.com/wave) is an open-source SaaS framework. Its homepage says it is "Open source and free", and the [repository](https://github.com/thedevdojo/wave) is MIT-licensed. When we checked in November 2026, the latest GitHub release was v3.7.3, published 17 November 2026, and the `composer.json` on the `main` branch required Laravel 13 and PHP 8.3.

The feature list on Wave's site and README is long:

- Authentication, user profiles and user impersonation
- Billing and subscription plans
- Roles and permissions (Spatie)
- Notifications, a changelog, a blog and pages
- An API
- A Filament-powered admin that manages users, posts, plans and settings
- Themes and plugins

The stack is Livewire, Alpine.js, Tailwind CSS and Filament. Its `composer.json` also pulls in Livewire Volt and Laravel Folio, and the docs have a guide on using Filament with Volt.

Billing works with Stripe or Paddle. You pick the provider with `BILLING_PROVIDER` in `.env`, according to the [billing docs](https://devdojo.com/docs/open-source/wave/features/billing). The homepage says plans can be one-time or recurring and are tied to user roles, so a plan upgrade changes what a user can do.

The [install docs](https://devdojo.com/docs/open-source/wave/install) use SQLite by default, with MySQL also documented. That makes it quick to get running on a laptop or a small server.

We didn't find team workspaces or multi-tenancy in Wave's own pages. DevDojo has a separate "Teams" package page in its docs, but nothing on it ties it to Wave. If you need teams, check their site.

## What SaaS Laravel is

SaaS Laravel is four Laravel 13 starter kits that share the same backend: Vue, React and Svelte (all on Inertia v3), and Livewire 4. It's built on Laravel's official starter kits, so the folders and conventions match what you know from them.

The center of the kit is multi-tenancy with stancl/tenancy in multi-database mode:

- A central database for your own admin side, plus **one database per tenant**.
- Each tenant is found by domain, as a subdomain of your app (`acme.your-domain.com`).
- Separate auth guards for central and tenant users. Cache, files and queued jobs are kept per tenant.
- Workspace statuses (Active, Trial, Pending Invitation, Suspended), signed invitations for tenant admins and per-tenant maintenance mode.

Around that you get Fortify auth with two-factor and passkeys, spatie roles and permissions, invitations, database-driven menus, in-app notifications and 17 languages. Admin screens are built in the kit's own frontend, not in Filament. The backend is split into modules with thin controllers and service classes, and every kit has Larastan at level 7, Pint and Pest tests set up.

What it doesn't have: billing, an HTTP API with tokens, a blog or a landing page builder. Billing is left out on purpose so you can choose your provider, but it does mean more work before you can charge anyone.

## SaaS Laravel vs Wave at a glance

| | Wave | SaaS Laravel |
| --- | --- | --- |
| Price | Free | Paid, one-time |
| License | MIT | Unlimited projects, no resale of the source |
| Billing | Stripe or Paddle, built in | Not included |
| Multi-tenancy | Not stated | Database per tenant, subdomains |
| Frontend | Livewire, Volt, Folio, Alpine | Vue, React or Svelte (Inertia), or Livewire |
| Admin panel | Filament | Built in the kit's own frontend |
| Blog and pages | Yes | No |
| Default database | SQLite (MySQL documented) | MySQL required |
| Laravel version | 13 (per `composer.json` on `main`) | 13 |

Wave facts as of November 2026, from [devdojo.com/wave](https://devdojo.com/wave) and the [GitHub repository](https://github.com/thedevdojo/wave).

## Where they really differ

### Price and license

Wave costs nothing and the MIT license lets you do almost anything with the code. That's hard to beat if budget is the main constraint, or if you want to read every line before you commit.

SaaS Laravel is a one-time payment per kit. As of November 2026 it's $49 for Livewire, $55 for Vue, $59 for Svelte, $69 for React, or $139 for all four. That gets you lifetime access to the private repository and weekly updates. You can use it in unlimited projects, for yourself or clients, but you can't resell or publish the source. There are no refunds, because the source code is delivered on payment.

### Billing

This is Wave's clearest advantage. Stripe and Paddle work out of the box, and plans connect to roles. If your product is "users sign up, pick a plan, get features", Wave saves you real work.

With SaaS Laravel you add billing yourself, usually with Laravel Cashier, and bill the tenant rather than the user. With Cashier and a hosted customer portal that's usually much less work than tenancy, but it's still work. Our guide to [Stripe subscriptions in a Laravel SaaS](/blog/laravel-saas-stripe-billing.html) shows how, and [Stripe vs Paddle vs Lemon Squeezy](/blog/stripe-vs-paddle-vs-lemon-squeezy-laravel.html) helps you pick a provider.

### Tenancy and data isolation

This is SaaS Laravel's clearest advantage. Each customer company gets its own database, its own subdomain, its own users, roles and menus. A query in one tenant's request can't read another tenant's rows, because it's connected to a different database. For B2B products where customers ask "where is my data and who can see it", that's a simple answer to give.

The cost is hosting. You need MySQL with a user that can create and drop databases, and a server that handles wildcard subdomains. Wave's SQLite default is much lighter. If you're unsure which model you need, read [Laravel teams vs multi-tenancy](/blog/laravel-teams-vs-multi-tenancy.html) and [single vs multi-database tenancy](/blog/single-vs-multi-database-tenancy-laravel.html) first.

### Frontend and admin

Wave is a Livewire app with a Filament admin. If you like the TALL stack, that's one consistent set of tools, and Filament gives you a lot of admin screens quickly.

SaaS Laravel lets you pick Vue, React, Svelte or Livewire, and the admin screens (tenants, domains, users, roles, menus) are pages in that same frontend. If your team writes React, you aren't learning Livewire and Filament on top. If your team loves Filament, that's a point for Wave. Our [Filament vs Inertia](/blog/filament-vs-inertia.html) post covers that trade-off in depth.

### Content features

Wave includes a blog, pages and a changelog. SaaS Laravel includes none of these. If your marketing site lives inside the app, Wave is ahead here. Many teams run their marketing site separately anyway, but count it if you don't.

## Who each one fits

**Pick Wave if:**

- You're a solo founder or small team and the budget is close to zero.
- Your product is B2C or simple B2B where each customer is a user, not a company with its own users.
- You want billing, a blog and an admin panel on day one.
- You like Livewire and Filament.

**Pick SaaS Laravel if:**

- You're building B2B software where each customer is a workspace with its own users, roles and data.
- Database-per-tenant isolation matters to your customers, or you expect it to later.
- Your team prefers Vue, React or Svelte, or wants one frontend stack for both customer and admin screens.
- You're fine adding billing with the provider you choose.

Neither is better in general. If you picked Wave for a multi-tenant B2B product, you'd likely build the tenant layer yourself. If you picked SaaS Laravel for a simple B2C app with a blog, you'd be paying for tenancy you don't need and building the parts Wave already has.

For the wider picture, see [Best Laravel SaaS starter kits in 2026, compared](/blog/best-laravel-saas-starter-kits.html).

## Frequently asked questions

### Is Wave really free?

Yes. Wave's homepage says it's open source and free, and the repository is MIT-licensed. You can use it in commercial projects. The cost is your time to learn and maintain it.

### Does Wave support multi-tenancy?

We didn't find multi-tenancy or team workspaces in Wave's own docs when we checked in November 2026. DevDojo lists a separate Teams package in its docs, but it isn't described as part of Wave. Check their site for the current state.

### Does SaaS Laravel include billing like Wave?

No. SaaS Laravel doesn't include billing. The tenant model lives in the central database and works as the billable model when you add Laravel Cashier with Stripe, Paddle or another provider.

### Can I use Wave with React or Vue?

Wave's stack is Livewire, Alpine.js and Filament, and its pages use Folio and Volt. We didn't find a React or Vue version on its site. If you need an Inertia frontend, SaaS Laravel has Vue, React and Svelte kits.

### Which one is easier to host?

Wave, for most people. It runs on SQLite by default. SaaS Laravel needs MySQL with permission to create databases and wildcard subdomains, because each tenant gets its own database and subdomain.

## Where SaaS Laravel fits

SaaS Laravel isn't trying to be a free Wave. It's for the case where tenants matter more than a built-in billing page: B2B products with separate databases, subdomains, central and tenant admin areas, roles, invitations and maintenance mode, all in the frontend your team already writes. Read how it works in [Multi-tenancy](/docs/core/multi-tenancy.html) and [Architecture](/docs/core/architecture.html), and see the kits: [Vue](/kits/vue.html), [React](/kits/react.html), [Svelte](/kits/svelte.html) and [Livewire](/kits/livewire.html).

If you need billing today, want to spend nothing, or are building a simple single-user product, Wave is the better pick, and we'd tell you so. If you're comparing more options, see [SaaS Laravel vs SaaSykit](/blog/saas-laravel-vs-saasykit.html) and our [Laravel Spark alternatives](/blog/laravel-spark-alternatives.html) roundup. Prices are on the [pricing page](/pricing.html).

<BlogPostCta title="Building B2B with separate tenant databases?" text="SaaS Laravel gives you database-per-tenant multi-tenancy, auth, roles and invitations in Vue, React, Svelte or Livewire. Billing is yours to add." />
