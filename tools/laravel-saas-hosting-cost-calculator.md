---
title: "Laravel SaaS Hosting Cost Calculator"
description: "Estimate the monthly hosting cost of a multi-tenant Laravel SaaS on Forge, DigitalOcean or Laravel Cloud, with the formula and every price shown. No sign-up."
breadcrumb: "Laravel SaaS hosting cost calculator"
sidebar: false
editLink: false
lastUpdated: false
---

# Laravel SaaS Hosting Cost Calculator

Enter your tenants, daily users and emails, pick a hosting setup, and this calculator gives you a rough monthly hosting range for a Laravel SaaS. It's for founders and developers budgeting a first launch. Every price and every rule it uses is listed below, so you can check the maths or redo it with your own numbers.

The results are estimates. They come from list prices and simple sizing rules, not from measuring your app.

## Estimate your monthly hosting cost

<HostingCostCalculator />

## What the two numbers mean

The **lean** figure is the smallest setup the rules below allow for your inputs. The **with headroom** figure moves the app server, and the database server if you have one, up one size, and switches to daily backups. Most teams land between the two. If your app does heavy work per request, such as reports or PDF generation, plan nearer the higher number.

<PricingBlock />

## How this calculator works

The total is the sum of the lines shown in each column:

```text
monthly cost = servers or compute
             + backups (servers only)
             + offsite database dumps (servers only)
             + server management fee (Forge only)
             + email
```

### Prices used

These are list prices in US dollars, read on each provider's pricing page on 27 November 2026. They don't include tax. Laravel's pages showed a banner about an announcement on 1 December, so check its prices again before you budget.

| Item | Price | Source |
| --- | --- | --- |
| DigitalOcean Basic droplet, 1 / 2 / 4 / 8 / 16 GiB RAM | $6 / $12 / $24 / $48 / $96 per month | [DigitalOcean droplet pricing](https://www.digitalocean.com/pricing/droplets) |
| Droplet backups | 20% of the droplet price weekly, 30% daily | [DigitalOcean droplet pricing](https://www.digitalocean.com/pricing/droplets) |
| DigitalOcean Spaces, for database dumps | $5 per month, with 250 GiB of storage included | [Spaces pricing](https://www.digitalocean.com/pricing/spaces-object-storage) |
| Laravel Forge Hobby / Growth | $12 / $19 per month. Hobby allows one external server | [Forge pricing](https://laravel.com/forge/pricing) |
| Laravel Cloud Starter / Growth | $5 per month with $5 of usage credit / $20 per month, plus usage | [Cloud pricing](https://laravel.com/cloud/pricing) |
| Laravel Cloud compute, monthly cap | Flex 1 GiB $12, Flex 2 GiB $24, Pro 4 GiB $32, Pro 8 GiB $64, Pro 16 GiB $128 | [Cloud pricing](https://laravel.com/cloud/pricing) |
| Postmark | Free for 100 emails; Basic $15 for 10,000, then $1.80 per 1,000 | [Postmark pricing](https://postmarkapp.com/pricing) |
| Amazon SES | $0.10 per 1,000 emails | [Amazon SES pricing](https://aws.amazon.com/ses/pricing/) |

### Sizing rules we assumed

These rules are ours. They describe a typical Laravel app with Inertia or Livewire pages and a MySQL database. They aren't benchmarks.

| Daily active users, all tenants | App server |
| --- | --- |
| Up to 200 | 2 GiB |
| 201 to 1,000 | 4 GiB |
| 1,001 to 5,000 | 8 GiB |
| 5,001 to 20,000 | 16 GiB |

- **Database.** Up to 50 tenants and 1,000 daily users, MySQL runs on the app server. Beyond that it gets its own droplet: 4 GiB up to 200 tenants, 8 GiB up to 1,000 tenants and 5,000 daily users, and 16 GiB above that.
- **Queue worker.** Above 1,000 daily users, queued jobs such as emails and imports get their own 2 GiB droplet.
- **Forge plan.** One server fits Hobby. Two or more DigitalOcean servers need Growth, because Hobby allows only one external server.
- **Laravel Cloud.** The app runs on the compute size with the same RAM as the droplet rule, from Flex 2 GiB to Pro 16 GiB, always awake, so compute is at its monthly cap. Starter is used only for the smallest setup without a separate worker, and its $5 credit is subtracted. A Flex 1 GiB worker is added above 1,000 daily users, and in the headroom column.
- **Beyond 20,000 daily users or 5,000 tenants** the calculator shows a warning. At that size, measure your own app.

### What it leaves out

- **Laravel Cloud database and cache.** The Cloud pricing page lists MySQL, Postgres and Valkey as included on every plan, but we couldn't read per-resource rates for them. So the Cloud figures cover the plan and compute only. For a reference point, the same page estimates its own "SaaS MVP app" example at about $45.71 a month and a "Production app" at about $228 a month.
- **Payment fees.** Your payment provider takes a share of every charge. Our [Stripe vs Paddle vs Lemon Squeezy](/blog/stripe-vs-paddle-vs-lemon-squeezy-laravel.html) comparison covers that.
- **Error tracking, uptime checks and the domain.** Small, but not zero. Our post on the [cost to build a Laravel SaaS](/blog/cost-to-build-laravel-saas.html) lists typical figures.
- **Bandwidth beyond what's included,** and any traffic spikes.

### Does a database per tenant cost more?

Not much in server costs at this size. On one MySQL server, most memory is shared across all its databases, so the limits you meet first are open tables and files and the length of a migration run. The bigger cost is time: migrations run once per tenant, and backups multiply. That's why this calculator doesn't add a charge for it. Plan the work instead, with our guides to [tenant migrations](/blog/laravel-tenant-migrations-seeders.html) and [backups for many databases](/blog/laravel-multi-database-backups.html).

## Picking a host

The numbers are only half the choice. A database-per-tenant app needs wildcard subdomains with TLS, permission to create databases, and room for long migration runs. [Laravel Cloud vs Forge vs Vapor](/blog/laravel-cloud-vs-forge-vs-vapor.html) compares the options on exactly those points, and [deploying a Laravel SaaS](/blog/deploy-laravel-saas.html) walks through a production setup.

<NextStep
  title="Spend the hosting budget on your product, not on rebuilding sign-in"
  text="The SaaS Laravel kits run on a single server or many, with tenants, roles and queued emails ready. Read the buyer's guide to see what's included."
/>
