---
title: "Tenant Maintenance Mode & Suspension"
description: "Put every tenant workspace into maintenance with a bypass link and IP allow list, or suspend a single workspace, while the central app stays online."
head:
  - - link
    - rel: canonical
      href: https://saas-laravel.com/docs/core/maintenance-and-suspension.html
  - - meta
    - property: og:title
      content: "Tenant Maintenance Mode & Suspension"
  - - meta
    - property: og:description
      content: "Put every tenant workspace into maintenance with a bypass link and IP allow list, or suspend a single workspace, while the central app stays online."
  - - meta
    - property: og:url
      content: https://saas-laravel.com/docs/core/maintenance-and-suspension.html
  - - meta
    - name: twitter:title
      content: "Tenant Maintenance Mode & Suspension"
  - - meta
    - name: twitter:description
      content: "Put every tenant workspace into maintenance with a bypass link and IP allow list, or suspend a single workspace, while the central app stays online."
---

# Maintenance & suspension

There are two ways to block access to tenant workspaces while the central app keeps running. Maintenance mode takes every workspace offline while you do planned work. Suspension locks out one tenant.

| | Maintenance mode | Suspension |
| --- | --- | --- |
| Scope | Every tenant workspace | One tenant |
| Set in | Setup → Tenant Settings | Tenant edit form (Workspace status) |
| Page | `auth/Maintenance` (HTTP 503) | `auth/Suspended` (HTTP 403) |
| Still reachable | Login, two-factor, passkey login, logout, bypass link | Logout only |
| Bypass | Secret link, IP/CIDR allow list | None |
| Middleware | `EnsureTenantIsNotInMaintenance` | `EnsureTenantIsNotSuspended` |

Neither one affects the central app.

::: info Laravel's own maintenance mode
Don't confuse this with `php artisan down`. That command takes the whole application offline, central app and tenants included.
:::

## Maintenance mode

You'll find it under Setup → Tenant Settings (`/setup/tenant-settings`). It's central only and needs the `Manage Tenant Maintenance` permission.

| Field | Rules | Purpose |
| --- | --- | --- |
| `enabled` | boolean | Turns maintenance on for every tenant |
| `message` | max 500 chars | Shown on the maintenance page |
| `secret` | 8-64 chars, `alpha_dash` | Enables the bypass link |
| `allowed_ips` | up to 50 IPs or CIDR ranges | These IPs are never blocked |

While maintenance is on, each tenant request is checked like this:

```text
login / two-factor / passkey login / logout / bypass route → allowed
IP in allowed_ips                                          → allowed
valid bypass cookie                                        → allowed
anything else                                              → maintenance page (503)
```

### Bypass link

Your team can keep using a workspace during maintenance through this link:

```text
https://acme.vue.test/maintenance/bypass/{secret}
```

- Sign in to the tenant first. The route needs a signed-in tenant user (`auth:tenant`).
- If the secret is valid, you get the `tenant_maintenance_bypass` cookie for 12 hours and land on `/`.
- The cookie stores an HMAC of the secret keyed with `APP_KEY`. Change the secret and every existing bypass cookie stops working.

### IP allow list

Requests from a listed IP or CIDR range go straight through. The `IpAddressOrCidr` rule validates each entry, and Symfony's `IpUtils::checkIp()` does the matching.

**Related files**

| File | Role |
| --- | --- |
| `Modules/Tenant/Data/MaintenanceModeData.php` | Fields and validation |
| `Modules/Tenant/Services/TenantMaintenanceService.php` | Reads and stores the setting (central `settings` table, key `tenant_maintenance`), bypass and IP checks |
| `Modules/Tenant/Http/Middleware/EnsureTenantIsNotInMaintenance.php` | Blocks requests, lists the open routes |
| `Modules/Tenant/Http/Controllers/TenantMaintenanceBypassController.php` | Sets the bypass cookie |
| `Modules/Tenant/Rules/IpAddressOrCidr.php` | IP / CIDR validation |

## Suspension

To suspend a tenant, open its edit form and set Workspace status to Suspended. You can add a status message as well (max 500 chars).

From then on, every request to that tenant's domains hits `EnsureTenantIsNotSuspended`, which renders `auth/Suspended` with the company name and your message (HTTP 403). `logout` is the only route that still works. To give the tenant access again, set the status back to Active or Trial.

The statuses are listed in [Multi-tenancy → Workspace status](/docs/core/multi-tenancy#workspace-status).
