---
title: "Which Laravel Tenancy Model Fits You? A Quiz"
description: "Answer eight questions and see whether a single database or a database per tenant fits your Laravel SaaS, with the reasons behind the result. No sign-up."
breadcrumb: "Laravel tenancy model quiz"
sidebar: false
editLink: false
lastUpdated: false
---

# Which Laravel Tenancy Model Fits You?

Answer eight short questions about your customers and your hosting, and this quiz tells you whether a single database or a database per tenant suits your Laravel SaaS. It's for developers who are about to start, because this choice is hard to change later. It takes about a minute, runs in your browser and asks for no email.

## The two models in one paragraph each

A **tenant** is one customer account, such as a company or a school, with its own users and data. Multi-tenancy means many tenants share one application.

With a **single database**, every tenant's rows sit in the same tables, and each row has a `tenant_id` column. Every query must filter by it. It's simple to host and easy to report across, but one missing filter shows one customer's data to another.

With a **database per tenant**, each tenant gets its own database, and the app switches to it at the start of each request. Data is kept apart by the database server itself, and you can back up or export one customer on its own. In exchange, you create, migrate and back up many databases.

## Take the quiz

<TenancyQuiz />

<PricingBlock />

## How this quiz works

Each answer adds points to one side or the other. The side with more points wins. If the two totals are within one point of each other, the quiz calls it a close call, because then a different weighting would flip the result. One answer overrides the rest: if your host can't create databases, a database per tenant isn't possible there.

| Question | Answer | Single database | Database per tenant |
| --- | --- | --- | --- |
| Customers | Companies or schools with a contract | 0 | 2 |
| | Individuals or small self-serve teams | 2 | 0 |
| Tenants in two years | Under 1,000 | 0 | 1 |
| | 1,000 to 10,000 | 1 | 0 |
| | Tens of thousands, many tiny | 3 | 0 |
| Isolation, own backups, security reviews | Often | 0 | 3 |
| | Sometimes | 0 | 1 |
| | No | 1 | 0 |
| Live queries across all tenants | Core feature | 3 | 0 |
| | Internal reports only | 1 | 0 |
| | No | 0 | 1 |
| Records shared between tenants | Yes | 3 | 0 |
| | No | 0 | 1 |
| App can create databases | Not sure | 1 | 0 |
| | No | 3 | 0 (and rules it out) |
| Uneven data between customers | Some have millions of rows | 0 | 2 |
| | Similar and small | 1 | 0 |
| Running many databases | Fine if automated | 0 | 1 |
| | Rather run one | 2 | 0 |

Answers not in the table add nothing. The weights are our judgement, based on where each model tends to hurt in practice. They aren't a formula from a paper, so treat the result as a second opinion, not a ruling.

## What to read for each result

### If you got a database per tenant

Read [how to build a multi-tenant SaaS with Laravel](/blog/multi-tenant-saas-laravel-database-per-tenant.html) for the setup, then plan the parts that grow with each customer: [tenant migrations](/blog/laravel-tenant-migrations-seeders.html) and [backups for many databases](/blog/laravel-multi-database-backups.html). Check that your host lets the app run `CREATE DATABASE`. The [hosting cost calculator](/tools/laravel-saas-hosting-cost-calculator.html) gives you a rough monthly figure.

### If you got a single database

Read [single vs multi-database tenancy](/blog/single-vs-multi-database-tenancy-laravel.html) for how to scope queries safely, and [teams vs multi-tenancy](/blog/laravel-teams-vs-multi-tenancy.html) if your accounts are really teams. Laravel's own starter kits can be generated with team support, which is a shared-database model.

We should be clear here: the SaaS Laravel kits use a database per tenant. If the quiz points you to a single database for good reasons, our kit isn't the right base for that product.

### If it was a close call

Go back to the question your buyers will ask first. If they ask where their data is kept, choose a database per tenant. If your main feature reads across accounts, choose a single database. The [Laravel SaaS starter kit buyer's guide](/blog/laravel-saas-starter-kit.html) covers what else to weigh when you pick a kit.

<NextStep
  title="Got a database per tenant?"
  text="The SaaS Laravel kits already create, migrate and seed a database for every tenant, with subdomains, separate sign-in and roles on top."
  secondaryText="See how the kit does multi-tenancy"
  secondaryLink="/docs/core/multi-tenancy.html"
/>
