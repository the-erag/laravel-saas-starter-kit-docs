---
title: "Convert Academy LMS or NeonLMS to a SaaS"
description: "Turn Academy LMS or NeonLMS into a multi-tenant SaaS for schools and trainers: a database per academy, courses, students and video kept apart."
pageClass: blog-page
date: 2026-11-26
author: annu-gupta
category: saas
tags: [Academy LMS, NeonLMS, SaaS, AI Agents]
---

# Convert Academy LMS or NeonLMS into a Multi-Tenant SaaS for Academies

<BlogPostMeta />

Converting Academy LMS or NeonLMS into a SaaS means every academy, school or trainer on your platform gets their own workspace: a subdomain, a database for courses, enrollments and progress, and their own storage for videos and files. An AI agent rebuilds the LMS features inside a multi-tenant starter kit, phase by phase, with the original script as a read-only reference. Which script you start from changes the work a lot, so settle that first.

This post is part of our guide to [converting a CodeCanyon Laravel script into a SaaS](/blog/codecanyon-laravel-script-to-saas.html).

## Three possible starting points

"Academy LMS" is two separate CodeCanyon items from Creativeitem. NeonLMS comes from another author.

| Source | Framework | What it means for the port |
| --- | --- | --- |
| [Academy LMS](https://codecanyon.net/item/academy-course-based-learning-management-system/22703468) (the original) | CodeIgniter | No code carries over. Document behavior, then rebuild it in Laravel. |
| [Academy LMS Laravel](https://codecanyon.net/item/academy-lms-laravel-learning-management-system/53102497) | Laravel (version not stated on the page) | Closest to the kit. Check `composer.json` for the version. |
| [NeonLMS](https://codecanyon.net/item/neonlms-learning-management-system-php-laravel-script/23641351) | Laravel 9 (started on 5.7) | Laravel, but old: last updated December 2022. Expect upgrade work. |

### Academy LMS (CodeIgniter)

The original Academy LMS supports PHP 8.x and 7.x. Its roles are Administrator, Instructors and Students, it supports multiple instructors in a single course, and it has instructor payout reports and withdrawals. Add-ons cover certificates, an AI course content generator, tutor booking, ebooks, bootcamps, team training and a course forum.

### Academy LMS Laravel

The Laravel edition lists a Course Manager, Student Dashboard, Instructor Dashboard, Quiz System, Certificate Builder and a visual page builder. Its roles are Admin (with sub-admin permissions), Instructor and Student. Admins set the instructor commission, and instructors request payouts. It has an Addon Manager, and a separate mobile app is offered.

### NeonLMS

NeonLMS, by Jthemes, has an admin panel, a public website with CMS and multiple layouts, and teacher and student dashboards. Teachers create courses with lessons and tests. It also has a blog, forum, internal messaging, translation management, a newsletter, Zoom live lessons and several payment gateways, including Stripe subscriptions. Its roles are Admin, Teacher and Student. A [NeonLMS mobile app](https://codecanyon.net/item/neonlms-mobile-app-ios-android-app/34051993) for iOS and Android is sold as a separate item (built with React Native, last updated October 2021).

None of the three items mentions an official SaaS edition.

## License: check before you build

CodeCanyon's [standard licenses](https://codecanyon.net/licenses/standard) each cover one end product. The Regular License is for an end product whose end users aren't charged; the Extended License is for one whose end users can be charged. A paid LMS platform needs the Extended License at least. Add-ons are separate items with their own licenses. Ask the author whether a multi-tenant rebuild that uses their product as a reference is allowed, and keep the answer in writing.

With no official SaaS edition, you either patch multi-tenancy into the script or rebuild on a kit made for it. SaaS Laravel fits when you want each academy in its own database, a Vue, React, Svelte or Livewire frontend, and code you own.

## Academies, instructors and students as roles

The academy is the tenant. You run the platform from the central app.

| LMS user | In SaaS Laravel |
| --- | --- |
| You, the platform owner | Central app, `super-admin` |
| Admin (academy owner) | Tenant `super-admin`, created with the tenant |
| Other academy admins | Tenant `admin` |
| Sub-admins (Academy LMS Laravel) | Tenant custom roles with chosen permissions |
| Instructor / Teacher | Tenant custom role `instructor` |
| Student | Tenant custom role `student` |

One thing changes meaning. In Academy LMS, many instructors sell on one site and the admin sets their commission. In your SaaS, each academy is its own small marketplace: its admin sets the commission and its instructors request payouts inside that academy, never seeing another one.

## What's tricky about an LMS

**Video is most of the storage.** Course videos and files are large and grow fast. They belong on the tenant disk: the kit's `FilesystemTenancyBootstrapper` suffixes the `local` and `public` disks per tenant. Serve lessons through a route that checks enrollment, not a public URL anyone can share. If you later move videos to S3 or a video host, make that storage per tenant too. [Tenant cache and filesystem](/blog/laravel-tenant-cache-filesystem.html) explains what's isolated by default.

**Enrollment and progress are per tenant.** Enrollments, lesson progress, quiz attempts and test results live in the academy's database. Someone studying at two academies has two separate accounts.

**Certificates belong to the academy.** Templates carry the academy's branding, issued certificates live in its database, and generated PDFs go on the tenant disk.

**Two kinds of payment.** Students pay the academy for courses (NeonLMS lists several gateways), and the academy pays you for the platform. Get the LMS working without either, then add your SaaS billing, then course payments.

**Heavy work in the background.** Certificate generation, bulk emails and any video processing should run as queued jobs. The kit's `QueueTenancyBootstrapper` makes each job remember its tenant. See [multi-tenant queues](/blog/laravel-multi-tenant-queues.html).

**Zoom and other integrations.** NeonLMS has Zoom live lessons. In a SaaS, each academy connects its own Zoom account, so those credentials are tenant settings, not values in your `.env`.

**Mobile apps.** Academy LMS Laravel offers a mobile app, and NeonLMS sells one as a separate item. The kit has no HTTP API, so the apps are out of scope for this port.

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

For React, Svelte or Livewire, clone that kit's repository instead. The kit repositories are private, so you need [repository access](/docs/purchase/repository-access.html) from your purchase before you clone. `your-script` is the unzipped Academy LMS or NeonLMS folder, whichever you own. The [installation docs](/docs/getting-started/installation.html) cover the setup steps.

## The prompt

Paste this into Claude Code, Codex or Junie from `my-saas`, and fill in the product on the first line. Expect several sessions, with a review stop after each phase.

```text
./source contains: [Academy LMS (CodeIgniter) / Academy LMS Laravel / NeonLMS]. Rebuild it as a multi-tenant LMS platform where every academy is a tenant.

Where you work:
- ./kit is a SaaS Laravel starter kit and the only project you change. Read kit/AGENTS.md and kit/CLAUDE.md before you write anything.
- ./source is the LMS. Read it, never modify it.

First, ask me which license I hold (Regular or Extended) for the LMS and for any add-ons in ./source, and whether the author's terms allow a paid multi-tenant SaaS. If they don't, stop.

Shape of the result:
- Each academy is a tenant with its own database, subdomain and storage.
- Authentication, users, roles, permissions, menus, languages and notifications are the kit's. Don't port the LMS's own login, roles, sub-admin permissions, menus or translation management; reproduce what they do with the kit.

If ./source is Academy LMS (CodeIgniter): don't copy any framework code. In phase 1, write down how each feature behaves (screens, rules, data), and get my approval before rebuilding it the Laravel way.
If ./source is Academy LMS Laravel: tell me its Laravel version from composer.json.
If ./source is NeonLMS: it's Laravel 9 code. Use it to understand behavior, and write everything new with Laravel 13 patterns.

Five phases. Stop at the end of each and wait for "go".

Phase 1 - Understand. No code.
Inventory courses, sections or lessons, quizzes or tests, enrollments, progress tracking, certificates, instructor commission and payouts, blog, forum, messaging, page builder or CMS, Zoom, payment gateways, add-ons, scheduled tasks, queued jobs, every upload location (videos, files, images) and settings. Note which add-ons are present. Write a migration plan and module order.

Phase 2 - Foundation.
Install the Laravel 13 packages the plan needs. Write tenant migrations and models for course data. Central migrations hold only platform data.

Phase 3 - Features, module by module.
Order: courses and lessons, enrollment and progress, quizzes or tests, certificates, instructor dashboard and payout records, then the rest.
Per module: thin controllers, service classes, validation the kit's way (Data objects in the Vue, React and Svelte kits, Form Requests in the Livewire kit), pages in the kit's frontend, tenant permissions, menu entries, translations, uploads on the tenant disk, tenant-aware queued jobs, and Pest tests, including tenant isolation (academy A can't see academy B's courses, students or files).

Phase 4 - Settings.
Split settings into academy settings (name, branding, certificate templates, commission rate, Zoom credentials) and central platform settings that only I manage.

Phase 5 - Check.
Run the tests, lint, type checks and build. Create two demo academies, each with an instructor, a course with lessons and a few enrolled students. Write a summary: what was ported, what was skipped, why.

Rules:
- Never change ./source.
- No billing: neither my platform subscriptions nor students paying for courses nor instructor payout transfers. Leave TODOs where they go.
- Port only features that exist in ./source.
- Never weaken tenancy, auth or permission checks.
- Ask me when you're stuck or unsure.

LMS rules:
- Course videos and files go on the tenant disk and are served through routes that check the student is enrolled. No public file URLs.
- Enrollments, lesson progress, quiz results and test scores are per tenant.
- Admins, instructors and students are tenant roles. Instructors only manage their own courses unless they have extra permissions.
- Certificates, their templates and their numbering belong to the tenant.
- Any video processing, certificate generation and bulk email run as queued jobs that keep their tenant.
```

## What's left for you

**Platform billing.** Charge academies with Cashier on the tenant, as described in [Laravel Stripe subscriptions for a SaaS](/blog/laravel-saas-stripe-billing.html). Course payments and instructor payouts are their own projects after that.

**Importing existing academies.** If you already run separate installs, write a one-off Artisan command in your own project (the kit doesn't include one). For an LMS the database part is the easy half:

```bash
php artisan academies:import --from=old_lms --subdomain=acme
```

It would create the tenant, copy users, courses, lessons, enrollments, progress and certificates with an old-to-new ID map, then copy the video and file folders into the tenant's storage and rewrite stored paths. File copies can take hours for a big academy, so queue them and spot-check lessons afterwards.

**Custom domains.** Academies usually want `learn.theirbrand.com`. See [custom domains for tenants](/blog/laravel-tenant-custom-domains.html). Per-academy settings like branding are covered in [tenant settings in Laravel](/blog/laravel-tenant-settings.html).

## Frequently asked questions

### Which Academy LMS edition should I start from?

If you own both, the Laravel edition, since its code is closer to the kit. The CodeIgniter edition still works as a reference, but the agent has to document behavior and rebuild everything in Laravel. NeonLMS is fine as a reference too, but its Laravel 9 code shouldn't be copied into a Laravel 13 app.

### Can one instructor teach at several academies?

Yes, but with a separate account in each one. Each academy has its own database and users, so they're different users who happen to share an email address.

### How do I test that academies are isolated?

Create two tenants in Pest, add a course and an enrolled student to one, and check the other can't list, open or download them. [Testing a multi-tenant Laravel app with Pest](/blog/test-multi-tenant-laravel-pest.html) has the setup.

## Build your LMS platform on SaaS Laravel

SaaS Laravel gives an LMS platform the tenant parts up front: a database, subdomain and storage per academy, tenant-aware queues, Fortify auth, roles, menus and 17 languages. Your agent ports the courses on top, and you review each phase. Kits are a one-time purchase from $49 with weekly updates; see [pricing](/pricing.html).

<BlogPostCta title="A database and storage per academy" text="SaaS Laravel gives every tenant its own database, files and queued jobs, with auth, roles and menus in Vue, React, Svelte or Livewire, so your agent can focus on the LMS." />
