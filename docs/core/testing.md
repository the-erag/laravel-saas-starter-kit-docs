---
title: "Testing with Pest, Larastan & Pint"
description: "The Pest test suite, Larastan static analysis, Pint and frontend linting, the composer test pipeline and the AI agent rules about tests in the kits."
---

# Testing

Each kit comes with a test suite and code quality checks. `composer test` runs them all, locally or in CI.

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

| To run | Command |
| --- | --- |
| All Pest tests | `php artisan test --compact` |
| One folder | `php artisan test --compact tests/Feature/Auth` |
| One test | `php artisan test --compact --filter="users can authenticate"` |
| The full CI check | `composer test` |

`composer test` runs these steps in order:

<FlowDiagram label="composer test steps" :nodes="['`config:clear`', { label: '`lint:check`', note: 'Pint + `npm run lint`' }, { label: '`types:check`', note: 'PHPStan' }, '`php artisan test`']" />

- In the Vue kit, `lint:check` also runs `wayfinder:generate --with-form`.
- `composer ci:check` runs `composer test` without a process timeout.

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

To test tenant behaviour, create a tenant, switch into it with `tenancy()->initialize($tenant)` or `$tenant->run(...)`, and end tenancy in `afterEach`. The React and Svelte kits have examples in `tests/Feature/Tenancy`.

## AI agent rules about tests

The kits include Laravel Boost guidelines for AI coding agents: `CLAUDE.md` for Claude Code and `AGENTS.md` for Codex, Junie and other agents. Both files have the same Test Enforcement rules:

- Add or update tests for behaviour and logic changes when a test gives real regression coverage. Copy, styling and layout-only changes don't need tests.
- Run the affected tests with `php artisan test --compact` and make sure they pass.
- Use Pest (`php artisan make:test --pest`), use factories, and never delete tests without approval.

::: tip Align the rules with your team
Edit both files so they match how your team works. Keep in mind that `php artisan boost:update` may regenerate them, and it runs after `composer update`.
:::

The Vue kit also has project rules for agents in `.ai/rules/`. For example, `.ai/rules/general.md` says new code shouldn't contain code comments.

For the same setup explained step by step with this code, read the [Laravel multi-tenancy tutorial](/guides/laravel-multi-tenancy-tutorial.html).

<RelatedPages :links="[
  { text: 'Commands', link: '/docs/reference/commands#composer-scripts', desc: 'Every Composer, npm and Artisan command in one place.' },
  { text: 'Local development', link: '/docs/getting-started/local-development#tests-and-checks', desc: 'Running the tests and checks during your first setup.' },
  { text: 'Multi-tenancy', link: '/docs/core/multi-tenancy#working-in-tenant-context-from-code', desc: 'Running code inside a tenant, which tenant tests also need.' }
]" />
