---
title: "Build a Helpdesk SaaS with Laravel"
description: "Plan a multi-tenant helpdesk SaaS in Laravel: tickets per company, agent roles, routing inbound email to the right tenant, SLAs and a build plan."
breadcrumb: "Helpdesk SaaS with Laravel"
sidebar: false
editLink: false
howTo:
  name: "Build a helpdesk SaaS on the SaaS Laravel kit"
  steps:
    - name: "Create a test company as a tenant"
      text: "Install the kit and create a tenant for one support team with its own subdomain and database."
      anchor: "a-build-plan-for-a-helpdesk-saas"
    - name: "Add tickets and replies"
      text: "Create a Helpdesk module with tickets, messages, statuses and per-tenant ticket numbers."
    - name: "Route inbound email to the right tenant"
      text: "Give each tenant a unique inbound address, receive mail on a central webhook, look up the tenant and create the ticket inside it."
    - name: "Add agent roles, groups and assignment"
      text: "Map agents to tenant roles, add groups, and assign tickets with a lock to stop two agents taking the same one."
    - name: "Add SLAs and a customer portal"
      text: "Track first-response and resolution times in the company's business hours, and let customers view their tickets through signed links."
    - name: "Add billing"
      text: "Add a payment provider and bill each company per agent seat."
---

# Build a Helpdesk SaaS with Laravel

This page helps you plan a support desk that many companies use for their own customers. It covers the modules, how agents and end customers map to roles, which data belongs to each company, how to route incoming email to the right tenant, and a build plan on the [SaaS Laravel](/blog/laravel-saas-starter-kit.html) kit.

A helpdesk has two kinds of outsiders. Your tenants are the companies that buy the product. Their customers are the people who send in questions. Keeping those apart in your head is half the design.

## The modules a helpdesk SaaS needs

- **Tickets**: a subject, a status, a priority, a requester and an assignee.
- **Messages**: the replies and internal notes on each ticket.
- **Inbound email**: turning an email into a new ticket or a reply on an old one.
- **Assignment**: groups such as Billing or Technical, and rules for who gets what.
- **SLAs**: targets for first response and resolution, and alerts before they're missed.
- **Customer portal**: where the person who asked can see and reply to their tickets.
- **Saved replies and a knowledge base**: answers agents reuse, and articles customers read.

The first release needs Tickets, Messages, Inbound email and Assignment. A team can work with those while you add SLAs.

## Agents and customers as tenant roles

| Person | Kit role | What they do |
| --- | --- | --- |
| Head of support | Super Admin | Everything in the workspace |
| Team lead | Admin or Manager | Groups, assignment rules, SLA targets, every ticket |
| Support agent | Employee | Tickets in their groups, replies and notes |
| Light agent, such as someone in finance | Custom role | Reads tickets and adds internal notes, can't reply to customers |
| The company's customer | Not a user | A contact record, reached through signed links |

We'd keep end customers out of the `users` table at first. They don't need passwords to follow one ticket. Send them a signed link to the ticket, the same kind of link the kit uses for invitations. If you add a full portal later, give them their own role with only portal permissions.

Internal notes need care. An agent must never send one to the customer by mistake. Store notes as messages with a visibility flag, and make the customer-facing views and emails filter on it in the service, in one place.

## What each company owns and what is central

| Tenant database (one per company) | Central database |
| --- | --- |
| Tickets, messages, internal notes | The company as a tenant, with its status |
| Contacts who send tickets | Its subdomain |
| Groups, assignment rules, SLA targets | The map from inbound address to tenant |
| Saved replies and knowledge base articles | Your plans and agent-seat billing, once you add it |
| The company's agents, roles and menus | Maintenance mode for all workspaces |

The inbound address map is the one piece of routing data that has to be central. Mail arrives before you know which tenant it belongs to, so you need somewhere to look that up.

<PricingBlock />

## Routing inbound email to the right tenant

Most mail providers can receive email for your domain and POST it to a webhook. That webhook arrives on your central domain, not on a tenant subdomain, so it runs outside any tenant. Give each company a unique address, look the address up centrally, then switch into that tenant to create the ticket:

```php
public function receive(InboundEmail $email): void
{
    $mailbox = Mailbox::query()->where('address', $email->recipient())->firstOrFail();

    $mailbox->tenant->run(function () use ($email) {
        $this->tickets->createFromEmail($email);
    });
}
```

`Mailbox` here is a central model, and `$tenant->run()` runs the callback against that tenant's database. Inside it, `createFromEmail()` decides between a new ticket and a reply, usually from a ticket number in the subject or a reference header.

Two more things to plan for. Verify the provider's webhook signature, because this endpoint is public. And queue the work after you've saved the raw email, so a slow parse doesn't make the provider retry and create a duplicate ticket.

## The other tricky parts

### Two agents answering the same ticket

Both open the ticket, both type, both send. The customer gets two answers. When an agent opens a ticket, record who is viewing it and show a warning to the second agent. When an agent takes a ticket, assign it with a conditional update, `where('assignee_id', null)`, so only one of them wins.

### Ticket numbers per company

Customers quote ticket numbers on the phone. Each company expects its own sequence starting at 1, not your global ID. A counter row in the tenant database, incremented inside the transaction that creates the ticket, gives each company a clean sequence.

### SLA clocks and business hours

"Reply within 4 hours" usually means 4 working hours in the company's time zone. The kit runs in UTC and doesn't store a time zone per tenant, so add one. The kit does store each tenant's work week (Monday to Friday, Monday to Saturday or Sunday to Thursday), which gives you the working days. Compute due times in the company's zone and store them in UTC.

### Attachments

Customers send screenshots and logs. The kit has no upload feature, but it does suffix the `local` and `public` disks per tenant, so files from one company land in a different folder from another's. For production, use object storage with a prefix per tenant, and scan or limit file types.

## A build plan for a helpdesk SaaS

<DocSteps>

### 1. Create a test company

Install the kit, create a tenant for one support team and sign in on its subdomain.

### 2. Add tickets and replies

Build a Helpdesk module with tickets, messages, statuses and per-tenant ticket numbers.

### 3. Route inbound email

Add a central mailbox map and a webhook that creates tickets inside the right tenant.

### 4. Add groups and assignment

Map agents to roles, add groups, and assign with a conditional update.

### 5. Add SLAs and the customer portal

Store each company's time zone, compute due times in business hours, and send customers signed links to their tickets.

### 6. Add billing

Add a payment provider and charge each company per agent seat. Our [per-seat billing guide](/blog/laravel-cashier-per-seat-billing.html) shows the Stripe side.

</DocSteps>

<NextStep
  title="Build the inbox, not the account system"
  text="Each company gets its own database, subdomain, agents and roles. You start with tickets and inbound email."
  secondaryText="See how invitations and signed links work"
  secondaryLink="/blog/laravel-user-invitations-signed-urls.html"
/>
