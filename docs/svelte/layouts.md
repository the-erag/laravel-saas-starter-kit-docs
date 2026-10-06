---
title: "Svelte Kit Layouts"
description: "How the Svelte kit picks app and sign-in layouts from Setup defaults and user settings, the sidebar and header layouts, and per-page layout overrides."
---

# Layouts <Badge type="tip" text="Svelte" />

The layout files are in `resources/js/layouts`. Each page gets a default layout from `app.ts`, chosen by the page name (see [Architecture](/docs/svelte/architecture#overview)). From there, a page can pass props to that layout or swap it for another one.

## Layout selection flow

The server decides which shell a user gets. The client then reads that choice from the shared `layout` prop (`LayoutSettings`):

```text
Setup → Layout (global default, incl. auth layout)
  → Settings → Layout (user's own app layout, sidebar variant, collapsible mode)
  → LayoutService::getLayoutSettings() → shared `layout` prop
  → AppLayout.svelte / AuthLayout.svelte pick the matching component
```

- If a user has saved their own setting, it beats the global default.
- `auth_layout` is the exception. Auth pages appear before anyone has logged in, so it always uses the global default.

For more on how menus and layout settings work, read [Navigation & layouts](/docs/core/navigation-and-layouts).

## App layouts

`AppLayout.svelte` accepts `breadcrumbs?: BreadcrumbItem[]` and a `children` snippet. It looks at `page.props.layout.app_layout` and renders one of two shells:

| `app_layout` | Component | Structure |
| --- | --- | --- |
| `sidebar` (default) | `app/AppSidebarLayout.svelte` | `AppSidebar` + `AppSidebarHeader` (breadcrumbs) + content |
| `header` | `app/AppHeaderLayout.svelte` | `AppHeader` top navigation (menus + breadcrumbs) + content |

Each shell also mounts the `Toaster` (svelte-sonner) and the global `ConfirmDialog`.

When you're in the sidebar shell, `AppSidebar` looks at two extra settings:

| Setting | Values | Default |
| --- | --- | --- |
| `sidebar_variant` | `inset`, `sidebar`, `floating` | `inset` |
| `sidebar_collapsible` | `icon`, `offcanvas`, `none` | `icon` |

Usually the sidebar lists `menus`. Once the URL starts with `/setup`, it switches to `setupMenus`.

**Settings layout.** Pages under `settings/*` get `[AppLayout, SettingsLayout]`. That lets `layouts/settings/Layout.svelte` draw the Profile / Security / Appearance / Layout sub-navigation inside the app shell. To work out which item is active, it uses `isCurrentOrParentUrl` from `lib/currentUrl.svelte.ts`.

::: tip
Want to wrap the whole app in something else, like a banner? Add it to `AppSidebarLayout.svelte` and to `AppHeaderLayout.svelte`. Otherwise it disappears when someone switches between sidebar and header mode.
:::

## Auth layouts

`AuthLayout.svelte` accepts a `title` and a `description`. Pass translation keys for both, and the layout translates them for you. Based on `page.props.layout.auth_layout`, it renders one of three designs:

| `auth_layout` | Component | Look |
| --- | --- | --- |
| `card` (default) | `auth/AuthCardLayout.svelte` | Logo above a centred card on a muted background |
| `simple` | `auth/AuthSimpleLayout.svelte` | Logo, title and form on a plain background |
| `split` | `auth/AuthSplitLayout.svelte` | Dark left panel with logo and app `name`, form on the right |

## Per-page layout override

To change its layout, a page exports `layout` from its `<script module>` block. Anything the layout object imports, such as Wayfinder routes, belongs in that same block.

```svelte
<script module lang="ts">
    import { dashboard } from '@/routes';
    import { index } from '@/routes/users';

    export const layout = {
        breadcrumbs: [
            { title: 'modules.common.nav.dashboard', href: dashboard() },
            { title: 'modules.user.breadcrumbs.users', href: index() },
        ],
    };
</script>
```

`layout` can take any of these forms:

| Value | Effect | Used by |
| --- | --- | --- |
| Object (`{ breadcrumbs }`, `{ title, description }`) | Props for the default layout. Breadcrumb and auth titles are translation keys. | Most pages |
| `[]` | No layout (full-screen page) | `Home.svelte`, `auth/Maintenance.svelte`, `auth/Suspended.svelte` |
| Function of the page props | Choose a layout per request | `errors/Error.svelte`: `AppLayout` for signed-in users, `AuthLayout` for guests |

When a value depends on state, call `setLayoutProps()` from the page instead. Two pages do this. `TwoFactorChallenge.svelte` changes the title once the user switches to a recovery code, and `AcceptInvitation.svelte` calls it when `mode === 'user'` so the user-invitation wording shows.

::: details View more examples
Title and description on an auth page:

```svelte
<script module lang="ts">
    export const layout = {
        title: 'modules.auth.login.title',
        description: 'modules.auth.login.description',
    };
</script>
```

No layout:

```svelte
<script module lang="ts">
    export const layout = [];
</script>
```

Layout chosen per request (error page):

```svelte
<script module lang="ts">
    import AppLayout from '@/layouts/AppLayout.svelte';
    import AuthLayout from '@/layouts/AuthLayout.svelte';

    export const layout = (props: PageProps) =>
        props.auth.user ? AppLayout : AuthLayout;
</script>
```

Changing layout props at runtime:

```ts
import { setLayoutProps } from '@inertiajs/svelte';

$effect(() => {
    setLayoutProps({
        title: authConfigContent.title,
        description: authConfigContent.description,
    });
});
```
:::
