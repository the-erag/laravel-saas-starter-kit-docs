---
title: "Laravel Health Check: /up, Readiness and Multi-Tenant Monitoring"
description: "Laravel health check guide: the /up route and DiagnosingHealth, liveness vs readiness, spatie/laravel-health, and checks for tenant databases, queues and certs."
pageClass: blog-page
date: 2026-11-04
author: erag
category: saas
tags: [Monitoring, Multi-tenancy, Operations]
---

# Laravel Health Check Endpoints for a Multi-Tenant SaaS

<BlogPostMeta />

A Laravel health check answers one question for a machine: is this app working right now? Your load balancer asks it to decide where to send traffic, your uptime monitor asks it to decide whether to wake you up. The built-in `/up` route answers "PHP booted". In a multi-tenant SaaS that's not enough. The central database can be fine while one tenant's database server is down, the queue can be stuck so no tenant gets its emails, and a customer's custom domain certificate can expire without anyone noticing.

In this post we go from Laravel's `/up` route and its `DiagnosingHealth` event to a proper setup: liveness vs readiness, spatie/laravel-health with the checks that matter for a multi-tenant app (central and tenant databases, queue and scheduler heartbeats, Redis, disk, failed jobs and certificate expiry for custom domains), how to protect the detailed endpoint, and how to wire up external monitors and alerts. Server setup and launch prep are covered in [deploying a Laravel SaaS](/blog/deploy-laravel-saas.html) and the [launch checklist](/blog/laravel-saas-launch-checklist.html), so we won't repeat them here.

## Laravel's built-in /up health route

New Laravel apps register a health route in `bootstrap/app.php`:

```php
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    // ...
```

Here's what that route does, straight from the framework source:

- It returns **200** with a small "Application up" page, or `{"status":"up"}` when the request expects JSON.
- It dispatches `Illuminate\Foundation\Events\DiagnosingHealth`. If a listener throws, the route reports the exception and returns **500** (`{"status":"down"}`). With `APP_DEBUG=true` the exception is rethrown instead, so you see the error page.
- It's registered **outside** the `web` middleware group: no session, no cookies, no CSRF. Global middleware still runs.
- It's excluded from `php artisan down`, so it keeps answering 200 while the app is in maintenance mode.

That last point surprises people. If your load balancer uses `/up`, it keeps sending traffic during maintenance, which is usually what you want, since visitors get the maintenance page instead of a connection error.

### Add cheap checks with DiagnosingHealth

The event is the official place to add your own checks. Keep them fast and cheap, because monitors hit this URL every minute or more:

```php
// AppServiceProvider::boot()
Event::listen(function (DiagnosingHealth $event) {
    DB::connection(config('tenancy.database.central_connection'))->select('select 1');

    Cache::store()->get('health-check');
});
```

Throwing is the signal. A failed query throws on its own, so you don't need `try/catch`. Aim for well under a second: a slow check looks like a dead server to a load balancer with a short timeout. And don't loop over tenants here. If a few hundred tenant databases are each checked on every request to `/up`, the health check becomes the load problem.

### The domain that answers /up

In a stancl/tenancy app, `/up` isn't in your tenant route group, so it normally runs in the central context on any host. If you initialize tenancy in global middleware instead, `/up` on a tenant subdomain also proves that the tenant lookup works, and an unknown subdomain returns 404. Either way, point your main uptime monitor at the central domain's `/up`.

## Liveness vs readiness

Platforms like Kubernetes separate two questions, and it's worth doing the same on a plain VPS:

| | Liveness | Readiness |
| --- | --- | --- |
| Question | Is the process alive? | Can it serve real traffic? |
| Checks | PHP boots, maybe the central DB | Central DB, cache, Redis, queue backlog |
| On failure | Restart the container | Stop routing traffic to it |
| Speed | Milliseconds | Can be slower, results can be cached |
| Laravel | `/up` | `/up` plus `DiagnosingHealth`, or a package endpoint |

Never put tenant-level checks in liveness. If one tenant's database server goes down and your liveness probe fails, the orchestrator restarts every web container, and now every tenant is down.

## Detailed Laravel health monitoring with spatie/laravel-health

For more than a couple of checks, use [spatie/laravel-health](https://spatie.be/docs/laravel-health). It runs checks on a schedule, stores the results, sends notifications when something fails, and gives you endpoints that read the stored results instead of running everything per request.

```bash
composer require spatie/laravel-health
php artisan vendor:publish --tag="health-config"
php artisan vendor:publish --tag="health-migrations"
php artisan migrate
```

In a database-per-tenant app, the results table belongs in the **central** database. Keep the published migration in your central migrations folder, not `database/migrations/tenant`, and set the `connection` option of `EloquentHealthResultStore` in `config/health.php` to your central connection. Otherwise the store uses whatever the default connection is at that moment.

Schedule the runner, plus the two heartbeat commands we'll use below:

```php
// routes/console.php
use Spatie\Health\Commands\DispatchQueueCheckJobsCommand;
use Spatie\Health\Commands\RunHealthChecksCommand;
use Spatie\Health\Commands\ScheduleCheckHeartbeatCommand;

Schedule::command(RunHealthChecksCommand::class)->everyMinute();
Schedule::command(DispatchQueueCheckJobsCommand::class)->everyMinute();
Schedule::command(ScheduleCheckHeartbeatCommand::class)->everyMinute(); // keep this last
```

## The checks that matter in a multi-tenant app

Register checks in a service provider. This is the list we use, mixing built-in checks with three of our own:

```php
use Spatie\Health\Checks\Checks;
use Spatie\Health\Facades\Health;

Health::checks([
    Checks\DatabaseCheck::new()->connectionName(config('tenancy.database.central_connection')),
    TenantDatabaseCheck::new(),
    Checks\QueueCheck::new()->onQueue(['default', 'emails']),
    Checks\ScheduleCheck::new(),
    Checks\RedisCheck::new(),
    Checks\CacheCheck::new(),
    Checks\UsedDiskSpaceCheck::new()->warnWhenUsedSpaceIsAbovePercentage(70)->failWhenUsedSpaceIsAbovePercentage(90),
    FailedJobsCheck::new(),
    CertificateExpiryCheck::new()->dailyAt('06:00'),
    Checks\DebugModeCheck::new(),
]);
```

### Central database

The central database holds tenants, domains, the jobs table and usually sessions. If it's down, nothing works, including tenant identification. `DatabaseCheck` opens a PDO connection to the connection you name. Name the central connection explicitly, because the default connection changes when tenancy initializes.

### A sample tenant database

Tenant databases often live on a different server, or even several. Checking all of them every minute is wasteful, so we check one random tenant per run. Over an hour that's 60 different samples, and a dead database server shows up within a few minutes:

```php
final class TenantDatabaseCheck extends Check
{
    public function run(): Result
    {
        $tenant = Tenant::query()->inRandomOrder()->first();

        if (! $tenant) {
            return Result::make()->ok();
        }

        $result = Result::make()->meta(['tenant' => $tenant->getTenantKey()]);

        try {
            tenancy()->initialize($tenant);
            DB::select('select 1');

            return $result->ok();
        } catch (Throwable $e) {
            return $result->failed("Tenant {$tenant->getTenantKey()} database failed: {$e->getMessage()}");
        } finally {
            tenancy()->end();
        }
    }
}
```

We call `initialize()` and `end()` ourselves instead of `$tenant->run()`. In stancl v3, `run()` doesn't use `finally`, so an exception inside it would leave the process in the tenant's context, and every check after this one would run against the wrong database.

Add a nightly check for missing databases too. stancl's database manager can tell you whether a tenant's database exists, without switching into it:

```php
$missing = Tenant::query()->lazy()
    ->reject(fn (Tenant $tenant) => $tenant->database()->manager()->databaseExists($tenant->database()->getName()))
    ->map->getTenantKey();
```

A tenant row without a database usually means a failed sign-up or a half-finished deletion, as described in [deleting tenants safely](/blog/delete-tenant-laravel-safely.html).

### Queue heartbeat

A stopped queue worker is the most common silent failure in a SaaS. Nothing errors, emails just stop. `DispatchQueueCheckJobsCommand` pushes a tiny job onto each queue you list in `QueueCheck`, the job writes a timestamp to the cache, and the check fails if the timestamp is older than five minutes (change it with `failWhenHealthJobTakesLongerThanMinutes()`). List every queue that has a worker. Tenant jobs share these workers, so one heartbeat per queue covers all tenants. These heartbeat jobs carry no tenant, so stancl's queue bootstrapper runs them in the central context. The [multi-tenant queues](/blog/laravel-multi-tenant-queues.html) post explains why.

### Scheduler heartbeat

`ScheduleCheckHeartbeatCommand` writes a timestamp every minute, and `ScheduleCheck` fails when it's more than a minute old. If your cron line disappears after a server rebuild, this catches it. Set `SCHEDULE_HEARTBEAT_URL` and the command also pings an external heartbeat monitor while the check passes. That covers the case where the whole server is down and can't report anything. Per-tenant scheduled work is a separate concern, covered in [multi-tenant scheduled tasks](/blog/laravel-multi-tenant-scheduled-tasks.html).

### Redis, cache and disk

`RedisCheck` pings the connection, `CacheCheck` writes and reads a value. If you use stancl's cache bootstrapper, the cache store must support tags, so a Redis outage hits every tenant at once. `UsedDiskSpaceCheck` matters more than usual, because tenant uploads, local backups and logs all grow on the same disk.

### Failed jobs

A worker can be running fine while every job for one integration fails. Count recent failures:

```php
final class FailedJobsCheck extends Check
{
    public function run(): Result
    {
        $count = DB::connection(config('queue.failed.database'))
            ->table(config('queue.failed.table'))
            ->where('failed_at', '>=', now()->subHour())
            ->count();

        $result = Result::make()->shortSummary("{$count} in the last hour");

        return match (true) {
            $count >= 25 => $result->failed("{$count} jobs failed in the last hour"),
            $count > 0 => $result->warning("{$count} jobs failed in the last hour"),
            default => $result->ok(),
        };
    }
}
```

The failed jobs table lives on the central connection, and stancl stores a `tenant_id` key in each job's payload, so you can see which tenants were affected before retrying.

### Certificate expiry for custom domains

Your wildcard certificate covers every tenant subdomain, and one check of your own domain covers it. Custom domains are different: each has its own certificate, often issued on demand, and renewal fails silently when a customer moves their DNS somewhere else. Check them once a day:

```php
final class CertificateExpiryCheck extends Check
{
    public function run(): Result
    {
        $ownDomain = parse_url(config('app.url'), PHP_URL_HOST);

        $problems = Domain::query()
            ->where('domain', 'not like', "%.{$ownDomain}")
            ->pluck('domain')
            ->mapWithKeys(fn (string $host) => [$host => $this->daysLeft($host)])
            ->filter(fn (?int $days) => $days === null || $days < 14);

        $result = Result::make()->meta($problems->all());

        return $problems->isEmpty()
            ? $result->ok()
            : $result->warning('Certificates expiring or unreachable: '.$problems->keys()->implode(', '));
    }

    private function daysLeft(string $host): ?int
    {
        $context = stream_context_create(['ssl' => ['capture_peer_cert' => true, 'peer_name' => $host]]);
        $client = @stream_socket_client("ssl://{$host}:443", $code, $message, 5, STREAM_CLIENT_CONNECT, $context);

        if (! $client) {
            return null;
        }

        $certificate = openssl_x509_parse(stream_context_get_params($client)['options']['ssl']['peer_certificate']);

        return (int) floor(($certificate['validTo_time_t'] - time()) / 86400);
    }
}
```

An expired or invalid certificate fails the TLS handshake, so it shows up as unreachable, which is also a problem. We use `warning` here: one customer's domain isn't an outage, but someone should email them. How these certificates are issued is in [custom domains for tenants](/blog/laravel-tenant-custom-domains.html).

## Protect the detailed health endpoint

spatie/laravel-health ships three controllers:

| Controller | Returns | Who can see it |
| --- | --- | --- |
| `SimpleHealthCheckController` | 200 or 503, no details | Public is fine (load balancer, monitor) |
| `HealthCheckJsonResultsController` | Every check with status and meta | Only you |
| `HealthCheckResultsController` | An HTML status page | Only you |

The detailed views show your connection names, tenant IDs, error messages and customer domains. Lock them down:

```php
Route::get('/health', SimpleHealthCheckController::class);

Route::get('/health/details', HealthCheckJsonResultsController::class)
    ->middleware(RequiresSecretToken::class);
```

`RequiresSecretToken` (in `Spatie\Health\Http\Middleware`) checks an `X-Secret-Token` header against `HEALTH_SECRET_TOKEN`. For the HTML page, use your normal `auth` middleware with a super admin permission.

Three multi-tenant details. Register these routes for central domains only, so `/health` on a tenant subdomain is a 404 instead of a page that runs in a tenant's context. Remember that `?fresh` on the simple endpoint runs every check immediately, so add a rate limit if it's public. And keep `/up` as your liveness probe, because it doesn't depend on the scheduler having stored results.

## External uptime monitors

Internal checks can't tell you the server is unreachable. You need at least one monitor outside your infrastructure:

1. **Central `/up`**, every minute. This is your main "is it down" alarm.
2. **A real tenant page**, like the login page of a test tenant you own. It proves tenant identification, the tenant database and asset loading work together. Check for a word on the page, not just status 200.
3. **The simple health endpoint**, so failing internal checks alert even when nobody reads email.
4. **Heartbeat URLs** for the scheduler, as above. A monitor that alerts when a ping *doesn't* arrive.
5. **A custom domain you own**, pointed at your app like a customer's would be.

Most uptime services offer a public status page. Customers check it during an incident instead of opening tickets.

## Alerting that people act on

spatie/laravel-health sends mail and Slack notifications out of the box (Slack needs `laravel/slack-notification-channel`), throttled to one per hour by default with `throttle_notifications_for_minutes`. Set `only_on_failure` to `true` if warnings are too noisy for your on-call channel, and read warnings in a daily review instead.

Keep the levels honest. Failed means someone acts now: central database down, queue stalled, disk at 90%. Warning means someone acts today: one certificate expiring, a few failed jobs. If an alert fires every day and nobody acts, delete it or fix the cause. Then break something on purpose, stop the queue worker for ten minutes, and check that the alert reaches a person.

## Mistakes we see

- **Looping over every tenant in `/up`.** The health check becomes your heaviest endpoint. Sample one tenant on a schedule instead.
- **Tenant checks in liveness probes.** One bad tenant database restarts every container.
- **`$tenant->run()` in health checks.** An exception leaves the process in that tenant. Use `try/finally` with `tenancy()->end()`.
- **Public detailed endpoints.** They leak customer domains and connection details.
- **Results stored in a tenant database.** Keep the health tables and routes central.
- **No external monitor.** If the server is down, it can't email you about it.

## Frequently asked questions

### What does Laravel's /up health check do?

It returns 200 if the app boots and every `DiagnosingHealth` listener runs without an exception, and 500 otherwise. It answers JSON (`{"status":"up"}`) when the request expects it, skips the `web` middleware group, and keeps answering during `php artisan down`. You set its path with `health:` in `bootstrap/app.php`.

### How do I add a custom check to the Laravel health check endpoint?

Listen for `Illuminate\Foundation\Events\DiagnosingHealth` and throw an exception when something is wrong, for example after a failed database query. Keep these checks fast. For slower checks, schedule them with spatie/laravel-health and read the stored results.

### What is the difference between liveness and readiness checks?

Liveness asks whether the process is alive and should be restarted if not. Readiness asks whether it can serve traffic and should be taken out of the load balancer if not. Keep liveness minimal, and put dependency checks like databases and Redis in readiness.

### How do I monitor tenant databases in a multi-tenant Laravel app?

Don't check every tenant on every request. Check one random tenant per minute with a custom check that initializes tenancy, runs `select 1` and ends tenancy in a `finally` block. Add a nightly check that every tenant row still has its database.

## Health checks in the SaaS Laravel kits

The [SaaS Laravel starter kits](/) register Laravel's `/up` route in `bootstrap/app.php`, so you can point a load balancer or uptime monitor at it on day one. They don't include spatie/laravel-health or the custom checks above. The kits initialize tenancy in global middleware, so `/up` on a tenant subdomain runs in that tenant's context, and an unknown subdomain gets a 404. A `central.only` middleware alias is available for routes like `/health/details`. We'd put the custom checks in a small `Modules/Health` module, register them in its service provider, and add the three scheduled commands to `routes/console.php`. The kits' queue setup is described in [Local development](/docs/getting-started/local-development.html#queue-worker), and the [environment reference](/docs/reference/environment.html#production-checklist) has a production checklist.

<BlogPostCta title="A multi-tenant base that's ready to monitor" text="SaaS Laravel gives you stancl/tenancy with central and tenant contexts, tenant-aware queues and the /up route, so health checks slot in as one small module." />
