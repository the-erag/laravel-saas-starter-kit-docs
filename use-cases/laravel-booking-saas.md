---
title: "Build a Booking and Appointment SaaS with Laravel"
description: "Build a multi-tenant booking and appointment SaaS in Laravel: services, staff calendars, time zones, double-booking rules, reminders and a build plan."
breadcrumb: "Booking SaaS with Laravel"
sidebar: false
editLink: false
howTo:
  name: "Build a booking and appointment SaaS on the SaaS Laravel kit"
  steps:
    - name: "Create a test business as a tenant"
      text: "Install the kit and create a tenant for one salon or clinic, with its own subdomain and database."
      anchor: "a-build-plan-for-a-booking-saas"
    - name: "Store the business time zone"
      text: "Add a time zone to each tenant and store every appointment time in UTC."
    - name: "Add services, staff and opening hours"
      text: "Create a Booking module with services, staff members, weekly hours and days off."
    - name: "Compute free slots and block double bookings"
      text: "Generate slots from hours minus existing appointments, and enforce one appointment per staff member per slot in the database."
    - name: "Add the public booking page"
      text: "Add a tenant route that guests can open without signing in, with rate limiting."
    - name: "Send reminders and add billing"
      text: "Queue reminder emails at the right local time, then add a payment provider for the business."
---

# Build a Booking and Appointment SaaS with Laravel

This page helps you plan a booking product that many businesses use at once: salons, clinics, tutors, repair shops. It covers the modules, how staff and customers map to roles, which data each business owns, the two problems that sink most booking apps (time zones and double bookings), and a build plan on the [SaaS Laravel](/blog/laravel-saas-starter-kit.html) kit.

Each business becomes a tenant with its own database and its own address, such as `glow-salon.your-booking.com`. Its customers book on that address.

## The modules a booking SaaS needs

A booking app looks simple from the outside: pick a service, pick a time, done. Behind that sit a handful of modules:

- **Services**: what can be booked, with a duration, a buffer after it and a price.
- **Staff**: who does the work, which services each person offers, and their hours.
- **Availability**: weekly opening hours, breaks, days off and holidays.
- **Appointments**: the bookings themselves, with a status such as booked, cancelled or no-show.
- **Booking page**: the public page where customers choose a slot.
- **Reminders**: emails or messages before the appointment.

We'd build Services, Staff and Availability first, because slots can't exist without them.

## Staff and customers as tenant roles

Every tenant comes with five system roles. A booking business uses them like this:

| Person | Kit role | What they do |
| --- | --- | --- |
| Business owner | Super Admin | Everything in the workspace |
| Front desk or manager | Admin or Manager | Every calendar, bookings for walk-ins, cancellations |
| Stylist, doctor or tutor | Employee | Their own calendar and their own appointments |
| Regular customer with an account | User | Their own upcoming and past bookings |

Many customers will never create an account. They book as guests with a name, an email and a phone number. Store them as customer records in the tenant database, separate from the `users` table. Only invite them to sign in if your product needs it, for example to rebook in one click.

## What each business owns and what is central

| Tenant database (one per business) | Central database |
| --- | --- |
| Services, prices, durations | The business as a tenant, with its status |
| Staff profiles, hours, days off | Its subdomain |
| Appointments and their history | Your plans and subscriptions, once you add billing |
| Customer records and notes | Your own admin accounts |
| Reminder settings and templates | Maintenance mode for all workspaces |

<PricingBlock />

## Time zones: the first thing to get right

The kit runs in UTC and has no time zone setting for tenants or users. A booking app needs one, so add it before you write any appointment code.

Store the business's time zone on the tenant. The tenant model keeps extra attributes in a JSON `data` column, so `$tenant->timezone = 'Europe/London'` works without a migration. Then follow two rules:

1. Store every appointment's start and end in UTC.
2. Convert to the business's time zone only when you show a time or build slots.

A slot at "9:00 on Saturday" must be built from the business's local calendar, then converted to UTC for storage. If you build slots in UTC and convert afterwards, the week the clocks change will shift every slot by an hour. That's when customers turn up at a closed shop.

Customers in another time zone add a second question. A tutor in Berlin and a student in New York see the same lesson at different clock times. Show the time in the business's zone on the booking page and label it, for example "10:00 (Berlin time)". Add the customer's local time next to it if you know it.

## Double bookings: let the database say no

Two customers open the booking page and both pick 10:00 with the same stylist. Checking "is this slot free?" in PHP and then inserting isn't enough. Both requests pass the check before either one saves.

The safest fix is a rule the database enforces. If your slots have fixed start times, a unique index does the job:

```php
// database/migrations/tenant/2026_11_27_000001_create_appointments_table.php
Schema::create('appointments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('staff_id')->constrained();
    $table->foreignId('service_id')->constrained();
    $table->dateTime('starts_at');
    $table->dateTime('ends_at');
    $table->string('status')->default('booked');
    $table->unique(['staff_id', 'starts_at']);
});
```

The second insert then fails, and you catch the error and show "That time was just taken, pick another".

When services have different lengths, a unique index can't see overlaps. Then lock the staff member's row inside a transaction, check for overlapping appointments and insert in the same transaction:

```php
DB::transaction(function () use ($staff, $startsAt, $endsAt, $data) {
    Staff::query()->whereKey($staff->id)->lockForUpdate()->first();

    $taken = Appointment::query()
        ->where('staff_id', $staff->id)
        ->where('status', 'booked')
        ->where('starts_at', '<', $endsAt)
        ->where('ends_at', '>', $startsAt)
        ->exists();

    abort_if($taken, 409, 'That time was just taken.');

    return Appointment::query()->create($data);
});
```

Keep cancelled appointments out of the overlap check, or a cancellation will block the slot forever.

## The other tricky parts

### A public page on a tenant domain

The booking page has to work for guests, without signing in. Add it as a tenant route outside the `auth` middleware. Rate-limit it, because a public form that writes to the database attracts bots.

### Reminders at the right local time

"Remind me the evening before" means 18:00 in the business's time zone. Run a scheduled command every few minutes that goes through tenants with `tenants:run`, finds appointments due for a reminder and queues the emails. The kit's queue setup brings the tenant along with each job, so the email is sent with the right business name and data.

### Buffers and travel time

A 45-minute haircut often needs 15 minutes to clean up. A mobile repair person needs time to drive. Store a buffer on the service and add it to the end time when you check overlaps, not when you show the slot to the customer.

## A build plan for a booking SaaS

<DocSteps>

### 1. Create a test business

Install the kit and create a tenant for one salon. Sign in on its subdomain as the owner.

### 2. Add the time zone

Store a time zone on each tenant and add a select for it to the tenant form. Store all times in UTC from the first migration.

### 3. Add services, staff and hours

Build a Booking module with tenant migrations for services, staff, weekly hours and days off.

### 4. Generate slots and stop double bookings

Build free slots from hours minus booked appointments, and add the unique index or the locking transaction above.

### 5. Add the public booking page

Add a guest tenant route with rate limiting and a confirmation email.

### 6. Queue reminders, then add billing

Schedule reminders per tenant, then add a payment provider so each business pays for its plan.

</DocSteps>

## Converting Booking Core instead

If you were planning to start from Booking Core on CodeCanyon, read [Convert Booking Core to a multi-tenant SaaS](/blog/convert-booking-core-to-saas.html). It explains what its license allows and why its vendors aren't the same thing as your tenants.

<NextStep
  title="Start with the booking rules, not the login screens"
  text="Tenants, separate databases, staff accounts, roles and queued emails are already set up. You start with services, slots and the booking page."
  secondaryText="See how tenant queues work"
  secondaryLink="/blog/laravel-multi-tenant-queues.html"
/>
