---
title: "Laravel SaaS Emails: Tenant Branding, Queues and Languages"
description: "How to send transactional emails in a multi-tenant Laravel SaaS: branding per tenant, queues, emails in each user's language, deliverability and testing."
pageClass: blog-page
date: 2026-10-28
author: erag
category: saas
tags: [Email, Notifications]
---

# Transactional Emails in a Multi-Tenant Laravel SaaS: Branding, Queues and Languages

<BlogPostMeta />

Your emails are often the first and the last thing a customer sees. The invitation brings them in. The password reset gets them back in. The "your payment failed" email stops them from quietly leaving. In a Laravel SaaS, writing a Mailable is the easy part. The harder part is getting the details right: each customer's own name and logo, emails that don't slow down the page, emails in the reader's language, and emails that land in the inbox instead of spam.

Most guides on Laravel email only cover a single app. This one is about a multi-tenant SaaS, which is what we build our starter kit for.

## The emails a SaaS needs

Start with a list. Most SaaS products need these in the first year:

| Email | When it's sent | Why it matters |
| --- | --- | --- |
| Verify your email | After sign-up | Stops fake accounts and protects your sender reputation |
| Invitation | An admin invites a teammate | The main way new users arrive |
| Password reset | "Forgot password" | People are locked out without it |
| Welcome | First login | Points them to the first useful step |
| Two-factor changes | 2FA turned on or off | A security alert for the account owner |
| Trial ending | A few days before the trial ends | Often the email that converts the most |
| Payment failed | Your billing provider tells you | Saves revenue before the customer churns |
| Workspace suspended | An admin or billing action | Explains what happened and what to do |
| Digest | Daily or weekly | Brings quiet users back |

Laravel handles verification and password reset for you through Fortify. See [email verification in Laravel](/blog/laravel-email-verification.html). The rest you'll write yourself.

## Notifications or Mailables?

Laravel has two ways to send email:

- **Notifications** are about a user, like "you were invited" or "your trial ends soon". The same notification can go out by email and appear in the app at the same time.
- **Mailables** are standalone emails where you control everything: the template, attachments and headers.

For a SaaS we use notifications most of the time, because the same event usually deserves an email and an in-app message. Our post on [database notifications in Laravel](/blog/laravel-database-notifications.html) covers the in-app side.

```php
final class TrialEndingNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $daysLeft) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('billing.trial_ending.subject', ['days' => $this->daysLeft]))
            ->greeting(__('billing.trial_ending.greeting', ['name' => $notifiable->name]))
            ->line(__('billing.trial_ending.body', ['days' => $this->daysLeft]))
            ->action(__('billing.trial_ending.cta'), route('billing.index'));
    }
}
```

## Make the emails look like yours

Laravel's built-in email templates look clean, but they still say "Laravel" until you change them. Copy them into your app once:

```bash
php artisan vendor:publish --tag=laravel-mail
```

The templates land in `resources/views/vendor/mail`. Change the header to your logo, the footer to your address and a link to your help page, and the colours in `html/themes/default.css`. Keep it simple. Email apps still handle HTML like it's 2008, so one column, normal fonts and one clear button work best.

## Each tenant's own name on their emails

This is where a multi-tenant SaaS is different. When Acme invites a new teammate, the email should say "Acme", not the name of your product. And the link inside has to open Acme's own subdomain. Two things make that work.

First, set the app name for the tenant as soon as tenancy starts, so `config('app.name')`, which the email header and footer use, shows the tenant's name:

```php
Event::listen(TenancyInitialized::class, function (TenancyInitialized $event) {
    config(['app.name' => $event->tenancy->tenant->company]);
});
```

Remember to switch it back to your own name when tenancy ends. Otherwise a later central email, sent by the same queue worker, could go out with a customer's name on it.

Second, build every link on the tenant's domain. This matters most for signed links like invitations, so the person lands in the right workspace. See [user invitations with signed URLs](/blog/laravel-user-invitations-signed-urls.html).

## Never send email during the request

Sending an email means talking to a mail server or an API. That can take a second, and sometimes it fails. Add `ShouldQueue` to every notification and Mailable, so the click returns straight away and failed emails are retried by the queue.

Two more things to watch in a SaaS:

- **Wait for the database to save.** If an email depends on something you just saved, make sure the job only runs after the save is committed, with `afterCommit()` or by turning on `after_commit` for your queue connection. Otherwise the worker can pick up the job before the data exists.
- **Keep the right tenant.** Queued emails in a multi-tenant app must run inside the right tenant. We explain how in [multi-tenant queues in Laravel](/blog/laravel-multi-tenant-queues.html).

## Send emails in each user's language

If your app speaks several languages, its emails should too. Add `HasLocalePreference` to your user model, and Laravel sends every notification and Mailable in that person's language automatically:

```php
use Illuminate\Contracts\Translation\HasLocalePreference;

class User extends Authenticatable implements HasLocalePreference
{
    public function preferredLocale(): ?string
    {
        return $this->locale;
    }
}
```

Use translation keys for every subject, line and button, never plain English. More on this in [saving a user's language preference](/blog/laravel-user-language-preference.html) and [building a multilingual SaaS with Laravel](/blog/multilingual-saas-laravel.html).

## Getting into the inbox

A beautiful email is useless in the spam folder. These are the basics:

- Use a proper email service like Postmark, Amazon SES, Resend or Mailgun, not your web server.
- Set up SPF, DKIM and DMARC for your sending domain. Every email service walks you through it.
- Send from a real address on your own domain, like `hello@your-saas.com`, and actually read the replies.
- Keep marketing emails separate from transactional ones, ideally on a subdomain or even a different provider, so a newsletter complaint never hurts your password resets. Laravel's mail config lets you set up more than one mailer for exactly this.
- Add an unsubscribe link to anything that isn't strictly needed, like digests.

## Check your emails before customers do

- Look at them in the browser. Return a notification's `toMail()` result or a Mailable from a route that only works locally, and Laravel shows it as a web page.
- Catch every email locally with a tool like Mailpit or Mailtrap, or the `log` mailer, so nothing reaches real people while you test.
- Write tests that check who gets what:

```php
it('emails tenant admins when the trial is about to end', function () {
    Notification::fake();

    app(TrialService::class)->notifyEndingTrials();

    Notification::assertSentTo($this->admin, TrialEndingNotification::class);
});
```

## Frequently asked questions

### What is a transactional email?

An email that's sent because of something the user did, or something that happened to their account: a sign-up, an invitation, a password reset or a failed payment. People expect these, unlike marketing emails.

### Should a Laravel SaaS use notifications or Mailables?

Notifications, most of the time, because one notification can send an email and show an in-app message at once. Use a Mailable when you need full control over the template, attachments or headers.

### How do I show each tenant's name on their emails?

Set `app.name`, and your logo URL if you have one, when tenancy starts. Build links on the tenant's domain, and switch the values back when tenancy ends.

### Why are my Laravel emails going to spam?

Usually because SPF, DKIM or DMARC isn't set up, or because email is sent straight from the web server. Fix the DNS records first, then look at your content.

## Emails in the SaaS Laravel starter kit

[SaaS Laravel](/) already sends the emails a multi-tenant SaaS needs on day one:
- Email verification and password reset through Fortify.
- Invitation emails for tenant admins and for users, sent through the queue with signed links that expire.

Each domain can have its own app name, which shows up in the sidebar, on the sign-in pages and in emails. The in-app notification system is ready for every new email you add.

<BlogPostCta title="The emails your SaaS needs, already sending" text="SaaS Laravel ships with verification, password reset and queued, signed invitation emails, plus in-app notifications, in Vue, React or Svelte." />
