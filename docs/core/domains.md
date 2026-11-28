---
title: "Tenant Domains & Per-Domain Settings"
description: "Tenant subdomains, primary and secondary domains, and per-domain settings: app name, default language and which authentication features are enabled."
---

# Domains

A request finds its tenant through the domain. A tenant can have one or more domains, all stored in the central `domains` table (`App\Models\Domain`). Each domain also has its own app name, language and auth settings.

<FlowDiagram label="How a host finds its tenant" :nodes="['`acme.vue.test`', { label: '`domains` table', note: 'central database' }, 'tenant 1', { label: 'Per-domain settings', note: 'App name, language, auth features' }]" />

## Domain format

Every domain is a **subdomain of `APP_DOMAIN`**. You type only the subdomain and the kit adds the central domain:

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

The list is paginated, with stats cards at the top. You can search by domain or tenant and filter by primary or secondary. Every change (add, set primary, delete, edit settings or authentication features) needs `Manage Tenant Domains`.

A tenant's detail page has the same actions for that tenant's domains.

| Action | Route |
| --- | --- |
| Add domain | `POST /tenants/domains` |
| Set primary | `PATCH /tenants/domains/{domain}/primary` |
| Delete | `DELETE /tenants/domains/{domain}` |
| Settings (App name, language) | `PUT /tenants/domains/{domain}/settings` |
| Authentication features | `PUT /tenants/domains/{domain}/auth-features` |

## Primary domain

Each tenant has exactly one primary domain. Invitation links and tenant links use it.

- A tenant's first domain is always primary. If you add a domain with primary checked, the flag moves to the new one.
- You **can't delete** the primary domain. Make another domain primary first.

## Per-domain settings

Each domain can override three settings, stored as columns on `domains`. App name and language are validated by `Modules\Tenant\Data\DomainSettingsData`. Auth features have their own request.

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

Pick one of the 17 `LanguageEnum` values, or leave it empty to use the app default. [Localization](/docs/core/localization#how-the-locale-is-resolved) explains how the final locale is picked.

### Authentication features

Registration, password reset, email verification, two-factor and passkeys can each be switched off for a single domain. Details are in [Authentication → Per-domain features](/docs/core/authentication#per-domain-features).

## DNS

Every tenant domain has to resolve to your app.

| Environment | Setup |
| --- | --- |
| Local with Herd | All `*.vue.test` subdomains work automatically once the site is linked |
| Production | A wildcard DNS record (`*.your-domain.com`) plus a wildcard virtual host and TLS certificate |

For the same setup explained step by step with this code, read the [Laravel multi-tenancy tutorial](/guides/laravel-multi-tenancy-tutorial.html).

<RelatedPages :links="[
  { text: 'Multi-tenancy', link: '/docs/core/multi-tenancy#identification', desc: 'How tenancy starts once the domain is found.' },
  { text: 'Authentication', link: '/docs/core/authentication#per-domain-features', desc: 'Turn sign-in features on or off per domain.' },
  { text: 'Localization', link: '/docs/core/localization#how-the-locale-is-resolved', desc: 'How the domain language fits into the locale order.' }
]" />
