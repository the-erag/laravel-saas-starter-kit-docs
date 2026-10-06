---
title: "Inertia v3 with React"
description: "Inertia v3 patterns in the React kit: how pages receive data, the Form component, useForm, visits, shared props, flash toasts and typed Wayfinder routes."
---

# Inertia <Badge type="tip" text="React" />

The kit runs on Inertia v3 (`@inertiajs/react` ^3, `inertiajs/inertia-laravel` ^3). We don't use Axios or a separate API. A request is always an Inertia visit, a `<Form>` submit or a `useHttp` call.

## How pages receive data

```text
Controller → Inertia::render('users/index', props)
  → page component props      (page-specific data)
  → usePage().props           (shared props, every page)
  → Page.layout / setLayoutProps  (breadcrumbs, titles for the layout)
```

- Page props come in as the component's props and you destructure them in the signature. Type them with a local `Props` type or one from `@/types` (for example `UserIndexProps` in `types/Users/users.ts`).
- Shared props (user, permissions, menus, locale, layout settings) are read from `usePage().props`, covered under [Shared props](#shared-props).
- Layout props are either set statically on `Page.layout` or changed at runtime with `setLayoutProps()`. [Layouts](/docs/react/layouts#per-page-layout-override) has the details.

```tsx
import type { UserIndexProps } from '@/types';

export default function UsersIndex({ users, stats, filters }: UserIndexProps) { … }
```

## Forms

For most forms you'll use the Inertia `<Form>` component:

1. Spread a Wayfinder `.form()` object into it, which fills in `action` and `method`.
2. Give every input a `name`. You don't need state or an `onChange` handler.
3. Pull `errors`, `processing`, `isDirty` and `reset` out of the render-prop child.

```tsx
<Form {...store.form()} resetOnSuccess={['password']} className="flex flex-col gap-6">
    {({ errors, processing }) => (
        <>
            <CommonInput name="email" type="email" error={errors.email} />
            <CommonPassword name="password" error={errors.password} />
            <CommonButton type="submit" loading={processing}>{__('modules.auth.login.submit')}</CommonButton>
        </>
    )}
</Form>
```

A handful of other `<Form>` props show up across the kit:

| Prop | Use | Example |
| --- | --- | --- |
| `resetOnSuccess` | Clear fields (all, or listed ones) after success | Login clears `password` |
| `setDefaultsOnSuccess` | Treat saved values as the new baseline so `isDirty` resets | Profile form with `CommonButtonRow` |
| `transform` | Change data before sending | Profile maps the "Default" language to `null` with `transformLocale` |
| `options` with `preserveScroll: true` | Keep scroll position | User and role modals |
| `key` | Re-mount the form when switching create/edit | `user-form-modal.tsx` |

::: details View edit form (profile page)
```tsx
<Form
    {...ProfileController.update.form()}
    transform={transformLocale}
    setDefaultsOnSuccess
    className="space-y-6"
>
    {({ errors, processing, isDirty, reset }) => (
        <>
            <CommonInput name="name" defaultValue={user.name} error={errors.name} />
            <CommonSelect
                name="locale"
                value={localeValue}
                onValueChange={setLocaleValue}
                options={languageOptions}
                error={errors.locale}
            />
            <CommonButtonRow
                isDirty={isDirty}
                processing={processing}
                onDiscard={() => {
                    reset();
                    setLocaleValue(toLocaleValue(userLocale));
                }}
            />
        </>
    )}
</Form>
```

Both `transformLocale` and `toLocaleValue` are exported from `hooks/use-language.ts`.
:::

::: details View create/edit in one modal (user-form-modal.tsx)
Depending on whether a user is selected, the modal uses `store.form()` or `update.form(id)`, and `key` forces the form to re-mount when that changes. The page opens and closes it through `open()` / `close()`, exposed with `useImperativeHandle` (`UserFormModalHandle`).

```tsx
const formAction = selectedUser ? update.form(selectedUser.id) : store.form();

<Form
    key={formKey}
    {...formAction}
    options={{ preserveScroll: true }}
    resetOnSuccess
    onSuccess={handleSuccess}
    noValidate
    className="space-y-4"
>
    {({ errors, processing }) => (
        <CommonInput name="name" defaultValue={selectedUser?.name ?? ''} error={errors.name} />
    )}
</Form>
```
:::

### `useForm` for custom inputs

If a form isn't made of native inputs, switch to `useForm`. That's what the card pickers on Settings → Layout and Setup → Layout do. Clicking a card calls `setData()`, and saving submits with `patch(update.url(), { onSuccess: () => setDefaults() })`.

::: details View useForm example (settings/layout.tsx)
```tsx
import { useForm } from '@inertiajs/react';
import { update } from '@/routes/layout';

const { data, setData, patch, processing, isDirty, reset, setDefaults } = useForm({
    app_layout: layoutSettings?.app_layout || 'sidebar',
    sidebar_variant: layoutSettings?.sidebar_variant || 'inset',
    sidebar_collapsible: layoutSettings?.sidebar_collapsible || 'icon',
});

const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    patch(update.url(), {
        preserveScroll: true,
        onSuccess: () => setDefaults(),
    });
};
```
:::

## Visits, links and requests

Forms go through `<Form>`. For everything else, pick one of the calls below. Each of them accepts Wayfinder routes (see [Wayfinder routes](#wayfinder-routes)).

| Need | Use | Example in the kit |
| --- | --- | --- |
| Navigation link | `<Link href={edit()} prefetch>` or `<TextLink href={register()}>` | `user-menu-content.tsx`, `auth/login.tsx` |
| Search, delete, one-off action | `router.get/post/patch/put/delete(route.url(), data, options)` | Users search, delete buttons |
| Reload current props | `router.reload()` | `manage-passkeys.tsx` |
| Clear the prefetch cache | `router.flushAll()` | Logout in `user-menu-content.tsx` |
| JSON without a page visit | `useHttp().submit(route())` | QR code and recovery codes in `use-two-factor-auth.ts` |

On the users page, the search box is debounced with `useDebounceFn` from `hooks/use-debounce.ts`:

```tsx
const debouncedSearch = useDebounceFn((value: string) => {
    router.get(
        index.url(),
        { search: value.trim() ? value.trim() : undefined },
        { preserveScroll: true, replace: true },
    );
}, 300);
```

## Shared props

`HandleInertiaRequests` sends the same set of props to every page. The full list is in [Architecture → Shared props](/docs/react/architecture#shared-props).

```tsx
const { auth, locale } = usePage().props;
```

In `types/global.d.ts` we register `SharedData` with Inertia (`InertiaConfig.sharedPageProps`), which is why `usePage().props` is typed without a generic. The same file declares a global `PageProps<T>` (`T & SharedData`) that you'll see in layout callbacks like `ErrorPage.layout = (props: PageProps) => …`.

Where a hook exists, use it instead of reading the shared props directly: `usePermission()` for `auth.permissions` and `useLanguage()` for languages and locale.

## Flash toasts

Flash a toast from a controller and it appears on the next page. You don't write any frontend code for it.

```text
Inertia::flash('toast', [...]) → router 'flash' event → useFlashToast() → sonner toast
```

```php
Inertia::flash('toast', ['type' => 'success', 'message' => __('modules/tenant.toasts.created')]);
```

- `type` can be `success`, `info`, `warning` or `error`.
- The `Toaster` in `components/ui/sonner.tsx` calls `useFlashToast()` (`hooks/use-flash-toast.ts`), and `app.tsx` mounts that `Toaster` once for every page.
- To show a toast from the client instead, `import { toast } from 'sonner'`.

::: details View useFlashToast
```tsx
export function useFlashToast(): void {
    useEffect(() => {
        return router.on('flash', (event) => {
            const flash = (event as CustomEvent).detail?.flash;
            const data = flash?.toast as FlashToast | undefined;

            if (!data) {
                return;
            }

            toast[data.type](data.message);
        });
    }, []);
}
```
:::

## Wayfinder routes

Wayfinder writes typed functions for your named routes (`@/routes/<name>`) and controller actions (`@/actions/Modules/<Module>/Http/Controllers/<Controller>`). Use those rather than hard-coding URLs.

| Call | Returns | Use with |
| --- | --- | --- |
| `index()` | `{ url, method }` | `<Link href>`, `useHttp().submit()` |
| `index.url()` | `string` | `router.get()`, `useForm().patch()` |
| `destroy.url(id)` | `string` with the parameter | `router.delete()` |
| `store.form()` | `{ action, method }` (method spoofing via `_method`) | `<Form {...store.form()}>` |

```ts
dashboard();                      // { url: '/dashboard', method: 'get' }
destroy.url(user.id);             // '/users/5'
ProfileController.update.form();  // { action: '/settings/profile?_method=PATCH', method: 'post' }
```

::: tip
Added a route but the import isn't there? Leave `npm run dev` running, since the Vite plugin regenerates the files when PHP changes. Or run `php artisan wayfinder:generate --with-form`.
:::
