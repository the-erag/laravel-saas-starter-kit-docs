---
title: "Svelte Kit Development Workflow"
description: "Daily commands for the Svelte kit and step-by-step guides to adding a page and a form, plus type checking with svelte-check and linting with ESLint and Prettier."
---

# Development <Badge type="tip" text="Svelte" />

The commands you run every day in the Svelte kit, and how to add a new page or form from start to finish.

## Daily workflow

| Command | What it does |
| --- | --- |
| `composer dev` | Runs `php artisan dev`: Laravel server, queue listener, Pail logs and Vite together |
| `npm run dev` | Vite dev server with HMR; also regenerates Wayfinder files |
| `npm run build` | Production build to `public/build` |
| `npm run build:ssr` | Client and SSR bundle (`vite build && vite build --ssr`) |
| `php artisan erag:generate-lang` | Export `lang/*` to `resources/js/lang/*.json` |
| `php artisan wayfinder:generate --with-form` | Regenerate `@/routes` and `@/actions` without Vite running |

The complete list is in [Commands](/docs/reference/commands).

::: tip
Change not showing up in the browser? Make sure `npm run dev` (or `composer dev`) is running, or run `npm run build`.
:::

## Adding a page

This example adds a Reports page to the Dashboard module, served at `/reports`. The full code for each step is in the collapsible blocks below the list.

<FlowDiagram label="Adding a page" :nodes="[
  { label: 'Route', note: 'module `web.php`' },
  'Controller',
  { label: '`Inertia::render()`', note: '`reports/Index`' },
  { label: 'Page', note: '`resources/js/pages/reports/Index.svelte`' },
  'Translations',
  'Permission + menu',
  'Test',
]" />

1. Add the route to `Modules/Dashboard/routes/web.php`. It goes inside the `auth` + `verified` group, with the `permission:View Reports|View Tenant Reports` middleware and the name `reports.index`.
2. Create the controller at `Modules/Dashboard/Http/Controllers/ReportController.php`. Keep it thin and put business logic in `Modules/<Module>/Services`. It renders the page by its path under `resources/js/pages`, PascalCase in this kit: `Inertia::render('reports/Index', …)`.
3. Create the page at `resources/js/pages/reports/Index.svelte`. Breadcrumbs go in `<script module>`, props come from `$props()`, and `AppHead` sets the title.
4. Check Wayfinder. You can only import `@/routes/reports` after Wayfinder has run. A running `npm run dev` does this for you; otherwise run `php artisan wayfinder:generate --with-form`.
5. Add translation keys to `lang/en/modules/dashboard.php` and the matching file in every other locale, then run `php artisan erag:generate-lang`. Svelte uses the dot form, `__('modules.dashboard.reports.title')`. PHP uses the slash form, `__('modules/dashboard.reports.title')`.
6. Add `View Reports` to `config/permissions/dashboard.php` and `View Tenant Reports` to `config/permissions/tenant/dashboard.php`, then seed them with the commands below.
7. Add a menu entry with `'route_name' => 'reports.index'` and the permission to `database/seeders/MenuSeeder.php` (and to `database/seeders/tenant/MenuSeeder.php`), then run `php artisan db:seed --class=MenuSeeder`. The menu title is read from the `nav.<slug>` keys in `lang/<locale>/modules/common.php`.
8. Write a test that checks a user with the permission gets the `reports/Index` component.

::: details Steps 1–2: route and controller
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

::: details Step 3: page file
```svelte
<script module lang="ts">
    import { dashboard } from '@/routes';
    import { index } from '@/routes/reports';

    export const layout = {
        breadcrumbs: [
            { title: 'modules.common.nav.dashboard', href: dashboard() },
            { title: 'modules.dashboard.reports.title', href: index() },
        ],
    };
</script>

<script lang="ts">
    import { svelteLang } from '@erag/lang-sync-inertia/svelte';
    import AppHead from '@/components/AppHead.svelte';
    import Heading from '@/components/Heading.svelte';

    let {
        reports,
    }: {
        reports: { id: number; name: string }[];
    } = $props();

    const { __ } = svelteLang();
</script>

<AppHead title={__('modules.dashboard.reports.title')} />

<div class="space-y-6 px-4 py-6">
    <Heading
        title={__('modules.dashboard.reports.title')}
        description={__('modules.dashboard.reports.description')}
    />

    <ul class="space-y-2">
        {#each reports as report (report.id)}
            <li>{report.name}</li>
        {/each}
    </ul>
</div>
```
:::

::: details Steps 5–7: translations, permissions and seeding
```php
// lang/en/modules/dashboard.php
'reports' => [
    'title' => 'Reports',
    'description' => 'Exported analytics reports.',
],
```

```php
// config/permissions/dashboard.php (central)
[
    'permission_name' => 'View Reports',
    'associated_roles' => ['Super Admin', 'Admin'],
],

// config/permissions/tenant/dashboard.php (tenant)
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
:::

::: details Step 8: feature test
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

Run it with `php artisan test --compact --filter=reports`. `config/inertia.php` turns on `testing.ensure_pages_exist`, so the test fails if `reports/Index.svelte` doesn't exist.
:::

::: info
Users who get a system role after seeding receive the permission through `associated_roles`. For existing users, grant it from **Users → Assign permissions**. [Users, roles & permissions](/docs/core/users-roles-permissions) explains how this works.
:::

## Adding a form

A form posts to a controller action through Wayfinder and Inertia's `<Form>` component. To copy a working example, look at the roles form (`RoleController`, `RoleData`, `pages/roles/Partials/RoleFormModal.svelte`).

1. Validate on the server with a Spatie Data class type-hinted in the controller action (for example `Modules/RolePermission/Data/RoleData.php`, which has a `rules()` method).
2. In the controller, hand the work to a service, flash a toast with `Inertia::flash('toast', …)` and redirect.
3. Add a route to the module's `routes/web.php`, with a name and the permission middleware.
4. Build the form: spread the Wayfinder `.form()` object into `<Form>`, then add `Common*` inputs with `name` and `error`.

```svelte
<script lang="ts">
    import { Form } from '@inertiajs/svelte';
    import { store } from '@/routes/roles';
</script>

<Form {...store.form()} options={{ preserveScroll: true }}>
    {#snippet children({ errors, processing })}
        <CommonInput name="name" label={__('modules.role.form_modal.name')} error={errors.name} />
        <CommonButton type="submit" loading={processing}>{__('modules.role.form_modal.create')}</CommonButton>
    {/snippet}
</Form>
```

Validation errors show up in `errors` with no extra code, and `lib/flash-toast.ts` shows the flashed toast. For edit forms, `useForm` and create/edit modals, see [Inertia → Forms](/docs/svelte/inertia#forms).

## Type checking & linting

| Command | What it runs |
| --- | --- |
| `npm run lint` | `eslint .`, `prettier --check resources/`, `svelte-check --tsconfig ./tsconfig.json` |
| `npm run lint:fix` | `eslint . --fix`, `prettier --write resources/`, `svelte-check --tsconfig ./tsconfig.json` |
| `npx svelte-check --tsconfig ./tsconfig.json` | Type check only |
| `composer lint` | Pint, `php artisan typescript:transform`, `npm run lint:fix` |
| `composer test` | `config:clear`, `composer lint:check`, Larastan (`composer types:check`), then `php artisan test` |

Run `npm run lint:fix` before you commit.

## Conventions

- Don't hard-code text. Every string the user sees goes through `__()` with a `modules.<feature>.<key>` key, and that includes breadcrumbs, placeholders, toasts and confirm dialogs.
- Build form fields and buttons from the `Common*` components, and ask before destructive actions with `useConfirmDialog()`.
- Use Wayfinder rather than typing URLs by hand, and pair `.form()` with `<Form>`.
- Type everything. Data objects get the generated types from `@/types/Modules/...`, and type-only imports use `import type` (ESLint will remind you).
- Hide actions the user isn't allowed to take with `usePermission()`, for example `can('Export Analytics Reports', 'Export Tenant Reports')`. See [Architecture → Permissions](/docs/svelte/architecture#permissions-on-the-frontend).
- Put shared logic in `lib/` (as a `.svelte.ts` file if it needs runes). Components that belong to a single page go in that page's `Partials/` folder.

<RelatedPages :links="[
  { text: 'Inertia', link: '/docs/svelte/inertia', desc: 'Forms, visits, flash toasts and Wayfinder routes.' },
  { text: 'Commands', link: '/docs/reference/commands', desc: 'Every artisan, composer and npm command in the kit.' },
  { text: 'Users, roles & permissions', link: '/docs/core/users-roles-permissions', desc: 'How the permissions you add are checked and granted.' },
]" />
