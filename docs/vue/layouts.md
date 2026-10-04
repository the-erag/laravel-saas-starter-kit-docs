---
title: "Vue Kit Layouts"
description: "How the Vue kit picks app and sign-in layouts from Setup defaults and user settings, the sidebar and header layouts, and per-page layout overrides."
head:
  - - link
    - rel: canonical
      href: https://saas-laravel.com/docs/vue/layouts.html
  - - meta
    - property: og:title
      content: "Vue Kit Layouts"
  - - meta
    - property: og:description
      content: "How the Vue kit picks app and sign-in layouts from Setup defaults and user settings, the sidebar and header layouts, and per-page layout overrides."
  - - meta
    - property: og:url
      content: https://saas-laravel.com/docs/vue/layouts.html
  - - meta
    - name: twitter:title
      content: "Vue Kit Layouts"
  - - meta
    - name: twitter:description
      content: "How the Vue kit picks app and sign-in layouts from Setup defaults and user settings, the sidebar and header layouts, and per-page layout overrides."
---

# Layouts <Badge type="tip" text="Vue" />

The layouts are in `resources/js/layouts`. There are two wrappers, `AppLayout.vue` and `AuthLayout.vue`, and each one decides at runtime which design to show, based on the shared `layout` prop.

## Layout selection flow

```text
1. app.ts picks the wrapper by page name
     auth/*      → AuthLayout
     settings/*  → AppLayout + settings/Layout.vue
     anything else → AppLayout
2. The page can override it with defineOptions({ layout })
3. The wrapper reads page.props.layout (LayoutSettings)
     AppLayout  → app_layout  → sidebar | header
     AuthLayout → auth_layout → card | simple | split
```

The `layout` values are built by `LayoutService::getLayoutSettings()` from these sources:

| Setting | Source |
| --- | --- |
| Global default | Setup → Layout (row with no user) |
| `app_layout`, `sidebar_variant`, `sidebar_collapsible` | The user's own Settings → Layout if they've saved one, otherwise the global default |
| `auth_layout` | Always the global default |

The backend side is explained in [Navigation & layouts](/docs/core/navigation-and-layouts).

## App layouts

`AppLayout.vue` has a single prop, `breadcrumbs?: BreadcrumbItem[]`, and renders one of two shells:

| `app_layout` | Component | Structure |
| --- | --- | --- |
| `sidebar` (default) | `layouts/app/AppSidebarLayout.vue` | `AppSidebar` + `AppSidebarHeader` (breadcrumbs) + content |
| `header` | `layouts/app/AppHeaderLayout.vue` | `AppHeader` top navigation (menus + breadcrumbs) + content |

Each shell also mounts the `Toaster` (vue-sonner) and the global `ConfirmDialog`.

The sidebar shell looks at two extra settings:

| Setting | Values | Default |
| --- | --- | --- |
| `sidebar_variant` | `inset`, `sidebar`, `floating` | `inset` |
| `sidebar_collapsible` | `icon`, `offcanvas`, `none` | `icon` |

It shows `menus` in the sidebar, switching to `setupMenus` while you're under `/setup`.

Settings pages are a special case. `settings/*` pages get `[AppLayout, SettingsLayout]`, so `layouts/settings/Layout.vue` adds the Profile / Security / Appearance / Layout sub-navigation inside the app shell. It works out the active item with `useCurrentUrl().isCurrentOrParentUrl`.

::: tip
If you add something app-wide, like a banner, put it in both `AppSidebarLayout.vue` and `AppHeaderLayout.vue`. Otherwise it disappears when someone switches between sidebar and header mode.
:::

## Auth layouts

`AuthLayout.vue` takes `title` and `description` as translation keys and translates them itself. It renders one of three designs:

| `auth_layout` | Component | Look |
| --- | --- | --- |
| `card` (default) | `layouts/auth/AuthCardLayout.vue` | Logo above a centred card on a muted background |
| `simple` | `layouts/auth/AuthSimpleLayout.vue` | Logo, title and form on a plain background |
| `split` | `layouts/auth/AuthSplitLayout.vue` | Dark left panel with logo and app `name`, form on the right |

## Per-page layout override

With `defineOptions`, a page can pass props to its default layout or swap the layout out entirely:

```vue
<script setup lang="ts">
defineOptions({
    layout: {
        breadcrumbs: [
            { title: 'modules.common.nav.dashboard', href: dashboard() },
            { title: 'modules.user.breadcrumbs.users', href: index() },
        ],
    },
});
</script>
```

| Goal | `layout` value | Used by |
| --- | --- | --- |
| Breadcrumbs on an app page | `{ breadcrumbs: [...] }` (titles are translation keys) | Most app pages |
| Title and description on an auth page | `{ title: 'modules.auth.login.title', description: '...' }` | Auth pages |
| No layout (full screen) | `[]` | `Home.vue`, `auth/Maintenance.vue`, `auth/Suspended.vue` |
| Layout chosen from props | `(props: PageProps) => (props.auth.user ? AppLayout : AuthLayout)` | `errors/Error.vue` |

### Changing layout props at runtime

`defineOptions` can't change after the page loads. If a value depends on state, call `setLayoutProps()` instead. `TwoFactorChallenge.vue` does this to change the title when the user switches to a recovery code, and `AcceptInvitation.vue` calls it once when `mode === 'user'` so the user-invitation wording shows.

::: details View setLayoutProps example
```ts
import { setLayoutProps } from '@inertiajs/vue3';
import { watchEffect } from 'vue';

watchEffect(() => {
    setLayoutProps({
        title: authConfigContent.value.title,
        description: authConfigContent.value.description,
    });
});
```
:::

::: details View layout chosen per request (errors/Error.vue)
```vue
<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import AuthLayout from '@/layouts/AuthLayout.vue';

defineOptions({
    layout: (props: PageProps) => (props.auth.user ? AppLayout : AuthLayout),
});
</script>
```
:::
