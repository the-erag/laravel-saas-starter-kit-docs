---
title: "Livewire Kit Architecture"
description: "How the Livewire kit is organised: backend-only modules with Livewire components, views in resources/views, module registration, permission checks and translations."
---

# Architecture <Badge type="tip" text="Livewire" />

The Livewire kit splits the work in two. Modules in `Modules/` hold PHP only (components, services, Form Requests, routes), and every Blade view lives in `resources/views`. For the shared backend pieces (tenancy, auth, roles), see [Core architecture](/docs/core/architecture).

## Overview

A request goes through a Livewire component in a module and comes out as a Blade view wrapped in a layout:

```text
Route::livewire('users', Index::class)
  → Modules/User/Livewire/Index.php (mount, actions, render)
  → Service / Repository (queries, transactions)
  → view('pages.users.index') → resources/views/pages/users/index.blade.php
  → layouts::app (sidebar or header, picked from the user's layout settings)
```

After the first page load, clicks, form submits and `wire:model` updates go back to the same component over Livewire's own requests. Links use `wire:navigate`, so moving between pages swaps the content without a full reload.

A component stays thin. It validates through a Form Request, checks a permission, calls a service and sets UI state (a toast, a redirect, a modal). Queries and transactions belong in the module's `Services` or `Repositories`.

```php
public function save(UserService $userService): void
{
    $user = $this->userId ? User::query()->findOrFail($this->userId) : null;

    $validated = $this->validateFormRequest(
        UserRequest::class,
        $this->only(['name', 'email', 'role', 'password', 'password_confirmation', 'send_invitation']),
        ['user' => $user],
    );

    $user ? $userService->updateUser($user, $validated) : $userService->createUser($validated);

    Flux::modal('user-form')->close();
    Flux::toast(variant: 'success', text: __('modules/user.toasts.updated'));

    $this->dispatch('user-saved');
}
```

There's more on forms, events and modals in [Livewire](/docs/livewire/livewire).

## Folder map

### Modules (backend only)

| Folder | Purpose |
| --- | --- |
| `Modules/<Module>/Livewire` | Full-page and nested components (class-based) |
| `Modules/<Module>/Livewire/Forms` | Livewire Form objects, e.g. `Tenant/Livewire/Forms/TenantForm.php` |
| `Modules/<Module>/Livewire/Concerns` | Traits shared by the module's components, e.g. `Tenant/Livewire/Concerns/ManagesDomains.php` |
| `Modules/<Module>/Http/Requests` | Form Requests used for every write |
| `Modules/<Module>/Services`, `Repositories` | Business logic, queries and transactions |
| `Modules/<Module>/Enums`, `Notifications`, `Jobs`, `Rules` | The rest of the module's backend code |
| `Modules/<Module>/routes` | `web.php` and, where needed, `tenant.php` |
| `Modules/<Module>/Providers` | One provider per module, extending `App\Providers\ModuleServiceProvider` |

The kit ships these modules: `Auth`, `Dashboard`, `Menu`, `Notification`, `RolePermission`, `Settings`, `Tenant` and `User`.

### Views and assets

| Folder | Purpose |
| --- | --- |
| `resources/views/pages/<area>` | Page views: `auth/`, `notifications/`, `roles/`, `settings/`, `setup/`, `tenants/`, `users/`, plus `dashboard.blade.php` and `home.blade.php` |
| `resources/views/pages/<area>/partials` | Page-only modals and Blade components, e.g. `users/partials/user-form-modal.blade.php` |
| `resources/views/livewire` | Views of shared Livewire widgets: `notification-bell`, `language-switcher`, `delete-account`, `passkeys`, two-factor |
| `resources/views/layouts` | `app`, `auth`, `base`, `settings`, plus `app/` (sidebar, header, partials) and `auth/` (card, simple, split) |
| `resources/views/components/common` | The `x-common.*` UI wrappers around Flux |
| `resources/views/components` | Kit-wide Blade components: `x-page-heading`, `x-table-card`, `x-stat-card`, `x-breadcrumbs`, … |
| `resources/views/errors` | 403, 404, 500 and 503 pages |
| `resources/views/flux` | Published Flux overrides (a few icons and `navlist/group`) |
| `resources/js` | `app.js`, `permission-picker.js`, `passkeys.js` |
| `resources/css/app.css` | Tailwind 4, Flux styles and the theme tokens |

The views mirror the Vue kit's `resources/js/pages`, so `pages/users/index.blade.php` here is `pages/users/Index.vue` there.

### `app/`

| File | Purpose |
| --- | --- |
| `app/Providers/ModuleServiceProvider.php` | Base provider that loads module routes and registers the module's Livewire namespace |
| `app/Providers/AppServiceProvider.php` | Registers the `pages::` Blade namespace, the super admin `Gate::before` and Livewire's persistent middleware |
| `app/Livewire/Concerns/ValidatesFormRequests.php` | `validateFormRequest()` |
| `app/Livewire/Concerns/AuthorizesPermissions.php` | `authorizePermission()` |
| `app/Livewire/Concerns/ThrottlesActions.php` | `throttled()` |

We don't write code comments; that's a project rule in `.ai/rules/general.md`.

## Module registration

Every module has a provider that extends `ModuleServiceProvider`. Its `boot()` does two things:

1. Loads `routes/web.php` and `routes/tenant.php` from the module, if they exist, inside the `web` middleware group.
2. Registers the module's `Livewire` folder as a Livewire namespace named after the module in kebab-case.

```php
protected function registerLivewireComponents(): void
{
    if (is_dir($this->modulePath('Livewire'))) {
        Livewire::addNamespace($this->moduleName(), classNamespace: Str::beforeLast(static::class, '\\Providers\\').'\\Livewire');
    }
}
```

That's why tags carry the module name. `Modules\Tenant\Livewire\EditTenantModal` is `<livewire:tenant::edit-tenant-modal />`, and `Modules\RolePermission\Livewire\RoleFormModal` is `<livewire:role-permission::role-form-modal />`.

Providers are listed in `bootstrap/providers.php`. A provider can still add its own `register()` or `boot()` code. `TenantServiceProvider` binds `TenantAuthFeatureService` as a singleton, and `AuthServiceProvider` points Fortify at the views in `pages/auth`.

::: tip
Most providers are empty classes, e.g. `class DashboardServiceProvider extends ModuleServiceProvider {}`. Routes and components are picked up for you.
:::

## Blade namespaces

| Prefix | Points at | Example |
| --- | --- | --- |
| `x-common.*` | `resources/views/components/common` | `<x-common.button>` |
| `x-*` | `resources/views/components` | `<x-page-heading>` |
| `x-layouts::*` | `resources/views/layouts` (Livewire's default namespace) | `<x-layouts::settings>` |
| `x-pages::*` | `resources/views/pages` (registered in `AppServiceProvider`) | `<x-pages::tenants.partials.status-badge />` |
| `livewire:<module>::*` | `Modules/<Module>/Livewire` | `<livewire:notification::bell />` |

```php
Blade::anonymousComponentPath(resource_path('views/pages'), 'pages');
```

## Data in the layouts

There are no shared props. A component passes its own data to its view from `render()`, and the layouts fetch what they need from services:

| Data | Where it comes from |
| --- | --- |
| Current user | `auth()->user()` |
| Layout settings | `@inject('layoutService', 'Modules\Settings\Services\LayoutService')` in `layouts/app.blade.php` and `layouts/auth.blade.php` |
| Sidebar and header menus | `@inject('menuService', 'Modules\Menu\Services\MenuService')` in `layouts/app/partials/sidebar-menu.blade.php` and `navbar.blade.php` (`getTree()`, `getSetupTree()`) |
| Languages | `<livewire:settings::language-switcher />` in the header |
| Unread notifications | `<livewire:notification::bell />` in the header |

The menu items come back already filtered by permission and marked `active`. How they're built is covered in [Navigation & layouts](/docs/core/navigation-and-layouts).

## Permissions on the frontend

Permissions are checked in three places.

**Route middleware** protects page access, as in every kit:

```php
Route::livewire('users', Index::class)
    ->middleware('permission:View Users|View Tenant Users')
    ->name('users.index');
```

`AppServiceProvider` adds the auth, central-only and permission middleware to Livewire's persistent middleware. Livewire re-applies them on every later request a page makes, so a click on a page you can no longer access fails as well.

**Blade directives** hide buttons the user can't use. Pass both the central and the tenant permission name, so the same check works on every domain:

```blade
@canany(['Create User', 'Create Tenant User'])
    <x-common.button variant="primary" wire:click="$dispatch('open-user-form')">
        {{ __('modules/user.index.add_user') }}
    </x-common.button>
@endcanany
```

**`authorizePermission()`** guards actions that need a different permission from the page itself. It aborts with a 403 unless the user has **any** of the names you pass:

```php
public function confirmDelete(int $userId): void
{
    $this->authorizePermission('Delete User', 'Delete Tenant User');

    $this->deletingUserId = $userId;

    Flux::modal('delete-user')->show();
}
```

Super admins pass every check through `Gate::before` in `AppServiceProvider`.

::: warning
Hiding a button doesn't secure anything, because anyone can call a public component method from the browser. Every action that changes data needs `authorizePermission()` (or a route permission that covers it). See [Users, roles & permissions](/docs/core/users-roles-permissions).
:::

## Translations

Translations are plain Laravel PHP files. Blade and PHP use the same slash keys, and nothing has to be generated:

```text
lang/<locale>/modules/<feature>.php → __('modules/<feature>.<key>')
```

```blade
<x-page-heading :title="__('modules/user.index.title')" :description="__('modules/user.index.description')" />
```

```php
Flux::toast(variant: 'success', text: __('modules/user.toasts.deleted'));
```

Breadcrumbs, page titles, toasts and confirm dialogs all go through `__()`. Language resolution and adding a language are covered in [Localization](/docs/core/localization).

## Related files

- `app/Providers/ModuleServiceProvider.php`: module routes and Livewire namespaces
- `app/Providers/AppServiceProvider.php`: `pages::` namespace, `Gate::before`, persistent middleware
- `app/Livewire/Concerns/*.php`: `validateFormRequest()`, `authorizePermission()`, `throttled()`
- `bootstrap/providers.php`: the list of module providers
- `bootstrap/app.php`: middleware aliases (`auth`, `guest`, `central.only`, `permission`, `role`)
- `resources/views/layouts/app.blade.php`: the app layout every full-page component renders into
- `.ai/rules/livewire.md`: the kit's conventions in one page
