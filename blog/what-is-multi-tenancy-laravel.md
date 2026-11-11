---
title: "What Is Multi-Tenancy in Laravel? A Plain-English Guide"
description: "What multi-tenancy in Laravel means, in plain English: the three tenant models with tiny code samples, how requests find a tenant, and when you don't need it."
pageClass: blog-page
date: 2026-11-11
author: erag
category: multi-tenancy
tags: [Multi-tenancy, Basics]
---

# What Is Multi-Tenancy in Laravel? A Friendly Guide to Multi-Tenant Laravel Apps

<BlogPostMeta />

**Short answer:** Multi-tenancy in Laravel means one Laravel app serves many customers (tenants), and each customer only ever sees its own data. You keep tenants apart with a `tenant_id` column in a shared database, a separate database per tenant, or a separate deployment per customer, and every request works out which tenant it belongs to before your code runs.

Maybe a client just asked for "a multi-tenant Laravel app", or you've read the phrase in a job post and nodded along. Or you're planning your first SaaS and every tutorial jumps straight into middleware and database managers without telling you what problem they're solving.

This is the post we wish we'd had when we started. No package installs, no 40-step setup. Just what Laravel multi-tenancy actually is, the three ways people build it, and how to tell whether you need it at all.

## Think of an apartment building

Picture a big apartment building. There's one structure, one lift, one set of pipes and one caretaker. Inside, every family has its own flat with its own lock. The family in 4B can't walk into 7A, and they don't see each other's post.

A multi-tenant Laravel app works the same way:

```text
The building      = your Laravel app (one codebase, one deploy)
Each flat         = a tenant (a company, a school, a clinic)
The front door    = tenant identification (who is this request for?)
The locks         = data isolation (queries, databases)
Mailboxes, storage = cache, files and queues, which also need labels
```

The whole point is that you build and maintain one building, not a hundred separate houses. You fix a bug once and every tenant gets the fix. You add a feature once and every tenant can use it.

## A running example: Ledgerly

To keep things concrete, say you're building **Ledgerly**, an invoicing app for small accounting firms.

Hartley & Co signs up. So does Patel Accounting. Each firm has its own staff accounts, its own clients and its own invoices. Hartley's bookkeeper must never see Patel's invoices, not in a list, not in a search result, not in a cached dashboard number. Ever.

In Ledgerly, each firm is a **tenant**. The people who log in (bookkeepers, partners) are **users** that belong to a tenant. Keep that distinction in your head, because it's where most beginner confusion comes from: a tenant is a customer account, not a person.

## The three models of a Laravel multi-tenant app

There are three common ways to keep tenants apart. Here's a tiny taste of each, so you can see what it feels like in code. We go much deeper on the trade-offs in [How to Build a Multi-Tenant SaaS with Laravel](/blog/multi-tenant-saas-laravel-database-per-tenant.html), so this is the quick tour.

### Model 1: One shared database with a tenant_id column

Every tenant's data lives in the same tables. Each tenant-owned row carries a column that says who owns it:

```text
invoices
id | firm_id | number   | total
1  | 1       | INV-001  | 1200.00   ← Hartley & Co
2  | 2       | INV-001  |  340.00   ← Patel Accounting
3  | 1       | INV-002  |  980.00   ← Hartley & Co
```

Every query has to filter by that column:

```php
Invoice::where('firm_id', $currentFirm->id)->latest()->get();
```

In practice you don't write that `where` by hand every time. You add a [global scope](https://laravel.com/docs/13.x/eloquent#global-scopes) to the model so Laravel adds it for you. It's the cheapest model to run (one database, one backup, one migration run). The catch is that your isolation is only as good as your code. A raw `DB::table('invoices')` query or a scope that doesn't apply inside a queued job, and Hartley sees Patel's invoices.

### Model 2: A separate database per tenant

There's a central database that knows about the firms and their subdomains. Each firm then gets its own database with the same tables and no `firm_id` column anywhere:

```text
central       → firms, domains, your admin users
firm_1        → Hartley's users, clients, invoices
firm_2        → Patel's users, clients, invoices
```

When a request comes in for Hartley, the app points the database connection at Hartley's database before anything else runs:

```php
config(['database.connections.tenant.database' => 'firm_'.$firm->id]);
DB::purge('tenant');
DB::setDefaultConnection('tenant');

Invoice::latest()->get(); // only Hartley's invoices exist on this connection
```

A forgotten `where` can't leak anything, because the other firm's rows simply aren't in this database. You pay for it in operations instead: creating databases on sign-up, running migrations against every tenant database, and backing each one up. This is the model we use ourselves, and [single vs multi-database tenancy](/blog/single-vs-multi-database-tenancy-laravel.html) walks through how to choose between Model 1 and Model 2.

### Model 3: A separate deployment per customer

Each customer gets their own copy of the app: its own server or site, its own `.env`, its own database.

```bash
# /var/www/ledgerly-hartley/.env
APP_URL=https://hartley.ledgerly.app
DB_DATABASE=ledgerly_hartley

# /var/www/ledgerly-patel/.env
APP_URL=https://patel.ledgerly.app
DB_DATABASE=ledgerly_patel
```

Strictly speaking this isn't multi-tenancy at all. It's often called multi-instance, and the app itself has no idea other customers exist. It's the simplest code (no tenant logic) and the heaviest operations: every release is a deploy to every customer, and with 200 customers that's 200 deploys, 200 queue workers and 200 places for a config value to drift.

It makes sense for a handful of large customers who demand their own servers. For a self-service SaaS where anyone can sign up, it falls apart quickly.

### The three models side by side

| | Shared database | Database per tenant | Deployment per customer |
| --- | --- | --- | --- |
| Where data lives | Same tables, `tenant_id` column | Own database per tenant | Own app and database per customer |
| What keeps tenants apart | Your queries and scopes | The database connection | Separate servers |
| New tenant | Insert a row | Create and migrate a database | Provision a whole site |
| Deploying a fix | Once | Once, plus tenant migrations | Once per customer |
| Biggest risk | A query that skips the scope | Ops work that isn't automated | Version drift between customers |
| Good fit | Lots of small or free accounts | B2B customers who care where data lives | A few large, contract-heavy customers |

## How a request finds its tenant

Before your controller runs, the app needs to answer one question: which flat is this visitor heading to? That step is called **tenant identification**, and it usually lives in middleware.

| Method | What Ledgerly's URL looks like | Notes |
| --- | --- | --- |
| Subdomain | `hartley.ledgerly.app` | The most common choice for SaaS. Needs wildcard DNS. |
| Custom domain | `invoices.hartleyandco.com` | Nice for white-label products, more work (DNS, TLS). |
| Path | `ledgerly.app/hartley/invoices` | One domain, no DNS work. Every route needs the prefix. |
| Header | `X-Tenant: hartley` | Common for APIs and mobile apps, not for browser pages. |

A bare-bones subdomain lookup looks like this:

```php
$subdomain = Str::before($request->getHost(), '.');

$firm = Firm::where('subdomain', $subdomain)->firstOrFail();
```

Once the tenant is found, the app "initializes" it: it remembers the current firm and, in Model 2, switches the database. Packages give you a middleware per method. In [stancl/tenancy](https://tenancyforlaravel.com/docs/v3/) v3, for example, they're called `InitializeTenancyBySubdomain`, `InitializeTenancyByDomain`, `InitializeTenancyByPath` and `InitializeTenancyByRequestData`. If you want subdomains in detail (central domains, routes, wildcard DNS, local dev), read [Laravel multi-tenancy with subdomains](/blog/laravel-multi-tenancy-subdomains.html).

## What "tenant-aware" really means

Here's the part beginners miss, and it's the part that causes real bugs. Your database isn't the only place data lives. Laravel also keeps things in the cache, on disk, in the queue and in the session. Each of those needs a label on the mailbox too.

**Cache.** Say Ledgerly caches the dashboard total:

```php
Cache::remember('dashboard.outstanding', 600, fn () => Invoice::unpaid()->sum('total'));
```

Hartley loads the dashboard first, and the number is cached under `dashboard.outstanding`. Ten seconds later Patel loads theirs and gets Hartley's number, because the key is the same. Tenant-aware caching means every key is scoped to the current tenant, either by prefix or by tag, without you remembering to do it.

**Files.** If both firms upload `logo.png` to `storage/app/logos`, the second upload overwrites the first. Tenant-aware storage gives each tenant its own folder or disk.

**Queues.** A job that sends invoice reminders runs later, in a worker, with no request and no subdomain. If the job doesn't remember which tenant dispatched it, it either fails or runs against the wrong data. Tenant-aware queues store the tenant with the job and restore it before `handle()` runs.

**Sessions.** If your session cookie is set for `.ledgerly.app`, a login on one tenant's subdomain can be sent to every other tenant's subdomain too. Keep sessions scoped to the tenant's host, or store them in each tenant's database.

**Commands and scheduled tasks.** Same story as queues. `php artisan invoices:send-reminders` has no tenant until you loop over tenants and initialize each one.

A good tenancy package handles most of this for you. stancl/tenancy calls the pieces "bootstrappers", and spatie/laravel-multitenancy calls them "tasks". We cover the cache and file side in [tenant-aware cache and file storage](/blog/laravel-tenant-cache-filesystem.html).

## When you don't need multi-tenancy

This is the section most guides skip, so let's be blunt: plenty of Laravel apps don't need any of this.

If every record simply belongs to the person who created it, you already have what you need. A to-do app, a personal finance tracker or a habit app can scope by the logged-in user:

```php
$invoices = auth()->user()->invoices()->latest()->get();
```

That's it. No tenant model, no middleware, no extra databases.

You also might not need full tenancy if your customers are small groups who share a few records. A `team_id` column and Laravel's team features can cover that, and we explain where teams end and tenancy begins in [Laravel teams vs multi-tenancy](/blog/laravel-teams-vs-multi-tenancy.html).

Reach for real multi-tenancy when most of these are true:

- Your customers are organisations, and each one has several users.
- Each organisation expects its data to be fully walled off from the others.
- You want per-customer subdomains, settings, roles or backups.
- Customers ask questions like "can you export or delete everything we own?"

If none of that sounds like your product yet, don't add tenancy "just in case". It adds real weight to every feature you build. If you're still at the idea stage, our [30-day SaaS MVP plan](/blog/build-saas-mvp-laravel.html) is a better next read.

## Where to go next

If you've decided Ledgerly (or your own app) needs tenancy, here's the order we'd read things in:

1. [How to Build a Multi-Tenant SaaS with Laravel](/blog/multi-tenant-saas-laravel-database-per-tenant.html) for the full architecture of the database-per-tenant model.
2. [Single vs multi-database tenancy](/blog/single-vs-multi-database-tenancy-laravel.html) to make the big data decision with your eyes open.
3. [Laravel multi-tenancy packages compared](/blog/laravel-multi-tenancy-packages.html) to pick a package (or decide to build it yourself).
4. [The stancl/tenancy tutorial](/blog/stancl-tenancy-tutorial.html) to set it up step by step, including tenant-aware queues for background emails and reminders.

## Frequently asked questions

### Does Laravel support multi-tenancy out of the box?

Not as a complete feature. Laravel gives you the building blocks (middleware, global scopes, multiple database connections, queue payloads), but there's no built-in tenant model or tenant switching. Most teams use a package such as stancl/tenancy or spatie/laravel-multitenancy, or write a small version themselves.

### What is the difference between a tenant and a user?

A tenant is a customer account, usually an organisation like a company or a school. A user is a person who logs in, and in a multi-tenant app each user belongs to a tenant. One tenant typically has many users.

### Which multi-tenancy model should a beginner start with?

If your customers are businesses that care about where their data lives, start with a database per tenant and a package that automates it. If you expect thousands of tiny or free accounts, a shared database with a `tenant_id` column is simpler to run. Either way, decide early, because switching later is a real migration project.

### Is multi-tenancy only for SaaS apps?

No. It fits anywhere one codebase serves several separate groups with walled-off data, such as franchises, school districts or departments inside one company. SaaS is just the most common case.

## Multi-tenancy and SaaS Laravel

If you'd rather start from a working setup, our [multi-tenant Laravel starter kit](/) uses stancl/tenancy v3 with a separate database per tenant. Each tenant is identified by a subdomain of `APP_DOMAIN` (a tenant can have several, with one marked primary), and central and tenant areas use separate auth guards. Creating a tenant creates and migrates its database and seeds roles, permissions and menus. It doesn't map fully custom customer domains, and it doesn't include billing, so plan for those yourself. The [multi-tenancy docs](/docs/core/multi-tenancy.html) show exactly how it's wired.

<BlogPostCta title="Multi-tenancy without the guesswork" text="SaaS Laravel gives every customer its own database and subdomain on Laravel 13, with tenant-aware cache, files and queues already set up." />
