---
title: "Cost to Build a SaaS With Laravel: Hours, Formula, Running Costs"
description: "The cost to build a SaaS with Laravel, worked out in hours: example estimates per feature, a formula for your own rate, three scenarios and real running costs."
pageClass: blog-page
date: 2026-11-11
author: erag
category: saas
tags: [SaaS, Costs, Planning]
---

# The Cost to Build a SaaS With Laravel: Hours, a Formula and Real Running Costs

<BlogPostMeta />

**Short answer:** The cost to build a SaaS with Laravel is hours × hourly rate, plus a buffer, plus running costs and maintenance. With our example assumptions, the foundation alone (auth, tenancy, roles, billing, admin, emails, onboarding, deployment and tests) takes roughly 350 to 760 hours before you build a single product feature. Running a small Laravel SaaS can start well under $100 a month; the cost that keeps growing is maintenance time.

Say you're a founder with an idea for an invoicing app for accountants. You ask around and get three quotes: $15,000, $45,000 and $120,000. Same app, same one-page brief. Which one is right?

Probably none of them, because nobody showed you the hours behind the number. This post does exactly that. Every figure below is an example assumption you can change, and there's a formula so you can plug in your own rate. If you're a developer weighing whether to build it yourself, the same maths works for you.

## Why Laravel SaaS development cost quotes are all over the place

Most pages that rank for this question are agency FAQs. They give a range like "$30k to $70k for an MVP" and stop there. No hours, no breakdown, no mention of what it costs to keep the thing running.

Quotes differ for three boring reasons. The scope isn't written down, so each person imagines a different product. Hourly rates vary hugely by country and experience. And whoever carries the risk of overruns prices it in. Fix the scope and the rate, and the quotes start to agree.

## The formula

Here's the whole thing. Write it on a sticky note.

```text
Build cost    = (foundation hours + product hours) × (1 + buffer) × hourly rate
Year-one cost = build cost + (12 × monthly running costs) + (maintenance hours × hourly rate)
```

- **Foundation hours** are the parts every SaaS needs. The table below estimates them.
- **Product hours** are the features that make your app worth paying for. Only you can estimate those.
- **Buffer** covers unknowns, rework and back-and-forth. We use 20 to 30 percent in the examples.
- **Hourly rate** is your rate, your freelancer's rate, or an agency's blended rate.

## The parts of a SaaS and example hours

These are our example assumptions for an experienced Laravel developer building each part properly, with tests for that part. They're not a quote. A developer who's built three SaaS apps will land near the low end; a first-timer won't.

| Part | What's included | Low (h) | High (h) | Mid (h), used below |
| --- | --- | --- | --- | --- |
| Authentication | Login, sign-up, reset, email verification, 2FA, passkeys | 40 | 80 | 60 |
| Multi-tenancy | Tenant model, identification, data isolation, tenant migrations, queues and cache | 80 | 120 | 100 |
| Users, invitations, roles | Invites with expiring links, roles and permissions on routes, menus and buttons | 40 | 80 | 60 |
| Settings and layouts | Profile, workspace settings, navigation, languages | 30 | 60 | 40 |
| Billing | Plans, checkout, webhooks, trials, plan changes, invoices | 40 | 120 | 80 |
| Admin area | Find a customer, suspend a workspace, maintenance mode | 30 | 80 | 50 |
| Transactional emails | Templates, queues, branding, translations | 15 | 40 | 25 |
| Onboarding | Setup wizard, checklist, sample data | 20 | 50 | 35 |
| Deployment and ops | Servers, CI, queue workers, scheduler, backups, error tracking | 20 | 50 | 35 |
| Test suite and tooling | Feature tests across tenants, static analysis, formatting, CI checks | 30 | 80 | 50 |
| **Foundation total** | | **345** | **760** | **535** |

Two rows move the most. Multi-tenancy grows fast with a database per tenant, because queues, cache, files, migrations and backups all need to know which tenant they're working for. Billing grows with every edge case: proration, failed payments, taxes, coupons. If you sell to businesses in many countries, take the high number.

These line up with the rough week ranges in our [30-day MVP plan](/blog/build-saas-mvp-laravel.html), just in hours so you can multiply them.

## Three scenarios, with example numbers

Let's run the invoicing app through the formula three ways. We'll assume the product itself (clients, invoices, PDF export, reminders) takes **200 hours**. All rates are made-up examples, so swap in real ones from your market.

| | Solo dev, building it yourself | Freelancer | Agency |
| --- | --- | --- | --- |
| Foundation + product hours | 535 + 200 = 735 | 535 + 200 = 735 | 735 + 35% for PM, design, QA = 992 |
| Buffer (example) | 30% | 20% | 20% |
| Total hours | ~956 | ~882 | ~1,190 |
| Hourly rate (example) | $40 (what your time is worth) | $60 | $100 (blended) |
| **Build cost (example)** | **~$38,000 of your time** | **~$53,000** | **~$119,000** |
| Calendar time | ~24 weeks full-time, ~48 weeks at 20 h/week | ~22 weeks at 40 h/week | Depends on team size |

### Solo developer

Your cash cost is close to zero, but your time isn't free. At 20 hours a week of evenings and weekends, 956 hours is nearly a year. That's the real price: a year before your first paying customer, while the market moves.

The trap we see most is spending month three on a settings page nobody asked for. Be strict about what's foundation and what's product.

### Freelancer

You pay for hours, and the risk of overruns is mostly yours. Ask for the estimate per part, like the table above, not one total. Then ask what's *not* included. Billing, the admin area and deployment are the rows most often missing from a cheap quote.

### Agency

The agency number is higher because you're also buying project management, design, QA and someone who answers the phone when things break. For a non-technical founder that can be worth it. Make sure the quote says who owns the code and what support costs after launch.

### What about AI coding agents

They do cut typing time, especially for CRUD screens and tests. They don't cut the hours spent deciding how tenancy works, reviewing generated code or fixing the bug it introduced in your permission checks. We'd lower the product hours a little if your team uses agents well, and leave the foundation and buffer alone.

## Running costs, as of November 2026

These come from each provider's pricing page on 11 November 2026. Prices change, so check before you budget.

| Item | Example option | Price (as of Nov 2026) |
| --- | --- | --- |
| Server management | [Laravel Forge](https://laravel.com/forge/pricing) Hobby | $12/month, plus the server |
| Server | DigitalOcean Basic Droplet, 2 GiB RAM | $12/month |
| Managed hosting (alternative) | [Laravel Cloud](https://laravel.com/cloud/pricing) Starter | $5/month plus usage, with $5 usage credit included |
| Transactional email | Postmark | Free for 100 emails/month; Basic $15/month for 10,000 |
| Transactional email (alternative) | Amazon SES | $0.10 per 1,000 emails (pay as you go) |
| Error tracking | Sentry | Developer plan free (5k errors); Team $29/month, or $26/month billed yearly |

Laravel Cloud's own pricing page includes a "SaaS MVP app" scenario that it estimates at about $46 a month. For a full comparison of the hosting options, see [Laravel Cloud vs Forge vs Vapor](/blog/laravel-cloud-vs-forge-vs-vapor.html).

A few items we'd budget as assumptions, because they depend too much on your setup:

- **Backups:** offsite object storage for database dumps. Assume $5 to $20 a month for a small app, more with a database per tenant. Our post on [backups for a multi-database SaaS](/blog/laravel-multi-database-backups.html) explains why that's different.
- **Domain and DNS:** assume $10 to $20 a year for the domain.
- **Payment fees:** a percentage of every transaction, set by your provider and your region. Compare them in [Stripe vs Paddle vs Lemon Squeezy](/blog/stripe-vs-paddle-vs-lemon-squeezy-laravel.html).

Add it up and a small Laravel SaaS on Forge with one server, Postmark Basic and Sentry's free plan runs about $40 to $60 a month before payment fees. Hosting is rarely what sinks a young SaaS.

To try your own numbers, the [Laravel SaaS hosting cost calculator](/tools/laravel-saas-hosting-cost-calculator.html) estimates a monthly range from your tenants, daily users and emails, and shows every price and rule it uses.

## The hidden costs nobody quotes

The build is a one-time bill. These keep arriving.

### Maintenance

Bugs, dependency updates, small changes customers ask for. We plan on 10 to 20 percent of the build hours per year as an assumption. For the freelancer example, that's 90 to 180 hours a year, or $5,400 to $10,800 at $60 an hour. Change the percentage once you have real numbers.

### Upgrades

Laravel ships a major version every year, and each release gets security fixes for two years, according to the [Laravel release notes](https://laravel.com/docs/13.x/releases). Laravel 12 stopped getting bug fixes in August 2026. Your frontend, Inertia or Livewire and every package move on their own schedules too. Budget an upgrade window every year, even when the upgrade guide says it's small. Our [Laravel 13 guide](/blog/laravel-13-new-features.html) shows what a recent one involved.

### Support

Once customers arrive, someone answers their emails, resets their 2FA and explains why an invoice didn't send. Assume a few hours a week to start. If that someone is you, it comes out of product time.

### Everything around the code

Privacy policy, terms, tax registration, a status page, accounting. None of it is code, and all of it costs time or money. Your pricing should cover it, which is why [how to price your SaaS](/blog/how-to-price-saas.html) belongs in this calculation too.

## How a starter kit changes the maths

A starter kit doesn't change the formula. It replaces some foundation hours with a price and some learning time:

```text
Foundation hours with a kit = hours for parts the kit doesn't cover + hours to learn the kit
```

We weigh the wider pros and cons in [boilerplate vs building from scratch](/blog/laravel-saas-boilerplate-vs-scratch.html), so here's only the arithmetic. Take the freelancer example and a kit that covers auth, multi-tenancy, users and roles, most settings and layouts, part of the admin area and the test tooling. That removes about 310 of the 535 foundation hours. Billing, onboarding, emails and deployment are still yours.

| | From scratch | With a kit (example) |
| --- | --- | --- |
| Foundation hours | 535 | 225 + 20 to learn the kit = 245 |
| Product hours | 200 | 200 |
| Total with 20% buffer | ~882 | ~534 |
| Build cost at $60/hour | ~$53,000 | ~$32,000 plus the kit price |

That's a real difference, but only if the kit fits. If its tenancy model or frontend is wrong for your product, you'll spend the saved hours fighting it.

## Frequently asked questions

### How much does it cost to build a SaaS with Laravel?

Multiply your hours by your rate. With our example assumptions, the foundation is 350 to 760 hours and a simple product adds a few hundred more. At an example rate of $60 an hour, that's roughly $40,000 to $70,000 with a buffer. Your rate and your scope will move that number more than the framework will.

### How long does it take to build a SaaS with Laravel?

Divide the hours by your weekly capacity. Our example invoicing app is about 880 to 960 hours from scratch: around 22 to 24 weeks for one full-time developer, or nearly a year part-time. Starting from a kit that covers the foundation can bring it down to a few months.

### How much does it cost to run a Laravel SaaS per month?

A small app can run on one server with Forge, a transactional email service and a free error tracking plan for roughly $40 to $60 a month as of November 2026, before payment fees. Costs grow with traffic, workers, databases and backups, and with paid plans once you outgrow the free tiers.

### Is Laravel cheaper than other frameworks for building a SaaS?

Laravel's first-party packages (Fortify, Cashier, Horizon, Pennant) and cheap PHP hosting can cut a lot of hours. But the biggest factor is your team. A framework your developers already know will be cheaper than a "faster" one they're learning on your budget.

## The cost of SaaS Laravel

SaaS Laravel is a one-time purchase: Vue $55, React $69, Svelte $59, Livewire $49, or $139 for all four, with lifetime access and weekly updates. It covers the authentication, multi-tenancy, users, roles and invitations rows of the table, most of settings and layouts, and part of the admin area (workspace status, suspension and per-tenant maintenance mode), with Pest, Larastan and Pint already set up. It does not include billing, so keep those hours in your estimate. Our [Laravel SaaS starter kit](/) page and [pricing](/pricing.html) have the full details, and you can see what real apps look like in our [Laravel SaaS examples](/blog/laravel-saas-examples.html).

<BlogPostCta title="Cross the foundation rows off your estimate" text="SaaS Laravel ships auth, database-per-tenant multi-tenancy, roles and invitations on Laravel 13 for a one-time price. Billing and your product are still yours to build." />
