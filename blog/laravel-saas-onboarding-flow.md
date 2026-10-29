---
title: "Laravel SaaS Onboarding: From New Tenant to First Value"
description: "Onboarding for a multi-tenant Laravel SaaS: tenant setup as a workflow, a short wizard, an onboarded_at check, a checklist and activation."
pageClass: blog-page
date: 2026-10-27
author: annu-gupta
category: saas
tags: [SaaS, Onboarding]
---

# Laravel SaaS Onboarding: Get Every New Tenant to Its First Win

<BlogPostMeta />

Most SaaS trials are lost in the first ten minutes. Someone signs up, sees an empty dashboard, doesn't know what to do next, and never comes back. Good onboarding fixes that. Its only job is to get every new customer to the first moment where your product is actually useful to them, as fast as possible.

In this post we'll build onboarding for a multi-tenant Laravel and Inertia app. That means setting up the tenant properly, a short setup wizard, a check that sends unfinished accounts back to it, a checklist, team invites, sample data, and a few numbers that tell you whether any of it works.

## Decide what "first value" means

Before you write any code, write down the moment you're aiming for. One sentence is enough:

| Product | First value |
| --- | --- |
| Invoicing app | The first invoice is sent |
| Project tool | A project exists with two teammates in it |
| Analytics app | The first real data shows up on a chart |
| Helpdesk | The first customer email lands in the inbox |

Everything in your onboarding should move people toward that moment. Profile photos, notification settings and theme choices can all wait.

## Setting up a tenant is a workflow, not one action

In a multi-tenant app, a lot happens when a new customer signs up. You create the tenant, create its database, run the migrations, seed roles, permissions and menus, create the first admin, and send them an invitation. If all of that sits in one controller method, a failure halfway through leaves a broken tenant behind.

Treat it as a series of steps in a service instead, where each step can be retried and the first admin is only invited once everything else worked:

```php
final class TenantProvisioningService
{
    public function provision(TenantRegisterData $data): Tenant
    {
        $tenant = Tenant::create($data->tenantAttributes());

        $tenant->domains()->create(['domain' => $data->subdomain]);

        $tenant->run(function () use ($data) {
            $this->seedDefaults();
            $this->createAdmin($data);
        });

        $this->sendInvitation($tenant);

        return $tenant;
    }
}
```

With stancl/tenancy, creating the database and running tenant migrations usually happens in a job pipeline when the tenant is created, so the steps above just add your own defaults on top. See [stancl/tenancy step by step](/blog/stancl-tenancy-tutorial.html).

## Keep the sign-up short

Only ask for what you need to create the account: name, email, password and the company name. Generate the subdomain from the company name and let people change it. Everything else can go in the wizard after sign-up, when people are already committed.

If you invite customers instead of letting them sign up on their own, the invitation is the sign-up. The admin opens a signed link, sets a password and lands in their own workspace. See [user invitations with signed URLs](/blog/laravel-user-invitations-signed-urls.html).

## Track onboarding with one timestamp

Add a nullable `onboarded_at` column to the user, or to the tenant if onboarding happens once per company:

```php
Schema::table('users', function (Blueprint $table) {
    $table->timestamp('onboarded_at')->nullable();
});
```

A timestamp is better than a yes/no column, because it also tells you when people finished. That's a number you'll want later.

## Send unfinished accounts back to the wizard

A small middleware sends users who haven't finished onboarding back to it. Leave out the onboarding pages themselves and logout, or people get stuck:

```php
final class EnsureOnboarded
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->onboarded_at === null && ! $request->routeIs('onboarding.*', 'logout')) {
            return redirect()->route('onboarding.show');
        }

        return $next($request);
    }
}
```

Add it to the routes of your app, not to the login routes, so people can still sign out and reset their password.

## A short wizard: three steps

Three steps is usually right. Each step is one Inertia page with one small form:

1. **About your work.** Company size, industry or what they want to use the app for. Use this to choose sensible defaults.
2. **Set up the one thing that matters.** Whatever your product needs to work, like connecting a data source or creating the first project.
3. **Invite your team.** Optional, with a clear "Skip for now" link. Products used by a team keep customers far better, so it's worth asking.

Save each step through a service and finish with one call that sets the timestamp:

```php
final class OnboardingService
{
    public function complete(User $user): void
    {
        DB::transaction(function () use ($user) {
            $user->forceFill(['onboarded_at' => now()])->save();

            $user->notify(new WelcomeNotification);
        });
    }
}
```

Show where people are ("Step 2 of 3"), let them go back, and never lose what they typed. Inertia's form helpers make that last part easy. See [the Inertia form component](/blog/inertia-form-component.html).

## A checklist on the dashboard

Not everything fits in a wizard. A small checklist on the dashboard carries people the rest of the way:

- Create your first project
- Invite a teammate
- Connect your calendar
- Choose your workspace language

Work out each item from real data, like "does a project exist?", instead of saving ticks in a table. That way it can never be wrong. Hide the checklist once everything is done, or after 30 days. If you'd rather not build this yourself, Spatie's `laravel-onboard` package does exactly this kind of checklist.

## Never show an empty screen

An empty dashboard is the most common reason trials die. Fill the gaps:

- An empty state with one clear action: "No projects yet. Create your first project."
- A "Load example data" button that creates a demo project people can explore and delete.
- Defaults that already work, like roles, permissions and menus that are set up the moment the tenant is created.

## Emails that help

Onboarding doesn't stop when people close the tab:

- A welcome email right after setup, pointing to the next step on the checklist.
- A friendly nudge after two or three days if they still haven't reached first value.
- Invitation emails teammates can accept with one click.

Send them through the queue, translate them and send them from a real address. See [transactional emails in a multi-tenant Laravel SaaS](/blog/laravel-saas-transactional-emails.html).

## Measure it

You can't improve what you don't measure. Save a timestamp for a few key moments:

| Moment | What it tells you |
| --- | --- |
| Signed up | How many people start |
| Finished onboarding | Whether the wizard works |
| Reached first value | Whether the product works for them |
| Invited a teammate | Whether they're likely to stay |
| Came back in week two | Whether you'll keep them |

The time between signing up and reaching first value is the most important number here. Every step you remove makes it shorter.

## Frequently asked questions

### How many steps should a SaaS onboarding wizard have?

As few as you can, usually three or fewer. Only ask for what you need to reach first value, and move everything else to settings or a checklist.

### Should onboarding be per user or per tenant?

Both, in a multi-tenant app. The first admin sets up the company once. Every invited teammate gets a shorter personal onboarding, like setting their name, language and password.

### Is there a Laravel package for onboarding?

Yes. Spatie's `laravel-onboard` handles checklist-style onboarding, and there are wizard packages for Filament. For an Inertia app, a few small pages and an `onboarded_at` column are often all you need.

### What's a good activation rate for a SaaS?

It depends on the product. But if fewer than half of new sign-ups reach first value in their first week, onboarding is the first thing to fix.

## Onboarding in the SaaS Laravel starter kit

[SaaS Laravel](/) gives you the groundwork for all of this:
- Creating a tenant gives the company its own database and seeds roles, permissions and menus, so no workspace starts empty.
- The first admin gets a signed invitation link, sets a password, and lands in a workspace that's already active.
- Invitation emails for teammates go out through the queue.
- The module structure gives a new onboarding module an obvious place to live.

<BlogPostCta title="Get new customers to their first win faster" text="SaaS Laravel handles tenant setup, invitations, seeded roles and menus and team invites, so your onboarding can focus on your product." />
