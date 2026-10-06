---
title: "Installation: Clone the Kit Repository"
description: "Clone your SaaS Laravel kit repository, configure .env and run composer setup to install dependencies, generate the key, migrate and build frontend assets."
---

# Installation

This page gets the code onto your machine. For the full first run (database, seeding, tenants, dev server), [Local development](/docs/getting-started/local-development) goes into more detail.

```text
Repository access → clone → composer install + .env → migrate and seed → npm install → open APP_URL
```

## 1. Get repository access

Once you've bought a kit, your GitHub account gets an automatic invite to its repository. See [Repository access](/docs/purchase/repository-access).

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

:::

::: tip Keep updates easy
Rename the kit remote to `upstream` straight away and push to your own repository as `origin`. Weekly updates then come down to a simple merge. See [Updates](/docs/purchase/updates).

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

## One-command setup

`composer setup` handles most of the steps above in one go:

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

## Open the app

If you use Herd, link the project to the domain you set in `APP_DOMAIN`:

```bash
herd link vue   # serves this folder as vue.test and *.vue.test
```

Now open `APP_URL` (for example `http://vue.test`) and sign in as a [seeded user](/docs/getting-started/local-development#seeded-data).
