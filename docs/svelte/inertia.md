---
title: "Inertia v3 with Svelte"
description: "Inertia v3 patterns in the Svelte kit: how pages receive data, the Form component, useForm, visits, shared props, flash toasts and typed Wayfinder routes."
---

# Inertia <Badge type="tip" text="Svelte" />

We built the kit on Inertia v3 (`@inertiajs/svelte` ^3, `inertiajs/inertia-laravel` ^3). You won't find Axios or a REST API anywhere. Each request is either an Inertia visit, a `<Form>` submit or a `useHttp` call.

## How pages receive data

```text
Controller → Inertia::render('users/Index', [...page props])
           + HandleInertiaRequests shared props (auth, menus, layout, …)
           → pages/users/Index.svelte
               page props   → $props()
               shared props → page.props (from @inertiajs/svelte)
```

- Page props are whatever the controller passes in. You type them where you destructure `$props()`, usually with a type from `@/types`.
- Shared props reach every page. See [Shared props](#shared-props).
- Flash data (the toasts) comes along with the response, and `app.ts` deals with it in one place. See [Flash toasts](#flash-toasts).

### Page title and layout props

- For the title, we skip Inertia's `Head`. A page renders `<AppHead title={__('modules.user.index.title')} />` instead, and that writes the `<title>` through `<svelte:head>`.
- For layout props, put fixed values in `export const layout = { … }` inside `<script module>`. Anything that depends on state goes through `setLayoutProps()`. See [Layouts → Per-page layout override](/docs/svelte/layouts#per-page-layout-override).

## Forms

In most places we use Inertia's `<Form>` component. The pattern looks like this:

- You spread a Wayfinder `.form()` object into it, so the URL and method are taken from the Laravel route.
- The `children` snippet hands you `errors`, `processing`, `isDirty` and `reset`.
- An input just needs a `name`, and the `Common*` components take care of showing `error`.

```svelte
<Form {...store.form()} resetOnSuccess={['password']} class="flex flex-col gap-6">
    {#snippet children({ errors, processing })}
        <CommonInput name="email" type="email" error={errors.email} />
        <CommonPassword name="password" error={errors.password} />
        <CommonButton type="submit" loading={processing}>{__('modules.auth.login.submit')}</CommonButton>
    {/snippet}
</Form>
```

You'll see these variations around the kit:

| Pattern | Where | How |
| --- | --- | --- |
| Edit form with Save / Discard bar | `settings/Profile.svelte` | `setDefaultsOnSuccess` keeps `isDirty` accurate after saving; `transform={language.transformLocale}` maps the "Default" language to `null` |
| Create and edit in one modal | `users/Partials/UserFormModal.svelte`, `roles/Partials/RoleFormModal.svelte` | `action` switches between `store()` and `update(id)`; `{#key}` re-mounts the form |
| Non-input fields (card pickers) | `settings/Layout.svelte`, `setup/Layout.svelte` | `useForm` instead of `<Form>` |

::: details View edit form example (profile)
```svelte
<Form
    {...ProfileController.update.form()}
    transform={language.transformLocale}
    setDefaultsOnSuccess
    class="space-y-6"
>
    {#snippet children({ errors, processing, isDirty, reset })}
        <CommonInput name="name" defaultValue={user.name} error={errors.name} />
        <CommonSelect
            name="locale"
            defaultValue={language.toLocaleValue(language.userLocale)}
            options={languageOptions}
            error={errors.locale}
        />
        <CommonButtonRow {isDirty} {processing} onDiscard={() => reset()} />
    {/snippet}
</Form>
```

Here, `language` is `useLanguage()` from `lib/language.ts`.
:::

::: details View create/edit modal example
```svelte
<script lang="ts">
    const formKey = $derived(selectedUser?.id ?? 'create');
    const formAction = $derived(selectedUser ? update(selectedUser.id) : store());
</script>

{#key formKey}
    <Form
        action={formAction}
        options={{ preserveScroll: true }}
        resetOnSuccess
        onSuccess={handleSuccess}
        novalidate
        class="space-y-4"
    >
        {#snippet children({ errors, processing })}
            <CommonInput name="name" defaultValue={selectedUser?.name ?? ''} error={errors.name} />
        {/snippet}
    </Form>
{/key}
```
:::

::: details View useForm example (layout pickers)
The form you get back is reactive, so you can read and assign its fields directly.

```svelte
<script lang="ts">
    import { useForm } from '@inertiajs/svelte';
    import { untrack } from 'svelte';

    const form = useForm(
        untrack(() => ({
            app_layout: layoutSettings?.app_layout || 'sidebar',
            sidebar_variant: layoutSettings?.sidebar_variant || 'inset',
            sidebar_collapsible: layoutSettings?.sidebar_collapsible || 'icon',
        })),
    );

    const submit = (event?: Event) => {
        event?.preventDefault();

        form.patch('/settings/layout', {
            preserveScroll: true,
            onSuccess: () => {
                form.defaults();
            },
        });
    };
</script>

<button type="button" onclick={() => (form.app_layout = 'sidebar')}>…</button>
```
:::

## Visits, links and requests

| Need | Use | Example in the kit |
| --- | --- | --- |
| Navigation link | `<Link href={edit()} prefetch>` or `TextLink` | `UserMenuContent.svelte`, auth pages |
| Search, delete, one-off action | `router.get/post/put/patch/delete` with `.url()` | Users search, deletes |
| Reload or redirect | `router.reload()`, `router.visit()` | `ManagePasskeys.svelte`, `tenants/Show.svelte` |
| Clear cached pages on logout | `router.flushAll()` | `UserMenuContent.svelte` |
| JSON without a page visit | `useHttp()` | `lib/twoFactorAuth.svelte.ts` (QR code, setup key, recovery codes) |

On the users page, the search input is debounced with `useDebounce` and sent from an `$effect`. The example below is trimmed down: the real page also skips the request if the value is the same as last time.

::: details View search and useHttp examples
```ts
import { router } from '@inertiajs/svelte';
import { untrack } from 'svelte';
import { useDebounce } from '@/lib/debounce.svelte';
import { destroy, index } from '@/routes/users';

let search = $state(untrack(() => props.filters.search));
const debouncedSearch = useDebounce(() => search, 300);

$effect(() => {
    const value = debouncedSearch.value;

    router.get(
        index.url(),
        { search: value.trim() ? value.trim() : undefined },
        { preserveScroll: true, replace: true },
    );
});

router.delete(destroy.url(user.id), { preserveScroll: true });
```

```ts
import { useHttp } from '@inertiajs/svelte';
import { qrCode } from '@/routes/two-factor';

const http = useHttp();
const { svg } = (await http.submit(qrCode())) as { svg: string; url: string };
```
:::

## Shared props

`HandleInertiaRequests` provides the shared props, and you read them from the reactive `page` object:

```svelte
<script lang="ts">
    import { page } from '@inertiajs/svelte';

    const user = $derived(page.props.auth.user);
</script>
```

Since `types/global.d.ts` augments Inertia (`InertiaConfig.sharedPageProps = SharedData`), `page.props` has types wherever you use it. That file also declares a global `PageProps<T>` (`T & SharedData`), which layout callbacks use, for example the error page's `export const layout = (props: PageProps) => …`.

For every shared prop and its type, see [Architecture → Shared props](/docs/svelte/architecture#shared-props).

## Flash toasts

The controller flashes a toast and redirects, and the toast appears on the page that loads next.

```text
Inertia::flash('toast', ['type' => 'success', 'message' => …])
  → router 'flash' event
  → lib/flash-toast.ts (started in app.ts)
  → toast[type](message) from svelte-sonner
```

```php
Inertia::flash('toast', ['type' => 'success', 'message' => __('modules/tenant.toasts.created')]);
```

- `type` can be `success`, `info`, `warning` or `error` (see `FlashToast` in `types/ui.ts`).
- For a toast triggered in the browser, `import { toast } from 'svelte-sonner'`.
- Only the app layouts mount the `Toaster`, which is why flash toasts don't appear on auth pages.

::: details View lib/flash-toast.ts
```ts
export function initializeFlashToast(): void {
    router.on('flash', (event) => {
        const flash = (event as CustomEvent).detail?.flash;
        const data = flash?.toast as FlashToast | undefined;

        if (!data) {
            return;
        }

        toast[data.type](data.message);
    });
}
```
:::

## Wayfinder routes

Wayfinder gives you typed functions for named routes (`@/routes/<name>`) and for controller actions (`@/actions/Modules/<Module>/Http/Controllers/<Controller>`). We run the Vite plugin with `formVariants: true`, so each function comes with a `.form()` too.

| Call | Returns | Use with |
| --- | --- | --- |
| `index()` | `{ url, method }` | `<Link href>`, `<Form action>`, `useHttp().submit()` |
| `index.url()` | `string` | `router.get()`, `form.patch()` |
| `destroy.url(id)` | `string` with the parameter | `router.delete()` |
| `store.form()` | `{ action, method }` (method spoofing via `_method`) | `<Form {...store.form()}>` |

```ts
import ProfileController from '@/actions/Modules/Settings/Http/Controllers/ProfileController';
import { destroy } from '@/routes/users';

destroy.url(user.id);             // '/users/5'
ProfileController.update.form();  // { action: '/settings/profile?_method=PATCH', method: 'post' }
```

::: tip
Added a route and the import can't be found? Keep `npm run dev` running, since the Vite plugin regenerates the files when PHP changes. You can also run `php artisan wayfinder:generate --with-form`.
:::
