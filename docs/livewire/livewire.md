---
title: "Livewire 4 Components, Forms and Events"
description: "Livewire 4 patterns in the Livewire kit: full-page and nested components, Form Request validation, authorization, events, modals, toasts, navigation and Alpine.js."
---

# Livewire <Badge type="tip" text="Livewire" />

The kit runs on Livewire 4 (`livewire/livewire` ^4.1) with class-based components. There's no Inertia, no API and no hand-written fetch calls. A page is a component; a button calls a component method; a form submits to a component method.

## Full-page components

A route points straight at a component class with `Route::livewire()`:

```php
// Modules/User/routes/web.php
Route::middleware(['auth', 'verified'])->group(function () {
    Route::livewire('users', Index::class)
        ->middleware('permission:View Users|View Tenant Users')
        ->name('users.index');
});
```

The component's `render()` returns the page view, the browser title and the breadcrumbs:

```php
public function render(UserService $userService): View
{
    return view('pages.users.index', [
        'users' => $userService->getUsers($this->search ?: null),
        'stats' => $userService->getStats(),
    ])
        ->title(__('modules/user.index.title'))
        ->layoutData(['breadcrumbs' => [
            ['title' => __('modules/common.nav.dashboard'), 'href' => route('dashboard')],
            ['title' => __('modules/user.breadcrumbs.users'), 'href' => route('users.index')],
        ]]);
}
```

```text
Route::livewire → mount() → render() → view('pages.users.index')
  → rendered into layouts::app ($slot), with $title and $breadcrumbs
```

A page gets its data in two ways:

| Source | How | Example |
| --- | --- | --- |
| Public properties | Read in the view as `$name`, bound with `wire:model` | `public string $search = '';` |
| Data passed by `render()` | Read in the view as variables, rebuilt on every request | `'users' => $userService->getUsers(...)` |
| Computed properties | `#[Computed]` methods, read as `$this->name` | `$this->deletingUser?->name` |
| Route parameters | `mount()` arguments with route-model binding | `public function mount(Tenant $tenant)` |

Livewire's default layout is `layouts::app`, so most components don't name one. The exceptions call `->layout()`: the landing page uses `layouts::base`, and the invitation pages use `layouts::auth` with a title and description. See [Layouts](/docs/livewire/layouts).

::: tip
Keep IDs that the user mustn't change in `#[Locked]` properties (`public ?int $userId`), and load the model again inside each action. The kit never stores Eloquent models in public properties.
:::

## Nested components

Modals and widgets that have their own state and actions are separate components, placed in a page view with the module prefix:

```blade
<livewire:user::user-form-modal />
<livewire:user::assign-permissions-modal />
```

| Kind | Class | View |
| --- | --- | --- |
| Page-only modal | `Modules/User/Livewire/UserFormModal.php` | `pages/users/partials/user-form-modal.blade.php` |
| Page-only modal | `Modules/Tenant/Livewire/EditTenantModal.php` | `pages/tenants/partials/edit-tenant-modal.blade.php` |
| Shared widget | `Modules/Notification/Livewire/Bell.php` | `livewire/notification-bell.blade.php` |
| Shared widget | `Modules/Settings/Livewire/DeleteAccount.php` | `livewire/delete-account.blade.php` |

Pass props as attributes, the same way as on a Blade component:

```blade
<livewire:settings::two-factor-setup-modal :requires-confirmation="$requiresConfirmation" />
```

If a piece of UI has no actions of its own, make it a Blade partial instead of a component. The tenant delete dialog is `x-pages::tenants.partials.delete-tenant-modal`, a plain Blade component whose button calls `delete` on the page component.

## Forms

Fields bind to public properties with `wire:model`, and the form submits to a method with `wire:submit`:

```blade
<form wire:submit="save" class="space-y-4" novalidate>
    <x-common.input wire:model="name" :label="__('modules/user.form_modal.name')" autocomplete="name" required />
    <x-common.input wire:model="email" type="email" :label="__('modules/user.form_modal.email')" required />
    <x-common.select wire:model="role" :label="__('modules/user.form_modal.role')" :options="$roleOptions" />

    <x-common.button type="submit" variant="primary">{{ __('modules/user.form_modal.create') }}</x-common.button>
</form>
```

| Binding | Sends the value | Used for |
| --- | --- | --- |
| `wire:model` | With the next action | Most fields |
| `wire:model.live` | On every change | Toggles that show or hide fields (`send_invitation`) |
| `wire:model.live.debounce.400ms` | After typing stops | Company name → subdomain on Create tenant |
| `wire:model.live.debounce.300ms` | After typing stops | `x-search-input` |

The `x-common` fields show the validation error for their `wire:model` key on their own, so you don't add error markup.

### Validation with Form Requests

Every write is validated by a Form Request in `Modules/<Module>/Http/Requests`. Components call `validateFormRequest()` from `App\Livewire\Concerns\ValidatesFormRequests`:

```php
use App\Livewire\Concerns\ValidatesFormRequests;

class Profile extends Component
{
    use ValidatesFormRequests;

    public function save(ProfileService $profileService): void
    {
        $validated = $this->validateFormRequest(ProfileUpdateRequest::class, [
            'name' => $this->name,
            'email' => $this->email,
            'locale' => $this->locale ?: null,
        ]);

        $profileService->update(Auth::user(), $validated);

        Flux::toast(variant: 'success', text: __('modules/settings.toasts.profile_updated'));

        $this->redirectRoute('profile.edit', navigate: true);
    }
}
```

| Argument | Purpose |
| --- | --- |
| `$formRequest` | The Form Request class |
| `$data` | The values to validate, usually `$this->only([...])` |
| `$routeParameters` | Values the rules read with `$this->route()`, e.g. `['user' => $user]` for a unique rule that ignores the current record |
| `$errorPrefix` | Prefix for the error keys, used by Livewire Form objects (`form.company`) |

The method builds the Form Request from the current request, runs `authorize()`, `rules()`, `messages()` and `attributes()` exactly as a controller would, and returns `validated()`. On failure it throws the usual `ValidationException`, and Livewire shows the messages next to the fields.

Before validating, it trims strings and turns empty strings into `null`, like Laravel's middleware does for normal requests. `password`, `current_password` and `password_confirmation` aren't trimmed.

::: warning
Don't add `rules()` methods or `#[Validate]` attributes to components. Keep the rules in the Form Request so they're written once.
:::

::: details View the Form Request (UserRequest)
```php
public function rules(): array
{
    $user = $this->route('user');
    $userId = $user instanceof User ? $user->id : $user;
    $requiresPassword = fn (): bool => ! $userId && ! $this->boolean('send_invitation');

    return [
        'name' => ['required', 'string', 'max:255'],
        'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique(User::class, 'email')->ignore($userId)],
        'password' => [Rule::requiredIf($requiresPassword), 'nullable', 'confirmed', Password::defaults()],
        'password_confirmation' => [Rule::requiredIf($requiresPassword), 'nullable', 'string'],
        'role' => ['nullable', 'string', Rule::exists('roles', 'name')->where('guard_name', tenancy()->initialized ? 'tenant' : 'web')],
        'send_invitation' => ['nullable', 'boolean'],
    ];
}
```
:::

### Form objects

Big forms keep their fields in a Livewire Form object. `TenantForm` is shared by Create tenant and the edit modal, and validates through the same trait with an error prefix, so errors land on `form.company`, `form.domain` and so on:

```php
class TenantForm extends Form
{
    use ValidatesFormRequests;

    #[Locked]
    public ?int $tenantId = null;

    public string $company = '';

    public function validated(): array
    {
        return $this->validateFormRequest(
            TenantRequest::class,
            $this->except('tenantId'),
            ['tenant' => $this->tenantId],
            $this->getPropertyName(),
        );
    }
}
```

```blade
<x-common.input id="form_company" wire:model.live.debounce.400ms="form.company" />
<x-common.select wire:model="form.industry" :options="$industries" required />
```

### Dirty state and discard

Settings forms use `x-common.button-row`. It shows up through `wire:dirty` once a field changes, and its Discard button calls a method that reloads the values:

```php
public function discard(): void
{
    $this->fillFromUser();
    $this->resetValidation();
}
```

## Authorization

Route middleware decides who can open a page. Because `AppServiceProvider` registers the auth, central-only and permission middleware as Livewire persistent middleware, they run again on every request the page makes afterwards.

Actions that need a different permission from the page call `authorizePermission()`. List the central and the tenant permission; the user needs any one of them:

```php
use App\Livewire\Concerns\AuthorizesPermissions;

public function delete(UserService $userService): void
{
    $this->authorizePermission('Delete User', 'Delete Tenant User');

    // ...
}
```

In the view, hide the button with `@can` / `@canany`. Both are covered in [Architecture → Permissions](/docs/livewire/architecture#permissions-on-the-frontend).

### Throttling

`App\Livewire\Concerns\ThrottlesActions` adds `throttled($action, $maxAttempts, $decaySeconds = 60)`. It returns `true` and shows a danger toast once the limit is hit. The key is the component class, the action and the user ID (or IP for guests).

```php
if ($this->throttled('resend-invitation:'.$tenant->id, 3)) {
    return;
}
```

The kit uses it for resending a tenant invitation, the tenant admin password reset and accepting invitations.

## Events

Components talk to each other with Livewire events. The kit follows one naming pattern: `open-<thing>` opens a modal component, and `<thing>-saved` tells the page to refresh.

```text
Page button: wire:click="$dispatch('open-user-form', { userId: 5 })"
  → UserFormModal #[On('open-user-form')] open(?int $userId) → Flux::modal('user-form')->show()
  → save() → $this->dispatch('user-saved')
  → Users Index #[On('user-saved')] → re-renders the list
```

```blade
<x-common.button variant="outline" size="sm" square
    wire:click="$dispatch('open-user-form', { userId: {{ $user->id }} })">
    <x-common.icon name="lucide:pen-line" class="size-4" />
</x-common.button>
```

```php
#[On('open-user-form')]
public function open(?int $userId = null): void
{
    $this->reset();
    $this->resetValidation();

    // fill the fields when editing ...

    Flux::modal('user-form')->show();
}
```

| Event | Listened to by | Sent by |
| --- | --- | --- |
| `open-user-form`, `open-user-permissions` | `UserFormModal`, `AssignPermissionsModal` | Users page |
| `user-saved` | Users page | Both user modals |
| `open-role-form` / `role-saved` | `RoleFormModal` / Roles page | Roles page / `RoleFormModal` |
| `open-tenant-form` / `tenant-saved` | `EditTenantModal` / Tenants list and detail | Tenant pages / `EditTenantModal` |
| `open-reset-password` | `ResetPasswordModal` | Tenant detail |
| `open-domain-form`, `open-domain-settings`, `open-domain-auth-features` / `domain-saved` | Domain modals / pages using `ManagesDomains` | Domain actions / domain modals |
| `start-two-factor-setup` / `two-factor-enabled` | `TwoFactorSetupModal` / `Security` | Security page / `TwoFactorSetupModal` |
| `notifications-updated` | `Bell` and the Notifications page | `Bell` and the Notifications page |
| `permission-picker-opened` | The Alpine permission picker (`x-on:permission-picker-opened.window`) | `AssignPermissionsModal` |

A listener with an empty body, such as `#[On('tenant-saved')] public function refreshTenant(): void {}`, is enough to make the component render again with fresh data.

## Modals

A modal is an `x-common.modal` with a `name`. Livewire components open and close it from PHP:

```php
Flux::modal('user-form')->show();
Flux::modal('user-form')->close();
```

In Blade you can open one without a round trip, or close it from a Cancel button:

```blade
<x-common.modal-trigger name="two-factor-setup-modal">
    <x-common.button variant="primary">{{ __('modules/security.two_factor.enable') }}</x-common.button>
</x-common.modal-trigger>

<x-common.modal-close>
    <x-common.button variant="outline">{{ __('modules/user.form_modal.cancel') }}</x-common.button>
</x-common.modal-close>
```

When a modal edits a record, put it in its own component (as `UserFormModal` does) and open it with an `open-…` event. Then the page doesn't hold the modal's fields, and the modal can reset itself on every open.

### Confirm and delete

Deletes go through `x-common.confirm-dialog`. The page keeps the selected ID in a locked property, shows the record through a computed property and runs the delete in a second action:

```php
#[Locked]
public ?int $deletingUserId = null;

public function confirmDelete(int $userId): void
{
    $this->authorizePermission('Delete User', 'Delete Tenant User');
    $this->deletingUserId = $userId;

    Flux::modal('delete-user')->show();
}

public function delete(UserService $userService): void
{
    $this->authorizePermission('Delete User', 'Delete Tenant User');

    $user = User::query()->findOrFail($this->deletingUserId);

    Flux::modal('delete-user')->close();
    $this->deletingUserId = null;

    $userService->deleteUser($user);

    Flux::toast(variant: 'success', text: __('modules/user.toasts.deleted'));
}

#[Computed]
public function deletingUser(): ?User
{
    return $this->deletingUserId ? User::query()->find($this->deletingUserId) : null;
}
```

```blade
<x-common.confirm-dialog name="delete-user" action="delete" :title="__('modules/user.index.delete_confirm.title')"
    :message="__('modules/user.index.delete_confirm.message', ['name' => $this->deletingUser?->name])" />
```

## Toasts

Components show toasts with Flux:

```php
Flux::toast(variant: 'success', text: __('modules/tenant.toasts.created'));
Flux::toast(variant: 'danger', text: __('modules/user.toasts.cannot_delete_self'));
```

The kit uses `success` and `danger`. The toast container is in `layouts/base.blade.php` inside `@persist('toast')`, so every page has it (auth pages too) and a toast sent just before a `wire:navigate` redirect still shows on the next page.

::: details View the toast container (layouts/base.blade.php)
```blade
<body {{ $attributes->class('min-h-screen antialiased') }}>
    {{ $slot }}

    @persist('toast')
        <flux:toast.group>
            <flux:toast />
        </flux:toast.group>
    @endpersist

    @fluxScripts
</body>
```
:::

## Navigation

| Need | Use | Example in the kit |
| --- | --- | --- |
| Link to another page | `<a href="…" wire:navigate>` or `:href` on `x-common.button` | Sidebar, breadcrumbs, "Back" on tenant detail |
| Redirect after an action | `$this->redirectRoute('name', navigate: true)` | Create tenant → tenant list |
| Full page redirect | `$this->redirectRoute('dashboard')` | After accepting an invitation and signing in |
| Keep filters in the URL | `#[Url]` properties | `search` and `status` on the tenant list |
| Paginate | `WithPagination` + `x-table-card` | Users, roles, tenants |
| Reorder rows | `wire:sort`, `wire:sort:item`, `wire:sort:handle` | Setup → Menus calls `sortMenu($menuId, $position)` |

```php
use WithPagination;

#[Url(except: '')]
public string $search = '';

#[Url(except: 'all')]
public string $status = 'all';

public function updatedSearch(): void
{
    $this->resetPage();
}
```

Sign-in, registration and the other Fortify pages are classic forms that `POST` to Fortify's routes with `@csrf`. Logout in `x-user-menu` is a `POST` form to `route('logout')` as well.

## Alpine.js

Alpine ships with Livewire. Use it for behaviour that doesn't need the server: dropdowns in the header navbar, the appearance switch (`$flux.appearance`), the recovery-code toggle on the two-factor challenge, and the permission picker.

Bigger Alpine components go in their own file in `resources/js` and are registered in `app.js`:

```js
import 'iconify-icon';
import permissionPicker from './permission-picker';

document.addEventListener('alpine:init', () => {
    window.Alpine.data('permissionPicker', permissionPicker);
});
```

The picker keeps its selection in sync with the component through `$wire.entangle()`, so the checkboxes update instantly and `save()` receives the final list. Trimmed from `pages/users/partials/assign-permissions-modal.blade.php`:

```blade
<div x-data="permissionPicker(@js($groups), @js($roleOptions), $wire.entangle('permissions'), $wire.entangle('role'), @js([
    'noMatches' => __('modules/user.permissions_modal.no_matches'),
    'noPermissions' => __('modules/user.permissions_modal.no_permissions'),
]))"
    x-on:permission-picker-opened.window="reset($event.detail.notice)">
```

::: tip
`@js()` works on plain HTML tags like the `<div>` above. On a component tag (`<x-common.checkbox …>`), use <code v-pre>{{ Js::from($value) }}</code> instead, because Blade doesn't compile directives inside component attributes.
:::
