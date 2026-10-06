---
title: "Tenant Domains & Per-Domain Settings"
description: "Tenant subdomains, primary and secondary domains, and per-domain settings: app name, default language and which authentication features are enabled."
---

# Domains

Domains are how a request finds its tenant. A tenant can have one or more, all stored in the central `domains` table (`App\Models\Domain`). Each domain also has its own branding, language and auth settings.

```text
acme.vue.test  → domains table → tenant 1 → per-domain App name, language, auth features
```

## Domain format

Every domain is a **subdomain of `APP_DOMAIN`**. You only type the subdomain, and the kit adds the central domain for you:

```text
input: acme      → stored: acme.vue.test
input: acme-eu   → stored: acme-eu.vue.test
```

| Rule | Value |
| --- | --- |
| Characters | Lowercase letters, digits and single hyphens (`^[a-z0-9]+(?:-[a-z0-9]+)*$`) |
| Length | Max 63 characters |
| Uniqueness | Unique across all tenants (`UniqueTenantDomain` rule) |
| Validated by | `TenantRegisterData` (new tenant), `DomainData` (extra domain) |

::: info Custom top-level domains
`DomainService::createDomain()` always builds `<sub>.APP_DOMAIN`. The kit doesn't handle mapping fully custom domains (e.g. `app.customer.com`).
:::

## Domains page

`/tenants/domains` lists every domain across all tenants. It's central only and needs `View Tenants`.

The list is paginated and comes with stats cards. You can search by domain or tenant and filter by primary or secondary. Adding a domain, setting the primary, deleting, and editing settings or authentication features all need `Manage Tenant Domains`.

You'll find the same actions for a single tenant on its detail page.

| Action | Route |
| --- | --- |
| Add domain | `POST /tenants/domains` |
| Set primary | `PATCH /tenants/domains/{domain}/primary` |
| Delete | `DELETE /tenants/domains/{domain}` |
| Settings (App name, language) | `PUT /tenants/domains/{domain}/settings` |
| Authentication features | `PUT /tenants/domains/{domain}/auth-features` |

## Primary domain

Each tenant has exactly one primary domain, and that's the one invitation links and tenant links use.

- A tenant's first domain is always primary. If you add a domain with primary checked, the flag moves to the new one.
- You **can't delete** the primary domain. Make another domain primary first.

## Per-domain settings

Each domain can override three settings. They're stored as columns on `domains` and validated by `Modules\Tenant\Data\DomainSettingsData` (auth features go through their own request).

| Setting | Column | Effect |
| --- | --- | --- |
| App name | `app_name` (max 100 chars) | Brand shown in the sidebar, auth pages, page titles and emails sent on that domain |
| Default language | `locale` | Default language for users on that domain who have not picked one |
| Authentication features | `auth_features` (JSON) | Turns Fortify features on or off for that domain only |

### App name

When tenancy starts, `App\Listeners\ApplyTenantAppName` sets `config('app.name')` to the first of these that has a value:

```text
domain app_name → tenant company → central APP_NAME
```

### Default language

Pick one of the 17 `LanguageEnum` values, or leave it empty to use the app default. [Localization](/docs/core/localization#how-the-locale-is-resolved) explains how the final locale is chosen.

### Authentication features

Registration, password reset, email verification, two-factor and passkeys can each be switched off for a single domain. Details are in [Authentication → Per-domain features](/docs/core/authentication#per-domain-features).

## Local DNS

Every tenant domain has to resolve to your app.

| Environment | Setup |
| --- | --- |
| Local with Herd | All `*.vue.test` subdomains work automatically once the site is linked |
| Production | A wildcard DNS record (`*.your-domain.com`) plus a wildcard virtual host and TLS certificate |
