---
title: "Laravel Inertia Datatable: Build It Yourself"
description: "Build a Laravel Inertia datatable with server-side search, sorting, filters and pagination, state in the URL, Vue and React code, and accessible headers."
pageClass: blog-page
date: 2026-10-24
author: erag
category: frontend
tags: [Inertia, Tables]
---

# Laravel Inertia Datatable: Server-Side Search, Sort, Filters and Pagination

<BlogPostMeta />

Search for a Laravel Inertia datatable and you'll mostly find packages. Some are good, but a users or invoices table is something you'll build a dozen times in a SaaS app, and once you know the pattern it's not much code. You also keep full control over the queries, the markup and the design system.

This guide builds one table from end to end. On the server: a validated request, a whitelist of sortable columns, a service that builds the query, and `paginate()->withQueryString()`. On the client: debounced search, sortable headers, filters, pagination links, a loading state, and all of it kept in the URL so a refresh or a shared link shows the same view.

We're using Laravel 13, PHP 8.4 and Inertia v3 (`inertiajs/inertia-laravel` 3.5, `@inertiajs/vue3` 3.9). Vue is the main example, with a shorter React version after it.

## How the table works

Everything the table shows is decided by the query string:

```text
/users?search=ann&role=admin&sort=name&direction=asc&per_page=25&page=2
```

The browser changes the query string with `router.get()`. Laravel validates it, runs one query, and returns the current page plus the active filters. Nothing is filtered in JavaScript. That's what makes it work for 50 rows or 5 million.

## Validate the table parameters

Start with a Form Request. Its job is to make sure nothing unexpected reaches the query, especially the sort column:

```php
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserIndexRequest extends FormRequest
{
    public const array SORTABLE = ['name', 'email', 'created_at'];

    public const array PER_PAGE = [10, 25, 50];

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['verified', 'unverified'])],
            'role' => ['nullable', 'string', 'exists:roles,name'],
            'sort' => ['nullable', Rule::in(self::SORTABLE)],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', Rule::in(self::PER_PAGE)],
        ];
    }

    public function tableQuery(): UserTableQuery
    {
        return new UserTableQuery(
            search: $this->validated('search'),
            status: $this->validated('status'),
            role: $this->validated('role'),
            sort: $this->validated('sort') ?? 'created_at',
            direction: $this->validated('direction') ?? 'desc',
            perPage: (int) ($this->validated('per_page') ?? 10),
        );
    }
}
```

The sort whitelist is the important line. `orderBy()` checks the direction for you, but the column name goes into the SQL as it is. If you pass `$request->sort` straight to `orderBy()`, users can sort by any column, including ones you never meant to expose. `Rule::in()` closes that.

Laravel's default middleware already trims strings and turns empty ones into `null`, so `?search=` arrives as `null`.

`UserTableQuery` is a small readonly object, so the service gets typed values instead of a loose array:

```php
final readonly class UserTableQuery
{
    public function __construct(
        public ?string $search,
        public ?string $status,
        public ?string $role,
        public string $sort,
        public string $direction,
        public int $perPage,
    ) {}

    /** @return array<string, string|int|null> */
    public function toArray(): array
    {
        return [
            'search' => $this->search,
            'status' => $this->status,
            'role' => $this->role,
            'sort' => $this->sort,
            'direction' => $this->direction,
            'per_page' => $this->perPage,
        ];
    }
}
```

## Build the query in a service

The query lives in a service, not the controller:

```php
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class UserTableService
{
    public function paginate(UserTableQuery $query): LengthAwarePaginator
    {
        return User::query()
            ->select(['id', 'name', 'email', 'email_verified_at', 'created_at'])
            ->with('roles:id,name')
            ->when($query->search, function (Builder $builder, string $search): void {
                $builder->where(function (Builder $builder) use ($search): void {
                    $builder->whereLike('name', "%{$search}%")
                        ->orWhereLike('email', "%{$search}%");
                });
            })
            ->when($query->status === 'verified', fn (Builder $b) => $b->whereNotNull('email_verified_at'))
            ->when($query->status === 'unverified', fn (Builder $b) => $b->whereNull('email_verified_at'))
            ->when($query->role, fn (Builder $b, string $role) => $b->role($role))
            ->orderBy($query->sort, $query->direction)
            ->orderBy('id', $query->direction)
            ->paginate($query->perPage)
            ->withQueryString()
            ->through(fn (User $user): UserRowData => UserRowData::fromModel($user));
    }
}
```

A few details are doing real work here:

- **The search is wrapped in its own `where()`.** Without the closure, `orWhereLike('email', ...)` would also escape the status and role filters.
- **`orderBy('id')` as a tie-breaker.** Sorting by `name` alone isn't stable when two users share a name, so rows can jump between pages.
- **`withQueryString()`** puts the current search, sort and filters into every pagination link. Without it, page 2 forgets the filters.
- **`with('roles:id,name')`** loads roles in one query instead of one per row. More on that in [fixing N+1 queries in Laravel](/blog/laravel-n-plus-one-queries.html).
- **`role()`** is the query scope from spatie/laravel-permission.

`UserRowData` is a spatie/laravel-data object with only the fields the table needs. Never send whole models to a table. It leaks columns, and it bloats every page response. If you generate TypeScript types from your Data classes, the Vue page gets a real `UserRowData` type for free. See [TypeScript types from PHP](/blog/laravel-typescript-types-from-php.html).

## A thin controller that returns the filters as props

```php
public function index(UserIndexRequest $request, UserTableService $users): Response
{
    $query = $request->tableQuery();

    return Inertia::render('users/Index', [
        'users' => $users->paginate($query),
        'filters' => $query->toArray(),
        'roles' => $users->roleOptions(),
        'stats' => Inertia::defer(fn () => $users->stats()),
    ]);
}
```

Returning `filters` matters more than it looks. When someone opens a shared link or refreshes, the page has to start with the same search text, sort and dropdown values that are in the URL. The server already validated them, so it's the right source. If this controller style is new to you, [thin controllers in Laravel](/blog/laravel-thin-controllers.html) explains the split.

## The Vue page: search, filters and sorting

Here's the script part. It keeps the form state locally and sends it to the server with `router.get()`:

```vue
<script setup lang="ts">
import { Deferred, Head, Link, router } from '@inertiajs/vue3';
import { computed, reactive, ref, watch } from 'vue';
import { useDebounceFn } from '@/composables/useDebounce';
import { index } from '@/routes/users';

type SortColumn = 'name' | 'email' | 'created_at';

const props = defineProps<{
    users: Paginated<UserRowData>;
    filters: UserFilters;
    roles: { value: string; label: string }[];
    stats?: { total: number; verified: number };
}>();

const state = reactive({
    search: props.filters.search ?? '',
    status: props.filters.status ?? '',
    role: props.filters.role ?? '',
    sort: props.filters.sort,
    direction: props.filters.direction,
    per_page: props.filters.per_page,
});

const columns: { key: SortColumn; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'created_at', label: 'Joined' },
];

const loading = ref(false);
const hasFilters = computed(() => Boolean(state.search || state.status || state.role));

function reload(): void {
    router.get(
        index.url(),
        {
            search: state.search.trim() || undefined,
            status: state.status || undefined,
            role: state.role || undefined,
            sort: state.sort !== 'created_at' ? state.sort : undefined,
            direction: state.direction !== 'desc' ? state.direction : undefined,
            per_page: state.per_page !== 10 ? state.per_page : undefined,
        },
        {
            only: ['users', 'filters'],
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => (loading.value = true),
            onFinish: () => (loading.value = false),
        },
    );
}

const debouncedReload = useDebounceFn(reload, 300);

watch(() => state.search, debouncedReload);
watch(() => [state.status, state.role, state.per_page], reload);

function sortBy(column: SortColumn): void {
    state.direction = state.sort === column && state.direction === 'asc' ? 'desc' : 'asc';
    state.sort = column;
    reload();
}

function ariaSort(column: SortColumn): 'ascending' | 'descending' | undefined {
    if (state.sort !== column) {
        return undefined;
    }

    return state.direction === 'asc' ? 'ascending' : 'descending';
}
</script>
```

`Paginated`, `UserRowData` and `UserFilters` are your own types (or generated ones). Each visit option has a reason:

| Option | Why we set it |
| --- | --- |
| `preserveState: true` | Keeps the component alive, so the search input doesn't lose focus while typing. `router.get()` defaults to `false`. |
| `preserveScroll: true` | The page doesn't jump to the top on every keystroke |
| `replace: true` | Typing "annie" doesn't add five entries to the browser history |
| `only: ['users', 'filters']` | A partial reload: the server skips `roles` and the deferred `stats` |
| `onStart` / `onFinish` | Drives the loading state |

Values set to `undefined` are left out of the query string, and so are defaults. That keeps URLs short and readable: `/users?search=ann` instead of a line full of `sort=created_at&direction=desc&per_page=10`.

We never send `page`. Any change to search, filters or sort starts again at page 1, which is what users expect. Staying on page 7 of a result set that now has two pages is a common bug in hand-built tables.

## The Vue template: headers, rows and pagination

```vue
<template>
    <Head title="Users" />

    <div class="flex flex-wrap gap-3">
        <input v-model="state.search" type="search" aria-label="Search users" placeholder="Search name or email" />

        <select v-model="state.status" aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
        </select>

        <select v-model="state.role" aria-label="Filter by role">
            <option value="">All roles</option>
            <option v-for="role in roles" :key="role.value" :value="role.value">{{ role.label }}</option>
        </select>

        <select v-model.number="state.per_page" aria-label="Rows per page">
            <option v-for="size in [10, 25, 50]" :key="size" :value="size">{{ size }} per page</option>
        </select>
    </div>

    <Deferred data="stats">
        <template #fallback><p class="text-sm text-muted-foreground">Counting users...</p></template>
        <p class="text-sm">{{ stats?.total }} users, {{ stats?.verified }} verified</p>
    </Deferred>

    <table :aria-busy="loading" :class="{ 'opacity-60 transition-opacity': loading }">
        <thead>
            <tr>
                <th v-for="column in columns" :key="column.key" scope="col" :aria-sort="ariaSort(column.key)">
                    <button type="button" @click="sortBy(column.key)">
                        {{ column.label }}
                        <span aria-hidden="true">{{ state.sort === column.key ? (state.direction === 'asc' ? '↑' : '↓') : '↕' }}</span>
                    </button>
                </th>
                <th scope="col">Roles</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="user in users.data" :key="user.id">
                <td>{{ user.name }}</td>
                <td>{{ user.email }}</td>
                <td>{{ user.created_at }}</td>
                <td>{{ user.roles.join(', ') }}</td>
            </tr>
            <tr v-if="users.data.length === 0">
                <td colspan="4" class="py-10 text-center">
                    {{ hasFilters ? 'No users match these filters.' : 'No users yet. Invite your first teammate.' }}
                </td>
            </tr>
        </tbody>
    </table>

    <nav v-if="users.links.length > 3" aria-label="Pagination" class="flex flex-wrap gap-2">
        <template v-for="link in users.links" :key="link.label">
            <Link
                v-if="link.url"
                :href="link.url"
                :only="['users']"
                preserve-scroll
                preserve-state
                :aria-current="link.active ? 'page' : undefined"
            >
                <span v-html="link.label" />
            </Link>
            <span v-else class="opacity-50" v-html="link.label" />
        </template>
    </nav>
</template>
```

Laravel's paginator returns `links` with labels like `&laquo; Previous`, which is why the label goes through `v-html`. The labels come from Laravel's pagination translation strings, not from user input. The `links.length > 3` check hides the bar when there's only one page (previous, page 1, next).

## Accessible sortable headers

Most hand-built tables get this wrong, and it's cheap to fix:

- Put the click handler on a real `<button>` inside the `<th>`, not on the `<th>` itself. Buttons get keyboard focus and Enter/Space handling for free.
- Set `aria-sort` on the `<th>` of the sorted column only, with `ascending` or `descending`. Leave it off the other columns.
- Hide the arrow icons from screen readers with `aria-hidden`, because `aria-sort` already says the same thing.
- `aria-busy` on the table while loading, and `aria-current="page"` on the active pagination link.

## The React version

The logic is the same. In React we read the sort and filters straight from the `filters` prop the server sends back, and only keep the search text in local state:

```tsx
import { router } from '@inertiajs/react';
import { useState } from 'react';
import { useDebounceFn } from '@/hooks/use-debounce';
import { index } from '@/routes/users';

export default function Index({ users, filters }: UserIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [loading, setLoading] = useState(false);

    const visit = (changes: Partial<UserFilters>) => {
        const next = { ...filters, search, ...changes };

        router.get(
            index.url(),
            {
                search: next.search?.trim() || undefined,
                status: next.status || undefined,
                role: next.role || undefined,
                sort: next.sort !== 'created_at' ? next.sort : undefined,
                direction: next.direction !== 'desc' ? next.direction : undefined,
                per_page: next.per_page !== 10 ? next.per_page : undefined,
            },
            {
                only: ['users', 'filters'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    };

    const debouncedSearch = useDebounceFn((value: string) => visit({ search: value }), 300);

    const sortBy = (column: SortColumn) =>
        visit({
            sort: column,
            direction: filters.sort === column && filters.direction === 'asc' ? 'desc' : 'asc',
        });

    // Render the same inputs, headers (with aria-sort) and links as the Vue version.
}
```

Because `only` includes `filters`, the prop is always in sync with what the server actually applied.

## Deferred counts and infinite scroll

**Deferred props for counts.** Totals like "1,204 users, 1,180 verified" need extra `COUNT` queries. With `Inertia::defer()` they load in a second request after the table is on screen, and the `<Deferred>` component shows a fallback until then. Because our filter visits use `only: ['users', 'filters']`, those counts aren't recalculated on every keystroke.

**Infinite scroll instead of page links.** For feeds or activity logs, Inertia v3 has infinite scroll built in. Wrap the paginator in `Inertia::scroll()` and the rows in `<InfiniteScroll>`:

```php
'users' => Inertia::scroll(fn () => $users->paginate($query)),
```

```vue
<InfiniteScroll data="users">
    <UserRow v-for="user in users.data" :key="user.id" :user="user" />
</InfiniteScroll>
```

New pages are merged into the list as the user scrolls. When a filter changes, add `reset: ['users']` to the visit, or the new results get appended to the old ones. For admin tables we still prefer numbered pages: people want to jump to the end, and they want "page 4" to mean something. The [infinite scroll docs](https://inertiajs.com/docs/v3/data-props/infinite-scroll) cover buffers, manual mode and reverse mode.

## Inertia datatable mistakes

| Problem | Cause | Fix |
| --- | --- | --- |
| Page 2 drops the search | Pagination links built without the query string | `->withQueryString()` |
| Search input loses focus while typing | `router.get()` remounts the page | `preserveState: true` |
| Back button steps through every keystroke | Each visit pushes history | `replace: true` |
| Rows repeat or vanish between pages | Sort column isn't unique | Add `orderBy('id')` as a tie-breaker |
| Any column can be sorted, or SQL errors from bad input | Raw `sort` passed to `orderBy()` | Validate with `Rule::in()` |
| Searching brings back rows the filters should hide | `orWhere` outside a grouped `where()` | Wrap the search conditions in a closure |
| Refresh loses the dropdown values | State lives only in the component | Read initial state from the `filters` prop |

## What about packages?

If you have many tables with lots of filters, [spatie/laravel-query-builder](https://github.com/spatie/laravel-query-builder) is worth a look. It reads `filter[...]` and `sort` query parameters and applies them to an Eloquent query, using `allowedFilters()` and `allowedSorts()` as the whitelist. It replaces the Form Request and service code above, but not the frontend. We'd start with the hand-built version, since it's easy to read and you can see every query, and switch when you notice yourself repeating the same filter code across many tables.

## Frequently asked questions

### How do I do server-side pagination with Inertia?

Return a Laravel paginator from your controller with `->paginate()->withQueryString()`. Inertia sends it as JSON with `data` and `links`. Render the `links` as Inertia `<Link>` components so each page change is a normal Inertia visit.

### How do I keep the search box focused when filtering an Inertia table?

Pass `preserveState: true` to `router.get()`. GET visits don't preserve component state by default, so without it the page component is recreated and the input loses focus.

### Should I filter the table on the client or the server?

On the server, unless the list is small and always fully loaded. Server-side filtering works for any number of rows, keeps the state in the URL, and only sends one page of data.

### How do I make sortable table headers accessible?

Use a `<button>` inside each sortable `<th>`, and set `aria-sort="ascending"` or `aria-sort="descending"` on the header of the column that is currently sorted. Hide decorative arrows with `aria-hidden="true"`.

### Do I need a datatable package for Laravel and Inertia?

No. A validated request, a query service, `paginate()->withQueryString()` and `router.get()` cover search, sorting, filters and pagination. Packages help when you have many complex tables and want one convention for all of them.

## Datatables in the SaaS Laravel kits

The [SaaS Laravel starter kits](/) already use a lighter version of this pattern on their list pages. On the Users page, `UserController::index` reads `search` from the request and passes it to `UserService::getUsers()`, which searches name and email with `LIKE`, sorts by newest first, and returns `paginate(10)->withQueryString()` mapped through `UserData`. The controller returns the search back as a `filters` prop, along with stats for total, verified and unverified users. The Tenants page works the same way through `TenantRepository`, with a search across company, contact details and domains plus a workspace status filter, and the Domains page adds a primary/secondary filter.

On the frontend, the Vue page debounces the search by 300 ms with the kit's `useDebounce` composable (React uses `useDebounceFn` from `@/hooks/use-debounce`), then calls `router.get()` with the Wayfinder `index.url()`, `preserveScroll` and `replace`. Pagination renders Laravel's `links` as Inertia `<Link>` buttons. The kits don't have column sorting, a per-page selector or a validated Form Request for table parameters yet, so the request class, sort whitelist and `aria-sort` headers from this guide are what you'd add on top. They'd go in the module's `Http/Requests` folder and service, next to the existing code. The [users and roles docs](/docs/core/users-roles-permissions.html) describe the pages.

<BlogPostCta title="Admin tables, already started" text="SaaS Laravel ships searchable, paginated Users, Tenants and Domains pages on one Laravel backend, with Vue, React or Svelte on top." />
