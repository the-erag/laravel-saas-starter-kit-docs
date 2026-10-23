---
title: "Inertia SSR in Laravel: Setup Guide for Inertia v3"
description: "Set up Inertia SSR in Laravel with Inertia v3: the Vite plugin, dev mode, config keys, browser-only code, Supervisor, deploys and what happens when SSR fails."
pageClass: blog-page
date: 2026-10-24
author: annu-gupta
category: frontend
tags: [Inertia, SSR, SEO]
---

# Inertia SSR with Laravel and Inertia v3: Setup, Pitfalls and Production

<BlogPostMeta />

By default an Inertia app sends the browser an almost empty `<div>` and builds the page with JavaScript. Inertia SSR (server-side rendering) renders that first page in Node instead, so the HTML that arrives already has your headings, text and meta tags in it. After that, the app hydrates and works like a normal Inertia app.

Inertia v3 changed how SSR is set up. The `@inertiajs/vite` plugin now handles the SSR entry, SSR runs inside the Vite dev server while you work, and the Laravel adapter has new options for timeouts, excluded routes and error handling. This guide covers the v3 way only. If you want the full list of v3 changes, read [Inertia.js v3: What's New for Laravel](/blog/inertia-js-v3-whats-new.html) first.

Everything below was checked against `inertiajs/inertia-laravel` 3.5, `@inertiajs/vue3`, `@inertiajs/react` and `@inertiajs/vite` 3.9, on Laravel 13 and PHP 8.4. The SSR server needs Node 22 or newer. The official reference is the [Inertia SSR documentation](https://inertiajs.com/docs/v3/advanced/server-side-rendering).

## When Inertia SSR is worth it

SSR costs something: a Node process to run and monitor, a second build, and code that has to work in two environments. So decide per page type, not for the whole app.

| Page type | SSR worth it? | Why |
| --- | --- | --- |
| Marketing pages, pricing, blog | Yes | Search engines and link preview bots get real HTML |
| Public profiles or listings you want indexed | Yes | Same reason, and the first paint is faster on slow phones |
| Login, register, password reset | Rarely | No SEO value; they're small anyway |
| Dashboards and settings behind login | No | Crawlers can't reach them, and every request pays the render cost |

Link previews are the case people forget. When someone pastes your pricing URL into Slack or LinkedIn, the preview bot reads the HTML it gets. Without SSR it sees your Blade fallback title and nothing else.

## How Inertia server side rendering works in v3

There are two layers, and it helps to keep them apart:

1. **The Vite plugin** serves SSR in development and builds the SSR bundle for production.
2. **The Laravel adapter** decides, on each first page load, whether to send the page object to the SSR server and use the HTML it returns.

In development, Laravel posts the page to the Vite dev server at `/__inertia_ssr`. In production, it posts to a Node server started by `php artisan inertia:start-ssr`, which listens on `http://127.0.0.1:13714` by default. Only the first full page load is rendered on the server. Later Inertia visits are normal XHR requests that return JSON.

## Set up SSR with the Vite plugin

If your `vite.config.ts` already uses the plugin, you're most of the way there:

```ts
import inertia from '@inertiajs/vite';
import vue from '@vitejs/plugin-vue';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.ts'],
            refresh: true,
        }),
        inertia({
            ssr: {
                host: '127.0.0.1',
            },
        }),
        vue(),
    ],
});
```

The plugin finds the SSR entry by itself. It looks for `resources/js/ssr.ts` (and `.tsx`, `.js`, `.jsx`) first, and if there isn't one, it reuses `resources/js/app.ts`. For most apps that means no separate SSR file at all. You only need your own `ssr.ts` if you write a manual `setup` callback in `createInertiaApp`, and then you also switch the client to hydration (`createSSRApp` in Vue, `hydrateRoot` in React, `hydrate` in Svelte).

We set `host: '127.0.0.1'` on purpose. By default the SSR server binds to `0.0.0.0`, so on a server without a firewall it would be reachable from outside.

Then build both bundles:

```json
"scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:ssr": "vite build && vite build --ssr"
}
```

The second build writes the SSR bundle to `bootstrap/ssr/`, where Laravel looks for it.

## Inertia SSR in development

You don't start anything extra. Run `npm run dev` as usual, and the plugin exposes its SSR endpoint with HMR. When Vite is running (the `public/hot` file exists), the adapter sends first page loads there instead of to port 13714.

This is a big change from v2, and it's good news: SSR bugs now show up while you build the feature, not after a production deploy. The plugin also logs failed renders in the Vite terminal with the component name, URL and a hint, and it recognises the common "used `window` on the server" error.

## The SSR keys in config/inertia.php

These are the `ssr` options in the default config published by `inertia-laravel` 3.5:

| Key | Env variable | Default | What it does |
| --- | --- | --- | --- |
| `enabled` | `INERTIA_SSR_ENABLED` | `true` | Master switch for the Laravel side |
| `url` | `INERTIA_SSR_URL` | `http://127.0.0.1:13714` | Where the production SSR server listens |
| `hot_url` | `INERTIA_SSR_HOT_URL` | from `public/hot` | Dev server URL override |
| `runtime` | `INERTIA_SSR_RUNTIME` | `node` | Runtime for `inertia:start-ssr`, for example `bun` |
| `timeout` | `INERTIA_SSR_TIMEOUT` | not set | Seconds to wait for a render |
| `ensure_bundle_exists` | `INERTIA_SSR_ENSURE_BUNDLE_EXISTS` | `true` | Skip SSR when no bundle is found |
| `throw_on_error` | `INERTIA_SSR_THROW_ON_ERROR` | `false` | Throw instead of falling back |

One thing to watch: Laravel merges package config only one level deep. If your app's `config/inertia.php` has its own `ssr` array, it replaces the package's whole `ssr` array. Any key you leave out of your file falls back to the code default, and its env variable is ignored. If you want `INERTIA_SSR_TIMEOUT` to work, the `timeout` key has to be in your config file.

## Turn SSR off for some pages

This is new in v3, and it's what makes SSR practical for SaaS apps. Render the public site on the server and skip the app behind login:

```php
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $withoutSsr = [
        'dashboard',
        'settings/*',
        'users/*',
    ];
}
```

You can do the same from a service provider with `Inertia::withoutSsr(['dashboard', 'settings/*'])`, or for a single request with `config(['inertia.ssr.enabled' => false])`. `Inertia::disableSsr()` turns it off completely, which is handy in tests.

## Browser-only code: window, localStorage and document

In SSR, your components run in Node first. Node has no `window`, `document` or `localStorage`, so any code that touches them during render throws an error. The fix is the same in every framework: move that code into something that only runs in the browser.

In Vue, use `onMounted`:

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';

const collapsed = ref(false);

onMounted(() => {
    collapsed.value = localStorage.getItem('sidebar') === 'collapsed';
});
</script>
```

In React, use `useEffect`:

```tsx
const [collapsed, setCollapsed] = useState(false);

useEffect(() => {
    setCollapsed(localStorage.getItem('sidebar') === 'collapsed');
}, []);
```

In Svelte 5, use `onMount` (or `$effect`, which also only runs in the browser):

```svelte
<script lang="ts">
    import { onMount } from 'svelte';

    let collapsed = $state(false);

    onMount(() => {
        collapsed = localStorage.getItem('sidebar') === 'collapsed';
    });
</script>
```

For plain helper functions that might run in either place, guard with `typeof window === 'undefined'` and return early.

For a whole component that needs the browser, like a chart or a rich text editor, Inertia 3.8 added `WhenMounted`. It renders a fallback on the server and the real component after mount:

```vue
<script setup lang="ts">
import { WhenMounted } from '@inertiajs/vue3';
import { defineAsyncComponent } from 'vue';

const RevenueChart = defineAsyncComponent(() => import('@/components/RevenueChart.vue'));
</script>

<template>
    <WhenMounted>
        <template #fallback>
            <div class="h-64 animate-pulse rounded-lg bg-muted" />
        </template>

        <RevenueChart />
    </WhenMounted>
</template>
```

The async import matters. `WhenMounted` skips rendering on the server, but a normal import still loads the module there. If the chart library touches `window` when it's imported, only a lazy import keeps it off the server. React and Svelte have the same component, imported from `@inertiajs/react` and `@inertiajs/svelte`.

## Hydration mismatches and shared state

Two more problems only show up with SSR.

**Hydration mismatches.** The browser expects the HTML it received to match what it renders itself. Anything that differs between Node and the browser breaks that: `new Date()`, random IDs, and dates formatted with `Intl` but without a fixed `timeZone` (your server is probably on UTC, your user isn't). Format dates on the server in PHP, pass a fixed time zone, or format after mount.

**State shared between requests.** The SSR server is one long-running Node process. A `reactive()` object or a store created at module level lives for the whole process, not one request. In a SaaS app that's dangerous: data from one customer's render can show up in the next customer's HTML. Keep request data in props and component state, and create stores per app instance.

## Meta tags and link previews

With SSR on, the `<Head>` component's tags are part of the server HTML, which is the whole point for SEO:

```vue
<Head :title="plan.name">
    <meta head-key="description" name="description" :content="plan.summary" />
    <meta head-key="og:title" property="og:title" :content="plan.name" />
</Head>
```

If you use the `<x-inertia::head>` Blade component, its slot is a fallback that only renders when SSR isn't active, so you won't get duplicate titles.

Not ready for SSR yet? For link previews alone, you can pass meta data to the Blade template with `Inertia::render(...)->withViewData(['meta' => $meta])` and print the tags there. It's less elegant, but it needs no Node process.

## Running Inertia SSR in production

Build both bundles on deploy, then keep the SSR server alive with a process monitor. A Supervisor config looks like this:

```ini
[program:inertia-ssr]
command=php /var/www/app/artisan inertia:start-ssr
autostart=true
autorestart=true
user=forge
redirect_stderr=true
stdout_logfile=/var/www/app/storage/logs/inertia-ssr.log
```

The Node server keeps the old bundle in memory, so restart it on every deploy, the same way you restart queue workers:

```bash
npm ci
npm run build:ssr
php artisan inertia:stop-ssr --graceful
php artisan inertia:check-ssr
```

`inertia:stop-ssr` stops the server and Supervisor starts it again with the new bundle. `--graceful` (adapter 3.4+) returns success even if the server wasn't running, so a first deploy doesn't fail. `inertia:check-ssr` calls the server's health endpoint, which also makes a good Docker health check. On Forge there's an Inertia SSR toggle that creates the daemon for you, and Laravel Cloud supports Inertia SSR natively. Our [Laravel SaaS deployment guide](/blog/deploy-laravel-saas.html) covers the rest of the deploy.

## What happens when the SSR server is down

Inertia falls back to client-side rendering. Visitors still get a working page, just without server HTML. That's the right default, but it also means SSR can be broken for weeks without anyone noticing.

We read the adapter's code to see exactly what happens:

- **No bundle found** (you ran `npm run build` instead of `build:ssr`): SSR is skipped quietly. No error, no event.
- **Server not reachable or render failed**: Inertia dispatches an `Inertia\Ssr\SsrRenderFailed` event and renders on the client.
- **Server hangs**: Laravel's HTTP client waits up to its default 30-second timeout unless you set `timeout`.

So do two things. Set a short timeout, like 2 to 5 seconds. And log failures:

```php
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Inertia\Ssr\SsrRenderFailed;

Event::listen(SsrRenderFailed::class, function (SsrRenderFailed $event) {
    Log::warning('Inertia SSR failed', $event->toArray());
});
```

In browser tests, set `INERTIA_SSR_THROW_ON_ERROR=true` so an SSR error fails the test instead of falling back silently. Don't turn that on in production.

## Common Inertia SSR mistakes

- **Deploying with `npm run build`.** No SSR bundle, no SSR, no error. Use `build:ssr` and check the page source after deploy.
- **Not restarting the SSR server on deploy.** It keeps rendering the old components while the browser loads new JavaScript. Expect hydration warnings or worse.
- **Leaving the SSR port open to the internet.** Bind to `127.0.0.1` or firewall port 13714.
- **Rendering dashboards on the server.** It adds work to every request and gives you nothing. Use `$withoutSsr`.
- **Touching `window` in a module's top-level code.** `onMounted` can't help if the error happens on import. Move it into a function or a lazy import.
- **Trusting that SSR works because the page loads.** The page always loads, thanks to the fallback. Disable JavaScript in your browser and look at what's left.

## Frequently asked questions

### Does Inertia SSR improve SEO?

It helps most for crawlers and link preview bots that don't run JavaScript, because they get real HTML with your titles and meta tags. Google can render JavaScript, but server HTML is still faster and more reliable to index. For pages behind a login it makes no difference.

### How do I run Inertia SSR in development?

With Inertia v3 and the `@inertiajs/vite` plugin, you just run `npm run dev`. The plugin serves SSR from the Vite dev server, so there's no separate build or Node server during development.

### Can I disable Inertia SSR for some routes?

Yes. Add route patterns to the `$withoutSsr` property of your `HandleInertiaRequests` middleware, or call `Inertia::withoutSsr()` in a service provider. You can also set `inertia.ssr.enabled` to `false` for a single request.

### What happens if the Inertia SSR server crashes?

Inertia falls back to client-side rendering and dispatches an `SsrRenderFailed` event, so users still see the page. Listen for that event and log it, and let Supervisor restart the server.

### Do I need a separate ssr.ts file in Inertia v3?

Usually not. The Vite plugin reuses your `app.ts` (or `app.tsx`) as the SSR entry. You need a separate `ssr.ts` only if you use a manual `setup` callback in `createInertiaApp`.

## SSR in the SaaS Laravel kits

Here's exactly what the [SaaS Laravel starter kits](/) include, in the Vue, React and Svelte versions alike. Each `package.json` has a `build:ssr` script (`vite build && vite build --ssr`), and each `vite.config.ts` loads `inertia()` with its default options. There's no separate `ssr.ts`, so the plugin would use `resources/js/app.ts` (`app.tsx` in React) as the SSR entry. `config/inertia.php` sets `ssr.enabled` to `true` and the URL to `http://127.0.0.1:13714`, and it doesn't include the `timeout`, `runtime` or `throw_on_error` keys, so add them if you need them.

In production the kits render on the client by default. `composer setup` runs `npm run build`, which doesn't create an SSR bundle, and Inertia skips SSR when it can't find one. There's no Supervisor config for an SSR server and no `$withoutSsr` list. While the Vite dev server is running, though, Laravel does send first page loads to the plugin's dev endpoint, because SSR is enabled in the config. The theme helpers in each kit already check `typeof window` before touching the browser. Before you turn SSR on for real, add `$withoutSsr` for the dashboard and settings routes and test your public pages with JavaScript disabled. The [local development docs](/docs/getting-started/local-development.html) and [command reference](/docs/reference/commands.html) list the build scripts.

<BlogPostCta title="Inertia v3, already wired up" text="SaaS Laravel runs Inertia v3 with the Vite plugin and a build:ssr script, on one Laravel backend for Vue, React or Svelte." />
