---
title: "In-App Notifications for Laravel SaaS"
description: "Database notifications with a header bell, unread badge and a notifications page, a notification when an invited user joins, and one service call to send your own."
---

# Notifications

Every kit ships in-app notifications. They're stored with Laravel's database notifications, so the central app and every tenant keep their own list. Users see them in the header bell and on the Notifications page.

| | |
| --- | --- |
| Module | `Modules/Notification` |
| Storage | `notifications` table in the central database and in every tenant database |
| Header | Bell with unread badge, language switcher and profile menu, next to the breadcrumbs |
| Page | `/notifications` with All / Unread filters, mark as read, delete and clear all |
| Default notification | Super admins are told when an invited user accepts the invitation |
| Send your own | `NotificationService` (one call) |
| Translations | `lang/<locale>/modules/notification.php` in all 17 languages |

## What users see

### Header bell

The bell sits on the right of the breadcrumb bar in the sidebar layout, and next to the avatar in the header layout.

- The red badge shows the unread count, capped at `99+`.
- The panel lists the 8 newest notifications. Each one has an icon coloured by its level, a title, a short message, the time ("2 minutes ago") and a blue dot while it's unread.
- Clicking a notification marks it as read and opens its link. A notification without a link is just marked as read.
- **Mark all as read** shows only while something is unread. **View all notifications** opens the Notifications page.

### Language switcher and profile menu

They sit next to the bell, so users can change their language or open their settings from any page.

- **Language switcher**: the same list as the language submenu in the user menu, including "Default (English)". Both use one shared component.
- **Profile menu**: the avatar opens the usual user menu (settings and log out). The header layout already had an avatar, so it isn't added twice.

### Notifications page

`/notifications` lists every notification, newest first, 15 per page.

- **All / Unread** tabs. The filter is kept in the URL (`?filter=unread`), so it survives a refresh.
- **Mark as read** and **Delete** on every row.
- **Mark all as read**, and **Clear all** with a confirmation dialog.
- An empty state when there's nothing to show.

Every user only ever sees and changes their own notifications.

## Default notification

One notification is sent out of the box:

| When | Who gets it | Example | Link |
| --- | --- | --- | --- |
| An invited user opens the invitation link and sets a password | Every super admin in the same context (central app or that tenant) | **Invitation accepted**: "Jane accepted the invitation and joined." | Users page |

It's sent from `Modules/User/Http/Controllers/UserInvitationController.php`. Remove that call if you don't want it, or copy it as an example for your own notifications.

## Send your own notification

Inject `NotificationService` and call one of its methods. That's all you need. The bell and the page pick the notification up on the next page load.

```php
use Modules\Notification\Enums\NotificationLevelEnum;
use Modules\Notification\Services\NotificationService;

class InvoiceService
{
    public function __construct(
        protected NotificationService $notificationService,
    ) {}

    public function send(Invoice $invoice): void
    {
        // ...

        $this->notificationService->sendToCurrentUser(
            'modules/billing.notifications.invoice_sent.title',
            'modules/billing.notifications.invoice_sent.message',
            route('invoices.show', $invoice, false),
            'mail',
            NotificationLevelEnum::Success,
            ['number' => $invoice->number],
        );
    }
}
```

### Methods

| Method | Sends to |
| --- | --- |
| `send($users, ...)` | One user or a collection of users |
| `sendToCurrentUser(...)` | The signed-in user. Does nothing when nobody is signed in (queues, seeders, console) |
| `sendToSuperAdmins(...)` | Every super admin in the current context (the central app, or the current tenant) |

```php
$this->notificationService->send($user, 'Report ready');

$this->notificationService->send(User::role('manager')->get(), 'Weekly summary', 'Your team closed 12 tasks.');

$this->notificationService->sendToSuperAdmins('New sign-up', ':name created an account.', '/users', 'user-plus', NotificationLevelEnum::Info, ['name' => $user->name]);
```

### Arguments

All three methods take the same arguments after the recipients:

| Argument | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | string | — | Translation key or plain text |
| `message` | ?string | `null` | Translation key or plain text, shown under the title |
| `url` | ?string | `null` | Where the notification leads when clicked |
| `icon` | string | `'bell'` | Icon name, see below |
| `level` | `NotificationLevelEnum` | `Info` | Colour of the icon: `Info`, `Success`, `Warning`, `Danger` |
| `params` | array | `[]` | Values for placeholders like `:name` in the title and message |

::: tip Use relative URLs
Pass `route('name', $params, false)` or `route('name', absolute: false)`. A relative URL works on the central domain and on every tenant domain.
:::

### Translations

Titles and messages are translated **when the notification is shown**, not when it's sent. A user who switches language sees their old notifications in the new language too.

1. Add the keys to every `lang/<locale>/modules/*.php` file you use, for example `lang/en/modules/billing.php`:

   ```php
   'notifications' => [
       'invoice_sent' => [
           'title' => 'Invoice sent',
           'message' => 'Invoice :number was emailed to the customer.',
       ],
   ],
   ```

2. Pass the full key (`modules/billing.notifications.invoice_sent.title`) as the title. Plain text works too, but it won't be translated.

The kit's own texts (bell, page, buttons) live in `lang/<locale>/modules/notification.php`. After changing any translation file, run `php artisan erag:generate-lang` so the frontend gets the new strings.

### Icons

Built-in icon names: `bell`, `building`, `trash`, `user-plus`, `user-minus`, `user-check`, `mail`, `shield` and `key`. An unknown name falls back to the bell.

To add an icon, add it to the icon map in your kit:

| Kit | File |
| --- | --- |
| Vue | `resources/js/components/notifications/NotificationIcon.vue` |
| React | `resources/js/components/notification-item.tsx` |
| Svelte | `resources/js/lib/notifications.ts` |

## How it works

| Piece | File |
| --- | --- |
| Notification class (database channel) | `Modules/Notification/Notifications/ActivityNotification.php` |
| Service | `Modules/Notification/Services/NotificationService.php` |
| Data sent to the frontend | `Modules/Notification/Data/NotificationData.php` |
| Levels | `Modules/Notification/Enums/NotificationLevelEnum.php` |
| Controller and routes | `Modules/Notification/Http/Controllers/NotificationController.php`, `Modules/Notification/routes/web.php` |
| Migrations | `database/migrations/…_create_notifications_table.php` and `database/migrations/tenant/…_create_tenant_notifications_table.php` |

- `HandleInertiaRequests` shares a `notifications` prop on every page: the unread count and the 8 newest notifications. The bell reads it, so it updates on every navigation.
- The Notifications page receives its paginated list as `items`, so it never overwrites the shared prop.
- Notifications are stored synchronously with the database channel. You don't need a queue worker to see them.
- In a tenant, the database connection points at the tenant database, so tenant users get tenant notifications and central users get central ones.

### Frontend files

| | Vue | React | Svelte |
| --- | --- | --- | --- |
| Bell | `components/notifications/NotificationBell.vue` | `components/notification-bell.tsx` | `components/NotificationBell.svelte` |
| Item | `components/notifications/NotificationItem.vue` | `components/notification-item.tsx` | `components/NotificationItemContent.svelte` |
| Actions (open, read, delete) | `composables/useNotifications.ts` | `hooks/use-notifications.ts` | `lib/notifications.ts` |
| Header actions | `components/AppHeaderActions.vue` | `components/header-actions.tsx` | `components/HeaderActions.svelte` |
| Language switcher | `components/LanguageSwitcher.vue` | `components/language-switcher.tsx` | `components/LanguageSwitcher.svelte` |
| Page | `pages/notifications/Index.vue` | `pages/notifications/index.tsx` | `pages/notifications/Index.svelte` |

All paths are under `resources/js/`.

## Routes

| Method | URL | Name | What it does |
| --- | --- | --- | --- |
| GET | `/notifications` | `notifications.index` | The Notifications page (`?filter=unread` for unread only) |
| PATCH | `/notifications/{id}/read` | `notifications.read` | Mark one as read. Send `visit=1` to be redirected to its link |
| POST | `/notifications/read-all` | `notifications.read-all` | Mark all as read |
| DELETE | `/notifications/{id}` | `notifications.destroy` | Delete one |
| DELETE | `/notifications` | `notifications.clear` | Delete all |

All routes need a signed-in, verified user, and they only touch that user's own notifications.

## Clean up old notifications

Notifications stay until the user deletes them. To prune old ones, schedule a command in `routes/console.php`:

```php
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Schedule;

Schedule::call(fn () => DatabaseNotification::query()
    ->where('created_at', '<', now()->subDays(90))
    ->delete()
)->daily();
```

This prunes the central database. For tenants, run the same query inside `tenancy()->runForMultiple()` or a tenant-aware command.

## After updating

Run the new migrations for the central database and every tenant, and reinstall the frontend packages:

```bash
npm install
php artisan migrate
php artisan tenants:migrate
```
