---
title: "Laravel SaaS Examples: Real Products and Open Source Apps"
description: "Laravel SaaS examples with sources: products confirmed to run on Laravel, plus open source Laravel SaaS apps on GitHub and the exact files worth reading."
pageClass: blog-page
date: 2026-11-11
author: erag
category: saas
tags: [SaaS, Open Source, Examples]
---

# Laravel SaaS Examples: Real Products and Open Source Apps You Can Learn From

<BlogPostMeta />

**Short answer:** Laravel Cloud, Fathom Analytics, Oh Dear, Mailcoach Cloud and Lemon Squeezy are SaaS products whose own teams have said in public that they run on Laravel. If you want code you can actually read, Invoice Ninja, Coolify, Solidtime, Akaunting, Snipe-IT, BookStack, Monica and Krayin CRM are maintained Laravel apps, and each one shows a different way to handle accounts, roles or billing.

You're about to bet a product on Laravel, and someone on the team asks the obvious question: who else actually runs a SaaS on this? Most lists of Laravel SaaS examples answer with a wall of logos and no sources. That's not much help when you're the one who has to defend the choice.

So we did it differently. Every product below links to the place where its own team said it's built with Laravel. For the open source apps, we opened the repositories on 11 November 2026, checked they're Laravel and still maintained, and picked the one file in each that's worth your evening.

## Why most "Laravel SaaS examples" pages don't help

The pages that rank for this today are mostly agency FAQs and directories. They name big brands without saying where the claim comes from, and they never show you how any of those products is put together.

That's the part you actually need. Knowing a famous company uses Laravel tells you the framework is a safe bet. Seeing how a real app scopes every query to the current company tells you how to build yours. We'll do both.

If a company is often listed as "built with Laravel" but we couldn't find the company itself saying so, we left it out.

## SaaS built with Laravel, with sources

| Product | What it does | Source | Worth knowing |
| --- | --- | --- | --- |
| [Laravel Cloud](https://laravel.com/cloud) | Hosting platform for Laravel apps | [Building Laravel Cloud: The Web Application](https://laravel.com/blog/building-laravel-cloud-the-web-application) (Laravel blog, Aug 2025) | React, Inertia and Laravel; action classes shared by the UI and API; Pest for tests |
| [Fathom Analytics](https://usefathom.com) | Privacy-first website analytics | [Fathom's tech stack post](https://usefathom.com/blog/tech-stack) | A Laravel app hosted on Laravel Vapor; Forge runs the servers for custom domains |
| [Oh Dear](https://ohdear.app) | Uptime and website monitoring | [Oh Dear 2.0 launch post](https://freek.dev/2343-oh-dear-20-has-been-launched) (Oct 2022) | The main app was built with Laravel 9 on PHP 8.1 at the time of that launch |
| [Mailcoach Cloud](https://mailcoach.app) | Email marketing | [Mailcoach Cloud launch post](https://freek.dev/2363-mailcoach-cloud-is-now-available-affordable-email-marketing-for-bloggers-artisans-and-entrepreneurs) (Oct 2022) | Multi-tenant with a single database, using Spatie's own laravel-multitenancy package and Horizon for queues |
| [Lemon Squeezy](https://lemonsqueezy.com) | Payments and subscriptions for software | [Lemon Squeezy blog](https://lemonsqueezy.com/blog/laravel-lemon-squeezy) (May 2023) | The team wrote that their entire app is built on Laravel |
| [Invoice Ninja](https://invoiceninja.com) | Invoicing and time tracking | [Its README](https://github.com/invoiceninja/invoiceninja) | Hosted SaaS and self-hosted app from the same codebase; more below |

A few things stand out once you read those posts instead of skimming the logos.

None of them is exotic. Laravel Cloud's own write-up says "the app looks intentionally like any other Laravel app", and credits that for easy onboarding and painless upgrades. That's the team behind the framework choosing plain conventions for their flagship product.

Tenancy doesn't have to be fancy either. Mailcoach Cloud treats each team as a tenant in one shared database. That's a perfectly good model for a real, paying product, and it's the opposite of what we chose for our kit. We compare the two in [single vs multi-database tenancy](/blog/single-vs-multi-database-tenancy-laravel.html).

And infrastructure can change later. Fathom [moved from Heroku to Laravel Vapor](https://usefathom.com/blog/moved-to-vapor) in 2019, then moved its database to SingleStore in 2021. The Laravel app stayed. Pick sensible hosting for launch and stop worrying about the perfect setup.

## Open source Laravel SaaS apps you can read

A quick word on licenses first, because "open source" gets used loosely. Some of these are OSI open source (MIT, Apache-2.0, AGPL-3.0). Others are **source-available**: you can read the code, but the license limits how you use it. Invoice Ninja uses the Elastic License and Akaunting uses the Business Source License. Read before you copy.

These are finished products, not templates. If you were really searching for a free open source Laravel SaaS boilerplate like Wave, we cover those in [Laravel Spark alternatives](/blog/laravel-spark-alternatives.html).

| App | What it is | Laravel version (composer.json) | License |
| --- | --- | --- | --- |
| [Invoice Ninja](https://github.com/invoiceninja/invoiceninja) | Invoicing, quotes, time tracking | 12 | Elastic License |
| [Coolify](https://github.com/coollabsio/coolify) | Self-hostable deployment platform | 12 | Apache-2.0 |
| [Solidtime](https://github.com/solidtime-io/solidtime) | Time tracking for teams | 13 | AGPL-3.0 |
| [Akaunting](https://github.com/akaunting/akaunting) | Accounting for small businesses | 10 | BSL 1.1 |
| [Snipe-IT](https://github.com/grokability/snipe-it) | IT asset management | 12 | AGPL-3.0 |
| [BookStack](https://codeberg.org/bookstack/bookstack) | Documentation wiki | 13 | MIT |
| [Monica](https://github.com/monicahq/monica) | Personal CRM | 12 (beta branch) | AGPL-3.0 |
| [Krayin CRM](https://github.com/krayin/laravel-crm) | Sales CRM | 12 | MIT |

### Invoice Ninja: one codebase, hosted and self-hosted

The data model is the classic SaaS shape: an `Account` has many `Company` records, and users join a company through a `CompanyUser` pivot with flags like `is_owner` and `is_admin`. One person can belong to several companies.

The file to read is `app/Libraries/MultiDB.php`. The hosted version spreads customers across several database connections, and helpers like `findAndSetDbByCompanyKey()` work out which database holds a record before the request carries on. A `Ninja::isHosted()` check, driven by config, switches hosted-only behaviour on and off.

### Coolify: Stripe billing without Cashier

Coolify is a deployment platform you can self-host, and there's also a paid Coolify Cloud. Subscriptions belong to a `Team`, and an `isCloud()` helper decides whether billing applies at all.

Read `app/Http/Controllers/Webhook/Stripe.php`. It verifies the Stripe signature, dispatches `StripeProcessJob` and returns straight away. The job then handles events such as `checkout.session.completed`, `invoice.paid` and `customer.subscription.updated`. Verify, queue, process: that's the right order for any payment webhook. Our [Stripe billing guide](/blog/laravel-saas-stripe-billing.html) covers the same flow with Cashier.

### Solidtime: billing behind a contract

Solidtime is the newest stack here: Laravel 13, Inertia with Vue 3, and Filament for the admin. Each user works inside an `Organization`, with roles defined as an enum (`Owner`, `Admin`, `Manager`, `Employee`, `Placeholder`) and checks going through `app/Service/PermissionStore.php`.

The clever bit is `app/Service/BillingContract.php`. The open source default says every organization has a subscription. The comment explains that the cloud version swaps in a real implementation through an extension. The self-hosted app never knows billing exists. We love this pattern.

### Akaunting: the company ID in the URL

Akaunting puts the company in the path, like `/1/sales/invoices`. The `IdentifyCompany` middleware reads it, checks the user belongs to that company, calls `$company->makeCurrent()` and sets URL defaults so every `route()` call fills in the company ID for you.

Then `app/Scopes/Company.php` adds `where company_id = ?` to queries automatically, with an explicit list of tables to skip. It's a clear example of single-database tenancy done with a global scope. One caveat: it's still on Laravel 10, which tells you something about how hard big upgrades are.

### Snipe-IT: tenancy as a setting

Snipe-IT has a setting called Full Multiple Companies Support. When it's on, `app/Models/Traits/CompanyableTrait.php` adds a global scope so users only see their company's assets.

Read `canCheckoutTo()` in that trait. Its comment lists seven rules for when an item can move between companies, including parent and child companies. It's an honest look at how messy "shared but separate" data gets once real customers ask for exceptions.

### BookStack: permissions that stay fast

BookStack isn't multi-tenant, but it has some of the best permission code in the Laravel world. Content can have its own permissions per role, inherited from shelves to books to chapters to pages.

Checking that row by row would be slow, so `app/Permissions/JointPermissionBuilder.php` precomputes a "joint permissions" table of what each role can see. List queries join that table instead of looping in PHP. Note that BookStack is now managed on Codeberg; the GitHub repo is a mirror.

### Monica: a second level inside the account

Monica's `main` branch is a beta rewrite on Laravel 12 with Jetstream and Inertia; the stable app lives on the `4.x` branch. In the new version an `Account` holds several `Vault`s, and each user gets a permission level per vault on the pivot table (`PERMISSION_MANAGE`, `PERMISSION_EDIT`, `PERMISSION_VIEW` in `app/Models/Vault.php`).

That's useful if your product needs projects or spaces inside a workspace. It's the same question we cover in [teams vs multi-tenancy](/blog/laravel-teams-vs-multi-tenancy.html).

### Krayin CRM: modules and permissions as config

Krayin splits the app into packages under `packages/Webkul/` (Lead, Contact, Quote, Email and more), each with its own service provider, registered through `konekt/concord` in `config/concord.php`.

Permissions are plain config arrays. `packages/Webkul/Admin/src/Config/acl.php` maps keys like `leads.create` to route names, so the role editor, the menu and the route checks all read one list. If you like that idea, see how we seed [permissions from config files](/blog/laravel-permissions-config-files.html).

## What these Laravel SaaS apps have in common

Put eight codebases side by side and the same decisions keep showing up.

1. **There's one "account" model at the centre.** Account, Company, Team, Organization or Vault: every app names it early and hangs everything else off it.
2. **Something sets the current account on every request.** Akaunting uses middleware and a global scope, Invoice Ninja picks a database connection. Nothing reads tenant data before that runs.
3. **Billing sits at the edge.** Coolify queues webhooks, Solidtime hides billing behind a contract, and Invoice Ninja checks a hosted flag. The core app doesn't care who paid.
4. **Permissions are data.** Krayin's config arrays, Solidtime's role enum and BookStack's precomputed table all beat `if ($user->email === ...)` scattered through controllers.
5. **They're plain Laravel.** Controllers, jobs, policies, scopes. Nothing you can't follow after a year of Laravel.

### How to apply this to your own SaaS

Say you're building an invoicing app for accountants. Before writing features:

1. Name your tenant (we'd call it a workspace) and decide what belongs to it.
2. Choose isolation: a `company_id` scope like Akaunting and Mailcoach Cloud, or a [database per tenant](/blog/multi-tenant-saas-laravel-database-per-tenant.html).
3. Put billing behind one class or interface, the way Solidtime does, so you can change providers later.
4. Keep roles and permissions in config or the database, never hard-coded.
5. Budget for upgrades. Akaunting being on Laravel 10 isn't a criticism, it's a warning. We count that cost in [what it costs to build a SaaS with Laravel](/blog/cost-to-build-laravel-saas.html).

## Frequently asked questions

### Which well-known SaaS products are built with Laravel?

Laravel Cloud, Fathom Analytics, Oh Dear, Mailcoach Cloud and Lemon Squeezy have all said so in their own blog posts, and Invoice Ninja says so in its README. Plenty of other names appear on agency lists, but we'd only repeat a claim the company itself made.

### Is there an open source Laravel SaaS I can use as a starting point?

Apps like Invoice Ninja or Solidtime are finished products, not starting points. Stripping one down to reuse its foundation usually takes longer than it saves, and the license may not allow it. Use them to learn patterns, and start from a starter kit or a fresh Laravel app. Our [Laravel SaaS starter kit guide](/blog/laravel-saas-starter-kit.html) explains what to look for.

### Can I copy code from these apps into my commercial SaaS?

Check the license first. MIT and Apache-2.0 allow it with attribution. AGPL-3.0 can require you to publish your own source when you offer the software over a network. The Elastic License and BSL limit offering the software as a service. Learning the pattern and writing your own version is always fine.

### Can Laravel handle a large SaaS?

The products above suggest it can carry a real business, and their posts show where the hard problems end up: databases, queues and hosting rather than the framework. Fathom, for example, moved its database to SingleStore and kept the Laravel app.

## Laravel SaaS examples and SaaS Laravel

SaaS Laravel takes the database-per-tenant path. Each workspace gets its own database through `stancl/tenancy`, a subdomain identifies it, and roles and permissions live in config files, as described in the [multi-tenancy docs](/docs/core/multi-tenancy.html). Like Solidtime's open source edition, it ships without billing on purpose, so you pick the provider. If you want that foundation ready on Laravel 13, have a look at our [multi-tenant Laravel starter kit](/).

<BlogPostCta title="Start with the account model already built" text="SaaS Laravel gives you workspaces with their own databases, roles, invitations and auth on Laravel 13, in Vue, React, Svelte or Livewire. Billing is left to you." />
