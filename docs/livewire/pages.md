---
title: "Livewire Kit Pages & Routes"
description: "Every page in the Livewire kit with its Livewire component, view, route, access rules and purpose, from sign-in and settings pages to tenants, users and setup."
---

# Pages <Badge type="tip" text="Livewire" />

All page views are in `resources/views/pages`, and the component that renders a page is in `Modules/<Module>/Livewire`:

```text
Route::livewire('users', Modules\User\Livewire\Index::class)
  → view('pages.users.index') → resources/views/pages/users/index.blade.php
```

Routes are in each module's `routes/web.php` (and `routes/tenant.php` for tenant-only routes). For how layouts are picked, see [Layouts](/docs/livewire/layouts).

::: info
Routes marked **central** exist only on the central domain (`APP_DOMAIN`, `central.only` middleware). The rest work on both the central domain and tenant domains, which is why their permission names list both variants (for example `View Users|View Tenant Users`).
:::

## Public and auth pages

Fortify registers the auth routes, and `Modules/Auth/Providers/AuthServiceProvider.php` points them at these views. They're plain Blade views with `POST` forms, wrapped in `<x-layouts::auth>`. The invitation pages are Livewire components.

| View | Rendered by | Route | Purpose |
| --- | --- | --- | --- |
| `pages/home.blade.php` | `Dashboard\Livewire\Home` | `GET /` (`home`) | Landing page on the central domain. Tenant domains redirect to `login`. Uses `layouts::base`. |
| `pages/auth/login.blade.php` | Fortify | `GET /login` (`login`) | Email + password login, passkey login, links to reset/register when enabled for the domain |
| `pages/auth/register.blade.php` | Fortify | `GET /register` (`register`) | Registration, when enabled for the domain |
| `pages/auth/forgot-password.blade.php` | Fortify | `GET /forgot-password` (`password.request`) | Request a reset link |
| `pages/auth/reset-password.blade.php` | Fortify | `GET /reset-password/{token}` (`password.reset`) | Set a new password |
| `pages/auth/verify-email.blade.php` | Fortify | `GET /email/verify` (`verification.notice`) | Resend the verification email |
| `pages/auth/confirm-password.blade.php` | Fortify | `GET /user/confirm-password` (`password.confirm`) | Re-enter password (or use a passkey) before sensitive pages |
| `pages/auth/two-factor-challenge.blade.php` | Fortify | `GET /two-factor-challenge` (`two-factor.login`) | TOTP code or recovery code, switched with Alpine |
| `pages/auth/accept-invitation.blade.php` | `Tenant\Livewire\AcceptInvitation` | `GET /invitation/accept` (`tenant.invitation.show`, tenant, guest, signed) | Invited tenant admin sets a password |
| `pages/auth/accept-invitation.blade.php` | `User\Livewire\AcceptInvitation` | `GET /users/invitation/{user}` (`users.invitation.show`, guest, signed) | Invited user sets a password, then is signed in |
| `pages/auth/maintenance.blade.php` | `EnsureTenantIsNotInMaintenance` | Any tenant route while in maintenance | Animated maintenance page with the custom message. Uses `layouts::base`. |
| `pages/auth/suspended.blade.php` | `EnsureTenantIsNotSuspended` | Any tenant route while suspended | Suspended workspace notice with the custom message. Uses `layouts::base`. |

## App pages

App pages render inside `layouts::app`, and you need to pass `auth` + `verified` to reach them.

| View | Component | Route | Permission | Purpose |
| --- | --- | --- | --- | --- |
| `pages/dashboard.blade.php` | `Dashboard\Livewire\Dashboard` | `GET /dashboard` (`dashboard`) | `View Analytics Dashboard\|View Tenant Dashboard` | Dashboard placeholder grid |
| `pages/users/index.blade.php` | `User\Livewire\Index` | `GET /users` (`users.index`) | `View Users\|View Tenant Users` | User list with search, stats, pagination, create/edit/delete, invitations, permission assignment |
| `pages/roles/index.blade.php` | `RolePermission\Livewire\Index` | `GET /roles` (`roles.index`) | `View Roles\|View Tenant Roles` | Role list and create/edit/delete (system roles protected) |
| `pages/notifications/index.blade.php` | `Notification\Livewire\Index` | `GET /notifications` (`notifications.index`) | None | All notifications with a filter, mark as read, delete and clear all. See [Notifications](/docs/core/notifications) |
| `pages/tenants/index.blade.php` | `Tenant\Livewire\Index` | `GET /tenants` (`tenants.index`), central | `View Tenants` | Tenant list with search, status filter and stats |
| `pages/tenants/create.blade.php` | `Tenant\Livewire\Create` | `GET /tenants/create` (`tenants.create`), central | `Create Tenant` | Create a tenant (company, subdomain, admin, profile data, status) |
| `pages/tenants/show.blade.php` | `Tenant\Livewire\Show` | `GET /tenants/{tenant}` (`tenants.show`), central | `View Tenants` | Tenant detail: edit, domains, reset admin password, resend invitation, delete |
| `pages/tenants/domains.blade.php` | `Tenant\Livewire\Domains` | `GET /tenants/domains` (`tenants.domains`), central | `View Tenants` | All domains: filters, search, add, set primary, delete, per-domain settings and auth features |

## Settings pages

Settings views wrap their content in `<x-layouts::settings>`, which adds the Profile / Security / Appearance / Layout sub-navigation. Visiting `GET /settings` sends you to `/settings/profile`.

| View | Component | Route | Purpose |
| --- | --- | --- | --- |
| `pages/settings/profile.blade.php` | `Settings\Livewire\Profile` | `GET /settings/profile` (`profile.edit`), `auth` only | Name, email, language ("Default" follows the domain), email verification notice, delete account |
| `pages/settings/security.blade.php` | `Settings\Livewire\Security` | `GET /settings/security` (`security.edit`), requires password confirmation | Change password, two-factor authentication, passkeys |
| `pages/settings/appearance.blade.php` | `Settings\Livewire\Appearance` | `GET /settings/appearance` (`appearance.edit`) | Light / dark / system, stored by Flux in the browser |
| `pages/settings/layout.blade.php` | `Settings\Livewire\Layout` | `GET /settings/layout` (`layout.edit`) | Personal layout: app layout, sidebar variant, collapsible mode |

## Setup pages

Setup pages use the plain app layout, but the sidebar shows the setup menu for as long as the URL starts with `/setup`. `GET /setup` redirects to `/setup/menus`.

| View | Component | Route | Permission | Purpose |
| --- | --- | --- | --- | --- |
| `pages/setup/menus.blade.php` | `Menu\Livewire\Index` | `GET /setup/menus` (`setup.menus.index`) | `View Navigation Menus\|View Tenant Menus` | Drag and drop menu order (`wire:sort`), reset to defaults |
| `pages/setup/layout.blade.php` | `Settings\Livewire\DefaultLayout` | `GET /setup/layout` (`setup.layout.index`) | `Update Layout Settings\|Update Tenant Layout` | Global default app and auth layout |
| `pages/setup/tenant-settings.blade.php` | `Tenant\Livewire\TenantSettings` | `GET /setup/tenant-settings` (`setup.tenant-settings.edit`), central | `Manage Tenant Maintenance` | Global maintenance mode for tenant workspaces |

## Error pages

| View | Purpose |
| --- | --- |
| `errors/403.blade.php`, `404`, `500`, `503` | Render `x-error-status`, inside `layouts::app` for signed-in users and `layouts::base` for guests |

## Partials

Modals and pieces that belong to one area sit in a `partials/` folder next to its pages. Modals with their own state are Livewire components; the rest are Blade components used as `<x-pages::<area>.partials.<name> />`.

| View | Rendered by | Used by |
| --- | --- | --- |
| `users/partials/user-form-modal.blade.php` | `<livewire:user::user-form-modal />` | Create/edit user, "Send invitation email" |
| `users/partials/assign-permissions-modal.blade.php` | `<livewire:user::assign-permissions-modal />` | Grouped permission checkboxes for one user |
| `roles/partials/role-form-modal.blade.php` | `<livewire:role-permission::role-form-modal />` | Create/edit role |
| `tenants/partials/edit-tenant-modal.blade.php` | `<livewire:tenant::edit-tenant-modal />` | Edit tenant details and status |
| `tenants/partials/reset-password-modal.blade.php` | `<livewire:tenant::reset-password-modal />` | Send a reset link or set the tenant admin password |
| `tenants/partials/domain-form-modal.blade.php` | `<livewire:tenant::domain-form-modal />` | Add a domain |
| `tenants/partials/domain-settings-modal.blade.php` | `<livewire:tenant::domain-settings-modal />` | Per-domain App name and default language |
| `tenants/partials/domain-auth-features-modal.blade.php` | `<livewire:tenant::domain-auth-features-modal />` | Per-domain registration / password reset / verification / 2FA / passkeys toggles |
| `tenants/partials/domain-modals.blade.php` | `<x-pages::tenants.partials.domain-modals />` | Domain delete dialog plus the three domain modals, on tenant detail and Domains |
| `tenants/partials/delete-tenant-modal.blade.php` | `<x-pages::tenants.partials.delete-tenant-modal />` | Delete tenant confirm dialog |
| `tenants/partials/status-badge.blade.php`, `domain-type-badge`, `domain-actions`, `selects`, `detail-card`, `show-*` | Blade components | Tenant pages, see [Components → Area partials](/docs/livewire/components#area-partials) |
| `settings/partials/option-cards.blade.php`, `layout-preview` | Blade components | Settings → Layout and Setup → Layout |
| `notifications/partials/item.blade.php`, `icon`, `empty` | Blade components | Notifications page and the notification bell |

The shared widgets that more than one page uses live in `resources/views/livewire` instead: `delete-account`, `passkeys`, `two-factor-setup-modal`, `two-factor-recovery-codes`, `language-switcher` and `notification-bell`.

::: tip
Want to add your own page? Follow [Development → Adding a page](/docs/livewire/development#adding-a-page).
:::
