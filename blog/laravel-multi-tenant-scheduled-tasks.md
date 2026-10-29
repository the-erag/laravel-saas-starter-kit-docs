---
title: "Laravel Multi-Tenant Scheduler: tenants:run and Queued Jobs"
description: "Run scheduled tasks for every tenant in a Laravel SaaS with stancl/tenancy: tenants:run, one queued job per tenant, skipping suspended tenants and time zones."
pageClass: blog-page
date: 2026-10-29
author: annu-gupta
category: multi-tenancy
tags: [Multi-tenancy, Scheduler]
---

# Laravel Scheduler for Multi-Tenant Apps: Run Tasks for Every Tenant With stancl/tenancy

<BlogPostMeta />

In a normal Laravel app, a scheduled task is one line in `routes/console.php`. In a multi-tenant SaaS it's not that simple. The scheduler runs in the central app, but the data your task needs, like invoices, reports or reminders, sits in each tenant's own database.

This post covers the ways we run scheduled work for every tenant with stancl/tenancy, when to use which, and the small things that cause trouble in production: suspended tenants, time zones, jobs that pile up and commands that wait for an answer nobody gives.

## Why the normal scheduler isn't enough

The Laravel scheduler is started by one cron line on your server:

```bash
* * * * * cd /var/www/your-saas && php artisan schedule:run >> /dev/null 2>&1
```

That process starts your app without any tenant. So a query on a tenant model either fails or, worse, quietly runs against the central database. Every per-tenant task has to switch into each tenant first. There are three ways to do that.

| Approach | Use it for | How it runs |
| --- | --- | --- |
| `tenants:run` | Existing Artisan commands, housekeeping | One tenant after another, inside the scheduler |
| One queued job per tenant | Real work: emails, reports, API calls | In parallel, on your queue workers |
| One central task | Work that only touches central data | Once |

## Option 1: tenants:run

stancl/tenancy ships a command called `tenants:run`. It runs any Artisan command inside every tenant, or only the tenants you name:

```php
// routes/console.php
use Illuminate\Support\Facades\Schedule;

Schedule::command('tenants:run model:prune')->daily();

Schedule::command('tenants:run sanctum:prune-expired --option="hours=24"')->daily();
```

You can't just add flags to the end, because they'd be read by `tenants:run` itself. Pass them through with `--argument="name=value"` and `--option="name=value"` instead. To run it for some tenants only, add `--tenants=acme --tenants=globex`.

One thing that catches people out: commands run from the scheduler can't answer questions. Anything that normally asks "Are you sure?" in production will just hang, so pass the force option to commands like `migrate`.

`tenants:run` is the simplest choice and great for cleanup. The catch is that it handles tenants one at a time inside the scheduler process. With 500 tenants and a command that takes 2 seconds, that's about 17 minutes. Fine for a nightly cleanup, not fine for anything time-sensitive.

## Option 2: one queued job per tenant

For real work, keep the scheduler's part tiny. It just loops over the tenants and queues one job for each. Your [queue workers](/blog/laravel-multi-tenant-queues.html) then do the heavy lifting in parallel.

```php
// routes/console.php
use App\Models\Tenant;
use Illuminate\Support\Facades\Schedule;
use Modules\Report\Jobs\SendWeeklyReport;

Schedule::call(function () {
    tenancy()->runForMultiple(
        Tenant::query()->active()->cursor(),
        fn () => SendWeeklyReport::dispatch(),
    );
})->name('weekly-reports')->weeklyOn(1, '06:00')->onOneServer();
```

`runForMultiple` switches into each tenant in turn. Because the job is queued while that tenant is active, stancl's queue bootstrapper saves the tenant ID on the job, and the worker switches into the same tenant before running it. So the job itself looks completely normal:

```php
final class SendWeeklyReport implements ShouldQueue
{
    use Queueable;

    public function handle(ReportService $reports): void
    {
        $reports->sendWeeklySummaryToAdmins();
    }
}
```

No tenant IDs to pass around and no switching databases by hand. If you don't use the queue bootstrapper, pass the tenant ID into the job and call `tenancy()->initialize()` at the start of `handle()`.

## Don't queue the same job twice

If your queue falls behind, the scheduler can add a second copy of a job before the first one has run. For something like a weekly report, that means two emails. Make the job unique per tenant:

```php
final class SendWeeklyReport implements ShouldQueue, ShouldBeUnique
{
    use Queueable;

    public function uniqueId(): string
    {
        return (string) tenant('id');
    }
}
```

Now each tenant can only have one copy of this job waiting in the queue at a time.

## Skip suspended tenants

You don't want to send reports to a company you suspended for not paying, or waste API credits on a workspace nobody finished setting up. Filter the tenants once, in the scheduler, rather than checking inside every job. One filter in one place is much easier to get right.

The `active()` call above is a small scope on the tenant model. stancl/tenancy keeps any attribute that isn't a real column in a JSON `data` column, so if that's where your status lives, query it with the `data->` path:

```php
// app/Models/Tenant.php
use Illuminate\Database\Eloquent\Builder;

public function scopeActive(Builder $query): void
{
    $query->where(fn (Builder $query) => $query
        ->where('data->workspace_status', 'active')
        ->orWhereNull('data->workspace_status'));
}
```

If the status is a real column on your `tenants` table, a plain `where('status', 'active')` is all you need. Our post on [suspending tenant accounts](/blog/suspend-tenant-accounts-saas.html) explains how workspace status works.

## Different time zones

"Every Monday at 6 am" means something different for a tenant in Sydney and one in Berlin. The trick is to run the task more often and let each tenant decide:

```php
Schedule::call(function () {
    tenancy()->runForMultiple(
        Tenant::query()->active()->cursor(),
        function (Tenant $tenant) {
            $local = now($tenant->timezone ?? 'UTC');

            if ($local->isMonday() && $local->hour === 6) {
                SendWeeklyReport::dispatch();
            }
        },
    );
})->name('weekly-reports')->hourly()->onOneServer();
```

The task runs every hour, and each tenant gets its report at 6 am local time. The same pattern works for tenant settings like "send my digest daily or weekly".

Try not to register a separate schedule entry for every tenant inside the scheduler. People have reported that this gets unreliable once you have hundreds of tenants. One entry that checks each tenant and queues jobs scales much better.

## Overlap, servers and long runs

These options matter a lot more once you have many tenants:

- `withoutOverlapping()` stops a new run starting while the last one is still going. You'll want it on `tenants:run` loops that might take longer than their interval.
- `onOneServer()` makes sure only one of your servers runs the task. It needs a shared cache that supports locks, like Redis or the database driver.
- `runInBackground()` lets other tasks that are due at the same minute start straight away.
- Closure tasks need a name, set with `->name()`, for `withoutOverlapping()` and `onOneServer()` to work. The name also shows up in `schedule:list`.

## Checking and debugging

- `php artisan schedule:list` shows every task and when it runs next.
- `php artisan schedule:test` lets you pick a task and run it right now.
- `php artisan schedule:work` runs the scheduler every minute on your machine, no cron needed.
- `->onFailure()` and `->pingOnFailure($url)` let you send an alert to your monitoring service.

When a job fails for one tenant, it's usually a data problem in that tenant rather than a bug in the job. The tenant ID on the failed job tells you where to look.

## Testing scheduled work

Test the job, not the cron. Inside a tenant, call the job directly and check the result:

```php
it('sends the weekly report to tenant admins', function () {
    Notification::fake();

    (new SendWeeklyReport)->handle(app(ReportService::class));

    Notification::assertSentTo($this->tenantAdmin, WeeklyReportNotification::class);
});
```

Then add one test for the scheduler closure that checks suspended tenants are skipped. Our guide on [testing multi-tenant Laravel with Pest](/blog/test-multi-tenant-laravel-pest.html) shows the tenant setup.

## Frequently asked questions

### Does the Laravel scheduler run for each tenant automatically?

No. It runs once, in the central app. You decide which tasks run per tenant, either with `tenants:run` or by queueing a job per tenant inside `runForMultiple`.

### What's the difference between tenants:run and tenants:artisan?

`tenants:run` is the stancl/tenancy command. `tenants:artisan` comes from Spatie's laravel-multitenancy package. They do the same job for different packages, so use the one that matches the tenancy package you have.

### How many tenants can tenants:run handle?

As many as it can get through before the next run is due. Because it works one tenant at a time, keep it for quick housekeeping, and queue jobs for anything slow or time-sensitive.

### Where does the cron line go in a multi-tenant app?

Same as any Laravel app: one `schedule:run` line per server. Our [Laravel SaaS deployment guide](/blog/deploy-laravel-saas.html) covers the server setup, the queue workers and the scheduler.

## Scheduled tasks in the SaaS Laravel starter kit

Our [SaaS Laravel](/) kit uses stancl/tenancy with a database per tenant, so `tenants:run` and `runForMultiple` work straight away. Every tenant already has a workspace status (Active, Trial, Pending Invitation or Suspended) you can filter on, invitation emails already go through the queue, and the module structure gives your new jobs an obvious place to live, right next to the services they call.

<BlogPostCta title="A multi-tenant Laravel kit ready for background work" text="SaaS Laravel gives you database-per-tenant tenancy, workspace statuses, queued notifications and a clean module structure for your scheduled jobs." />
