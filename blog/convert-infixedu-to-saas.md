---
title: "Convert InfixEdu School ERP to a Multi-Tenant SaaS"
description: "Turn InfixEdu School ERP into a multi-tenant SaaS: a database per school, with admins, teachers, students and parents as separate roles."
pageClass: blog-page
date: 2026-11-26
author: erag
category: saas
tags: [InfixEdu, SaaS, AI Agents]
---

# Convert InfixEdu School ERP to a Multi-Tenant SaaS for Many Schools

<BlogPostMeta />

Turning InfixEdu into a SaaS means one platform where each school gets its own subdomain and its own database, holding its students, parents, teachers, exams, results and fees. The code side is a phased rebuild inside a multi-tenant starter kit, which an AI agent can do while you review each step. The license side comes first, though, and with InfixEdu it's stricter than usual: the CodeCanyon item is limited to a single school.

Comparing scripts? Start with our overview of [turning a CodeCanyon Laravel script into a SaaS](/blog/codecanyon-laravel-script-to-saas.html).

## What InfixEdu does

[InfixEdu School ERP](https://codecanyon.net/item/infix-school-academic-management-system/23876323) is a Laravel school management system sold on CodeCanyon by CodeThemes. The item page shows both "Laravel 13" and "Laravel 12", so check `composer.json` in your download. The requirements ask for PHP 8.4 or newer.

Its module list is long:

| Area | Modules |
| --- | --- |
| Students and teaching | Student Info, Academics, Study Materials, Lesson Plan, Homework |
| Exams | Examination, Online Examination |
| Money and staff | Fees Collections, Accounts, Human Resource, Leave Management |
| Campus | Library, Inventory, Transportation, Dormitory |
| People and website | Communication, Chat, Front CMS / Website Settings, Role and Permission |

The item title names Admin, Teacher and Parent portals, and the feature lists describe admin, teacher, student and parent panels. There's also a separate Flutter app for students, parents and teachers, [InfixEdu Mobile](https://codecanyon.net/item/infixedu-open-source-flutter-for-android-ios/25696404).

## The license limits you to one school

CodeCanyon's [standard licenses](https://codecanyon.net/licenses/standard) cover one end product each. The Regular License is for an end product whose end users aren't charged; the Extended License is for one whose end users can be charged. A paid SaaS needs at least the Extended License.

InfixEdu adds its own limit on top. The item page says: "One purchase can use a maximum of one school only." A SaaS serves many schools, so neither CodeCanyon license on its own clears you to run InfixEdu, or a rebuild based on it, for many schools.

The author does sell a SaaS bundle, just not on CodeCanyon. aorasoft.com, the support site the item page links to, lists an [InfixEdu SAAS Bundle](https://aorasoft.com/infixedu-saas-bundle-school-management-system-software/8278730474). We couldn't verify what it does internally (subscriptions, database layout), so read the page and ask the author.

Because the author's own terms limit a purchase to one school, you have two clean options:

1. **Buy the InfixEdu SAAS Bundle** if you want the author's own multi-school product.
2. **Get written permission from the author** to build a multi-school SaaS using your InfixEdu purchase as the reference.

SaaS Laravel fits the second path, when you want each school in its own database, a Vue, React, Svelte or Livewire frontend, and a codebase you own outright. It won't fix a license problem, and the prompt below makes the agent ask about the license first.

## Schools, staff and families as tenant roles

One school is one tenant. Your team runs the central app on the main domain, where you create schools. Everyone else signs in on their school's subdomain through the kit's Fortify auth, on a separate tenant guard.

| InfixEdu user | In SaaS Laravel |
| --- | --- |
| You, running the platform | Central app, `super-admin` |
| School owner (the first admin) | Tenant `super-admin`, created with the tenant |
| Other school admins | Tenant `admin` |
| Teacher | Tenant custom role `teacher` |
| Student | Tenant custom role `student` |
| Parent | Tenant custom role `parent` |
| Other staff roles your copy has (accountant, librarian and so on) | Tenant custom roles with their own permissions |

The kit's system roles (`super-admin`, `admin`, `manager`, `employee`, `user`) suit the owner and general staff. Teachers, students and parents are clearer as custom roles with small, explicit permission sets. The [users, roles and permissions docs](/docs/core/users-roles-permissions.html) explain how custom roles work.

## Where InfixEdu gets tricky

**Parents and their children.** This rule matters most. A parent with two children at the school should see exactly those two: their attendance, homework, results and fees. Tenancy can't help here, because every family's records live in the same school database. It has to be a parent-to-student relationship checked in every query and policy the parent touches, with tests that try to read someone else's child.

**Students see themselves, teachers see their classes.** A teacher's view of marks and homework should be limited to the classes and subjects they teach. Read how `./source` decides this before changing it.

**Exams, results and fees are the records schools care about.** They stay in the school's own database, never in central tables. Printed results and receipts go on the tenant disk, which the kit's `FilesystemTenancyBootstrapper` suffixes per tenant. Online fee payments are money the school takes from families, separate from your own SaaS billing, so leave them for later.

**Each school has a public website.** Front CMS pages are public. In the kit they become guest routes on the school's subdomain, next to the signed-in app, with content per tenant.

**The module list is wide.** Library, Dormitory and Transportation won't matter to every school. Decide which modules you sell first and port those. A full port of every module is weeks of agent work and review.

**The mobile app.** InfixEdu Mobile is a separate item. The kit has no HTTP API, so the app isn't part of this port.

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

Use the React, Svelte or Livewire repository instead if that's your kit. The kit repositories are private, so you need [repository access](/docs/purchase/repository-access.html) from your purchase before you clone. `your-script` is the unzipped InfixEdu folder. The [installation docs](/docs/getting-started/installation.html) explain each step.

## The prompt for your AI agent

Paste this into Claude Code, Codex or Junie, started in `my-saas`. Review each phase, then reply "go".

```text
Task: rebuild InfixEdu School ERP as a multi-tenant SaaS where every school is a tenant.

Folders:
- ./kit is the SaaS Laravel starter kit and the only project you may edit. Read kit/AGENTS.md and kit/CLAUDE.md first, and follow them.
- ./source is InfixEdu. Treat it as read-only reference. Never edit, move or delete files in it.

License check, before you read ./source in depth:
Ask me which license I hold. A paid SaaS needs the Extended License, and InfixEdu's CodeCanyon page limits one purchase to one school, so also ask whether I have written permission from the author for paid multi-school use. Owning the InfixEdu SAAS Bundle doesn't by itself allow a rebuild, so ask what its terms say too. If I can't confirm both the license and the permission, stop and tell me.

Architecture:
- Each school is a tenant with its own database and subdomain.
- Use the kit for sign-in, users, roles, permissions, menus, languages and notifications. Don't port InfixEdu's Role and Permission module, its menus or its translation system; map their behavior onto the kit's.

Phases. Stop after each one and wait for my "go".

1. Understand - read only, change nothing.
   Inventory ./source: every module in ./source, its tables, models, routes, roles and dashboards, settings, scheduled tasks, queued jobs, upload folders and every third-party integration it uses. Show how parents are linked to students and how teachers are linked to classes and subjects. Propose a migration plan and a module order, and say which modules you'd leave for later.

2. Foundation.
   Add the Laravel 13 packages the plan needs. Write tenant migrations and models for the school data. Central migrations only hold platform data (schools as tenants, my own admins).

3. Features, one module at a time.
   Start with Student Info and Academics, then Examination and results, then Fees Collections, then the rest in the order we agreed.
   Each module gets: thin controllers; service classes for the logic; validation the kit's way (Data objects in the Vue, React and Svelte kits, Form Requests in the Livewire kit); pages in the kit's frontend; tenant permissions; menu entries; translations; files on the tenant disk; queued jobs that keep their tenant; and Pest tests, including tenant isolation (school A can't see school B's data).

4. Settings.
   Separate per-school settings (school name, logo, fee setup, website content and the academic settings ./source has) from central settings that only I control.

5. Check.
   Run tests, lint, types and the frontend build. Create two demo schools, each with an admin, two teachers, a few students and parents. Write a summary: ported, skipped, and why.

Rules:
- ./source stays untouched.
- If any part of ./source isn't Laravel, document its behavior first, get my approval,
  then rebuild it the Laravel way. Never copy framework code across.
- No billing of any kind: not my SaaS subscriptions, not school fee payments online. Leave clear TODOs.
- Only port what ./source actually does. No invented features.
- Never weaken tenancy, auth or permission checks.
- Ask me when unsure or stuck.

InfixEdu rules:
- Admins, teachers, students and parents are separate tenant roles with their own permissions and dashboards. They are not separate apps.
- A parent only sees their own children's records. Enforce it through the parent-student link in queries and policies, and test it with two families.
- A student only sees their own records. A teacher only sees the classes and subjects assigned to them.
- Exams, marks, results, attendance and fees stay in the school's tenant database.
- Front CMS pages are public, read-only routes on the school's own subdomain, with content per school.
- Report cards, receipts and uploads go on the tenant disk, served only to users allowed to see them.
```

[Laravel Boost and AI agents](/blog/laravel-boost-ai-agents.html) shows the guidelines the agent reads in the kit.

## What's left for you

**Billing schools.** Bill each school as a tenant with Cashier, following [Laravel Stripe subscriptions for a SaaS](/blog/laravel-saas-stripe-billing.html). Fee payments from parents are a separate, later project.

**Moving existing schools in.** If schools already run InfixEdu, write a one-off import command in your project. This is a sketch, not kit code:

```php
// routes/console.php in your own project. Sketch only.
Artisan::command('schools:import {subdomain} {--from=infix_legacy}', function (string $subdomain) {
    // Create the school as a tenant with the kit's TenantService::createTenant(),
    // passing the school's details and $subdomain as its domain.
    $tenant = Tenant::query()->whereHas('domains', fn ($query) => $query->where('domain', 'like', $subdomain.'.%'))->firstOrFail();
    $legacy = DB::connection($this->option('from'));

    $tenant->run(function () use ($legacy) {
        // Read the old database through $legacy in chunks.
        // Import classes, staff, students, then parents with their student links,
        // then exams, marks and fees. Keep a map of old IDs to new IDs.
    });
});
```

The `--from` connection has to exist in `config/database.php`, pointing at the old InfixEdu database. Compare record counts per table afterwards, and check a few parent accounts by hand. [Tenant migrations and seeders](/blog/laravel-tenant-migrations-seeders.html) covers creating tenant schemas.

**Custom domains.** Schools often want their own domain for the public website. See [custom domains for tenants](/blog/laravel-tenant-custom-domains.html).

## Frequently asked questions

### Can I run a multi-school SaaS with a regular InfixEdu purchase?

Not by the item page's own terms. It says one purchase covers a maximum of one school. Ask the author for written permission, or look at the InfixEdu SAAS Bundle on aorasoft.com.

### Why a database per school instead of a school_id column?

Student and family data is the most sensitive data a school holds. With a database per tenant, a missing `where` clause can't show one school's students to another. You still need the parent and teacher checks inside each school. Our [database per tenant guide](/blog/multi-tenant-saas-laravel-database-per-tenant.html) compares the models.

### How long does the conversion take?

It depends on how many modules you port. The core (students, academics, exams, fees) with good tests is days of agent work plus your review. Every module after that adds more.

## Building it on SaaS Laravel

Once the license question is settled, SaaS Laravel gives you what every school needs on day one: a database and subdomain per school, separate central and tenant sign-in, roles and permissions, database-driven menus and 17 languages. Your agent spends its time on school logic, and you spend yours reviewing it. Kits are one-time purchases from $49; see the [pricing page](/pricing.html).

<BlogPostCta title="A database per school, from the start" text="SaaS Laravel ships database-per-tenant multi-tenancy, Fortify auth, roles, permissions and 17 languages in Vue, React, Svelte or Livewire, ready for your school modules." />
