---
title: "Laravel Activity Log with Spatie: A Practical Guide"
description: "Add a Laravel activity log with spatie/laravel-activitylog v5: what to log in a SaaS, what to keep out, an Inertia feed, pruning and multi-tenant storage."
pageClass: blog-page
date: 2026-10-24
author: erag
category: security
tags: [Activity Log, Auditing]
---

# Laravel Activity Log: A Practical Audit Trail with spatie/laravel-activitylog

<BlogPostMeta />

Sooner or later a customer asks "who changed this?" Someone's role was raised to admin, a project vanished, the billing email is different. Without a Laravel activity log, the honest answer is "we don't know". With one, it's a single query: who did what, to which record, and when.

The most used package for this is [spatie/laravel-activitylog](https://spatie.be/docs/laravel-activitylog/v5/introduction). Version 5 came out in March 2026 and changed a lot of names, so many tutorials you'll find are now out of date. We'll set it up the current way, decide what a SaaS should log (and what it must never log), show an activity feed in an Inertia page, keep the table small, and handle tenants. We'll also compare it with owen-it/laravel-auditing, the other common choice for an audit trail.

We're using Laravel 13, PHP 8.4, Inertia v3 with Vue 3, spatie/laravel-activitylog 5.1 and owen-it/laravel-auditing 14.

## Activity log, audit trail or notifications?

These three get mixed up, so let's separate them first.

- An **activity log** is a readable history: "Jane changed the role of Tom from member to admin." It mixes automatic model events with entries you write yourself.
- An **audit trail** is the stricter version: every change to a record with old and new values, often with IP and URL, kept for compliance.
- **Notifications** tell a user something now. They can be marked as read and deleted, and that's exactly why they're useless as a record. If you want a bell, read [Laravel database notifications](/blog/laravel-database-notifications.html) instead.

spatie/laravel-activitylog can do the first well and the second reasonably. That's enough for most SaaS products.

## Install spatie/laravel-activitylog v5

v5 requires PHP 8.4 and Laravel 12 or newer.

```bash
composer require spatie/laravel-activitylog
php artisan vendor:publish --provider="Spatie\Activitylog\ActivitylogServiceProvider" --tag="activitylog-migrations"
php artisan vendor:publish --provider="Spatie\Activitylog\ActivitylogServiceProvider" --tag="activitylog-config"
```

Before you run `php artisan migrate`, open the published migration. It creates the `activity_log` table like this:

```php
Schema::create('activity_log', function (Blueprint $table) {
    $table->id();
    $table->string('log_name')->nullable()->index();
    $table->text('description');
    $table->nullableMorphs('subject', 'subject');
    $table->string('event')->nullable();
    $table->nullableMorphs('causer', 'causer');
    $table->json('attribute_changes')->nullable();
    $table->json('properties')->nullable();
    $table->timestamps();
});
```

**The UUID caveat.** `nullableMorphs()` creates integer `subject_id` and `causer_id` columns. If your models use UUIDs, switch to `nullableUuidMorphs()` (or `nullableUlidMorphs()` for ULIDs). If some models use integers and others UUIDs, both kinds will land in the same columns, so they need a type that can hold either, such as a string. Fix this before the first row is written.

### Coming from v4?

v5 moved classes into sub-namespaces and renamed several methods. The ones you'll hit first:

| v4 | v5 |
| --- | --- |
| `Spatie\Activitylog\Traits\LogsActivity` | `Spatie\Activitylog\Models\Concerns\LogsActivity` |
| `Spatie\Activitylog\LogOptions` | `Spatie\Activitylog\Support\LogOptions` |
| `$model->activities` | `$model->activitiesAsSubject` |
| `$user->actions` | `$user->activitiesAsCauser` |
| `$activity->changes` | `$activity->attribute_changes` |
| `getExtraProperty()` | `getProperty()` |
| `dontSubmitEmptyLogs()` | `dontLogEmptyChanges()` |
| `delete_records_older_than_days` | `clean_after_days` |

Batches (`LogBatch`) were removed, and model changes now live in their own `attribute_changes` column instead of inside `properties`. The upgrade guide has a migration for existing data.

## Log model changes automatically

Add the `LogsActivity` trait to a model. With no other code, it logs `created`, `updated` and `deleted` events, plus `restored` for soft-deleted models. To record what changed, define `getActivitylogOptions()`:

```php
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Project extends Model
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'status', 'owner_id'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }
}
```

`logOnly()` lists the attributes to track. `logOnlyDirty()` stores only the ones that actually changed. `dontLogEmptyChanges()` skips the entry when none of the tracked attributes changed, for example when only `updated_at` moved.

After `$project->update(['status' => 'archived'])`, the activity holds:

```php
$activity->description;        // 'updated'
$activity->subject;            // the Project
$activity->causer;             // the signed-in user
$activity->attribute_changes;  // ['attributes' => ['status' => 'archived'], 'old' => ['status' => 'active']]
```

The causer is filled in automatically from the signed-in user when the entry is logged.

We prefer `logOnly()` over `logAll()`. An explicit list means a new column (maybe one holding something sensitive) never ends up in the log by accident.

## Log actions manually from your services

Model events only see one model at a time. Many things worth logging aren't a single model update: a role change, a data export, an invitation sent. For those, write the entry yourself, in the service that does the work:

```php
public function changeRole(User $user, string $role): void
{
    DB::transaction(function () use ($user, $role) {
        $old = $user->getRoleNames()->first();

        $user->syncRoles([$role]);

        activity('security')
            ->performedOn($user)
            ->causedBy(auth()->user())
            ->event('role_changed')
            ->withProperties(['old' => $old, 'new' => $role])
            ->log('Changed role');
    });
}
```

`activity('security')` puts the entry in a named log, so you can filter with `Activity::inLog('security')` later. Because the entry is written on the same connection inside the transaction, it rolls back together with the change. You never get a log entry for a role change that didn't happen.

Keeping these calls in services, not controllers, also means the log is written no matter where the action comes from: a controller, a console command or a queued job. That's one more reason to keep [controllers thin](/blog/laravel-thin-controllers.html).

## What to log in a SaaS audit trail

Not everything. A log full of noise is a log nobody reads. This is the list we start with:

| Event | How to log it | Why |
| --- | --- | --- |
| Sign in, sign out, failed sign in | Listener on Laravel's `Login`, `Logout` and `Failed` auth events | Spotting account takeover |
| Password, email or 2FA changed | Manual entry in the service | Users ask "did I do this?" |
| Role or permission changes | Manual entry in the role or user service | Privilege escalation is the classic incident |
| User invited, removed or suspended | Manual entry | Who has access, and since when |
| Tenant or workspace settings changed | `LogsActivity` on the settings model | Settings affect everyone in the tenant |
| Deletes of important records | `LogsActivity` with the `deleted` event | Answering "where did it go?" |
| Exports and bulk actions | Manual entry with counts in properties | Data leaving the system |

Sign-ins are easiest with a listener. Laravel 13 discovers listeners in `app/Listeners` automatically:

```php
namespace App\Listeners;

use Illuminate\Auth\Events\Login;

class LogSuccessfulLogin
{
    public function handle(Login $event): void
    {
        activity('auth')
            ->causedBy($event->user)
            ->event('login')
            ->withProperties(['ip' => request()->ip(), 'guard' => $event->guard])
            ->log('Signed in');
    }
}
```

## What not to log

An audit log is read by admins and support staff, it's included in backups, and it lives for months. Treat it as a place secrets must never reach.

- **Passwords and password hashes.** Never track `password`, even hashed.
- **Tokens and secrets.** `remember_token`, API tokens, 2FA secrets and recovery codes, passkey data, webhook signing secrets.
- **Raw request payloads.** `withProperties($request->all())` copies whatever the user sent, including passwords on a profile form.
- **Credentials from failed logins.** The `Failed` event carries the submitted credentials. Log the email or user ID, never the array.
- **More personal data than you need.** Store an ID and a name, not a full address or a copy of the uploaded document.

Put the sensitive names in `default_except_attributes` in `config/activitylog.php`. Those attributes are excluded from every model's log output, merged with any model-level `logExcept()`:

```php
'default_except_attributes' => ['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'],
```

Our [Laravel SaaS security checklist](/blog/laravel-saas-security-checklist.html) covers the other places secrets tend to leak.

## Show a user activity log in an Inertia page

A log is only useful if admins can read it. Keep the query in a service and send the page a small, flat shape:

```php
use Spatie\Activitylog\Models\Activity;

class ActivityLogService
{
    public function feed(?string $log = null): LengthAwarePaginator
    {
        return Activity::query()
            ->with('causer')
            ->when($log, fn ($query) => $query->inLog($log))
            ->latest()
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Activity $activity) => [
                'id' => $activity->id,
                'description' => $activity->description,
                'event' => $activity->event,
                'causer' => $activity->causer?->name ?? 'System',
                'changes' => $activity->attribute_changes,
                'properties' => $activity->properties,
                'created_at' => $activity->created_at->diffForHumans(),
            ]);
    }
}
```

The `with('causer')` matters. Without it, every row loads its user separately, the classic [N+1 query problem](/blog/laravel-n-plus-one-queries.html). The controller passes `$service->feed($request->string('log')->value() ?: null)` to `Inertia::render('activity/Index', ['items' => ...])` and checks a permission, because the activity log is admin-only data.

The Vue page is a list:

```vue
<script setup lang="ts">
defineProps<{
    items: {
        data: { id: number; description: string; causer: string; created_at: string; changes: { old?: Record<string, unknown>; attributes?: Record<string, unknown> } | null }[];
    };
}>();
</script>

<template>
    <ul class="divide-y">
        <li v-for="item in items.data" :key="item.id" class="py-3">
            <p class="text-sm">
                <span class="font-medium">{{ item.causer }}</span> {{ item.description }}
            </p>
            <p v-for="(value, key) in item.changes?.attributes ?? {}" :key="key" class="text-xs text-neutral-500">
                {{ key }}: {{ item.changes?.old?.[key] ?? '(empty)' }} → {{ value }}
            </p>
            <p class="text-xs text-neutral-400">{{ item.created_at }}</p>
        </li>
    </ul>
</template>
```

If your app is multilingual, don't show `description` as is. Store a stable `event` like `role_changed` and translate it when you render, the same approach we use for notifications.

## Prune the log with activitylog:clean

The table grows forever unless you trim it. The package ships a command that deletes entries older than `clean_after_days` (365 by default):

```php
// routes/console.php
use Illuminate\Support\Facades\Schedule;

Schedule::command('activitylog:clean --force')->daily();
```

`--force` skips the confirmation prompt in production. You can clean one log with `php artisan activitylog:clean security` or override the age with `--days=90`. Pick the retention period from your contracts or regulations, not from what feels tidy. Security logs are often kept longer than general activity.

## Multi-tenant apps: per-tenant table or central log?

With a database per tenant, you have to decide where `activity_log` lives.

| | Table in each tenant database | One central table |
| --- | --- | --- |
| Setup | Put the migration in your tenant migrations folder | Custom `Activity` model with a central `$connection` |
| Isolation | Tenant data stays in the tenant database | Every tenant in one table, needs a `tenant_id` column |
| Deleting a tenant | Log goes with the database | Delete the tenant's rows yourself |
| Platform-wide view | Loop over tenants | One query |
| Causer IDs | Unambiguous inside the tenant | User 5 exists in many tenants, so store the tenant too |

We'd use a table per tenant for tenant activity. In a tenant request, the default connection already points at the tenant database, so the default `Activity` model writes there with no extra code. Run `php artisan tenants:migrate` after adding the migration ([more on tenant migrations](/blog/laravel-tenant-migrations-seeders.html)). Clean each tenant from one scheduled job:

```php
Schedule::call(function () {
    tenancy()->runForMultiple(null, function () {
        Artisan::call('activitylog:clean', ['--force' => true]);
    });
})->daily()->name('clean-tenant-activity')->onOneServer();
```

Central, platform-level actions (a super admin suspending a tenant, changing a plan) belong in the central database's own `activity_log` table. v5 removed the `database_connection` config key, so if you ever need a different connection, you extend the `Activity` model, set `$connection`, and point `activity_model` in the config at it.

## spatie/laravel-activitylog vs owen-it/laravel-auditing

If you search for a Laravel audit log package, these two come up. They solve overlapping problems with different defaults.

| | spatie/laravel-activitylog v5 | owen-it/laravel-auditing v14 |
| --- | --- | --- |
| Model setup | `LogsActivity` trait | `Auditable` contract plus `Auditable` trait |
| Main record | Description, subject, causer, event, changes, custom properties | Event, auditable model, user, `old_values`, `new_values` |
| Request context | Add IP or URL yourself via properties | Stores URL, IP address and user agent by default |
| Manual entries | `activity()->log()` from anywhere | Built around model events, plus helpers for pivot changes |
| Restore an old state | Not built in | `transitionTo($audit)` |
| Retention | `activitylog:clean` command | Per-model `$auditThreshold` (max audits per model) |
| Console and seeders | Logged like any other change | Not audited by default (`audit.console` is `false`) |
| Requirements | PHP 8.4+, Laravel 12+ | PHP 8.2+, Laravel 11 to 13 |

Our rule of thumb: if you want a readable feed of what people did ("Jane invited Tom"), pick spatie. If compliance asks for a strict per-record history with old and new values, IP and user agent, and the option to roll a record back, owen-it fits better. Some teams run both: auditing on a few sensitive models, an activity log for everything human-readable.

## Mistakes we see with activity logs

- **Logging `$request->all()`.** Sooner or later it contains a password.
- **`logAll()` on the `User` model.** That includes password hashes and 2FA columns unless you exclude them.
- **Integer morph columns with UUID models.** Inserts fail, or IDs get mangled. Check the migration first.
- **No eager loading on the feed.** Without `with('causer')`, every row runs its own user query.
- **Logging in controllers only.** Actions from queued jobs and console commands then go missing. Log in services.
- **Never pruning.** The table becomes the biggest one in the database, and backups get slow.
- **Copying v4 tutorials.** The namespaces and method names changed in v5. If `Spatie\Activitylog\Traits\LogsActivity` can't be found, that's why.

## Frequently asked questions

### How do I create an activity log in Laravel?

Install `spatie/laravel-activitylog`, publish and run its migration, and add the `LogsActivity` trait to the models you want tracked. For actions that aren't a single model change, call `activity()->performedOn($model)->log('...')` from your service code.

### What is the difference between an activity log and an audit trail?

An activity log is a readable history of what users did, often written by hand for important actions. An audit trail records every change to specific records, with old and new values and request details, mainly for compliance. Many SaaS apps start with an activity log and add strict auditing only for sensitive models.

### Does spatie/laravel-activitylog work with UUIDs?

Yes, but edit the published migration first. Change `nullableMorphs('subject', 'subject')` and `nullableMorphs('causer', 'causer')` to `nullableUuidMorphs()` (or the ULID version) so the ID columns match your keys.

### How do I delete old activity log entries?

Schedule `php artisan activitylog:clean --force` daily. It deletes entries older than `clean_after_days` in `config/activitylog.php`, and you can override that per run with `--days`.

### Should I log user logins in Laravel?

Yes, for any SaaS with paying customers. Listen to the `Login`, `Logout` and `Failed` events and log the user, guard and IP address. Never log the submitted credentials from a failed attempt.

## Activity logs in the SaaS Laravel kits

The [SaaS Laravel starter kits](/) do not ship an activity log, and spatie/laravel-activitylog isn't installed. What they do ship are in-app [database notifications](/docs/core/notifications.html), which are a different thing: users can mark them as read and delete them, so they can't serve as a record of what happened.

The kit's structure makes an activity log easy to add. Business logic already lives in services inside `Modules/*`, and those are the places to write manual entries: `Modules/RolePermission/Services/RoleService.php` for creating, updating and deleting roles, `Modules/User/Services/UserService.php` for creating and updating users, invitations and deletes, and `Modules/Tenant/Services/TenantService.php` for central actions on tenants. Every kit runs a database per tenant with separate tenant migrations, so you'd publish the migration into both `database/migrations` and `database/migrations/tenant`. An admin feed page would sit next to the other module pages, behind a permission.

<BlogPostCta title="A clean place for audit logs" text="SaaS Laravel keeps business logic in module services, so adding an activity log means a few lines in the services you already have." />
