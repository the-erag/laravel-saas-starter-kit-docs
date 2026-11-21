---
title: "Vue Kit Development Workflow"
description: "Daily commands for the Vue kit and step-by-step guides to adding a page and a form, plus type checking with vue-tsc and linting with ESLint and Prettier."
---

# Development <Badge type="tip" text="Vue" />

This page covers the commands you run every day, then walks through adding a page and a form from start to finish.

## Daily workflow

Run `composer dev` to start everything, then work in `resources/js` and `Modules/`. While you edit, Vite reloads the browser and keeps the Wayfinder files up to date.

| Command | What it does |
| --- | --- |
| `composer dev` | Runs `php artisan dev`: Laravel server, queue listener, Pail logs and Vite together |
| `npm run dev` | Vite dev server with HMR (also regenerates Wayfinder files) |
| `npm run build` | Production build to `public/build` |
| `npm run build:ssr` | Client and SSR bundle (`vite build && vite build --ssr`) |
| `php artisan erag:generate-lang` | Export `lang/*` to `resources/js/lang/*.json` |
| `php artisan wayfinder:generate --with-form` | Regenerate Wayfinder files without Vite running |

The full list is on the [Commands](/docs/reference/commands) page. Lint and type-check commands are under [Type checking & linting](#type-checking-linting).

::: tip
Change not showing up in the browser? Make sure `npm run dev` (or `composer dev`) is running, or run `npm run build`.
:::

## Adding a page

Say you want a Reports page in the Dashboard module, served at `/reports`:

<FlowDiagram label="Adding a page" :nodes="[
  { label: 'Route', note: '`Modules/Dashboard/routes/web.php`' },
  { label: 'Controller', note: '`ReportController@index`' },
  { label: '`Inertia::render()`', note: '`reports/Index`' },
  { label: 'Page', note: '`resources/js/pages/reports/Index.vue`' },
]" />

1. Add the route to `Modules/Dashboard/routes/web.php`, inside the `auth` + `verified` group, with `->middleware('permission:View Reports|View Tenant Reports')` and `->name('reports.index')`.
2. Create the controller at `Modules/Dashboard/Http/Controllers/ReportController.php` and return `Inertia::render('reports/Index', [...])`. Keep it thin: business logic belongs in `Modules/<Module>/Services`.
3. Create the page at `resources/js/pages/reports/Index.vue` (PascalCase file, lowercase folder). Set the breadcrumbs in `defineOptions({ layout: { breadcrumbs } })` and the title in `<Head>`.
4. Once Wayfinder has run, you can import `@/routes/reports`. `npm run dev` regenerates it for you. If that isn't running, use `php artisan wayfinder:generate --with-form`.
5. Add the translation keys to `lang/<locale>/modules/dashboard.php` for each locale, then run `php artisan erag:generate-lang`.
6. Add `View Reports` to `config/permissions/dashboard.php` and `View Tenant Reports` to `config/permissions/tenant/dashboard.php`, then seed them.
7. Optional: for a menu item, add an entry to `database/seeders/MenuSeeder.php` (and `database/seeders/tenant/MenuSeeder.php`) with `'route_name' => 'reports.index'` and the permission.

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

In Vue you then write `__('modules.dashboard.reports.title')`. In PHP, use the slash form: `__('modules/dashboard.reports.title')`. Menu titles come from the `nav.<slug>` keys in `lang/<locale>/modules/common.php`.

Anyone who gets a system role after this gets the permission through `associated_roles`. For existing users, grant it from **Users → Assign permissions**. To hide actions inside the page, use `usePermission().can('View Reports', 'View Tenant Reports')` (see [Architecture → Permissions](/docs/vue/architecture#permissions-on-the-frontend)).

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

Since `config/inertia.php` turns on `testing.ensure_pages_exist`, the test fails if `reports/Index.vue` doesn't exist.
:::

## Adding a form

A form posts straight to a Laravel route through Inertia. If validation fails, the messages come back in `errors`. If it succeeds, the controller usually redirects with a flash toast.

<FlowDiagram label="Form submit" :nodes="[
  { label: '`<Form>`', note: '`v-bind` with `store.form()`' },
  { label: 'Controller', note: 'Form Request or Data class validates' },
  'Service',
  { label: 'Flash toast', note: '`Inertia::flash(\'toast\', …)`' },
  'Redirect',
]" />

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

For edit forms, create/edit modals and `useForm`, see [Inertia → Forms](/docs/vue/inertia#forms).

## Type checking & linting

| Command | What it does |
| --- | --- |
| `npm run lint` | `eslint .` + `prettier --check resources/` + `vue-tsc --noEmit` |
| `npm run lint:fix` | `eslint . --fix` + `prettier --write resources/` + `vue-tsc --noEmit` |
| `npx vue-tsc --noEmit` | Type check only |
| `composer lint` | Pint, `wayfinder:generate --with-form`, `typescript:transform`, `npm run lint:fix` |
| `composer test` | Lint check, PHPStan (Larastan), then `php artisan test` |

Run `npm run lint:fix` before you commit. The ESLint rules are listed in [Architecture → Folder map](/docs/vue/architecture#folder-map).

::: warning
Until Wayfinder has generated `@/routes` and `@/actions`, `vue-tsc` will fail on those imports. Run `npm run dev`, `npm run build` or `composer lint` first.
:::

## Conventions

- Don't hard-code text. Every string the user sees goes through `__()` with a `modules.<feature>.<key>` key, and that includes breadcrumbs, placeholders, toasts and confirm dialogs.
- Don't write code comments. Use clear names instead (`.ai/rules/general.md`).
- Build fields and buttons with the `Common*` components, and ask before destructive actions with `useConfirmDialog()`.
- Get URLs from Wayfinder rather than typing them out, and pair `.form()` with `<Form>`.
- Type everything. Data objects use the generated types from `@/types/Modules/...` (from `php artisan typescript:transform`), and type-only imports use `import type`.
- Put composables in `composables/useX.ts`, and page-only components in that page's `Partials/` folder.

<RelatedPages :links="[
  { text: 'Inertia', link: '/docs/vue/inertia', desc: 'Form props, visits, flash toasts and Wayfinder routes.' },
  { text: 'Architecture → Generated files', link: '/docs/vue/architecture#generated-files', desc: 'What Wayfinder, typescript:transform and erag:generate-lang write for you.' },
  { text: 'Testing', link: '/docs/core/testing', desc: 'More on feature tests like the one for the Reports page.' },
]" />
