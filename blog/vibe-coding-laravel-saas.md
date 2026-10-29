---
title: "Vibe Coding a Laravel SaaS With Claude Code and Cursor"
description: "How we vibe code a Laravel SaaS with Claude Code, Cursor or Codex: setting up the project, writing prompts that work and checking AI code before it ships."
pageClass: blog-page
date: 2026-10-30
author: erag
category: tooling
tags: [AI, Vibe coding]
---

# Vibe Coding a Laravel SaaS With Claude Code, Cursor and Codex

<BlogPostMeta />

Vibe coding is a simple idea. You tell an AI agent what you want in plain English, it writes the code, and you guide it with feedback. For a small side project that works surprisingly well. For a Laravel SaaS with tenants, roles and paying customers, it only works if the agent understands how your app is put together.

We build our own SaaS starter kits this way every week, so this post is the setup and the habits that actually work for us. No hype, just what to prepare, how to write prompts, and how to check the result before it goes live.

## Which AI tool should you use?

All the popular tools can write good Laravel code. The difference is mostly in how they work with your project.

| Tool | How you use it | Reads project rules from |
| --- | --- | --- |
| Claude Code | In the terminal, works across the whole project | `CLAUDE.md` |
| Cursor | Inside the editor, good for small focused edits | `AGENTS.md` and its own rules |
| Codex | Terminal or cloud, can work on tasks in the background | `AGENTS.md` |
| Junie | Inside PhpStorm | `AGENTS.md` |
| GitHub Copilot | Inside VS Code and GitHub | `AGENTS.md` |

Honestly, the tool matters less than people think. Give any of them a clear project and they do well. Give them a messy one and they all struggle. The rest of this post is about making your project clear.

## Why AI agents get Laravel SaaS code wrong

When an agent writes bad code, it's rarely because the model is weak. It's because it can't see something important. These are the mistakes we see most often:

- **It builds every feature differently.** There's no clear pattern to copy, so it invents one each time.
- **It uses old Laravel syntax.** It guesses the package version instead of checking it.
- **It queries the wrong database.** In a multi-tenant app, tenant data lives in its own database, and nothing in a single file tells the agent that.
- **It forgets permissions.** A new page works, but anyone can open it.
- **It skips tests.** So you can't tell whether the change actually works.

All five are fixed the same way: give the agent more context.

## Start with a codebase the agent can copy

An agent learns from the code around it. If your app has one clear way to build a feature, it follows that way. If there are three different styles, it adds a fourth.

This is the main reason we start new products from a starter kit instead of an empty Laravel app. A good SaaS starter kit already has:

- One folder per feature, like `Modules/Billing`, with the same sub-folders every time.
- Thin controllers that validate the request, call a service and return a response. Read more in [thin controllers in Laravel](/blog/laravel-thin-controllers.html).
- Business logic in services, so the agent knows where the real work goes. See the [service layer pattern](/blog/laravel-service-layer-pattern.html).
- Typed data passed to the frontend, using [Laravel Data objects](/blog/laravel-data-objects.html).
- A rules file (`AGENTS.md` or `CLAUDE.md`) that explains all of this in a few lines.
- [Laravel Boost](/blog/laravel-boost-ai-agents.html), which gives the agent skills and an MCP server so it can read your database schema, routes and logs instead of guessing.

With an empty project, the agent has nothing to copy. You spend the first few weeks fixing structure instead of building your product.

## How to write a prompt that gives you good code

Write your prompt like a short ticket for a new developer on your team. Say what to build, where it goes and how you'll know it's done.

This prompt is too vague:

```text
Add billing.
```

This one works much better:

```text
Add a Plans page for tenants.
- Create Modules/Billing with the same structure as Modules/User.
- A Plan has a name, a price in cents and an interval (monthly or yearly).
- Tenant admins with the "Manage Billing" permission can list, create and edit plans.
- Add the page to the tenant menu and translate every label in lang/*/modules.
- Write Pest feature tests for create, update and the permission check.
Don't change anything in the central app.
```

A few things make the second prompt work:

1. It points to an existing example. "Same structure as Modules/User" saves you a paragraph of explaining.
2. It sets the boundaries: tenant or central app, which permission, which languages.
3. It asks for tests in the same prompt.
4. It says what not to touch. Agents love to "improve" nearby code if you let them.
5. It's one feature. Small tasks finish cleanly, big ones wander.

When the result is wrong, tell the agent what's wrong and why, instead of fixing it yourself. For example: "This query runs on the central database, but plans live in the tenant database." It will fix it. And if you find yourself saying the same thing twice, add it to your rules file.

## What to put in your AGENTS.md

Your rules file is what turns vibe coding from luck into a habit. Keep it short and specific. This is close to what we use:

```markdown
## Architecture
- Every feature lives in Modules/<Name> with Http/Controllers, Services, Data and routes.
- Controllers stay thin: validate, call a service, return a response.
- Database work and transactions go in services, never in controllers.

## Multi-tenancy
- Tenant features use routes/tenant.php and the tenant database.
- Never query tenant tables from the central app without tenancy()->initialize().

## Permissions
- Every new route needs a permission middleware.
- Add new permissions to config/permissions/tenant/<module>.php.

## Translations
- No hardcoded text. Add keys to lang/en/modules/<module>.php and every other language.

## Before you finish
- Run the related Pest tests and fix anything that fails.
- Run Pint on the PHP files you changed.
```

You don't need a long essay. A list of rules the agent can check against works far better.

## Let tests check the AI's work

AI writes code faster than you can read it, so let the computer prove that it works:

- Write feature tests for each new page or endpoint, including "a user without permission gets a 403". Our guide on [testing a Laravel SaaS with Pest](/blog/laravel-saas-testing-pest.html) shows how.
- Add a test that data from one tenant never shows up in another. See [testing multi-tenant Laravel with Pest](/blog/test-multi-tenant-laravel-pest.html).
- Run Larastan. It catches methods the agent made up. More in [Larastan and Pint](/blog/laravel-larastan-pint.html).
- Run everything in CI on every pull request.

When all of that passes, your own review can focus on the part only you can judge: does this feature do what your customer needs?

## What a normal feature looks like for us

1. We write the prompt with the feature, an example module to copy and the limits.
2. The agent reads the rules file, the matching skill and the example module.
3. It writes the module, the page, the permissions, the translations and the tests.
4. It runs the tests and Pint and fixes what fails.
5. We read the diff, mostly for business logic and security.
6. We click through the feature as a tenant admin and as a normal user.
7. We merge and start the next one.

On a well-organised codebase, steps 2 to 4 take minutes. We still think hard about the product. We just spend a lot less time on boilerplate.

## Frequently asked questions

### Is vibe coding safe for a production SaaS?

It's as safe as the checks around it. With a clear structure, permission checks on every route, tests for tenant isolation and a human reading every diff, AI-written code is as safe as code you typed yourself. Without those checks it isn't, but the same is true for human code.

### What's the best AI tool for vibe coding Laravel?

Claude Code, Cursor, Codex, Junie and Copilot all work well. The bigger win is your project setup: a rules file, Laravel Boost skills and an MCP server help every one of them.

### Do I still need to know Laravel?

Yes. You need to know enough to tell when a change is wrong, especially around tenants, permissions and data. AI makes a good Laravel developer much faster. It doesn't replace your judgement.

### Should I start from scratch or use a SaaS starter kit?

For a SaaS we'd always start from a kit with clear conventions, because the agent copies its patterns from the first prompt. We compare both options in [Laravel SaaS boilerplate vs building from scratch](/blog/laravel-saas-boilerplate-vs-scratch.html).

## Vibe coding with the SaaS Laravel starter kit

We set up every [SaaS Laravel](/) kit for exactly this way of working. Each one comes with `AGENTS.md` and `CLAUDE.md`, Laravel Boost with its MCP server already configured, and skills for tenancy, Fortify, Inertia, Wayfinder, laravel-data, Pest and Tailwind. Every feature follows the same module structure, so when you ask your agent for something new, it has a dozen working examples to copy, whether you picked Vue, React or Svelte.

<BlogPostCta title="Give your AI agent a codebase it understands" text="SaaS Laravel ships with AI rules, Laravel Boost and one clear module structure, so the features you vibe code land in the right place, tested and permission-aware." />
