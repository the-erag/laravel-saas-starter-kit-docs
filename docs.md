---
title: "Laravel SaaS Starter Kit Documentation"
description: "Documentation for the SaaS Laravel starter kits: a multi-tenant Laravel 13 backend shared by the Vue, React and Svelte (Inertia v3) and Livewire editions."
---

<script setup>
import FrameworkLogo from './.vitepress/theme/components/FrameworkLogo.vue';
</script>

# Laravel SaaS Starter Kit Documentation

SaaS Laravel gives you a production-ready starting point for multi-tenant SaaS apps on Laravel 13 and Tailwind CSS v4. It comes as four starter kits with the same SaaS features. Only the frontend changes.

<div class="intro-quick">
  <p class="intro-quick-label">Quick start</p>
  <div class="intro-quick-grid">
    <a class="intro-card" href="/docs/getting-started/requirements.html">
      <span class="intro-card-step">1</span>
      <span class="intro-card-title">Requirements</span>
      <span class="intro-card-text">PHP 8.4, Composer, Node.js, MySQL and a local server with wildcard subdomains.</span>
    </a>
    <a class="intro-card" href="/docs/getting-started/installation.html">
      <span class="intro-card-step">2</span>
      <span class="intro-card-title">Installation</span>
      <span class="intro-card-text">Clone your kit's repository, set up <code>.env</code> and install everything.</span>
    </a>
    <a class="intro-card" href="/docs/getting-started/local-development.html">
      <span class="intro-card-step">3</span>
      <span class="intro-card-title">Local development</span>
      <span class="intro-card-text">The full first run, from the database to your first tenant.</span>
    </a>
  </div>
</div>

Here's what changes between the kits:

| Kit | Frontend | UI components | Docs |
| --- | --- | --- | --- |
| <span class="intro-kit"><FrameworkLogo name="vue" :size="18" />Vue</span> | Vue 3.5 (`<script setup>` + TypeScript) | shadcn-vue on Reka UI | [Vue guide](/docs/vue) |
| <span class="intro-kit"><FrameworkLogo name="react" :size="18" />React</span> | React 19 + TypeScript | shadcn/ui on Radix UI | [React guide](/docs/react) |
| <span class="intro-kit"><FrameworkLogo name="svelte" :size="18" />Svelte</span> | Svelte 5 (runes) + TypeScript | shadcn-svelte on Bits UI | [Svelte guide](/docs/svelte) |
| <span class="intro-kit"><FrameworkLogo name="livewire" :size="18" />Livewire</span> | Livewire 4 + Blade + Alpine.js | Flux UI (free) | [Livewire guide](/docs/livewire) |

Everything under `app/`, `Modules/`, `config/`, `database/`, `routes/`, `lang/` and `tests/` works the same in every kit, so the **Core** section of these docs applies to all of them. In the Vue, React and Svelte kits, only `resources/js` changes. The Livewire kit uses Livewire components instead of Inertia controllers, Form Requests instead of data objects, and Blade views in `resources/views`. See the [Livewire guide](/docs/livewire).

## Central app and tenant workspaces

Every kit runs two kinds of app from one codebase. The central app lives on your main domain (`APP_DOMAIN`). That's where you, the owner, manage tenants, their domains, your own admin users, menus, layouts and tenant maintenance. Each customer gets a tenant workspace on its own subdomain, with its own database, users, roles, menus and layout settings.

| | Central app | Tenant workspace |
| --- | --- | --- |
| Address | `APP_DOMAIN`, for example `vue.test` | A subdomain, for example `acme.vue.test` |
| Database | The central database | Its own database, one per tenant |
| Who signs in | You and your admin team | Your customer and the people they invite |
| What you manage there | Tenants, domains, admin users, roles, menus, layout, tenant maintenance | Its users, roles and permissions, menus, layout and notifications |

A few workspace settings are managed from the central app: the workspace status, its domains, and each domain's app name, default language and sign-in features. Read [Multi-tenancy](/docs/core/multi-tenancy), [Domains](/docs/core/domains) and [Database](/docs/core/database) for the details.

## What is included

<div class="intro-features">
  <a class="intro-card" href="/docs/core/authentication.html">
    <span class="intro-card-title">Authentication</span>
    <span class="intro-card-text">Laravel Fortify: login, registration, password reset, email verification, password confirmation, two-factor auth (TOTP + recovery codes), passkeys, profile and security settings, and account deletion.</span>
  </a>
  <a class="intro-card" href="/docs/core/multi-tenancy.html">
    <span class="intro-card-title">Multi-tenancy</span>
    <span class="intro-card-text"><code>stancl/tenancy</code> with a database per tenant, found by its domain (<code>&lt;sub&gt;.APP_DOMAIN</code>). Tenant CRUD, workspace status (Active, Trial, Pending Invitation, Suspended) and tenant admin invitations.</span>
  </a>
  <a class="intro-card" href="/docs/core/domains.html">
    <span class="intro-card-title">Domains</span>
    <span class="intro-card-text">Several subdomains per tenant, one of them primary. Each domain can set its own app name, default language and authentication features.</span>
  </a>
  <a class="intro-card" href="/docs/core/maintenance-and-suspension.html">
    <span class="intro-card-title">Maintenance mode</span>
    <span class="intro-card-text">For every tenant workspace, with a custom message, a secret bypass link and an IP allow list.</span>
  </a>
  <a class="intro-card" href="/docs/core/notifications.html">
    <span class="intro-card-title">Notifications</span>
    <span class="intro-card-text">A header bell, an unread badge and a Notifications page. Sending your own takes one service call.</span>
  </a>
  <a class="intro-card" href="/docs/core/users-roles-permissions.html">
    <span class="intro-card-title">Users, roles and permissions</span>
    <span class="intro-card-text"><code>spatie/laravel-permission</code>: user management, invitations, per-user permissions and permission files you define in config.</span>
  </a>
  <a class="intro-card" href="/docs/core/navigation-and-layouts.html">
    <span class="intro-card-title">Navigation and layouts</span>
    <span class="intro-card-text">Menus stored in the database and ordered by drag and drop, a sidebar or header layout, three auth layouts, and light, dark or system appearance.</span>
  </a>
  <a class="intro-card" href="/docs/core/localization.html">
    <span class="intro-card-title">Localization</span>
    <span class="intro-card-text">17 languages, with the language set per user and per domain.</span>
  </a>
  <a class="intro-card" href="/docs/core/architecture.html#typed-frontend">
    <span class="intro-card-title">Typed frontend</span>
    <span class="intro-card-text">Laravel Wayfinder route functions, plus TypeScript types generated from <code>spatie/laravel-data</code> classes. Vue, React and Svelte kits.</span>
  </a>
  <a class="intro-card" href="/docs/reference/packages.html">
    <span class="intro-card-title">Tooling</span>
    <span class="intro-card-text">Pest 5, Larastan, Pint and the Laravel Boost AI guidelines and skills in every kit. ESLint and Prettier in the Vue, React and Svelte kits.</span>
  </a>
</div>

::: info No API layer
Every route is a web route: Inertia pages in the Vue, React and Svelte kits, and Livewire components in the Livewire kit. The kits don't ship an HTTP API or API tokens.

Billing isn't included either. [Laravel Stripe subscriptions for a SaaS](/blog/laravel-saas-stripe-billing) shows one way to add it with Cashier.
:::

## Where to start

New here? Follow these steps in order.

1. Check the [requirements](/docs/getting-started/requirements).
2. Get access to your kit's repository: [Repository access](/docs/purchase/repository-access).
3. Follow [Installation](/docs/getting-started/installation), then [Local development](/docs/getting-started/local-development).
4. Read [Architecture](/docs/core/architecture) and [Project structure](/docs/getting-started/project-structure) before you add features.
5. Move on to the guide for your kit: [Vue](/docs/vue), [React](/docs/react), [Svelte](/docs/svelte) or [Livewire](/docs/livewire).

Pricing and purchase details are on the [pricing page](/pricing) and in [How to pay](/how-to-pay).

<RelatedPages :links="[
  { text: 'Architecture', link: '/docs/core/architecture', desc: 'How modules, services and the two contexts fit together.' },
  { text: 'Multi-tenancy', link: '/docs/core/multi-tenancy', desc: 'How tenants, their domains and databases work.' },
  { text: 'Project structure', link: '/docs/getting-started/project-structure', desc: 'Where each part of a kit lives.' },
]" />

<style>
.intro-quick {
  margin: 24px 0 28px;
}

.vp-doc .intro-quick-label {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
}

.intro-quick-grid,
.intro-features {
  display: grid;
  gap: 12px;
}

.intro-quick-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.intro-features {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 20px;
}

.vp-doc a.intro-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: border-color 0.2s, background-color 0.2s;
}

.vp-doc a.intro-card:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg);
}

.intro-card-step {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin-bottom: 4px;
  border-radius: 50%;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-1);
  font-size: 12px;
  font-weight: 700;
}

.intro-card-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}

.vp-doc a.intro-card:hover .intro-card-title {
  color: var(--vp-c-brand-1);
}

.intro-card-text {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}

.intro-card-text code {
  font-size: 12px;
}

.intro-kit {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .intro-quick-grid,
  .intro-features {
    grid-template-columns: 1fr;
  }
}
</style>
