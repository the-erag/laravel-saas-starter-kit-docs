---
title: "Convert Flex Home to a Multi-Tenant Real Estate SaaS"
description: "Turn Flex Home into a real estate SaaS where each agency gets its own database, listings site and agents, using one phased AI prompt."
pageClass: blog-page
date: 2026-11-26
author: annu-gupta
category: saas
tags: [Flex Home, SaaS, AI Agents]
---

# Convert Flex Home to a Multi-Tenant Real Estate SaaS, One Database per Agency

<BlogPostMeta />

Turning Flex Home into a multi-tenant SaaS means each real estate agency becomes a tenant with its own database, its own agents and its own public listings site on a subdomain. Because Flex Home is built on Botble CMS, you don't move its code across. You write down how each feature behaves, then rebuild it as plain Laravel modules inside a SaaS starter kit. One phased prompt to an AI coding agent drives that work, and you review every phase.

Our overview of [converting a CodeCanyon Laravel script into a SaaS](/blog/codecanyon-laravel-script-to-saas.html) explains the general method. This post covers what's specific to Flex Home.

## What Flex Home does

[Flex Home](https://codecanyon.net/item/flex-home-laravel-real-estate-multilingual-system/25197385) is a real estate script by Botble, also sold on [botble.com](https://botble.com/products/flex-home). It lists properties for sale or rent with a map view, videos, virtual tours and a mortgage calculator. Developers can publish projects with floor plans. Visitors can browse agents and send consultation requests.

There's an agency panel with a credit system for posting properties, plus packages with coupons. It supports unlimited languages with a translation tool, has a role and permission system, and takes payments through gateways including PayPal, Stripe, Razorpay, Paystack and SSLCommerz. Its users are the admin, agents or vendors with an account dashboard, and visitors.

On the technical side, the 2.56.6 changelog says "Upgraded to Laravel 13" and it needs PHP 8.3 or newer. Version 2.56.10 added APIs for a mobile app and an agent portal, and the React Native app is sold as a separate item. It's built on Botble CMS.

## License first

Envato's [standard licenses](https://codecanyon.net/licenses/standard) give you one end product per license. The Regular License is for an end product your end users aren't charged for. If agencies pay you to use it, that's the Extended License. If you bought from botble.com instead, its listing says "1 license per domain", which is worth raising with Botble when your platform will serve many agency subdomains. Either way, ask the author in writing before you build.

We found no official multi-tenant edition of Flex Home. Botble does sell a separate eCommerce SaaS platform, but that's a different product and not a real estate one.

## Why you rebuild instead of porting Botble

Flex Home runs on Laravel 13, so it's tempting to copy folders across. The catch is that it's a Botble CMS application. Features arrive as plugins (managed under "Admin → Plugins"), the public side is a theme, and Botble brings its own admin, permissions, media manager, settings and translation tool.

Copy that into a starter kit and you'd have two admin systems, two permission systems and two ways to store settings in one app, plus a CMS designed for one site per install running inside every tenant. Every Botble update would then need merging into code it was never meant to live in.

So the prompt asks the agent to document behavior first: what fields a property has, who can publish it, what a visitor sees, how credits are spent. You approve those notes. Then the agent builds each feature as a kit module with services, validation and pages, using the kit's roles, menus and translations. It's more work than copying, but you end up with one codebase that follows one set of conventions.

## Who's who in the SaaS

| Flex Home user | In the SaaS |
| --- | --- |
| You, the platform owner | Central app on your main domain (super admin) |
| Admin (site owner) | The agency owner: tenant `super-admin`, created with the tenant |
| Other agency admins | Tenant `admin` |
| Agents / vendors | Tenant users with an Agent role, inside one agency |
| Visitors | No account; browse the agency's public listings site |
| Visitor sending a consultation request | A lead stored in that agency's database |

## What's tricky about Flex Home

**The public site is the product.** For an agency, the listings site is what buyers and renters find on Google. Listing pages need readable slugs, page titles, meta descriptions and a sitemap per agency. The kit identifies tenants by subdomain and gives you an authenticated workspace; the public pages are new routes on the tenant domain, outside the admin's auth middleware. The Inertia kits have a `build:ssr` script but SSR isn't running by default (the Inertia kits are set up for it, but you build and start the SSR server yourself), so decide how search engines should see these pages. Our post on [Inertia SSR in Laravel](/blog/inertia-ssr-laravel.html) covers the trade-offs, and the Livewire kit renders on the server anyway.

**Photos, floor plans and videos add up.** Real estate is image-heavy, and every file must stay inside its agency. The kit's filesystem bootstrapper suffixes the `local` and `public` disks per tenant, so uploads land in that tenant's folder. Check how public image URLs are served for each tenant, and resize images in tenant-aware queued jobs if the source generates smaller sizes. [Tenant cache and filesystem isolation](/blog/laravel-tenant-cache-filesystem.html) explains the details.

**Credits mean something different now.** In a single Flex Home site, the owner sells posting credits to agents. In a SaaS where each agency is a tenant, its agents are usually its own staff, so charging them credits may make no sense. Some agencies may still run a portal where outside agents pay to post. Don't port credits, packages or coupons until the agent has written down exactly how they're earned, bought and spent, and you've decided what they mean per agency.

**Agents and leads belong to one agency.** Today all agents post into one shared database, which is a marketplace, not tenant isolation. In the SaaS, an agent is a user inside one agency, and a consultation request belongs to that agency and goes to the listing's agent. Rate-limit the public forms, because they'll attract spam.

**Two kinds of translation.** The kit translates its interface into 17 languages. A listing title written in English and Arabic is content, not an interface string. It's data in the tenant database, and it needs its own storage, separate from the kit's language files.

**The map view needs a provider.** Find out which one the source uses and whether the key belongs to you or to each agency. If each agency brings its own key, it's a tenant setting.

**The APIs and the app.** The mobile app and agent portal APIs don't carry over. The Vue, React and Svelte kits are Inertia apps without a separate HTTP API, so treat the React Native app as a later project.

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

Use the React, Svelte or Livewire repository instead if that's your kit. The kit repositories are private, so you need [repository access](/docs/purchase/repository-access.html) from your purchase before you clone. `your-script` is the unzipped Flex Home folder. See [Installation](/docs/getting-started/installation.html) for more on each step.

## The prompt

Run it in Claude Code, Codex or Junie from `my-saas`. The behavior notes in phase one are the most important output, so read them properly before you say "go". Expect this to take several sessions spread over days or weeks of review.

```text
Two projects sit side by side here.

./kit is the SaaS Laravel starter kit. It's the only project you change.
Start by reading kit/AGENTS.md and kit/CLAUDE.md, and use the matching
skills in kit/.agents/skills or kit/.claude/skills before each task.

./source is Flex Home, a real estate site built on Botble CMS. Read it,
never write to it.

What I want: a multi-tenant real estate SaaS. Every agency is a tenant with
its own database, subdomain, agents and public listings site. The kit
already provides sign-in, users, roles, permissions, menus, languages and
notifications, so don't port Botble's ACL, admin menu, plugin manager,
theme system, settings or translation tool.

Flex Home depends on Botble's plugins, hooks, themes and media manager. Do
not copy that code. For every feature: describe how it behaves, wait for my
approval, then build it again the Laravel way inside the kit.

First, ask which license I hold (CodeCanyon Regular, Extended, or a
botble.com license). If it doesn't allow a SaaS that agencies pay for,
stop.

There are five phases. Stop after each one and wait for my "go".

1. Understand. No code. Inventory the Botble plugins Flex Home uses and
   what each adds: properties, projects and floor plans, categories and
   features, agents, consultation requests, the agency panel and credits,
   packages and coupons, map view, videos, virtual tours, mortgage
   calculator. List tables, public and admin routes, roles, settings,
   queued or scheduled work, uploads and any image sizes it generates,
   payment gateways and outside services such as the map provider. Write a
   short behavior note per feature: fields, rules, who can do it, what a
   visitor sees. Explain exactly how credits are earned, bought and spent.
   End with a plan and the questions you need me to answer.

2. Foundation. The Laravel 13 packages the plan needs, tenant migrations,
   models. Listings, projects, agents, leads and media records live in the
   tenant database.

3. Features, one at a time in the order I approve. Thin controllers,
   services for the logic, validation the kit's way (Data objects in the
   Vue, React and Svelte kits, Form Requests in the Livewire kit), agency
   admin pages in the kit's frontend, permissions, menu entries,
   translations, files on the tenant disk, tenant-aware queued jobs, and
   Pest tests including tenant isolation: agency A can't see agency B's
   listings, agents, leads or files. Build the matching public pages on the
   tenant subdomain in the same step.

4. Settings. Separate agency settings (name, logo, contact details,
   languages, map settings, listing defaults) from my central platform
   settings.

5. Check. Run tests, lint, type checks and the build. Create two demo
   agencies with sample listings and photos. Write a summary of what you
   ported, what you skipped and why.

Real estate rules:
- Each agency's public listings site lives on its subdomain: listings,
  search, map, projects and agent profiles, open to visitors without an
  account. Every listing gets a readable slug, a title and meta
  description, and each agency gets its own sitemap.
- Listing photos, floor plans and videos go on the tenant disk, never in a
  shared path, and are never reachable through another agency's domain.
- Agents are users inside one agency. A consultation request belongs to
  that agency and goes to the listing's agent. Rate-limit public forms.
- Don't build credits, packages or coupons until you've documented how they
  work and I've decided what they mean for an agency.
- Listing content in several languages is data in the tenant database,
  separate from the kit's interface translations.
- The mobile app and agent portal APIs are out of scope. List what they
  expose in your summary.

Ground rules:
- ./source stays untouched.
- If any part of ./source isn't Laravel, document its behavior first, get my approval,
  then rebuild it the Laravel way. Never copy framework code across.
- No billing for agencies yet. Leave a TODO where it belongs.
- Don't integrate PayPal, Stripe or any other payment gateway, including the
  ones behind credits and packages. Stub payments with TODOs.
- Only build what Flex Home actually does.
- Never loosen tenancy, auth or permission checks.
- Ask me whenever you're unsure.
```

The kit's AGENTS.md and CLAUDE.md hold [Laravel Boost guidelines](/blog/laravel-boost-ai-agents.html), which is why the agent reads them first. For the isolation tests, see [testing a multi-tenant Laravel app with Pest](/blog/test-multi-tenant-laravel-pest.html).

## What's left for you

**Billing.** Agencies pay you a subscription, handled on the central side. That's separate from whatever credits an agency charges its own agents. [Stripe subscriptions for a Laravel SaaS](/blog/laravel-saas-stripe-billing.html) shows the setup.

**Importing agencies that already run Flex Home.** Write your own Artisan command for this; the kit doesn't include one. A rough outline:

```php
// Sketch only, not kit code.
$tenant->run(function () use ($old) {
    foreach ($old->properties() as $row) {
        $property = Property::create($this->map($row));
        $this->copyMedia($row, $property); // old uploads → tenant disk
        $this->redirects->add($row->old_url, $property->url());
    }
});
```

Keep the old listing URLs and redirect them to the new ones, because those pages may already rank in search. Copy the files onto the tenant disk instead of linking to the old server.

**Custom domains.** An agency will want `homes.their-agency.com`, not a subdomain of your platform, for the same search reasons. See [custom domains for tenants](/blog/laravel-tenant-custom-domains.html).

## Frequently asked questions

### Flex Home already runs on Laravel 13. Why not copy its code into the kit?

Because it's a Botble CMS application. Its plugins, theme, admin, permissions and media manager are Botble's, and copying them would put a second framework inside your kit. Documenting the behavior and rebuilding it keeps one set of conventions.

### Does each agency get its own website?

Yes. Each agency's public listings site runs on its subdomain from its own database, and you can add custom domains later.

### What happens to the credit system?

Nothing until you decide. The agent documents how credits work, and you choose whether they stay as a feature for agencies or go away once agencies pay you a subscription.

### Where are listing photos stored?

On the tenant disk. The kit suffixes the `local` and `public` disks per tenant, so one agency's files never sit in another agency's folder.

## Build your real estate SaaS on a tenant-ready base

SaaS Laravel handles the parts every agency needs and nobody wants to rebuild: a database per tenant, subdomains, Fortify auth, roles, permission-checked menus and 17 interface languages. Your agent can spend its sessions on listings and leads. Read [how multi-tenancy works in the kit](/docs/core/multi-tenancy.html), or compare the kits on the [pricing page](/pricing.html).

<BlogPostCta title="One database per agency" text="Start your real estate SaaS from a Laravel 13 kit with tenant databases, subdomains, auth and roles, in Vue, React, Svelte or Livewire. Then rebuild Flex Home's listings the Laravel way." />
