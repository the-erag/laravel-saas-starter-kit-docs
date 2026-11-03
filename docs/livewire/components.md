---
title: "Livewire Kit Components (Flux UI)"
description: "The x-common Blade wrappers around Flux, the confirm dialog, modals, icons, toasts, shared Blade components and the app shell in the Livewire kit."
---

# Components <Badge type="tip" text="Livewire" />

## Overview

The components are Blade components in `resources/views/components`, split like this:

| Folder | What it holds |
| --- | --- |
| `components/common/` | The `x-common.*` wrappers: every form control, button, modal, menu, badge and icon |
| `components/` | Kit-wide Blade components (`x-page-heading`, `x-table-card`, `x-stat-card`, `x-breadcrumbs`, …) and app shell pieces (`x-user-menu`, `x-app-header-actions`, `x-app-logo`) |
| `pages/<area>/partials/` | Components that belong to one area, used as `<x-pages::tenants.partials.status-badge />` |
| `views/livewire/` | Views of the shared Livewire widgets (`notification-bell`, `language-switcher`, …) |

Pages and feature components never use Flux tags directly. Every control goes through `x-common.*`, so the rest of the code doesn't know which UI library is underneath.

## Common components

| Component | Wraps | Notes |
| --- | --- | --- |
| `x-common.input` | `flux:input` | Adds the label and the error. Props: `label`, `required`, `optional`, `hint` |
| `x-common.password` | `x-common.input` | `type="password"` with Flux's `viewable` toggle |
| `x-common.textarea` | `flux:textarea` | Same label and error handling as the input |
| `x-common.select` | `flux:select` | Takes `options` (`[['value' => …, 'label' => …]]`) and `placeholder`, or your own options in the slot |
| `x-common.select-option`, `x-common.select-options` | `flux:select.option` | One option, or a loop over an `options` array |
| `x-common.checkbox` | Native checkbox | Styled `<input type="checkbox">` with a check icon, label and error |
| `x-common.radio-group`, `x-common.radio` | `flux:radio.group`, `flux:radio` | |
| `x-common.input-group` | Native input | Input with a `prefix` and/or `suffix` addon, e.g. `https://` … `.example.com` |
| `x-common.label` | Native label | `required` (asterisk), `optional` (translated tag), `hint` |
| `x-common.error` | `flux:error` | Shows the validation message for `name` |
| `x-common.button` | `flux:button` | Flux props pass through: `variant`, `size`, `square`, `icon`, `href`, `loading` |
| `x-common.button-row` | Own markup | Floating Save / Discard bar that appears when the form is dirty |
| `x-common.link` | `flux:link` | |
| `x-common.badge`, `x-common.alert` | `flux:badge`, `flux:callout` | |
| `x-common.heading`, `x-common.text`, `x-common.separator` | `flux:heading`, `flux:text`, `flux:separator` | |
| `x-common.tooltip` | `flux:tooltip` | `content` as a string, or as a named slot for rich content |
| `x-common.modal`, `x-common.modal-trigger`, `x-common.modal-close` | `flux:modal`, `flux:modal.trigger`, `flux:modal.close` | See [Modals](/docs/livewire/livewire#modals) |
| `x-common.confirm-dialog` | `x-common.modal` | Delete confirmation calling a component action |
| `x-common.dropdown`, `x-common.menu`, `x-common.menu-item`, `x-common.menu-separator`, `x-common.menu-radio-group`, `x-common.menu-radio` | `flux:dropdown`, `flux:menu.*` | Used by the user menu, language switcher and notification bell |
| `x-common.otp`, `x-common.otp-group`, `x-common.otp-input` | `flux:otp.*` | Two-factor code input |
| `x-common.form-section` | Own markup | Card with an icon, title, description and step tag (Create tenant) |
| `x-common.icon` | `<iconify-icon>` | See [Icons](#icons) |

The field components (`input`, `textarea`, `select`, `checkbox`) work out three things from `wire:model` (or `name` when there's no `wire:model`):

- the `id`, with dots replaced by underscores, so `wire:model="form.company"` gets `id="form_company"`
- the label's `for`, pointing at that `id`
- the `x-common.error` underneath, reading the error for the same key

So a field with its label and error fits on one line:

```blade
<x-common.input wire:model="email" type="email" :label="__('modules/user.form_modal.email')" autocomplete="email" required />
```

Any other attribute (`autocomplete`, `placeholder`, `class`, `wire:model.live`, `x-model`, `data-test`, …) is passed through to the Flux component.

### Swapping the UI library

Most wrappers are a single line. `button.blade.php`, for example, is just this:

```blade
<flux:button {{ $attributes }}>{{ $slot }}</flux:button>
```

If you want to move to Flux Pro or another library, edit the files in `components/common` and leave the pages alone. Flux is used directly only in the app shell: `layouts/base.blade.php` (toasts), `layouts/app/sidebar.blade.php`, `layouts/app/header.blade.php`, `layouts/app/partials/sidebar-menu.blade.php` and `components/app-logo.blade.php`.

### Button row

`x-common.button-row` uses `wire:dirty`, so it only slides in once a `wire:model` value has changed. With no `save` prop the Save button submits the surrounding form; `discard` names the component method to call.

```blade
<form wire:submit="save" class="space-y-6" novalidate>
    <x-common.input wire:model="name" id="name" :label="__('modules/settings.profile.name')" required />

    <x-common.button-row discard="discard" :message="__('modules/settings.profile.unsaved')" />
</form>
```

### Confirm dialog

`x-common.confirm-dialog` is a modal with a red icon, an optional details list, a warning and a confirm button that calls `action` on the component. The component opens it with `Flux::modal($name)->show()`.

```blade
<x-common.confirm-dialog name="delete-user" action="delete"
    :title="__('modules/user.index.delete_confirm.title')"
    :message="__('modules/user.index.delete_confirm.message', ['name' => $this->deletingUser?->name])"
    :warning="__('modules/user.index.delete_confirm.warning')"
    :details="[
        __('modules/user.index.delete_confirm.email') => $this->deletingUser?->email,
    ]" />
```

Props: `name`, `title`, `action` (required), `message`, `warning`, `details` (label ⇒ value), `confirmText`, `cancelText` and `keyword`. With a `keyword`, the user has to type it before the confirm button enables.

The full flow (pick the record, open the dialog, delete) is in [Livewire → Confirm and delete](/docs/livewire/livewire#confirm-and-delete).

## Icons & toasts

| Need | Use |
| --- | --- |
| Icon in a view | `<x-common.icon name="lucide:users" class="size-4" />` |
| Icon stored in the database (menus) | The same component with the stored name: `<x-common.icon :name="$item['icon']" />` |
| Icon on a Flux button or menu item | Flux's own `icon` prop (Heroicons), e.g. `icon="cog-6-tooth"` on `x-common.menu-item` |
| Toast from a component | `Flux::toast(variant: 'success', text: …)`, see [Livewire → Toasts](/docs/livewire/livewire#toasts) |

### Icons

`x-common.icon` renders the `iconify-icon` web component, which `resources/js/app.js` imports. Pass any Iconify name with a prefix (`lucide:building-2`, `flowbite:users-group-solid`, `logos:laravel`). A name without a prefix is turned into a Lucide name, so `LayoutGrid` becomes `lucide:layout-grid`.

```blade
<x-common.icon name="lucide:building-2" class="size-4" />
```

Menu icons are stored the same way in the `menus` table (`'icon' => 'lucide:layout-grid'` in `MenuSeeder`), so the sidebar renders them with the same component.

## Shared Blade components

| Component | Props | Purpose |
| --- | --- | --- |
| `x-page-heading` | `title`, `description`, `largeActions` | Page title with actions in the slot |
| `x-table-card` | `paginator`, `searchPlaceholder`, `searchLabel`, `showing`, `pageLabel`; `filters` slot | Card with a search box, the table in the slot and pagination |
| `x-search-input` | `placeholder`, `label`, `model` (`'search'`), `compact` | Search box bound with `wire:model.live.debounce.300ms` |
| `x-pagination` | `paginator`, `showing`, `compact` | Page links calling `gotoPage()` |
| `x-filter-tabs` | `tabs`, `active`, `action` | Segmented filter that calls `action('<key>')` |
| `x-stat-card` | `label`, `value`, `icon`, `tone` | Stat tile (`neutral`, `primary`, `success`, `warning`, `danger`, `info`) |
| `x-empty-state` | `icon`, `title`, `description` | Empty table row or list |
| `x-breadcrumbs` | `items` | Breadcrumb trail; links use `wire:navigate` |
| `x-dialog-header`, `x-dialog-footer` | `title`, `description`, `icon` | Header and footer of a modal |
| `x-initials` | `name`, `fallback` | Two-letter initials |
| `x-error-status` | `status` | Body of the 403/404/500/503 pages |
| `x-auth-header`, `x-auth-session-status` | `title`, `description` / `status` | Auth page title and the session status line |
| `x-accept-invitation-form` | `email`, `company`, `passwordRules`, `submitLabel` | Shared by the tenant and user invitation pages |
| `x-passkey-registration`, `x-passkey-verify` | | Passkey enrolment and passkey sign-in (load `resources/js/passkeys.js` with `@assets`) |
| `x-placeholder-pattern` | | Striped placeholder on the dashboard |

A typical list page puts them together like this:

```blade
<x-page-heading :title="__('modules/user.index.title')" :description="__('modules/user.index.description')">
    @canany(['Create User', 'Create Tenant User'])
        <x-common.button variant="primary" wire:click="$dispatch('open-user-form')">
            <x-common.icon name="lucide:plus" class="size-4" />
            <span>{{ __('modules/user.index.add_user') }}</span>
        </x-common.button>
    @endcanany
</x-page-heading>

<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <x-stat-card :label="__('modules/user.index.stats.total')" :value="$stats['total']" icon="lucide:users" />
</div>

<x-table-card :paginator="$users" :search-placeholder="__('modules/user.index.search_placeholder')">
    <table class="w-full text-left text-sm">…</table>
</x-table-card>
```

## Area partials

Blade components used by one area live in `pages/<area>/partials` and are called through the `pages::` namespace:

| Component | Used by |
| --- | --- |
| `x-pages::tenants.partials.status-badge` | Tenant list, tenant detail, domains |
| `x-pages::tenants.partials.domain-type-badge`, `domain-actions` | Domains page and the tenant's domain card |
| `x-pages::tenants.partials.detail-card`, `show-field`, `show-pill`, `show-stat` | Tenant detail page |
| `x-pages::tenants.partials.selects` | Industry, team size, status and work week selects (create and edit) |
| `x-pages::tenants.partials.delete-tenant-modal`, `domain-modals` | Confirm dialogs, plus the domain Livewire modals |
| `x-pages::settings.partials.option-cards`, `layout-preview` | Layout pickers on Settings → Layout and Setup → Layout |
| `x-pages::notifications.partials.item`, `icon`, `empty` | Notifications page and the notification bell |

## App shell components

| Component | Purpose |
| --- | --- |
| `layouts/app/partials/sidebar-menu.blade.php` | Sidebar menu tree (`flux:sidebar.*`), or the setup menu under `/setup` |
| `layouts/app/partials/navbar.blade.php` | Top navigation for the header layout, with Alpine dropdowns |
| `x-app-header-actions` | Language switcher, notification bell and user menu |
| `<livewire:settings::language-switcher />` | Language dropdown; "Default" follows the domain |
| `<livewire:notification::bell />` | Unread count, latest notifications, mark as read. See [Notifications](/docs/core/notifications) |
| `x-user-menu` | User dropdown: settings link and logout |
| `x-app-logo`, `x-app-logo-icon` | Branding (`sidebar` prop for the sidebar brand) |

::: warning
Inside a component tag, use <code v-pre>{{ Js::from($value) }}</code> instead of `@js($value)`. Blade doesn't compile directives inside component attributes, so `@js()` would reach the browser as plain text.
:::

```blade
<x-common.checkbox id="{{ $permissionId }}"
    x-bind:checked="has({{ Js::from($permission['name']) }})"
    x-on:change="toggle({{ Js::from($permission['name']) }})" />
```
