---
title: "Laravel Precognition with Inertia: Live Validation in v3"
description: "Laravel Precognition with Inertia v3: the middleware, Form Requests, validate(), touch() and validating in Vue, React and Svelte, plus files and migration."
pageClass: blog-page
date: 2026-11-04
author: annu-gupta
category: frontend
tags: [Inertia, Validation, Precognition]
---

# Laravel Precognition with Inertia: Live Validation Without the Old Packages

<BlogPostMeta />

You want a form to tell the user "this email is already taken" while they're still filling it in, not after they press Save. Writing the same rules again in JavaScript is a trap: the two copies drift apart, and anything that needs the database, like a `unique` rule, can't run in the browser anyway. **Laravel Precognition** solves this by asking your real Laravel validation rules, before the real submit.

Most guides you'll find for Laravel Precognition with Inertia are out of date. They tell you to install `laravel-precognition-vue-inertia` or `laravel-precognition-react-inertia`. Since Inertia 2.3, Precognition is built into Inertia's own form helpers, and those packages don't support Inertia v3. Below we set up Inertia live validation the current way: the middleware, where validation must live, the `Form` component and `useForm` in Vue, React and Svelte, debouncing, file uploads, side effects, and a migration path from the old packages.

We're using Laravel 13 and Inertia v3 (3.11 is the latest release at the time of writing).

## What changed: Precognition is part of Inertia now

| | Before (Inertia 1.x and 2.0 to 2.2) | Now (Inertia 2.3 and later, including v3) |
| --- | --- | --- |
| Package | `laravel-precognition-vue-inertia` or `-react-inertia` (0.x) | None, it's in `@inertiajs/vue3`, `/react` and `/svelte` |
| Svelte | No official Inertia package | Supported |
| `Form` component | Not supported | Built in, no extra prop needed |
| `useForm` | `useForm(method, url, data)` from the Precognition package | `useForm(data).withPrecognition(method, url)` or the old signature |
| Server side | `HandlePrecognitiveRequests` middleware | Unchanged |

The last release of the old Inertia packages, 0.8.0 from November 2025, lists `@inertiajs/vue3` `^1.0.0 || ^2.0.0` as its peer dependency. If you're on Inertia v3, you shouldn't install them at all. (The non-Inertia packages, `laravel-precognition-vue` and `laravel-precognition-react`, are still maintained, for apps that don't use Inertia.)

## How Laravel Precognition works

Precognition is a normal request with an extra header. When the user changes a field, Inertia sends the form data to the same URL and method as the real submit, with `Precognition: true` and `Precognition-Validate-Only: email` (the fields being checked).

On the server, the `HandlePrecognitiveRequests` middleware swaps Laravel's controller dispatcher for a "precognitive" one. Laravel then:

1. Runs all of the route's middleware as usual.
2. Resolves the controller method's parameters, including route model binding and your Form Request, which validates.
3. **Doesn't call the controller method.** Instead it returns `204 No Content` with a `Precognition-Success: true` header, or `422` with the validation errors.

That third step is the whole trick, and it tells you where your validation must live. It has to happen while parameters are resolved, so in a Form Request (or another class that validates when it's injected). A `$request->validate()` call inside the controller body never runs on a precognitive request.

## Step 1: Add the middleware to the route

Add the middleware to every route you want to validate live. Laravel registers it under the alias `precognitive`:

```php
use Modules\User\Http\Controllers\UserController;

Route::post('users', [UserController::class, 'store'])
    ->middleware('precognitive')
    ->name('users.store');

Route::put('users/{user}', [UserController::class, 'update'])
    ->middleware('precognitive')
    ->name('users.update');
```

The full class name works too: `Illuminate\Foundation\Http\Middleware\HandlePrecognitiveRequests::class`. The [Laravel Precognition docs](https://laravel.com/docs/13.x/precognition) cover the server side in full. Without the middleware, live checks fail with a "Did not receive a Precognition response" error in the browser console.

## Step 2: Put validation in a Form Request

The controller stays thin and never knows about Precognition:

```php
final class UserController extends Controller
{
    public function __construct(private UserService $users) {}

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $this->users->create($request->validated());

        return to_route('users.index');
    }
}
```

```php
<?php

namespace Modules\User\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

final class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('Create User');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique(User::class)],
            'password' => [
                'required',
                'confirmed',
                $this->isPrecognitive() ? Password::min(8) : Password::defaults()->uncompromised(),
            ],
        ];
    }
}
```

Form Requests already understand Precognition. They only check the fields listed in `Precognition-Validate-Only`, so typing an email doesn't show "The name field is required" for a field the user hasn't reached yet. `authorize()` runs on every precognitive request too, so a user without permission gets a 403, not a hint about your data.

`$this->isPrecognitive()` lets you change rules for live checks. Here the `uncompromised()` check, which calls an external API, only runs on the real submit, not on every keystroke.

### Using spatie/laravel-data objects instead

If your controllers take a [laravel-data object](/blog/laravel-data-objects.html) instead of a Form Request, it validates while parameters are resolved, so it works with Precognition. There's one catch: as of laravel-data 4.23, data objects don't read the `Precognition-Validate-Only` header, so every rule runs, and errors for untouched fields come back too. You can apply the same filter Form Requests use in the data object's `withValidator()` hook:

```php
use Illuminate\Validation\Validator;

public static function withValidator(Validator $validator): void
{
    if (request()->isPrecognitive()) {
        $validator->setRules(
            request()->filterPrecognitiveRules($validator->getRulesWithoutPlaceholders())
        );
    }
}
```

## Step 3: Inertia live validation with the Form component

The `<Form>` component supports Precognition with no extra props. Its slot gives you `validate`, `valid`, `invalid` and `validating`. If you're new to the component itself, start with our [Inertia Form component guide](/blog/inertia-form-component.html).

```vue
<script setup lang="ts">
import { Form } from '@inertiajs/vue3';
import { store } from '@/routes/users';
</script>

<template>
    <Form
        v-bind="store.form()"
        #default="{ errors, invalid, valid, validate, validating, processing }"
    >
        <input name="name" @change="validate('name')" />
        <p v-if="invalid('name')">{{ errors.name }}</p>

        <input name="email" type="email" @change="validate('email')" />
        <p v-if="invalid('email')">{{ errors.email }}</p>
        <p v-else-if="valid('email')">Looks good.</p>

        <p v-if="validating">Checking...</p>

        <button type="submit" :disabled="processing">Create user</button>
    </Form>
</template>
```

`store.form()` is a [Wayfinder](/blog/laravel-wayfinder-typed-routes.html) route object, so the live check and the submit always hit the same route. A plain `action="/users" method="post"` works the same way.

React and Svelte are the same, with their own slot syntax:

```tsx
<Form action="/users" method="post">
    {({ errors, invalid, validate, validating }) => (
        <>
            <input name="email" type="email" onChange={() => validate('email')} />
            {invalid('email') && <p>{errors.email}</p>}
            {validating && <p>Checking...</p>}
            <button type="submit">Create user</button>
        </>
    )}
</Form>
```

```svelte
<Form action="/users" method="post">
    {#snippet children({ errors, invalid, validate, validating })}
        <input name="email" type="email" onchange={() => validate('email')} />
        {#if invalid('email')}<p>{errors.email}</p>{/if}
        {#if validating}<p>Checking...</p>{/if}
        <button type="submit">Create user</button>
    {/snippet}
</Form>
```

Two details from the [Inertia forms docs](https://inertiajs.com/docs/v3/the-basics/forms) are worth knowing. A field only counts as `valid` or `invalid` after it has changed and a response came back. And `validate('email')` sends nothing while the value still equals its initial value, so validating an untouched field does nothing.

## Using useForm with withPrecognition

When you keep form state in JavaScript, chain `withPrecognition()` onto `useForm`:

```vue
<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import { store } from '@/routes/users';

const form = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
}).withPrecognition(store());
</script>

<template>
    <form @submit.prevent="form.submit({ onSuccess: () => form.reset() })">
        <input v-model="form.email" @change="form.validate('email')" />
        <p v-if="form.invalid('email')">{{ form.errors.email }}</p>

        <button :disabled="form.processing">Create user</button>
    </form>
</template>
```

`withPrecognition('post', '/users')` takes a method and URL; with Wayfinder, pass the route object. Once it's set, `submit()` with no URL posts to that endpoint, and it still accepts the usual visit options. For backward compatibility, `useForm('post', '/users', { ... })` works as well.

In React, the hook returns the same helpers: `const { data, setData, validate, invalid, errors, validating } = useForm('post', '/users', { email: '' })`. The Inertia docs validate on blur there (`onBlur={() => validate('email')}`), because React's `onChange` fires on every keystroke. In Svelte, `useForm` from `@inertiajs/svelte` works with `bind:value={form.email}` and `onchange={() => form.validate('email')}`.

## Touched fields and validating a whole step

Sometimes you don't want a request per field. Mark fields as touched on blur, then validate them together:

```vue
<input v-model="form.name" @blur="form.touch('name')" />
<input v-model="form.email" @blur="form.touch('email')" />

<button type="button" @click="form.validate()">Check these fields</button>
<p v-if="form.touched('email')">You have edited the email.</p>
```

`validate()` with no arguments checks every touched field. For multi-step forms, validate a set of fields whether or not they were touched, and only move on when they pass:

```ts
form.validate({
    only: ['name', 'email'],
    onSuccess: () => (step.value = 2),
    onValidationError: () => {
        // a 422 came back; errors are already filled in
    },
});
```

The options also include `onBeforeValidation` (return `false` to skip a request) and `onFinish`. `form.reset()` clears the touched state of the fields it resets.

## Debouncing

Inertia debounces Precognition requests for you. The first request goes out at once, and later changes wait 1,500 ms by default, cancelling requests that are no longer needed. You can change the wait:

```vue
<Form action="/users" method="post" :validation-timeout="500">
```

With `useForm`, call `form.setValidationTimeout(500)`. Lower feels snappier but sends more requests. For fields that hit the database, like `unique`, the default is a sensible choice.

## File uploads

By default, files aren't sent with precognitive requests, so a 20 MB upload doesn't travel to your server on every change. That means a `required` rule on a file field would always fail during live validation. Only require the file on the real submit:

```php
'avatar' => [
    ...$this->isPrecognitive() ? [] : ['required'],
    'image',
    'mimes:jpg,png',
    'max:2048',
],
```

If you do want files checked live (to show "this file is too big" early), turn it on with the `validate-files` prop on `<Form>` (`validateFiles` in React and Svelte) or `form.validateFiles()` with `useForm`. File uploads and progress are covered in the [Form component guide](/blog/inertia-form-component.html).

## Side effects to skip on precognitive requests

A precognitive request runs all of your route's middleware and resolves the controller's parameters. Anything with side effects in those places runs on every live check:

- **Middleware that writes.** Counting visits, updating `last_seen_at` or writing audit entries should be wrapped in `if (! $request->isPrecognitive())`.
- **Rate limiting.** A `throttle` middleware counts precognitive requests like any other. If a route has `throttle:10,1`, ten live checks can lock out the real submit. Raise the limit, or use a named rate limiter that returns `Limit::none()` when `$request->isPrecognitive()`.
- **Expensive rules.** Rules that call external APIs or run heavy queries can be skipped with `isPrecognitive()`, as with `uncompromised()` above.
- **`prepareForValidation()`.** It runs on every check. Keep it pure: trimming and normalising are fine, creating records isn't.

The controller method and your service never run, so the actual create or update can't happen by accident.

## Migrating from laravel-precognition-vue-inertia

If you're upgrading an older app to Inertia v3, the move is mostly deletions:

1. Remove the old package: `npm uninstall laravel-precognition-vue-inertia` (or `laravel-precognition-react-inertia`).
2. Change the import from `laravel-precognition-vue-inertia` to `@inertiajs/vue3` (or `@inertiajs/react`). The `useForm('post', url, data)` signature still works, so most forms need nothing else.
3. Search for `client` imports from the old package, used for custom Axios headers. They go away with the package. A normal Inertia app with session cookies doesn't need them, because Inertia already sends the CSRF token with precognitive requests. If you relied on custom headers, test those routes after the switch.
4. Leave the server alone. The `precognitive` middleware, your Form Requests and `isPrecognitive()` checks are unchanged.
5. Consider moving simple forms to `<Form>`, where Precognition needs no setup at all.

The rest of the v3 upgrade, like the Vite plugin and the Axios removal, is in [Inertia.js v3: what's new](/blog/inertia-js-v3-whats-new.html).

## Common pitfalls

- **Validating in the controller.** `$request->validate()` or an action class called from the controller never runs on a precognitive request, and Laravel answers 204, so every field looks valid. Fortify's registration route is an example: it validates inside the `CreateNewUser` action, so the route can't be live-validated without your own Form Request in front of it.
- **Forgetting the middleware on the update route.** Create and edit forms often share a component. Both routes need `precognitive`.
- **Errors for untouched fields.** If they appear as soon as the user types, your validation isn't filtering by `Precognition-Validate-Only`. That's the data-object case above.
- **Live checks that reveal data.** A `unique:users,email` check tells anyone whether an email is registered. On public forms like registration, that's an account enumeration risk. Rate limit the route, or skip that rule during precognition.
- **Testing only the happy path.** Laravel's `withPrecognition()` test helper and `assertSuccessfulPrecognition()` let you check that a live check passes and that nothing was created.

## Frequently asked questions

### Do I still need laravel-precognition-vue-inertia with Inertia v3?

No. Since Inertia 2.3, Precognition is built into `@inertiajs/vue3`, `@inertiajs/react` and `@inertiajs/svelte`. The old packages only support Inertia 1 and 2, so uninstall them and import `useForm` or `Form` from your Inertia adapter.

### How does Inertia live validation work with the Form component?

Add the `precognitive` middleware to the route and validate in a Form Request. Then call `validate('field')` from the component's slot on change or blur, and read `invalid('field')`, `valid('field')` and `validating`. No extra prop is needed on `<Form>`.

### Why does Precognition say every field is valid?

Your validation probably runs inside the controller method, which Laravel doesn't call for precognitive requests. Move the rules into a Form Request or another class that's injected into the method, so they run while parameters are resolved.

### Can I use Laravel Precognition with Livewire?

You usually don't need to. Precognition's frontend helpers are for JavaScript frontends: Vue, React and Svelte through Inertia, plus Alpine with Blade. Livewire already talks to the server on every update, so its own real-time validation runs your rules there without Precognition.

## Precognition in the SaaS Laravel kits

The Vue, React and Svelte [SaaS Laravel kits](/) run on Inertia v3 (`@inertiajs/*` 3.9), so built-in Precognition is available with no extra package, but the kits don't turn it on for any route today. Most forms already use the `<Form>` component with Wayfinder route objects, which is the easiest place to add `validate('field')`. One thing to know: the Inertia kits validate with [spatie/laravel-data objects](/blog/laravel-data-objects.html) (for example `UserData` in `Modules/User/Data`), so add the `withValidator()` filter shown above before you enable live validation on a route. The Livewire kit uses Form Requests and Livewire's own validation. See [Inertia v3 with Vue](/docs/vue/inertia.html) for how the kits structure forms.

<BlogPostCta title="Inertia v3 forms, ready for live validation" text="SaaS Laravel kits use Inertia v3's Form component with Wayfinder routes and data objects in Vue, React and Svelte, so adding Precognition to a form is a small change." />
