---
title: "Laravel vs Next.js for SaaS: What You Get vs Build"
description: "Laravel vs Next.js for building a SaaS: auth, queues, billing, tenancy and hosting compared honestly, plus why Laravel with Inertia and React is a middle path."
pageClass: blog-page
date: 2026-10-24
author: erag
category: saas
tags: [Next.js, Architecture]
---

# Laravel vs Next.js for a SaaS: What You Get and What You Assemble

<BlogPostMeta />

Most "Laravel vs Next.js" articles compare them as if they were the same kind of tool. They aren't. Laravel is a full backend framework with auth, queues, mail, an ORM and a scheduler included. Next.js is a React framework with strong server features (React Server Components, Server Functions, caching), and you choose the backend pieces yourself. For a content site that difference is small. For a SaaS it decides how much you build before your first customer signs up.

This post compares them for one job: building and running a SaaS product. We'll go through what each gives you, what you'll assemble, where Next.js is clearly stronger, and a middle path that people often miss: Laravel with Inertia and React. We're looking at Laravel 13 and Next.js 16 (16.4 is the latest minor as of October 2026).

## Two different kinds of framework

**Laravel** handles the request on the server, talks to the database, sends mail, runs background jobs and renders a response. The frontend can be Blade, Livewire, or a Vue, React or Svelte app through Inertia.

**Next.js** is built around React. Pages and layouts are React components, and many of them run on the server as Server Components. Mutations go through Server Functions (Server Actions) or Route Handlers, and `proxy.ts` (the new name for `middleware.ts` since Next.js 16) runs before requests. Next.js 16 also brought Cache Components with the `"use cache"` directive, Turbopack as the default bundler and React 19.2 features.

So the question isn't "PHP or JavaScript?" so much as "do I want a backend framework with a frontend on top, or a frontend framework that reaches into the backend?"

## What a SaaS needs, and where it comes from

Here's the list we'd want before launching a B2B SaaS, and where each piece comes from in each stack.

| SaaS need | Laravel 13 | Next.js 16 |
| --- | --- | --- |
| Login, registration, password reset | Fortify, used by the official starter kits | Auth library or service (the Next.js docs list Auth.js, Better Auth, Clerk, WorkOS and others) |
| Two-factor auth | Fortify TOTP, enabled by default in the starter kits | Depends on the auth library you pick |
| Email verification | `MustVerifyEmail` and the `verified` middleware | Auth library or your own code |
| ORM and migrations | Eloquent and migrations | Not included; pick an ORM such as Prisma or Drizzle |
| Validation | Form Requests and the validator | Not included; the docs suggest Zod, Valibot or Yup |
| Authorization | Gates and policies, plus packages like spatie/laravel-permission | Your own Data Access Layer, as the Next.js docs recommend |
| Background jobs | Queues with database, Redis or SQS drivers, retries and failed jobs | `after()` for short work after a response; a durable queue is a separate service |
| Scheduled tasks | The scheduler in `routes/console.php` | Your platform's cron or an external scheduler |
| Mail and notifications | Mailables and notifications (mail, database, broadcast) | Your email provider's SDK |
| File storage | `Storage` facade with local and S3 drivers | Your storage provider's SDK |
| Billing | Cashier for Stripe or Paddle | Stripe SDK or a billing service |
| Multi-tenancy | Packages like stancl/tenancy or spatie/laravel-multitenancy | Build it yourself in your data layer |
| Real-time | Reverb and Echo | A third-party realtime service or your own WebSocket server |
| Admin panel | Filament or Nova | Build it, or use a third-party admin tool |

None of the Next.js answers are bad. Auth.js, Better Auth, Prisma, Drizzle and Zod are good tools, and plenty of successful products run on them. The point is that each row is a decision, an integration and an upgrade you own. In Laravel, most rows are a config file and a page of docs, and they're designed to work together: a queued notification can use your mail config, your models and your tenant context without glue code.

The Next.js docs are honest about this. Their authentication guide walks through a manual setup for learning purposes, then recommends an auth library "for increased security and simplicity".

## Where Next.js is genuinely strong

We build Laravel kits, so take this section seriously precisely because it's not in our interest to write it.

- **React Server Components.** You can fetch data inside a component on the server and stream it to the browser. For content-heavy pages this is a very nice model.
- **One language.** TypeScript from the database query to the button. Types flow end to end without a generation step, and one person can work on every layer without switching languages.
- **SEO and marketing pages.** Static generation, streaming and caching make public pages fast by default. If your SaaS has a large public surface (docs, templates, a marketplace), Next.js handles that well in the same app.
- **Vercel.** Push to Git and get preview deployments per branch, a CDN in front of static and cached content, and no servers to manage. Next.js also runs on a plain Node server or Docker, and 16.2 made the Adapter API stable for other platforms.
- **The React ecosystem.** Every React library works, and React developers are easy to hire.

If your product is mostly a fast, public, content-driven React site with a thin backend, Next.js is a great choice and we wouldn't try to talk you out of it.

## Where Laravel is strong for SaaS

A SaaS is mostly backend work that users never see: sending the invite email, retrying the failed webhook, cleaning up expired trials at 2 a.m., checking that user 42 can edit invoice 9 in tenant 7. That's the work Laravel was built for.

- Queues, the scheduler, mail and notifications are part of the framework, with one way to configure and test them.
- Eloquent, migrations, seeders and factories cover your database from day one.
- Validation, authorization and rate limiting sit in the request lifecycle, so they're hard to forget.
- Packages for the hard SaaS parts (tenancy, permissions, billing, activity logs) have been in production for years.
- Long-running work is normal. A queue worker can process a 20-minute export without hitting a function timeout.

## The middle path: Laravel + Inertia + React vs Next.js

Here's what many comparisons miss. Choosing Laravel doesn't mean giving up React. With [Inertia](https://inertiajs.com), your pages are React components and Laravel is the backend, with no separate API to build.

Compare the same "projects" page. In Next.js, a Server Component can load the data itself:

```tsx
// app/projects/page.tsx
import { verifySession } from '@/app/lib/dal';
import { db } from '@/app/lib/db'; // your ORM of choice

export default async function ProjectsPage() {
    const session = await verifySession();
    const projects = await db.project.findMany({ where: { teamId: session.teamId } });

    return (
        <ul>
            {projects.map((project) => (
                <li key={project.id}>{project.name}</li>
            ))}
        </ul>
    );
}
```

In Laravel with Inertia, a controller loads the data and passes it as props:

```php
// Modules/Project/Http/Controllers/ProjectController.php
public function index(): Response
{
    return Inertia::render('projects/Index', [
        'projects' => $this->projects->forCurrentTeam(),
    ]);
}
```

And the React page just renders them:

```tsx
// resources/js/pages/projects/Index.tsx
type Project = { id: number; name: string };

export default function Index({ projects }: { projects: Project[] }) {
    return (
        <ul>
            {projects.map((project) => (
                <li key={project.id}>{project.name}</li>
            ))}
        </ul>
    );
}
```

The React code is nearly the same. What changes is where the data and the rules live. In the Inertia version, the session, the tenant scope, the policies and the query are all Laravel, and the React component never touches the database. You get the React ecosystem for the UI and Laravel's full toolbox behind it.

What you give up compared to Next.js: React Server Components (Inertia pages render on the client, with optional SSR for the first load), a single language, and Vercel's zero-config deploys. What you gain: everything in the Laravel column of the table above.

## Hosting and running costs

We won't put numbers here, because they change and depend on your traffic. The shape is what matters.

A Laravel SaaS needs a PHP server, a database, a queue worker that keeps running and a cron entry for the scheduler. You can run that on a single VPS, on Forge, or on Laravel Cloud. We compare those in [Laravel Cloud vs Forge vs Vapor](/blog/laravel-cloud-vs-forge-vs-vapor.html), and [deploying a Laravel SaaS](/blog/deploy-laravel-saas.html) covers the checklist.

A Next.js SaaS on Vercel needs no servers for the web layer, but your database, queue, cron, email and auth usually come from separate services, each with its own plan and dashboard. Self-hosting Next.js on Node or Docker is fully supported, and then you're back to running servers, just with different software on them.

Neither is cheaper by default. A Laravel app on one server is very cheap to run and needs a bit of ops knowledge. A Next.js app on managed services is easy to start and its bill grows with each service you add.

## Laravel vs Next.js: how to pick

**Pick Next.js when:**

- Your team is TypeScript-first and nobody wants to write PHP.
- A large part of the product is public, content-driven and SEO-sensitive.
- The backend is thin: mostly reading and writing data, with auth and billing handled by managed services you're happy to pay for.
- You want Vercel's preview deployments and don't want to manage servers.

**Pick Laravel when:**

- The product has real backend work: background jobs, scheduled tasks, emails, webhooks, imports and exports.
- You need multi-tenancy, roles and permissions, or audit trails, and want proven packages for them.
- Someone on the team already knows PHP, or you'd rather learn one framework than integrate ten libraries.
- You want predictable hosting on servers you control.

**Pick Laravel + Inertia + React when:** you want both lists. React for the UI, with hiring and libraries to match, and a full backend that doesn't need assembling. Our [Laravel React SaaS dashboard guide](/blog/laravel-react-inertia-saas.html) shows how that fits together.

## Mistakes people make with this decision

- **Comparing hello-world apps.** Both feel fast for a todo list. Compare the boring parts instead: a queued email retry, a nightly job, a permission check per tenant.
- **Counting the frontend only.** "We know React, so Next.js" skips the question of who builds and maintains queues, billing webhooks and tenancy.
- **Assuming serverless fits long jobs.** Imports, PDF generation and big exports need a worker, not a request with a time limit. Plan where those run before you choose.
- **Putting authorization only in middleware or proxy.** The Next.js docs say this too: checks belong close to the data. In Laravel, use policies and Form Request `authorize()`, not just route middleware.
- **Building a separate API you don't need.** If Laravel is the backend and React the frontend, Inertia removes the need for a public API for your own UI. Build an API when a mobile app or third parties need it.
- **Ignoring the team you'll hire.** The best stack is the one the next three developers can work in.

## Frequently asked questions

### Is Laravel better than Next.js for SaaS?

For a SaaS with real backend work (jobs, emails, billing, tenancy, permissions), Laravel gives you more of it by default. Next.js is a better fit when the product is mostly a public React site with a thin backend, or when the team is TypeScript-only. Many teams get the best of both with Laravel, Inertia and React.

### Can I use React with Laravel instead of Next.js?

Yes. Laravel's official React starter kit uses Inertia, React 19, TypeScript and shadcn/ui. Your pages are React components, and Laravel handles routing, data, validation and auth without a separate API.

### Does Next.js have a backend?

It has server features: Server Components, Server Functions, Route Handlers and `proxy.ts`. It doesn't include an ORM, migrations, a job queue, a scheduler or a mail system, so you add libraries or services for those.

### Can Laravel and Next.js work together?

Yes. A common setup is Next.js for the frontend and Laravel as an API with Sanctum for auth. It works well, but you now maintain two apps, an API contract and two deploy pipelines. If you don't need that split, Inertia keeps it to one app.

### Is Next.js faster than Laravel?

It depends on what you measure. Next.js can serve static and cached pages from a CDN, which is hard to beat for public content. For logged-in dashboards, speed mostly comes from your queries, caching and payload sizes, in either stack.

## Laravel + React in the SaaS Laravel kits

If "Laravel + React" sounds right, the [SaaS Laravel React kit](/kits/react.html) is that stack, already wired up: Laravel 13, Inertia v3 and React 19 with TypeScript and shadcn/ui components. On the backend it ships database-per-tenant multi-tenancy with stancl/tenancy (each tenant on its own subdomain), Fortify auth with two-factor and passkeys, roles and permissions with spatie/laravel-permission, user invitations, database-driven menus, in-app notifications and a database queue. Code is organised in modules with thin controllers and service classes, and Wayfinder plus generated TypeScript types connect the PHP and React sides.

To be clear about what's not included: there's no billing integration. Cashier would fit in as its own module (say `Modules/Billing`) next to the existing ones, and our [Stripe billing guide](/blog/laravel-saas-stripe-billing.html) walks through it. The same backend is also available with [Vue](/kits/vue.html) or [Svelte](/kits/svelte.html) if your team prefers those.

<BlogPostCta title="React frontend, full Laravel backend" text="The SaaS Laravel React kit pairs React 19 and Inertia v3 with multi-tenancy, auth, roles and permissions on Laravel 13." />
