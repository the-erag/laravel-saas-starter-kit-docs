---
title: "Vue Kit Components (shadcn-vue)"
description: "Common form components, the confirm dialog, shadcn-vue primitives, icons, toasts and app shell components in the Vue kit, with a small usage example."
---

# Components <Badge type="tip" text="Vue" />

Look here before you build a new component: the kit probably has one for the job already.

## Overview

The components live in `resources/js/components`, in three groups:

<FeatureCards :cols="3" :items="[
  { title: 'components/common/', text: 'The kit’s own form kit: `Common*` inputs, buttons, tooltip, icon and `ConfirmDialog`.', link: '/docs/vue/components#common-form-components' },
  { title: 'components/ui/', text: 'shadcn-vue primitives built on reka-ui.', link: '/docs/vue/components#ui-primitives-shadcn' },
  { title: 'components/', text: 'App shell and feature components (`AppSidebar`, `AppHeader`, `UserMenuContent`, …).', link: '/docs/vue/components#app-shell-components' },
]" />

Start with the `Common*` components. They handle the label, `id`, `aria-*` attributes and error message for you, so most fields fit on one line.

<DocShot name="vue-profile" alt="The Profile settings page in the Vue kit: name and email inputs with required markers, a display language select and the delete account section" caption="Settings → Profile is built from CommonInput, CommonSelect and CommonButtonRow." />

::: tip
If a component is only used by one page, put it in a `Partials/` folder next to that page (for example `pages/tenants/Partials/DomainModal.vue`) rather than in `components/`.
:::

## Common form components

| Component | Purpose |
| --- | --- |
| `CommonInput` | Text-like input (`type` defaults to `text`) |
| `CommonPassword` | Password input with a show/hide toggle. Exposes `focus()` via a template ref |
| `CommonTextarea` | Textarea with `rows` (default `3`) and `maxlength` |
| `CommonSelect` | shadcn-vue `Select` with a label. Takes `options: SelectOption[]` and exports the `SelectOption` type |
| `CommonRadio` | reka-ui radio group. Takes `options: SelectOption[]` |
| `CommonCheckbox` | Checkbox with a boolean `v-model` and optional `value` |
| `CommonLabel` | Label with `required` (asterisk), `optional` (translated tag) and `hint` |
| `CommonError` | Renders `message` in a `role="alert"` paragraph, nothing when empty |
| `CommonButton` | Button with a `loading` state (disabled + spinner) |
| `CommonButtonRow` | Save / Discard bar for settings forms, shown when the form is dirty |
| `CommonTooltip` | Wraps its slot in a tooltip (`content`, `side`) |
| `ConfirmDialog` | Global confirm dialog, opened with `useConfirmDialog()` |

The input components all work the same way:

- Each one takes `name`, `id`, `label`, `error`, `required` and `disabled`.
- If you leave out `id`, one is generated for you.
- Any other attribute (`autofocus`, `class`, `data-test`, …) is passed to the underlying element.
- In an Inertia `<Form>`, `name` and `error` are all you need. Prefill a field with `:default-value`.
- Outside a `<Form>`, bind the value with `v-model`.

::: details View props reference
| Component | Props |
| --- | --- |
| `CommonInput` | `type` (`'text'`), `name`, `id`, `label`, `placeholder`, `autocomplete`, `disabled`, `required`, `readonly`, `error`, `v-model: string \| number` |
| `CommonPassword` | Same as `CommonInput` without `type`; `v-model: string` |
| `CommonTextarea` | Input props plus `rows` (`3`) and `maxlength`; `v-model: string` |
| `CommonSelect` | `options` (required, `{ label, value, disabled? }[]`), `placeholder` (translated "Select an option"), `name`, `id`, `label`, `disabled`, `required`, `error`, `v-model: string \| number` |
| `CommonRadio` | `options` (required), `name`, `id`, `label`, `disabled`, `required`, `error`, `v-model` |
| `CommonCheckbox` | `name`, `id`, `label`, `value`, `disabled`, `required`, `error`, `v-model: boolean` |
| `CommonLabel` | `for`, `label`, `required`, `optional`, `hint`, `disabled`, `class`; content from the default slot or `label` |
| `CommonError` | `message` |
| `CommonButton` | `type` (`'button'`), `variant` (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`), `size` (`default`, `sm`, `lg`, `icon`, `icon-sm`, `icon-lg`), `disabled`, `loading` |
| `CommonButtonRow` | `isDirty`, `processing` (`false`), `position` (`'bottom-pop'`, `'top-pop'`, `'inline'`, `'sticky-bottom'`), `saveVariant` (`'default'`), `discardVariant` (`'outline'`), `saveText`, `discardText`, `message` (translated defaults), `showDiscard` (`true`), `alwaysVisible`, `saveDisabled` (`false`). Events: `save`, `discard` |
| `CommonTooltip` | `content`, `side` (`'top'`), `delayDuration` (`200`), `disabled`, `contentClass`; `content` slot for rich content |
:::

### CommonButtonRow

In the default `bottom-pop` position, the bar only slides in once `isDirty` is true. Save calls `requestSubmit()` on the nearest `<form>`, so inside a `<Form>` there's nothing to wire up.

```vue
<Form v-bind="ProfileController.update.form()" set-defaults-on-success
      v-slot="{ errors, processing, isDirty, reset }">
    <CommonInput id="name" name="name" :default-value="user.name" :error="errors.name" />
    <CommonButtonRow :is-dirty="isDirty" :processing="processing" @discard="reset()" />
</Form>
```

### Confirm dialog

The app layouts mount `ConfirmDialog` once. From any page, call `confirm()` from `useConfirmDialog()` and await the `Promise<boolean>` it returns.

```ts
const { confirm } = useConfirmDialog();

if (await confirm({ title, message, confirmVariant: 'destructive' })) {
    router.delete(destroy.url(user.id), { preserveScroll: true });
}
```

Other options, all optional: `warning`, `itemDetails`, `confirmText`, `icon` (`danger`, `warning`, `info`, `question`, `success`), `size` (`sm` to `xl`), `warningVariant`, `highlight`, `confirmationKeyword` (the user has to type it before the button enables), `closeOnBackdrop`, `closeOnEscape` and `showCancelButton`. Call `setLoading(true)` to put a spinner on the confirm button.

::: warning
Only `AppSidebarLayout` and `AppHeaderLayout` mount `ConfirmDialog`. On pages that use `AuthLayout`, or no layout at all, `confirm()` won't work.
:::

::: details View full example (delete user)
```ts
import { useConfirmDialog } from '@/composables/useConfirmDialog';

const { confirm } = useConfirmDialog();

const isConfirmed = await confirm({
    title: __('modules.user.index.delete_confirm.title'),
    message: __('modules.user.index.delete_confirm.message', { name: user.name }),
    warning: __('modules.user.index.delete_confirm.warning'),
    itemDetails: [{ label: __('modules.user.index.delete_confirm.email'), value: user.email, code: true }],
    confirmText: __('modules.user.index.delete_confirm.confirm'),
    confirmVariant: 'destructive',
});

if (isConfirmed) {
    router.delete(destroy.url(user.id), { preserveScroll: true });
}
```
:::

## UI primitives (shadcn)

The shadcn-vue components are in `components/ui/<name>/`, in the new-york-v4 style set in `components.json`. Every folder has an `index.ts`. Use them directly for things the `Common*` wrappers don't cover, like cards, badges and dialogs. For form fields, use the `Common*` wrappers.

These are included: `alert`, `avatar`, `badge`, `breadcrumb`, `button`, `card`, `checkbox`, `collapsible`, `dialog`, `dropdown-menu`, `input`, `input-otp`, `label`, `navigation-menu`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `sonner`, `spinner`, `tooltip`.

```ts
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
```

## Icons & toasts

| Need | Use |
| --- | --- |
| Icon in a template | `@lucide/vue` components, e.g. `import { Plus } from '@lucide/vue'` |
| Icon stored as a string (menus in the database) | `CommonIcon` (Iconify) |
| Toast from the server | `Inertia::flash('toast', …)`, see [Inertia → Flash toasts](/docs/vue/inertia#flash-toasts) |
| Toast from the client | `import { toast } from 'vue-sonner'` |

`CommonIcon` renders Iconify icons and takes `icon`, `class` and `click`. A name with a prefix (`lucide:…`) is used unchanged. A PascalCase name becomes a Lucide icon (`LayoutGrid` → `lucide:layout-grid`).

```vue
<CommonIcon icon="lucide:building-2" class="size-4" />
```

::: warning
Only `AppSidebarLayout` and `AppHeaderLayout` mount the `Toaster`, so toasts don't show on auth pages or on pages without a layout.
:::

## Usage example

A typical field, an icon button with a tooltip, and a submit button:

```vue
<CommonInput name="email" type="email" :label="__('modules.auth.common.email_address')"
             required autocomplete="email" :error="errors.email" />

<CommonTooltip :content="__('modules.user.index.actions.edit')">
    <CommonButton variant="outline" size="icon-sm" @click="openEditModal(user)">
        <Edit3 class="size-4" />
    </CommonButton>
</CommonTooltip>

<CommonButton type="submit" :loading="processing">{{ __('modules.auth.login.submit') }}</CommonButton>
```

::: details View more examples
```vue
<script setup lang="ts">
import CommonSelect from '@/components/common/CommonSelect.vue';
import type { SelectOption } from '@/components/common/CommonSelect.vue';

defineProps<{ roleOptions: SelectOption[] }>();
</script>

<template>
    <CommonSelect id="role" name="role" :label="__('modules.user.form_modal.role')"
                  :options="roleOptions" :error="errors.role" />

    <CommonTextarea id="maintenance_message" name="message"
                    :model-value="maintenance.message ?? ''"
                    :label="__('modules.maintenance.form.message')"
                    :rows="3" :maxlength="500" :error="errors.message" />

    <CommonPassword id="password" name="password" required
                    autocomplete="current-password" :error="errors.password" />

    <CommonCheckbox id="remember" name="remember" :label="__('modules.auth.login.remember_me')" />

    <CommonRadio v-model="resetMethod" name="reset_method" :options="methodOptions" />

    <CommonLabel for="password" required>{{ __('modules.auth.common.password') }}</CommonLabel>
    <CommonError :message="errors.code" />
</template>
```
:::

## App shell components

| Component | Purpose |
| --- | --- |
| `AppShell`, `AppContent` | Wrap the sidebar provider and main content (`variant: 'sidebar' \| 'header'`) |
| `AppSidebar` | Sidebar with `NavMain` (from `menus`) or the setup menu (`setupMenus` on `/setup/*`) |
| `AppSidebarHeader` | Top bar of the sidebar layout with the trigger and `Breadcrumbs` |
| `AppHeader` | Top navigation for the header layout (menus, breadcrumbs, user menu) |
| `NavMain`, `NavFooter` | Sidebar menu tree, footer links |
| `AppHeaderActions`, `NotificationBell`, `LanguageSwitcher`, `UserMenuButton` | Header actions next to the breadcrumbs: notification bell, language switcher and profile menu. See [Notifications](/docs/core/notifications) |
| `UserMenuContent` | User dropdown: settings link, language switcher (`useLanguage().changeLanguage`), logout |
| `Breadcrumbs` | Renders `BreadcrumbItem[]`; titles are translation keys |
| `Heading` | Page or section heading. Props: `title`, `description?`, `variant?: 'default' \| 'small'` |
| `TextLink` | Styled Inertia `Link`. Props: `href`, `tabindex?`, `method?`, `as?` |
| `ErrorStatus` | Body of the error page for 403/404/500/503. Prop: `status: number` |
| `AlertError` | Destructive alert listing `errors: string[]` |
| `AppLogo`, `AppLogoIcon`, `PlaceholderPattern`, `UserInfo`, `AppearanceTabs` | Branding, placeholders, avatar + name, theme switcher |
| `DeleteUser` | Delete-account section on the profile page |
| `ManageTwoFactor`, `TwoFactorSetupModal`, `TwoFactorRecoveryCodes` | Two-factor setup on the security page |
| `ManagePasskeys`, `PasskeyRegister`, `PasskeyItem`, `PasskeyVerify` | Passkey management and passkey login |

<RelatedPages :links="[
  { text: 'Inertia → Forms', link: '/docs/vue/inertia#forms', desc: 'How the Common* fields plug into the Inertia Form component.' },
  { text: 'Layouts', link: '/docs/vue/layouts', desc: 'The app shells that mount the Toaster and the confirm dialog.' },
  { text: 'Notifications', link: '/docs/core/notifications', desc: 'The bell in the header and the notifications page.' },
]" />
