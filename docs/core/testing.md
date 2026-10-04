---
title: "Testing with Pest, Larastan & Pint"
description: "The Pest test suite, Larastan static analysis, Pint and frontend linting, the composer test pipeline and the AI agent rules about tests in the kits."
head:
  - - link
    - rel: canonical
      href: https://saas-laravel.com/docs/core/testing.html
  - - meta
    - property: og:title
      content: "Testing with Pest, Larastan & Pint"
  - - meta
    - property: og:description
      content: "The Pest test suite, Larastan static analysis, Pint and frontend linting, the composer test pipeline and the AI agent rules about tests in the kits."
  - - meta
    - property: og:url
      content: https://saas-laravel.com/docs/core/testing.html
  - - meta
    - name: twitter:title
      content: "Testing with Pest, Larastan & Pint"
  - - meta
    - name: twitter:description
      content: "The Pest test suite, Larastan static analysis, Pint and frontend linting, the composer test pipeline and the AI agent rules about tests in the kits."
---

# Testing

Each kit comes with a test suite and code quality checks. One command, `composer test`, runs them all, either locally or in CI.

| Tool | Purpose |
| --- | --- |
| Pest 5 + `pestphp/pest-plugin-laravel` | Feature and unit tests |
| Larastan (PHPStan) | Static analysis |
| Pint | PHP code style |
| ESLint, Prettier, framework type checker | Frontend lint and types (`npm run lint`) |

## Structure

```text
tests/
├── Feature/
│   ├── Auth/            # Authentication, EmailVerification, PasswordConfirmation, PasswordReset,
│   │                    # Registration, TwoFactorChallenge, VerificationNotification
│   ├── Settings/        # ProfileUpdate, Security (+ LayoutSetting in React/Svelte)
│   ├── Tenancy/         # React and Svelte: TenantAuthentication, TenantCreation
│   ├── DashboardTest.php
│   └── ExampleTest.php
├── Unit/ExampleTest.php
├── Pest.php             # Feature tests extend TestCase and use RefreshDatabase
└── TestCase.php         # skipUnlessFortifyHas() helper
```

::: tip Removing a Fortify feature
If you remove a feature from `config/fortify.php`, its auth tests skip instead of failing. That's what the `skipUnlessFortifyHas($feature)` helper in `tests/TestCase.php` is for.
:::

## Test environment

Tests use an in-memory SQLite database, so they never touch your MySQL data. These are the overrides in `phpunit.xml`:

| Key | Value |
| --- | --- |
| `DB_CONNECTION` / `DB_DATABASE` | `sqlite` / `:memory:` |
| `CACHE_STORE` | `array` |
| `SESSION_DRIVER` | `array` |
| `QUEUE_CONNECTION` | `sync` |
| `MAIL_MAILER` | `array` |
| `BCRYPT_ROUNDS` | `4` |

## Commands

```bash
php artisan test --compact                                  # all Pest tests
php artisan test --compact tests/Feature/Auth               # one folder
php artisan test --compact --filter="users can authenticate" # one test
composer test                                               # full CI check
```

`composer test` runs these steps in order:

```text
config:clear → lint:check (Pint + npm run lint) → types:check (PHPStan) → php artisan test
```

- In the Vue kit, `lint:check` also runs `wayfinder:generate --with-form`.
- `composer ci:check` does the same as `composer test`, just without a process timeout.

Frontend type checking happens inside `npm run lint` (`eslint . && prettier --check resources/ && <type checker>`). Each kit uses its framework's checker:

| Kit | Type checker |
| --- | --- |
| Vue | `vue-tsc --noEmit` |
| React | `tsc --noEmit` |
| Svelte | `svelte-check --tsconfig ./tsconfig.json` |

## Writing tests

```bash
php artisan make:test --pest ProjectTest          # tests/Feature/ProjectTest.php
php artisan make:test --pest --unit ProjectTest   # tests/Unit/ProjectTest.php
```

Here's a feature test for a page that needs a permission:

```php
use App\Models\User;

test('users with permission can view the users page', function () {
    $user = User::factory()->create();
    $user->givePermissionTo(
        Spatie\Permission\Models\Permission::findOrCreate('View Users', 'web')
    );

    $this->actingAs($user)->get(route('users.index'))->assertOk();
});
```

To test tenant behaviour, create a tenant, switch into it with `tenancy()->initialize($tenant)` or `$tenant->run(...)`, and end tenancy in `afterEach`. You'll find examples in `tests/Feature/Tenancy` in the React or Svelte kit.

## AI agent rules about tests

The kits include Laravel Boost guidelines for AI coding agents. Watch out: the two guideline files **don't agree** on tests.

| File | Used by | Test rule |
| --- | --- | --- |
| `CLAUDE.md` | Claude Code | Test Enforcement: every change must be tested; write or update a test and run the affected tests with `php artisan test --compact` |
| `AGENTS.md` | Codex, Junie and other agents | Testing Policy: do not create tests or run the suite unless the user asks |

They do agree on the basics: use Pest (`php artisan make:test --pest`), use factories, and never delete tests without approval.

::: tip Align the rules with your team
Edit both files so they match how your team works. Keep in mind that `php artisan boost:update` may regenerate them, and it runs after `composer update`.
:::

Project rules for agents are in `.ai/rules/`. For example, `.ai/rules/general.md` says new code shouldn't contain code comments.
