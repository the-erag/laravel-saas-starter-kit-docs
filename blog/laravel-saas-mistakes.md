---
title: "Laravel SaaS Mistakes: 15 We Keep Seeing, and the Fixes"
description: "15 Laravel SaaS mistakes we see from idea to growth: tenancy, queues, permissions, billing, backups and AI code, with what to do instead and deeper guides."
pageClass: blog-page
date: 2026-11-11
author: erag
category: saas
tags: [SaaS, Architecture]
---

# Laravel SaaS Mistakes: 15 We Keep Seeing, From First Idea to Growth

<BlogPostMeta />

**Short answer:** The most expensive Laravel SaaS mistakes are rarely about Laravel itself. They come from building the platform before the product, adding multi-tenancy late, forgetting that queues and cache need tenant context, wiring billing to the wrong model, and launching without tested backups or a way to offboard customers. Each one is cheap to avoid early and painful to fix later.

Build enough Laravel SaaS apps, or read enough forum threads from people who have, and you start to notice something. The same handful of mistakes show up again and again, in solo side projects and in teams with funding. We've seen teams lose months to them, and none of them were about writing bad PHP.

This is the cross-cutting list, from idea to growth, for anyone building a SaaS with Laravel. Each mistake has what it looks like, why it hurts, what we'd do instead, and a link to the post that goes deeper.

## Before you build a SaaS with Laravel

### 1. Building the platform before the product

**What it looks like:** Three months in, there's a custom login with two-factor, an admin panel, a roles system and a nice settings page. The feature customers would actually pay for is half done.

**Why it hurts:** Auth, roles and tenancy are necessary, but nobody buys your product for them. Every week there is a week without real feedback.

**What to do instead:** Use what Laravel already gives you (Fortify, the official starter kits, spatie packages) or a paid kit, and spend your own time on the one workflow that makes your product different. Our [boilerplate vs from scratch](/blog/laravel-saas-boilerplate-vs-scratch.html) post has the honest cost breakdown.

### 2. Never deciding who the customer is

**What it looks like:** Every model has a `user_id`. Then a customer asks to add their colleague, and suddenly invoices, projects and settings need to belong to a company, not a person.

**Why it hurts:** "Who owns this data?" is the question every query, permission and invoice depends on. Changing the answer after launch touches every table.

**What to do instead:** Before writing migrations, write one sentence: "A customer is a company, and people belong to it". Then decide if that's a team inside one database or a tenant with its own data. Read [Laravel teams vs multi-tenancy](/blog/laravel-teams-vs-multi-tenancy.html) before you pick.

### 3. Launching free and planning to "add pricing later"

**What it looks like:** The app goes live with no prices, because charging feels awkward before it's "ready".

**Why it hurts:** Free users tell you whether people like the product. Only paying customers tell you whether it's a business. And later is when changing what people get for free is hardest.

**What to do instead:** Pick a value metric (per seat, per project, per invoice sent), put a price on it from day one, and adjust as you learn. Our guide on [how to price a SaaS](/blog/how-to-price-saas.html) walks through models and tiers.

## Architecture mistakes

### 4. Bolting on multi-tenancy after launch

**What it looks like:** The app shipped as a single-tenant product. Now there are forty customers in one database, and someone is adding `tenant_id` to sixty tables and a global scope to every model, while hoping nothing was missed.

**Why it hurts:** Every query you forget to scope is a potential data leak between customers. And a migration like this happens on live data, under pressure.

**What to do instead:** Decide on tenancy before your first migration. Choose the model on facts (isolation needs, reporting across customers, number of tenants), not on what sounds more secure. [Single vs multi-database tenancy](/blog/single-vs-multi-database-tenancy-laravel.html) compares both, and [building a multi-tenant SaaS with a database per tenant](/blog/multi-tenant-saas-laravel-database-per-tenant.html) shows the full setup.

### 5. Business logic living in controllers and components

**What it looks like:** A 300-line `store()` method that validates, creates a workspace, seeds roles, sends emails and calls Stripe. In a Livewire app, the same thing lives in a component action.

**Why it hurts:** You can't reuse it from a queued job or an Artisan command, or test it without HTTP requests. When a second place needs the workflow, someone copies it, and the copies drift apart.

**What to do instead:** Keep controllers and components thin. Validate with a Form Request or Data object, call a service, return a response. See [the service layer pattern in Laravel](/blog/laravel-service-layer-pattern.html).

### 6. Forgetting that background work has no tenant

**What it looks like:** Everything works in the browser. Then the nightly report runs against the central database, a queued email shows another company's name, or a cached value from tenant A appears for tenant B.

**Why it hurts:** Queues, scheduled commands and cache don't have a request, a host or a logged-in user. Whatever context they run in is the one you set, or whatever the last job left behind.

**What to do instead:** Make jobs tenant-aware (stancl's queue bootstrapper does this when jobs are dispatched inside a tenant), keep the jobs table in the central database, pass IDs into jobs rather than relying on `auth()`, and run scheduled work per tenant. [Queued jobs in a multi-tenant Laravel app](/blog/laravel-multi-tenant-queues.html) covers the details.

## Security

### 7. Trusting the tenant scope to cover everything

**What it looks like:** "We use a global scope, so tenants can't see each other's data." Meanwhile, a report uses `DB::table()`, a file path comes from user input, and a form posts a `tenant_id` field that the controller trusts.

**Why it hurts:** Global scopes only apply to Eloquent queries. Raw queries, cache keys, file storage and anything taken from the request skip them. One gap and a customer sees data that isn't theirs, and that's a trust problem no changelog entry fixes.

**What to do instead:** Identify the tenant from the host, never from input. Check every data path, not just Eloquent. Then write one automated test that signs in as tenant A and requests tenant B's records by ID. Our [Laravel SaaS security checklist](/blog/laravel-saas-security-checklist.html) has the full list.

### 8. Checking role names all over the code

**What it looks like:** `if ($user->role === 'admin')` in controllers, Blade views and policies. Then a customer asks for an "Accountant" role that can see invoices but not settings.

**Why it hurts:** Role-name checks are hard-coded decisions. Every new role means hunting through the codebase, and the one you miss either blocks a paying customer or gives someone too much access.

**What to do instead:** Check permissions, not roles: `$user->can('View Invoices')`, `@can` in views, and permission middleware on routes. Roles become named bundles of permissions that admins can change without a deploy. [Laravel roles and permissions with Spatie](/blog/laravel-roles-permissions-spatie.html) shows the setup.

## Billing

### 9. Wiring billing to the wrong model, and trusting the redirect

**What it looks like:** `Billable` sits on the `User` model because that's the default in Cashier's docs, even though the company pays. And subscriptions are activated on the "thanks for paying" page after Stripe Checkout.

**Why it hurts:** When the person who paid leaves the company, the subscription leaves with them. And a success page is not proof of payment: the browser can close before it loads, and renewals, failed payments and cancellations never visit it.

**What to do instead:** Put `Billable` on whatever pays (often the tenant or team model, registered with `Cashier::useCustomerModel()`), keep billing data in the central database, and let [Cashier's webhooks](https://laravel.com/docs/13.x/billing#handling-stripe-webhooks) drive the subscription state. [Laravel Stripe subscriptions for a SaaS](/blog/laravel-saas-stripe-billing.html) walks through it with stancl/tenancy.

### 10. Plan checks scattered through the app

**What it looks like:** `if ($tenant->plan === 'pro')` in twenty places, with limits like "5 users" typed straight into controllers.

**Why it hurts:** Changing a plan, adding a tier or giving one customer a special deal means another hunt through the code. Two requests at the same moment can also both squeeze past "the last free slot".

**What to do instead:** Keep plan limits in config, check them through one service, and treat "can this tenant use this feature?" as its own question, separate from "has this user got permission?". [Laravel SaaS usage limits](/blog/laravel-saas-usage-limits.html) builds that service, including the race condition fix.

## Launch

### 11. Backups nobody has ever restored

**What it looks like:** A nightly dump of the central database runs on the server. Nobody has tried a restore, and the tenant databases aren't in the backup at all.

**Why it hurts:** With a database per tenant, the list of databases grows every time someone signs up. A backup set up on day one quietly misses every new customer. And the first restore you attempt should not be during an incident.

**What to do instead:** Back up the central database, every tenant database and tenant files, store copies off the server, and practise restoring one tenant without touching the others. [Backups for a multi-database Laravel SaaS](/blog/laravel-multi-database-backups.html) shows how.

### 12. Deploying like it's a single-database app

**What it looks like:** The deploy script runs `php artisan migrate` and forgets `tenants:migrate`. Or it runs both, and one failing tenant leaves half the customers on the new schema. New subdomains show certificate errors because TLS was set up for one hostname.

**Why it hurts:** Your code and your tenant databases disagree, and the failure only shows up for some customers, which makes it hard to spot.

**What to do instead:** Write backwards-compatible migrations, run tenant migrations in the deploy script, canary risky ones on a couple of tenants first, and set up wildcard DNS and TLS before launch. [Deploying a Laravel SaaS to production](/blog/deploy-laravel-saas.html) has the script, and the [launch checklist](/blog/laravel-saas-launch-checklist.html) covers everything else.

## Growth

### 13. No way to suspend, export or delete a customer

**What it looks like:** A card fails and nothing happens. A customer asks for their data or for their account to be deleted, and someone opens a database client and starts typing SQL.

**Why it hurts:** Manual offboarding is slow and hard to audit, and deleting the wrong tenant's database can't be undone. Under GDPR, export and erasure requests also come with deadlines.

**What to do instead:** Build these as real features: a workspace status that blocks access but keeps the billing page reachable, an export job, and a deletion flow with a grace period and a backup first. Start with [suspending customer accounts](/blog/suspend-tenant-accounts-saas.html) and [deleting tenants safely](/blog/delete-tenant-laravel-safely.html).

### 14. Growing without knowing your numbers

**What it looks like:** Revenue lives in the Stripe dashboard, sign-ups in a database query someone runs on Fridays, and nobody can say how many new workspaces reached the point where the product was useful to them.

**Why it hurts:** You can't tell if last month's change helped. Churn arrives as a surprise, not a trend.

**What to do instead:** Pick a handful of numbers (MRR, churn, activation) and record them every day from the start. History you didn't record can't be rebuilt later. [Laravel SaaS metrics: MRR, churn and activation](/blog/laravel-saas-metrics-mrr-churn.html) shows how, and [the onboarding guide](/blog/laravel-saas-onboarding-flow.html) helps with the activation part.

### 15. Merging AI-written code nobody reviewed

**What it looks like:** An agent adds a feature in ten minutes. It works in the browser, so it gets merged. Nobody notices it skips the permission check or caches data without the tenant in mind.

**Why it hurts:** AI tools are fast at code that looks right. In a multi-tenant app, "looks right" and "is isolated" are different things, and the agent doesn't know your conventions unless you tell it.

**What to do instead:** Give the agent your rules (Laravel Boost guidelines, an `AGENTS.md`), run Larastan and Pint in CI, and review its changes like a junior developer's pull request. See [using AI coding agents on a Laravel codebase](/blog/ai-coding-agents-laravel.html).

## The pattern behind these Laravel SaaS mistakes

Most of these have the same shape: a decision that's cheap on day one and expensive on day 300. None need to be perfect early. They need to be made on purpose.

If you only fix three before launch, we'd pick these: decide your tenancy model (4), test that one tenant can't read another's data (7), and restore a backup once (11).

## Frequently asked questions

### What is the biggest mistake when building a SaaS with Laravel?

Building too much before anyone pays. Auth, admin panels and settings feel productive, but they don't tell you whether the product works. Our [30-day MVP plan](/blog/build-saas-mvp-laravel.html) shows what to leave out. Close behind is adding multi-tenancy late.

### Is Laravel a good choice to build a SaaS?

Yes, for most B2B SaaS products. Laravel has first-party answers for auth, queues, scheduling, billing and testing, and packages like stancl/tenancy and spatie/laravel-permission cover multi-tenancy and roles. The mistakes above are about decisions, not the framework.

### Should I use a starter kit or build my SaaS from scratch?

If the auth, tenancy and roles in a kit match how you'd build them anyway, a kit saves you weeks. Build from scratch if your product needs a very different structure. Either way, read the code you start from, because you'll maintain it.

### When should I add multi-tenancy to a Laravel SaaS?

Before your first real customer, ideally before your first migration. Starting with tenancy and one tenant is far easier than adding it to a live app. If you're unsure, our [stancl/tenancy tutorial](/blog/stancl-tenancy-tutorial.html) shows the first steps.

## How SaaS Laravel helps with these mistakes

We built the [SaaS Laravel starter kit](/) around the early decisions on this list: a database per tenant with stancl/tenancy, tenants on subdomains, permissions instead of role checks, thin controllers with services, tenant-aware queues, and workspace statuses for suspending a tenant. It doesn't include billing, metrics dashboards or backups, so mistakes 9, 10, 11 and 14 are still yours to get right. It does ship Laravel Boost guidelines, Larastan and Pint, which help with 15. Our [buyer's guide to Laravel SaaS starter kits](/blog/laravel-saas-starter-kit.html) helps you decide if a kit fits at all.

<BlogPostCta title="Get the early decisions right on day one" text="SaaS Laravel gives you multi-tenancy, auth, roles and permissions on Laravel 13, so you can spend your time on the product and not the plumbing." />
