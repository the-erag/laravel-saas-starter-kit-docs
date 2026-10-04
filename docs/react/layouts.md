---
title: "React Kit Layouts"
description: "How the React kit picks app and sign-in layouts from Setup defaults and user settings, the sidebar and header layouts, and per-page layout overrides."
head:
  - - link
    - rel: canonical
      href: https://saas-laravel.com/docs/react/layouts.html
  - - meta
    - property: og:title
      content: "React Kit Layouts"
  - - meta
    - property: og:description
      content: "How the React kit picks app and sign-in layouts from Setup defaults and user settings, the sidebar and header layouts, and per-page layout overrides."
  - - meta
    - property: og:url
      content: https://saas-laravel.com/docs/react/layouts.html
  - - meta
    - name: twitter:title
      content: "React Kit Layouts"
  - - meta
    - name: twitter:description
      content: "How the React kit picks app and sign-in layouts from Setup defaults and user settings, the sidebar and header layouts, and per-page layout overrides."
---

# Layouts <Badge type="tip" text="React" />

The layouts are in `resources/js/layouts`. `AppLayout` and `AuthLayout` are wrappers that choose the real design at runtime, so a page never has to import a specific variant.

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

For the backend side, read [Navigation & layouts](/docs/core/navigation-and-layouts).

## App layouts

`app-layout.tsx` accepts `breadcrumbs?: BreadcrumbItem[]` and, depending on `layout.app_layout`, renders one of two shells:

| `app_layout` | Component | Structure |
| --- | --- | --- |
| `sidebar` (default) | `app/app-sidebar-layout.tsx` | `AppSidebar` + `AppSidebarHeader` (breadcrumbs) + content |
| `header` | `app/app-header-layout.tsx` | `AppHeader` top navigation (menus + breadcrumbs) + content |

Each shell mounts the global `ConfirmDialog`. The sonner `Toaster` and `TooltipProvider` don't live here: `app.tsx` adds them once for every page in `withApp`.

The sidebar shell has two extra settings:

| Setting | Values | Default |
| --- | --- | --- |
| `sidebar_variant` | `inset`, `sidebar`, `floating` | `inset` |
| `sidebar_collapsible` | `icon`, `offcanvas`, `none` | `icon` |

Normally the sidebar shows `menus`. As soon as the URL starts with `/setup`, it shows `setupMenus` instead.

The settings pages add one more layer. `settings/layout.tsx` draws the Profile / Security / Appearance / Layout sub-navigation inside the app shell and uses `useCurrentUrl().isCurrentOrParentUrl` to highlight the active item.

::: tip
Want something on every app page, like a banner? Add it to both `app-sidebar-layout.tsx` and `app-header-layout.tsx`. If it should show on auth pages too, put it in `withApp` in `app.tsx` instead.
:::

## Auth layouts

`auth-layout.tsx` takes `title` and `description` as translation keys and translates them itself. Which of the three designs it renders depends on `layout.auth_layout`:

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

This is how an app page sets its breadcrumbs. The titles are translation keys, and `breadcrumbs.tsx` translates them:

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

Changing the title at runtime with `setLayoutProps`. When the user switches to a recovery code, `two-factor-challenge.tsx` swaps the title. `accept-invitation.tsx` does the same thing when `mode === 'user'`, so the wording fits a user invitation.

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

Choosing the layout per request. Signed-in users see the error page in the app shell, while guests get the auth layout:

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
