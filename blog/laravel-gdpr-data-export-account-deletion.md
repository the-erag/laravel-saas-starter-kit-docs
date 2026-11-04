---
title: "Laravel GDPR: Data Export and Account Deletion for a SaaS"
description: "Laravel GDPR for SaaS apps: export a user's data as a ZIP with a queued job and signed URL, delete accounts safely, handle backups, logs, Stripe and tenants."
pageClass: blog-page
date: 2026-11-04
author: annu-gupta
category: security
tags: [GDPR, Privacy, Security]
---

# Laravel GDPR: Data Export and Account Deletion in a Multi-Tenant SaaS

<BlogPostMeta />

Sooner or later a customer emails you: "Send me all the data you hold about me", or "Delete my account". Under the GDPR you have one month to answer. Most Laravel GDPR guides stop at a package README. They skip soft-deleted rows, backups, logs, Stripe, and the question that matters most in B2B: is this even your request to handle?

We build both halves for a Laravel 13 app: a **Laravel GDPR data export** that builds a ZIP in a queued job and hands it over through a short-lived signed URL, and account deletion with a grace period that anonymises or deletes properly. Then we cover the multi-tenant side: controller versus processor, tenant admin versus end-user requests, and exporting a whole tenant.

*This is not legal advice. It's how we approach the engineering. Ask a privacy lawyer about your specific obligations.*

## What GDPR asks of your Laravel app

Three rights in the [GDPR text](https://eur-lex.europa.eu/eli/reg/2016/679/oj) cause almost all of the engineering work:

| Right | Article | What you build |
| --- | --- | --- |
| Right of access | Art. 15 | A copy of the personal data you hold and who you share it with |
| Data portability | Art. 20 | The data the person gave you, in a machine-readable format such as JSON |
| Right to erasure | Art. 17 | Deleting the data when there's no reason left to keep it |

Art. 12 adds two rules. You must reply within one month, extendable by two more for complex requests. And it's free, unless requests are clearly unfounded or excessive, like the same export every day. You may ask for more information when you doubt who is asking; for a logged-in user, a password confirmation is usually enough.

## Controller or processor in a B2B multi-tenant SaaS

Before you write code, work out whose request it is. For your own customers' account data (the company that signed up, the billing contact), you're the **controller**. For the data a customer puts into their workspace (their employees, their clients, their records), the customer is usually the controller and you're the **processor**, acting on their instructions. That changes who answers what:

| Who asks | About what | Who handles it |
| --- | --- | --- |
| Tenant admin | "Export everything in our workspace" or "close our account" | You, as part of your contract with them |
| Tenant admin | "One of our employees wants their data" | The tenant, using tools you provide |
| End user of a tenant | "Delete my data" sent to your support | Forward it to the tenant and help them act on it |
| Your direct customer | Their own billing or account data | You, as controller |

Art. 28(3)(e) says a processor must help the controller answer these requests. So the export and delete features below should also work for a tenant admin acting for their users.

### The data processing agreement and data location

Business customers will ask for a data processing agreement (DPA). Under Art. 28 it covers acting only on their documented instructions, helping with requests, returning or deleting data at the end, and audits. Sub-processors (hosting, email, payments) need their authorisation, so keep a public list.

Expect questions about data location too. With a database per tenant, you can place a tenant's database in a chosen region. Make sure backups and logs follow the same promise.

## Map the personal data first

You can't export or delete what you haven't found. In a database-per-tenant app with Fortify, it usually looks like this:

| Place | Personal data | Easy to miss? |
| --- | --- | --- |
| `users` table | Name, email, password hash, 2FA secrets | No |
| `sessions` table (database driver) | IP address, user agent, `user_id` | Yes |
| `password_reset_tokens` | Email | Yes |
| `notifications` | Whatever you put in the `data` JSON | Yes |
| `passkeys` | Device names, credential IDs | Sometimes |
| `failed_jobs` | Serialized job payloads, often with models and emails | Yes |
| Activity log | Causer, changes, IP addresses | Yes |
| Uploaded files | Avatars, documents | Sometimes |
| Laravel logs and your log tool | Emails, IDs, IPs in messages | Yes |
| Backups | Everything above | Yes |
| Third parties | Stripe, your email provider, error tracking, analytics | Yes |

Most of these tables exist in each tenant database and again in the central one: a user of tenant 42 lives in `tenant42`, not the central `users` table. Keep it current: it's also the start of the record of processing activities that Art. 30 asks many organisations to keep.

## Laravel GDPR data export: a queued job and a signed download

A good export is a ZIP of readable JSON files, one per area of your app. Building it takes a while, so it runs in a queue.

### Step 1: One exporter per area

Each module knows its own data best, so each one provides an exporter that implements a small `PersonalDataExporter` interface with two methods: `fileName()` and `export(User $user): array`.

```php
<?php

namespace Modules\Privacy\Exporters;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Modules\Privacy\Contracts\PersonalDataExporter;

final class ProfileExporter implements PersonalDataExporter
{
    public function fileName(): string
    {
        return 'profile.json';
    }

    public function export(User $user): array
    {
        return [
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'two_factor_enabled' => $user->two_factor_confirmed_at !== null,
            'passkeys' => $user->passkeys()->get(['name', 'created_at'])->toArray(),
            'sessions' => DB::table('sessions')
                ->where('user_id', $user->id)
                ->get(['ip_address', 'user_agent', 'last_activity'])
                ->toArray(),
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }
}
```

The password hash, 2FA secret and recovery codes are left out on purpose. Add a `NotificationsExporter` and others in the same style, then tag them in a service provider (`$this->app->tag([...], 'privacy.exporters')`) and inject the tag with `$this->app->when(PersonalDataExportService::class)->needs('$exporters')->giveTagged('privacy.exporters')`. New modules plug in without touching the service.

### Step 2: A service and a queued job

Each export is tracked in a small `data_exports` table (`user_id`, `status`, `path`, `expires_at`) in the tenant database, next to the user.

```php
<?php

namespace Modules\Privacy\Services;

use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Privacy\Jobs\BuildPersonalDataExport;
use Modules\Privacy\Models\DataExport;
use Modules\Privacy\Notifications\PersonalDataExportReady;
use ZipArchive;

final class PersonalDataExportService
{
    /** @param iterable<\Modules\Privacy\Contracts\PersonalDataExporter> $exporters */
    public function __construct(private iterable $exporters) {}

    public function request(User $user): DataExport
    {
        $export = DataExport::create(['user_id' => $user->id, 'status' => 'pending']);

        BuildPersonalDataExport::dispatch($export);

        return $export;
    }

    public function build(DataExport $export): void
    {
        $user = $export->user;
        $tmp = tempnam(sys_get_temp_dir(), 'export');

        $zip = new ZipArchive();
        $zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        foreach ($this->exporters as $exporter) {
            $zip->addFromString(
                $exporter->fileName(),
                json_encode($exporter->export($user), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            );
        }

        $zip->close();

        $path = 'exports/'.Str::uuid().'.zip';
        Storage::disk('local')->put($path, fopen($tmp, 'r'));
        unlink($tmp);

        $export->update(['status' => 'ready', 'path' => $path, 'expires_at' => now()->addDays(7)]);

        $user->notify(new PersonalDataExportReady($export));
    }
}
```

The `BuildPersonalDataExport` job's `handle()` only calls `$service->build($this->export)`. With stancl/tenancy's `QueueTenancyBootstrapper`, a job dispatched in a tenant request runs in that tenant's context, as explained in [multi-tenant queues](/blog/laravel-multi-tenant-queues.html).

### Step 3: A thin controller and a short-lived download

The controller hands work to the service:

```php
final class DataExportController extends Controller
{
    public function __construct(private PersonalDataExportService $exports) {}

    public function store(Request $request): RedirectResponse
    {
        $this->exports->request($request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Your export is being prepared.')]);

        return back();
    }

    public function download(Request $request, DataExport $export): StreamedResponse
    {
        abort_unless($export->user_id === $request->user()->id, 403);
        abort_if($export->expires_at?->isPast() ?? true, 410);

        return Storage::disk('local')->download($export->path, 'my-data.zip');
    }
}
```

```php
Route::middleware('auth')->group(function () {
    Route::post('settings/privacy/export', [DataExportController::class, 'store'])
        ->middleware('throttle:3,60')
        ->name('privacy.export');

    Route::get('settings/privacy/exports/{export}', [DataExportController::class, 'download'])
        ->middleware('signed')
        ->name('privacy.exports.download');
});
```

On the privacy settings page, build the link with Laravel's [signed URLs](https://laravel.com/docs/13.x/urls#signed-urls), `URL::temporarySignedRoute('privacy.exports.download', now()->addMinutes(15), ['export' => $export])`. The download then needs a valid, unexpired signature, a logged-in user, and that user owning the export. A forwarded link is useless to anyone else.

Build that URL during a request, not in the queued job. A job has no incoming request, so Laravel builds URLs from `APP_URL`, which is the wrong host on a subdomain-based tenant app. That's why the "export ready" notification links to the settings page, not the file.

On S3, `Storage::temporaryUrl($path, now()->addMinutes(15))` gives you a pre-signed link instead (the local disk supports it too when `serve` is on). Schedule a command that deletes exports past `expires_at`: an export is a full copy of someone's personal data.

## Laravel delete user account under GDPR

### Use a grace period

People click "Delete account" by mistake, and attackers sometimes do it on purpose. A short grace period covers both:

1. The user confirms with their password. You set `deletion_scheduled_at` to 14 days ahead, end their other sessions and email a cancel link.
2. A scheduled command erases accounts whose date has passed.

Art. 17 says "without undue delay", so keep the window short and say how long it is.

### Anonymise or force delete

Sometimes you can't drop the row: invoices point at it, or your audit log needs a stable ID. Then you anonymise: keep the row, remove everything that identifies the person.

```php
<?php

namespace Modules\Privacy\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Privacy\Models\DataExport;

final class AccountErasureService
{
    public function erase(User $user): void
    {
        $files = DataExport::where('user_id', $user->id)->pluck('path')->filter()->all();

        DB::transaction(function () use ($user): void {
            DB::table('sessions')->where('user_id', $user->id)->delete();
            DB::table('password_reset_tokens')->where('email', $user->email)->delete();
            $user->notifications()->delete();
            $user->passkeys()->delete();
            DataExport::where('user_id', $user->id)->delete();
            $user->syncRoles([]);

            $this->hasBusinessRecords($user)
                ? $this->anonymise($user)
                : $user->forceDelete();
        });

        Storage::disk('local')->delete($files);
    }

    private function anonymise(User $user): void
    {
        $user->forceFill([
            'name' => 'Deleted user',
            'email' => 'deleted-'.$user->id.'@invalid.example',
            'password' => Str::password(64),
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
            'remember_token' => null,
        ])->save();
    }

    private function hasBusinessRecords(User $user): bool
    {
        return false; // e.g. invoices or signed documents that must be kept
    }
}
```

Use `forceDelete()` even without `SoftDeletes` today: if someone adds the trait later, `delete()` quietly becomes "hide the row", and soft-deleted rows are still personal data. If you need soft deletes for undo, add `MassPrunable` so `php artisan model:prune` removes them after a fixed time. Files go after the transaction, because a file delete can't be rolled back.

### Logs, activity log and failed jobs

- **Laravel logs.** Don't edit log files. Log IDs instead of emails, and keep a short retention period so old entries expire.
- **Activity log.** In an [activity log](/blog/laravel-activity-log.html), delete the user's entries or keep them with the causer anonymised, and run `activitylog:clean` on a schedule.
- **Failed jobs.** `failed_jobs` stores serialized payloads, often with emails. Schedule `php artisan queue:prune-failed --hours=168`.

### Backups

You can't edit one row out of last month's dump. The UK ICO's guidance accepts this as long as the backup data is put "beyond use": nobody uses it, and it disappears when the backup expires on your normal schedule. That needs a fixed backup retention period in your privacy policy, and a list of erased user IDs so you can replay erasures after a restore. Our [multi-database backups post](/blog/laravel-multi-database-backups.html) covers retention and single-tenant restores.

### Third parties like Stripe

Art. 19 expects you to pass erasure on to the recipients you shared data with:

- **Stripe.** Deleting a customer through the API immediately cancels active subscriptions and removes stored card details. Stripe still keeps a record of the deleted customer for its own history. If you bill the tenant, one user's deletion often doesn't touch Stripe at all.
- **Email provider.** Remove the address from marketing lists where the provider allows it.
- **Error tracking and analytics.** Use their deletion APIs, or only send IDs there.

## Retention exceptions: what you may keep

The right to erasure isn't absolute. Two exceptions in Art. 17(3) matter to almost every SaaS: a **legal obligation**, such as tax law requiring you to keep invoices for years, and **legal claims**, such as evidence in a dispute or fraud case. Keep only what the exception needs and tell the user what you kept and why. "We deleted your account; we keep your invoices for the period tax law requires" is an honest answer.

## Exporting a whole tenant

When a business customer leaves, Art. 28(3)(g) says you return or delete their data, as they choose. With a database per tenant, every table belongs to that customer, so a `TenantExportService` can loop over them inside the tenant's context, writing into an open `ZipArchive`:

```php
$tenant->run(function () use ($zip): void {
    foreach (Schema::getTableListing(schemaQualified: false) as $table) {
        if (in_array($table, self::SKIP, true)) { // cache, sessions, jobs, migrations...
            continue;
        }

        $rows = DB::table($table)->get()->map(
            fn (object $row): array => array_diff_key((array) $row, array_flip(self::SECRET_COLUMNS)),
        );

        $zip->addFromString("{$table}.json", $rows->toJson(JSON_PRETTY_PRINT));
    }
});
```

`SECRET_COLUMNS` holds `password`, `remember_token` and the 2FA columns, which never leave the database.

Run it from a queued job, add the tenant's uploaded files, and deliver it like a user export, to tenant admins only. For large tables, write in chunks instead of one `get()`.

The export usually comes right before the tenant is deleted, which has its own traps. We cover them in [how to delete a tenant safely](/blog/delete-tenant-laravel-safely.html).

## Common pitfalls

- **Permanent export links in emails.** They're a leak waiting to be forwarded.
- **Trusting cascades.** Polymorphic tables like `notifications` have no foreign key, so their rows survive a user delete.
- **Forgetting the other databases.** One email can exist centrally and in several tenant databases. Search all of them.
- **Answering requests that aren't yours.** As a processor, deleting an end user's data without the tenant's instruction can break the tenant's own obligations. Forward it.
- **No record of the request.** Log the date, type and completion of each request so you can show you answered on time.

The [Laravel SaaS security checklist](/blog/laravel-saas-security-checklist.html) covers the wider data-exposure basics.

## Frequently asked questions

### Is there a Laravel GDPR package?

Yes, several community packages on Packagist offer export and deletion with grace periods and anonymisation. In a database-per-tenant app, check that the package runs inside each tenant's context and knows all of your tables. The hard part is the data map, not the ZIP file.

### Does soft deleting a user satisfy the right to erasure?

No. A soft-deleted row still holds the name, email and everything else. Use `forceDelete()` or anonymise the row, and prune soft-deleted rows on a schedule.

### Do I have to delete a user's data from backups?

Usually not straight away. The UK ICO accepts that backups can't be edited, as long as the data is put beyond use and expires with the backup. Re-apply the erasure if you restore, and state your retention period in your privacy policy.

### How long do I have to answer a GDPR request?

One month from receiving it. You can extend by two more months for complex or numerous requests if you tell the person why within the first month. A self-service export button answers most access requests in minutes.

## Adding GDPR tools to SaaS Laravel

The [SaaS Laravel starter kits](/) don't include GDPR export tools. Each kit has a "Delete account" action on the profile page that removes the user row straight away. Passkeys and layout settings go with it through foreign keys, but there's no grace period, and rows without a foreign key (database notifications, other sessions) stay. The code above would live in a `Modules/Privacy` module, following the [module-based architecture](/docs/core/architecture.html), and the [notifications](/docs/core/notifications.html) bell can say "your export is ready". Because each tenant has [its own database](/docs/core/multi-tenancy.html), a workspace export is a loop over one database. Put it behind a tenant permission such as "Export Workspace Data" in `config/permissions/tenant/`.

<BlogPostCta title="A clean place for privacy features" text="SaaS Laravel gives you database-per-tenant multi-tenancy, Fortify auth, roles and a modular Laravel 13 backend. GDPR export tools are not included, but each workspace's data already sits in its own database." />
