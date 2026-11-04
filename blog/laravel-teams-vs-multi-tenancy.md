---
title: "Laravel Teams vs Multi-Tenancy: Which Does Your SaaS Need?"
description: "Laravel teams vs multi tenancy, compared in depth: team_id scoping, the Laravel 13 starter kit teams, Jetstream, tenant databases and how to migrate later."
pageClass: blog-page
date: 2026-11-04
author: erag
category: multi-tenancy
tags: [Multi-tenancy, Teams, Architecture]
---

# Laravel Teams vs Multi-Tenancy: What's the Difference and Which Do You Need?

<BlogPostMeta />

"Should I use teams or multi-tenancy?" is one of the first questions people ask when they start a Laravel SaaS. The two words get mixed up all the time. Both put customers into groups, both let you invite people, and both change which records a user can see. But Laravel teams vs multi tenancy is really a question about two different layers: who works together, and how strongly their data is kept apart.

In this post we'll explain what teams are in Laravel (including the new team option in the Laravel 13 starter kits and Jetstream teams), what multi-tenancy adds on top, and how to choose. We'll also cover the cases the short answers skip: teams inside a tenant, spatie/laravel-permission's teams mode, users who belong to several tenants, and how to move from teams to tenancy later without a rewrite.

## The short answer

**Teams** decide who works together. A user can belong to one or more teams, has a current team, and your queries filter rows by `team_id`.

**Multi-tenancy** decides how far one customer's data is kept from another's. That can be a `tenant_id` column in a shared database, a separate database per customer, or even a separate deployment.

| Question | Teams | Multi-tenancy |
| --- | --- | --- |
| What is it about? | Membership and collaboration | Isolation between customers |
| Can a user be in several? | Yes, that's the point | Usually one account per tenant |
| How is data separated? | A `team_id` column and your queries | A column, a database or a whole deployment |
| How do users switch? | A team switcher, same session | Usually a different subdomain or domain |
| What else is separated? | Nothing, unless you build it | Often cache, files, queues and backups too |

The simplest kind of tenancy, a shared database with a `tenant_id` column, uses the same mechanics as teams. The difference is intent. A team is a group of users. A tenant is a customer boundary that everything else in your app has to respect. (Filament panels call their team scoping "tenancy" too, which adds to the confusion; we compare it in [Filament vs Inertia](/blog/filament-vs-inertia.html).)

## What "teams" means in Laravel

### Teams in the Laravel 13 starter kits

The official React, Svelte, Vue and Livewire starter kits can now be generated with team support. The [Laravel 13 starter kit docs](https://laravel.com/docs/13.x/starter-kits#teams) describe what you get:

- Each user belongs to one or more teams and has a current team.
- New users get a personal team when they register.
- Screens to create teams, switch between them, invite members and edit team details.
- Team-scoped routes carry the team slug, so the dashboard becomes `/{current_team}/dashboard`, and the kit checks that the user belongs to the team in the URL.
- URL defaults, so `route('dashboard')` fills in the current team for you.
- Reserved names, so nobody can create a team called `settings` or `login` and break your routes.

Looking at the kit's source, the data model is small. A `teams` table with `name`, `slug` and `is_personal`, a `team_members` pivot with a `role`, a `team_invitations` table, and a `current_team_id` column on `users`. Roles are an enum with three cases, `owner`, `admin` and `member`, each mapped to a fixed list of team permissions. The `HasTeams` trait on the user gives you methods such as `switchTeam()`, `belongsToTeam()` and `teamRole()`.

What the kit doesn't do is scope your own data. Your `projects` or `invoices` tables still need a `team_id` column and a query filter that you write. That's not a criticism. It's the line between teams and tenancy.

### Jetstream teams

Before the current starter kits, teams came from Laravel Jetstream, installed with the `--teams` option. Jetstream gives every user a personal team, a `currentTeam` relationship, a team switcher, invitations, and roles you define with `Jetstream::role()` in `JetstreamServiceProvider`. You check them with `$user->hasTeamPermission($team, 'server:create')`.

Jetstream still works, but the Laravel 13 starter kit page lists only the four new kits, so for a new project we'd start there. Either way it's the same idea: membership and roles, with data scoping left to you.

### What team scoping looks like in code

Here's the part you write yourself. A small holder for the current team, set by middleware:

```php
<?php

namespace App\Support;

use App\Models\Team;

final class CurrentTeam
{
    private ?int $id = null;

    public function set(Team $team): void
    {
        $this->id = $team->id;
    }

    public function id(): ?int
    {
        return $this->id;
    }
}
```

Register it with `$this->app->scoped(CurrentTeam::class)` so it resets between requests and queued jobs. Then a trait for every team-owned model:

```php
<?php

namespace App\Models\Concerns;

use App\Support\CurrentTeam;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

trait BelongsToTeam
{
    public static function bootBelongsToTeam(): void
    {
        static::addGlobalScope('team', function (Builder $query): void {
            $teamId = app(CurrentTeam::class)->id();

            // Fail closed: no team means no rows, not all rows.
            $teamId === null
                ? $query->whereRaw('1 = 0')
                : $query->where($query->qualifyColumn('team_id'), $teamId);
        });

        static::creating(function (Model $model): void {
            $model->team_id ??= app(CurrentTeam::class)->id();
        });
    }
}
```

The "fail closed" line matters. A scope that silently does nothing when the team is missing turns every forgotten `set()` call into a data leak.

## What multi-tenancy means

Multi-tenancy is about the customer boundary. There are three common levels:

1. **Single database, `tenant_id` on every row.** Mechanically the same as team scoping. stancl/tenancy has a `BelongsToTenant` trait for this.
2. **Database per tenant.** Each customer gets their own database, and the app switches connections when it identifies the tenant, usually from the subdomain.
3. **Deployment per tenant.** Each customer gets their own app instance and servers. Rare, and usually driven by contracts or regulation.

We compare the first two in [single vs multi-database tenancy in Laravel](/blog/single-vs-multi-database-tenancy-laravel.html). What matters here is that a database-per-tenant tenant also gets its own cache keys, file folder, queue context, domain, users and backups. Packages like stancl/tenancy switch all of these when the tenant is identified. Teams switch none of them.

## Laravel teams vs multi tenancy: the full comparison

| | Teams (`team_id`) | Single-database tenancy | Database per tenant |
| --- | --- | --- | --- |
| Isolation | Your queries | Your queries plus package scopes | The database itself |
| A forgotten filter | Leaks data | Leaks data | Can't reach other tenants |
| Users | One account, many teams | Usually one tenant per account | A users table per tenant |
| Identification | Session or URL segment | Domain, subdomain or path | Domain or subdomain |
| Switching | Instant, same login | New domain, often a new login | New domain and login |
| Cache, files, queues | Shared unless you add prefixes | Package helps | Package switches them for you |
| Per-customer backup and restore | Hard | Hard | One database dump |
| Deleting a customer | Delete rows in every table | Delete rows in every table | Drop one database |
| Reporting across customers | One query | One query | Loop or ETL |
| Migrations | Run once | Run once | Run once per tenant |
| Setup effort | Low | Medium | Higher |

## Which one should you pick?

Pick **teams** when:

- One person really works in several groups, like a freelancer in several client workspaces.
- Groups are small, created by users, and switching should be instant.
- Nobody asks about data isolation or restoring one customer's data on its own.

Pick **multi-tenancy** when:

- Each customer is a company, and their data must never touch another company's.
- Customers expect their own subdomain or custom domain.
- You need per-customer backups, exports, deletion or data residency.
- A security review or contract asks how customer data is separated, and "a `WHERE` clause" isn't an answer you want to give.

Plenty of products need both, which brings us to the next section.

## Teams inside a tenant

Picture a B2B app where Acme Corp is the tenant. Inside Acme, there's a sales team, a support team and a finance team, each with their own projects. That's tenancy for the company and teams for the departments.

In a database-per-tenant app, this is simpler than it sounds. The `teams` table lives in each tenant's database. You don't need `team_id` to keep Acme away from Globex, because the database already does that, only to group records inside Acme. A bug in your team scope can show sales the finance team's projects, but never another company's.

### spatie/laravel-permission teams mode

If you use spatie/laravel-permission, it has a teams mode that scopes roles by team. Set `'teams' => true` in `config/permission.php` before your first permission migration. If you've already migrated, run `php artisan permission:setup-teams` and then `php artisan migrate`. After that, every role assignment is stored with a team ID, and you tell the package which team is active:

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class SetPermissionsTeam
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($teamId = $request->user()?->current_team_id) {
            setPermissionsTeamId($teamId);
        }

        return $next($request);
    }
}
```

The [Spatie teams docs](https://spatie.be/docs/laravel-permission/v8/basic-usage/teams-permissions) ask you to run this middleware before `SubstituteBindings`, or you get 404s where you expect 403s. In `bootstrap/app.php`:

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->prependToPriorityList(
        before: \Illuminate\Routing\Middleware\SubstituteBindings::class,
        prepend: \App\Http\Middleware\SetPermissionsTeam::class,
    );
})
```

When a user switches teams in the same request, call `setPermissionsTeamId($newId)` and then `$user->unsetRelation('roles')->unsetRelation('permissions')`, or the old team's roles are still loaded. Roles created with `team_id` set to `null` are global and can be assigned in any team.

In a database-per-tenant app, teams mode works inside each tenant database unchanged, because the permission tables are tenant tables. Just don't confuse the two: teams mode scopes roles by team. It isn't needed to separate tenants that already have their own databases.

## Can a user belong to several tenants?

With teams, yes, by design. With database-per-tenant tenancy, you have three options:

| Approach | How it works | Trade-off |
| --- | --- | --- |
| Separate accounts | Each tenant database has its own `users` table. The same email can sign up in two tenants with two passwords. | Simplest and most isolated. Users with several workspaces log in to each one. |
| Central identity plus memberships | A central `users` table and a central `tenant_user` pivot. Users log in centrally, pick a workspace, and are signed in to that tenant. | One login, but you build the hand-off between central and tenant. |
| Synced resources | stancl v3's resource syncing keeps a central user and copies in each tenant database in sync for the attributes you choose. | Works, but the stancl docs call it complex. Use it only when you need it. |

For most B2B products, separate accounts are fine, because people rarely work for two of your customers at once. If your product is more like Slack, where one person joins many workspaces, teams (or central identity) fit better.

## Migrating from teams to tenancy

Starting with teams and moving to database-per-tenant later is possible. It goes much better if you plan the move from day one:

1. **Put `team_id` on every team-owned table now**, even child tables like `invoice_lines`. During the move it tells you exactly which rows to copy.
2. **Keep team IDs stable.** Use the team ID as the tenant ID, so links, logs and support tickets still make sense.
3. **Create a tenant and database per team**, and run your tenant migrations against it.
4. **Copy rows table by table in dependency order** (parents before children), in chunks, filtered by `team_id`. Keep the primary keys so foreign keys still match.
5. **Decide what happens to users in several teams.** Split them into one account per tenant, or keep a central identity as described above.
6. **Move files and cache.** Copy each team's files into its tenant folder and let the cache warm up again.
7. **Change routing.** Move from `/{team}/dashboard` to `acme.your-app.com/dashboard`, and redirect old URLs.
8. **Dry-run the copy first**, compare row counts per table, then move one tenant at a time in a maintenance window.

The longer you wait, the more tables you copy. If you already know customers will want isolation, start with tenancy.

## Mistakes we see

- **Calling teams "multi-tenancy" in a security review.** If isolation depends on every query remembering `team_id`, say so honestly and add tests that prove it.
- **Scopes that fail open.** A global scope that skips the filter when no team is set returns every row. Make it return nothing instead.
- **Forgetting queued jobs.** A job has no session and no logged-in user. Pass the team ID into the job and set it before you touch the database. The same goes for scheduled commands.
- **Raw queries and `DB::table()`.** Global scopes only apply to Eloquent. Query builder calls skip them.
- **Turning on spatie teams mode after the fact without the migration.** The team columns don't exist yet, so role queries fail. Run `permission:setup-teams` and migrate first.

## Frequently asked questions

### Is Laravel teams the same as multi-tenancy?

No. Teams group users and let them switch between groups, and you scope data with a `team_id` column. Multi-tenancy is about isolating customers, which can mean a separate database, cache, file storage and domain per customer. Team scoping is roughly the simplest form of tenancy, but it doesn't isolate anything beyond your queries.

### Does Laravel 13 have a built-in teams feature?

Yes. The official React, Svelte, Vue and Livewire starter kits can be generated with team support. You get personal teams, team switching, invitations, owner, admin and member roles, and team slugs in the URL. You still add `team_id` to your own tables and scope them yourself.

### Should I use Jetstream teams for a new SaaS?

For a new app, we'd start from the Laravel 13 starter kits, since that's what the current docs list. Neither gives you tenant isolation. If you need separate databases or subdomains, add a tenancy package such as stancl/tenancy.

### Can I use spatie/laravel-permission teams mode with stancl/tenancy?

Yes. In a database-per-tenant app, the permission tables live in each tenant database, so teams mode only scopes roles between teams inside one tenant. Enable it before your first migration (or run `permission:setup-teams`), and set the team with `setPermissionsTeamId()` in a middleware that runs before `SubstituteBindings`.

## Teams and tenants in the SaaS Laravel kits

The SaaS Laravel kits are built on tenancy, not teams. Each tenant is its own workspace with its own database, found from a subdomain of `APP_DOMAIN`, and users in that workspace have tenant accounts with their own guard. spatie/laravel-permission runs with teams mode off, because each tenant already has its own roles and permissions in its own database. There's no separate teams feature today. If you need departments inside a workspace, we'd add them as a module in `Modules/` with a tenant migration for a `teams` table, a service for membership, and a tenant permission such as "Manage Teams" in `config/permissions/tenant/`. Read the [multi-tenancy docs](/docs/core/multi-tenancy.html) for how tenants are created, [users, roles and permissions](/docs/core/users-roles-permissions.html) for the role setup, and [how to build a multi-tenant SaaS with Laravel](/blog/multi-tenant-saas-laravel-database-per-tenant.html) or [stancl/tenancy vs Spatie multitenancy](/blog/stancl-tenancy-vs-spatie-multitenancy.html) if you're still choosing your approach.

<BlogPostCta title="Real tenant isolation from day one" text="SaaS Laravel gives every customer their own database, subdomain, roles and permissions on Laravel 13. It doesn't include a separate teams feature, so you add one only if you need it." />
