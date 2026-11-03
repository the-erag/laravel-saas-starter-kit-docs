---
title: "Livewire Kit Development Workflow"
description: "Daily commands for the Livewire kit, step-by-step guides to adding a page, a form and a module, plus linting with Pint and blade-formatter, PHPStan and the AI guidelines."
---

# Development <Badge type="tip" text="Livewire" />

## Daily workflow

| Command | What it does |
| --- | --- |
| `composer dev` | Runs `php artisan dev`: Laravel server, queue listener, Pail logs and Vite together |
| `npm run dev` | Vite dev server (`vp dev`) with hot reload of Blade, CSS and JS |
| `npm run build` | Production build to `public/build` (`vp build`) |
| `composer lint` | `pint --parallel`, then `npm run format` (blade-formatter writes the views) |
| `composer lint:check` | `pint --parallel --test`, then `npm run lint` (blade-formatter checks the views) |
| `composer types:check` | `phpstan analyse` (Larastan, level 7) |
| `composer test` | Clears config, then `lint:check`, `types:check` and `php artisan test` |
| `composer setup` | Install, `.env`, app key, migrations, `npm install`, `npm run build` |

The complete list is in [Commands](/docs/reference/commands).

::: tip
If a change isn't showing up in the browser, make sure `npm run dev` (or `composer dev`) is running, or run `npm run build`. A new Tailwind class only appears once Vite has rebuilt the CSS.
:::

## Adding a page

Let's say you want a Reports page in the Dashboard module, served at `/reports`. The request goes like this:

```text
Modules/Dashboard/routes/web.php → Route::livewire('reports', Reports::class)
  → Modules/Dashboard/Livewire/Reports.php → view('pages.reports.index')
  → resources/views/pages/reports/index.blade.php inside layouts::app
```

1. Create the component at `Modules/Dashboard/Livewire/Reports.php`. Have `render()` return `view('pages.reports.index', [...])` with `->title()` and `->layoutData(['breadcrumbs' => [...]])`. Keep it thin; queries belong in `Modules/Dashboard/Services`.
2. Add the route to `Modules/Dashboard/routes/web.php`, inside the `auth` + `verified` group, with `Route::livewire('reports', Reports::class)`, `->middleware('permission:View Reports|View Tenant Reports')` and `->name('reports.index')`.
3. Create the view at `resources/views/pages/reports/index.blade.php` (lowercase, kebab-case). Build it with `x-page-heading` and the `x-common.*` components.
4. Add the translation keys to `lang/<locale>/modules/dashboard.php` for each locale.
5. Add `View Reports` to `config/permissions/dashboard.php` and `View Tenant Reports` to `config/permissions/tenant/dashboard.php`, then seed them.
6. If you want a menu item, add an entry to `database/seeders/MenuSeeder.php` (and `database/seeders/tenant/MenuSeeder.php`) with `'route_name' => 'reports.index'`, the permission and an Iconify `icon` such as `lucide:chart-bar`. This step is optional.

There's nothing to generate. The route, the view and the translation keys work as soon as the files are saved.

The component doesn't need much:

```php
namespace Modules\Dashboard\Livewire;

use Illuminate\Contracts\View\View;
use Livewire\Component;

class Reports extends Component
{
    public function render(): View
    {
        return view('pages.reports.index', [
            'reports' => [],
        ])
            ->title(__('modules/dashboard.reports.title'))
            ->layoutData(['breadcrumbs' => [
                ['title' => __('modules/common.nav.dashboard'), 'href' => route('dashboard')],
                ['title' => __('modules/dashboard.reports.title'), 'href' => route('reports.index')],
            ]]);
    }
}
```

::: details View route and view
```php
// Modules/Dashboard/routes/web.php
use Modules\Dashboard\Livewire\Reports;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::livewire('reports', Reports::class)
        ->middleware('permission:View Reports|View Tenant Reports')
        ->name('reports.index');
});
```

```blade
{{-- resources/views/pages/reports/index.blade.php --}}
<div class="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
    <x-page-heading :title="__('modules/dashboard.reports.title')" :description="__('modules/dashboard.reports.description')" />

    @forelse ($reports as $report)
        <p wire:key="report-{{ $report['id'] }}">{{ $report['name'] }}</p>
    @empty
        <x-empty-state icon="lucide:chart-bar" :title="__('modules/dashboard.reports.empty')" />
    @endforelse
</div>
```

A Livewire view needs a single root element, which is why everything sits inside one `<div>`.
:::

::: details View translations, permissions and seeding
```php
// lang/en/modules/dashboard.php (repeat for every locale)
'reports' => [
    'title' => 'Reports',
    'description' => 'Exported analytics reports.',
    'empty' => 'No reports yet.',
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
php artisan db:seed --class=PermissionSeeder
php artisan tenants:seed --class="Database\Seeders\PermissionSeeder"
php artisan db:seed --class=MenuSeeder
```

In Blade and PHP the keys work the same way: `__('modules/dashboard.reports.title')`. Menu titles are translated separately, from the `nav.<slug>` keys in `lang/<locale>/modules/common.php`.

Anyone who gets a system role from now on receives the permission through `associated_roles`. For users who already exist, grant it from Users → Assign permissions. To hide actions inside the page, use `@canany(['View Reports', 'View Tenant Reports'])` (see [Architecture → Permissions](/docs/livewire/architecture#permissions-on-the-frontend)).

Roles and tenant seeding are covered in more depth in [Users, roles & permissions](/docs/core/users-roles-permissions).
:::

::: details View a feature test
```php
use App\Models\User;
use Spatie\Permission\Models\Permission;

test('users with the permission can visit the reports page', function () {
    $user = User::factory()->create();
    $user->givePermissionTo(Permission::findOrCreate('View Reports', 'web'));

    $this->actingAs($user)
        ->get(route('reports.index'))
        ->assertOk();
});
```

```bash
php artisan test --compact --filter=reports
```
:::

## Adding a form

A form binds fields to public properties and submits to a component method. The method validates through a Form Request, calls a service and shows a toast.

```text
<form wire:submit="save"> → Reports::save()
  → validateFormRequest(ReportRequest::class, …) → ReportService → Flux::toast(…)
```

1. Create the Form Request at `Modules/Dashboard/Http/Requests/ReportRequest.php` with `rules()`, and `attributes()` / `messages()` from the translation files.
2. Add public properties for the fields and use the `ValidatesFormRequests` trait (and `AuthorizesPermissions` if the action needs its own permission).
3. In the action, call `validateFormRequest()`, pass the result to a service, then show a toast and close the modal, redirect or `dispatch()` an event.
4. In the view, wrap the fields in `<form wire:submit="save" novalidate>` and use `x-common.*` fields with `wire:model`. They show their own errors.

```php
use App\Livewire\Concerns\AuthorizesPermissions;
use App\Livewire\Concerns\ValidatesFormRequests;
use Flux\Flux;
use Modules\Dashboard\Http\Requests\ReportRequest;
use Modules\Dashboard\Services\ReportService;

class Reports extends Component
{
    use AuthorizesPermissions, ValidatesFormRequests;

    public string $name = '';

    public function save(ReportService $reportService): void
    {
        $this->authorizePermission('Create Reports', 'Create Tenant Reports');

        $reportService->create($this->validateFormRequest(ReportRequest::class, $this->only(['name'])));

        $this->reset('name');

        Flux::toast(variant: 'success', text: __('modules/dashboard.reports.created'));
    }
}
```

```blade
<form wire:submit="save" class="space-y-4" novalidate>
    <x-common.input wire:model="name" :label="__('modules/dashboard.reports.name')" required />

    <x-common.button type="submit" variant="primary">
        {{ __('modules/common.actions.save_changes') }}
    </x-common.button>
</form>
```

For create/edit modals, Form objects, events and confirm dialogs, head over to [Livewire → Forms](/docs/livewire/livewire#forms).

::: details View a component test
```php
use App\Models\User;
use Livewire\Livewire;
use Modules\Dashboard\Livewire\Reports;

test('a report can be created', function () {
    $this->actingAs(User::factory()->create());

    Livewire::test(Reports::class)
        ->set('name', 'Quarterly revenue')
        ->call('save')
        ->assertHasNoErrors();
});
```
:::

## Adding a module

1. Create `Modules/Reports/Providers/ReportsServiceProvider.php` extending `App\Providers\ModuleServiceProvider`. An empty class is enough.
2. Add it to `bootstrap/providers.php`.
3. Put routes in `Modules/Reports/routes/web.php` (or `tenant.php`) and components in `Modules/Reports/Livewire`.

```php
namespace Modules\Reports\Providers;

use App\Providers\ModuleServiceProvider;

class ReportsServiceProvider extends ModuleServiceProvider {}
```

The provider loads the routes and registers the `reports` Livewire namespace, so `Modules\Reports\Livewire\ExportModal` becomes `<livewire:reports::export-modal />`. Views still go in `resources/views/pages/reports`. See [Architecture → Module registration](/docs/livewire/architecture#module-registration).

## Linting & static analysis

| Command | When |
| --- | --- |
| `composer lint` | Fix PHP style with Pint and format every Blade view. Run before committing |
| `composer lint:check` | Check both without changing files |
| `composer types:check` | Run PHPStan with Larastan |
| `composer test` | Everything above plus the Pest suite. CI runs it through `composer ci:check` in `.github/workflows/tests.yml` |

Pint uses the Laravel preset with stricter rules in `pint.json` (strict comparison, imported global classes and functions, `mb_*` string functions, ordered class elements).

Blade views are formatted by `blade-formatter`. `.bladeformatterrc.json` sets 4-space indents, a 120-character line length and sorted Tailwind classes. `.bladeformatterignore` skips `resources/views/flux/**`, `vendor/**` and `node_modules/**`.

PHPStan reads `phpstan.neon`, which analyses `app/`, `bootstrap/app.php`, `config/`, `database/` and `routes/` at level 7.

## AI guidelines

The kit ships with Laravel Boost, so AI agents get the project's conventions:

| File | Contents |
| --- | --- |
| `CLAUDE.md`, `AGENTS.md` | Boost guidelines for the installed package versions |
| `.ai/rules/index.md` | Which rule file applies to which paths |
| `.ai/rules/general.md` | No code comments |
| `.ai/rules/livewire.md` | Form Requests, thin components, `authorizePermission()`, the `x-common.*` wrappers, `Js::from()` |
| `.claude/skills`, `.agents/skills` | Skills such as `livewire-development`, `fluxui-development`, `tailwindcss-development`, `fortify-development`, `laravel-tenancy`, `laravel-permission-development` and `pest-testing` |
| `boost.json` | Boost settings; `composer update` runs `boost:update` afterwards |

## Conventions

- Don't hard-code text. Every string the user sees goes through `__('modules/<feature>.<key>')`, and that includes page titles, breadcrumbs, placeholders, toasts and confirm dialogs.
- Don't write code comments; give things clear names instead (`.ai/rules/general.md`).
- Keep components thin: validate with a Form Request through `validateFormRequest()`, authorize with `authorizePermission()`, then call a service. No queries or transactions in components.
- Never use Flux tags in pages or feature components. Use the `x-common.*` wrappers, and ask before destructive actions with `x-common.confirm-dialog`.
- Use `route()` for URLs and `wire:navigate` for links between pages.
- Keep IDs in `#[Locked]` properties and reload models inside each action.
- Put views in `resources/views/pages/<area>`, page-only modals and Blade pieces in that area's `partials/` folder, and widgets used on several pages in `resources/views/livewire`.
