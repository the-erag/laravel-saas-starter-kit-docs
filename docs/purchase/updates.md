---
title: "Weekly Starter Kit Updates"
description: "Weekly updates are pushed to your kit repository. Set the kit as your upstream remote and merge updates into your own project when you are ready."
---

# Updates

Your purchase includes **lifetime access with weekly updates**. You pay once; there's no subscription.

## How updates are delivered

```text
Weekly updates → your kit repository (main) → your upstream/main → merge into your project
```

- Every update is pushed to your kit repository (`saas-laravel-starter-kit-vue`, `-react` or `-svelte`).
- We publish updates weekly, and the `main` branch of your kit repository always has the latest version.
- The [Release Notes](/releases) page lists what changed in each update.
- If you'd like a notification, watch the repository on GitHub (**Watch → Custom → Releases/All activity**).

## Recommended remote setup

We suggest keeping the kit as `upstream` and your own repository as `origin`:

<PrivateRepoNotice />

| Remote | Points to |
| --- | --- |
| `origin` | Your project, e.g. `git@github.com:your-org/my-saas.git` |
| `upstream` | The kit, e.g. `https://github.com/the-erag/saas-laravel-starter-kit-vue.git` |

::: code-group

```bash [Cloned the kit directly]
git remote rename origin upstream
git remote add origin git@github.com:your-org/my-saas.git
git push -u origin main
```

```bash [Started from a copy]
git remote add upstream https://github.com/the-erag/saas-laravel-starter-kit-vue.git
git fetch upstream
git merge upstream/main --allow-unrelated-histories
```

:::

You can check the result with `git remote -v`. If you have the All Starter Kits bundle, add each kit you use as the `upstream` of the project built on it.

## Pulling an update

1. Merge the kit into a separate branch:

   ```bash
   git checkout -b kit-update
   git fetch upstream
   git log --oneline HEAD..upstream/main    # what changed
   git merge upstream/main
   ```

2. Fix any conflicts, then update your dependencies, databases and generated files (the commands are below).
3. Once everything passes, merge `kit-update` into your main branch.

::: details Commands to run after merging
```bash
composer install
npm install
php artisan migrate
php artisan tenants:migrate
php artisan erag:generate-lang
php artisan typescript:transform
php artisan wayfinder:generate --with-form
npm run build
php artisan test --compact
```
:::

::: warning Check new migrations
Read any new files in `database/migrations` and `database/migrations/tenant` before you run them in production, and back up your databases first. Seeders can change too (menus, permissions), so re-run them where you need to (see [Users, roles & permissions](/docs/core/users-roles-permissions#adding-a-permission)).
:::

::: tip Fewer conflicts
- Build new features as new modules in `Modules/`, with new pages and components, rather than editing kit files in place.
- Put your own translations in new files under `lang/<locale>/modules/`.
- Add new permissions in new files in `config/permissions/`.
- Generated files (`resources/js/lang`, `resources/js/types`) often conflict. Take either side, then re-run the generators above.
:::

## Cherry-picking

If you only want one specific fix:

```bash
git fetch upstream
git log --oneline upstream/main
git cherry-pick <commit-sha>
```
