---
title: "One-Time vs Subscription Laravel SaaS Starter Kits"
description: "One-time vs subscription Laravel SaaS starter kits: lifetime updates, a year of updates, free MIT kits, what you get and the cost over three years."
pageClass: blog-page
date: 2026-11-21
author: erag
category: saas
tags: [Pricing, Licensing, Starter Kits]
---

# One-Time Payment vs Subscription Starter Kits: What You Really Get

<BlogPostMeta />

When you compare Laravel starter kits, the price is the easiest number to see and the hardest one to read. "$99" and "$239" don't mean much until you know what comes with them. Do you get updates? For how long? Can you use it on a second project, or for a client? How do updates actually reach your code?

This post looks at the price models you'll run into when buying a Laravel SaaS kit: one-time with lifetime updates, one-time with a year of updates and then renewals, and free and MIT-licensed. Then we cover what you actually receive, and work out the license cost over one to three years. We only use regular prices listed on each product's own site in November 2026. Where a sale was running, we use the regular price the page shows next to it. Where a site's own pages disagreed, we leave the number out and link the pricing page.

We sell one of these kits, SaaS Laravel. We've included it in the numbers like everyone else.

## The three price models

### 1. One-time payment, lifetime updates

You pay once and get updates for as long as the product is maintained. As of November 2026, this is the most common model among paid kits:

- [SaaSykit](https://saasykit.com): "Pay once, build unlimited projects", with lifetime updates on every plan.
- [Larafast](https://larafast.com/pricing): one-time fee, "no recurring license fees", lifetime updates on its product cards.
- [JetShip](https://demos.themeselection.com/jetship-laravel-starter-kit/): one-time lifetime licenses with lifetime updates.
- SaaS Laravel: one-time payment, lifetime access to the private repository, weekly updates.

The catch is in the word "lifetime". It means the product's lifetime, not yours. A lifetime promise is only worth as much as the vendor's track record, so look at how often updates have actually shipped.

### 2. One-time payment, one year of updates, then renewals

[Laravel Spark](https://spark.laravel.com) works this way: each license includes one year of updates, and if it expires you keep the last version released before then. Prices and the details are in [what Laravel Spark is](/blog/saas-laravel-vs-laravel-spark.html#what-laravel-spark-is). So the code keeps working; you just stop getting new versions.

This is the closest thing to the "subscription" model people worry about: further updates depend on renewing. The site doesn't list a renewal price, so we can't tell you what years two and three cost. We didn't find a Laravel SaaS kit in our list sold as a monthly or yearly subscription to the code itself.

The important question with any renewal model is what happens when you stop paying. Spark's docs answer it; ask the same question of any kit before you buy.

### 3. Free and MIT-licensed

No license fee at all:

- [Laravel's official starter kits](https://laravel.com/docs/starter-kits) (React, Vue, Svelte, Livewire). The code is copied into your app and you own it; [what they leave out](/blog/laravel-official-starter-kits-vs-saas-boilerplate.html#what-they-leave-out) explains what that means for updates.
- [Wave](https://devdojo.com/wave), "open source and free".
- [Electrik](https://electrik.dev/pricing), which is "$0" and MIT. Its page also mentions that older tags may be under a different license, so check the version you install.

Free doesn't mean no cost. You don't pay for the code, but you pay with your own time for whatever the kit leaves out.

## What you actually get

The price model is only half the story. Here's what to check.

### How the code reaches you

There are three ways kits are delivered:

- **A private Git repository.** You're invited to a GitHub repo and copy or fork the code. SaaS Laravel works this way: a GitHub Sponsors payment gives your GitHub account access to the kit repository. SaaSykit mentions repository access in its refund policy, Larafast sells some bundles as "2 repos", and JetShip sells one repository user on Pro and unlimited users on Teams.
- **A Composer package.** Spark (`laravel/spark-stripe` or `laravel/spark-paddle`) and Electrik install with Composer. Updates come through `composer update`.
- **Scaffolded once.** Laravel's official kits are copied into your app when you create it. After that, it's your code.

### How updates reach your app

Repository-based kits copy their code into your project, so an update is a Git merge, not a version bump. You'll get conflicts wherever you've changed the same files. That's normal and manageable if you keep the kit as an `upstream` remote. We explain the workflow in [updating a starter kit with git upstream](/blog/update-laravel-starter-kit-git-upstream.html), and the SaaS Laravel steps are in the [updates docs](/docs/purchase/updates.html).

Package-based kits are easier to update but harder to change, because the code isn't yours to edit.

### License scope

This varies more than the price does:

| Product | What the license covers (as of November 2026) |
| --- | --- |
| **Laravel Spark** | $99 tier: one deployed application. $199 tier: unlimited applications. |
| **SaaSykit** | Unlimited projects. |
| **Larafast** | Some tiers are for a single project, others allow client work; check their FAQ. |
| **Tenancy for Laravel boilerplate** | Not bound to a specific site; you may not share it with third parties. The [Enterprise tier](https://tenancyforlaravel.com/saas-boilerplate/) is listed for companies with more than $60k annual revenue, so Standard is meant for smaller ones. |
| **JetShip** | Unlimited projects; Pro has one repository user, Teams has unlimited. |
| **SaaS Laravel** | Unlimited projects for you or your clients; no reselling or publishing the source. See the [license](/license.html). |
| **Official kits, Wave, Electrik** | MIT. |

### Refunds and tax

Source code can't be "returned", so refunds are usually limited. SaaSykit says refunds are "not typically offered" once you have repository access. SaaS Laravel doesn't offer refunds, because the code is delivered when you pay. SaaSykit's prices are also shown "+ VAT (if applicable)", so check whether tax is added at checkout.

## Total cost over one to three years

These are license costs only, from regular listed prices as of November 2026. Several sites were running sales when we checked; we use the regular price they show next to the sale price. We left out Larafast, because its own pages disagreed on the price.

| Option | Year 1 | After 3 years |
| --- | --- | --- |
| **Official kits, Wave, Electrik** | $0 | $0 |
| **SaaS Laravel, one kit** | $49 to $69 | $49 to $69 |
| **SaaS Laravel, all four kits** | $139 | $139 |
| **Laravel Spark, one project** | $99 | $99, plus renewals if you want updates (price not listed) |
| **Laravel Spark, unlimited** | $199 | $199, plus renewals if you want updates (price not listed) |
| **SaaSykit** | $239 regular price | $239 |
| **SaaSykit Tenancy** | $269 regular price | $269 |
| **Tenancy for Laravel boilerplate** | $299 Standard, $499 Enterprise (regular prices) | Same |
| **JetShip** | $250 Pro, $415 Teams (regular prices) | Same |
| **Larafast** | Paid, one-time; see the [Larafast pricing page](https://larafast.com/pricing) | Same |

A few notes on reading this:

- **SaaSykit** is listed at $239 (regular price) as of November 2026, with a Black Friday sale running when we checked. [SaaSykit Tenancy](https://saasykit.com/multi-tenancy) is listed at $269 regular, and SaaSykit Complete, which adds the Tenancy repo, at $299 regular. All are "+ VAT (if applicable)".
- **[Tenancy for Laravel](https://tenancyforlaravel.com/saas-boilerplate/)** lists Standard at $299 and Enterprise at $499 as previous prices next to lower current ones. Enterprise is listed for companies with more than $60k annual revenue.
- **[JetShip](https://demos.themeselection.com/jetship-laravel-starter-kit/)** lists Pro at $250 and Teams at $415 as regular prices, with a discount "for First 100 Customers" when we checked.
- **Spark per project adds up.** Three apps on the single-project tier is 3 × $99 = $297 in year one, more than the $199 unlimited tier.
- **SaaS Laravel's bundle** costs $139, which is $93 less than the $232 you'd pay for the four kits separately. Single kits are Livewire $49, Vue $55, Svelte $59 and React $69.
- **Spark and SaaS Laravel do different jobs.** Spark is billing; SaaS Laravel is the app foundation without billing. Putting them in one table compares license models, not features. We cover that in [SaaS Laravel vs Laravel Spark](/blog/saas-laravel-vs-laravel-spark.html).

The bigger cost isn't on this table. It's the time you spend building what a kit leaves out, and the time you spend removing what you don't need. Our post on [the cost to build a Laravel SaaS](/blog/cost-to-build-laravel-saas.html) looks at that side.

## Questions to ask before you pay

1. **What happens to updates if I stop paying, or never pay again?**
2. **How many projects does the license cover? Does client work count?**
3. **How do updates reach my code: Git merge or Composer?**
4. **When was the last update?** Look at the changelog or release notes, not just the "lifetime" label.
5. **Can my team use it?** Some licenses limit repository users.
6. **Is the price a sale price?** Launch and holiday prices change. Budget with the regular one.

To see which kits sit in each price model, with a fair summary of each, read [Laravel SaaS starter kit alternatives](/laravel-saas-starter-kit-alternatives.html).

## Frequently asked questions

### Is a one-time starter kit cheaper than a subscription?

Usually over a few years, yes, if the vendor keeps shipping updates. But compare what each covers: a cheap one-time kit with no updates can cost more in your time than a renewal.

### What does "lifetime updates" mean?

Updates for as long as the vendor maintains the product. It isn't a guarantee about the future, so check how often updates have shipped so far.

### Do I lose a kit if my license or updates expire?

For Spark, no: its docs say you pin to the last version released before your license expired. For copied-code kits, the code is already in your repository. Check each vendor's terms for the details.

### Can I use one license for client projects?

It depends on the kit. SaaS Laravel allows unlimited projects for you or your clients. Spark's $99 tier covers one deployed application. Larafast's tiers differ. Read the license page before you start client work.

## Where SaaS Laravel fits

SaaS Laravel is a one-time payment from $49 for one kit or $139 for all four, with lifetime access to the private repository, weekly updates and unlimited projects. You get database-per-tenant [multi-tenancy](/docs/core/multi-tenancy.html), Fortify auth, roles and invitations in [Vue](/kits/vue.html), [React](/kits/react.html), [Svelte](/kits/svelte.html) or [Livewire](/kits/livewire.html).

It's not the cheapest option: the official kits and Wave are free. And it doesn't include billing (the [Stripe billing guide](/blog/laravel-saas-stripe-billing.html) shows how to add it), so if you want subscriptions in the box, a kit that bundles them may be better value for you. Compare the options in our [Laravel SaaS starter kits comparison](/blog/best-laravel-saas-starter-kits.html), and see the [pricing page](/pricing.html) for current prices.

<BlogPostCta title="Pay once, keep the updates" text="SaaS Laravel is a one-time payment with lifetime repository access, weekly updates and unlimited projects. Pick one kit or all four." />
