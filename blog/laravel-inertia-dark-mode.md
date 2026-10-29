---
title: "Laravel Inertia Dark Mode: Fix the White Flash"
description: "Add light, dark and system dark mode to a Laravel Inertia app and stop the white flash on page load. Works with Tailwind CSS v4 in Vue, React and Svelte."
pageClass: blog-page
date: 2026-10-29
author: annu-gupta
category: frontend
tags: [Dark mode, Inertia]
---

# Laravel Inertia Dark Mode: Light, Dark and System Themes Without the White Flash

<BlogPostMeta />

Dark mode sounds like a five-minute job. Add a `dark` class, sprinkle some `dark:` classes around, done. Then you reload the page and see it flash white for a moment before it turns dark. Your users notice that, and it makes the whole app feel a little cheap.

In this post we'll set up dark mode in a Laravel and Inertia app the way we do it in our SaaS starter kit: three modes (light, dark and system), no flash when the page loads, and a toggle that works the same in Vue, React and Svelte.

## Give users three choices

People expect three options, not two:

| Mode | What it does |
| --- | --- |
| Light | Always light |
| Dark | Always dark |
| System | Follows the computer or phone, and switches when it changes |

Make "System" the default. Most people never open your settings page, so following their device is the friendliest choice.

## Tell Tailwind to use a class

By default, Tailwind's `dark:` styles follow the device setting and nothing else. To let users override it, switch Tailwind CSS v4 to a class:

```css
/* resources/css/app.css */
@import 'tailwindcss';

@custom-variant dark (&:is(.dark *));
```

Now `dark:bg-zinc-900` applies whenever the `<html>` tag has a `dark` class, and you decide when that happens. If you use shadcn components, put your colours in CSS variables under `:root` and `.dark`, and the components switch along with them.

## Why the white flash happens

An Inertia page is drawn by JavaScript. If only your Vue, React or Svelte code adds the `dark` class, the browser first shows the page with the normal light styles. Then your JavaScript loads, runs and switches to dark. That short gap is the flash.

To get rid of it, you have to decide the theme before the browser draws anything. That means doing it on the server, plus a tiny script in the page head that runs before your app's JavaScript.

## Save the choice in a cookie

Laravel can't read `localStorage`, but it can read cookies. So save the user's choice in an `appearance` cookie and share it with your main Blade view using a small middleware:

```php
// app/Http/Middleware/HandleAppearance.php
final class HandleAppearance
{
    public function handle(Request $request, Closure $next): Response
    {
        View::share('appearance', $request->cookie('appearance') ?? 'system');

        return $next($request);
    }
}
```

Add it to the web middleware group. Your frontend writes this cookie directly, so tell Laravel not to encrypt it, otherwise Laravel can't read it back:

```php
// bootstrap/app.php
->withMiddleware(function (Middleware $middleware) {
    $middleware->encryptCookies(except: ['appearance']);

    $middleware->web(append: [
        HandleAppearance::class,
    ]);
})
```

## Set the theme before the page is drawn

In `resources/views/app.blade.php`, add the `dark` class on the server when the user picked dark. For "system", only the browser knows the device setting, so add a few lines of JavaScript. The important part: put this script **above** your `@vite` line, so it runs before your app loads.

```blade
<html lang="{{ app()->getLocale() }}" @class(['dark' => ($appearance ?? 'system') === 'dark'])>
<head>
    <script>
        (function () {
            const appearance = '{{ $appearance ?? 'system' }}';

            if (appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            }
        })();
    </script>

    <style>
        html { background-color: oklch(1 0 0); }
        html.dark { background-color: oklch(0.145 0 0); }
    </style>

    @vite(['resources/js/app.ts'])
</head>
```

The small `<style>` block helps too. It gives the page the right background colour before your main CSS file has even loaded. With both in place, there's no flash, even on a slow phone connection.

## The toggle

On the client you need to do three things: switch the theme, remember it, and react when the device changes while the page is open. Here's a Vue composable. The React hook and the Svelte version follow the same steps.

```ts
// resources/js/composables/useAppearance.ts
import { onMounted, ref } from 'vue';

export type Appearance = 'light' | 'dark' | 'system';

const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export function applyTheme(value: Appearance): void {
    const dark = value === 'dark' || (value === 'system' && media().matches);
    document.documentElement.classList.toggle('dark', dark);
}

function saveCookie(value: Appearance): void {
    document.cookie = `appearance=${value};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
}

export function useAppearance() {
    const appearance = ref<Appearance>('system');

    onMounted(() => {
        appearance.value = (localStorage.getItem('appearance') as Appearance) ?? 'system';
        media().addEventListener('change', () => applyTheme(appearance.value));
    });

    function updateAppearance(value: Appearance): void {
        appearance.value = value;
        localStorage.setItem('appearance', value);
        saveCookie(value);
        applyTheme(value);
    }

    return { appearance, updateAppearance };
}
```

The `change` listener is what makes "System" feel right. When someone's laptop switches to dark mode in the evening, your app switches too, without a reload.

For the UI, three buttons (Light, Dark, System) on a settings page are enough for most apps. You can add a small icon button in the header too.

## If you use server-side rendering

With [Inertia SSR](/blog/inertia-ssr-laravel.html), wrap every use of `window`, `document` and `localStorage` in a check like `typeof window !== 'undefined'`. The server render gets the theme from the cookie through the Blade view, and the browser continues with the same value, so they match.

## Per browser or per user?

The cookie remembers the choice per browser. For lots of people that's what they want: dark on the laptop, light on the phone. If you'd rather sync it across devices, save `appearance` on the user, share it as an Inertia prop, and set the cookie from it when they log in. Keep the cookie either way, because it's what lets the server avoid the flash.

## Quick accessibility checks

- Check text contrast in both themes. Grey text that's fine on white often fails on a dark background.
- Avoid pure black backgrounds. A very dark grey is easier on the eyes.
- Logos and images with transparent backgrounds can disappear on dark. Give them a dark version or a soft background.
- If the theme switch is animated, respect `prefers-reduced-motion`.

## Frequently asked questions

### Why does my Laravel Inertia app flash white before going dark?

Because the theme is set by your JavaScript after the page has already been drawn. Decide the theme on the server from a cookie, add the `dark` class in `app.blade.php`, and put a small script for "system" mode above your `@vite` line.

### Should I save the theme in localStorage or a cookie?

Use both. The cookie lets Laravel draw the right theme on the first request, and `localStorage` gives your frontend quick access. Update both whenever the user changes the setting.

### Why can't Laravel read my appearance cookie?

Laravel encrypts cookies by default and can't read a cookie it didn't encrypt. Add `appearance` to `encryptCookies(except: [...])`.

### Does dark mode work with shadcn components?

Yes. shadcn components use CSS variables, so defining your colours under `:root` and `.dark` switches all of them at once.

## Dark mode in the SaaS Laravel starter kit

Every [SaaS Laravel](/) kit comes with this exact setup: light, dark and system modes, an `appearance` cookie read by a `HandleAppearance` middleware, the inline script that stops the flash, and an Appearance page in the user's settings, in Vue, React and Svelte. It follows the same pattern as Laravel's official starter kits, so if you've used those, you'll feel at home.

<BlogPostCta title="Light, dark and system, already done" text="SaaS Laravel ships with flash-free dark mode, an Appearance settings page and shadcn components that switch automatically, in Vue, React or Svelte." />
