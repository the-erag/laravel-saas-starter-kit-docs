---
title: "Convert Worksuite to a Multi-Tenant SaaS"
description: "Turn Worksuite into a multi-tenant SaaS where each company gets its own database for HR, CRM and projects, with one phased AI prompt."
pageClass: blog-page
date: 2026-11-26
author: annu-gupta
category: saas
tags: [Worksuite, SaaS, AI Agents]
---

# Convert Worksuite to a Multi-Tenant SaaS with a Database per Company

<BlogPostMeta />

To turn Worksuite into a multi-tenant SaaS, every company you add needs its own workspace: its own database for employees, attendance, leads, projects and invoices, plus its own users and roles. The practical route is to keep the Worksuite code as a read-only reference and have an AI coding agent rebuild its modules inside a multi-tenant starter kit, one phase at a time, while you review each step. Before any of that, sort out the license and take a real look at the official Worksuite Saas edition, because it may already be what you need.

This post belongs to our series on [turning a CodeCanyon Laravel script into a SaaS](/blog/codecanyon-laravel-script-to-saas.html). Here we stick to what's specific to Worksuite: HR records that must never leak, and a client portal that has to stay inside the client's own projects.

## What Worksuite does

[WORKSUITE - HR, CRM and Project Management](https://codecanyon.net/item/worksuite-project-management-system/20052522) is a self-hosted Laravel app. The item page says it's "Built with Laravel 12+" and runs on PHP 8.x. [worksuite.biz](https://worksuite.biz/) credits Froiden as the maker, and on CodeCanyon it's sold under the ajay138 account. The key features listed on the item page:

- Customers and leads
- Employees, with attendance and leave tracking
- Projects with progress tracking, a Kanban taskboard and a Gantt chart
- Invoices, estimates, proposals and e-signature contracts
- Tickets and internal chat
- Custom roles and permissions

The demo has three logins: Admin, Employee and Client. Around the core there's a large set of paid modules, listed in the [Universal Modules Bundle](https://codecanyon.net/item/universal-modules-bundle-for-worksuite-crm/48913708), including Payroll, Recruit, REST API, Webhooks, Asset Management, Zoom, Purchase and E-Invoicing, and the demo notes that some modules it shows must be bought separately.

## License first, then the official SaaS edition

CodeCanyon's [standard licenses](https://codecanyon.net/licenses/standard) each cover one end product. The Regular License is for an end product whose end users aren't charged. The Extended License is for one whose end users can be charged. A paid SaaS is the second case, so a Regular License won't do. Ask the author before you build, including whether a rebuild in another codebase is fine with them. Paid modules carry their own licenses.

Worksuite also has an official SaaS edition: [Worksuite Saas - Project Management System](https://codecanyon.net/item/worksuite-saas-project-management-system/23263417), which is also sold on [Froiden's shop](https://shop.froiden.com/product/worksuite-saas/). It's built with Laravel, its demo adds a Super Admin role next to Admin, Employee and Client, and it lists PayPal, Stripe, payfast, flutterwave, mollie and Razorpay as gateways. worksuite.biz pitches it as a way to sell subscriptions with the same feature set. Subdomains and custom domains come from a separate paid [Subdomain Module](https://codecanyon.net/item/subdomain-module-for-worksuite-saas/26384704). Neither page says whether companies share one database or get one each, so we won't guess.

If you want to sell Worksuite subscriptions soon, with screens your users know, the official edition is the shorter road. A rebuild on SaaS Laravel makes sense when you want:

- **A database per company**, so one company's attendance and payroll rows never sit in the same tables as another company's
- **A frontend you control**: Vue, React, Svelte or Livewire, built the same way as the rest of your app
- **Code you own end to end**, organized as Laravel modules, with no vendor modules to keep in step

The rebuild costs more effort, and you should plan for that.

## Who becomes what in a tenant

In SaaS Laravel a tenant is a workspace on its own subdomain, with its own database, users, roles and permissions. The kit ships system roles (`super-admin`, `admin`, `manager`, `employee`, `user`) and lets each tenant create custom roles. You create tenants from the kit's central admin; a public sign-up page for new customers is yours to build. Worksuite's people map onto that like this:

| Worksuite user | In SaaS Laravel |
| --- | --- |
| You, the operator (Super Admin in Worksuite Saas) | Central app, `super-admin` on your main domain |
| Company owner (the first admin) | Tenant `super-admin`, created with the tenant |
| Other company admins | Tenant `admin` |
| Employee | Tenant `employee` |
| Client | A tenant custom role, for example `client`, with a small permission set |
| Worksuite custom roles | Tenant custom roles |

Everyone except you signs in on the company's subdomain through the kit's Fortify auth. Permissions are checked on routes, menus and buttons, so a client never sees the HR menu. See [roles and permissions with Spatie](/blog/laravel-roles-permissions-spatie.html).

## What's tricky about Worksuite

**Three audiences inside one tenant.** Tenancy keeps company A away from company B. It doesn't stop one of company A's clients from reading another client's project. That's a second layer you build with policies and query scopes: a client sees only records linked to their own client record. Test it as seriously as tenant isolation.

**HR data is the sensitive part.** Attendance, leave and (if you own the module) payroll are personal data. A database per tenant splits them by company. Inside a company, employees see their own records, and only people with an HR permission see everyone's.

**Paid modules.** Your source folder only holds what you bought. The agent ports what's in `./source`, and doesn't recreate paid modules from the demo.

**Files.** Signed contracts and attachments belong on the tenant disk. The kit's `FilesystemTenancyBootstrapper` suffixes the `local` and `public` disks per tenant (more in [tenant cache and filesystem](/blog/laravel-tenant-cache-filesystem.html)).

**Reminders and notifications.** When these run as queued jobs, the kit's `QueueTenancyBootstrapper` makes each job remember its tenant, so a leave approval email goes out with the right company's data. See [multi-tenant queues](/blog/laravel-multi-tenant-queues.html).

**Mobile apps.** worksuite.biz mentions companion apps for iOS and Android. The kit has no HTTP API, so those apps are out of scope here.

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

Swap the clone URL for the React, Svelte or Livewire kit if you prefer one of those. The kit repositories are private, so you need [repository access](/docs/purchase/repository-access.html) from your purchase before you clone. `your-script` is the unzipped Worksuite folder. The [installation docs](/docs/getting-started/installation.html) explain each step.

## The prompt

Open Claude Code, Codex or Junie in `my-saas` and paste this. It stops after each phase so you can review. A full Worksuite port is days to weeks of review, not an afternoon.

```text
We are rebuilding Worksuite (HR, CRM and project management, Laravel) as a multi-tenant SaaS.

The two folders:
- ./kit is the only project you edit. It is a SaaS Laravel starter kit. Read kit/AGENTS.md and kit/CLAUDE.md, and the skills they point to, first and follow them.
- ./source is Worksuite. It is read-only. Never change, move or delete anything in it.

The goal:
- Every company I add is a tenant with its own database.
- Sign-in, users, roles, permissions, menus, languages and notifications come from the kit. Don't port Worksuite's own versions of these.

Before anything else, ask me which Worksuite license I hold and whether the author allows SaaS use. If paid SaaS use isn't allowed, stop there.

Work in five phases. After each one, stop, summarize, and wait for my "go".

Phase 1 - Understand (no code changes)
Inventory ./source: modules, tables, routes, roles, settings, scheduled tasks, queued jobs, upload folders and integrations. Tag each feature as admin, employee or client facing, and list the paid modules present. Then write a migration plan and module order.

Phase 2 - Foundation
Add the Laravel 13 packages the features need. Create tenant migrations and models. Only tenants and my central admin data go in central migrations.

Phase 3 - Features, one module at a time
Suggested order: employees, attendance and leave; clients and leads; projects and tasks (Kanban, Gantt); invoices, estimates, proposals and contracts; tickets; chat.
For each module: thin controllers, business logic in service classes, validation the kit's way (Data objects in the Vue, React and Svelte kits, Form Requests in the Livewire kit), pages in the kit's frontend, permissions in config/permissions/tenant, menu entries, translations, files on the tenant disk, queued jobs that stay tenant-aware, and Pest tests, including one proving tenant A can't see tenant B's data.

Phase 4 - Settings
Split Worksuite's settings into tenant settings (each company: company details, currency, leave rules, invoice details) and central settings (me, the operator).

Phase 5 - Check
Run tests, lint, type checks and the build. Create two demo tenants with sample employees, clients and projects. Summarize what was ported, what was skipped and why.

Rules:
- Never change ./source.
- If any part of ./source isn't Laravel, document its behavior first, get my approval,
  then rebuild it the Laravel way. Never copy framework code across.
- No billing. Leave a TODO where subscription checks would go.
- Don't invent features ./source doesn't have, and don't rebuild paid modules that aren't in it.
- Never weaken tenancy, auth or permission checks.
- When you're stuck or unsure, ask me.

Worksuite-specific rules:
- Admin, employee and client are roles inside one tenant, not separate apps or guards.
- A client only sees projects, tasks, invoices, estimates, contracts and tickets linked to their own client record. Enforce it in policies and queries, and test it.
- Attendance, leave and payroll records stay in the tenant database. Employees see their own; only users with an HR permission see everyone's.
- Signed contracts and attachments go on the tenant disk and are served through authorized routes, never public URLs.
- Internal chat stays inside one tenant. No cross-tenant messaging.
- If ./source contains license activation, update checks or module purchase code, don't port it.
```

[AI coding agents for Laravel](/blog/ai-coding-agents-laravel.html) explains how the kit's guidelines steer the agent.

## What's left for you

**Billing.** Make the tenant the billable model with Cashier, as in [Laravel Stripe subscriptions for a SaaS](/blog/laravel-saas-stripe-billing.html), and fill in the agent's TODOs.

**Moving existing companies across.** If you already run separate Worksuite installs for a few companies, each install becomes one tenant. Write a one-off Artisan command in your own project (the kit doesn't ship one) that:

1. Creates the tenant and its subdomain.
2. Reads the old install's database on a second connection.
3. Copies users, clients, employees, projects and the rest, keeping a map of old IDs to new ones.
4. Copies uploaded files into the tenant's storage and sends password reset links.

Run it on a copy first and compare counts per table. [Tenant migrations and seeders](/blog/laravel-tenant-migrations-seeders.html) helps with step 1.

**Custom domains.** Companies will ask for `hr.theircompany.com`. See [custom domains for tenants](/blog/laravel-tenant-custom-domains.html).

## Frequently asked questions

### Should I just buy Worksuite Saas instead?

If you want Worksuite's own screens sold as subscriptions with little development work, look at it first. A rebuild is for when you want a database per company, your own frontend and full code ownership.

### Can the agent port paid Worksuite modules like Payroll or Recruit?

Only if the module is in your `./source` folder and its license allows SaaS use. The prompt tells the agent not to rebuild modules it can't read.

### How do I prove one company can't see another company's data?

Write Pest tests that create two tenants, add records to one, and assert the other can't read them. [Testing a multi-tenant Laravel app with Pest](/blog/test-multi-tenant-laravel-pest.html) shows the setup. Add the same kind of test for one client versus another inside a single tenant.

## Where SaaS Laravel fits

SaaS Laravel gives Worksuite's features a new home: a database per company, Fortify auth, roles and permissions, database-driven menus and 17 languages, in a Laravel 13 codebase with guidelines for AI agents. You still review every phase and add billing. Kits are a one-time purchase from $49 with weekly updates; see the [pricing page](/pricing.html).

<BlogPostCta title="A database per company, ready to build on" text="SaaS Laravel gives you database-per-tenant multi-tenancy, Fortify auth, roles, permissions and menus in Vue, React, Svelte or Livewire, so your agent ports Worksuite's features instead of the plumbing." />
