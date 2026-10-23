---
title: "Laravel Reverb Real-Time Notifications, Step by Step"
description: "Add Laravel Reverb real-time notifications to your app: install broadcasting, authorize a private channel, listen with Echo and update the bell live."
pageClass: blog-page
date: 2026-10-24
author: annu-gupta
category: saas
tags: [Reverb, Notifications, Real-time]
---

# Laravel Reverb Real-Time Notifications: Update the Bell Without a Reload

<BlogPostMeta />

Database notifications show up when the user loads the next page. That's fine for most things, but some events feel broken if they wait: a teammate mentions you, an export finishes, a payment fails while you're looking at the invoice. Laravel Reverb real-time notifications fix that. The notification is stored as usual, and the same notification is pushed over a websocket so the bell updates the moment it's sent.

This post starts where [Laravel database notifications](/blog/laravel-database-notifications.html) ends. You already have a `notifications` table, a notification class and a bell that reads a shared Inertia prop. We'll add Reverb, a private channel per user, Echo on the frontend, and then the parts that tutorials usually skip: multi-tenant channel names and running Reverb in production.

We're using Laravel 13, PHP 8.4, Reverb 1.x, Inertia v3 and `@laravel/echo-vue` 2.x. React and Svelte have matching Echo packages, and we show the React version where it differs.

## Laravel Reverb vs Pusher

Reverb is Laravel's own websocket server. It speaks the Pusher protocol, so Laravel Echo talks to it exactly like it talks to Pusher. The difference is who runs the server.

| | Laravel Reverb | Pusher Channels |
| --- | --- | --- |
| Hosting | You run it (`php artisan reverb:start`) on your own server, or on Laravel Cloud's managed Reverb | Managed service, nothing to run |
| Price | Free, MIT licensed. You pay for the server it runs on | Free Sandbox plan, paid plans after that |
| Limits | Your server: open files, ports, memory | Plan limits on concurrent connections and messages per day |
| Scaling | Several Reverb servers behind a load balancer, sharing messages through Redis | Handled by Pusher |
| Data | Stays on your infrastructure | Messages pass through a third party |
| Operations | You monitor, restart and proxy it | Nothing to operate |

As of October 2026, Pusher's free Sandbox plan allows 100 concurrent connections and 200,000 messages per day, and the paid plans start at $49 per month. Check the [Pusher Channels pricing page](https://pusher.com/channels/pricing/) for current numbers.

Our take: for a SaaS that already runs on a VPS, we'd pick Reverb. It's one more process next to your queue worker, and the cost stays flat as you grow. Pusher makes sense when you're on hosting where you can't run long-lived processes, or when you don't want to be paged about a websocket server. Since both use the same protocol, switching later is mostly a config change.

## Install broadcasting with Reverb

One command does most of the setup:

```bash
php artisan install:broadcasting --reverb
```

Here's what it does in a Laravel 13 app:

- Publishes `config/broadcasting.php` and creates `routes/channels.php`.
- Adds `channels: __DIR__.'/../routes/channels.php'` to `withRouting()` in `bootstrap/app.php`. That registers the `/broadcasting/auth` route.
- Sets `BROADCAST_CONNECTION=reverb` and installs `laravel/reverb`, which writes `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET`, `REVERB_HOST`, `REVERB_PORT`, `REVERB_SCHEME` and the matching `VITE_REVERB_*` variables to `.env`.
- Installs `laravel-echo` and `pusher-js`. In a Vue or React app it also installs `@laravel/echo-vue` or `@laravel/echo-react` and adds a `configureEcho()` call to `resources/js/app.ts` (or `app.tsx`).

The generated configuration is short, because `configureEcho()` fills in the key, host, port and TLS settings from the `VITE_REVERB_*` variables:

```ts
import { configureEcho } from '@laravel/echo-vue';

configureEcho({
    broadcaster: 'reverb',
});
```

Svelte isn't detected by the command. Install `@laravel/echo-svelte` yourself and add the same `configureEcho()` call to your entry file.

Now start the server in its own terminal:

```bash
php artisan reverb:start --debug
```

It listens on `0.0.0.0:8080` by default. `--debug` prints every message, which is very handy the first time and too noisy after that.

## Add the broadcast channel to your notification

Broadcasting a notification is one more entry in `via()`:

```php
use Illuminate\Notifications\Messages\BroadcastMessage;

public function via(object $notifiable): array
{
    return ['database', 'broadcast'];
}

public function toBroadcast(object $notifiable): BroadcastMessage
{
    return new BroadcastMessage([
        'title' => 'notifications.invoice_paid.title',
        'url' => route('invoices.show', $this->invoice, absolute: false),
    ]);
}

public function broadcastType(): string
{
    return 'invoice-paid';
}
```

If you leave out `toBroadcast()`, Laravel broadcasts whatever `toArray()` returns. Laravel adds two fields to the payload: `id` and `type`. The `id` is the same UUID as the database row, because Laravel generates one ID per recipient before it runs the channels. So the frontend can match a live notification to the row it will later mark as read.

**Broadcast notifications are queued.** Laravel sends them through the queue, even when the notification itself doesn't implement `ShouldQueue`. Without a running worker, nothing reaches the browser, and that's the first thing people get stuck on. Run `php artisan queue:work` (or `queue:listen` locally) alongside Reverb.

If you'd rather push during the request, send the broadcast on the `sync` connection:

```php
return (new BroadcastMessage($data))->onConnection('sync');
```

The trade-off: the request now waits for the HTTP call to Reverb, and if Reverb is down, that request fails. We keep the queue for anything user-facing.

## Authorize the private user channel

Notifications go out on a private channel. By default the name is the model class with dots plus the key, so user 7 gets `App.Models.User.7`. The installer already added the authorization callback to `routes/channels.php`:

```php
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});
```

When Echo subscribes to a private channel, it sends a `POST` to `/broadcasting/auth` with the session cookie. Laravel runs this callback with the signed-in user. Return `true` and Reverb lets the browser join; return `false` and it gets a 403.

The route uses the `web` middleware group by default, which is what an Inertia app wants. If your app has more than one guard, pass them as the third argument: `Broadcast::channel('...', $callback, ['guards' => ['web', 'admin']])`. Our post on [multiple auth guards](/blog/laravel-multiple-auth-guards.html) explains when you'd have that.

## Listen for notifications with Laravel Echo

The Echo packages for Vue, React and Svelte all export a `useEchoNotification` helper. It subscribes to a private channel, calls your callback for every broadcast notification, and leaves the channel when the component unmounts. Its arguments are the channel name, the callback, and optionally a notification type or list of types to filter on.

Put it in the bell component:

```vue
<script setup lang="ts">
import { useEchoNotification } from '@laravel/echo-vue';
import { router, usePage } from '@inertiajs/vue3';

const page = usePage<{ auth: { user: { id: number } } }>();

useEchoNotification(`App.Models.User.${page.props.auth.user.id}`, () => {
    router.reload({ only: ['notifications'] });
});
</script>
```

That's the whole live update. When a notification arrives, we don't patch the count in JavaScript. We ask Inertia for a partial reload of just the shared `notifications` prop. The server recounts unread rows, translates the titles into the user's language, and sends the 8 newest items. The bell re-renders from the same data it uses on a normal page load.

We like this more than building the list from the websocket payload, for three reasons. The payload has translation keys, not text. The count stays correct even if two notifications arrive at once. And there's only one code path that renders the bell. The cost is one small HTTP request per notification, which is nothing.

To react only to some notifications, for example to show a toast for failed payments, pass the type as the third argument:

```ts
useEchoNotification(channel, () => {
    router.reload({ only: ['notifications'] });
    toast.error(__('A payment just failed.'));
}, 'payment-failed');
```

The type you filter on is whatever `broadcastType()` returns, or the full class name when you don't define it.

The React hook has the same shape:

```tsx
import { useEchoNotification } from '@laravel/echo-react';
import { router, usePage } from '@inertiajs/react';

export function useLiveNotifications() {
    const { auth } = usePage<{ auth: { user: { id: number } } }>().props;

    useEchoNotification(`App.Models.User.${auth.user.id}`, () => {
        router.reload({ only: ['notifications'] });
    });
}
```

Only mount the listener for signed-in users. A guest has no channel to join, and the auth request would fail with a 403 on every page.

## Multi-tenant apps: channel names and tenant domains

This is where the default setup becomes a security problem.

With a database per tenant, user IDs are only unique inside one tenant. Tenant A has a user 1, tenant B has a user 1, and maybe your central app has a user 1 too. But Reverb has one channel namespace for the whole application. All three users map to `App.Models.User.1`.

Now follow the auth flow. User 1 of tenant B signs in on tenant B's domain and asks to join `App.Models.User.1`. The callback checks `$user->id === 1`, which is true. The browser joins the channel and receives tenant A's notifications for their user 1. Nothing in the default callback knows about tenants.

The fix is to put the tenant key in the channel name. Override `receivesBroadcastNotificationsOn()` on the `User` model:

```php
public function receivesBroadcastNotificationsOn(): string
{
    return tenant()
        ? 'tenant.'.tenant()->getTenantKey().'.users.'.$this->id
        : 'central.users.'.$this->id;
}
```

Then authorize those names, and check the tenant as well as the user:

```php
// routes/channels.php
Broadcast::channel('tenant.{tenantId}.users.{userId}', function ($user, $tenantId, $userId) {
    return tenant() !== null
        && (string) tenant()->getTenantKey() === (string) $tenantId
        && (int) $user->id === (int) $userId;
});

Broadcast::channel('central.users.{userId}', function ($user, $userId) {
    return tenant() === null && (int) $user->id === (int) $userId;
});
```

Remove the default `App.Models.User.{id}` channel so nobody can still subscribe to it. On the frontend, don't rebuild the name in JavaScript. Share it from `HandleInertiaRequests`, so PHP stays the only place that knows the format:

```php
'notificationChannel' => fn () => $request->user()?->receivesBroadcastNotificationsOn(),
```

```ts
useEchoNotification(page.props.notificationChannel, () => {
    router.reload({ only: ['notifications'] });
});
```

A few more things to check in a tenant app:

- **The auth endpoint runs on the tenant domain.** Echo posts to the relative path `/broadcasting/auth`, so the request goes to the domain the user is on and carries that domain's session cookie. Your tenancy middleware has to run for that route. If tenancy is initialized by a route group, `/broadcasting/auth` (registered in `bootstrap/app.php`) is outside it, `tenant()` is `null`, and the tenant callback rejects everyone. Initialize tenancy globally, or register the broadcast routes inside your tenant middleware.
- **The right guard.** If tenant users sign in with a separate guard, make sure that guard is the default while tenancy is active, or list it in the channel's `guards` option.
- **Allowed origins.** Reverb rejects connections from origins that aren't in `allowed_origins` in `config/reverb.php`. The default is `['*']`. If you lock it down, patterns work, so `'*.yourapp.com'` covers tenant subdomains. If your app also lets tenants bring their own [custom domains](/blog/laravel-tenant-custom-domains.html), each of those needs its own entry.
- **The queue restores the tenant.** The broadcast job runs in a worker, and `receivesBroadcastNotificationsOn()` is called there. With stancl/tenancy's queue bootstrapper the tenant is initialized before the job runs, so `tenant()` works. Without it, every message goes to the `central.users.*` channel. See [queued jobs in a multi-tenant Laravel app](/blog/laravel-multi-tenant-queues.html).

## Running Reverb in production

Reverb is a long-running PHP process, like a queue worker. The [Reverb docs](https://laravel.com/docs/13.x/reverb#production) cover the details; this is the checklist we use.

**Keep it running with Supervisor.**

```ini
[program:reverb]
command=php /var/www/app/artisan reverb:start
autostart=true
autorestart=true
user=forge
redirect_stderr=true
stdout_logfile=/var/www/app/storage/logs/reverb.log
```

Raise `minfds` in the `[supervisord]` section (for example `minfds=10000`). Every websocket connection is an open file, and Supervisor needs to be allowed that many.

**Proxy it through Nginx.** Reverb listens on a private port. Nginx terminates TLS on 443 and passes the upgrade through. A dedicated host like `ws.yourapp.com` keeps this clean:

```nginx
server {
    server_name ws.yourapp.com;
    # listen 443 ssl; certificates ...

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header Scheme $scheme;
        proxy_set_header SERVER_PORT $server_port;
        proxy_set_header REMOTE_ADDR $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";

        proxy_pass http://0.0.0.0:8080;
    }
}
```

Reverb uses `/app` for websocket connections and `/apps` for API calls from Laravel, and both must reach it.

**Get the environment variables right.** `REVERB_SERVER_HOST` and `REVERB_SERVER_PORT` are where Reverb listens (`0.0.0.0` and `8080`). `REVERB_HOST`, `REVERB_PORT` and `REVERB_SCHEME` are the public address Laravel and the browser use (`ws.yourapp.com`, `443`, `https`). Mixing these up is the most common reason for a connection that works locally and fails in production. Remember that the `VITE_REVERB_*` values are compiled into your JavaScript, so rebuild assets after changing them.

**Restart on deploy.** Reverb holds your code in memory. Add `php artisan reverb:restart` to your deploy script next to `queue:restart`. Supervisor starts it again. Our [Laravel SaaS deployment guide](/blog/deploy-laravel-saas.html) has the rest of the deploy steps.

**Plan for more connections.** By default Reverb's event loop uses `stream_select`, which is usually limited to 1,024 open files. Above roughly 1,000 concurrent connections, install the `uv` extension with `pecl install uv` and Reverb switches to it automatically. Raise `ulimit -n` for the user that runs Reverb and Nginx's `worker_connections` too. When one server isn't enough, set `REVERB_SCALING_ENABLED=true`, point every Reverb server at the same Redis, and put them behind a load balancer.

## Mistakes we see with real-time notifications

- **No queue worker.** The database row appears, the browser gets nothing. Broadcasts are queued by default.
- **Default channel names in a multi-tenant app.** `App.Models.User.1` exists in every tenant. Include the tenant key.
- **Building the bell from the websocket payload.** You end up with untranslated keys and a count that drifts. Reload the shared prop instead.
- **Forgetting to rebuild assets.** `VITE_REVERB_*` values are baked in at build time.
- **Listening as a guest.** Every page fires a failing `/broadcasting/auth` request.
- **Reverb not restarted after deploy.** It keeps running old code, including old channel callbacks.

## Frequently asked questions

### Is Laravel Reverb free?

Yes. Reverb is an open source, MIT licensed package, and there's no per-connection or per-message fee. You pay for the server it runs on, or for a managed option such as Laravel Cloud if you don't want to run it yourself.

### Laravel Reverb vs Pusher: which should I use?

Use Reverb if you can run a long-lived process and want flat costs and data on your own servers. Use Pusher if your hosting can't run daemons or you don't want to operate a websocket server. Both use the Pusher protocol and Laravel Echo, so switching is mostly configuration.

### How do I listen for notifications with Laravel Echo?

Subscribe to the notifiable's private channel and use `.notification()`, for example `Echo.private('App.Models.User.' + userId).notification(callback)`. In Vue, React or Svelte, the `useEchoNotification` helper from the matching `@laravel/echo-*` package does the same and cleans up on unmount.

### Why are my broadcast notifications not arriving?

Check four things in order: a queue worker is running, `reverb:start` is running, the `/broadcasting/auth` request returns 200 in the browser's network tab, and the channel name in the browser matches the one Laravel broadcasts on. `reverb:start --debug` shows whether the message reached Reverb at all.

### Does Reverb work with multi-tenant Laravel apps?

Yes, but put the tenant key in the channel name and check the tenant in the channel callback. User IDs repeat across tenant databases, and Reverb channel names are shared by the whole app.

## Real-time notifications in the SaaS Laravel kits

The [SaaS Laravel kits](/) do not ship Reverb or any broadcasting setup. Their in-app notifications use the `database` channel only, and the header bell updates on every Inertia navigation, because `HandleInertiaRequests` shares a `notifications` prop with the unread count and the 8 newest items. That covers most SaaS needs without running a websocket server.

If you want live updates, the kit's structure makes it a small change. Run `php artisan install:broadcasting --reverb`, then add `'broadcast'` to `via()` in `Modules/Notification/Notifications/ActivityNotification.php`, with a `toBroadcast()` method if you want a slimmer payload. Every call to `NotificationService` then broadcasts too. The kits already initialize tenancy in a global middleware that also switches to the `tenant` guard, so `/broadcasting/auth` resolves the tenant from the host. Add the tenant-aware channel names from above, and call `router.reload({ only: ['notifications'] })` from the bell when a notification arrives. The bell components and the shared prop are described in the [Notifications docs](/docs/core/notifications.html).

<BlogPostCta title="Start from a working bell" text="SaaS Laravel ships database notifications, a header bell and a notifications page, so adding Reverb is one channel away." />
