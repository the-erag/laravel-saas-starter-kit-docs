---
title: "Database Menus & App Layouts"
description: "Database-driven menus with permission checks and drag-and-drop ordering, sidebar or header layouts, sign-in layouts and light or dark appearance."
---

# Navigation & layouts

## Database-driven menus

Menus live in the database, not hard-coded in components. That lets admins reorder them from the UI, and any item can require a permission. The central app and each tenant get their own menus, because there's a `menus` table in the central database and in every tenant database.

```text
menus table → MenuService (filters by permission) → `menus` / `setupMenus` props → sidebar or header
```

| Column | Purpose |
| --- | --- |
| `title` | Fallback label |
| `slug` | Unique key, also used for translation (`modules/common.nav.<slug>`) |
| `parent_slug` | Parent menu (one level of nesting) |
| `sort_order` | Order within its parent |
| `route_name` | Named route for the link (`route()` is used when the route exists) |
| `permission` | Permission required to see the item; empty = visible to everyone signed in |
| `active` | JSON list of extra route names that mark the item active (e.g. `tenants.show`) |
| `icon` | Iconify name, e.g. `lucide:building-2` |
| `is_setup` | `true` for items in the Setup section instead of the main sidebar |

**Related files**: `App\Models\Menu`, `Modules\Menu\Services\MenuService`.

### Default menus

| Central (`Database\Seeders\MenuSeeder`) | Tenant (`Database\Seeders\tenant\MenuSeeder`) |
| --- | --- |
| Dashboard | Dashboard |
| Tenants → All Tenants, Add Tenant, Domains | — |
| Users | Users |
| Roles | Roles |
| Setup → Menus, Layout Settings, Tenant Settings | Setup → Menus, Layout Settings |

### Adding a menu item

1. Add an entry to the menu seeder (central, tenant or both).
2. Run the seeder again.
3. If you want the label translated, add a `nav.projects` key to `lang/<locale>/modules/common.php`.

```php
[
    'slug' => 'projects',
    'title' => 'Projects',
    'parent_slug' => null,
    'sort_order' => 6,
    'route_name' => 'projects.index',
    'permission' => 'View Projects',
    'icon' => 'lucide:folder',
    'is_setup' => false,
],
```

```bash
php artisan db:seed --class=MenuSeeder
php artisan tenants:seed --class="Database\Seeders\tenant\MenuSeeder"
```

The seeders use `updateOrCreate` on `slug`, so it's safe to run them again.

### Reordering

Open Setup → Menus (`/setup/menus`) to change the order:

- Drag items to reorder them or move them under a different parent. Changes save automatically (`POST /setup/menus/reorder`).
- Reset runs the menu seeder again for the current context (`POST /setup/menus/reset`) and puts the default order and parents back.

| Action | Central permission | Tenant permission |
| --- | --- | --- |
| View | `View Navigation Menus` | `View Tenant Menus` |
| Reorder / reset | `Reorder Navigation Menus` | `Reorder Tenant Menus` |

Each kit uses its own drag and drop library: `vue-draggable-plus` (Vue), `sortablejs` (React, Svelte).

## Layout settings

Admins pick a default look for everyone, and each user can override it for their own account.

| Setting | Options | Default |
| --- | --- | --- |
| `app_layout` | `sidebar`, `header` (top navigation) | `sidebar` |
| `sidebar_variant` | `inset`, `sidebar`, `floating` | `inset` |
| `sidebar_collapsible` | `icon`, `offcanvas`, `none` | `icon` |
| `auth_layout` | `card`, `simple`, `split` | `card` |

| Level | Where | Who | Applies to |
| --- | --- | --- | --- |
| Personal | Settings → Layout (`/settings/layout`) | Every signed-in user | Their own app layout and sidebar options |
| Global default | Setup → Layout Settings (`/setup/layout`) | Users with `Update Layout Settings` or `Update Tenant Layout` | Guests and users without a personal setting |

::: info Auth pages always use the global default
`auth_layout` always comes from the global default. Auth pages are shown before anyone signs in, so there's no personal setting to use yet.
:::

Both levels live in `layout_settings`. The row with `user_id = null` is the global default, and rows with a `user_id` are personal overrides. `LayoutService::getLayoutSettings()` works out which settings apply and shares them as the `layout` prop.

### Layout components

| Layout | Vue files |
| --- | --- |
| App (switches on `app_layout`) | `layouts/AppLayout.vue` → `layouts/app/AppSidebarLayout.vue` or `AppHeaderLayout.vue` |
| Auth (switches on `auth_layout`) | `layouts/AuthLayout.vue` → `layouts/auth/AuthCardLayout.vue`, `AuthSimpleLayout.vue`, `AuthSplitLayout.vue` |
| Settings | `layouts/settings/Layout.vue` |

`app.ts` picks the layout from the page name:

```text
auth/*       → auth layout
settings/*   → app layout + settings layout
everything else → app layout
```

React and Svelte use the same structure with their own file names. The framework [layout guides](/docs/vue/layouts) cover the details.

## Appearance

Users switch between light, dark and system under Settings → Appearance (`/settings/appearance`). The choice is saved in two places:

| Stored in | Why |
| --- | --- |
| `localStorage` | Read by the frontend |
| `appearance` cookie (not encrypted) | `HandleAppearance` shares it with the Blade root view, so the right theme is applied before the page renders |

Whether the sidebar is open or closed is kept in the `sidebar_state` cookie and shared as `sidebarOpen`.
