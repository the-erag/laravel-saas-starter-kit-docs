---
title: "Installation: Clone the Kit Repository"
description: "Clone your SaaS Laravel kit repository, configure .env and run composer setup to install dependencies, generate the key, migrate and build frontend assets."
---

# Installation

This page gets the code onto your machine in four steps: get repository access, clone the kit, install and configure it, then open it in the browser. [Local development](/docs/getting-started/local-development) covers the full first run in more detail (database, seeding, tenants, dev server).

<KeyIdea title="What you'll have at the end">
The kit cloned, its dependencies installed, the central database migrated and seeded, and the app open in your browser.
</KeyIdea>

<DocSteps>

## 1. Get repository access

After you buy a kit, your GitHub account gets an automatic invite to its repository. See [Repository access](/docs/purchase/repository-access).

## 2. Clone the kit

::: code-group

```bash [Vue]
git clone https://github.com/the-erag/saas-laravel-starter-kit-vue.git vue
cd vue
```

```bash [React]
git clone https://github.com/the-erag/saas-laravel-starter-kit-react.git react
cd react
```

```bash [Svelte]
git clone https://github.com/the-erag/saas-laravel-starter-kit-svelte.git svelte
cd svelte
```

```bash [Livewire]
git clone https://github.com/the-erag/saas-laravel-starter-kit-livewire.git livewire
cd livewire
```

:::

::: tip Keep updates easy
Rename the kit remote to `upstream` right away and push to your own repository as `origin`. Weekly updates are then a simple merge. See [Updates](/docs/purchase/updates).

```bash
git remote rename origin upstream
git remote add origin git@github.com:your-org/my-saas.git
```
:::

<PrivateRepoNotice />

## 3. Install and configure

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Edit `.env` (at least `APP_URL`, `APP_DOMAIN` and the `DB_*` keys) and create the database. Then run:

```bash
php artisan migrate --seed
npm install
```

[Local development](/docs/getting-started/local-development) walks through each of these steps.

### Shortcut: one command

`composer setup` runs most of the steps above for you:

| Step | Command |
| --- | --- |
| Install PHP dependencies | `composer install` |
| Create `.env` (only if it does not exist) | copies `.env.example` |
| App key | `php artisan key:generate` |
| Central migrations | `php artisan migrate --force` |
| Frontend | `npm install`, `npm run build` |

::: warning No seeding
`composer setup` does **not** seed the database, and it migrates with whatever is in `.env` at the time. So create and edit `.env` first, create the database, run `composer setup`, and then run `php artisan db:seed`.
:::

## 4. Open the app

If you use Herd, link the project to the domain you set in `APP_DOMAIN`:

```bash
herd link vue   # serves this folder as vue.test and *.vue.test
```

Now open `APP_URL` (for example `http://vue.test`) and sign in as a [seeded user](/docs/getting-started/local-development#seeded-data).

</DocSteps>

<DocDone>

**Done.** The central app is running. Next, create your first tenant in [Local development](/docs/getting-started/local-development#create-your-first-tenant).

</DocDone>

<RelatedPages :links="[
  { text: 'Local development', link: '/docs/getting-started/local-development', desc: 'The full first run, step by step.' },
  { text: 'Configuration', link: '/docs/getting-started/configuration', desc: 'What each .env key and config file does.' },
  { text: 'Updates', link: '/docs/purchase/updates', desc: 'Pull weekly updates into your copy.' },
]" />
