---
title: "Laravel Localization in 17 Languages"
description: "17 languages with one translation file per feature, per-user and per-domain language, translated validation messages and frontend translation helpers."
head:
  - - link
    - rel: canonical
      href: https://saas-laravel.com/docs/core/localization.html
  - - meta
    - property: og:title
      content: "Laravel Localization in 17 Languages"
  - - meta
    - property: og:description
      content: "17 languages with one translation file per feature, per-user and per-domain language, translated validation messages and frontend translation helpers."
  - - meta
    - property: og:url
      content: https://saas-laravel.com/docs/core/localization.html
  - - meta
    - name: twitter:title
      content: "Laravel Localization in 17 Languages"
  - - meta
    - name: twitter:description
      content: "17 languages with one translation file per feature, per-user and per-domain language, translated validation messages and frontend translation helpers."
---

# Localization

The kits come with 17 languages. You write translations once, as Laravel PHP files, and they're shared with the frontend, so your backend and your components always use the same strings.

```text
lang/<locale>/*.php
  → php artisan erag:generate-lang
  → resources/js/lang/<locale>/*.json
  → shared as the Inertia `lang` prop
  → __('...') in components
```

Two packages handle the sharing: `erag/laravel-lang-sync-inertia` (PHP) and `@erag/lang-sync-inertia` (JS).

## Languages

The list lives in `Modules\Settings\Enums\LanguageEnum`:

| Code | Language | Code | Language |
| --- | --- | --- | --- |
| `en` | English (default) | `nl` | Dutch |
| `hi` | Hindi | `id` | Indonesian |
| `es` | Spanish | `bn` | Bengali |
| `fr` | French | `pl` | Polish |
| `de` | German | `vi` | Vietnamese |
| `it` | Italian | `th` | Thai |
| `pt` | Portuguese | `ko` | Korean |
| `ru` | Russian | `tr` | Turkish |
| `ja` | Japanese | | |

`LanguageEnum::DEFAULT` is English, and `LanguageEnum::resolve()` falls back to it when it gets a code it doesn't know.

## File layout

Laravel's core files sit at the top of each locale. The kit's own strings are split into one file per feature under `modules/`.

```text
lang/<locale>/
├── auth.php  pagination.php  passwords.php  validation.php     # Laravel core
└── modules/                                                    # one file per feature
    ├── auth.php  common.php  dashboard.php  domain.php  errors.php  home.php  layout.php
    └── maintenance.php  menu.php  role.php  security.php  settings.php  tenant.php  user.php

resources/js/lang/<locale>/        # generated JSON, same structure
```

## How the locale is resolved

`SetUserLocale` runs on every web request and picks the first value that exists:

1. User language: `users.locale`, if the signed-in user has picked one
2. Domain default: `domains.locale` of the current tenant domain (tenant context only)
3. App default: `APP_LOCALE` (`en`)

Users can change their language on their Profile or from the user menu (`PATCH /settings/language`, route `language.update`). Picking **Default** stores `null`, which means the user follows the domain or app default.

| Shared prop | Content |
| --- | --- |
| `locale` | Active locale |
| `userLocale` | User's choice, or `null` |
| `defaultLocale` | Domain or app default |
| `languages` | Options for language selects |

Related files: `Modules/Settings/Http/Middleware/SetUserLocale.php`, `Modules/Settings/Enums/LanguageEnum.php`.

## Using translations

A key is the file path plus the array path. PHP uses `/` for sub-folders, while components use `.` everywhere.

| Where | Key format | Example |
| --- | --- | --- |
| PHP | `modules/<file>.<key>` | `__('modules/tenant.toasts.created')` |
| Components | `modules.<file>.<key>` | `__('modules.tenant.index.title')` |

Placeholders work the way they do in Laravel, on both sides: `__('modules/user.notifications.invitation.expires', ['days' => 7])` in PHP, `__('...', { name: user.name })` in components. For pluralization there's `transChoice`.

Translations also get used in two places where you don't call them yourself:

- Data objects translate validation attribute names and messages in `attributes()` and `messages()`.
- Menu titles use `modules/common.nav.<slug>` (dots and dashes in the slug become underscores) and fall back to the `title` column.

### In components

Import the helper for your framework from its own subpath:

::: code-group

```vue [Vue]
<script setup lang="ts">
import { vueLang } from '@erag/lang-sync-inertia/vue';

const { __ } = vueLang();
</script>

<template>
    <h1>{{ __('modules.tenant.index.title') }}</h1>
</template>
```

```tsx [React]
import { reactLang } from '@erag/lang-sync-inertia/react';

export default function Title() {
    const { __ } = reactLang();

    return <h1>{__('modules.tenant.index.title')}</h1>;
}
```

```svelte [Svelte]
<script lang="ts">
    import { svelteLang } from '@erag/lang-sync-inertia/svelte';

    const { __ } = svelteLang();
</script>

<h1>{__('modules.tenant.index.title')}</h1>
```

:::

The helper returns `trans` and `transChoice` as well.

::: warning Always use the subpath import
Import from `@erag/lang-sync-inertia/vue`, `/react` or `/svelte`. Importing from the root `@erag/lang-sync-inertia` breaks the build in the kits.
:::

## Generating frontend JSON

The frontend reads the generated JSON, not the PHP files. Whenever you edit a file in `lang/`, regenerate it and commit the output:

```bash
php artisan erag:generate-lang
```

| Config key (`config/inertia-lang.php`) | Value |
| --- | --- |
| `lang_path` (source) | `lang/` |
| `output_lang` (output) | `resources/js/lang/` |

What the backend shares is this generated JSON merged with any translations loaded at runtime.

## Adding a translation key

1. Add the key to `lang/en/modules/<feature>.php`.
2. Add the same key to the other 16 locales. If one is missing, the frontend falls back to the raw key string.
3. Run `php artisan erag:generate-lang`.
4. Use it: `__('modules/<feature>.key')` in PHP, `__('modules.<feature>.key')` in components.

If it's a new feature, create `lang/<locale>/modules/<feature>.php` in every locale.

## Adding a language

1. Add a case and a label to `Modules\Settings\Enums\LanguageEnum`, for example `case Swedish = 'sv';` and `self::Swedish => 'Svenska'` in `label()`.
2. Copy `lang/en` to `lang/sv` and translate it.
3. Run `php artisan erag:generate-lang`.
4. Run `php artisan typescript:transform` so the enum type in `resources/js/types` gets updated.

After that, the new language shows up in the language selects on the profile, the user menu and the domain settings.
