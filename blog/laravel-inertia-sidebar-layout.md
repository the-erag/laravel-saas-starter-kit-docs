---
title: "Customize the Laravel Starter Kit Sidebar (shadcn + Inertia)"
description: "Customize the shadcn sidebar in a Laravel Inertia starter kit: inset or floating styles, icon collapse, a saved state and a layout per user."
pageClass: blog-page
date: 2026-10-28
author: erag
category: frontend
tags: [UI, Inertia]
---

# Customize the Laravel Starter Kit Sidebar: Variants, Collapse Modes and Per-User Layouts

<BlogPostMeta />

If you started your app from one of Laravel's official Vue, React or Svelte starter kits, you already have a sidebar. It uses the shadcn sidebar component, collapses to icons, and you can swap it for a header layout by changing one import. That's a great start. But a SaaS usually needs a bit more: a different look, a remembered open or closed state that doesn't jump on reload, a growing menu, and some users who simply prefer a top navigation bar.

This post shows how we take that sidebar further in our SaaS starter kit. Everything works the same with shadcn/ui (React), shadcn-vue and shadcn-svelte.

## What the shadcn sidebar is made of

The sidebar is a set of small components:

| Component | What it does |
| --- | --- |
| `SidebarProvider` | Keeps track of open or closed, and adds the keyboard shortcut |
| `Sidebar` | The panel itself, with `variant` and `collapsible` options |
| `SidebarHeader`, `SidebarContent`, `SidebarFooter` | The logo, the menu and the user menu |
| `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` | The menu items |
| `SidebarInset` | The main content next to the sidebar |
| `SidebarTrigger` | The button that opens and closes it |

On a phone, the same sidebar opens as a panel that slides in from the side, so you don't need to build a separate mobile menu.

## Pick a variant

The `variant` option changes how the sidebar sits next to your content:

| Variant | How it looks | Works well for |
| --- | --- | --- |
| `sidebar` | Runs edge to edge with a border | Busy admin screens |
| `inset` | Your content sits in a rounded card next to it | Modern SaaS dashboards |
| `floating` | The sidebar itself floats as a card with a small gap | Lighter, app-like designs |

The menu code is the same for all three, so trying a different look is a one-word change.

## Pick a collapse mode

The `collapsible` option decides what happens when the sidebar is closed:

- `icon` shrinks it to a narrow strip of icons. The labels turn into tooltips, so set the `tooltip` option on each `SidebarMenuButton`.
- `offcanvas` slides it fully out of view and gives the content the whole width.
- `none` keeps it open all the time.

Cmd+B (or Ctrl+B on Windows) opens and closes it, which people who live in your app will appreciate.

## The layout in Vue

Here's a short Vue layout. The React and Svelte versions use the same component names.

```vue
<script setup lang="ts">
import { usePage } from '@inertiajs/vue3';
import AppSidebar from '@/components/AppSidebar.vue';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

const page = usePage();
</script>

<template>
    <SidebarProvider :default-open="page.props.sidebarOpen">
        <AppSidebar variant="inset" collapsible="icon" />
        <SidebarInset>
            <header class="flex h-14 items-center gap-2 border-b px-4">
                <SidebarTrigger />
                <slot name="breadcrumbs" />
            </header>
            <main class="flex-1 p-4">
                <slot />
            </main>
        </SidebarInset>
    </SidebarProvider>
</template>
```

Use it as a [persistent Inertia layout](/blog/inertia-persistent-layouts.html). That way the sidebar keeps its scroll position and open sub-menus while people move between pages.

## Remember open or closed without the jump

The shadcn docs explain how to save the sidebar state in a cookie, but their examples are for Next.js. Here's how it works with Laravel and Inertia.

The sidebar already writes its state to a `sidebar_state` cookie whenever it changes. Read that cookie on the server and share it, so the very first render is already correct:

```php
// app/Http/Middleware/HandleInertiaRequests.php
public function share(Request $request): array
{
    return [
        ...parent::share($request),
        'sidebarOpen' => ! $request->hasCookie('sidebar_state')
            || $request->cookie('sidebar_state') === 'true',
    ];
}
```

The cookie is written by JavaScript, so Laravel shouldn't encrypt it:

```php
// bootstrap/app.php
$middleware->encryptCookies(except: ['sidebar_state']);
```

Without this, the sidebar loads open and then snaps shut a moment later. With it, the page loads exactly the way the user left it.

## Build the menu on the server

Don't hardcode menu items in your frontend. Build them in Laravel, hide the ones the user isn't allowed to see, mark the active one, and share the result as a prop. The sidebar then just shows what it gets. We go through this in [permission-based menus in Laravel and Inertia](/blog/laravel-inertia-permission-menus.html), and if admins should be able to reorder items, see [our drag and drop menu builder](/blog/laravel-drag-drop-menu-builder.html).

## Let every user choose their layout

People have strong opinions about layouts. Some want the classic sidebar, some want a top navigation bar, some like the floating look. Save the choice per user and fall back to a default your admins set:

```php
final class LayoutSettingService
{
    /**
     * @return array{app_layout: string, sidebar_variant: string, collapsible: string}
     */
    public function forUser(User $user): array
    {
        $defaults = LayoutSetting::system();

        return [
            'app_layout' => $user->layout?->app_layout ?? $defaults->app_layout,
            'sidebar_variant' => $user->layout?->sidebar_variant ?? $defaults->sidebar_variant,
            'collapsible' => $user->layout?->collapsible ?? $defaults->collapsible,
        ];
    }
}
```

Share the result as an Inertia prop and use it to pick the layout and its options. A settings page with small picture cards (Sidebar or Top nav, then Inset, Sidebar or Floating) makes the choice easy to understand.

## Offer a top navigation layout too

Apps with only a few pages often feel better with a top navigation bar. Keep both layouts reading from the same menu prop, so switching between them just means showing a different layout component. In the top-nav layout, show menu groups as dropdowns.

## Frequently asked questions

### Does the Laravel starter kit come with a collapsible sidebar?

Yes. Laravel's official Vue, React and Svelte starter kits use the shadcn sidebar with icon collapse, and also include a header layout. This post shows how to build on top of that.

### Which sidebar variant is best for a SaaS dashboard?

`inset` is a popular default because the content sits in a clean card. `sidebar` suits busy admin screens. If your users are a mix, let them choose.

### Why does my sidebar open and then close when the page loads?

The server doesn't know the saved state, so it renders the default first. Read the `sidebar_state` cookie in `HandleInertiaRequests`, pass it to `SidebarProvider`, and don't encrypt the cookie.

### Does the shadcn sidebar work on mobile?

Yes. On small screens it opens as a sliding panel over the content, using the same `SidebarTrigger`.

## The sidebar in the SaaS Laravel starter kit

[SaaS Laravel](/) builds on the official Laravel kits and takes the sidebar further, in Vue, React and Svelte:
- Sidebar and top-nav layouts.
- Inset, edge-to-edge and floating sidebar styles.
- Icon, off-canvas and always-open collapse modes.
- An open or closed state that doesn't jump on reload.
- Layout defaults set by admins under Setup, which each user can change in their own settings.

<BlogPostCta title="Sidebar, top nav or floating, already built" text="SaaS Laravel gives you every shadcn sidebar style and collapse mode plus per-user layout settings, in Vue, React or Svelte." />
