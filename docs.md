---
title: "Laravel SaaS Starter Kit Documentation"
description: "Documentation for the SaaS Laravel starter kits: a multi-tenant Laravel 13 backend shared by the Vue, React and Svelte (Inertia v3) and Livewire editions."
---

# Laravel SaaS Starter Kit Documentation

SaaS Laravel gives you a production-ready starting point for multi-tenant SaaS apps on Laravel 13 and Tailwind CSS v4. It comes as four starter kits. They have the same SaaS features, and only the frontend changes:

| Kit | Frontend | UI components | Docs |
| --- | --- | --- | --- |
| <Badge type="tip" text="Vue" /> | Vue 3.5 (`<script setup>` + TypeScript) | shadcn-vue on Reka UI | [/docs/vue](/docs/vue) |
| <Badge type="tip" text="React" /> | React 19 + TypeScript | shadcn/ui on Radix UI | [/docs/react](/docs/react) |
| <Badge type="tip" text="Svelte" /> | Svelte 5 (runes) + TypeScript | shadcn-svelte on Bits UI | [/docs/svelte](/docs/svelte) |
| <Badge type="tip" text="Livewire" /> | Livewire 4 + Blade + Alpine.js | Flux UI (free) | [/docs/livewire](/docs/livewire) |

Everything under `app/`, `Modules/`, `config/`, `database/`, `routes/`, `lang/` and `tests/` works the same in every kit, so the **Core** section of these docs applies to every kit. In the Vue, React and Svelte kits only `resources/js` changes. The Livewire kit has the same features, but it uses Livewire components instead of Inertia controllers, Form Requests instead of data objects and Blade views in `resources/views`; see the [Livewire guide](/docs/livewire).

## What is included

- Authentication with Laravel Fortify: login, registration, password reset, email verification, password confirmation, two-factor authentication (TOTP + recovery codes), passkeys, profile and security settings, and account deletion. See [Authentication](/docs/core/authentication).
- Multi-tenancy with `stancl/tenancy`. Each tenant gets its own database and is identified by its domain (`<sub>.APP_DOMAIN`). You also get tenant CRUD, workspace status (Active, Trial, Pending Invitation, Suspended) and tenant admin invitations. See [Laravel multi-tenancy](/docs/core/multi-tenancy).
- Domains: a tenant can have several subdomains, one of them primary, and each domain can set its own app name, default language and authentication features. See [Domains](/docs/core/domains).
- Maintenance mode for every tenant workspace, with a custom message, a secret bypass link and an IP allow list. See [Maintenance & suspension](/docs/core/maintenance-and-suspension).
- In-app notifications with a header bell, unread badge and a Notifications page, plus one service call to send your own. See [Notifications](/docs/core/notifications).
- Users, roles and permissions with `spatie/laravel-permission`: user management, invitations, per-user permissions and permission files you define in config. See [Users, roles & permissions](/docs/core/users-roles-permissions).
- Navigation and layouts: menus stored in the database and ordered by drag and drop, a sidebar or header layout, three auth layouts, and light, dark or system appearance. See [Navigation & layouts](/docs/core/navigation-and-layouts).
- Localization in 17 languages, with the language set per user and per domain. See [Localization](/docs/core/localization).
- A typed frontend: Laravel Wayfinder route functions, plus TypeScript types generated from `spatie/laravel-data` classes.
- Tooling: Pest 5, Larastan, Pint, ESLint, Prettier, and the Laravel Boost AI guidelines and skills.

::: info No API layer
Every route is an Inertia (web) route. The kits don't ship an HTTP API, API tokens or billing.
:::

## Where to start

1. Check the [requirements](/docs/getting-started/requirements).
2. Get access to your kit's repository: [Repository access](/docs/purchase/repository-access).
3. Follow [Installation](/docs/getting-started/installation), then [Local development](/docs/getting-started/local-development).
4. Read [Architecture](/docs/core/architecture) and [Project structure](/docs/getting-started/project-structure) before you add features.
5. Then move on to the framework guide for your kit: [Vue](/docs/vue), [React](/docs/react), [Svelte](/docs/svelte) or [Livewire](/docs/livewire).

You'll find pricing and purchase details on the [pricing page](/pricing) and in [How to pay](/how-to-pay).
