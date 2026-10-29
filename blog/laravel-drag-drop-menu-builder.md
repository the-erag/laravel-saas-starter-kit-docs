---
title: "Laravel Drag and Drop Menu Builder for Inertia (No Package)"
description: "Build a drag and drop menu builder in Laravel and Inertia without a package: a menus table, a safe reorder endpoint, SortableJS or dnd-kit and tests."
pageClass: blog-page
date: 2026-10-28
author: annu-gupta
category: frontend
tags: [Menus, Inertia]
---

# Laravel Drag and Drop Menu Builder for Inertia: Database Menus Your Admins Can Reorder

<BlogPostMeta />

A hardcoded menu is fine until a customer asks you to move "Reports" above "Users". In a SaaS that request comes early, and every customer wants a slightly different order. If your menu lives in the database and admins can drag items around, you never have to ship a release just to swap two links.

This post walks through how we built the menu builder in our SaaS starter kit with Laravel and Inertia: the table, a reorder endpoint that can't be abused, the drag and drop part in Vue, React or Svelte, and a Reset Defaults button for when someone gets a bit too creative.

## Why not just install a package?

There are Laravel menu builder packages, and we looked at them. Most were built for Blade and jQuery, for Laravel Nova, or for Filament. Some haven't been updated in years. None of them fit an Inertia app with Vue, React or Svelte, a permission system and multiple languages.

The good news is that you don't need a package. It's one table, one endpoint and a drag and drop library you probably already know.

## The menus table

Each menu item needs to know its position, its parent and where it links to:

```php
Schema::create('menus', function (Blueprint $table) {
    $table->id();
    $table->foreignId('parent_id')->nullable()->constrained('menus')->cascadeOnDelete();
    $table->string('title');            // a translation key, like modules/common.nav.users
    $table->string('slug')->unique();
    $table->string('route_name')->nullable();
    $table->string('icon')->nullable(); // like lucide:users
    $table->string('permission')->nullable();
    $table->unsignedInteger('sort_order')->default(0);
    $table->timestamps();
});
```

A few choices here make life easier later:

- `title` stores a translation key instead of text, so the menu shows up in each user's language. See [translations in Laravel and Inertia](/blog/laravel-inertia-translations.html).
- `slug` is unique and never changes, so your code and seeders can always find an item, even after someone moves it.
- `permission` sits right on the item, so you can hide what a user isn't allowed to open. More on that in [permission-based menus](/blog/laravel-inertia-permission-menus.html).

In a multi-tenant app, put this table in each tenant's database. Then every customer can have their own order.

## Seed the default menu

The default menu lives in a seeder. It uses `updateOrCreate` on the slug, so you can run it again safely, and it's also what powers Reset Defaults later:

```php
final class MenuSeeder extends Seeder
{
    public function run(): void
    {
        foreach (config('menus.defaults') as $index => $item) {
            Menu::query()->updateOrCreate(
                ['slug' => $item['slug']],
                [...$item, 'sort_order' => $index + 1, 'parent_id' => null],
            );
        }
    }
}
```

## A reorder endpoint you can trust

After every drop, the browser sends the new order to the server. That data comes from the user's browser, so check it properly and never trust the IDs blindly:

```php
final class ReorderMenuRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('Reorder Navigation Menus');
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array'],
            'items.*.id' => ['required', 'integer', 'exists:menus,id'],
            'items.*.parent_id' => ['nullable', 'integer', 'exists:menus,id'],
            'items.*.sort_order' => ['required', 'integer', 'min:0'],
        ];
    }
}
```

Keep the controller small and save the changes in a service, inside one transaction, so you can never end up with half the menu saved:

```php
final class MenuService
{
    /**
     * @param  array<int, array{id: int, parent_id: ?int, sort_order: int}>  $items
     */
    public function reorder(array $items): void
    {
        DB::transaction(function () use ($items) {
            foreach ($items as $item) {
                Menu::query()->whereKey($item['id'])->update([
                    'parent_id' => $item['parent_id'],
                    'sort_order' => $item['sort_order'],
                ]);
            }
        });

        Cache::forget('menus');
    }
}
```

A menu has a few dozen rows at most, so updating them one by one is perfectly fine. Clear the cached menu at the end so the sidebar shows the new order on the next page load.

Also make sure an item can't become its own parent, and a parent can't be moved inside one of its own children. A quick check that walks up the `parent_id` chain in the service is enough.

## The drag and drop part

Use a library that suits your frontend:

| Frontend | Library | Notes |
| --- | --- | --- |
| Vue | SortableJS (through `vue-draggable-plus`) | Easy for flat and nested lists |
| React | dnd-kit | Accessible, with keyboard support built in |
| Svelte | SortableJS or `svelte-dnd-action` | Works fine with Svelte 5 |

Whichever you pick, the idea is the same. Let people drag a small grip handle, not the whole row, so clicking a link still works. Update the list on the page right away, then send the new order to the server:

```ts
import { router } from '@inertiajs/vue3';

function saveOrder(items: MenuRow[]): void {
    router.post(
        reorderMenus.url(),
        {
            items: items.map((item, index) => ({
                id: item.id,
                parent_id: item.parent_id,
                sort_order: index + 1,
            })),
        },
        { preserveScroll: true, preserveState: true },
    );
}
```

`preserveScroll` and `preserveState` stop the page from jumping. Show a short message like "Menu order updated" when it's saved. You don't need a separate Save button; people expect drag and drop to just stick.

## Reset Defaults

Sooner or later an admin will drag everything into a mess. A Reset Defaults button that runs the seeder again puts things back:

```php
public function resetDefaults(): void
{
    DB::transaction(fn () => app(MenuSeeder::class)->run());

    Cache::forget('menus');
}
```

Because the seeder matches on `slug`, it puts back the titles, icons and positions without deleting anything a later update added.

## Show it in the sidebar

The sidebar reads the same table, hides items the user isn't allowed to see, sorts by `sort_order` and gets the result as an Inertia prop. Child items appear under their parent. If you also have a top navigation layout, show the same items as dropdowns there. See [customizing the starter kit sidebar](/blog/laravel-inertia-sidebar-layout.html).

## Test it

Two tests cover what matters most:

```php
it('lets users with the permission reorder menus', function () {
    $admin = User::factory()->create()->givePermissionTo('Reorder Navigation Menus');
    [$first, $second] = Menu::factory()->count(2)->create();

    $this->actingAs($admin)->post(route('setup.menus.reorder'), [
        'items' => [
            ['id' => $second->id, 'parent_id' => null, 'sort_order' => 1],
            ['id' => $first->id, 'parent_id' => null, 'sort_order' => 2],
        ],
    ])->assertRedirect();

    expect($second->fresh()->sort_order)->toBe(1);
});

it('stops users without the permission', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('setup.menus.reorder'), ['items' => []])
        ->assertForbidden();
});
```

## Frequently asked questions

### Should menus live in the database or in code?

In code if they never change. In the database if admins or customers should control the order, the labels or what's visible. For a SaaS, the database almost always wins.

### Is there a Laravel menu builder package for Inertia?

Most menu builder packages are made for Blade and jQuery, Nova or Filament. For an Inertia app with Vue, React or Svelte, building your own is simpler: one table, one endpoint and a drag and drop library.

### How do I translate menu items stored in the database?

Save a translation key in the `title` column and translate it when you build the menu, or on the frontend with the same helper you use everywhere else.

### How do I stop admins from breaking the menu?

Check the data, check the permission, save everything in one transaction, block circular parents, and always offer a Reset Defaults button.

## The menu builder in the SaaS Laravel starter kit

[SaaS Laravel](/) comes with this menu builder in Vue, React and Svelte. Menus live in the database, separately for the central app and for every tenant. Admins drag them into order under Setup → Menus, changes save on their own, Reset Defaults brings back the original order, titles are translated, and items disappear for users who don't have the permission.

<BlogPostCta title="Database menus with drag and drop, already built" text="SaaS Laravel includes a drag and drop menu builder with translated, permission-aware menus for the central app and every tenant, in Vue, React or Svelte." />
