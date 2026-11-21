---
title: "Weekly Starter Kit Updates"
description: "Weekly updates are pushed to your kit repository. Set the kit as your upstream remote and merge updates into your own project when you are ready."
---

# Updates

Your purchase includes **lifetime access with weekly updates**. You pay once. There's no subscription. This page shows how to bring those updates into your own project.

<KeyIdea>

Keep the kit as the `upstream` remote and your own repository as `origin`. Pulling an update is then a normal `git merge upstream/main`.

</KeyIdea>

## How updates are delivered

<FlowDiagram label="How updates are delivered" :nodes="['Weekly updates', 'Your kit repository (`main`)', 'Your `upstream/main`', 'Merge into your project']" />

- Updates are pushed weekly to your kit repository (`saas-laravel-starter-kit-vue`, `-react`, `-svelte` or `-livewire`).
- The `main` branch always has the latest version.
- The [Release Notes](/releases) page lists what changed in each update.
- To get notified, watch the repository on GitHub (**Watch → Custom → Releases/All activity**).

## Recommended remote setup

Keep the kit as `upstream` and your own repository as `origin`:

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

Check the result with `git remote -v`. With the All Starter Kits bundle, add each kit as the `upstream` of the project built on it.

## Pulling an update

1. Merge the kit into a separate branch:

   ```bash
   git checkout -b kit-update
   git fetch upstream
   git log --oneline HEAD..upstream/main    # list the new kit commits
   git merge upstream/main
   ```

2. Fix any conflicts, then update your dependencies, databases and generated files (commands below).
3. When everything passes, merge `kit-update` into your main branch.

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

The Livewire kit has no generated frontend files, so skip `typescript:transform` and `wayfinder:generate` there. It also has no `erag:generate-lang` command.
:::

::: warning Check new migrations
Read any new files in `database/migrations` and `database/migrations/tenant` before you run them in production, and back up your databases first. Seeders can change too (menus, permissions), so re-run them where needed (see [Users, roles & permissions](/docs/core/users-roles-permissions#adding-a-permission)).
:::

::: tip Fewer conflicts
- Build new features as new modules in `Modules/`, with new pages and components, rather than editing kit files in place.
- Put your own translations in new files under `lang/<locale>/modules/`.
- Add new permissions in new files in `config/permissions/`.
- Generated files (`resources/js/lang`, `resources/js/types`) often conflict. Take either side, then re-run the generators above.
:::

## Cherry-picking

To take a single fix:

```bash
git fetch upstream
git log --oneline upstream/main
git cherry-pick <commit-sha>
```

<RelatedPages :links="[
  { text: 'Release notes', link: '/releases', desc: 'What changed in each update.' },
  { text: 'Repository access', link: '/docs/purchase/repository-access', desc: 'Get into the kit repository and clone it.' },
  { text: 'Commands', link: '/docs/reference/commands#updating-dependencies', desc: 'Raise Composer and npm versions in your own project.' },
]" />
