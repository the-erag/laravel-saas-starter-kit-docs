---
title: "White Label SaaS Laravel Guide: Tenant Logos, Colors, Domains"
description: "A white label SaaS Laravel guide: per-tenant logos, favicons and brand colors with Tailwind v4 CSS variables, contrast checks, dark mode, emails and PDFs."
pageClass: blog-page
date: 2026-11-04
author: erag
category: multi-tenancy
tags: [Multi-tenancy, Branding, Tailwind]
---

# White Label SaaS in Laravel: Per-Tenant Logos, Colors and Domains

<BlogPostMeta />

Sooner or later a bigger customer asks: "Can it look like our product?" They want their logo, their color, their name on every email, and ideally their own domain. That's a white label SaaS. In Laravel it mostly comes down to where you store the branding and how you get it into every page, email and PDF without a separate frontend per customer.

In this post we build tenant branding for a multi-tenant Laravel and Inertia app with stancl/tenancy: a logo, favicon, brand color and app name per tenant, uploads resized into tenant storage, branding shared through Inertia, colors applied at runtime with Tailwind v4 CSS variables (no rebuild per tenant), contrast checks, dark mode, and the brand carried into the login page, emails and PDFs.

## What "white label" means in practice

White-labeling comes in levels. Decide which one you're selling before you build:

| Level | What the customer gets | Effort |
| --- | --- | --- |
| Basic branding | Logo, primary color, app name | Small |
| Full white label | Plus favicon, login page, emails, PDFs, no "Powered by" | Medium |
| Own domain | Plus `app.customer.com` with its own TLS certificate | Medium, mostly ops |
| Reseller | The customer rebrands and resells to their own clients | Large |

Most B2B products need the first three. We skip reseller setups here.

## Store the branding per tenant

With stancl/tenancy, the central `tenants` table is the natural home for laravel tenant branding. The current tenant model is already loaded on every tenant request, so reading the brand costs no extra query, and it stays readable from the central admin.

stancl's `Tenant` model uses virtual columns: any attribute not listed in `getCustomColumns()` is saved in the `data` JSON column. So these fields need no migration:

| Attribute | Example | Notes |
| --- | --- | --- |
| `brand_name` | `Acme Portal` | Falls back to the app name |
| `brand_logo` | `branding/logo-x7Kq2mPa.png` | Path on the tenant's public disk |
| `brand_icon` | `branding/icon-Zt9eL1sQ.png` | Square, used for the favicon |
| `brand_primary` | `#4f46e5` | Six-digit hex only |
| `brand_primary_dark` | `#818cf8` | Optional, for dark mode |

If each of a tenant's domains needs its own look, put the same fields on the domain and fall back to the tenant.

## Validate the input strictly

Brand colors end up inside a `<style>` tag, so treat them as untrusted input and accept six-digit hex only. Laravel's `hex_color` rule also accepts 3, 4 and 8 digits, which complicates the contrast math later, so we use a regex:

```php
final class UpdateBrandingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('Manage Branding');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $hex = 'regex:/^#[0-9a-fA-F]{6}$/';

        return [
            'brand_name' => ['nullable', 'string', 'max:60'],
            'brand_primary' => ['required', $hex],
            'brand_primary_dark' => ['nullable', $hex],
            'logo' => ['nullable', File::image()->max(2 * 1024)],
            'icon' => ['nullable', File::image()->max(1024)->dimensions(Rule::dimensions()->minWidth(180)->ratio(1))],
        ];
    }
}
```

`File::image()` rejects SVG unless you pass `true`. Keep it that way: an SVG can carry scripts, and the logo is shown to every user of the workspace.

## Upload and resize logos into tenant storage

People upload 4000-pixel PNGs, so resize them once on upload. We use [Intervention Image](https://image.intervention.io/v4) version 4 (`composer require intervention/image`, PHP 8.3+).

With `FilesystemTenancyBootstrapper` enabled, the `public` disk inside a tenant request points at that tenant's own folder, so tenants can't overwrite each other's files. We still give every upload a random name, so browsers and CDNs never serve an old logo after a change:

```php
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Format;
use Intervention\Image\ImageManager;

final class TenantBrandingService
{
    public function update(Tenant $tenant, array $data, ?UploadedFile $logo, ?UploadedFile $icon): void
    {
        $tenant->brand_name = $data['brand_name'] ?? null;
        $tenant->brand_primary = strtolower($data['brand_primary']);
        $tenant->brand_primary_dark = $data['brand_primary_dark'] ?? null;

        if ($logo) {
            $tenant->brand_logo = $this->store($logo, 'logo', $tenant->brand_logo, fn ($image) => $image->scaleDown(width: 512));
        }

        if ($icon) {
            $tenant->brand_icon = $this->store($icon, 'icon', $tenant->brand_icon, fn ($image) => $image->cover(180, 180));
        }

        $tenant->save();
    }

    private function store(UploadedFile $file, string $name, ?string $old, Closure $resize): string
    {
        $image = ImageManager::usingDriver(GdDriver::class)->decodePath($file->getRealPath());
        $resize($image);

        $path = "branding/{$name}-".Str::random(8).'.png';
        $disk = Storage::disk('public');

        $disk->put($path, $image->encodeUsingFormat(Format::PNG)->toString());

        if ($old) {
            $disk->delete($old);
        }

        return $path;
    }
}
```

`scaleDown()` never enlarges a small logo, and re-encoding drops metadata such as EXIF. We save PNG because it keeps transparency and works in email clients. The controller passes `$request->validated()` and the two files to the service and redirects back.

To serve the files, stancl's `tenant_asset()` helper builds a URL to `/tenancy/assets/{path}` on the current domain, which reads from the tenant's storage folder. Our post on [tenant-aware cache and file storage](/blog/laravel-tenant-cache-filesystem.html) covers that route and the S3 alternative.

## Share tenant branding through Inertia

Every page needs the brand, including guest pages like login, so it goes in the shared props. The tenant model is already in memory, so there's nothing worth caching:

```php
// TenantBrandingService
private const DEFAULT_PRIMARY = '#171717';

/**
 * @return array<string, mixed>|null
 */
public function current(): ?array
{
    $tenant = tenant();

    if (! $tenant) {
        return null; // central domain keeps your own brand
    }

    $primary = $tenant->brand_primary ?? self::DEFAULT_PRIMARY;
    $primaryDark = $tenant->brand_primary_dark ?? $primary;

    return [
        'name' => $tenant->brand_name ?: config('app.name'),
        'logoUrl' => $tenant->brand_logo ? tenant_asset($tenant->brand_logo) : null,
        'iconUrl' => $tenant->brand_icon ? tenant_asset($tenant->brand_icon) : null,
        'primary' => $primary,
        'primaryForeground' => ColorContrast::readableTextOn($primary),
        'primaryDark' => $primaryDark,
        'primaryDarkForeground' => ColorContrast::readableTextOn($primaryDark),
        'poweredBy' => ! Feature::for($tenant)->active('white-label'),
    ];
}
```

```php
// HandleInertiaRequests::share()
'branding' => fn () => app(TenantBrandingService::class)->current(),
```

`tenant_asset()` uses the current request's host, so this array suits web requests, not queued emails (see below). It's also why we don't cache it: a URL cached on one domain is wrong on the tenant's other domains.

In Vue, read it like any shared prop:

```vue
<script setup lang="ts">
import { usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

const branding = computed(() => usePage().props.branding);
</script>

<template>
    <img v-if="branding?.logoUrl" :src="branding.logoUrl" :alt="branding.name" class="h-8 w-auto" />
    <span v-else class="font-semibold">{{ branding?.name ?? 'YourApp' }}</span>
</template>
```

React reads `usePage().props.branding` the same way, and Svelte 5 uses `page.props.branding` from `@inertiajs/svelte` inside `$derived`. Add `branding` to your shared props TypeScript type.

## Apply brand colors with Tailwind v4 CSS variables

This is what makes per-tenant theming cheap: no stylesheet per tenant, just different CSS variables at runtime. The shadcn-style setup most Laravel starter kits use already maps Tailwind's color tokens to plain variables with `@theme inline`:

```css
@theme inline {
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --color-ring: var(--ring);
}

:root {
    --primary: hsl(0 0% 9%);
    --primary-foreground: hsl(0 0% 98%);
}
```

With the `inline` option, `bg-primary` compiles to `background-color: var(--primary)` instead of referencing the theme variable, as the [Tailwind theme docs](https://tailwindcss.com/docs/theme) explain. Redefine `--primary` on `<html>` and every `bg-primary`, `text-primary` and `ring-ring` follows. One stylesheet for all tenants. Opacity modifiers like `bg-primary/50` work with plain hex values too, because Tailwind v4 builds them with CSS `color-mix()`. The old v3 advice to store brand colors as RGB triplets no longer applies.

Print the tenant's values in the root Blade view, after `@vite`, so the first paint already has the right color:

```blade
@php($brand = $page['props']['branding'] ?? null)
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @if ($brand) data-brand @endif>
<head>
    {{-- meta tags, @vite ... --}}

    @if ($brand)
        <style>
            html[data-brand] {
                --primary: {{ $brand['primary'] }};
                --primary-foreground: {{ $brand['primaryForeground'] }};
                --ring: {{ $brand['primary'] }};
                --sidebar-primary: {{ $brand['primary'] }};
                --sidebar-primary-foreground: {{ $brand['primaryForeground'] }};
            }

            html[data-brand].dark {
                --primary: {{ $brand['primaryDark'] }};
                --primary-foreground: {{ $brand['primaryDarkForeground'] }};
                --ring: {{ $brand['primaryDark'] }};
            }
        </style>
    @endif
</head>
```

We use `html[data-brand]` instead of `:root` on purpose. It's more specific than the `:root` and `.dark` rules in `app.css`, so it wins whichever stylesheet loads last. That matters in development, where Vite injects CSS from JavaScript after the page loads.

Override a few tokens only. Customers want their color on buttons and highlights, not a lime-green sidebar.

## Check color contrast before you save

**Text on the brand color.** Don't let the customer pick the button text color. Compute it. For any background, pure white or pure black text reaches at least 4.58:1, which passes WCAG AA for normal text (4.5:1). So picking the better of the two always works:

```php
final class ColorContrast
{
    public static function readableTextOn(string $background): string
    {
        return self::ratio($background, '#ffffff') >= self::ratio($background, '#000000') ? '#ffffff' : '#000000';
    }

    public static function ratio(string $a, string $b): float
    {
        $la = self::luminance($a);
        $lb = self::luminance($b);

        return (max($la, $lb) + 0.05) / (min($la, $lb) + 0.05);
    }

    private static function luminance(string $hex): float
    {
        [$r, $g, $b] = array_map(function (string $pair): float {
            $c = hexdec($pair) / 255;

            return $c <= 0.04045 ? $c / 12.92 : (($c + 0.055) / 1.055) ** 2.4;
        }, str_split(ltrim($hex, '#'), 2));

        return 0.2126 * $r + 0.7152 * $g + 0.0722 * $b;
    }
}
```

This is the WCAG relative luminance formula, which is why we validated six-digit hex.

**The brand color on the page.** Focus rings, links and active menu items put the brand color directly on the background, and WCAG asks for 3:1 for UI elements like these. A bright yellow like `#facc15` on white is about 1.5:1. We don't block the save. The settings form shows a warning when `ColorContrast::ratio($primary, '#ffffff') < 3` and suggests a darker shade.

### Dark mode

Run the same check against your dark background. A navy like `#1e3a8a` is under 2:1 against `#0a0a0a`, so it almost disappears. That's what the optional `brand_primary_dark` is for. If it's empty and the main color fails 3:1 on dark, fall back to your default dark palette color. A second logo for dark backgrounds helps too. How the `.dark` class gets on the page without a white flash is covered in [Laravel Inertia dark mode](/blog/laravel-inertia-dark-mode.html).

## A branded login page on every domain

In a database-per-tenant app, the login page lives on the tenant's domain, so tenancy is initialized before it renders. The `branding` prop is there for guests too, and the login page shows the customer's logo and name before anyone signs in. On the central domain `current()` returns `null` and your own brand stays.

- **Unknown subdomains should 404.** Don't render a default-branded login page for a domain that belongs to nobody.
- **Guests can see the prop.** Keep it to public branding fields. No plan names or user counts.

## Favicon and browser title

The favicon is the most visible thing in a browser tab, and the one people forget:

```blade
@if ($brand['iconUrl'] ?? null)
    <link rel="icon" type="image/png" href="{{ $brand['iconUrl'] }}" />
    <link rel="apple-touch-icon" href="{{ $brand['iconUrl'] }}" />
@else
    <link rel="icon" href="/favicon.ico" sizes="any" />
@endif
```

Browsers cache favicons hard, so random file names help here too. For the title, set `app.name` per tenant when tenancy initializes.

## Branded emails and PDFs

A white label SaaS breaks the moment a password reset arrives with your logo on it.

**Emails.** Publish Laravel's mail components (`php artisan vendor:publish --tag=laravel-mail`) and put the tenant's logo and name in the header. Use PNG and an absolute HTTPS URL, since several major email clients don't show SVG. Emails go out from a queue worker with no request host, so `tenant_asset()` would build the URL on `APP_URL`. Build it from the tenant's primary domain instead, or store logos on S3 with public URLs. More on tenant names, queues and languages in emails in [Laravel SaaS transactional emails](/blog/laravel-saas-transactional-emails.html).

**PDFs.** Don't make the PDF renderer fetch the logo over HTTP: dompdf blocks remote files by default, and a headless browser would need access to the tenant's domain. Embed it as a data URI in the tenant context:

```php
$logo = $tenant->brand_logo
    ? 'data:image/png;base64,'.base64_encode(Storage::disk('public')->get($tenant->brand_logo))
    : null;
```

## Custom domains finish the white label Laravel app

The last step of a white label Laravel app is the address bar. With stancl/tenancy a custom domain is another row in the `domains` table, and the branding follows automatically because it's keyed on the tenant, not the host. The hard parts are verifying ownership and issuing TLS certificates, covered in [custom domains for tenants](/blog/laravel-tenant-custom-domains.html).

## Make "Powered by" removal a paid feature

A "Powered by YourApp" line on the login page and footer is free marketing, and removing it is a classic upsell. We define it as a Pennant feature scoped to the tenant:

```php
Feature::define('white-label', fn (Tenant $tenant) => in_array($tenant->plan, ['business', 'agency'], true));
```

Scope it to the tenant, not the user: the login page has no user, and the line must be gone there too. The `poweredBy` field above already reads this flag. Our [Laravel Pennant guide](/blog/laravel-pennant-feature-flags.html) explains where the features table lives in a database-per-tenant app, and [Stripe subscriptions for a SaaS](/blog/laravel-saas-stripe-billing.html) shows how a plan gets onto the tenant. Put the branding settings page behind the same flag.

## Mistakes we see

- **Accepting any color string.** `red; background: url(...)` inside a `<style>` tag is CSS injection, and Blade's escaping won't stop it. Validate six-digit hex.
- **Allowing SVG logos.** An SVG can run scripts. Use raster images, or sanitize SVGs with a dedicated library first.
- **Overwriting `logo.png`.** Browsers, CDNs and email clients keep the old image for days. New upload, new file name.
- **Theming everything.** Override the primary color and its foreground, not the whole palette, or every bad color choice becomes a support ticket.
- **Forgetting other channels.** Emails, PDFs, the favicon and error pages all need the brand.

## Frequently asked questions

### What is a white label SaaS?

A SaaS product each customer can present under their own brand: logo, colors, name and often their own domain. The vendor still runs one codebase, and the customer's users may never see the vendor's name.

### How do I add per-tenant branding to a Laravel app?

Store the logo path, colors and name on the tenant, share them with the frontend on every request, and apply the colors as CSS variables in the root template. With stancl/tenancy, the tenant's `data` column holds the fields without a migration, and the tenant's public disk holds the images.

### Can Tailwind CSS change colors per tenant without rebuilding?

Yes. Tailwind v4 utilities like `bg-primary` can read CSS variables, so redefining `--primary` on the `<html>` element changes the color everywhere. Map the tokens with `@theme inline` and print the tenant's values in a `<style>` tag in your layout.

### Do I need a package for a white label Laravel app?

No. There are Filament plugins and a few general packages, but in an Inertia app it's a service, a shared prop and a few lines of CSS.

## Adding white-label branding to SaaS Laravel

The [SaaS Laravel starter kits](/) don't include per-tenant logos, colors or favicons, so this is something you'd add. Some groundwork is there. Each domain already has its own app name setting, and the kit uses it, or the tenant's company name, as the app name inside the workspace (see [per-domain settings](/docs/core/domains.html#per-domain-settings)). The Vue, React and Svelte kits use Tailwind v4 with `@theme inline` mapped to `--primary` and friends, so the CSS-variable approach above works as is, and `FilesystemTenancyBootstrapper` already scopes the `public` disk per tenant. We'd put `TenantBrandingService` in a new `Modules/Branding` module, add a `Manage Branding` permission in `config/permissions/tenant/`, share a `branding` prop in `HandleInertiaRequests` and add it to the shared props type. The [multi-tenancy docs](/docs/core/multi-tenancy.html) describe the tenant data you'd build on.

<BlogPostCta title="Groundwork for white-label features" text="SaaS Laravel gives you separate tenant databases, tenant-scoped storage, per-domain app names and a module structure, so branding has a clear place to go." />
