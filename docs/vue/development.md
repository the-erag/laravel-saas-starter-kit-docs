---
title: "Vue Kit Development Workflow"
description: "Daily commands for the Vue kit and step-by-step guides to adding a page and a form, plus type checking with vue-tsc and linting with ESLint and Prettier."
---

# Development <Badge type="tip" text="Vue" />

## Daily workflow

| Command | What it does |
| --- | --- |
| `composer dev` | Runs `php artisan dev`: Laravel server, queue listener, Pail logs and Vite together |
| `npm run dev` | Vite dev server with HMR (also regenerates Wayfinder files) |
| `npm run build` | Production build to `public/build` |
| `npm run build:ssr` | Client and SSR bundle (`vite build && vite build --ssr`) |
| `npm run lint` | `eslint .` + `prettier --check resources/` + `vue-tsc --noEmit` |
| `npm run lint:fix` | `eslint . --fix` + `prettier --write resources/` + `vue-tsc --noEmit` |
| `composer lint` | Pint, `wayfinder:generate --with-form`, `typescript:transform`, `npm run lint:fix` |
| `composer test` | Lint check, PHPStan (Larastan), then `php artisan test` |
| `php artisan erag:generate-lang` | Export `lang/*` to `resources/js/lang/*.json` |

The complete list is in [Commands](/docs/reference/commands).

::: tip
If a change isn't showing up in the browser, make sure `npm run dev` (or `composer dev`) is running, or run `npm run build`.
:::

## Adding a page

Let's say you want a Reports page in the Dashboard module, served at `/reports`. The request goes like this:

```text
Modules/Dashboard/routes/web.php → ReportController@index
  → Inertia::render('reports/Index') → resources/js/pages/reports/Index.vue
```

1. Add the route to `Modules/Dashboard/routes/web.php`, inside the `auth` + `verified` group, with `->middleware('permission:View Reports|View Tenant Reports')` and `->name('reports.index')`.
2. Create the controller at `Modules/Dashboard/Http/Controllers/ReportController.php` and have it return `Inertia::render('reports/Index', [...])`. Keep it thin; any business logic belongs in `Modules/<Module>/Services`.
3. Create the page at `resources/js/pages/reports/Index.vue` (the file is PascalCase, the folder lowercase). Breadcrumbs go in `defineOptions({ layout: { breadcrumbs } })`, and the title goes in `<Head>`.
4. Once Wayfinder has run, you can import `@/routes/reports`. `npm run dev` regenerates it for you; if that isn't running, use `php artisan wayfinder:generate --with-form`.
5. Add the translation keys to `lang/<locale>/modules/dashboard.php` for each locale, then run `php artisan erag:generate-lang`.
6. Add `View Reports` to `config/permissions/dashboard.php` and `View Tenant Reports` to `config/permissions/tenant/dashboard.php`, then seed them.
7. If you want a menu item, add an entry to `database/seeders/MenuSeeder.php` (and `database/seeders/tenant/MenuSeeder.php`) with `'route_name' => 'reports.index'` and the permission. This step is optional.

The page itself doesn't need much:

```vue
<script setup lang="ts">
defineOptions({
    layout: {
        breadcrumbs: [{ title: 'modules.dashboard.reports.title', href: index() }],
    },
});

defineProps<{ reports: { id: number; name: string }[] }>();

const { __ } = vueLang();
</script>
```

::: details View route and controller
```php
// Modules/Dashboard/routes/web.php
use Modules\Dashboard\Http\Controllers\ReportController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('reports', [ReportController::class, 'index'])
        ->middleware('permission:View Reports|View Tenant Reports')
        ->name('reports.index');
});
```

```php
// Modules/Dashboard/Http/Controllers/ReportController.php
namespace Modules\Dashboard\Http\Controllers;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('reports/Index', [
            'reports' => [],
        ]);
    }
}
```
:::

::: details View full page
```vue
<script setup lang="ts">
import { vueLang } from '@erag/lang-sync-inertia/vue';
import { Head } from '@inertiajs/vue3';
import Heading from '@/components/Heading.vue';
import { dashboard } from '@/routes';
import { index } from '@/routes/reports';

defineOptions({
    layout: {
        breadcrumbs: [
            { title: 'modules.common.nav.dashboard', href: dashboard() },
            { title: 'modules.dashboard.reports.title', href: index() },
        ],
    },
});

defineProps<{
    reports: { id: number; name: string }[];
}>();

const { __ } = vueLang();
</script>

<template>
    <Head :title="__('modules.dashboard.reports.title')" />

    <div class="space-y-6 px-4 py-6">
        <Heading
            :title="__('modules.dashboard.reports.title')"
            :description="__('modules.dashboard.reports.description')"
        />
    </div>
</template>
```
:::

::: details View translations, permissions and seeding
```php
// lang/en/modules/dashboard.php (repeat for every locale)
'reports' => [
    'title' => 'Reports',
    'description' => 'Exported analytics reports.',
],
```

```php
// config/permissions/dashboard.php
[
    'permission_name' => 'View Reports',
    'associated_roles' => ['Super Admin', 'Admin'],
],

// config/permissions/tenant/dashboard.php
[
    'permission_name' => 'View Tenant Reports',
    'associated_roles' => ['Super Admin', 'Admin'],
],
```

```bash
php artisan erag:generate-lang
php artisan db:seed --class=PermissionSeeder
php artisan tenants:seed --class="Database\Seeders\PermissionSeeder"
php artisan db:seed --class=MenuSeeder
```

After that, the keys work as `__('modules.dashboard.reports.title')` in Vue. In PHP you use the slash form: `__('modules/dashboard.reports.title')`. Menu titles are translated separately, from the `nav.<slug>` keys in `lang/<locale>/modules/common.php`.

Anyone who gets a system role from now on receives the permission through `associated_roles`. For users who already exist, grant it from Users → Assign permissions. To hide actions inside the page, use `usePermission().can('View Reports', 'View Tenant Reports')` (see [Architecture → Permissions](/docs/vue/architecture#permissions-on-the-frontend)).

Roles and tenant seeding are covered in more depth in [Users, roles & permissions](/docs/core/users-roles-permissions).
:::

::: details View a feature test
```php
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

test('users with the permission can visit the reports page', function () {
    $user = User::factory()->create();
    $user->givePermissionTo(Permission::findOrCreate('View Reports', 'web'));

    $this->actingAs($user)
        ->get(route('reports.index'))
        ->assertInertia(fn (Assert $page) => $page->component('reports/Index'));
});
```

```bash
php artisan test --compact --filter=reports
```

Because `testing.ensure_pages_exist` is turned on in `config/inertia.php`, this test fails when `reports/Index.vue` doesn't exist.
:::

## Adding a form

A form posts to a controller through Inertia. If validation fails you get the messages back in `errors`; if it succeeds, the controller usually redirects with a flash toast.

```text
<Form v-bind="store.form()"> → Controller (Form Request or Data class validates)
  → Service → Inertia::flash('toast', …) → redirect
```

1. On the backend, add a route and a controller action. Validate with a Form Request or a Data class (`UserController::store` uses `UserData`, for example), then call a service, flash a toast and redirect.
2. Import the Wayfinder function for the route: `import { store } from '@/routes/reports'`.
3. Spread `store.form()` into `<Form>`, and take `errors` and `processing` from its slot.
4. Add the fields with `Common*` components, giving each a `name` and `:error`. You don't need `v-model`.

```vue
<Form v-bind="store.form()" reset-on-success v-slot="{ errors, processing }">
    <CommonInput name="name" :label="__('modules.dashboard.reports.name')" :error="errors.name" />
    <CommonButton type="submit" :loading="processing">
        {{ __('modules.common.actions.save_changes') }}
    </CommonButton>
</Form>
```

For edit forms, create/edit modals and `useForm`, head over to [Inertia → Forms](/docs/vue/inertia#forms).

## Type checking & linting

| Command | When |
| --- | --- |
| `npx vue-tsc --noEmit` | Type check only |
| `npm run lint` | Check ESLint, Prettier and types without changing files |
| `npm run lint:fix` | Fix what can be fixed, then type check. Run before committing |
| `composer lint` | Regenerate Wayfinder and TypeScript types, then run all PHP and frontend fixers |

ESLint wants `import type` for type-only imports, ordered imports, 1TBS braces and blank lines around control statements. The types for Data classes come from `@/types/Modules/<Module>/Data`, which `php artisan typescript:transform` generates.

::: warning
Until Wayfinder has generated `@/routes` and `@/actions`, `vue-tsc` will fail on those imports. Run `npm run dev`, `npm run build` or `composer lint` first.
:::

## Conventions

- Don't hard-code text. Every string the user sees goes through `__()` with a `modules.<feature>.<key>` key, and that includes breadcrumbs, placeholders, toasts and confirm dialogs.
- Don't write code comments; give things clear names instead (`.ai/rules/general.md`).
- Build fields and buttons with the `Common*` components, and ask before destructive actions with `useConfirmDialog()`.
- Use Wayfinder rather than hard-coded URLs, and `.form()` with `<Form>`.
- Type everything. Take generated types from `@/types/Modules/...` and use `import type` for type-only imports.
- Put composables in `composables/useX.ts`, and page-only components in that page's `Partials/` folder.
