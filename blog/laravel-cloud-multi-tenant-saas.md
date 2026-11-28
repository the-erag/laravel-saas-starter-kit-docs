---
title: "Deploying a Multi-Tenant Laravel SaaS on Laravel Cloud"
description: "How I deployed a database-per-tenant Laravel 13 SaaS on Laravel Cloud: MySQL instead of SQLite, a failed build, a blank page and the APP_DOMAIN fix."
pageClass: blog-page
date: 2026-11-28
author: erag
category: saas
tags: [Deployment, Hosting, Multi-tenancy]
---

# Deploying a Multi-Tenant Laravel SaaS on Laravel Cloud

<BlogPostMeta />

<figure class="post-shot">
  <img src="/blog/laravel-cloud-multi-tenant-saas/00-environment-overview.webp" alt="Laravel Cloud environment for saas-laravel-starter-kit with the edge network, a Flex app cluster that scales to zero, and a Serverless Postgres database" width="1600" height="870" decoding="async">
  <figcaption>The finished setup on Laravel Cloud: one app cluster, one database and the free laravel.cloud domain.</figcaption>
</figure>

I deployed my SaaS Laravel starter kit to <a href="https://laravel.com/cloud" target="_blank" rel="sponsored noopener">Laravel Cloud</a>. It's a Laravel 13 app with multi-tenancy, and every tenant gets its own database. Cloud gave the app this address:

```text
saas-laravel-starter-kit-local-tteeoy.laravel.cloud
```

It didn't work on the first try. The build failed once, and after that the site showed a completely blank white page. This post covers what I set up, what went wrong, and the config that fixed it. If you deploy a multi-tenant app to Cloud, the blank page is the part to read first.

Laravel gave me Cloud credits for this post, but the views are my own.

## Why I chose Laravel Cloud

Laravel Cloud is built by the official Laravel team, so it fits Laravel apps naturally. My SaaS starter kit and other Laravel applications run on it with very little setup.

I chose it because I can set up real-time features with Laravel Reverb, run queue workers, and deploy, all in an easy way, without managing servers myself.

For this first deploy I kept things small: the app and one database.

## Creating the app

Cloud's onboarding has four steps:

1. Connect your source control provider.
2. Select a repository.
3. Create your application.
4. Add resources (optional).

I connected GitHub and picked the repository for the Vue edition of my kit, `the-erag/saas-laravel-starter-kit-vue`. On the "Create your application" step I used these settings:

| Setting | Value |
| --- | --- |
| Application name | `saas-laravel-starter-kit` |
| Region | US East (Virginia) |
| Run as a static website | Off |

<figure class="post-shot">
  <img src="/blog/laravel-cloud-multi-tenant-saas/01-create-application.webp" alt="Laravel Cloud's Create your application step with the name saas-laravel-starter-kit and the US East (Virginia) region" width="880" height="560" loading="lazy" decoding="async">
  <figcaption>Step 3 of 4: the app name, the US East (Virginia) region, and static website turned off.</figcaption>
</figure>

The last step offers three resources, which Cloud creates in the same region as the app:

- **Database:** Laravel MySQL
- **Cache:** Laravel Valkey
- **WebSockets:** Laravel Reverb

I checked only **Database** with Laravel MySQL and clicked "Deploy your application". While the first deployment waited to start, Cloud showed that the database cluster `saas_laravel_starter_kit_production` was provisioning.

<figure class="post-shot">
  <img src="/blog/laravel-cloud-multi-tenant-saas/02-add-database-resource.webp" alt="Laravel Cloud's Add resources step with Database (Laravel MySQL) checked and Cache and WebSockets unchecked" width="880" height="560" loading="lazy" decoding="async">
  <figcaption>Step 4 of 4: only the Laravel MySQL database is checked.</figcaption>
</figure>

<figure class="post-shot">
  <img src="/blog/laravel-cloud-multi-tenant-saas/03-database-provisioning.webp" alt="Laravel Cloud deployment screen saying the database cluster saas_laravel_starter_kit_production is provisioning" width="800" height="560" loading="lazy" decoding="async">
  <figcaption>The first deployment waits while Cloud provisions the MySQL database.</figcaption>
</figure>

## Why MySQL and not SQLite

I first wanted to use SQLite. On Laravel Cloud the filesystem resets on every deploy, so a SQLite file would be lost. I used a [Laravel Cloud MySQL database](https://laravel.com/cloud/docs/resources/databases/laravel-mysql) instead.

My kit also creates a separate database for every tenant, so MySQL fits it better anyway.

I tested the kit with both databases on Laravel Cloud: MySQL and Serverless Postgres. Both worked, including creating a tenant with its own database. For MySQL I used `DB_CONNECTION=mysql`. For Postgres I used `DB_CONNECTION=pgsql` with the Cloud Postgres database attached.

## Problem 1: the build failed

The first deployment failed during the build. Composer installed the packages and generated the autoloader. Then `package:discover` failed:

```text
Generating optimized autoload files
> Illuminate\Foundation\ComposerScripts::postAutoloadDump
> @php artisan package:discover --ansi
{"message":"Class \"Spatie\\LaravelTypeScriptTransformer\\TypeSc…
ERROR: failed to build: exit status 1
```

The build screen cuts the message off, but the class name points at the TypeScript transformer.

<figure class="post-shot">
  <img src="/blog/laravel-cloud-multi-tenant-saas/04-build-failed.webp" alt="Laravel Cloud build log ending in a package:discover error about a Spatie LaravelTypeScriptTransformer class, with Build failed below" width="800" height="560" loading="lazy" decoding="async">
  <figcaption>The first build stops at package:discover because the TypeScript transformer class is missing.</figcaption>
</figure>

The cause was in my kit. The Vue, React and Svelte editions use `spatie/laravel-typescript-transformer` to generate TypeScript types from PHP data classes. That package is in `require-dev`, so it's missing after `composer install --no-dev`, which is how the production build installs packages.

My kit still listed its `TypeScriptTransformerServiceProvider` in `bootstrap/providers.php`. That provider extends a class from the missing package. So Laravel tried to load it, couldn't find the parent class, and the build stopped.

The fix: I removed the provider from `bootstrap/providers.php` and registered it in `AppServiceProvider`, only when the package is installed:

```php
use Spatie\LaravelTypeScriptTransformer\TypeScriptTransformerApplicationServiceProvider;

public function register(): void
{
    // The TypeScript transformer is a dev dependency, so it is missing
    // after `composer install --no-dev` (e.g. on Laravel Cloud / Forge).
    if (class_exists(TypeScriptTransformerApplicationServiceProvider::class)) {
        $this->app->register(TypeScriptTransformerServiceProvider::class);
    }
}
```

On my machine, where dev dependencies are installed, nothing changes. In production the provider is skipped. I made the same change in the React and Svelte editions and pushed it as "fix(kits): load TypeScript transformer only when installed".

The deployment with that fix built in 46 seconds. Its build steps finished in this order: preparing the build environment, running build commands, and pushing the application. Cloud's [deployment docs](https://laravel.com/cloud/docs/deployments) explain what runs in each step if you need to change the build or deploy commands.

<figure class="post-shot">
  <img src="/blog/laravel-cloud-multi-tenant-saas/05-build-fixed.webp" alt="Laravel Cloud deployment details for commit 37daecf with all build steps finished in 46 seconds" width="1600" height="868" loading="lazy" decoding="async">
  <figcaption>With the fix, all three build steps finish in 46 seconds and the deployment moves on.</figcaption>
</figure>

## Environment variables

These are the environment variables the app had after the first deploy. I've left out secrets.

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://saas-laravel-starter-kit-local-tteeoy.laravel.cloud
LOG_CHANNEL=laravel-cloud-socket
DB_CONNECTION=mysql
SESSION_DRIVER=cookie
CACHE_STORE=database
```

`DB_HOST` pointed at the host of the Cloud MySQL database. I'm not showing the username or password here. Cloud's [environment docs](https://laravel.com/cloud/docs/environments) explain how these variables reach your application.

One variable is missing from that list, and it caused the next problem.

## Problem 2: a completely blank white page

With the build fixed and the deployment live, I opened the Cloud address and got a completely blank white page.

The cause is how my kit handles requests. It decides from the host name whether a request belongs to the central app or to a tenant. The central app lives on `APP_DOMAIN`, and each tenant lives on a subdomain of it. For any host it doesn't know, the kit returns 404.

`APP_DOMAIN` wasn't set. So the kit didn't recognize the Cloud address, and every request got that 404.

The fix was one variable. I added `APP_DOMAIN` with the domain only, no `https://`, kept `APP_URL` with `https://`, and redeployed:

```dotenv
APP_URL=https://saas-laravel-starter-kit-local-tteeoy.laravel.cloud
APP_DOMAIN=saas-laravel-starter-kit-local-tteeoy.laravel.cloud
```

The two look alike, but they do different jobs:

- **`APP_URL`** is a full URL. Laravel uses it to build links. See [configuration in the Laravel docs](https://laravel.com/framework/docs/13.x/configuration).
- **`APP_DOMAIN`** is a bare host name. My kit puts it in the tenancy config as the central domain and checks each request's host against it.

That's why `APP_DOMAIN` has to be the domain only.

After the redeploy, the central app's home page loaded. It's the kit's landing page, "Run every customer workspace from one place", with Log in and Get started buttons. The central dashboard worked too, with Tenants, Users, Roles and Setup in the sidebar.

<figure class="post-shot">
  <img src="/blog/laravel-cloud-multi-tenant-saas/06-home-page-live.webp" alt="The kit's landing page on Laravel Cloud with the heading Run every customer workspace from one place" width="1600" height="870" loading="lazy" decoding="async">
  <figcaption>After adding APP_DOMAIN and redeploying, the central app's home page loads.</figcaption>
</figure>

<figure class="post-shot">
  <img src="/blog/laravel-cloud-multi-tenant-saas/07-central-dashboard.webp" alt="The central dashboard with Dashboard, Tenants, Users, Roles and Setup in the sidebar" width="1600" height="870" loading="lazy" decoding="async">
  <figcaption>The central dashboard, with Tenants, Users, Roles and Setup in the sidebar.</figcaption>
</figure>

The lesson for multi-tenant apps on Cloud: **set `APP_DOMAIN` to the Cloud address before the first deploy.**

## Creating a tenant

In my kit, creating a tenant runs `CREATE DATABASE` on the central database connection, so the database user needs that right.

From the central admin I created a tenant. Its separate database was created automatically, with no errors. The tenant's subdomain opened, and the tenant's own workspace works.

## What I'd check before the first deploy

If you're putting a multi-tenant Laravel app on Laravel Cloud, these are the three things from this deploy I'd check before pushing:

1. **Set `APP_DOMAIN`.** Use the Cloud address, domain only. Set `APP_URL` to the same address with `https://`. Without it, my kit served a blank page for every request.
2. **Don't load dev-only packages in production.** A service provider from a `require-dev` package breaks the build at `package:discover`. Register it only when its class exists.
3. **Use Cloud MySQL or Serverless Postgres, not SQLite.** The filesystem resets on every deploy, so a SQLite file would be lost. And an app that creates a database per tenant needs a real database server anyway.

With those three in place, the deploy came down to a few settings, a few environment variables and one database, with no server for me to manage.

<style>
.vp-doc .post-shot {
  margin: 24px 0;
}

.vp-doc .post-shot img {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
}

.vp-doc .post-shot figcaption {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.5;
  text-align: center;
  color: var(--vp-c-text-2);
}
</style>
