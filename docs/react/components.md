---
title: "React Kit Components (shadcn/ui)"
description: "Common form components, the confirm dialog, shadcn/ui primitives, icons, toasts and app shell components in the React kit, with a small usage example."
---

# Components <Badge type="tip" text="React" />

## Overview

You'll find the components in `resources/js/components`, split into three groups:

| Folder | What it holds |
| --- | --- |
| `components/common/` | The kit's own components: `Common*` inputs, buttons, tooltip, icon and `ConfirmDialog` |
| `components/ui/` | shadcn/ui primitives built on Radix UI (`button.tsx`, `dialog.tsx`, `select.tsx`, `sidebar.tsx`, …) |
| `components/` | App shell and feature components (`AppSidebar`, `AppHeader`, `UserMenuContent`, `ErrorStatus`, …) |

Start with the `Common*` components. They handle the label, `id`, `aria-*` attributes and error message for you, which turns a form field into a single line. Every file exports the component both as a named and as a default export.

::: tip
If a component is only used by one page, put it in a `partials/` folder next to that page (for example `pages/tenants/partials/domain-modal.tsx`) rather than in `components/`.
:::

## Common form components

| Component | File | Purpose |
| --- | --- | --- |
| `CommonInput` | `common-input.tsx` | Text, email, number, … input with label and error |
| `CommonPassword` | `common-password.tsx` | Password input with a show/hide toggle |
| `CommonTextarea` | `common-textarea.tsx` | Textarea with label and error |
| `CommonSelect` | `common-select.tsx` | shadcn/ui `Select` with label; exports the `SelectOption` type |
| `CommonRadio` | `common-radio.tsx` | Radio group from `SelectOption[]` |
| `CommonCheckbox` | `common-checkbox.tsx` | Radix checkbox with label; notifies `<Form>` dirty tracking |
| `CommonLabel` | `common-label.tsx` | Label with `required` asterisk, `optional` tag and `hint` |
| `CommonError` | `common-error.tsx` | `role="alert"` error text; renders nothing when empty |
| `CommonButton` | `common-button.tsx` | `Button` with a `loading` state (disabled + spinner) |
| `CommonButtonRow` | `common-button-row.tsx` | Save / Discard bar that appears when a form is dirty |
| `CommonTooltip` | `common-tooltip.tsx` | Tooltip around any trigger |
| `ConfirmDialog` | `confirm-dialog.tsx` | Promise-based confirm dialog, opened with `useConfirmDialog()` |

The input components all work the same way:

- Each one takes `label`, `error`, `required` and `disabled`.
- If you leave out `id`, one is generated with `useId()`.
- Any other prop (`autoFocus`, `tabIndex`, `className`, `data-test`, …) is passed to the underlying element.
- In an Inertia `<Form>`, `name` and `error` are all you need. Prefill a field with `defaultValue`.
- When there's no `<Form>` around it, control the value yourself with `value` + `onChange` / `onValueChange`.

::: details View props of each component
| Component | Props |
| --- | --- |
| `CommonInput` | All `<input>` props (`ComponentProps<'input'>`) + `label?`, `error?` |
| `CommonPassword` | `<input>` props except `type` + `label?`, `error?` |
| `CommonTextarea` | `<textarea>` props + `label?`, `error?` |
| `CommonSelect` | `options: SelectOption[]` (required), `name`, `label`, `placeholder` (defaults to translated "Select an option"), `error`, `required`, `value` / `defaultValue` (`string \| number`), `onValueChange(value: string)`. Other props go to `SelectTrigger`. `SelectOption` is `{ label, value, disabled? }` |
| `CommonRadio` | `options: SelectOption[]` (required), `name`, `label`, `disabled`, `required`, `error`, `value`, `defaultValue`, `onValueChange(value: string \| number)`, plus `<div>` props |
| `CommonCheckbox` | Radix `Checkbox` props (`name`, `value`, `checked`, `defaultChecked`, …) + `label`, `error`, `onCheckedChange(checked: boolean)`. Dispatches a `change` event after toggling so `<Form>` sees it |
| `CommonLabel` | `htmlFor`, `label`, `required` (red asterisk), `optional` (translated "Optional" tag), `hint` (right-aligned text), `disabled`, `className`, `children` |
| `CommonError` | `message`, `id`, `className` |
| `CommonTooltip` | `content: ReactNode`, `side` (default `top`), `delayDuration` (default `200`), `disabled`, `contentClassName`, `children`. With no `content` or when `disabled`, only the children render |
:::

### CommonButton and CommonButtonRow

By default `CommonButton` is `type="button"`. Set `loading` to true and it disables itself and swaps its children for a `Spinner`.

| Prop | Values | Default |
| --- | --- | --- |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` |
| `variant` | `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` | `default` |
| `size` | `default`, `sm`, `lg`, `icon`, `icon-sm`, `icon-lg` | `default` |
| `loading` | `boolean` | none |

`CommonButtonRow` is the Save / Discard bar you see on the settings forms. In its default `bottom-pop` position it only slides in once `isDirty` is true. Save calls `requestSubmit()` on the nearest `<form>`, so you can drop it into a `<Form>` and it just works.

::: details View CommonButtonRow props
| Prop | Type | Default |
| --- | --- | --- |
| `isDirty`, `processing` | `boolean` | `false` |
| `position` | `'bottom-pop' \| 'top-pop' \| 'inline' \| 'sticky-bottom'` | `'bottom-pop'` |
| `saveVariant`, `discardVariant` | button variant | `'default'`, `'outline'` |
| `saveText`, `discardText`, `message` | `string` | translated defaults |
| `showDiscard` | `boolean` | `true` |
| `alwaysVisible`, `saveDisabled` | `boolean` | `false` |
| `onSave`, `onDiscard` | `() => void` | none |
| `className` | `string` | none |
:::

### ConfirmDialog

The app layouts mount `ConfirmDialog` once. From any component, call `confirm()` from `useConfirmDialog()` and await the `Promise<boolean>` it returns.

```tsx
const { confirm } = useConfirmDialog();

if (await confirm({ title, message, confirmVariant: 'destructive' })) {
    router.delete(destroy.url(user.id), { preserveScroll: true });
}
```

Other options you can pass, none of them required: `warning`, `itemDetails`, `icon` (`danger`, `warning`, `info`, `question`, `success`), `size` (`sm`–`xl`), `warningVariant`, `highlight`, `confirmationKeyword` (the user has to type it before the button is enabled), `closeOnBackdrop`, `closeOnEscape` and `showCancelButton`. Call `setLoading(true)` to put a spinner on the confirm button.

::: warning
Only `app-sidebar-layout.tsx` and `app-header-layout.tsx` mount `ConfirmDialog`. On a page that uses `AuthLayout` or no layout at all, `confirm()` won't work.
:::

::: details View full example (delete user)
```tsx
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

const { confirm } = useConfirmDialog();

const handleDeleteUser = async (user: UserManagementUser) => {
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
};
```
:::

## UI primitives (shadcn)

The shadcn/ui components are in `components/ui/*.tsx`, in the new-york style and configured in `components.json` at the project root. When there's no `Common*` wrapper for what you need, such as dialogs, cards or badges, use them directly.

These are included: `alert`, `avatar`, `badge`, `breadcrumb`, `button`, `card`, `checkbox`, `collapsible`, `dialog`, `dropdown-menu`, `icon`, `input`, `input-otp`, `label`, `navigation-menu`, `placeholder-pattern`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `sonner`, `spinner`, `toggle`, `toggle-group`, `tooltip`.

```tsx
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
```

## Icons & toasts

| Need | Use |
| --- | --- |
| Icon in your own JSX | A `lucide-react` component: `<Plus className="size-4" />` |
| Icon from a string (menus, database) | `CommonIcon`: `<CommonIcon icon="lucide:building-2" className="size-4" />` |
| Icon that may be either | `NavItemIcon` (accepts a string or a Lucide component) |
| Toast from the server | `Inertia::flash('toast', …)` in the controller. See [Inertia → Flash toasts](/docs/react/inertia#flash-toasts) |
| Toast from the client | `import { toast } from 'sonner'` |

`CommonIcon` renders Iconify icons. A name with a prefix (`lucide:…`) is used unchanged, and a PascalCase name is converted to its Lucide equivalent (`LayoutGrid` → `lucide:layout-grid`). It takes three props: `icon`, `className` and `click`.

## Usage example

Here's a typical edit form, taken from the profile page. The inputs and the Save / Discard bar all sit inside an Inertia `<Form>`.

```tsx
<Form {...ProfileController.update.form()} setDefaultsOnSuccess>
    {({ errors, processing, isDirty, reset }) => (
        <>
            <CommonInput name="name" defaultValue={user.name} error={errors.name} />
            <CommonButtonRow isDirty={isDirty} processing={processing} onDiscard={() => reset()} />
        </>
    )}
</Form>
```

::: details View more field examples
```tsx
<CommonInput
    id="email"
    type="email"
    name="email"
    label={__('modules.auth.common.email_address')}
    required
    autoComplete="email"
    error={errors.email}
/>

<CommonPassword id="password" name="password" required autoComplete="current-password" error={errors.password} />

<CommonTextarea
    id="maintenance_message"
    name="message"
    defaultValue={maintenance.message ?? ''}
    label={__('modules.maintenance.form.message')}
    rows={3}
    maxLength={500}
    error={errors.message}
/>

<CommonSelect
    id="locale"
    name="locale"
    label={__('modules.settings.language.label')}
    value={localeValue}
    onValueChange={setLocaleValue}
    options={languageOptions}
    error={errors.locale}
/>

<CommonRadio
    value={resetMethod}
    onValueChange={(value) => setResetMethod(String(value))}
    name="reset_method"
    options={methodOptions}
/>

<CommonLabel htmlFor="password" required>
    {__('modules.auth.common.password')}
</CommonLabel>
<CommonError message={errors.code} />

<CommonButton type="submit" className="w-full" loading={processing}>
    {__('modules.auth.login.submit')}
</CommonButton>

<CommonTooltip content={__('modules.user.index.actions.edit')}>
    <CommonButton variant="outline" size="icon-sm" onClick={() => openEditModal(user)}>
        <Edit3 className="size-4" />
    </CommonButton>
</CommonTooltip>
```
:::

## App shell components

| Component (file) | Purpose |
| --- | --- |
| `AppShell`, `AppContent` (`app-shell.tsx`, `app-content.tsx`) | Wrap the sidebar provider and main content (`variant: 'sidebar' \| 'header'`) |
| `AppSidebar` (`app-sidebar.tsx`) | Sidebar with `NavMain` (from `menus`) or the setup menu (`setupMenus` on `/setup/*`), and `NavUser` |
| `AppSidebarHeader` (`app-sidebar-header.tsx`) | Top bar of the sidebar layout with the trigger and `Breadcrumbs` |
| `AppHeader` (`app-header.tsx`) | Top navigation for the header layout (menus, breadcrumbs, user menu) |
| `NavMain`, `NavFooter`, `NavUser`, `NavItemIcon` | Sidebar menu tree, footer links, user dropdown, string-or-component icon |
| `UserMenuContent` (`user-menu-content.tsx`) | User dropdown: settings link, language switcher, logout |
| `Breadcrumbs` (`breadcrumbs.tsx`) | Renders `BreadcrumbItem[]`; titles are translation keys |
| `Heading` (`heading.tsx`) | Page/section heading. Props: `title`, `description?`, `variant?: 'default' \| 'small'` |
| `TextLink` (`text-link.tsx`) | Styled Inertia `Link`; accepts all `Link` props |
| `ErrorStatus` (`error-status.tsx`) | Body of the error page for 403/404/500/503. Prop: `status: number` |
| `AlertError` (`alert-error.tsx`) | Destructive alert listing `errors: string[]` |
| `AppLogo`, `AppLogoIcon`, `UserInfo`, `AppearanceTabs` | Branding, avatar + name, theme switcher |
| `DeleteUser` (`delete-user.tsx`) | Delete-account section on the profile page |
| `ManageTwoFactor`, `TwoFactorSetupModal`, `TwoFactorRecoveryCodes` | Two-factor setup on the security page |
| `ManagePasskeys`, `PasskeyRegister`, `PasskeyItem`, `PasskeyVerify` | Passkey management and passkey login |

No page uses `input-error.tsx` or `password-input.tsx`. Reach for `CommonError` and `CommonPassword` instead.
