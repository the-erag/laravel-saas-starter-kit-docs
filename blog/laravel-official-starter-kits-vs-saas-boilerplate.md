---
title: "Laravel Official Starter Kits vs a SaaS Boilerplate"
description: "Laravel's free official starter kits, a boilerplate with its own structure, or a kit on the official layout? What to check and how upgrades work."
pageClass: blog-page
date: 2026-11-21
author: erag
category: architecture
tags: [Starter Kits, Architecture, Upgrades]
---

# Building on Laravel's Official Starter Kits vs a Custom SaaS Boilerplate

<BlogPostMeta />

Every new Laravel SaaS starts with the same choice. You can run `laravel new`, pick one of Laravel's official starter kits and build the SaaS parts yourself. You can buy or download a boilerplate that has those parts already, often arranged in its own way. Or you can use a kit that adds the SaaS parts but keeps the official kit's structure.

This post isn't about "boilerplate or from scratch" in general. We covered that in [Laravel SaaS boilerplate vs building from scratch](/blog/laravel-saas-boilerplate-vs-scratch.html). Here the question is narrower: how much does it matter that your starting code looks like Laravel's own kits, and what happens when you upgrade?

We make SaaS Laravel, which is in the third group. Facts about Laravel's kits come from [laravel.com/starter-kits](https://laravel.com/starter-kits) and the [starter kit docs](https://laravel.com/docs/starter-kits), checked in November 2026 against the Laravel 13.x docs.

## What Laravel's official starter kits give you

As of November 2026 there are four official kits: **React**, **Vue** and **Svelte** with Inertia and TypeScript, and **Livewire** 4 with Flux UI. The Inertia kits use shadcn/ui, shadcn-vue or shadcn-svelte for components and Wayfinder for typed routes. They're free, and the kit repositories are MIT-licensed (see the [Vue kit's composer.json](https://github.com/laravel/vue-starter-kit/blob/main/composer.json), for example).

Out of the box you get:

- Laravel Fortify auth: login, registration, password reset, email verification, password confirmation, two-factor auth (on by default) and rate limiting.
- An optional WorkOS AuthKit variant with social login, passkeys, Magic Auth and SSO.
- A dashboard, profile, password and appearance settings, light and dark mode.
- Sidebar or header app layouts and three auth layouts.
- Built-in CI workflows and Inertia SSR support.

The kits can also be generated **with teams**. Users belong to one or more teams, get a personal team when they register, and can create teams, switch between them and invite members. Team routes use `/{current_team}/...`.

## What they leave out

The official kits are a starting point for any app, not a SaaS product. They don't include:

- **An admin area** for you, the owner, to manage customers.
- **Billing.** Cashier is a separate Laravel package you add yourself. Our [Stripe billing guide](/blog/laravel-saas-stripe-billing.html) shows it for a multi-tenant app.
- **Multi-tenancy beyond teams.** Teams live in your app's one database. There are no tenant subdomains and no database per tenant.

They also don't need updating, by design. The docs say "there is no need to update the starter kit itself". The code is copied into your app and you own it from the first commit. That's simple and honest, and it also means later improvements to the official kits don't reach your app unless you copy them in.

If teams in a shared database cover your product, the official kit with teams may be all you need. Our post on [Laravel teams vs multi-tenancy](/blog/laravel-teams-vs-multi-tenancy.html) helps you decide.

## Three ways to start

### 1. Official kit, then build the SaaS parts yourself

You start from code the whole Laravel community knows. Laravel's docs and most tutorials match what's in your repo. You add Cashier, roles, an admin area and tenancy as you need them, in your own style.

The cost is time. Tenancy, roles, invitations and an admin area are the slow parts of a SaaS, and none of them come with the kit. You also make every structural decision yourself, which is good if you have opinions and slow if you don't.

**Good for:** experienced Laravel developers, products with unusual requirements, and anyone who wants as little extra code to learn as possible beyond what Laravel's own kits ship.

### 2. A boilerplate built on its own structure

Many boilerplates arrange the app their own way. Some are built around an admin framework such as Filament, some use Folio and Volt for pages (Wave's [composer.json](https://github.com/thedevdojo/wave/blob/main/composer.json) requires both), and some ship as a Composer package. Electrik, for example, says on its [GitHub README](https://github.com/electrikhq/electrik) (November 2026) that it's installed as a package under its own `Electrik\` namespace and is "not copied into `App\`".

None of these are wrong. A package gets updates through `composer update`. A Filament-based kit gets you many admin screens fast. The trade-off is that you learn the boilerplate's conventions on top of Laravel's, and when the boilerplate and Laravel move at different speeds, you wait for the boilerplate or patch it yourself.

**Good for:** teams who like that boilerplate's way of working and plan to stay close to it.

### 3. A kit that keeps the official structure

The third option takes an official kit as the base and adds the SaaS parts on top, without moving the official folders around. If you've used Laravel's React or Vue kit, you know where the pages, components, layouts and auth live.

The cost is that you still learn whatever the kit adds. Keeping the official structure only helps if the additions are also plain Laravel: controllers, services, middleware and packages you'd recognise.

**Good for:** teams who want the SaaS parts done but don't want to learn a new way of building a Laravel app.

## The upgrade path: three layers

People say "upgrading" as if it's one thing. In a SaaS it's three:

| Layer | Official kit | Custom-structure boilerplate | Kit on the official structure |
| --- | --- | --- | --- |
| Laravel framework | `composer update`, follow the upgrade guide | Same, but may wait on the boilerplate's support | Same as the official kit |
| Starter kit code | No updates; you own it | Depends on the vendor | We bring relevant upstream changes over in the weekly updates |
| SaaS features | You build and maintain them | Vendor updates (package or merge) | Vendor updates (usually a git merge) |

The framework layer is the same everywhere: you bump versions and fix what breaks. The other two layers are where the choice shows.

With a plain official kit, there's nothing to merge, but nothing arrives either. With a boilerplate, ask how updates reach you. A Composer package updates cleanly but limits what you can change in place. Copied code lets you change anything, but you merge updates like any fork.

With a kit that keeps the official structure, a merge is easier to read, because both sides use folders you already know. Our [git upstream guide](/blog/update-laravel-starter-kit-git-upstream.html) shows the merge workflow.

## What to check before you pick

Whichever route you take, look at the code before you commit:

1. **Compare the folder tree with a fresh `laravel new`.** How much moved? Is each change explained in the docs?
2. **Check the auth.** Is it Fortify like the official kits, or something custom? Custom auth is code you'll maintain.
3. **Find where routes and controllers live.** Can you trace one request from route to database without a guide?
4. **Look at the frontend folders.** Are pages and components where Laravel's kit puts them?
5. **Check the tooling.** Pint, Larastan or PHPStan, Pest and a CI workflow should be there and passing.
6. **Check the Laravel version.** Is it on the current major release? When did it move to the last one?
7. **Ask how updates arrive.** Package, git merge or nothing? How often?
8. **Try removing a feature.** If deleting one module breaks five others, that's how upgrades will feel too.

## How SaaS Laravel stays close to the official kits

SaaS Laravel is built on Laravel's official starter kits. Here's what that means in the code, and where we chose to differ.

**What stays the same:**

- The Inertia kits keep the official frontend layout: `resources/js/pages`, `components/ui` with shadcn-vue, shadcn/ui or shadcn-svelte, and the layouts folder.
- Auth is Laravel Fortify, as in the official kits, with two-factor and passkeys.
- The Inertia kits use Wayfinder for typed routes. The Livewire kit uses Livewire 4 and Flux UI (free).
- It's on Laravel 13. We bring relevant upstream changes over in the weekly updates, and you get them through a normal `git merge upstream/main`.

**What we add, and why:**

- **Modules.** Features live in `Modules/` (Auth, Tenant, User, RolePermission and others) with PSR-4 autoloading, instead of being spread across `app/`. `routes/web.php` is empty, because each module loads its own routes. This is the biggest change from the official layout. We explain why in [modular Laravel architecture](/blog/modular-laravel-architecture.html).
- **Thin controllers and services.** Data objects (Inertia kits) or Form Requests (Livewire kit) validate the input; controllers call a service and return a response. Business logic and transactions live in service classes.
- **Data objects.** The Inertia kits use spatie/laravel-data for validation and generated TypeScript types. The Livewire kit uses Form Requests.
- **Tenancy.** stancl/tenancy with a database per tenant, subdomains and separate central and tenant guards.
- **Tooling.** Larastan at level 7 (its paths don't include `Modules/` yet), Pint, Pest and a GitHub Actions workflow in every kit.

Everything we add is plain Laravel and well-known packages. There's no admin framework or custom page system to learn. See [Project structure](/docs/getting-started/project-structure.html) for the full tree.

For the wider picture, see [Best Laravel SaaS starter kits in 2026, compared](/blog/best-laravel-saas-starter-kits.html).

## Frequently asked questions

### Do Laravel's official starter kits include multi-tenancy?

They can be generated with teams: users belong to teams, switch between them and invite members. Teams share the app's database. There are no tenant subdomains or separate tenant databases.

### Do the official starter kits get updates?

Not in your app. Laravel's docs say there's no need to update the starter kit itself, because the code is copied into your project and you own it. You update the framework and packages with Composer as usual.

### Is it hard to upgrade a SaaS boilerplate to a new Laravel version?

It depends on how far it moves from standard Laravel. The closer it is to a fresh app, the more Laravel's own upgrade guide applies. Check how quickly the boilerplate moved to the current major version.

### Can I start with an official kit and add a boilerplate later?

Usually not cleanly. Most boilerplates are meant to be the starting point, so moving later means porting your features into it. Decide early.

## Where SaaS Laravel fits

SaaS Laravel is for teams who want to start from the structure of Laravel's official kits and get database-per-tenant tenancy, a central admin, roles, invitations and menus already built, in [Vue](/kits/vue.html), [React](/kits/react.html), [Svelte](/kits/svelte.html) or [Livewire](/kits/livewire.html). Read [Architecture](/docs/core/architecture.html) and [Updates](/docs/purchase/updates.html) to see how it's put together.

It's not the right pick if teams in one database are enough (the free official kit with teams covers that), if you want WorkOS AuthKit (the official variant is the direct route), or if you need billing included (see [SaaS Laravel vs Wave](/blog/saas-laravel-vs-wave.html) for a free kit that has it). Prices are on the [pricing page](/pricing.html).

<BlogPostCta title="The official kit structure, with the SaaS parts built" text="SaaS Laravel keeps the folders and conventions of Laravel's starter kits and adds database-per-tenant tenancy, roles and a central admin." />
