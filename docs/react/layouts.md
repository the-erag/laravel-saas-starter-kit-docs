---
title: "React Kit Layouts"
description: "How the React kit picks app and sign-in layouts from Setup defaults and user settings, the sidebar and header layouts, and per-page layout overrides."
---

# Layouts <Badge type="tip" text="React" />

This page shows how a page ends up in the sidebar, header or sign-in layout, and how a single page can change that.

The layouts are in `resources/js/layouts`. `AppLayout` and `AuthLayout` are wrappers that pick the real design at runtime from the shared `layout` prop, so a page never imports a specific variant.

## Layout selection flow

```text
Setup → Layout (global default)
  → Settings → Layout (user override, not the auth layout)
  → LayoutService → shared `layout` prop
  → app.tsx picks AppLayout / AuthLayout by page name
  → AppLayout / AuthLayout render the chosen variant
```

1. On **Setup → Layout**, an admin picks the global defaults: app layout, sidebar variant, collapsible mode and auth layout.
2. Each user can change their own app layout, sidebar variant and collapsible mode on **Settings → Layout**. They can't change the auth layout, which always follows the global default.
3. The backend sends the result to the frontend as the `layout` prop (`LayoutSettings`).
4. In `app.tsx`, `auth/*` pages get `AuthLayout`, `settings/*` pages get `[AppLayout, SettingsLayout]` and the rest get `AppLayout` (see [Architecture → Overview](/docs/react/architecture#overview)).

For the backend side, see [Navigation & layouts](/docs/core/navigation-and-layouts).

## App layouts

<DocShot name="react-app-sidebar" alt="The Users page in the React kit with the sidebar app layout: menu on the left, breadcrumbs and header actions along the top" caption="The default sidebar app layout." />

`app-layout.tsx` takes one prop, `breadcrumbs?: BreadcrumbItem[]`, and renders one of two shells, based on `layout.app_layout`:

| `app_layout` | Component | Structure |
| --- | --- | --- |
| `sidebar` (default) | `app/app-sidebar-layout.tsx` | `AppSidebar` + `AppSidebarHeader` (breadcrumbs) + content |
| `header` | `app/app-header-layout.tsx` | `AppHeader` top navigation (menus + breadcrumbs) + content |

Each shell mounts the global `ConfirmDialog`. The sonner `Toaster` and `TooltipProvider` aren't here: `app.tsx` adds them once for every page in `withApp`.

The sidebar shell has two extra settings:

| Setting | Values | Default |
| --- | --- | --- |
| `sidebar_variant` | `inset`, `sidebar`, `floating` | `inset` |
| `sidebar_collapsible` | `icon`, `offcanvas`, `none` | `icon` |

Normally the sidebar shows `menus`. When the URL starts with `/setup`, it shows `setupMenus` instead.

Settings pages add one more layer. `settings/*` pages get `[AppLayout, SettingsLayout]`, so `settings/layout.tsx` draws the Profile / Security / Appearance / Layout sub-navigation inside the app shell. It highlights the active item with `useCurrentUrl().isCurrentOrParentUrl`.

::: tip
Want something on every app page, like a banner? Add it to both `app-sidebar-layout.tsx` and `app-header-layout.tsx`. If it should show on auth pages too, put it in `withApp` in `app.tsx` instead.
:::

## Auth layouts

<DocShot name="react-auth-split" alt="The React kit login page in the split auth layout: dark panel with the logo on the left, sign-in form on the right" caption="The split auth layout on the login page." />

`auth-layout.tsx` takes `title` and `description` as translation keys and translates them itself. It renders one of three designs, based on `layout.auth_layout`:

| `auth_layout` | Component | Look |
| --- | --- | --- |
| `card` (default) | `auth/auth-card-layout.tsx` | Logo above a centred card on a muted background |
| `simple` | `auth/auth-simple-layout.tsx` | Logo, title and form on a plain background |
| `split` | `auth/auth-split-layout.tsx` | Dark left panel with logo and app `name`, form on the right |

## Per-page layout override

Each page can control its layout with a static `layout` property:

| Goal | Set `Page.layout` to | Used by |
| --- | --- | --- |
| Pass props to the default layout | An object: `{ breadcrumbs }` or `{ title, description }` | Most pages |
| Change layout props at runtime | Call `setLayoutProps({...})` in an effect | `two-factor-challenge.tsx`, `accept-invitation.tsx` |
| No layout (full screen) | `[] as never[]` | `home.tsx`, `auth/maintenance.tsx`, `auth/suspended.tsx` |
| Pick a layout from props | A function returning a layout | `errors/error.tsx` |

An app page sets its breadcrumbs like this. The titles are translation keys, and `breadcrumbs.tsx` translates them:

```tsx
UsersIndex.layout = {
    breadcrumbs: [
        { title: 'modules.common.nav.dashboard', href: dashboard() },
        { title: 'modules.user.breadcrumbs.users', href: index() },
    ],
};
```

::: details View other override examples
Setting the title and description on an auth page:

```tsx
Login.layout = {
    title: 'modules.auth.login.title',
    description: 'modules.auth.login.description',
};
```

Changing the title at runtime with `setLayoutProps`. `two-factor-challenge.tsx` uses it to swap the title when the user switches to a recovery code. `accept-invitation.tsx` does the same when `mode === 'user'`, so the wording fits a user invitation.

```tsx
import { setLayoutProps } from '@inertiajs/react';

useEffect(() => {
    setLayoutProps({
        title: authConfigContent.title,
        description: authConfigContent.description,
    });
}, [authConfigContent.title, authConfigContent.description]);
```

Turning the layout off:

```tsx
Home.layout = [] as never[];
```

Choosing the layout per request. Signed-in users see the error page in the app shell, and guests get the auth layout:

```tsx
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';

ErrorPage.layout = (props: PageProps) =>
    props.auth.user ? AppLayout : AuthLayout;
```
:::

::: details View layouts folder
```text
layouts/
├── app-layout.tsx         # chooses app/app-sidebar-layout.tsx or app/app-header-layout.tsx
├── auth-layout.tsx        # chooses auth/auth-card-layout.tsx, auth-simple-layout.tsx or auth-split-layout.tsx
├── app/
│   ├── app-sidebar-layout.tsx
│   └── app-header-layout.tsx
├── auth/
│   ├── auth-card-layout.tsx
│   ├── auth-simple-layout.tsx
│   └── auth-split-layout.tsx
└── settings/layout.tsx    # Profile / Security / Appearance / Layout sub-navigation
```
:::

<RelatedPages :links="[
  { text: 'Navigation & layouts', link: '/docs/core/navigation-and-layouts', desc: 'The backend side: LayoutService, menus and the layout settings.' },
  { text: 'Pages', link: '/docs/react/pages', desc: 'Which layout each page uses.' },
  { text: 'Components', link: '/docs/react/components#app-shell-components', desc: 'The sidebar, header and breadcrumb components inside the shells.' },
]" />
