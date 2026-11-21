---
title: "Svelte Kit Layouts"
description: "How the Svelte kit picks app and sign-in layouts from Setup defaults and user settings, the sidebar and header layouts, and per-page layout overrides."
---

# Layouts <Badge type="tip" text="Svelte" />

The layout files are in `resources/js/layouts`. Each page gets a default layout from `app.ts`, chosen by the page name (see [Architecture](/docs/svelte/architecture#overview)). A page can pass props to that layout or swap it for another one.

<DocShot name="svelte-setup-layout" alt="The Setup → Layout page in the Svelte kit, with pickers for the app layout, sidebar variant and sign-in layout" />

## Layout selection flow

The server decides which shell a user gets. The client reads that choice from the shared `layout` prop (`LayoutSettings`):

```text
Setup → Layout (global default, incl. auth layout)
  → Settings → Layout (user's own app layout, sidebar variant, collapsible mode)
  → LayoutService::getLayoutSettings() → shared `layout` prop
  → AppLayout.svelte / AuthLayout.svelte pick the matching component
```

- A user's own saved setting overrides the global default.
- `auth_layout` is the exception. Auth pages show before anyone logs in, so it always uses the global default.

How menus and layout settings work on the server is covered in [Navigation & layouts](/docs/core/navigation-and-layouts).

## App layouts

`AppLayout.svelte` accepts `breadcrumbs?: BreadcrumbItem[]` and a `children` snippet. It looks at `page.props.layout.app_layout` and renders one of two shells:

| `app_layout` | Component | Structure |
| --- | --- | --- |
| `sidebar` (default) | `app/AppSidebarLayout.svelte` | `AppSidebar` + `AppSidebarHeader` (breadcrumbs) + content |
| `header` | `app/AppHeaderLayout.svelte` | `AppHeader` top navigation (menus + breadcrumbs) + content |

Each shell also mounts the `Toaster` (svelte-sonner) and the global `ConfirmDialog`.

In the sidebar shell, `AppSidebar` reads two extra settings:

| Setting | Values | Default |
| --- | --- | --- |
| `sidebar_variant` | `inset`, `sidebar`, `floating` | `inset` |
| `sidebar_collapsible` | `icon`, `offcanvas`, `none` | `icon` |

The sidebar lists `menus`. While the URL starts with `/setup`, it shows `setupMenus` instead.

**Settings layout.** Pages under `settings/*` get `[AppLayout, SettingsLayout]`, so `layouts/settings/Layout.svelte` draws the Profile / Security / Appearance / Layout sub-navigation inside the app shell. It finds the active item with `isCurrentOrParentUrl` from `lib/currentUrl.svelte.ts`.

::: tip
To add something app-wide, like a banner, put it in both `AppSidebarLayout.svelte` and `AppHeaderLayout.svelte`. Otherwise it disappears when someone switches between sidebar and header mode.
:::

## Auth layouts

`AuthLayout.svelte` accepts a `title` and a `description`. Pass translation keys for both; the layout translates them. Based on `page.props.layout.auth_layout`, it renders one of three designs:

| `auth_layout` | Component | Look |
| --- | --- | --- |
| `card` (default) | `auth/AuthCardLayout.svelte` | Logo above a centred card on a muted background |
| `simple` | `auth/AuthSimpleLayout.svelte` | Logo, title and form on a plain background |
| `split` | `auth/AuthSplitLayout.svelte` | Dark left panel with logo and app `name`, form on the right |

<DocShot name="svelte-auth-split" alt="The Svelte kit sign-in page with the split auth layout: dark panel on the left, form on the right" />

## Per-page layout override

To change its layout, a page exports `layout` from its `<script module>` block. Anything the layout object imports, such as Wayfinder routes, goes in that same block.

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

When a value depends on state, call `setLayoutProps()` from the page instead. Two pages do this: `TwoFactorChallenge.svelte` changes the title when the user switches to a recovery code, and `AcceptInvitation.svelte` calls it when `mode === 'user'` to show the user-invitation wording.

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

<RelatedPages :links="[
  { text: 'Navigation & layouts', link: '/docs/core/navigation-and-layouts', desc: 'How menus and layout settings work on the server.' },
  { text: 'Components', link: '/docs/svelte/components#app-shell-components', desc: 'The sidebar, header and other shell components.' },
  { text: 'Pages', link: '/docs/svelte/pages', desc: 'Which layout each page uses.' },
]" />
