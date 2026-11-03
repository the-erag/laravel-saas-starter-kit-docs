---
title: "Livewire Kit Layouts"
description: "How the Livewire kit picks app and sign-in layouts from Setup defaults and user settings, the sidebar and header shells, the settings layout and per-page titles and breadcrumbs."
---

# Layouts <Badge type="tip" text="Livewire" />

The layouts are anonymous Blade components in `resources/views/layouts`, used with the `layouts::` prefix. `layouts/app.blade.php` and `layouts/auth.blade.php` each decide at render time which design to show, from the layout settings.

## Layout selection flow

```text
1. A full-page component renders into layouts::app (Livewire's default)
     ->layout('layouts::auth', [...])  → invitation pages
     ->layout('layouts::base')         → landing page
2. Auth pages rendered by Fortify wrap themselves in <x-layouts::auth>
3. Settings pages wrap their content in <x-layouts::settings> inside layouts::app
4. The wrapper asks LayoutService::getLayoutSettings(auth()->user())
     layouts::app  → app_layout  → sidebar | header
     layouts::auth → auth_layout → card | simple | split
```

The settings come from these sources:

| Setting | Source |
| --- | --- |
| Global default | Setup → Layout (row with no user) |
| `app_layout`, `sidebar_variant`, `sidebar_collapsible` | The user's own Settings → Layout if they've saved one, otherwise the global default |
| `auth_layout` | Always the global default |

The backend side is explained in [Navigation & layouts](/docs/core/navigation-and-layouts).

## Base layout

`layouts/base.blade.php` is the HTML document every other layout builds on. It includes `partials/head.blade.php` (meta tags, `@vite`, fonts, `@fluxAppearance`), renders the slot, mounts the Flux toast group inside `@persist('toast')` and loads `@fluxScripts`.

The browser title is built in `partials/head.blade.php` as `"<title> - <app name>"`, or just the app name when there's no title.

## App layouts

`layouts/app.blade.php` takes `title` and `breadcrumbs`, wraps itself in `layouts::base` and renders one of two shells:

| `app_layout` | View | Structure |
| --- | --- | --- |
| `sidebar` (default) | `layouts/app/sidebar.blade.php` | `flux:sidebar` with the menu, top bar with breadcrumbs and header actions, then the content |
| `header` | `layouts/app/header.blade.php` | Top bar with logo, `navbar` menu and header actions; the sidebar appears only on small screens |

::: details View layouts/app.blade.php
```blade
@props(['title' => null, 'breadcrumbs' => []])

@inject('layoutService', 'Modules\Settings\Services\LayoutService')

@php
    $layout = $layoutService->getLayoutSettings(auth()->user());
@endphp

<x-layouts::base :title="$title" @class([...])>
    @if ($layout['app_layout'] === 'header')
        <x-layouts::app.header>
            {{ $slot }}
        </x-layouts::app.header>
    @else
        <x-layouts::app.sidebar :breadcrumbs="$breadcrumbs" :variant="$layout['sidebar_variant']" :collapsible="$layout['sidebar_collapsible']">
            {{ $slot }}
        </x-layouts::app.sidebar>
    @endif
</x-layouts::base>
```
:::

The sidebar shell looks at two extra settings:

| Setting | Values | Default |
| --- | --- | --- |
| `sidebar_variant` | `inset`, `sidebar`, `floating` | `inset` |
| `sidebar_collapsible` | `icon`, `offcanvas`, `none` | `icon` |

`icon` makes the Flux sidebar collapsible on desktop. The other two values keep it collapsible on mobile only.

Both shells share their pieces:

| Partial | Used by | Purpose |
| --- | --- | --- |
| `layouts/app/partials/sidebar-menu.blade.php` | Sidebar shell, mobile sidebar of the header shell | `menuService->getTree()`, or the setup menu with a "Back to app" link while the URL is under `/setup` |
| `layouts/app/partials/navbar.blade.php` | Header shell | Top-level menu items with Alpine dropdowns for children |
| `x-app-header-actions` | Both | Language switcher, notification bell, user menu |

::: tip
The header shell doesn't render breadcrumbs; only the sidebar shell passes them to `x-breadcrumbs`. If you add something app-wide, like a banner, put it in both `sidebar.blade.php` and `header.blade.php`, or it disappears when someone switches layout.
:::

## Page title and breadcrumbs

A full-page component sets both in `render()`. Breadcrumb titles are already translated strings, and `href` is a full URL:

```php
return view('pages.tenants.index', [...])
    ->title(__('modules/tenant.index.page_title'))
    ->layoutData(['breadcrumbs' => [
        ['title' => __('modules/tenant.breadcrumbs.dashboard'), 'href' => route('dashboard')],
        ['title' => __('modules/tenant.breadcrumbs.all_tenants'), 'href' => route('tenants.index')],
    ]]);
```

| Goal | Call | Used by |
| --- | --- | --- |
| Title and breadcrumbs on an app page | `->title(...)->layoutData(['breadcrumbs' => [...]])` | Most app pages |
| Auth layout with a heading | `->layout('layouts::auth', ['title' => ..., 'description' => ..., 'pageTitle' => ...])` | Tenant and user invitation pages |
| No app shell (full screen) | `->layout('layouts::base')->title(...)` | Landing page (`Home`) |

## Auth layouts

`layouts/auth.blade.php` takes `title`, `description` and `pageTitle` (the browser title, falling back to `title`). It renders one of three designs:

| `auth_layout` | View | Look |
| --- | --- | --- |
| `card` (default) | `layouts/auth/card.blade.php` | Logo above a centred card on a muted background |
| `simple` | `layouts/auth/simple.blade.php` | Logo, title and form on a plain background |
| `split` | `layouts/auth/split.blade.php` | Dark left panel with logo and app name, form on the right |

The Fortify pages in `pages/auth` wrap themselves in it:

```blade
<x-layouts::auth :title="__('modules/auth.login.title')" :description="__('modules/auth.login.description')"
    :page-title="__('modules/auth.login.page_title')">
    ...
</x-layouts::auth>
```

The maintenance and suspended pages use `<x-layouts::base>` directly, without any auth chrome.

## Settings layout

Settings pages render into the normal app layout and wrap their content in `<x-layouts::settings>`. That adds the page heading and the Profile / Security / Appearance / Layout sub-navigation, highlighted with `request()->routeIs()`:

```blade
<x-layouts::settings>
    <h1 class="sr-only">{{ __('modules/settings.profile.page_title') }}</h1>

    <form wire:submit="save" class="space-y-6" novalidate>
        ...
    </form>

    <livewire:settings::delete-account />
</x-layouts::settings>
```

The navigation items are defined at the top of `layouts/settings.blade.php`. To add a settings page, add an entry there with its route name and title.

## Error pages

`resources/views/errors/403.blade.php`, `404`, `500` and `503` render `<x-error-status :status="…" />`. That component picks the layout per request: `layouts::app` for signed-in users and `layouts::base` for guests.
