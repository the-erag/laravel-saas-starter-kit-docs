---
title: "Laravel Cloud vs Forge vs Vapor for Multi-Tenant SaaS"
description: "Laravel Cloud vs Forge vs Vapor for a database-per-tenant SaaS: wildcard subdomains, custom domains, creating databases, queues, Reverb and cost, as of 2026."
pageClass: blog-page
date: 2026-10-24
author: erag
category: saas
tags: [Deployment, Hosting]
---

# Laravel Cloud vs Forge vs Vapor: Hosting a Multi-Tenant SaaS in 2026

<BlogPostMeta />

Most "Laravel Cloud vs Forge vs Vapor" comparisons assume a normal app: one domain, one database, a queue. A multi-tenant SaaS with a database per tenant asks more of its host. Every new customer needs a subdomain with HTTPS, some want their own domain, and signing up runs `CREATE DATABASE` from inside your app. That last one alone rules out some setups.

The short answer, as of October 2026: Vapor no longer accepts new signups, so for a new project the real choice is between Cloud and Forge. Forge gives you a server you fully control, which is the easiest fit for database-per-tenant. Cloud is fully managed and has the better story for scaling and for adding customer domains through an API, but you need to check a few things before you move tenants onto it.

Everything below comes from the official pages and docs as of October 2026. Prices change, so follow the links before you decide. We assume Laravel 13, PHP 8.4 and stancl/tenancy v3. The actual deploy steps (deploy script, tenant migrations, Supervisor, cron) are in [How to Deploy a Laravel SaaS](/blog/deploy-laravel-saas.html); this post is about choosing where to run them.

## What a database-per-tenant SaaS needs from a host

Here's the checklist we use. The first three are where hosts differ the most.

| Need | Why a multi-tenant app cares |
| --- | --- |
| Wildcard subdomains with wildcard TLS | `acme.your-saas.com` must work the moment a tenant is created, with no manual step |
| Customer custom domains with TLS | Larger customers will ask for `app.acme.com` sooner or later |
| Creating databases at runtime | stancl runs `CREATE DATABASE` when a tenant signs up |
| Queue workers | Invitations, emails and imports run in the background |
| Scheduler | Nightly jobs that loop over every tenant |
| WebSockets (Reverb) | Optional, for live notifications |
| Persistent files per tenant | stancl can suffix storage per tenant, which needs a disk that survives deploys |
| Long-running commands | `tenants:migrate` takes longer with every customer |

How tenants are found by subdomain is covered in [Laravel multi-tenancy with subdomains](/blog/laravel-multi-tenancy-subdomains.html), and mapping customer domains in [custom domains per tenant](/blog/laravel-tenant-custom-domains.html).

## Laravel Vapor in 2026: no new signups

[Vapor](https://vapor.laravel.com) is Laravel's serverless platform on AWS Lambda. Its homepage now says it "is no longer accepting new signups" and points visitors to Laravel Cloud, and the Vapor docs include a guide for migrating to Cloud. The listed prices are $39 per month or $399 per year, plus your own AWS bill, which Vapor doesn't mark up.

Existing Vapor projects keep running. For a new database-per-tenant SaaS, its docs show why it was a hard fit even before the signup change:

- **Wildcard domains need a certificate first.** You set `domain: '*.example.com'` in `vapor.yml`. AWS Certificate Manager wildcards only cover one subdomain level.
- **Customer domains go through deploys.** Each extra domain needs a valid certificate and an entry in `vapor.yml`, and CloudFront can take 30 to 45 minutes to activate it.
- **Short timeouts.** Web requests stop after 10 seconds by default, and API Gateway allows at most 30. If tenant signup creates and migrates a database inside the request, that's tight.
- **CLI and queue limits.** CLI commands time out after one minute unless you raise `cli-timeout`, and any single request or job is capped at 15 minutes by Lambda. A `tenants:migrate` across hundreds of tenants needs planning.
- **Cold starts.** Vapor documents cold starts of a few seconds, with a `warm` option to pre-warm containers.

## Laravel Forge for a multi-tenant SaaS

Forge manages servers you own, either Laravel VPS (provisioned through Forge on DigitalOcean, billed by the hour) or servers at your own provider. According to the [Forge pricing page](https://laravel.com/forge/pricing), Forge itself is a flat $12 (Hobby), $19 (Growth) or $39 (Business) per month as of October 2026, and you pay for the servers on top. Hobby allows unlimited Laravel VPS servers but only one external server.

For our checklist, Forge behaves like the server you'd set up by hand, minus the chores:

**Wildcard subdomains and TLS.** Forge supports `*.example.com` on a site. For Let's Encrypt it recommends DNS-01 verification through a single CNAME record pointing at Forge, which works for wildcard certificates with any DNS provider. Keep that CNAME in place, or renewals fail. Details are in the [Forge domains docs](https://laravel.com/forge/docs/sites/domains).

**Customer domains.** Each custom domain on a site gets its own Nginx config and its own certificate, so adding one doesn't touch the others. Forge's server also has a catch-all config that answers `444` for any domain that isn't configured, so you can't just point a customer's DNS at the server. You add each domain to the site, which the Forge API and PHP SDK (`createDomain()`) let you do from your own code.

**Creating databases.** On an app server or database server with MySQL, MariaDB or PostgreSQL, Forge shows you the root password when it creates the server. You control the database, so giving your app's user the right to create and drop databases is up to you. Forge's managed database clusters (also through DigitalOcean) are a different product: you add databases and users in the dashboard, and the docs don't say whether the default user can create databases itself. Test it before you rely on it.

**Queues, scheduler, Reverb.** Queue workers run under Supervisor and restart if they crash. The Laravel scheduler is a toggle. Reverb is a toggle too: Forge creates the daemon and proxies a hostname such as `ws.example.com` to it.

**Deploys.** New sites use zero-downtime deployments by default. Forge shares `.env` across releases automatically, but not `storage`. With per-tenant storage folders, add `storage` as a shared path, or every deploy looks like lost uploads.

Forge doesn't scale servers for you. There's load balancing, but you add servers yourself.

## Laravel Cloud for a multi-tenant SaaS

Cloud is the fully managed option. On the [Cloud pricing page](https://laravel.com/cloud/pricing), as of October 2026, plans are $5 (Starter, which includes $5 of usage credit), $20 (Growth) and $200 (Business) per month, plus usage. Compute is billed per second with a monthly cap per size, from $6 per month for Flex 512 MiB up to $256 for Pro 32 GiB. Starter is limited to Flex sizes up to 2 GiB and one replica; Growth adds Pro compute and autoscaling up to 10 replicas.

**Wildcard subdomains and TLS.** Supported. When you add a domain, you choose wildcard support. Cloud asks you to add the root domain too and to keep a DCV delegation CNAME in place, so it can renew the wildcard certificate. See the [Cloud domains docs](https://laravel.com/cloud/docs/domains).

**Customer domains.** Each custom domain gets automatic TLS, and the Cloud API has endpoints to create and verify domains, so your app can add a customer's domain programmatically. The limit is what to watch: 10 custom domains per organization on Starter, 50 on Growth and 250 on Business, then $0.25 per domain per month. The docs suggest contacting them if you need many domains "for example, multi-tenant applications".

**Creating databases.** A Laravel MySQL cluster can hold many databases, and you can create them in the dashboard or through the API (`POST /databases/clusters/{database}/databases`). What the docs don't say is whether the default user that Cloud injects as `DB_USERNAME` may run `CREATE DATABASE` from your app. Read-write users are described as having full access "to the schemas they are scoped to". So either test it on a staging environment, create tenant databases through the Cloud API instead of SQL, or bring your own database (Cloud supports external databases with a public connection).

**Queues and workers.** Cloud's managed queues are the recommended option. Two details matter for us. When you add one, Cloud sets `QUEUE_CONNECTION=cloud`, and every job dispatched without an explicit connection goes there, including jobs you used to run on the `database` driver. And Flex queue workers allow jobs of up to 90 seconds; Pro has no fixed limit. You can also run plain `queue:work` processes on the App cluster or a worker cluster, and Cloud restarts them after each deploy.

**Scheduler.** A toggle that runs `schedule:run` every minute. With several replicas, use `onOneServer()`.

**Scale to zero.** New Flex sizes wake in under 500 milliseconds. A sleeping environment wakes for scheduled tasks, but queued jobs don't wake it, so self-managed workers on a sleeping App cluster just wait.

**Files and deploy commands.** The filesystem is ephemeral, reset on every deploy and separate per replica, so tenant files belong in object storage. Deploy commands must finish within 15 minutes, which is your budget for `tenants:migrate`.

**WebSockets.** Cloud runs managed Reverb clusters and injects the Reverb and Echo variables for you.

## Laravel Cloud vs Forge vs Vapor: the comparison table

| | Laravel Cloud | Laravel Forge | Laravel Vapor |
| --- | --- | --- | --- |
| What it is | Fully managed platform on AWS | Manager for servers you own | Serverless on AWS Lambda |
| New signups | Yes | Yes | No |
| Pricing model | Plan fee plus usage | Flat fee plus your servers | Fee plus your AWS bill |
| Wildcard subdomain + TLS | Yes, DCV CNAME kept in place | Yes, DNS-01 via one CNAME | Yes, ACM certificate, one level |
| Customer custom domains | API, 10/50/250 included per org | API or SDK, one per Nginx config | Certificate plus `vapor.yml` deploy |
| `CREATE DATABASE` from the app | Not documented, test it or use the API | Yes on servers you control | Not documented; extra databases via your own tools |
| Queue | Managed queues (Flex jobs up to 90s) or workers | Supervisor workers | SQS, 15 minute cap |
| Scheduler | Toggle | Toggle | Built in |
| Reverb | Managed clusters | Daemon toggle | Not built in; broadcasting defaults to Pusher |
| Cold starts | Flex wakes in under 500ms | None, always on | Documented, `warm` option |
| Autoscaling | Growth and Business | Manual | Automatic |
| Local disk | Ephemeral | Persistent, share `storage` | Ephemeral, use S3 |

## Best Laravel hosting for SaaS, by stage

**First customers.** We'd use Forge with one Laravel VPS (or a server at your usual provider) running the app, MySQL and the queue worker. You get wildcard TLS without fuss, you own the database user, and the bill is the Forge fee plus one server. If you really don't want to look after a server, Cloud Starter works too, but test tenant creation on it first.

**Growing.** Move MySQL to its own server, add a second app server behind a load balancer, and give slow imports their own queue. On Cloud, this is where the Growth plan, the domain limits and the database API start to matter.

**Spiky traffic.** Cloud is the stronger choice here: autoscaling replicas, managed queues that add workers as the queue grows, and compute that's billed per second. Plan how tenant databases get created before you move, and put tenant files in object storage.

**Already on Vapor.** It still runs. We'd plan a move to Cloud on your own schedule rather than wait.

## Mistakes we see when picking a host

- **Not testing `CREATE DATABASE`.** Create a real tenant on staging, on the exact database product you'll use in production. It's the one check that can block signups.
- **Forgetting the domain cap.** Ten included custom domains is plenty for a normal app and very few for a SaaS that offers them to every customer.
- **Queue driver surprises.** Adding a Cloud managed queue reroutes jobs that used the `database` driver. Know which connection your tenant jobs use, and read [multi-tenant queues](/blog/laravel-multi-tenant-queues.html) for where the jobs table should live.
- **Ignoring time limits.** Tenant signup in the request and `tenants:migrate` in a deploy hook hit managed-platform timeouts long before they hit your own server's.

## Frequently asked questions

### Is Laravel Vapor discontinued?

The Vapor homepage says it is no longer accepting new signups and points to Laravel Cloud, and the Vapor docs have a guide for migrating to Cloud. Existing Vapor projects keep running. For a new project, choose between Cloud and Forge.

### Is Laravel Cloud cheaper than Forge?

It depends on your traffic. Forge is a flat monthly fee plus servers that run all the time. Cloud is a plan fee plus per-second usage, and Flex compute can scale to zero, so a quiet app can cost very little, while an always-busy app pays for every running replica. Compare both pricing pages with your own numbers.

### Can Laravel Cloud create a database for each tenant?

A Cloud MySQL cluster can hold many databases, and you can create them from the dashboard or the Cloud API. The docs don't say whether the injected database user can run `CREATE DATABASE` from your app, so test it, or call the API when a tenant signs up.

### Does Laravel Forge support wildcard SSL certificates?

Yes. Forge supports wildcard subdomains such as `*.example.com` and issues Let's Encrypt certificates through DNS-01 verification. You add one CNAME record that points to Forge and keep it in place for renewals.

### What is the best Laravel hosting for a SaaS?

For a database-per-tenant SaaS, we'd start on Forge because you control the database server and wildcard TLS is simple. Move to Cloud when you need autoscaling and managed queues, after checking how tenant databases get created there.

## Hosting the SaaS Laravel kits

The [SaaS Laravel starter kits](/) run on any of these as long as the host covers what the [production requirements](/docs/getting-started/requirements.html#production) list: PHP 8.4 or newer, the central domain and a wildcard subdomain (`*.your-domain.com`) routed to the app with wildcard DNS, a database user that can create tenant databases, a queue worker for the queued invitation and password-reset emails, and a real mailer. Tenants are subdomains of `APP_DOMAIN`; the kits don't map fully custom domains such as `app.customer.com`, so the custom-domain rows above only matter if you add that yourself. Tenant creation runs `CREATE DATABASE`, migrations and seeders synchronously inside the request, which is why the database permission and request time limits matter.

A few more details from the kit's config. The default drivers for sessions, cache and the queue are all `database`, with queued jobs in the central `jobs` table, and MySQL is what we build and test against. The routes file has no scheduled tasks yet, so the scheduler isn't required until you add some. stancl's filesystem bootstrapper suffixes the `local` and `public` disks per tenant, which is fine on a Forge server with `storage` shared, but on an ephemeral disk you'd switch tenant files to S3 (there's a commented `s3` entry in `config/tenancy.php` for that). We haven't tested the kits on Cloud's managed queues; since `QUEUE_CONNECTION` changes to `cloud`, try tenant jobs on staging first. The deploy script, wildcard TLS and Supervisor setup are in [How to Deploy a Laravel SaaS](/blog/deploy-laravel-saas.html).

<BlogPostCta title="A SaaS that knows how to deploy" text="SaaS Laravel documents exactly what production needs, from wildcard subdomains to tenant databases and queue workers, for Vue, React or Svelte." />
