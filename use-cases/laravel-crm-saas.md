---
title: "Build a CRM SaaS with Laravel"
description: "How to build a multi-tenant CRM SaaS with Laravel: the modules to add, how sales teams map to roles, per-tenant data, deal visibility and a build plan."
breadcrumb: "CRM SaaS with Laravel"
sidebar: false
editLink: false
howTo:
  name: "Build a CRM SaaS on the SaaS Laravel kit"
  steps:
    - name: "Create a test workspace"
      text: "Install the kit, create a tenant from the central app and sign in on its subdomain."
      anchor: "a-build-plan-for-a-crm-saas"
    - name: "Add a CRM module"
      text: "Create Modules/Crm with contacts and companies, tenant migrations, a service and thin controllers."
    - name: "Add permissions and menus"
      text: "Add config/permissions/tenant/crm.php and tenant menu entries, then reseed the tenant permissions."
    - name: "Build deals and the pipeline"
      text: "Add deals with stages stored per tenant, and scope the deal list by owner unless the user may see all deals."
    - name: "Add activities and reminders"
      text: "Log calls and meetings, and send reminders as database notifications through the queue."
    - name: "Add imports and billing"
      text: "Import contacts from CSV in a queued job, then add a payment provider for the tenant."
---

# Build a CRM SaaS with Laravel

This page is for developers who want to sell a CRM to many companies, each with its own sales team and its own customer list. It walks you through the modules to build, how roles map to a sales team, which data lives where, the parts that bite, and a build plan on top of the [SaaS Laravel](/blog/laravel-saas-starter-kit.html) kit.

A CRM is a good fit for a database per tenant. Customer lists are a company's most guarded data, and buyers ask early whether theirs sits next to a competitor's.

## What a CRM SaaS needs on day one

Strip a CRM down and you get four things: people, companies, deals and a history of what happened with each. Everything else, such as email sync, forecasting or automation, builds on those.

Here is the split between what the kit already gives you and what you build:

| Already in the kit | You build |
| --- | --- |
| Workspaces, each with its own database and subdomain | Contacts and companies |
| Sign-in, two-factor, passkeys, password reset | Deals, pipelines and stages |
| Users, invitations, roles and permissions | Activities: calls, meetings, notes, tasks |
| Menus that hide items the user can't open | CSV import and export |
| A notification bell with database notifications | Reports, such as the deal value per stage |
| 17 languages, per-user language | Billing for the workspace |

The kit has no billing, file uploads, email sync or API. Plan for those as your own modules.

## Which modules to add

The kit groups code by feature in `Modules/`. Each module has its own routes, controllers, services and data classes, so a CRM splits cleanly:

- **Crm/Contacts**: people, with email, phone, owner and tags.
- **Crm/Companies**: the organisations those people work for.
- **Crm/Deals**: an amount, a stage, an expected close date and an owner.
- **Crm/Activities**: a timeline of calls, meetings, notes and tasks on any record.
- **Crm/Imports**: CSV upload, column mapping and a queued import job.

You can keep these in one `Modules/Crm` module or split them. We'd start with one module and split when a part grows its own screens and rules. The [architecture docs](/docs/core/architecture.html) show the folder layout every module follows.

## How a sales team maps to tenant roles

Every workspace already has five system roles: Super Admin, Admin, Manager, Employee and User. The person you create the workspace for becomes its Super Admin. For a CRM, they map like this:

| Person in the customer's company | Kit role | What they do |
| --- | --- | --- |
| The owner you created the workspace for | Super Admin | Everything inside the workspace, including billing once you add it |
| Head of sales or office manager | Admin | Users, roles, pipeline stages, imports |
| Sales manager | Manager | Sees every deal on the team, reassigns owners |
| Sales rep | Employee | Works their own contacts and deals |
| Finance or a partner | User, or a custom role | Read-only access to closed deals |

Permissions live in PHP files, one per feature. A CRM gets its own file, and each entry lists which system roles get it by default:

```php
// config/permissions/tenant/crm.php
return [
    ['permission_name' => 'View Deals', 'associated_roles' => ['Super Admin', 'Admin', 'Manager', 'Employee']],
    ['permission_name' => 'View All Deals', 'associated_roles' => ['Super Admin', 'Admin', 'Manager']],
    ['permission_name' => 'Import Contacts', 'associated_roles' => ['Super Admin', 'Admin']],
];
```

The kit gives permissions straight to users, so a manager can give one trusted rep "View All Deals" without inventing a new role. The [roles and permissions docs](/docs/core/users-roles-permissions.html) explain how that works.

## What data is per tenant and what is central

The rule is simple. If a customer would expect it in an export of their account, it goes in their tenant database. If it describes the customer to you, it goes in the central database.

| Tenant database (one per company) | Central database (yours) |
| --- | --- |
| Contacts, companies, deals, stages | The tenant record: company, owner email, status |
| Activities, notes, tasks | Domains, such as `acme.your-crm.com` |
| Import history and mapping presets | Your own staff accounts and roles |
| The company's users, roles and menus | Maintenance settings for all workspaces |
| Notifications for those users | Plans and subscriptions, once you add billing |

New tenant tables go in `database/migrations/tenant`. They run when a workspace is created, and `php artisan tenants:migrate` runs them for workspaces that already exist.

<PricingBlock />

## What is tricky in a CRM SaaS

### Who may see which deal

A permission decides whether someone can open the deals page. It doesn't decide which rows they see. Most sales teams want reps to see only their own deals and managers to see all of them. Put that rule in one place, the service, so a list, an export and a report can't disagree:

```php
public function visibleDeals(User $user): Builder
{
    return Deal::query()
        ->when(! $user->can('View All Deals'), fn (Builder $query) => $query->where('owner_id', $user->id));
}
```

Run every deal query through this method, including the CSV export. An export that skips it is the classic way a rep walks off with the whole pipeline.

### Duplicate contacts

Imports, web forms and manual entry all create people. Without a rule you end up with three "Priya Shah" records. Pick a matching key per tenant, usually the email in lower case, and add a unique index on it in the tenant migration. Then decide what an import does on a match: skip, update or ask.

### Imports that run for minutes

A 20,000-row CSV won't finish inside a web request. Store the file, queue a job and report progress. The kit's queue setup remembers which tenant dispatched a job, so `Contact::create()` inside the job writes to the right database. What the job can't see is the original request, so pass everything it needs, such as the column mapping, as job data.

### Pipelines differ per customer

One agency calls a stage "Proposal sent", another "Quote". Store stages as rows in the tenant database, not as an enum in code. Seed a sensible default pipeline in the tenant seeder so a new workspace isn't empty on day one.

## Reports across all your customers

Each company's numbers are easy, because they sit in one database. Questions about your whole business, such as how many deals were created this month across all workspaces, are harder, because no single SQL query can see every tenant. Loop over tenants in a scheduled command with `tenants:run`, or copy a few counters into a central table. For a CRM, we'd use the central table: it's cheap to read and doesn't wake every database.

## A build plan for a CRM SaaS

<DocSteps>

### 1. Create a test workspace

Install the kit, sign in to the central app and create a tenant called Acme. Sign in on `acme.<your APP_DOMAIN>` as its admin. The [installation guide](/docs/getting-started/installation.html) covers the setup.

### 2. Add contacts and companies

Create `Modules/Crm` with tenant migrations, a `ContactService` and thin controllers. Register its service provider in `bootstrap/providers.php`.

### 3. Add permissions and menus

Add `config/permissions/tenant/crm.php` and entries in the tenant menu seeder. For workspaces that already exist, run only those seeders, for example `php artisan tenants:seed --class="Database\Seeders\PermissionSeeder"`. The full tenant seeder also creates demo users.

### 4. Build deals and the pipeline

Store stages per tenant and add the `visibleDeals()` rule above before you build any list.

### 5. Add activities and reminders

Log calls and meetings on a shared timeline. Send task reminders as database notifications so they show in the bell.

### 6. Add imports, then billing

Queue CSV imports. Then add a payment provider and bill the tenant, not the user. Our [Stripe subscriptions guide](/blog/laravel-saas-stripe-billing.html) shows how.

</DocSteps>

## Starting from an existing CRM script

If you were thinking of turning a CodeCanyon CRM into a SaaS, read [Perfex CRM as a SaaS](/blog/perfex-crm-to-saas.html) first. It covers what the license allows and how to build your own CRM from a feature spec instead. [Convert Worksuite to a multi-tenant SaaS](/blog/convert-worksuite-to-saas.html) covers a script that mixes CRM, HR and projects.

<NextStep
  title="Build your CRM on a workspace foundation"
  text="Tenants, separate databases, sign-in, roles and invitations are already there. You start with contacts and deals."
  secondaryText="See how multi-tenancy works"
  secondaryLink="/docs/core/multi-tenancy.html"
/>
