---
title: "Laravel Multi-Tenancy Glossary"
description: "Plain-English definitions of Laravel multi-tenancy and SaaS terms: tenant, central database, tenant identification, bootstrappers, custom domains and more."
breadcrumb: "Laravel multi-tenancy glossary"
sidebar: false
editLink: false
glossary: true
---

# Laravel Multi-Tenancy Glossary

This glossary explains the words you'll meet when you build a multi-tenant SaaS with Laravel, each in two to four plain sentences. It's for developers who are new to multi-tenancy, or who want to check what we mean by a term on this site. Every entry links to a guide or doc page that goes deeper, and where it matters, it says what the SaaS Laravel kit does.

Jump to a term: [auth guard](#auth-guard), [billable model](#billable-model), [bootstrapper](#bootstrapper), [central app](#central-app), [central database](#central-database), [central domain](#central-domain), [custom domain](#custom-domain), [database per tenant](#database-per-tenant), [impersonation](#impersonation), [invitation](#invitation), [maintenance mode](#maintenance-mode), [merchant of record](#merchant-of-record), [multi-tenancy](#multi-tenancy), [permission](#permission), [primary domain](#primary-domain), [single-database tenancy](#single-database-tenancy), [subdomain](#subdomain), [super admin](#super-admin), [suspension](#suspension), [system role](#system-role), [teams](#teams), [tenancy](#tenancy), [tenant](#tenant), [tenant context](#tenant-context), [tenant database](#tenant-database), [tenant identification](#tenant-identification), [tenant isolation](#tenant-isolation), [tenant migrations](#tenant-migrations), [tenant provisioning](#tenant-provisioning), [wildcard DNS](#wildcard-dns).

## Auth guard {#auth-guard}

An auth guard is Laravel's setting for how users are signed in and where they are looked up. A multi-tenant app often has two: one for your own staff in the central database and one for each tenant's users in the tenant database. In the kit they're called `web` and `tenant`, and the tenant guard becomes the default as soon as a tenant is identified. [Multiple auth guards](/blog/laravel-multiple-auth-guards.html) explains the pattern.

## Billable model {#billable-model}

The billable model is the Eloquent model a payment package such as Laravel Cashier charges. In a B2B SaaS that's usually the tenant, not the user, so a subscription survives when the person who paid leaves the company. The kit doesn't include billing, but its `Tenant` model has the email and name a payment provider needs. The [Paddle billing guide](/integrations/paddle.html) shows a tenant set up as the billable model.

## Bootstrapper {#bootstrapper}

In stancl/tenancy, a bootstrapper switches one part of Laravel to the current tenant when tenancy starts. The kit turns on four: database, cache, filesystem and queue. Leave one out and you get the classic bug where something from one tenant shows up for another. The [multi-tenancy tutorial](/guides/laravel-multi-tenancy-tutorial.html#what-changes-when-tenancy-starts) explains each one.

## Central app {#central-app}

The central app is the part of a multi-tenant SaaS that belongs to you, not to any customer. It's where you list tenants, create new ones and manage your own staff. In the kit it runs on the domain set in `APP_DOMAIN`, and its tenant screens return a 404 on tenant domains. See the [architecture docs](/docs/core/architecture.html).

## Central database {#central-database}

The central database holds the data about your tenants rather than the data inside them. In the kit that means the `tenants` and `domains` tables, your own users, roles and menus, global settings and the queue's `jobs` table. Payment data belongs here too once you add billing. The [database docs](/docs/core/database.html) list every table and which side it's on.

## Central domain {#central-domain}

The central domain is the address of your own app, such as `your-saas.com`. A request to it never starts tenancy; a request to any other domain is treated as a possible tenant. In the kit the central domain comes from `APP_DOMAIN` and is the only entry in `central_domains` in `config/tenancy.php`. The [configuration docs](/docs/getting-started/configuration.html) show where it's set.

## Custom domain {#custom-domain}

A custom domain is a tenant's own address, such as `app.acme.com`, pointed at your SaaS instead of a subdomain of yours. It needs DNS checks, a TLS certificate for each domain and a way for customers to add it. The kit doesn't include bring-your-own domains: every tenant domain it creates is a subdomain of `APP_DOMAIN`. [Custom domains for tenants](/blog/laravel-tenant-custom-domains.html) explains what adding them involves.

## Database per tenant {#database-per-tenant}

Database per tenant, also called multi-database tenancy, gives each tenant its own database. The app picks the right one at the start of each request, so tenant code needs no `tenant_id` filters. You get strong isolation and per-customer backups, and in return you create, migrate and back up many databases. This is the model the kit uses, and [single vs multi-database tenancy](/blog/single-vs-multi-database-tenancy-laravel.html) compares it with the alternative.

## Impersonation {#impersonation}

Impersonation lets a support person sign in as a customer's user to see what they see, without knowing their password. It needs care: a short time limit, a clear banner and a log of who did it. The kit doesn't include impersonation; its permission list has an "Impersonate User" entry, but no feature behind it. [Laravel impersonate user](/blog/laravel-impersonate-user.html) shows how to build it safely.

## Invitation {#invitation}

An invitation is an email with a link that lets a new user join and set their own password. In the kit the link is signed, so it can't be changed, and lasts 7 days. Invitation emails go through the queue, so a queue worker has to be running. See [user invitations with signed URLs](/blog/laravel-user-invitations-signed-urls.html).

## Maintenance mode {#maintenance-mode}

Maintenance mode shows a "back soon" page instead of the app, usually during an upgrade. In a multi-tenant app you may want it for every tenant while your central app stays online. The kit has one switch for all tenant workspaces, with a custom message, a secret bypass link that lasts 12 hours and a list of allowed IP addresses. See [maintenance mode for multi-tenant apps](/blog/laravel-multi-tenant-maintenance-mode.html).

## Merchant of record {#merchant-of-record}

A merchant of record is a company that sells your software to your customers in its own name. It collects the payment and handles sales tax and VAT, then pays you. Paddle and Lemon Squeezy work this way, while Stripe is a payment processor that leaves tax filing to you. [Stripe vs Paddle vs Lemon Squeezy](/blog/stripe-vs-paddle-vs-lemon-squeezy-laravel.html) compares them.

## Multi-tenancy {#multi-tenancy}

Multi-tenancy means one application serves many customers at once, and each customer sees only its own data. Those customers are called tenants. It's how almost every SaaS works, and the main design question is how you keep tenant data apart. [What is multi-tenancy in Laravel?](/blog/what-is-multi-tenancy-laravel.html) explains it with an example.

<PricingBlock />

## Permission {#permission}

A permission is a named right to do one thing, such as "View Tenant Users" or "Delete Tenant". The kit uses spatie/laravel-permission, defines permissions in PHP files under `config/permissions`, and checks them on routes, menus and buttons. It gives permissions directly to users, so you can change one person's access without making a new role. The [roles and permissions docs](/docs/core/users-roles-permissions.html) have the details.

## Primary domain {#primary-domain}

A tenant can have more than one domain, and the primary one is its main address. Links in emails, such as invitations, use it. In the kit the primary domain is created with the tenant and can't be deleted, while extra domains can be added and removed. See the [domains docs](/docs/core/domains.html).

## Single-database tenancy {#single-database-tenancy}

Single-database tenancy keeps every tenant in the same tables, with a `tenant_id` column on each row. Every query must filter by that column, usually through a global scope. It's simpler to host and easy to report across, but one missing filter shows one customer's data to another. Try the [tenancy model quiz](/tools/laravel-tenancy-model-quiz.html) if you're choosing between this and a database per tenant.

## Subdomain {#subdomain}

A subdomain is the part in front of your domain, like `acme` in `acme.your-saas.com`. Giving each tenant a subdomain is the most common way to tell tenants apart, because it needs no setup from the customer. In the kit you type the subdomain when you create a tenant, and it's stored as the full domain. [Laravel multi-tenancy with subdomains](/blog/laravel-multi-tenancy-subdomains.html) covers the details.

## Super admin {#super-admin}

The super admin is the role that can do everything. In the kit a user with the `super-admin` role passes every permission check, through a `Gate::before` rule, both centrally and inside tenants. The first admin of each new tenant gets this role, and the role can't be deleted. See [the Laravel super admin role](/blog/laravel-super-admin-role.html).

## Suspension {#suspension}

Suspending a tenant blocks its workspace without deleting anything, for example when an invoice goes unpaid. In the kit a suspended workspace shows a 403 page with an optional message, and only logout still works. You set it with the tenant's workspace status. [Suspending customer accounts](/blog/suspend-tenant-accounts-saas.html) covers the wider process.

## System role {#system-role}

A system role is a role that ships with the app and can't be edited or removed in the UI. The kit has five in both contexts: Super Admin, Admin, Manager, Employee and User, each with default permissions from the config files. Custom roles you add start with no permissions. [Protecting system roles](/blog/laravel-protect-system-roles.html) explains why.

## Teams {#teams}

Teams group users inside one shared database, usually with a `team_id` on each row, and a user can belong to several teams. Laravel's own starter kits can be generated with team support. Teams and tenants solve related problems in different ways, and the kit doesn't include teams inside a tenant. [Teams vs multi-tenancy](/blog/laravel-teams-vs-multi-tenancy.html) helps you pick.

## Tenancy {#tenancy}

Tenancy is short for multi-tenancy, and in package names it often means the state of "running as a tenant". When people say tenancy "starts" or is "initialized", they mean the app has found the tenant for this request and switched to its data. stancl/tenancy, the package the kit uses, is often just called Tenancy for Laravel. The [stancl/tenancy tutorial](/blog/stancl-tenancy-tutorial.html) shows it from installation.

## Tenant {#tenant}

A tenant is one customer account in a multi-tenant app: a company, a school, a clinic. It has its own users and its own data, which no other tenant can see. In the kit each tenant is an `App\Models\Tenant` row in the central database, with its own database and subdomain. The [multi-tenancy docs](/docs/core/multi-tenancy.html) show how tenants are managed.

## Tenant context {#tenant-context}

Code runs in tenant context when tenancy has started for a specific tenant, so the database, cache and files all point at that tenant. A web request to a tenant domain starts it for you. Anywhere else, such as a command, you start it with `$tenant->run(function () { ... })`. The [multi-tenancy docs](/docs/core/multi-tenancy.html#working-in-tenant-context-from-code) show both.

## Tenant database {#tenant-database}

A tenant database holds one tenant's own data: its users, roles, menus and everything your product stores for it. With a database per tenant, every tenant database has the same tables, created by the same migrations. The kit names them from a prefix and the tenant ID, such as `tenant1`. The [database docs](/docs/core/database.html#tenant-database-naming) explain the naming.

## Tenant identification {#tenant-identification}

Tenant identification is how the app works out which tenant a request belongs to. The usual signals are the domain, a subdomain, a path such as `/acme/...` or a header. The kit identifies tenants by domain and returns a 404 for a host it doesn't know. The [multi-tenancy tutorial](/guides/laravel-multi-tenancy-tutorial.html#how-does-laravel-know-which-tenant-a-request-is-for) walks through the code.

## Tenant isolation {#tenant-isolation}

Tenant isolation means one tenant can never read or change another tenant's data. With a database per tenant, the database server enforces most of it; with a single database, your query scopes do. Caches, files and queued jobs need isolating too, or data leaks through them. [Testing multi-tenant Laravel apps](/blog/test-multi-tenant-laravel-pest.html) shows how to prove it with tests.

## Tenant migrations {#tenant-migrations}

Tenant migrations create and change the tables inside every tenant database. In the kit they live in `database/migrations/tenant`, run automatically for each new tenant and run for existing tenants with `php artisan tenants:migrate`. Central migrations stay in `database/migrations`. See [tenant migrations and seeders](/blog/laravel-tenant-migrations-seeders.html).

## Tenant provisioning {#tenant-provisioning}

Provisioning is everything that has to happen before a new tenant can sign in. In the kit, creating a tenant runs a pipeline that creates its database, runs the tenant migrations, seeds roles, permissions and menus, and creates the tenant's first admin. It runs inside the request, so the workspace works as soon as the page reloads. The [multi-tenancy docs](/docs/core/multi-tenancy.html#creating-a-tenant) show the pipeline.

## Wildcard DNS {#wildcard-dns}

Wildcard DNS is one DNS record, `*.your-saas.com`, that sends every subdomain to your server. With it, a new tenant's subdomain works the moment the tenant is created, without a DNS change. You also need a wildcard TLS certificate so each subdomain has HTTPS. [Deploying a Laravel SaaS](/blog/deploy-laravel-saas.html) covers both, and [Laravel Herd](/blog/laravel-herd-subdomains.html) handles it for `.test` domains on your machine.

<NextStep
  title="See these terms working in one app"
  text="The SaaS Laravel kits put tenants, central and tenant databases, guards, bootstrappers and provisioning together, in Vue, React, Svelte or Livewire."
  secondaryText="Read the multi-tenancy tutorial"
  secondaryLink="/guides/laravel-multi-tenancy-tutorial.html"
/>
