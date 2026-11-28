---
title: "Build an Invoicing SaaS with Laravel"
description: "Plan a multi-tenant invoicing SaaS in Laravel: clients and invoices per business, gap-free numbering, tax snapshots, reminders and a build plan."
breadcrumb: "Invoicing SaaS with Laravel"
sidebar: false
editLink: false
howTo:
  name: "Build an invoicing SaaS on the SaaS Laravel kit"
  steps:
    - name: "Create a test business as a tenant"
      text: "Install the kit and create a tenant for one business with its own subdomain and database."
      anchor: "a-build-plan-for-an-invoicing-saas"
    - name: "Add clients, items and tax rates"
      text: "Create an Invoicing module with clients, products or services, and tax rates stored per tenant."
    - name: "Issue invoices with gap-free numbers"
      text: "Keep drafts unnumbered, and give an invoice its number from a locked counter only when it is issued."
    - name: "Snapshot everything on the invoice"
      text: "Copy client details, prices and tax rates onto the invoice lines so later edits can't change a sent invoice."
    - name: "Send invoices and reminders"
      text: "Email a signed link to the invoice, and queue reminders before and after the due date."
    - name: "Take payments and add billing"
      text: "Record payments against invoices, and separately bill the business for your SaaS plan."
---

# Build an Invoicing SaaS with Laravel

This page is for developers who want to build invoicing software that many small businesses use to bill their own clients. It covers the modules, how a business's staff map to roles, what each business owns, the rules invoices must follow, and a build plan on the [SaaS Laravel](/blog/laravel-saas-starter-kit.html) kit.

Be clear about two kinds of billing from the start. Your tenants use your product to invoice their clients. Separately, you charge your tenants for the product. They share a word and nothing else.

## The modules an invoicing SaaS needs

- **Clients**: who gets invoiced, with billing address, tax number and default currency.
- **Items**: products and services with a price and a tax rate.
- **Invoices**: drafts, issued invoices, credit notes and their lines.
- **Taxes**: rates and rules per business, such as VAT or GST.
- **Payments**: what was paid, how and when, including part payments.
- **Reminders**: emails before the due date and after it.
- **Quotes** (optional): estimates that turn into invoices when accepted.

Clients, Items, Invoices and Payments make a first release. Quotes and recurring invoices can follow.

## A business's staff as tenant roles

| Person | Kit role | What they do |
| --- | --- | --- |
| Business owner | Super Admin | Everything, including tax settings and numbering |
| Accountant or bookkeeper | Custom role: Accountant | Issue invoices, record payments, run reports |
| Office staff | Employee | Create drafts and manage clients |
| Outside accountant | Custom role, read-only | See invoices and payments, export for the books |

Issuing an invoice is the moment it becomes a record you can't take back, so give it its own permission, such as "Issue Invoices". Office staff can prepare drafts all day, and the owner or accountant issues them.

Clients of the business usually don't sign in at all. They get an email with a signed link to view and pay the invoice.

## What each business owns and what is central

| Tenant database (one per business) | Central database |
| --- | --- |
| Clients, items, tax rates | The business as a tenant, with its status |
| Invoices, lines, credit notes | Its subdomain |
| Payments received from clients | What the business pays you, once you add billing |
| Number counters per series | Your support staff accounts |
| The business's users, roles and menus | Maintenance mode for all workspaces |

When an accountant asks for every invoice a business issued since 2024, you can export one database and know nothing from another business is in it.

<PricingBlock />

## Invoice numbers without gaps

Tax offices in many countries expect invoice numbers in an unbroken sequence. Database auto-increment IDs don't give you that. A rolled-back transaction skips a number, and drafts that get deleted leave holes.

Two rules fix it. Drafts don't get a number. An invoice gets its number only when it's issued, from a counter row that you lock inside the same transaction:

```php
public function issue(Invoice $invoice): Invoice
{
    return DB::transaction(function () use ($invoice) {
        $series = NumberSeries::query()
            ->where('key', 'invoice')
            ->lockForUpdate()
            ->firstOrFail();

        $series->increment('next_number');

        $invoice->update([
            'number' => $series->prefix.str_pad((string) ($series->next_number - 1), 5, '0', STR_PAD_LEFT),
            'issued_at' => now(),
            'status' => 'issued',
        ]);

        return $invoice;
    });
}
```

The lock makes two people issuing invoices at the same moment wait for each other, so each gets the next number. The counter lives in the tenant database, so every business has its own sequence starting at its own first number.

Once issued, an invoice isn't deleted. A mistake is fixed with a credit note that has its own number series.

## Snapshot everything on the invoice

An invoice is a record of what was agreed on the day it was issued. If the client later changes address, or you change a product's price, last month's invoice must still show the old values.

Copy the client's name, address and tax number onto the invoice when you issue it. Copy the item's description, price and tax rate onto each line. Never compute a sent invoice's total from today's tables. The same goes for currency: store the currency on the invoice, and store amounts as integers in the smallest unit, such as cents, never as floats.

## The other tricky parts

### Tax rules differ by country

VAT, GST and sales tax work differently, and some businesses must show tax per line, others per rate. Start with the rules of the countries you sell to and keep tax rates as data per tenant. Store the rate used on every line, so a rate change next year doesn't change old invoices. If you want to be sure, have an accountant in your first market review the invoice layout.

### Reminders at the right time

"Due in 3 days" and "7 days overdue" reminders need a scheduled command that loops over tenants with `tenants:run`, finds invoices that need one and queues the emails. Record each reminder sent, so a rerun of the command doesn't send the same reminder twice.

### Clients paying online

If businesses want a "Pay now" button, each business needs its own account with a payment provider, because the money is theirs, not yours. That's a different setup from charging your tenants for the SaaS. Payment providers usually offer a "connected accounts" product for platforms. Decide early whether you need it, because it changes onboarding.

### PDF output

Clients expect a PDF. Render it in a queued job when the invoice is issued and store it, so the PDF a client downloads next year is the one that was sent.

## A build plan for an invoicing SaaS

<DocSteps>

### 1. Create a test business

Install the kit, create a tenant for one business and sign in on its subdomain.

### 2. Add clients, items and tax rates

Build an Invoicing module with tenant migrations for each.

### 3. Issue invoices with gap-free numbers

Keep drafts unnumbered and number them from a locked counter when they're issued.

### 4. Snapshot the invoice

Copy client details, prices and tax rates onto the invoice and its lines.

### 5. Send invoices and reminders

Email a signed link, render the PDF in a queued job and schedule reminders per tenant.

### 6. Record payments, then bill the business

Record client payments inside the tenant. Separately, add a payment provider so each business pays you for its plan.

</DocSteps>

<NextStep
  title="Start with the invoice rules, not the tenant setup"
  text="Each business gets its own database, subdomain, users and roles. You start with clients, invoices and numbering."
  secondaryText="Read the service layer guide"
  secondaryLink="/blog/laravel-service-layer-pattern.html"
/>
