---
title: "Perfex CRM as a SaaS: What the License Allows"
description: "Can you run Perfex CRM as a multi-tenant SaaS? What its terms allow, the official Perfex CRM Cloud, and how to build your own CRM SaaS instead."
pageClass: blog-page
date: 2026-11-26
author: erag
category: saas
tags: [Perfex CRM, SaaS, AI Agents]
---

# Perfex CRM as a SaaS: What the License Allows and What to Build Instead

<BlogPostMeta />

No. You can't take one Perfex CRM license, or one installation, and sell it to many businesses as a multi-tenant SaaS. The [Perfex CRM terms of service](https://perfexcrm.com/terms) say "Each installation may serve only one business or organisation", and they name multi-tenant SaaS as an example of what the license doesn't cover. So this post is not a conversion guide. It explains what the terms allow, the official hosted plan that's on the way, and how to build your own CRM SaaS from a feature spec if that's what you're after.

Perfex is one of several CodeCanyon products people ask about. For scripts whose licenses do allow a paid SaaS, start with our guide to [turning a CodeCanyon Laravel script into a SaaS](/blog/codecanyon-laravel-script-to-saas.html).

## The two Perfex CRM editions

Perfex now comes in two editions, and people often mix them up.

- **Perfex CRM Next** is the new edition. The [Perfex CRM homepage](https://perfexcrm.com/) says it's built on Laravel, and the [compare page](https://perfexcrm.com/compare) calls it "Modern Laravel + Livewire". It's sold only on perfexcrm.com. It has its own module system, and an official data migrator from Classic.
- **Perfex CRM Classic** is the established CodeIgniter edition. It's sold on perfexcrm.com and as [Perfex CRM on CodeCanyon](https://codecanyon.net/item/perfex-powerful-open-source-crm/14013737) by MSTdev.

Both are one-time, self-hosted purchases. The [terms](https://perfexcrm.com/terms) give each license one production domain, plus unlimited development and staging environments on that domain or its subdomains.

The license rule doesn't change with the edition. Being on Laravel makes Next easier to extend, but it doesn't make multi-tenant use allowed. If you buy Classic on CodeCanyon, Envato's own [Regular and Extended licenses](https://codecanyon.net/licenses/standard) also cover a single end product each. Read the Perfex terms either way.

## What the Perfex terms say

Three lines in the [terms](https://perfexcrm.com/terms) matter here:

- Each installation may serve only one business or organization.
- You can't use the license to provide the CRM to several businesses, for example as a multi-tenant SaaS.
- Each client CRM needs its own license. Reselling, sublicensing or redistributing needs prior written consent.

There is no official multi-tenant SaaS module or edition. You'll find third-party SaaS modules for Perfex in marketplaces. They aren't official, and installing one doesn't change the terms. The terms limit what the license allows, whatever code you add on top.

## Your options

### 1. One license per client install

If you're an agency that sets up and hosts CRMs for clients, give each client its own installation with its own license. That's what the terms describe. Each install is separate, with its own database, updates and backups. It isn't a SaaS in the multi-tenant sense, but it's a clean way to sell CRM hosting and setup as a service. The terms allow these client installations, so you don't need extra consent for them. Check the terms on who should hold each license, and get written consent before you resell, sublicense or redistribute anything beyond that.

### 2. Use Perfex CRM Cloud

[Perfex CRM Cloud](https://perfexcrm.com/cloud) is the official hosted plan, described as "Your CRM, hosted and looked after for you". The page says it "opens soon" and has a waitlist, and it doesn't say whether it runs Next or Classic. If your clients just want a hosted Perfex, pointing them there is the simplest route.

### 3. Ask Perfex for written permission

If you have a specific plan, such as a white-label CRM for one industry, ask Perfex directly. Only written permission from them changes what you're allowed to do. A forum post or a module's sales page doesn't.

### 4. Build your own CRM SaaS

If you want a CRM you can sell to many businesses on monthly plans, build it as your own product. You write the feature spec, an AI agent builds it on a starter kit made for tenants, and you own all of the code. The rest of this post covers that route on SaaS Laravel.

One rule before you start: **don't copy Perfex code, screens or text.** You're not porting anything. CRM features like leads and invoices are common ideas, and you describe them in your own words, for your own customers.

## Write the CRM feature spec

The spec is a plain Markdown file in the kit, for example `kit/crm-spec.md`. The agent builds from it and nothing else, so be specific. A first version might cover:

- **Leads**: capture from a public form, assign to a staff member, move through stages you define, convert to a customer.
- **Customers and contacts**: companies with many contacts, notes, and a timeline of activity.
- **Projects and tasks**: projects per customer, tasks with assignees, due dates, statuses and comments.
- **Quotes and invoices**: line items, taxes, numbering per workspace, PDF export, and payment records entered by staff.
- **Support tickets**: customers raise tickets, staff reply, with statuses and priorities.
- **Files**: attachments on customers, projects and tickets.

Leave out what you don't need yet. Calendars, contracts, a knowledge base and email inboxes can come later, each as its own spec section.

## How the CRM maps to tenants

Each business you add becomes one tenant with its own database. You, the owner, live in the central app. You create tenants from the kit's central admin; a public sign-up page for new customers is yours to build.

| Person | In SaaS Laravel |
| --- | --- |
| You, the SaaS owner | Central app, `super-admin` role |
| Business you added | Tenant, its owner gets the tenant `super-admin` role |
| Sales or support manager | Tenant `manager` role, or a custom role |
| Staff member | Tenant `employee` role with CRM permissions |
| Customer contacts | Records in the tenant database; a client portal is a later phase |

## What's tricky in a CRM SaaS

**Public forms need to know the tenant.** A lead form on a customer's website posts to your app with no logged-in user. The form URL has to identify the tenant, through the tenant's domain or a per-form token, before anything is written.

**Numbering is per tenant.** Invoice and quote numbers must be unique and gapless inside each workspace. Generate them in a transaction with a row lock, so two staff members saving at the same time don't get the same number.

**Scheduled work runs per tenant.** Overdue invoice reminders and task due dates run for every tenant. Our post on [multi-tenant scheduled tasks](/blog/laravel-multi-tenant-scheduled-tasks.html) and the one on [tenant-aware queues](/blog/laravel-multi-tenant-queues.html) cover how.

**Files stay per tenant.** The kit's filesystem bootstrapper gives each tenant its own local and public disk folder. Keep every attachment on it, as our [tenant cache and filesystem guide](/blog/laravel-tenant-cache-filesystem.html) explains.

**A client portal is a second app.** Customers logging in to see invoices and tickets need their own guard, routes and permissions. Build the staff side first, then add the portal as its own phase.

## Set up the folder

There's no source folder this time, because you aren't porting a script. Clone the kit and install it.

```bash
mkdir my-saas && cd my-saas
git clone https://github.com/the-erag/saas-laravel-starter-kit-vue.git kit
cp kit/.env.example kit/.env
```

Edit `kit/.env` (at least `APP_URL`, `APP_DOMAIN` and the `DB_*` keys) and create that database. Then install and seed the kit:

```bash
cd kit && composer setup && php artisan db:seed
```

Swap the clone URL for `react`, `svelte` or `livewire` if you prefer another kit. The kit repositories are private, so you need [repository access](/docs/purchase/repository-access.html) from your purchase before you clone. The [installation docs](/docs/getting-started/installation.html) explain each step. Then save your spec as `kit/crm-spec.md`. Our [CodeCanyon script guide](/blog/codecanyon-laravel-script-to-saas.html) uses a two-folder layout with a read-only `source/` folder, which is for scripts you're licensed to convert.

## The prompt

Paste this into Claude Code, Codex or Junie from the `kit` folder. The kit ships `AGENTS.md`, `CLAUDE.md` and skills from [Laravel Boost](/blog/laravel-boost-ai-agents.html), so the agent learns its conventions first.

```text
You are building a CRM as new modules in this SaaS Laravel kit, from my written spec.

Project:
- This kit is the only project. Read AGENTS.md and CLAUDE.md, and the skills they
  point to, before you change anything.
- crm-spec.md is the feature spec. Build what it describes and nothing more.
- This is a new product. Do not reproduce the code, screens, wording or database
  design of any existing CRM product, even if you know one.

Target model:
- Every business I add is a tenant with its own database.
- Sign-in, users, roles, permissions, menus, languages and notifications come from
  the kit. Do not build a second auth, role, menu or translation system.

Work in five phases. Stop after each phase, report, and wait for me to say "go".

Phase 1 - Understand (no code changes)
- Read crm-spec.md and the kit's module structure.
- Propose the modules (for example Leads, Customers, Projects, Invoices, Tickets),
  their tables and relations, routes, permissions per module, settings, scheduled and
  queued jobs, and file uploads.
- List every gap or contradiction in the spec as a question for me.
- Propose the build order.

Phase 2 - Foundation
- Add only the Laravel 13 packages the spec needs (for example a PDF library for
  invoices).
- Write tenant migrations and models for the approved modules.

Phase 3 - Features, one module at a time
- Thin controllers, logic in service classes, validation the kit's way: Data objects
  in the Inertia kits, Form Requests in the Livewire kit.
- Pages in the kit's frontend, permissions in the kit's config, menu entries,
  translations for every string, attachments on the tenant disk, tenant-aware queued
  jobs.
- Pest tests per module, including tenant isolation: a user in tenant A can never see
  or change tenant B's leads, customers, invoices or tickets.

Phase 4 - Settings
- Tenant settings for each business (company details, currency, tax rates, invoice
  number format, lead stages, ticket priorities).
- Central admin settings for me, the owner, kept separate.

Phase 5 - Check
- Run the tests, lint, static analysis, type checks and the frontend build.
- Create two demo tenants with sample leads, customers, a project and an invoice.
- Write a summary: what was built, what from the spec was skipped and why.

CRM rules:
- Public lead forms must resolve the tenant from the domain or a per-form token before
  writing anything, and must be rate limited.
- Invoice and quote numbers are unique and gapless per tenant. Generate them in a
  transaction with a row lock, with a test where two saves race.
- Reminders and recurring jobs run per tenant and never mix tenants' data.
- Staff only see records their permissions allow. Customer contacts are not login
  users in this build.

General rules:
- No billing. Leave a TODO where plan limits or subscription checks would go.
- Do not invent features the spec doesn't describe. Ask me instead.
- Never weaken tenancy, authentication or permission checks to make something work.
- When you are stuck or unsure, stop and ask me.
```

The Understand phase is where you catch a vague spec, so answer its questions before you say "go". A CRM with these six modules is days to weeks of agent sessions and review, not an afternoon. Our post on [working with AI coding agents in Laravel](/blog/ai-coding-agents-laravel.html) covers how to review each phase properly, and the [Pest guide for multi-tenant apps](/blog/test-multi-tenant-laravel-pest.html) shows what good isolation tests look like.

## What's left for you

**Billing.** The prompt leaves it out. When you're ready, follow [Laravel Stripe subscriptions for a SaaS](/blog/laravel-saas-stripe-billing.html) to bill the tenant, then fill in the TODOs the agent left.

**Custom domains.** Businesses often want the CRM on their own domain, which also helps lead forms. See [custom domains for Laravel tenants](/blog/laravel-tenant-custom-domains.html).

**Tenant settings.** For how per-business settings are stored and cached, see [tenant settings in Laravel](/blog/laravel-tenant-settings.html).

Planning the CRM modules for your own SaaS? Our guide to [build a CRM SaaS with Laravel](/use-cases/laravel-crm-saas.html) covers the modules, roles and build order.

## Frequently asked questions

### Can I turn Perfex CRM into a SaaS?

Not as a multi-tenant SaaS on one license. The Perfex terms say each installation may serve only one business or organization and rule out multi-tenant use. You can host separate installs for clients with one license each, wait for Perfex CRM Cloud, or ask Perfex for written permission.

### Is there an official Perfex SaaS?

There's no official multi-tenant SaaS module or edition. Perfex CRM Cloud is an official hosted plan. Its page at [perfexcrm.com/cloud](https://perfexcrm.com/cloud) says it "opens soon" and has a waitlist.

### Does a third-party SaaS module make it allowed?

No. Third-party SaaS modules aren't official, and the license terms apply no matter what code you install. Only written consent from Perfex changes them.

### Which Perfex edition is Laravel?

Perfex CRM Next, sold on perfexcrm.com, is built on Laravel and Livewire. Perfex CRM Classic, also sold on CodeCanyon, is built on CodeIgniter. The license rule is the same for both.

## Build a CRM you own

If you want to sell a CRM to many businesses, build one you own outright. Writing the spec is the hard part, and that's work you'd do for any product. The kit gives you a database per tenant, sign-in, roles, menus, 17 languages and tenant-aware files and queues, so your agent spends its time on CRM features. It's a one-time purchase from $49 with weekly updates. See the [pricing page](/pricing.html).

<BlogPostCta title="A tenant-first base for your own CRM" text="SaaS Laravel gives every customer their own database, with auth, roles, menus and languages in place. Write your CRM spec and let your AI agent build it module by module." />
