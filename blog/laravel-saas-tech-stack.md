---
title: "Laravel SaaS Tech Stack: Our Pick for Every Layer in 2026"
description: "The Laravel SaaS tech stack we'd pick in 2026, layer by layer: frontend, auth, tenancy, billing, queues, search, monitoring and hosting, with alternatives."
pageClass: blog-page
date: 2026-11-11
author: erag
category: architecture
tags: [Architecture, Tooling, SaaS]
---

# Laravel SaaS Tech Stack in 2026: What We'd Pick for Every Layer, and Why

<BlogPostMeta />

**Short answer:** A sensible Laravel SaaS tech stack in 2026 is Laravel 13 with Inertia (Vue, React or Svelte) or Livewire, Fortify for auth, stancl/tenancy and spatie/laravel-permission, Cashier for billing, Redis with Horizon for queues, and Nightwatch or Sentry for monitoring. Most of it is first-party, so the pieces are built to work together. The real decisions are your frontend, your tenancy model and your host.

Every few weeks someone in a Laravel Discord asks "what's the best stack for a Laravel SaaS?" and gets forty answers. Half are about a package the person happens to love. The other half are "it depends", which is true and no help when you have a free weekend and an idea.

So here's the stack we'd actually use if we started a SaaS today, one layer at a time. For each layer you get our pick, a sensible alternative, and the reason. Where we've already written a deep guide on a layer, we link to it instead of repeating it. For how these layers fit together at runtime, see our [Laravel SaaS architecture](/blog/laravel-saas-architecture.html) map.

## How we picked this Laravel SaaS tech stack

We used three rules. First, prefer what Laravel maintains itself, because it gets upgraded alongside the framework and your AI agent probably knows it already. Second, pick boring tools with good docs over clever ones. Third, every layer must have a cheap way to start and an obvious way to grow.

To keep it concrete, imagine you're building an invoicing app for small accounting firms. Each firm is a customer with its own staff and its own clients. Keep that picture in mind as we go.

## Frontend: Inertia with Vue, React or Svelte, or Livewire

**Our pick:** Inertia v3 with whichever of Vue, React or Svelte your team already knows. You get a modern single-page app with no separate API to build, version and secure.

**Alternative:** Livewire 4 with Blade. It's great if you'd rather stay in PHP and your screens are mostly forms, tables and dashboards.

Neither is wrong. We compare them properly in [Livewire vs Inertia](/blog/livewire-vs-inertia.html), and if you've picked Inertia, [Vue, React or Svelte for your Laravel SaaS](/blog/vue-react-or-svelte-laravel-saas.html) helps with the next choice.

## UI kit: shadcn components with Tailwind v4

**Our pick:** shadcn/ui for React, shadcn-vue or shadcn-svelte, styled with Tailwind CSS v4. The components are copied into your repo, so you own them and can change anything.

**Alternative:** Flux UI if you chose Livewire. It's what Laravel's own Livewire starter kit uses. The base package is free, and a paid Pro tier adds bigger components.

Don't design your own buttons in week one. See [shadcn for Laravel](/blog/shadcn-laravel-inertia.html).

## Authentication: Fortify, with passkeys and 2FA

**Our pick:** Laravel Fortify, which is what the official Laravel 13 [starter kits](https://laravel.com/docs/13.x/starter-kits) use under the hood. It handles login, registration, password reset, email verification and two-factor auth, and passkeys through the `laravel/passkeys` package.

**Alternative:** Add Socialite for "Sign in with Google" on top. It's a nice extra for business users, not a replacement for proper accounts.

Please don't write your own auth. Our [Fortify tutorial](/blog/laravel-fortify-tutorial.html) and the [passkeys guide](/blog/laravel-passkeys.html) cover the setup.

## Multi-tenancy: stancl/tenancy

**Our pick:** `stancl/tenancy` v3. It identifies the tenant from the domain and switches the database, cache, file storage and queue context for you. It supports both a single shared database and a database per tenant.

**Alternative:** `spatie/laravel-multitenancy`, which is smaller and more hands-on. Or no tenancy package at all: a `team_id` column and global scopes work for simpler products.

This is the hardest decision to change later, so read [single vs multi-database tenancy](/blog/single-vs-multi-database-tenancy-laravel.html) before you write a migration. The [stancl/tenancy tutorial](/blog/stancl-tenancy-tutorial.html) gets you running. If you're not sure you need tenancy at all, start with [teams vs multi-tenancy](/blog/laravel-teams-vs-multi-tenancy.html).

## Roles and permissions: spatie/laravel-permission

**Our pick:** `spatie/laravel-permission`. It's the package most Laravel developers have already used, it works with Gates and Policies, and it's easy to seed per tenant.

**Alternative:** Plain Laravel Gates and Policies, if your app really only has "owner" and "member".

Most SaaS apps end up needing custom roles sooner than you'd think. See [roles and permissions with Spatie](/blog/laravel-roles-permissions-spatie.html).

## Database and cache: MySQL or PostgreSQL, plus Redis

**Our pick:** MySQL or PostgreSQL, whichever you can run and back up with confidence. Add Redis for cache, sessions and queues.

**Alternative:** SQLite is fine for local development and tests. We wouldn't run a multi-tenant production app on it.

Redis matters more in a multi-tenant app than you'd think: stancl's cache bootstrapper needs a cache store that supports tags, and `file` or `database` don't. Details in [tenant-aware cache and file storage](/blog/laravel-tenant-cache-filesystem.html).

## Billing: Cashier for Stripe or Paddle

**Our pick:** Laravel Cashier. `laravel/cashier` for Stripe, or `laravel/cashier-paddle` if you'd rather have Paddle act as merchant of record and deal with sales tax and VAT.

**Alternative:** Lemon Squeezy with its own Laravel package, also a merchant of record.

Bill the tenant, not the user, and keep subscriptions in the central database. We explain why in [Laravel Stripe subscriptions for a SaaS](/blog/laravel-saas-stripe-billing.html), and the tax side in [Stripe vs Paddle vs Lemon Squeezy](/blog/stripe-vs-paddle-vs-lemon-squeezy-laravel.html).

## Queues: Redis with Horizon

**Our pick:** Redis queues with Laravel Horizon. You get a dashboard, metrics, tags and worker settings that live in `config/horizon.php` instead of on a server somewhere.

**Alternative:** The `database` queue driver. It's the default in new Laravel apps and fine for your first customers.

Two things to know. Horizon requires Redis and, per the Laravel docs, doesn't support Redis Cluster. And in a multi-tenant app every job must know which tenant it belongs to, which is covered in [queued jobs in a multi-tenant Laravel app](/blog/laravel-multi-tenant-queues.html).

## Real-time: Reverb

**Our pick:** Laravel Reverb, Laravel's own websocket server. It speaks the Pusher protocol, so Laravel Echo works with it out of the box.

**Alternative:** Pusher Channels if you can't run long-lived processes. Or just polling, which is honestly enough for a notification count.

You probably don't need it on day one. When you do, read [Reverb real-time notifications](/blog/laravel-reverb-real-time-notifications.html).

## API: Sanctum, only when a customer asks

**Our pick:** No public API at launch. When customers want integrations, add Laravel Sanctum API tokens, issued per tenant.

**Alternative:** Laravel Passport, if you really need full OAuth2 for third-party apps. Most SaaS products don't. See [Sanctum with stancl/tenancy](/blog/laravel-sanctum-api-tokens-saas.html).

## Search: Scout, then Meilisearch or Typesense

**Our pick:** Laravel Scout with its database engine to start. Move to Meilisearch or Typesense once you need typo tolerance, facets or speed on large tables. Scout also supports Algolia.

**Alternative:** Plain `where ... like` queries. Fine for a while. Not fine at a million invoices.

Search gets tricky with a database per tenant, because you need to decide between one shared index and one index per tenant. See [Laravel Scout multi-tenant search](/blog/laravel-scout-multi-tenant-search.html).

## Email: a real email service, queued

**Our pick:** Postmark, Amazon SES, Resend or Mailgun, all supported by Laravel's mailer. Use Mailpit or a similar catcher locally.

**Alternative:** Your host's SMTP server. Don't. Deliverability is a product feature, and password reset emails in spam cost you customers.

Queue every mail and think about tenant branding and language early. See [Laravel SaaS emails](/blog/laravel-saas-transactional-emails.html).

## File storage: S3-compatible object storage

**Our pick:** Any S3-compatible bucket through Laravel's `s3` disk, with each tenant's files under its own prefix.

**Alternative:** The local disk, if you have exactly one server and good backups. It breaks as soon as you add a second server or move to a host with an ephemeral disk.

## Feature flags: Pennant

**Our pick:** Laravel Pennant, scoped to the tenant rather than the user, so a whole firm sees a beta feature at once.

**Alternative:** A `plan` column and a config file. That's enough until you want gradual rollouts.

Keep "feature flags" and "what your plan includes" apart in your head. [Pennant feature flags for a multi-tenant SaaS](/blog/laravel-pennant-feature-flags.html) shows how.

## Monitoring: Nightwatch, Pulse and Sentry

**Our pick:** Laravel Nightwatch. It's Laravel's own fully managed monitoring service: it traces requests, jobs and queries, groups exceptions into issues, stores logs and sends alerts. There's a free tier; check the [Nightwatch site](https://laravel.com/nightwatch) for current plans.

**Alternatives:** Laravel Pulse is open source and self-hosted, with an aggregated dashboard of slow queries, jobs and endpoints. It's a good free starting point if you'd rather not send data to anyone. Sentry (`sentry/sentry-laravel`) is the pick if you also want frontend JavaScript errors in the same place.

Whatever you choose, add health checks and an uptime monitor too. See [Laravel health checks for a multi-tenant SaaS](/blog/laravel-health-checks-multi-tenant.html). Telescope is for local debugging, not production.

## Testing: Pest

**Our pick:** Pest. Readable tests, quick to write, and widely used across the Laravel ecosystem.

**Alternative:** PHPUnit. Pest runs on top of it anyway.

Multi-tenant apps need tests that actually create a tenant and switch into it. See [testing a Laravel SaaS with Pest](/blog/laravel-saas-testing-pest.html).

## Code quality: Larastan and Pint

**Our pick:** Larastan for static analysis and Pint for code style, both in CI. Larastan catches the "this can be null" bugs before your customers do.

**Alternative:** Plain PHPStan without the Laravel extension, which knows much less about Eloquent. See [Larastan and Pint](/blog/laravel-larastan-pint.html).

## AI tooling: Laravel Boost

**Our pick:** Laravel Boost. It gives Claude Code, Cursor and other agents version-aware guidelines, skills and an MCP server that can read your routes, schema and logs.

**Alternative:** Hand-written `AGENTS.md` rules. Better than nothing, but they go stale. More in [Laravel Boost for AI agents](/blog/laravel-boost-ai-agents.html).

## Hosting: Laravel Cloud, Forge or a VPS

**Our pick:** Laravel Forge on one VPS for your first customers. It's predictable, you control the database server, and wildcard TLS for tenant subdomains is straightforward.

**Alternatives:** Laravel Cloud if you don't want to look after a server and want autoscaling later; test tenant database creation on it first. Or a bare VPS you manage yourself, if you enjoy that sort of thing.

We compare them in [Laravel Cloud vs Forge vs Vapor](/blog/laravel-cloud-vs-forge-vs-vapor.html), and the deploy script itself is in [deploying a Laravel SaaS](/blog/deploy-laravel-saas.html).

## Copy this Laravel SaaS stack

| Layer | Our pick | Alternative |
| --- | --- | --- |
| Backend | Laravel 13 | None, that's the point |
| Frontend | Inertia v3 + Vue, React or Svelte | Livewire 4 + Blade |
| UI kit | shadcn + Tailwind v4 | Flux UI |
| Auth | Fortify + passkeys + 2FA | Add Socialite |
| Multi-tenancy | stancl/tenancy v3 | spatie/laravel-multitenancy, or `team_id` |
| Roles | spatie/laravel-permission | Gates and Policies |
| Database | MySQL or PostgreSQL | SQLite for local and tests |
| Cache and sessions | Redis | Database (no cache tags) |
| Billing | Cashier (Stripe or Paddle) | Lemon Squeezy |
| Queues | Redis + Horizon | Database driver |
| Real-time | Reverb | Pusher, or polling |
| API | Sanctum, when needed | Passport |
| Search | Scout + Meilisearch or Typesense | Scout database engine |
| Email | Postmark, SES, Resend or Mailgun | None worth it |
| Files | S3-compatible storage | Local disk (one server only) |
| Feature flags | Pennant | Plan column + config |
| Monitoring | Nightwatch | Pulse, Sentry |
| Testing | Pest | PHPUnit |
| Code quality | Larastan + Pint | PHPStan |
| AI tooling | Laravel Boost | Hand-written rules |
| Hosting | Forge + VPS | Laravel Cloud |

## Laravel SaaS stack for a solo founder vs a team

**Solo founder:** cut it down. Database queues, Scout's database engine, no Reverb, Pulse or the free Nightwatch tier, and one Forge server. Every service you add is one more thing to break at 2am. Add the rest when a customer needs it. Our [30-day MVP plan](/blog/build-saas-mvp-laravel.html) is written for exactly this.

**A team of three or more:** take the whole table. Horizon, a proper search engine and a managed monitoring service pay for themselves once more than one person is on call. Add Larastan to CI on day one, because it's the cheapest code review you'll ever get.

## Frequently asked questions

### What is the best stack for a Laravel SaaS?

Laravel 13 with Inertia (Vue, React or Svelte) or Livewire, Fortify for auth, stancl/tenancy for multi-tenancy, spatie/laravel-permission for roles, Cashier for billing and Redis with Horizon for queues. Pick the frontend your team already knows; the rest is fairly standard.

### Should I use Livewire or Inertia for a SaaS?

Use Inertia if your team is comfortable with Vue, React or Svelte, or if the app has a lot of client-side interaction. Use Livewire if you'd rather stay in PHP and Blade. Both are first-party and both are well suited to SaaS work.

### Do I need Redis for a Laravel SaaS?

Not on day one. The database queue and cache drivers are fine for your first customers. You'll want Redis once you add Horizon, run several servers, or use stancl/tenancy's cache bootstrapper, which needs a cache store with tags.

### What is Laravel Nightwatch?

Nightwatch is Laravel's official, fully managed monitoring service for production apps. It traces requests, queued jobs and queries, groups exceptions into issues and sends alerts. Pulse, by contrast, is a free self-hosted dashboard with aggregated metrics.

## The SaaS Laravel stack, honestly

Our [Laravel SaaS starter kit](/) already makes most of these choices for you: Laravel 13, Inertia v3 with Vue, React or Svelte (or Livewire 4 with Flux UI), Fortify with 2FA and passkeys, stancl/tenancy with a database per tenant, spatie/laravel-permission, Pest, Larastan, Pint and Laravel Boost. It doesn't include billing for your customers, search, an API or monitoring, so you add Cashier, Scout and your monitoring tool yourself. The [packages reference](/docs/reference/packages.html) lists exactly what's installed.

<BlogPostCta title="Start with the stack already wired together" text="SaaS Laravel ships tenancy, auth, roles, invitations and tooling on Laravel 13, so you only add the layers your product needs." />
