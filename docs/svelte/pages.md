---
title: "Svelte Kit Pages & Routes"
description: "Every Inertia page in the Svelte kit with its route, access rules, layout and purpose, from sign-in and settings pages to tenants, users and setup."
---

# Pages <Badge type="tip" text="Svelte" />

Every Inertia page in the Svelte kit, with its route, permission and purpose. Pages are in `resources/js/pages`, and the Inertia page name is the file path without `.svelte`:

<FlowDiagram label="Page name to file" :nodes="['`Inertia::render(\'users/Index\')`', '`resources/js/pages/users/Index.svelte`']" />

The controllers that render them are in `Modules/<Module>/Http/Controllers`.

<FeatureCards :cols="3" :items="[
  { title: 'Public and auth', text: 'Home, sign-in, registration, 2FA, invitations, maintenance.', link: '/docs/svelte/pages#public-and-auth-pages' },
  { title: 'App', text: 'Dashboard, users, roles, notifications, tenants.', link: '/docs/svelte/pages#app-pages' },
  { title: 'Settings', text: 'Profile, security, appearance, layout.', link: '/docs/svelte/pages#settings-pages' },
  { title: 'Setup', text: 'Menus, global layout, tenant maintenance.', link: '/docs/svelte/pages#setup-pages' },
  { title: 'Error', text: '403, 404, 500 and 503 responses.', link: '/docs/svelte/pages#error-page' },
  { title: 'Partials', text: 'Modals and sections used by a single page.', link: '/docs/svelte/pages#partials' },
]" />

::: info
Routes marked **central** exist only on the central domain (`APP_DOMAIN`, `central.only` middleware). The rest work on both central and tenant domains, so their permissions list both names (for example `View Users|View Tenant Users`).
:::

## Public and auth pages

Auth pages render inside `AuthLayout` (card, simple or split design). Fortify registers the auth routes, and `Modules/Auth/Providers/AuthServiceProvider.php` connects them to the pages below.

| Page file | Route | Purpose |
| --- | --- | --- |
| `Home.svelte` | `GET /` (`home`) | Landing page on the central domain. Tenant domains redirect to `login`. No layout. |
| `auth/Login.svelte` | `GET /login` (`login`) | Email + password login, passkey login, links to reset/register when enabled for the domain |
| `auth/Register.svelte` | `GET /register` (`register`) | Registration, when enabled for the domain |
| `auth/ForgotPassword.svelte` | `GET /forgot-password` (`password.request`) | Request a reset link |
| `auth/ResetPassword.svelte` | `GET /reset-password/{token}` (`password.reset`) | Set a new password |
| `auth/VerifyEmail.svelte` | `GET /email/verify` (`verification.notice`) | Resend the verification email |
| `auth/ConfirmPassword.svelte` | `GET /user/confirm-password` (`password.confirm`) | Re-enter password before sensitive pages |
| `auth/TwoFactorChallenge.svelte` | `GET /two-factor-challenge` (`two-factor.login`) | TOTP code or recovery code; switches the layout title with `setLayoutProps` |
| `auth/AcceptInvitation.svelte` | `GET /invitation/accept` (`tenant.invitation.show`, tenant, signed) and `GET /users/invitation/{user}` (`users.invitation.show`, signed) | Invited tenant admin or user sets a password. `mode` prop: `'workspace'` or `'user'` |
| `auth/Maintenance.svelte` | Rendered by `EnsureTenantIsNotInMaintenance` on tenant domains | Animated maintenance page with the custom message. No layout. |
| `auth/Suspended.svelte` | Rendered by `EnsureTenantIsNotSuspended` on tenant domains | Suspended workspace notice with the custom message. No layout. |

## App pages

These pages render inside `AppLayout` and need `auth` + `verified`.

| Page file | Route | Permission | Purpose |
| --- | --- | --- | --- |
| `Dashboard.svelte` | `GET /dashboard` (`dashboard`, `Route::inertia`) | `View Analytics Dashboard\|View Tenant Dashboard` | Dashboard placeholder grid |
| `users/Index.svelte` | `GET /users` (`users.index`) | `View Users\|View Tenant Users` | User list with search, stats, pagination, create/edit/delete, invitations, permission assignment |
| `roles/Index.svelte` | `GET /roles` (`roles.index`) | `View Roles\|View Tenant Roles` | Role list and create/edit/delete (system roles protected) |
| `notifications/Index.svelte` | `GET /notifications` (`notifications.index`) | None | All notifications with a filter, mark as read, delete and clear all. See [Notifications](/docs/core/notifications) |
| `tenants/Index.svelte` | `GET /tenants` (`tenants.index`), central | `View Tenants` | Tenant list with search, status filter and stats |
| `tenants/Create.svelte` | `GET /tenants/create` (`tenants.create`), central | `Create Tenant` | Create a tenant (company, subdomain, admin, profile data, status) |
| `tenants/Show.svelte` | `GET /tenants/{tenant}` (`tenants.show`), central | `View Tenants` | Tenant detail: edit, domains, reset admin password, resend invitation, delete |
| `tenants/Domains.svelte` | `GET /tenants/domains` (`tenants.domains`), central | `View Tenants` | All domains: filters, search, add, set primary, delete, per-domain settings and auth features |

## Settings pages

Pages under `settings/*` render inside `AppLayout` plus `layouts/settings/Layout.svelte`, which adds the Profile / Security / Appearance / Layout sub-navigation. `GET /settings` redirects to `/settings/profile`.

| Page file | Route | Purpose |
| --- | --- | --- |
| `settings/Profile.svelte` | `GET /settings/profile` (`profile.edit`) | Name, email, language ("Default" follows the domain), email verification notice, delete account |
| `settings/Security.svelte` | `GET /settings/security` (`security.edit`), requires password confirmation | Change password, two-factor authentication, passkeys |
| `settings/Appearance.svelte` | `GET /settings/appearance` (`appearance.edit`, `Route::inertia`) | Light / dark / system |
| `settings/Layout.svelte` | `GET /settings/layout` (`layout.edit`) | Personal layout: app layout, sidebar variant, collapsible mode |

## Setup pages

The `setup/*` pages use the plain `AppLayout`. While the URL starts with `/setup`, the sidebar shows `setupMenus` instead of the usual menu. `GET /setup` redirects to `/setup/menus`.

| Page file | Route | Permission | Purpose |
| --- | --- | --- | --- |
| `setup/Menus.svelte` | `GET /setup/menus` (`setup.menus.index`) | `View Navigation Menus\|View Tenant Menus` | Drag & drop menu order (`sortablejs`), reset to defaults |
| `setup/Layout.svelte` | `GET /setup/layout` (`setup.layout.index`) | `Update Layout Settings\|Update Tenant Layout` | Global default app and auth layout |
| `setup/TenantSettings.svelte` | `GET /setup/tenant-settings` (`setup.tenant-settings.edit`), central | `Manage Tenant Maintenance` | Global maintenance mode for tenant workspaces |

## Error page

| Page file | Rendered by | Purpose |
| --- | --- | --- |
| `errors/Error.svelte` | Exception handler in `bootstrap/app.php` | 403, 404, 500 and 503 responses. Uses `AppLayout` for signed-in users and `AuthLayout` for guests. |

In the `local` and `testing` environments, only a 403 uses this page. Other statuses show Laravel's debug page so you can see what went wrong.

## Partials

Modals and sections used by a single page sit in a `Partials/` folder next to it:

| File | Used by |
| --- | --- |
| `users/Partials/UserFormModal.svelte` | Create/edit user, "Send invitation email" |
| `users/Partials/AssignUserPermissionsModal.svelte` | Grouped permission checkboxes for one user |
| `roles/Partials/RoleFormModal.svelte` | Create/edit role |
| `tenants/Partials/EditTenantModal.svelte` | Edit tenant details and status |
| `tenants/Partials/OrganizationDomains.svelte` | Domains card on the tenant detail page |
| `tenants/Partials/DomainModal.svelte` | Add a domain |
| `tenants/Partials/DomainSettingsModal.svelte` | Per-domain App name and default language |
| `tenants/Partials/DomainAuthFeaturesModal.svelte` | Per-domain registration / password reset / verification / 2FA / passkeys toggles |
| `tenants/Partials/ResetPasswordModal.svelte` | Send a reset link or set the tenant admin password |
| `tenants/Partials/MaintenanceModeForm.svelte` | Maintenance message, secret bypass link, allowed IPs |

::: tip
Building a new page? The steps are in [Development → Adding a page](/docs/svelte/development#adding-a-page).
:::

<RelatedPages :links="[
  { text: 'Development', link: '/docs/svelte/development#adding-a-page', desc: 'Add your own page, from route to test.' },
  { text: 'Layouts', link: '/docs/svelte/layouts', desc: 'How each page gets its layout.' },
  { text: 'Users, roles & permissions', link: '/docs/core/users-roles-permissions', desc: 'The permissions listed in these tables.' },
]" />
