---
title: "Inertia v3 with React"
description: "Inertia v3 patterns in the React kit: how pages receive data, the Form component, useForm, visits, shared props, flash toasts and typed Wayfinder routes."
---

# Inertia <Badge type="tip" text="React" />

This page shows the Inertia patterns the kit uses, with examples taken from its code. The kit runs on Inertia v3 (`@inertiajs/react` ^3, `inertiajs/inertia-laravel` ^3). There's no Axios and no separate API. Every request is an Inertia visit, a `<Form>` submit or a `useHttp` call.

<KeyIdea>

Laravel sends props down to the page. Anything that changes data goes back up through `<Form>`, `router` or `useHttp`, and Wayfinder gives you the URLs so you don't type them by hand.

</KeyIdea>

## How pages receive data

```text
Controller → Inertia::render('users/index', props)
  → page component props      (page-specific data)
  → usePage().props           (shared props, every page)
  → Page.layout / setLayoutProps  (breadcrumbs, titles for the layout)
```

- Page props come from the controller as the component's props. Destructure them in the signature and type them with a local `Props` type or one from `@/types` (for example `UserIndexProps` in `types/Users/users.ts`).
- Shared props (user, permissions, menus, layout settings, locale) reach every page through `usePage().props`. See [Shared props](#shared-props).
- Layout props, like breadcrumbs or an auth page title, go the other way: the page sets them on `Page.layout` or with `setLayoutProps()`. See [Layouts](/docs/react/layouts#per-page-layout-override).

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

The `<Form>` props used across the kit:

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

If a form isn't made of native inputs, use `useForm`. The card pickers on Settings → Layout and Setup → Layout do this: clicking a card calls `setData()`, and saving submits with `patch(update.url(), { onSuccess: () => setDefaults() })`.

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

Forms go through `<Form>`. For everything else, use one of these. They all accept Wayfinder routes (see [Wayfinder routes](#wayfinder-routes)).

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

`HandleInertiaRequests` sends the same props to every page. The full list is in [Architecture → Shared props](/docs/react/architecture#shared-props).

```tsx
const { auth, locale } = usePage().props;
```

`types/global.d.ts` registers `SharedData` with Inertia (`InertiaConfig.sharedPageProps`), so `usePage().props` is typed without a generic. The same file declares a global `PageProps<T>` (`T & SharedData`) for layout callbacks like `ErrorPage.layout = (props: PageProps) => …`.

Where a hook exists, use it instead of reading the shared props directly: `usePermission()` for `auth.permissions` and `useLanguage()` for languages and locale.

## Flash toasts

Flash a toast from a controller just before it redirects, and it shows on the next page. You don't write any frontend code for it.

<FlowDiagram label="Flash toast" :nodes="[
  { label: 'Controller', note: '`Inertia::flash(\'toast\', [...])`' },
  'Router `flash` event',
  '`useFlashToast()`',
  'sonner toast',
]" />

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

Wayfinder writes typed functions for your named routes (`@/routes/<name>`) and controller actions (`@/actions/Modules/<Module>/Http/Controllers/<Controller>`). Use them rather than hard-coding URLs. The Vite plugin runs with `formVariants: true`, so every function also has a `.form()`.

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

<RelatedPages :links="[
  { text: 'Development → Adding a form', link: '/docs/react/development#adding-a-form', desc: 'The backend and frontend steps for a new form.' },
  { text: 'Components → Common form components', link: '/docs/react/components#common-form-components', desc: 'The fields you put inside a Form.' },
  { text: 'Architecture → Shared props', link: '/docs/react/architecture#shared-props', desc: 'Every prop that reaches every page, with its type.' },
]" />
