---
title: "SaaS Laravel vs Laravel Spark: Which Do You Need?"
description: "SaaS Laravel vs Laravel Spark: Spark is a billing portal, SaaS Laravel is the multi-tenant app around it. What each includes and how to use them together."
pageClass: blog-page
date: 2026-11-21
author: annu-gupta
category: saas
tags: [Laravel Spark, Billing, Multi-Tenancy]
---

# SaaS Laravel vs Laravel Spark: Two Different Problems, and How to Use Both

<BlogPostMeta />

People often ask us whether they should buy SaaS Laravel or Laravel Spark. It's a fair question, because both show up when you search for "Laravel SaaS". But they don't compete. Spark handles billing. SaaS Laravel handles the app around billing: sign-up, tenants, users, roles and settings. Neither one does the other's job.

This post is for developers planning a Laravel SaaS who want to know which piece they need, or whether they need both. We explain what each product includes, put them side by side, and then show how they fit together in one app. Spark facts come from its [website](https://spark.laravel.com) and [docs](https://spark.laravel.com/docs/introduction.md), as of November 2026. SaaS Laravel is our product, and we'll say where it's not the right fit.

If you're looking at the wider market, our [comparison of Laravel SaaS starter kits](/blog/best-laravel-saas-starter-kits.html) covers more options.

## The short answer

- **You have an app and need subscriptions:** Spark (or Cashier on its own).
- **You need the app itself, with each customer in its own database:** SaaS Laravel.
- **You need both:** use SaaS Laravel as the foundation and add Spark or Cashier for billing.

## What Laravel Spark is

Spark is the official, paid billing package from the Laravel team. It's built on Laravel Cashier and comes in two editions, `laravel/spark-stripe` and `laravel/spark-paddle`. It adds a billing portal where your customers can:

- Pick a monthly or yearly plan, and change plans later.
- Update their payment method.
- Download invoices.

You define plans in a config file. It supports per-seat billing, PDF and emailed invoices, and PayPal through Paddle. The portal is isolated from your app, with its own CSS and JavaScript, so it sits next to whatever frontend you use. Its homepage gives Blade with Bootstrap and Inertia with Vue as examples.

What Spark doesn't do is just as important. It doesn't include login or registration; its [docs](https://spark.laravel.com/docs/introduction.md) point you to a starter kit such as Jetstream or Breeze for that. It doesn't give you an admin area for your own staff. It doesn't separate customer data into tenants. And it only supports its two providers: the docs say you can't add your own custom payment provider.

As of November 2026, Spark is listed at **$99 per project** (one deployed application) or **$199 for unlimited projects**. Each license includes one year of updates. The docs say that if your license expires and you don't renew, you pin Spark to the last version released before it expired. The renewal price isn't stated on the site.

## What SaaS Laravel is

SaaS Laravel is a set of four Laravel 13 starter kits that share one backend: Vue, React or Svelte on Inertia v3, or Livewire 4 with Flux UI. It's built on the same folder structure as Laravel's official kits.

The core is multi-tenancy with stancl/tenancy in multi-database mode. Each tenant gets its own database and its own subdomain, like `acme.your-domain.com`. A central app on your main domain is where you manage tenants, domains, your admin users and their roles. Each tenant workspace has its own users, roles and permissions, menus and settings, with separate auth guards for the central and tenant sides.

Around that you get Fortify auth (two-factor, passkeys, email verification), spatie roles and permissions, signed invitations, in-app notifications, 17 languages, and per-tenant maintenance mode and suspension.

What it doesn't include is billing. That's a deliberate choice: you might want Stripe, Paddle, Lemon Squeezy or a regional provider, and we didn't want to pick for you. It's a one-time payment with lifetime access to the private repository and weekly updates. See the [pricing page](/pricing.html) for current prices.

## SaaS Laravel vs Laravel Spark side by side

| | Laravel Spark | SaaS Laravel |
| --- | --- | --- |
| **Job** | Billing portal and subscriptions | App foundation: tenants, auth, users, roles |
| **Billing** | Stripe or Paddle | Not included |
| **Login and registration** | Not included (use a starter kit) | Fortify, with two-factor and passkeys |
| **Multi-tenancy** | Bills a user or a team | Database per tenant, subdomain per tenant |
| **Admin for your staff** | Not included | Central app for tenants, domains and admins |
| **Frontend** | Its own portal UI, next to any frontend | Vue, React, Svelte or Livewire |
| **How you get it** | Composer package | Private GitHub repository, code in your app |
| **Updates** | One year per license | Lifetime access, weekly updates |
| **Projects** | One app ($99) or unlimited ($199) | Unlimited projects for you or clients |

The table makes the point clearer than any paragraph: on billing, auth, tenancy and staff admin, one has what the other lacks.

## Where they overlap

There's one place they touch: the idea of a "customer account".

Spark can bill a model other than `User`, such as a team or an organization. The Stripe edition supports a single billable model per application ([Spark Stripe configuration](https://spark.laravel.com/docs/spark-stripe/configuration.md)). So you have to decide up front what a customer is.

In SaaS Laravel, a customer is a tenant. The `Tenant` model lives in the central database and has an email and a company name, which is exactly what a billing provider needs. Each tenant's users live in that tenant's own database. That makes the tenant the natural thing to bill, not the individual user.

## Using Spark and SaaS Laravel together

Here's how we'd set it up. These are our recommendations, not steps from Spark's docs, so read Spark's installation guide alongside them.

### 1. Bill the tenant, not the user

Make the central `Tenant` model the billable model. Users come and go inside a workspace, but the company pays. Since the Stripe edition supports one billable model per app, pick this once and stick with it.

### 2. Keep billing data in the central database

Subscriptions belong to tenants, and tenants live in the central database. Keep the billing tables there too, not inside each tenant's database. That way you can see every customer's plan from one place, and deleting or suspending a tenant doesn't scatter billing data across databases. The [database docs](/docs/core/database.html) explain which tables live where.

### 3. Decide where customers open the portal

Spark's portal has its own look, separate from your app. Add a "Billing" link in the tenant workspace that sends the tenant's admin to it. Only users with the right permission should see that link, which you can handle with a normal spatie permission and SaaS Laravel's permission-aware menus.

### 4. Connect payment state to workspace status

SaaS Laravel workspaces have a status: Active, Trial, Pending Invitation or Suspended. A suspended workspace shows a "Suspended" page on every request, with your message, until you set it back to Active or Trial. When a subscription lapses, your billing code can move the tenant to Suspended, and back to Active when they pay. That logic belongs in a service class in its own module, for example `Modules/Billing`, which is how the [architecture docs](/docs/core/architecture.html) suggest adding features.

### 5. Per-seat plans need a user count

If you charge per seat, the number of seats is the number of users in the tenant's database. Count them while tenancy is initialized for that tenant, and update the seat quantity when users are invited or removed.

### What about the license?

Spark's $99 tier covers a single deployed application. A multi-tenant app that runs as one deployment, serving many tenants, reads to us as one application, but check Spark's terms if you're unsure.

## Billing without Spark

You don't have to use Spark at all. Cashier on its own handles subscriptions, trials, webhooks and invoices, and Stripe's hosted customer portal covers plan changes and cards. Our guide to [Laravel Stripe subscriptions for a SaaS](/blog/laravel-saas-stripe-billing.html) shows that setup with the tenant as the billable model.

Skipping Spark makes sense when you want billing screens inside your own UI, or when you need a provider Spark doesn't support, like Lemon Squeezy, Polar or a regional one. For more options, see [Laravel Spark alternatives](/blog/laravel-spark-alternatives.html).

## When to pick which

**Pick Spark with an official Laravel starter kit** when you're building a single-database app, maybe B2C, maybe with teams, and billing is the main missing piece. That's a lighter setup than ours, and it's a good one.

**Pick SaaS Laravel on its own** when each customer needs its own database and subdomain, and billing can come later, or happens outside the app (invoices, annual contracts).

**Pick both** when you need database-per-tenant B2B and want a ready-made billing portal on Stripe or Paddle.

## Frequently asked questions

### Does SaaS Laravel include Laravel Spark?

No. SaaS Laravel doesn't include Spark or any billing. You buy Spark separately from the Laravel team if you want it, or use Cashier directly.

### Can Laravel Spark do multi-tenancy?

Spark can bill a team or organization instead of a user, but it doesn't separate customer data. For separate databases per customer you need a tenancy package such as stancl/tenancy, which SaaS Laravel is built on.

### Does Spark include authentication?

No. Spark's docs point you to a starter kit such as Jetstream or Breeze for login and registration. SaaS Laravel includes Fortify auth for both the central app and each tenant.

### Is Spark a subscription?

Spark's site says each license includes one year of updates, and its docs talk about renewing an expired license. The renewal price isn't listed. We compare price models across kits in [one-time vs subscription starter kits](/blog/one-time-vs-subscription-laravel-starter-kit.html).

## Where SaaS Laravel fits

SaaS Laravel is the part Spark leaves out: [database-per-tenant multi-tenancy](/docs/core/multi-tenancy.html), auth, roles, invitations and a modular Laravel 13 backend, in [Vue](/kits/vue.html), [React](/kits/react.html), [Svelte](/kits/svelte.html) or [Livewire](/kits/livewire.html). Add Spark or Cashier on top for billing.

It's not the right choice if you want billing included out of the box, or if your app doesn't need separate databases per customer. In those cases an official starter kit with Spark, or a boilerplate that bundles billing, will get you live sooner. Prices are on the [pricing page](/pricing.html).

<BlogPostCta title="The app foundation, with billing left to you" text="SaaS Laravel gives you database-per-tenant multi-tenancy, auth, roles and invitations. Add Spark or Cashier for billing, with the provider you choose." />
