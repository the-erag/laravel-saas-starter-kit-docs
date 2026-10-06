---
title: "Laravel Users, Roles & Permissions"
description: "User management, queued invitations, system and custom roles, config-driven Spatie permissions and permission checks on routes, menus and buttons."
---

# Users, roles & permissions

Authorization is built on spatie/laravel-permission (`^8.3`). You get the same screens on the central domain (guard `web`) and inside every tenant (guard `tenant`), and each side has its own users, roles and permissions.

Here's how the pieces connect:

```text
config/permissions/*.php  → defines permissions + default roles for each
Role (system or custom)   → picked on the user form
PermissionService         → gives the user the role's default permissions directly
permission middleware / can() → checks the user's permissions
```

## Users

The users page is at `/users` (module `Modules/User`). It lists users with search, pagination and stats (total, verified, unverified). You can create, edit and delete users (but not yourself), and pick a role while creating or editing. Two more things live here:

- Send invitation email, so the user sets their own password instead of you setting one.
- The Assign permissions dialog, which groups permissions by config file and has a role selector that checks that role's default permissions.

| Action | Central permission | Tenant permission |
| --- | --- | --- |
| View list | `View Users` | `View Tenant Users` |
| Create | `Create User` | `Create Tenant User` |
| Edit | `Edit User` | `Edit Tenant User` |
| Delete | `Delete User` | `Delete Tenant User` |
| Assign permissions | `Assign Permissions` | `Assign Tenant Permissions` |

### Invitations

An invitation lets the new user choose their own password. With Send invitation email turned on, this is what happens:

```text
UserService::createUser()
  → creates the user with a random password, sets invited_at
  → assigns the selected role
  → queues an email with a signed link (valid 7 days)
User opens the link
  → sets a password (auth/AcceptInvitation)
  → is verified and signed in, invited_at is cleared
```

While `invited_at` is set, the user has an Invitation pending badge in the list.

::: warning Invitations need a queue worker
Invitation emails go through the queue, so nothing is sent unless a worker is running. See [Local development → Queue worker](/docs/getting-started/local-development#queue-worker).
:::

**Related files**: `Modules/User/Services/UserService.php`, `Modules/User/Notifications/UserInvitationNotification.php` (`EXPIRES_IN_DAYS`), `Modules/User/Http/Controllers/UserInvitationController.php` (route `users.invitation.show`).

## Roles

On `/roles` (module `Modules/RolePermission`) you can search roles, see stats (total, system, custom), and create, rename or delete roles.

| Action | Central permission | Tenant permission |
| --- | --- | --- |
| View | `View Roles` | `View Tenant Roles` |
| Create | `Create Role` | `Create Tenant Role` |
| Edit | `Edit Role` | `Edit Tenant Role` |
| Delete | `Delete Role` | `Delete Tenant Role` |

Roles come in two kinds:

| | System roles | Custom roles |
| --- | --- | --- |
| Defined in | `Modules\RolePermission\Enums\RoleEnum` | The Roles page |
| Default permissions | From `config/permissions` | None |
| Edit or delete in the UI | No (marked as system) | Yes |

These are the system roles:

| Value | Label |
| --- | --- |
| `super-admin` | Super Admin |
| `admin` | Admin |
| `manager` | Manager |
| `employee` | Employee |
| `user` | User |

Even outside the UI, the backend refuses to delete `super-admin`.

### Super admin

A user with the `super-admin` role passes every check, on both ends:

- Backend: `AppServiceProvider` registers a `Gate::before` that grants every ability.
- Frontend: `auth.isSuperAdmin` makes every `can()` check pass.

## Permissions

Permissions are defined in PHP config files, one file per group. Each file lists the permissions that exist and which system roles get each one by default.

```text
config/permissions/            # central (guard web)
├── dashboard.php  menus.php  roles.php  settings.php  tenants.php  users.php
└── tenant/                    # tenant (guard tenant)
    └── dashboard.php  menus.php  roles.php  settings.php  users.php
```

```php
// config/permissions/tenants.php
return [
    [
        'permission_name' => 'View Tenants',
        'associated_roles' => ['Super Admin', 'Admin', 'Manager'],
    ],
];
```

| Key | Meaning |
| --- | --- |
| `permission_name` | The permission stored in the database |
| `associated_roles` | **Role labels** (from `RoleEnum::label()`), not values, that get this permission by default |

`PermissionService::getGroupedPermissions()` picks the central or tenant folder based on the current context. Group names are translated with `modules/role.permission_groups.<file name>`.

### How permissions are assigned

Permissions are given **directly to users**, not to roles. That way you can adjust one person's access without creating a new role just for them. Here's what `PermissionService::assignRole($user, $roleName)` does:

| Role type | Result |
| --- | --- |
| System role | Syncs the role and also replaces the user's permissions with those whose `associated_roles` include the role's label |
| Custom role | Syncs only the role and leaves the user's permissions alone. Set them in the Assign permissions dialog |

When you change a user's role in the edit form, that role's default permissions are applied again.

### Adding a permission

1. Add an entry to the right file in `config/permissions/` (and to `config/permissions/tenant/` if tenants need it too).
2. Create it in the database:

   ```bash
   php artisan db:seed --class=PermissionSeeder      # central
   php artisan tenants:seed                           # all tenants (runs TenantDatabaseSeeder)
   ```

3. Give it to users in the UI, or assign the role again.
4. If you added a new file, give it a group label under `permission_groups` in `lang/<locale>/modules/role.php`.

::: warning `tenants:seed` runs the full tenant seeder
`TenantDatabaseSeeder` also runs `DefaultUserSeeder`, which creates or updates the `<role>@gmail.com` users in every tenant. If you don't want those accounts, take it out of `database/seeders/tenant/TenantDatabaseSeeder.php`, or seed just the permissions with `php artisan tenants:seed --class="Database\\Seeders\\PermissionSeeder"`.
:::

## Checking permissions

| Where | How |
| --- | --- |
| Routes | `permission` middleware |
| PHP | `$user->can('Edit User')` or `Gate::allows(...)` (super admins always pass) |
| Menus | The `permission` column on each `menus` row; `MenuService` hides items the user cannot access |
| Frontend | `can()` helper, powered by the shared props `auth.permissions` and `auth.isSuperAdmin` |

For a route that serves both contexts, list the central and tenant permission names separated by a pipe:

```php
Route::get('users', [UserController::class, 'index'])
    ->middleware('permission:View Users|View Tenant Users')
    ->name('users.index');
```

On the frontend, `can(...names)` returns `true` if the user has at least one of the permissions you pass in.

::: code-group

```vue [Vue]
<script setup lang="ts">
import { usePermission } from '@/composables/usePermission';

const { can } = usePermission();
</script>

<template>
    <Button v-if="can('Create User', 'Create Tenant User')">New user</Button>
</template>
```

```tsx [React]
import { usePermission } from '@/hooks/use-permission';

export default function UsersToolbar() {
    const { can } = usePermission();

    return can('Create User', 'Create Tenant User') ? <Button>New user</Button> : null;
}
```

```svelte [Svelte]
<script lang="ts">
    import { usePermission } from '@/lib/permission';

    const { can } = usePermission();
</script>

{#if can('Create User', 'Create Tenant User')}
    <Button>New user</Button>
{/if}
```

:::

::: tip Hiding is not securing
A frontend check only hides things in the UI. The route still needs `permission:` middleware to actually block access.
:::
