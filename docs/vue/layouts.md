---
title: "Vue Kit Layouts"
description: "How the Vue kit picks app and sign-in layouts from Setup defaults and user settings, the sidebar and header layouts, and per-page layout overrides."
---

# Layouts <Badge type="tip" text="Vue" />

This page shows how a page ends up in the sidebar, header or sign-in layout, and how a single page can change that.

The layouts are in `resources/js/layouts`. `AppLayout.vue` and `AuthLayout.vue` are wrappers that pick the real design at runtime from the shared `layout` prop, so a page never imports a specific variant.

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

`LayoutService::getLayoutSettings()` builds the `layout` values from these sources:

| Setting | Source |
| --- | --- |
| Global default | Setup → Layout (row with no user) |
| `app_layout`, `sidebar_variant`, `sidebar_collapsible` | The user's own Settings → Layout if they've saved one, otherwise the global default |
| `auth_layout` | Always the global default |

For the backend side, see [Navigation & layouts](/docs/core/navigation-and-layouts).

## App layouts

<DocShot name="vue-app-sidebar" alt="The Users page in the Vue kit with the sidebar app layout: menu on the left, breadcrumbs and header actions along the top" caption="The default sidebar app layout." />

`AppLayout.vue` has a single prop, `breadcrumbs?: BreadcrumbItem[]`, and renders one of two shells:

| `app_layout` | Component | Structure |
| --- | --- | --- |
| `sidebar` (default) | `layouts/app/AppSidebarLayout.vue` | `AppSidebar` + `AppSidebarHeader` (breadcrumbs) + content |
| `header` | `layouts/app/AppHeaderLayout.vue` | `AppHeader` top navigation (menus + breadcrumbs) + content |

Each shell also mounts the `Toaster` (vue-sonner) and the global `ConfirmDialog`.

The sidebar shell has two extra settings:

| Setting | Values | Default |
| --- | --- | --- |
| `sidebar_variant` | `inset`, `sidebar`, `floating` | `inset` |
| `sidebar_collapsible` | `icon`, `offcanvas`, `none` | `icon` |

Normally the sidebar shows `menus`. When the URL starts with `/setup`, it shows `setupMenus` instead.

Settings pages add one more layer. `settings/*` pages get `[AppLayout, SettingsLayout]`, so `layouts/settings/Layout.vue` draws the Profile / Security / Appearance / Layout sub-navigation inside the app shell. It highlights the active item with `useCurrentUrl().isCurrentOrParentUrl`.

::: tip
Want something on every app page, like a banner? Add it to both `AppSidebarLayout.vue` and `AppHeaderLayout.vue`. Otherwise it disappears when someone switches between sidebar and header mode.
:::

## Auth layouts

<DocShot name="vue-auth-split" alt="The Vue kit login page in the split auth layout: dark panel with the logo on the left, sign-in form on the right" caption="The split auth layout on the login page." />

`AuthLayout.vue` takes `title` and `description` as translation keys and translates them itself. It renders one of three designs, based on `auth_layout`:

| `auth_layout` | Component | Look |
| --- | --- | --- |
| `card` (default) | `layouts/auth/AuthCardLayout.vue` | Logo above a centred card on a muted background |
| `simple` | `layouts/auth/AuthSimpleLayout.vue` | Logo, title and form on a plain background |
| `split` | `layouts/auth/AuthSplitLayout.vue` | Dark left panel with logo and app `name`, form on the right |

## Per-page layout override

With `defineOptions`, a page can pass props to its default layout or replace the layout:

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

`defineOptions` is fixed once the page loads. If a value depends on state, call `setLayoutProps()` instead. `TwoFactorChallenge.vue` uses it to swap the title when the user switches to a recovery code. `AcceptInvitation.vue` calls it once when `mode === 'user'`, so the wording fits a user invitation.

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

<RelatedPages :links="[
  { text: 'Navigation & layouts', link: '/docs/core/navigation-and-layouts', desc: 'The backend side: LayoutService, menus and the layout settings.' },
  { text: 'Pages', link: '/docs/vue/pages', desc: 'Which layout each page uses.' },
  { text: 'Components', link: '/docs/vue/components#app-shell-components', desc: 'The sidebar, header and breadcrumb components inside the shells.' },
]" />
