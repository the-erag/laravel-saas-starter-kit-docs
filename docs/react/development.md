---
title: "React Kit Development Workflow"
description: "Daily commands for the React kit and step-by-step guides to adding a page and a form, plus type checking with tsc and linting with ESLint and Prettier."
---

# Development <Badge type="tip" text="React" />

This page covers the commands you run every day, then walks through adding a page and a form from start to finish.

## Daily workflow

Run `composer dev` to start everything, then work in `resources/js` and `Modules/`. While you edit, Vite reloads the browser and keeps the Wayfinder files up to date.

| Command | What it does |
| --- | --- |
| `composer dev` | Runs `php artisan dev`: Laravel server, queue listener, Pail logs and Vite together |
| `npm run dev` | Vite dev server with HMR (also regenerates Wayfinder files) |
| `npm run build` | Production build to `public/build` |
| `npm run build:ssr` | Client + SSR bundle (`vite build && vite build --ssr`) |
| `php artisan erag:generate-lang` | Export `lang/*` to `resources/js/lang/*.json` |
| `php artisan wayfinder:generate --with-form` | Regenerate Wayfinder files without Vite running |

The full list is on the [Commands](/docs/reference/commands) page. Lint and type-check commands are under [Type checking & linting](#type-checking-linting).

::: tip
Change not showing up in the browser? Make sure `npm run dev` (or `composer dev`) is running, or run `npm run build`.
:::

## Adding a page

Say you want a Reports page in the Dashboard module, served at `/reports`:

<FlowDiagram label="Adding a page" :nodes="[
  { label: 'Route', note: '`routes/web.php`' },
  { label: 'Controller', note: '`ReportController@index`' },
  { label: '`Inertia::render()`', note: '`reports/index`' },
  { label: 'Page', note: '`pages/reports/index.tsx`' },
]" />

1. Add the route to `Modules/Dashboard/routes/web.php` inside the `auth` + `verified` group. Give it the `permission:View Reports|View Tenant Reports` middleware and the name `reports.index`.
2. Create the controller at `Modules/Dashboard/Http/Controllers/ReportController.php` and return `Inertia::render('reports/index', [...])`. Keep it thin: business logic belongs in `Modules/<Module>/Services`.
3. Create the page at `resources/js/pages/reports/index.tsx`, with a default-exported component and a static `layout` that sets the breadcrumbs.
4. Once Wayfinder has run, you can import `@/routes/reports`. `npm run dev` regenerates it for you. If that isn't running, use `php artisan wayfinder:generate --with-form`.
5. Add the translation keys to `lang/<locale>/modules/dashboard.php` for each locale, then run `php artisan erag:generate-lang`.
6. Add `View Reports` to `config/permissions/dashboard.php` and `View Tenant Reports` to `config/permissions/tenant/dashboard.php`, then seed them.
7. Optional: for a menu entry, add one to `database/seeders/MenuSeeder.php` and `database/seeders/tenant/MenuSeeder.php` with `'route_name' => 'reports.index'` and the permission.
8. Write a test that checks the route renders the `reports/index` component.

The page itself doesn't need much:

```tsx
export default function ReportsIndex({ reports }: Props) {
    const { __ } = reactLang();

    return (
        <>
            <Head title={__('modules.dashboard.reports.title')} />
            <Heading title={__('modules.dashboard.reports.title')} />
            <ul>
                {reports.map((report) => <li key={report.id}>{report.name}</li>)}
            </ul>
        </>
    );
}
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
namespace Modules\Dashboard\Http\Controllers;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('reports/index', [
            'reports' => [],
        ]);
    }
}
```
:::

::: details View full page file
```tsx
import { reactLang } from '@erag/lang-sync-inertia/react';
import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import { dashboard } from '@/routes';
import { index } from '@/routes/reports';

type Props = {
    reports: { id: number; name: string }[];
};

export default function ReportsIndex({ reports }: Props) {
    const { __ } = reactLang();

    return (
        <>
            <Head title={__('modules.dashboard.reports.title')} />

            <div className="space-y-6 px-4 py-6">
                <Heading
                    title={__('modules.dashboard.reports.title')}
                    description={__('modules.dashboard.reports.description')}
                />

                <ul className="space-y-2">
                    {reports.map((report) => (
                        <li key={report.id}>{report.name}</li>
                    ))}
                </ul>
            </div>
        </>
    );
}

ReportsIndex.layout = {
    breadcrumbs: [
        { title: 'modules.common.nav.dashboard', href: dashboard() },
        { title: 'modules.dashboard.reports.title', href: index() },
    ],
};
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

In React you then write `__('modules.dashboard.reports.title')`. In PHP, use the slash form: `__('modules/dashboard.reports.title')`. Menu titles come from the `nav.<slug>` keys in `lang/<locale>/modules/common.php`.

Anyone who gets a system role after this gets the permission through `associated_roles`. For existing users, grant it from **Users → Assign permissions**.

Roles, permissions and tenant seeding are covered in more depth in [Users, roles & permissions](/docs/core/users-roles-permissions).
:::

::: details View feature test
```php
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

test('users with the permission can visit the reports page', function () {
    $user = User::factory()->create();
    $user->givePermissionTo(Permission::findOrCreate('View Reports', 'web'));

    $this->actingAs($user)
        ->get(route('reports.index'))
        ->assertInertia(fn (Assert $page) => $page->component('reports/index'));
});
```

```bash
php artisan test --compact --filter=reports
```

Since `config/inertia.php` turns on `testing.ensure_pages_exist`, the test fails if `reports/index.tsx` doesn't exist.
:::

## Adding a form

A form posts straight to a Laravel route through Inertia. If validation fails, the messages come back in `errors`. If it succeeds, the controller usually redirects with a flash toast.

<FlowDiagram label="Form submit" :nodes="[
  { label: '`<Form>`', note: '`{...store.form()}`' },
  { label: 'Controller', note: '`@store(Data $data)`' },
  'Service',
  { label: 'Flash toast', note: '`Inertia::flash(\'toast\')`' },
  'Redirect',
]" />

1. Add a named `POST` (or `PATCH`/`PUT`) route with permission middleware.
2. Write the validation rules in the `rules()` method of a Spatie Data class (`Modules/<Module>/Data/*Data.php`), then type-hint that class in the controller action the way `RoleController@store(RoleData $data)` does.
3. In the controller, call the service, flash a toast and redirect.
4. On the page, spread the Wayfinder `.form()` object into `<Form>` and add `Common*` inputs with a `name` and an `error`.

```tsx
import { store } from '@/routes/roles';

<Form {...store.form()} resetOnSuccess options={{ preserveScroll: true }}>
    {({ errors, processing }) => (
        <>
            <CommonInput name="name" label={__('modules.role.form_modal.name')} error={errors.name} />
            <CommonButton type="submit" loading={processing}>
                {__('modules.role.form_modal.create')}
            </CommonButton>
        </>
    )}
</Form>
```

`errors` is keyed by field name. For edit forms, create/edit modals and `useForm`, see [Inertia → Forms](/docs/react/inertia#forms).

::: details View controller action
```php
public function store(RoleData $data): RedirectResponse
{
    $this->roleService->createRole($data);

    Inertia::flash('toast', ['type' => 'success', 'message' => __('modules/role.toasts.created')]);

    return to_route('roles.index');
}
```
:::

## Type checking & linting

| Command | What it does |
| --- | --- |
| `npm run lint` | `eslint .` + `prettier --check resources/` + `tsc --noEmit` |
| `npm run lint:fix` | `eslint . --fix` + `prettier --write resources/` + `tsc --noEmit` |
| `npx tsc --noEmit` | Type check only |
| `composer lint` | Pint, `php artisan typescript:transform`, `npm run lint:fix` |
| `composer test` | Lint check, Larastan, then `php artisan test` |

Run `npm run lint:fix` before you commit.

::: warning
Until Wayfinder has generated `@/routes` and `@/actions`, `tsc` will fail on those imports. Run `npm run dev` or `npm run build` first.
:::

## Conventions

- Don't hard-code text. Every string the user sees goes through `__()` with a `modules.<feature>.<key>` key, and that includes breadcrumbs, placeholders, toasts and confirm dialogs.
- Build form fields and buttons from the `Common*` components, and ask for confirmation with `useConfirmDialog()` before anything destructive.
- Get URLs from Wayfinder rather than typing them out, and pair `.form()` with `<Form>`.
- Type everything. Data objects use the generated types from `@/types/Modules/...`, and type-only imports use `import type` (ESLint enforces it).
- Hide actions the user isn't allowed to take with `usePermission().can(...)`, as described in [Architecture → Permissions](/docs/react/architecture#permissions-on-the-frontend).
- Hooks go in `hooks/use-x.ts` and page-only components go in the page's `partials/` folder. All file names are kebab-case.

<RelatedPages :links="[
  { text: 'Inertia', link: '/docs/react/inertia', desc: 'Form props, visits, flash toasts and Wayfinder routes.' },
  { text: 'Architecture → Generated files', link: '/docs/react/architecture#generated-files', desc: 'What Wayfinder, typescript:transform and erag:generate-lang write for you.' },
  { text: 'Testing', link: '/docs/core/testing', desc: 'More on feature tests like the one for the Reports page.' },
]" />
