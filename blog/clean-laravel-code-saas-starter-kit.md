---
title: "Clean Laravel Code in a SaaS Starter Kit: What to Check"
description: "What clean Laravel code means in a SaaS starter kit: modules, thin controllers, services, Data objects, typed routes, Larastan, Pint, Pest and CI."
pageClass: blog-page
date: 2026-11-21
author: annu-gupta
category: architecture
tags: [Clean Code, Architecture, Starter Kits]
---

# What "Clean Laravel Code" Means in a SaaS Starter Kit

<BlogPostMeta />

Almost every Laravel SaaS starter kit says its code is clean. It's hard to argue with, and hard to check from a sales page. But it matters more in a kit than almost anywhere else: you don't install a kit like a package, you take over its code. Every controller, service and test becomes yours to read, extend and debug, and your AI coding agent will copy whatever patterns it finds there.

So what does "clean" actually mean in a kit? In this post I'll break it into things you can check: folder structure, thin controllers, service classes, validated input, typed routes, static analysis, formatting, tests, CI and guidelines for AI agents. For each one I'll show short, real code from our own Vue kit (Laravel 13, Inertia v3), trimmed for length, and end with a checklist you can use on any kit before you buy.

## Why code quality matters more in a kit

A package hides its internals behind an API. A kit doesn't. On day one you'll add a module next to the ones that shipped, and you'll copy the shape of the closest existing file. If the kit's controllers run queries, send emails and build arrays inline, yours will too. If its services are small and typed, yours will probably be the same.

That's the real test of clean code in a kit: **is it a good example to copy?**

## 1. A structure you can find things in

Our kits split the backend into modules under `Modules/`, such as Auth, Menu, RolePermission, Settings, Tenant and User. Most have their own routes, controllers, Data objects and services:

```text
Modules/User/
├── Data/            UserData.php, AcceptUserInvitationData.php
├── Http/Controllers/ UserController.php, UserInvitationController.php
├── Notifications/   UserInvitationNotification.php
├── Providers/       UserServiceProvider.php
├── Services/        UserService.php
└── routes/web.php
```

It's plain PSR-4 in `composer.json`, no module package:

```json
"Modules\\": "Modules/"
```

Each module's service provider loads its own routes. When you need to change how users are invited, you open one folder. If you want the reasoning behind this layout, read [modular Laravel architecture](/blog/modular-laravel-architecture.html).

Modules aren't the only clean structure. A kit that follows Laravel's default `app/` layout consistently is fine too. What you want to avoid is a mix, where half the logic is in `app/` and half in some other place with no rule.

## 2. Thin controllers

A clean controller reads like a summary: take validated input, call a service, return a response. Here's `store` and `update` from `Modules/User/Http/Controllers/UserController.php`:

```php
public function store(UserData $data): RedirectResponse
{
    $user = $this->userService->createUser($data);

    Inertia::flash('toast', [
        'type' => 'success',
        'message' => $data->sendInvitation
            ? __('modules/user.toasts.invited', ['email' => $user->email])
            : __('modules/user.toasts.created'),
    ]);

    return to_route('users.index');
}

public function update(UserData $data, User $user): RedirectResponse
{
    $this->userService->updateUser($user, $data);

    Inertia::flash('toast', ['type' => 'success', 'message' => __('modules/user.toasts.updated')]);

    return back();
}
```

No validation rules, no queries and no transaction in the controller. Permission checks sit on the routes as middleware. Our post on [thin controllers](/blog/laravel-thin-controllers.html) goes through how to get there from a fat one.

## 3. Business logic in service classes

The work happens in `Modules/User/Services/UserService.php`:

```php
public function createUser(UserData $data): User
{
    $user = DB::transaction(function () use ($data): User {
        $user = new User([
            'name' => $data->name,
            'email' => $data->email,
            'password' => $data->sendInvitation ? Str::random(40) : $data->password,
        ]);

        $user->invited_at = $data->sendInvitation ? now() : null;
        $user->save();

        if ($data->role) {
            $this->permissionService->assignRole($user, $data->role);
        }

        return $user;
    });

    if ($data->sendInvitation) {
        $this->sendInvitation($user);
    }

    return $user;
}
```

Two details are worth looking for in any kit. The user and their role are saved in one transaction, so you never get a user without a role. And the invitation email goes out **after** the transaction, so nobody gets an email for a user that was rolled back. Services also get typed return values and PHPDoc where types aren't enough, like `@return LengthAwarePaginator<int, User>`.

Clean doesn't mean a layer for everything. The Tenant module has repositories for its read queries; the User module doesn't need them, so it doesn't have them. The [service layer pattern](/blog/laravel-service-layer-pattern.html) post covers where to draw that line.

## 4. Validated input as typed objects

In the Inertia kits, input arrives as a [spatie/laravel-data](/blog/laravel-data-objects.html) object. `UserData` holds the typed properties and the validation rules in one place (trimmed):

```php
#[TypeScript]
#[MapName(SnakeCaseMapper::class)]
class UserData extends Data
{
    public function __construct(
        public string $name,
        public string $email,
        public ?string $password = null,
        public ?string $role = null,
        public bool $sendInvitation = false,
        // ...
    ) {}

    public static function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique(User::class, 'email')->ignore($userId)],
            // ...
        ];
    }
}
```

The `#[TypeScript]` attribute means the same class becomes a TypeScript type for the frontend, so the form and the backend can't quietly drift apart:

```ts
export type UserData = {
    name: string;
    email: string;
    password: string | null;
    role: string | null;
    send_invitation: boolean;
    // ...
};
```

The Livewire kit uses classic Form Requests instead (`Modules/User/Http/Requests/UserRequest.php`) with matching rules. Either is clean. What isn't clean is `$request->all()` passed straight into a model.

## 5. Typed routes on the frontend

Hard-coded URLs like `'/users/' + id` break silently when a route changes. The Inertia kits use [Laravel Wayfinder](/blog/laravel-wayfinder-typed-routes.html), which generates TypeScript functions from your Laravel routes. From `pages/users/Partials/UserFormModal.vue`:

```ts
import { store, update } from '@/routes/users';

const formAction = computed(() =>
    selectedUser.value ? update(selectedUser.value.id) : store(),
);
```

That `formAction` goes straight into Inertia's `<Form :action="formAction">`. Rename the route or change its parameters, regenerate, and TypeScript tells you which pages broke.

## 6. Static analysis and formatting

Every kit has Larastan at level 7. This is the Vue kit's `phpstan.neon`:

```yaml
includes:
    - vendor/larastan/larastan/extension.neon
    - vendor/nesbot/carbon/extension.neon

parameters:
    paths:
        - app/
        - bootstrap/app.php
        - config/
        - database/
        - routes/

    level: 7
```

When you check a kit, read the `paths` as well as the level. A high level only covers the folders listed. In ours, `Modules/` isn't in that list yet, so level 7 currently applies to `app/`, config, database and routes.

Formatting is Laravel Pint. In the Vue kit it uses the `laravel` preset plus stricter rules such as `strict_comparison`, `no_unused_imports` and `ordered_class_elements`. The Inertia kits add ESLint and Prettier; the Livewire kit uses blade-formatter. The point isn't the exact rules. It's that nobody argues about style in code review. More in [Larastan and Pint](/blog/laravel-larastan-pint.html).

## 7. Tests and CI on every push

The kits use Pest. In the Vue kit, the feature tests cover authentication, settings and the dashboard. One Composer script runs every check, and the GitHub Actions workflow in `.github/workflows/tests.yml` runs it (through `composer ci:check`) on every push to `main` and every pull request:

```json
"test": [
    "@php artisan config:clear --ansi",
    "@lint:check",
    "@types:check",
    "@php artisan test"
]
```

`lint:check` runs Pint in test mode and the frontend linter, `types:check` runs PHPStan, then the tests run. If any step fails, the build fails. A kit that ships tests but no CI is asking you to remember to run them.

## 8. Guidelines for AI coding agents

Each kit ships Laravel Boost guidelines (`AGENTS.md`, `CLAUDE.md`) and skills for the packages it uses. In the Vue kit that includes Fortify, Wayfinder, Pest, laravel-data and stancl/tenancy. The guidelines tell an agent to follow the existing conventions and check sibling files before creating a new one. Clean code helps here twice: agents copy what they see, and short consistent files are easier for them to follow. See [Laravel Boost for AI agents](/blog/laravel-boost-ai-agents.html).

## What clean code doesn't mean

- **Not maximum abstraction.** An interface for every service and a repository for every model is more code to read, not cleaner code.
- **Not zero logic in controllers.** A guard like "you can't delete yourself" can live in the controller. Ours does.
- **Not one right style.** Actions vs services, Data objects vs Form Requests: both are fine if the kit picks one and sticks to it.

## Checklist: judge a kit's code before you buy

- [ ] Open two controllers. Are they short, with validation and logic elsewhere?
- [ ] Find where a "create" happens. Is it in a service with a transaction around related writes?
- [ ] Are emails and jobs sent after the transaction, not inside it?
- [ ] Is input validated through Form Requests or Data objects, never `$request->all()`?
- [ ] Is there one clear place for each kind of code (modules or `app/`), used consistently?
- [ ] Do frontend calls use typed routes (Wayfinder) or `route()` helpers, not string URLs?
- [ ] Does `phpstan.neon` exist? Which level, and which `paths`?
- [ ] Is there a Pint (or similar) config, and is it enforced?
- [ ] Are there tests, and what do they actually cover?
- [ ] Does a CI workflow run lint, static analysis and tests together?
- [ ] Are there guidelines for AI agents, and do they match the code?
- [ ] Does the kit look like Laravel's official kits, or invent its own conventions?

If the kit has a public repo, a demo repo or docs with code samples, you can tick most of these in half an hour.

For the wider picture, see [Best Laravel SaaS starter kits in 2026, compared](/blog/best-laravel-saas-starter-kits.html).

## Frequently asked questions

### Is a modular structure always cleaner than app/?

No. It helps once you have many features with their own routes, services and data. For a small app, Laravel's default layout used consistently is just as clean.

### Do I need spatie/laravel-data, or are Form Requests enough?

Form Requests are enough for validation. Data objects add typed properties and generated TypeScript types, which is useful in an Inertia app. In a Livewire app, Form Requests are the natural fit.

### What PHPStan level should a starter kit use?

There's no official number. Higher levels catch more type mistakes but need more annotations. We use level 7 in every kit. Check which folders the config covers, not only the level.

### Should a kit include tests for every feature?

Ideally the risky parts are covered: auth, permissions, tenant separation. Look at what a kit tests rather than counting files.

## Where SaaS Laravel fits

SaaS Laravel follows the patterns above in all four kits: modules, thin controllers, service classes, Data objects (Inertia) or Form Requests (Livewire), Wayfinder, Larastan level 7, Pint, Pest, a CI workflow and Boost guidelines. It's built on Laravel's official starter kits, so the folders and conventions will look familiar. The [architecture docs](/docs/core/architecture.html) and [project structure](/docs/getting-started/project-structure.html) show the layout, and [testing](/docs/core/testing.html) shows how the tests are set up.

It's not the right pick if you want a Filament admin with generated CRUD screens, or a single-database app. We explain the first in [why we didn't use Filament](/blog/why-no-filament-multi-tenant-saas-kit.html) and the second in [single database vs database-per-tenant kits](/blog/single-database-vs-database-per-tenant-starter-kit.html). And if you'd rather start from the official kits and add your own structure, read [official starter kits vs a SaaS boilerplate](/blog/laravel-official-starter-kits-vs-saas-boilerplate.html). Prices are on the [pricing page](/pricing.html), and the [Vue](/kits/vue.html), [React](/kits/react.html), [Svelte](/kits/svelte.html) and [Livewire](/kits/livewire.html) pages show each kit.

<BlogPostCta title="Read the code before you buy" text="SaaS Laravel uses modules, thin controllers, services, typed routes, Larastan level 7, Pint and Pest in Vue, React, Svelte and Livewire." />
