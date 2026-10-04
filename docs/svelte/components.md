---
title: "Svelte Kit Components (shadcn-svelte)"
description: "Common form components, the confirm dialog, shadcn-svelte primitives, icons, toasts and app shell components in the Svelte kit, with a small usage example."
head:
  - - link
    - rel: canonical
      href: https://saas-laravel.com/docs/svelte/components.html
  - - meta
    - property: og:title
      content: "Svelte Kit Components (shadcn-svelte)"
  - - meta
    - property: og:description
      content: "Common form components, the confirm dialog, shadcn-svelte primitives, icons, toasts and app shell components in the Svelte kit, with a small usage example."
  - - meta
    - property: og:url
      content: https://saas-laravel.com/docs/svelte/components.html
  - - meta
    - name: twitter:title
      content: "Svelte Kit Components (shadcn-svelte)"
  - - meta
    - name: twitter:description
      content: "Common form components, the confirm dialog, shadcn-svelte primitives, icons, toasts and app shell components in the Svelte kit, with a small usage example."
---

# Components <Badge type="tip" text="Svelte" />

## Overview

You'll find the components in `resources/js/components`, split into these folders:

| Folder | What it holds |
| --- | --- |
| `components/common/` | The kit's own form kit: `Common*` inputs, buttons, tooltip, icon and `ConfirmDialog` |
| `components/ui/` | shadcn-svelte primitives built on bits-ui (`button`, `dialog`, `select`, `sidebar`, …) |
| `components/` | App shell and feature components (`AppHead`, `AppSidebar`, `AppHeader`, `UserMenuContent`, `ErrorStatus`, …) |

When you build a page, reach for the `Common*` components before anything else. They handle the label, the `id`, the `aria-*` attributes and the error message, which keeps your pages short and makes them all look the same.

::: tip
If a component is only used by one page, put it in a `Partials/` folder next to that page (for example `pages/tenants/Partials/DomainModal.svelte`) rather than in `components/`.
:::

## Common form components

Every file listed here sits in `components/common/`.

| Component | Purpose |
| --- | --- |
| `CommonInput` | Text-like input (`type` defaults to `'text'`) |
| `CommonPassword` | Password input with a show/hide toggle |
| `CommonTextarea` | Textarea with `rows` (default `3`) and `maxlength` |
| `CommonSelect` | shadcn-svelte `Select` with a label; exports the `SelectOption` type |
| `CommonRadio` | Radio group built from `SelectOption[]` |
| `CommonCheckbox` | Checkbox with label; binds `checked` |
| `CommonLabel` | Label with required asterisk, "Optional" tag and hint text |
| `CommonError` | Error message in a `role="alert"` paragraph; renders nothing when empty |
| `CommonButton` | `Button` primitive with a `loading` spinner state |
| `CommonButtonRow` | Save / Discard bar for edit forms |
| `CommonTooltip` | Tooltip that passes trigger props to its `children` snippet |
| `ConfirmDialog` | Global confirm modal, opened with `useConfirmDialog()` (see below) |

A few things all the input components have in common:

- They accept `label`, `error`, `required` and `disabled`. If you leave out the `id`, they make one up.
- Any other attributes (`autofocus`, `tabindex`, `data-test`, …) go straight to the underlying element.
- Inside an Inertia `<Form>`, set `name` and `error`, and use `defaultValue` when you want to prefill a field.
- Outside a `<Form>`, use `bind:value` instead (or `bind:checked` for the checkbox).

::: details Input props: CommonInput, CommonPassword, CommonTextarea
| Prop | Type | Notes |
| --- | --- | --- |
| `type` | `string` | `CommonInput` only, default `'text'` |
| `name`, `id`, `label`, `placeholder`, `autocomplete` | `string` | `autocomplete` not on `CommonTextarea` |
| `disabled`, `required`, `readonly` | `boolean` | |
| `error`, `class` | `string` | |
| `value` (bindable), `defaultValue` | `string \| number \| null` | `string \| null` on `CommonPassword` and `CommonTextarea` |
| `ref` (bindable) | `HTMLInputElement \| null` | `CommonInput` only |
| `rows`, `maxlength` | `number` | `CommonTextarea` only; `rows` defaults to `3` |
:::

::: details Choice props: CommonSelect, CommonRadio, CommonCheckbox
| Prop | Type | Used by |
| --- | --- | --- |
| `options` | `SelectOption[]` (`{ label, value, disabled? }`), required | Select, Radio |
| `name`, `id`, `label`, `error` | `string` | all |
| `placeholder` | `string`, defaults to translated "Select an option" | Select |
| `disabled`, `required` | `boolean` | all |
| `value` (bindable), `defaultValue` | `string \| number \| null` | Select, Radio |
| `onValueChange` | `(value: string \| number) => void` | Select, Radio |
| `checked` (bindable), `defaultValue` | `boolean` | Checkbox |
| `value` | `string` (submitted value) | Checkbox |
| `onCheckedChange` | `(checked: boolean) => void` | Checkbox |

The option type is exported from the component's module script, so you import it like this:

```ts
import type { SelectOption } from '@/components/common/CommonSelect.svelte';
```
:::

::: details Label and error props: CommonLabel, CommonError
- `CommonLabel`: `for`, `label`, `required`, `optional`, `hint`, `disabled`, `class`, and a `children` snippet. Under the hood it wraps the `Label` primitive.
- `CommonError`: `message`, `id`, `class`.
:::

::: details Button props: CommonButton, CommonButtonRow
**CommonButton.** As long as `loading` is true, the button is disabled and you see a spinner in place of its content. Anything else you pass (`onclick`, `tabindex`, …) goes through to the button.

| Prop | Type | Default |
| --- | --- | --- |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` |
| `variant` | `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` | `default` |
| `size` | `default`, `sm`, `lg`, `icon`, `icon-sm`, `icon-lg` | `default` |
| `disabled`, `loading` | `boolean` | `false` |
| `class` | `string` | `''` |

**CommonButtonRow.** In its default `bottom-pop` position, the bar only slides in once the form is dirty. Clicking Save calls `requestSubmit()` on the nearest `<form>`, which means it works inside `<Form>` with nothing extra to wire up.

| Prop | Type | Default |
| --- | --- | --- |
| `isDirty`, `processing` | `boolean` | `false` |
| `position` | `'bottom-pop' \| 'top-pop' \| 'inline' \| 'sticky-bottom'` | `'bottom-pop'` |
| `saveVariant`, `discardVariant` | button variant | `'default'`, `'outline'` |
| `saveText`, `discardText`, `message` | `string` | translated defaults |
| `showDiscard` | `boolean` | `true` |
| `alwaysVisible`, `saveDisabled` | `boolean` | `false` |
| `onSave`, `onDiscard` | `() => void` | |
:::

::: details Tooltip props: CommonTooltip
Props: `content` (`string` or snippet), `side` (default `top`), `delayDuration` (default `200`), `disabled`, `contentClass`. Your `children` snippet gets `{ props }`, and you spread those onto the element that triggers the tooltip.

```svelte
<CommonTooltip content={__('modules.user.index.actions.edit')}>
    {#snippet children({ props })}
        <CommonButton {...props} variant="outline" size="icon-sm" onclick={() => openEditModal(user)}>
            <Edit3 class="size-4" />
        </CommonButton>
    {/snippet}
</CommonTooltip>
```
:::

### Confirm dialog

For anything destructive, ask with `ConfirmDialog` rather than `window.confirm`.

- Each app layout mounts it once, so you don't render it yourself.
- It keeps its state in a module-level `$state` inside `lib/confirmDialog.svelte.ts`.
- Calling `confirm(options)` gives you back a `Promise<boolean>`.

```ts
const { confirm } = useConfirmDialog();

const isConfirmed = await confirm({
    title: __('modules.user.index.delete_confirm.title'),
    confirmVariant: 'destructive',
});

if (isConfirmed) {
    router.delete(destroy.url(user.id), { preserveScroll: true });
}
```

You can also pass any of these: `warning`, `itemDetails`, `confirmText`, `icon` (`danger`, `warning`, `info`, `question`, `success`), `size` (`sm`–`xl`), `warningVariant`, `highlight`, `confirmationKeyword` (the user has to type it before the button turns on), `closeOnBackdrop`, `closeOnEscape`, `showCancelButton`. To put a spinner on the confirm button, call `setLoading(true)`.

::: warning
Only `AppSidebarLayout.svelte` and `AppHeaderLayout.svelte` mount `ConfirmDialog`. On pages that use `AuthLayout`, or no layout at all, `confirm()` won't work.
:::

::: details View full example (delete a user)
```ts
import { router } from '@inertiajs/svelte';
import { useConfirmDialog } from '@/lib/confirmDialog.svelte';
import { destroy } from '@/routes/users';

const { confirm } = useConfirmDialog();

async function handleDeleteUser(user: UserManagementUser): Promise<void> {
    const isConfirmed = await confirm({
        title: __('modules.user.index.delete_confirm.title'),
        message: __('modules.user.index.delete_confirm.message', { name: user.name }),
        warning: __('modules.user.index.delete_confirm.warning'),
        itemDetails: [{ label: __('modules.user.index.delete_confirm.email'), value: user.email, code: true }],
        confirmText: __('modules.user.index.delete_confirm.confirm'),
        confirmVariant: 'destructive',
    });

    if (!isConfirmed) {
        return;
    }

    router.delete(destroy.url(user.id), { preserveScroll: true });
}
```
:::

## UI primitives (shadcn)

The shadcn-svelte components sit in `components/ui/<name>/`. They use the new-york-v4 style, set in `components.json` at the project root. These are included:

`alert`, `avatar`, `badge`, `breadcrumb`, `button`, `card`, `checkbox`, `collapsible`, `dialog`, `dropdown-menu`, `input`, `input-otp`, `label`, `navigation-menu`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `sonner`, `spinner`, `tooltip`.

Import them through each folder's `index.ts`:

```ts
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
```

## Icons & toasts

| Need | Use |
| --- | --- |
| Icon in a component | `lucide-svelte`, one import per icon: `import Plus from 'lucide-svelte/icons/plus'` |
| Icon from a string (database menus) | `CommonIcon` with an Iconify name: `<CommonIcon icon="lucide:building-2" class="size-4" />` |
| Toast from the server | `Inertia::flash('toast', …)`; see [Inertia → Flash toasts](/docs/svelte/inertia#flash-toasts) |
| Toast from the client | `import { toast } from 'svelte-sonner'` |

Give `CommonIcon` a PascalCase name and it turns it into a Lucide one (`LayoutGrid` → `lucide:layout-grid`). Names that already carry a prefix are left alone. Props: `icon`, `class`, `click` (click handler).

The `Toaster` (`components/ui/sonner`) lives in the two app layouts only (`AppSidebarLayout`, `AppHeaderLayout`). You won't see toasts on auth pages or on pages without a layout.

## Usage example

Here's a settings form with one prefilled input and the Save / Discard bar:

```svelte
<Form {...ProfileController.update.form()} setDefaultsOnSuccess>
    {#snippet children({ errors, processing, isDirty, reset })}
        <CommonInput name="name" defaultValue={user.name} error={errors.name} />
        <CommonButtonRow {isDirty} {processing} onDiscard={() => reset()} />
    {/snippet}
</Form>
```

::: details View more examples
```svelte
<CommonInput
    id="email"
    type="email"
    name="email"
    label={__('modules.auth.common.email_address')}
    required
    autocomplete="email"
    error={errors.email}
/>

<CommonTextarea
    id="maintenance_message"
    name="message"
    defaultValue={maintenance.message ?? ''}
    label={__('modules.maintenance.form.message')}
    rows={3}
    maxlength={500}
    error={errors.message}
/>

<CommonSelect
    id="locale"
    name="locale"
    label={__('modules.settings.language.label')}
    defaultValue={language.toLocaleValue(language.userLocale)}
    options={languageOptions}
    error={errors.locale}
/>

<CommonRadio bind:value={resetMethod} name="reset_method" options={methodOptions} />

<CommonCheckbox
    id="send_invitation"
    bind:checked={sendInvitation}
    name="send_invitation"
    value="1"
    label={__('modules.user.form_modal.send_invitation')}
/>

<CommonLabel for="password" required>{__('modules.auth.common.password')}</CommonLabel>
<CommonError message={errors.code} />

<CommonButton type="submit" class="w-full" loading={processing}>
    {__('modules.auth.login.submit')}
</CommonButton>
```
:::

## App shell components

| Component | Purpose |
| --- | --- |
| `AppHead` | Sets `<title>` as `"{title} - {VITE_APP_NAME}"` through `<svelte:head>`. Props: `title`, `children` snippet for extra head tags |
| `AppShell`, `AppContent` | Wrap the sidebar provider and main content (`variant: 'sidebar' \| 'header'`) |
| `AppSidebar` | Sidebar with `NavMain` (from `menus`) or the setup menu (`setupMenus` on `/setup/*`), and `NavUser` |
| `AppSidebarHeader` | Top bar of the sidebar layout with the trigger and `Breadcrumbs` |
| `AppHeader` | Top navigation for the header layout (menus, breadcrumbs, user menu) |
| `NavMain`, `NavFooter`, `NavUser` | Sidebar menu tree, footer links, user dropdown |
| `UserMenuContent` | User dropdown: settings link, language switcher (`changeLanguage`), logout |
| `Breadcrumbs` | Renders `BreadcrumbItem[]`; titles are translation keys |
| `Heading` | Page/section heading. Props: `title`, `description?`, `variant?: 'default' \| 'small'` |
| `TextLink` | Styled Inertia `Link`. Props: `href`, `tabindex?`, `method?`, `as?` |
| `ErrorStatus` | Body of the error page for 403/404/500/503. Prop: `status: number` |
| `AlertError` | Destructive alert listing `errors: string[]` |
| `AppLogo`, `AppLogoIcon`, `PlaceholderPattern`, `UserInfo`, `AppearanceTabs` | Branding, placeholders, avatar + name, theme switcher |
| `DeleteUser` | Delete-account section on the profile page |
| `ManageTwoFactor`, `TwoFactorSetupModal`, `TwoFactorRecoveryCodes` | Two-factor setup on the security page |
| `ManagePasskeys`, `PasskeyRegister`, `PasskeyItem`, `PasskeyVerify` | Passkey management and passkey login |

No page uses `InputError.svelte` or `PasswordInput.svelte`. Go with `CommonError` and `CommonPassword` instead.
