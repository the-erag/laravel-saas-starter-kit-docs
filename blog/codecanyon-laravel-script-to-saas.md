---
title: "Convert CodeCanyon Laravel Scripts into a SaaS"
description: "How to turn a CodeCanyon Laravel script into a multi-tenant SaaS: the Extended License, a two-folder setup and one AI prompt you can reuse."
pageClass: blog-page
date: 2026-11-26
author: erag
category: saas
tags: [CodeCanyon, SaaS, AI Agents]
---

# Convert a CodeCanyon Laravel Script into a Multi-Tenant SaaS

<BlogPostMeta />

To turn a CodeCanyon Laravel script into a SaaS, you need a license that allows paid end users, a multi-tenant base where every customer gets their own database, and a careful port of the script's features onto that base. With an AI coding agent, one phased prompt can drive the port: the agent reads the original script, rebuilds it module by module in a starter kit, and stops for your review after each phase. For a real script, that's days or weeks of review, not an afternoon.

This is the hub for our series. Below is the license check, the folder setup and a prompt you can reuse. At the end there are guides for popular scripts, each with its own product rules.

## Check the license first

CodeCanyon sells two licenses, described on the [Envato licenses page](https://codecanyon.net/licenses/standard):

- **Regular License**: "If your end product including the item is going to be free to the end user then a Regular License is what you need."
- **Extended License**: "An Extended License is required if the end user must pay to use the end product."

A SaaS charges its users, so you need at least the Extended License. Both licenses cover one end product. Freelancers can charge a client for building an end product even under the Regular License, but that's different from charging your own subscribers.

Then read the author's own terms, because they can be stricter. Two examples:

- The [InfixEdu School ERP](https://codecanyon.net/item/infix-school-academic-management-system/23876323) item page says "One purchase can use a maximum of one school only".
- The Perfex CRM terms forbid using the license as a multi-tenant SaaS. We wrote up [what the Perfex CRM license allows](/blog/perfex-crm-to-saas.html) and how to build your own CRM instead.

If the terms don't allow what you want, ask the author for written permission. Don't rely on a forum comment.

### Some scripts sell their own SaaS edition

Before you convert anything, check whether the author already sells a SaaS version:

- [SaaS & Superadmin Module for UltimatePOS](https://codecanyon.net/item/saas-superadmin-module-for-ultimatepos-advance/22394431)
- [Worksuite Saas](https://codecanyon.net/item/worksuite-saas-project-management-system/23263417)
- [Stocky SaaS](https://codecanyon.net/item/stocky-pos-inventory-management-saas/62663753)
- [InfixEdu SAAS Bundle](https://aorasoft.com/infixedu-saas-bundle-school-management-system-software/8278730474), sold on aorasoft.com rather than CodeCanyon

If one of these fits, it's usually the fastest way to sell that product as a service. SaaS Laravel is the better fit when you want a separate database per customer, a modern Vue, React, Svelte or Livewire frontend, and code you own and change freely. Our [database-per-tenant guide](/blog/multi-tenant-saas-laravel-database-per-tenant.html) explains why the separate database matters for backups, deletions and data leaks.

## Set up the folders

Keep the kit and the original script side by side, so the agent writes in one and only reads the other.

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

Swap the clone URL for `react`, `svelte` or `livewire` if you prefer another kit, and replace `your-script` with the unzipped product folder. The kit repositories are private, so you need [repository access](/docs/purchase/repository-access.html) from your purchase before you clone. The [installation docs](/docs/getting-started/installation.html) explain each setup step. The prompt asks the agent never to change `source`, but a request isn't a lock: run `chmod -R a-w source` to make the folder read-only on macOS or Linux.

## The reusable prompt

Paste this into Claude Code, Codex or Junie from the `my-saas` folder. Fill in the script name and the product rules. Every kit ships `AGENTS.md`, `CLAUDE.md` and skill files from [Laravel Boost](/blog/laravel-boost-ai-agents.html), so the agent reads the kit's conventions before it writes code. Starting in `my-saas` lets the agent read both folders, but most agents, Claude Code included, load MCP servers (such as Boost's) only from the folder they start in, and Claude Code loads the skills in `kit/.claude/skills` only after it first opens a file in `kit/`. That's why the prompt tells the agent to read `kit/AGENTS.md` and `kit/CLAUDE.md` first. If you want Boost's MCP tools too, start the agent in `kit/` and change `./kit` and `./source` in the prompt to `.` and `../source`.

```text
License: before anything else, ask me which license I hold and whether the author's
terms allow a paid multi-tenant SaaS. If they don't, stop.

You are converting <script name>, a CodeCanyon script, into a multi-tenant SaaS.

Projects:
- ./kit is the only project you edit. Read kit/AGENTS.md and kit/CLAUDE.md, and the
  skills they point to, before you change anything.
- ./source is the original script. It is read-only. Never change, move or delete
  anything in it.

Target model:
- Every customer becomes a tenant with its own database.
- Sign-in, users, roles, permissions, menus, languages and notifications come from the
  kit. Do not port the script's own auth, role, menu or translation systems.

If ./source is not Laravel: document its behavior first, get my approval, then
rebuild it the Laravel way. Never copy framework code across.

Work in five phases. Stop after each phase, report, and wait for me to say "go".

Phase 1 - Understand (no code changes)
- Inventory ./source: modules, tables, routes, roles and permissions, settings,
  scheduled and queued jobs, uploads, and third-party integrations.
- Note anything that already separates customers in one database (business, company,
  vendor or branch columns) and what it becomes inside a tenant database.
- Write a migration plan, module by module, in the order you propose.

Phase 2 - Foundation
- Add the Laravel 13 packages the features need, and only those.
- Write tenant migrations and models.

Phase 3 - Features, one module at a time
- Thin controllers, logic in service classes, validation the kit's way: Data objects
  in the Inertia kits, Form Requests in the Livewire kit.
- Pages in the kit's frontend, permissions, menu entries, translations for every
  string, files on the tenant disk, tenant-aware queued jobs.
- Pest tests per module, including tenant isolation: tenant A can never see or change
  tenant B's data.

Phase 4 - Settings
- Split each customer's settings into tenant settings, and platform settings into
  central admin settings for me, the owner.

Phase 5 - Check
- Run the tests, lint, static analysis, type checks and the frontend build.
- Create two demo tenants with sample data.
- Write a summary: what was ported, what was skipped and why.

Product rules: <add 3-6 rules for your script>

General rules:
- Never change ./source.
- No billing. Leave a TODO where subscription checks would go.
- Do not invent features the source doesn't have.
- Never weaken tenancy, authentication or permission checks to make something work.
- When you are stuck or unsure, stop and ask me.
```

The product rules are where most of the value is. Write down the behavior that must not break: stock that can't go negative, bookings that can't overlap, exam results only a teacher can publish. Our product guides below each include a full set. For how to review each phase without rubber-stamping it, see [AI coding agents in Laravel](/blog/ai-coding-agents-laravel.html).

## Guides for popular scripts

- [Ultimate POS](/blog/convert-ultimate-pos-to-saas.html): move each business from one shared database into its own tenant database, and keep stock and receipts exact.
- [Worksuite](/blog/convert-worksuite-to-saas.html): HR, CRM and projects, with admin, employee and client panels to map onto tenant roles.
- [Booking Core](/blog/convert-booking-core-to-saas.html): how vendors in a booking marketplace differ from tenants, and how to prevent double bookings.
- [Stocky](/blog/convert-stocky-to-saas.html): a Laravel and Vue POS with many warehouses per company.
- [InfixEdu](/blog/convert-infixedu-to-saas.html): one school per license, so permission or the SaaS bundle comes first.
- [Academy LMS and NeonLMS](/blog/convert-academy-lms-neonlms-to-saas.html): course platforms, the CodeIgniter edition, and the Laravel upgrade older code needs.
- [Flex Home](/blog/convert-flex-home-to-saas.html): a Botble CMS real estate site, rebuilt the plain Laravel way.
- [StackFood](/blog/convert-stackfood-to-saas.html): a multi-restaurant marketplace with Flutter apps the kit can't serve yet, because it has no HTTP API.
- [Perfex CRM](/blog/perfex-crm-to-saas.html): what the license allows, and building your own CRM SaaS instead.

## What's left for you

**Billing.** The prompt leaves it out on purpose. Follow [Laravel Stripe subscriptions for a SaaS](/blog/laravel-saas-stripe-billing.html) to bill the tenant, then fill in the TODOs.

**Importing existing customers.** If you already run the script for several customers, write an Artisan command that copies each one into its own tenant database, in dependency order, then compare totals before and after. Our guide to [tenant migrations and seeders](/blog/laravel-tenant-migrations-seeders.html) shows how tenant databases are created.

**Custom domains.** Many customers want their own address. See [custom domains for Laravel tenants](/blog/laravel-tenant-custom-domains.html).

## Frequently asked questions

### Do I need the Extended License to run a CodeCanyon script as a SaaS?

Yes, at least. Envato says an Extended License is required when the end user must pay to use the end product, and each license covers one end product. Also check the author's own terms, which can limit you further.

### Can the AI agent convert a script in one go?

No. The prompt splits the work into five phases and stops after each one for your review. A large script takes several sessions over days or weeks, and most of your time goes into checking business rules and tests.

### What if the script isn't built on Laravel?

The agent documents what the script does first, you approve that write-up, and then it rebuilds the behavior in Laravel. It never copies CodeIgniter or other framework code into the kit.

### Should I buy the author's SaaS edition instead?

If one exists and does what you need, it's the quicker route. Convert to SaaS Laravel when you want a database per customer, a modern frontend and full ownership of the code.

## Start your SaaS

Turning a script into a SaaS is real work, and the review is the part you can't skip. The kit takes the multi-tenant groundwork off the list: a database per customer, sign-in, roles, menus, 17 languages, and tenant-aware files and queues. It's a one-time purchase from $49 with weekly updates. See the [pricing page](/pricing.html).

<BlogPostCta title="A multi-tenant base for your script" text="SaaS Laravel gives every customer their own database, with auth, roles, menus and languages ready. Point your AI agent at it and port your script one module at a time." />
