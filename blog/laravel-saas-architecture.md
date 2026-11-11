---
title: "Laravel SaaS Architecture: How the Whole App Fits Together"
description: "Laravel SaaS architecture explained: request flow, tenant identification, central vs tenant data, queues, billing webhooks, admin app and how to grow it."
pageClass: blog-page
date: 2026-11-11
author: erag
category: architecture
tags: [Architecture, Multi-tenancy, SaaS]
---

# Laravel SaaS Architecture: A Map of How a Laravel SaaS Application Fits Together

<BlogPostMeta />

**Short answer:** A Laravel SaaS architecture is one Laravel app that serves two sides: a central side (your marketing site, sign-up, billing and super admin) and a tenant side (each customer's workspace). Every request is matched to a tenant by its domain, passes through middleware, hits a thin controller and a service, and reads the right database. Queues, the scheduler, billing webhooks, files, cache and email all have to know which tenant they're working for.

Most Laravel SaaS application guides jump straight into one piece: install a tenancy package, add Stripe, done. Then you're three months in, a webhook arrives with no tenant attached, a queued email links to the wrong subdomain, and you realise nobody showed you the whole picture.

This post is that picture. It's the map. Say you're building a booking app for physiotherapy clinics: each clinic is a tenant, with its own staff, patients and appointments. We'll follow that app through every part of the system, and link to our deep guides whenever a part needs more than a few paragraphs.

## The Laravel SaaS architecture on one page

Here's the whole thing. Keep it open while you read the rest.

```text
  clinic-a.yourapp.com                         yourapp.com
          |                                         |
          v                                         v
  +-------------------------------------------------------------+
  |  Web server (Nginx, or your host's load balancer)            |
  +-------------------------------------------------------------+
          |
          v
  Tenant identification: host -> central "domains" table
          |                                         |
     tenant found                            central domain
          |                                         |
  TENANT CONTEXT                             CENTRAL CONTEXT
  middleware: tenant guard,                  middleware: web guard,
  suspended? maintenance? locale             super admin, central only
          |                                         |
  Controller -> Service                      Controller -> Service
          |                                         |
  Tenant database (tenant42)                 Central database
  staff, patients, appointments,             tenants, domains, plans,
  roles, settings                            subscriptions, super admins
          |                                         ^
          +--> Redis queue (job carries tenant id)  |
                   |                                |
                workers --> mail (Postmark/SES)     |
                                                    |
  Stripe / Paddle ---- webhook ---------------------+

  Files: one S3 bucket, a prefix per tenant (tenant42/...)
  Cache: Redis, a tag per tenant
  Scheduler: runs centrally, dispatches per-tenant jobs
```

One codebase, one deploy, two contexts. Almost every bug we see in multi-tenant apps is something running in the wrong context.

## Follow one request through a Laravel SaaS application

A physio at Clinic A opens `clinic-a.yourapp.com/appointments`. Here's what happens, in order.

1. **DNS and the web server.** A wildcard DNS record (`*.yourapp.com`) sends every subdomain to the same app. There's no server per customer. [Laravel multi-tenancy with subdomains](/blog/laravel-multi-tenancy-subdomains.html) covers the setup, and [custom domains](/blog/laravel-tenant-custom-domains.html) adds `booking.clinic-a.com` later.
2. **Tenant identification.** Before anything else, middleware looks up the host in the central `domains` table. Found: this is Clinic A, so tenancy starts and switches the database connection, cache, file storage and queue context. Not found: 404. The central domain itself skips all of this.
3. **Middleware.** Now the normal stack runs, but with tenant-aware rules: authenticate with the tenant guard, block suspended or maintenance-mode workspaces, set the user's language, check permissions.
4. **Controller.** Validation happens in a Form Request or Data object. The controller just calls a service and returns a page. If your controllers are 200 lines long, read [thin controllers](/blog/laravel-thin-controllers.html).
5. **Service.** This is where the business rules live: "a physio can't be double-booked", wrapped in a transaction, maybe dispatching a reminder job. See [the service layer pattern](/blog/laravel-service-layer-pattern.html).
6. **Database.** Eloquent queries the default connection, which tenancy has already pointed at Clinic A's database. With a database per tenant, your code doesn't need `where tenant_id = ...` anywhere.
7. **Response.** An Inertia page, a Livewire component or a redirect with a toast.

That's Laravel's normal [request lifecycle](https://laravel.com/docs/13.x/lifecycle) with one extra step at the front. The extra step is what makes it a SaaS.

## Central data vs tenant data

The most useful question you can ask about any table is: does this belong to my business, or to one customer?

| Lives in the central database | Lives in each tenant database |
| --- | --- |
| Tenants and their domains | The tenant's users and their roles |
| Plans, subscriptions, invoices from you | Business data: patients, appointments, notes |
| Super admin accounts | Tenant settings and menus |
| Sign-up and onboarding state | Activity logs and notifications |

Billing is the one people get wrong. The clinic pays you, so the subscription is about the tenant, not inside it. Keep it central.

If you're still choosing between one shared database and a database per tenant, stop here and read [single vs multi-database tenancy](/blog/single-vs-multi-database-tenancy-laravel.html). How the database-per-tenant model works in practice is in [how to build a multi-tenant SaaS with Laravel](/blog/multi-tenant-saas-laravel-database-per-tenant.html), and the package setup in our [stancl/tenancy tutorial](/blog/stancl-tenancy-tutorial.html).

## Background work: queues and the scheduler

A lot of a SaaS runs when nobody is looking: appointment reminders, imports, exports, invoice PDFs.

**Queued jobs** are dispatched inside a tenant request but run later in a worker that has no request and no domain. So the job has to carry the tenant ID with it, and the worker has to switch into that tenant before `handle()` runs. stancl/tenancy does this for you, but only if you set it up correctly and avoid a few traps. Those are in [queued jobs in a multi-tenant Laravel app](/blog/laravel-multi-tenant-queues.html).

**The scheduler** runs once, on the central side. For "send tomorrow's reminders for every clinic", the scheduled task loops over tenants and dispatches one job per tenant. Don't do the work inline. One slow clinic shouldn't hold up the rest. See [the multi-tenant scheduler](/blog/laravel-multi-tenant-scheduled-tasks.html).

## Billing and webhooks live on the central side

Here's the flow with Stripe and Laravel Cashier:

1. The clinic owner clicks "Upgrade" in their workspace.
2. Your app sends them to Stripe Checkout, with the tenant as the billable customer.
3. Stripe calls your webhook on the **central** domain, for example `yourapp.com/stripe/webhook`.
4. There's no tenant context in that request. Cashier finds the customer by its Stripe ID in the central database and updates the subscription.
5. Your own listener reacts: change the workspace status, email the owner, lift a usage limit.
6. Next time Clinic A loads a page, the tenant app reads its plan from the central tenant record.

The point is that payment state flows one way: from Stripe, into the central database, out to the tenant. The full setup is in [Laravel Stripe subscriptions for a SaaS](/blog/laravel-saas-stripe-billing.html), and enforcing what each plan allows is in [Laravel SaaS usage limits](/blog/laravel-saas-usage-limits.html).

## Files and cache

Your tenant databases are separate, but the cache and the file system are shared by default. That's where data leaks hide.

- **Files:** one bucket, a prefix per tenant. Clinic A's uploads go under `tenant42/`, so you can back up, export or delete one tenant's files on their own.
- **Cache:** Redis with a tag per tenant, so `Cache::get('dashboard-stats')` in Clinic A never returns Clinic B's numbers.

Both are configured once and then mostly invisible. [Tenant-aware cache and file storage](/blog/laravel-tenant-cache-filesystem.html) shows how, and which cache calls quietly skip the scoping.

## Email

Email touches both sides. Sign-up and billing emails come from the central app. Appointment confirmations come from a tenant, should link to that tenant's subdomain, and ideally use the clinic's name and the recipient's language.

Queue every email. When the mail provider is slow, your booking page shouldn't be. And test that a queued mailable builds its URLs inside the right tenant, because that's the bug that sends a patient to someone else's login page. See [Laravel SaaS emails](/blog/laravel-saas-transactional-emails.html).

## Two apps in one codebase: admin and customer

Your SaaS is really two products sharing code:

| | Central admin | Customer app |
| --- | --- | --- |
| Who uses it | You and your support team | Clinic owners and staff |
| Where | `yourapp.com` | `clinic-a.yourapp.com` |
| Guard and users | Central guard, central users table | Tenant guard, tenant users table |
| Main jobs | Create, suspend and support tenants | Do the actual work |

Separate guards stop a clinic admin from ever being treated as your super admin. [Multiple auth guards](/blog/laravel-multiple-auth-guards.html) explains the split, and [the super admin role](/blog/laravel-super-admin-role.html) and [impersonating users](/blog/laravel-impersonate-user.html) cover the support tools you'll want. Some teams build the admin side with Filament and keep Inertia for customers; we weigh that in [Filament vs Inertia](/blog/filament-vs-inertia.html).

## Folder structure: where each part lives

The architecture above should be visible in your folders. Here's roughly how we lay out a modular Laravel SaaS:

```text
app/                    shared infrastructure: tenancy middleware, listeners, models
Modules/
  Tenant/               tenants, domains, suspension, maintenance
  User/                 users and invitations
  Appointment/          your product, as its own module
    Http/  Services/  Data/  routes/
config/permissions/     central permissions
config/permissions/tenant/   tenant permissions
database/migrations/         central tables
database/migrations/tenant/  tables in every tenant database
```

The rule of thumb: the central vs tenant split shows up in `database/` and `config/`, and features live in `Modules/`. How to build and wire up modules is in [modular Laravel architecture](/blog/modular-laravel-architecture.html), so we won't repeat it here.

## Environments and deployment

You need three environments, and they should look as alike as you can afford.

- **Local:** real subdomains, not `localhost:8000`, or tenancy bugs hide until production. [Laravel Herd subdomains](/blog/laravel-herd-subdomains.html) makes this easy.
- **Staging:** its own wildcard domain, its own database server, Stripe in test mode, real queue workers. This is where tenant migrations get tried on a copy of real-shaped data.
- **Production:** the deploy runs central migrations, then tenant migrations, then restarts the queue workers so they pick up new code.

The order matters, and so does what happens when a tenant migration fails halfway. That's all in [deploying a Laravel SaaS](/blog/deploy-laravel-saas.html). For where to run it, see [Laravel Cloud vs Forge vs Vapor](/blog/laravel-cloud-vs-forge-vs-vapor.html), and for sleeping at night, [backups for a multi-database SaaS](/blog/laravel-multi-database-backups.html) and [health checks](/blog/laravel-health-checks-multi-tenant.html).

## Start simple, grow later: a Laravel SaaS architecture path

None of this needs to be big on day one. Here's how we'd think about it at three sizes. Treat these as rough guidance, not thresholds.

**Around 10 customers.** One server running the app, the database, Redis and one queue worker. The database queue driver is fine. Set up daily backups and error tracking, and stop there. Your time is better spent talking to those ten clinics. Our [30-day MVP plan](/blog/build-saas-mvp-laravel.html) fits this stage.

**Around 1,000 customers.** Move the database to its own server and add a second app server behind a load balancer, with files in object storage. Switch to Horizon and split queues so imports can't delay password reset emails. Tenant migrations now take a while, so run them deliberately rather than as an afterthought in the deploy. Add a staging environment if you skipped it.

**Around 100,000 customers.** With a database per tenant, one database server won't hold everyone. stancl/tenancy can point a tenant's database at a different connection, so you spread tenants across several servers. Many small, cheap tenants are also the point where a single shared database starts to look attractive again; that's a real trade-off, not a failure. Add per-tenant rate limits so one noisy customer can't slow down the rest, and only now consider pulling a single, clearly separate workload (search, file processing) into its own service.

Notice what's missing: microservices on day one. A well-organised Laravel monolith takes most SaaS products a very long way.

## Frequently asked questions

### What is the architecture of a Laravel SaaS application?

It's usually one Laravel monolith with a central side and a tenant side. A middleware identifies the tenant from the domain and switches the database, cache, files and queue context. Controllers stay thin, services hold the business logic, and queued jobs carry the tenant ID with them.

### Should a Laravel SaaS use microservices?

Almost never at the start. Microservices add deploys, network calls and failure modes you don't need yet. Organise the monolith into modules, and extract a service only when one workload clearly needs to scale or deploy on its own.

### Can Laravel handle a large SaaS application?

Yes, as long as the architecture grows with it. Queues, caching, separate database servers and horizontal app servers are all standard in Laravel. The limits you'll hit first are usually database design and slow queries, not the framework.

### Where should billing data live in a multi-tenant Laravel app?

In the central database, attached to the tenant. Webhooks from Stripe or Paddle arrive without any tenant context, so the central side updates the subscription, and the tenant app reads its plan from there.

## How SaaS Laravel follows this architecture

Our [multi-tenant Laravel starter kit](/) is built on this map: tenant identification by subdomain before any other middleware, separate central and tenant guards, central and tenant migrations and permissions, suspension and maintenance checks, modules with thin controllers and services. The [architecture docs](/docs/core/architecture.html) show the exact request flow, and [multi-tenancy](/docs/core/multi-tenancy.html) covers the tenant side. Billing, search and an API aren't included, so you'd add those yourself following the patterns above. Weighing that against building it all yourself? Read [boilerplate vs scratch](/blog/laravel-saas-boilerplate-vs-scratch.html) or our [starter kit buyer's guide](/blog/laravel-saas-starter-kit.html).

<BlogPostCta title="Start from an architecture that already works" text="SaaS Laravel gives you tenant identification, central and tenant contexts, guards and modules out of the box, so you build your product instead of the plumbing." />
