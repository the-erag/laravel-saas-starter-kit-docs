---
title: "Build a POS and Inventory SaaS with Laravel"
description: "Plan a multi-tenant POS and inventory SaaS in Laravel: stores and stock per tenant, cashier roles, safe stock updates under load and a build plan."
breadcrumb: "POS and inventory SaaS with Laravel"
sidebar: false
editLink: false
howTo:
  name: "Build a POS and inventory SaaS on the SaaS Laravel kit"
  steps:
    - name: "Create a test shop as a tenant"
      text: "Install the kit and create a tenant for one retailer with its own subdomain and database."
      anchor: "a-build-plan-for-a-pos-saas"
    - name: "Add products and locations"
      text: "Create a Catalog module with products, variants, barcodes and one or more stock locations."
    - name: "Record stock as movements"
      text: "Write every stock change as a movement row and keep a per-location balance updated in the same transaction."
    - name: "Build the sale screen"
      text: "Scan items, take payment, and decrement stock with a conditional update so stock never goes below zero by accident."
    - name: "Add shifts, refunds and receipts"
      text: "Open and close cash shifts, number receipts per location, and record refunds as reverse movements."
    - name: "Add reports and billing"
      text: "Build daily sales and stock reports, then add a payment provider for the retailer's plan."
---

# Build a POS and Inventory SaaS with Laravel

This page is for developers planning a point-of-sale and stock product that many shops use at once. You'll see which modules to build, how cashiers and managers map to roles, what each shop owns, why stock numbers go wrong under load and how to stop it, and a build plan on the [SaaS Laravel](/blog/laravel-saas-starter-kit.html) kit.

Each retailer becomes a tenant with its own database. A shop with three branches is still one tenant, with three locations inside it.

## The modules a POS and inventory SaaS needs

- **Catalog**: products, variants such as size and colour, barcodes, prices and tax classes.
- **Locations**: shops and warehouses, each with its own stock.
- **Stock**: purchases in, sales out, transfers between locations and manual counts.
- **Sales**: the till screen, carts, discounts, payments and receipts.
- **Shifts**: opening float, cash in and out, and the end-of-day count.
- **Suppliers and purchase orders**: what you ordered, what arrived.
- **Reports**: sales by day, by product and by cashier, and stock value.

Catalog, Locations, Stock and Sales are the minimum a shop needs to trade. Purchase orders can wait for the second release.

## Cashiers, managers and owners as tenant roles

| Person | Kit role | What they do |
| --- | --- | --- |
| Shop owner | Super Admin | Everything, across every location |
| Area or store manager | Admin or Manager | Prices, stock counts, refunds, reports |
| Stock clerk | Employee, or a custom Stock role | Receive deliveries, count and transfer stock |
| Cashier | Custom role: Cashier | Sell, open and close their own shift |

Refunds and price overrides are where money leaves the till. Give each its own permission, such as "Approve Refund", and keep it off the Cashier role. A manager can still grant it to one senior cashier, because the kit assigns permissions directly to users as well as through roles.

Many shops also limit staff to one location. Store which locations a user may work in, and check it in the service, the same way you check permissions.

## What each shop owns and what is central

| Tenant database (one per retailer) | Central database |
| --- | --- |
| Products, variants, barcodes, prices | The retailer as a tenant, with its status |
| Locations and stock balances | Its subdomain |
| Stock movements, sales, payments, refunds | Your plans and subscriptions, once you add billing |
| Shifts and cash counts | Your support staff accounts |
| The shop's users, roles and menus | Maintenance mode for all workspaces |

A separate database per retailer also keeps a large chain's millions of sales rows from slowing down a corner shop. Each shop's queries only ever read its own tables.

<PricingBlock />

## Stock concurrency: why numbers drift and how to stop it

Picture two tills selling the last bottle of the same perfume at the same moment. Both read "stock: 1", both subtract one, both save "0". You sold two bottles, and the system says you had one. Or worse, an online order and a till sale both take the last item.

The fix is to let the database do the subtraction and the check in one statement:

```php
public function takeStock(int $variantId, int $locationId, int $quantity): void
{
    $updated = StockLevel::query()
        ->where('variant_id', $variantId)
        ->where('location_id', $locationId)
        ->where('on_hand', '>=', $quantity)
        ->decrement('on_hand', $quantity);

    if ($updated === 0) {
        throw new OutOfStockException($variantId, $locationId);
    }
}
```

The `where('on_hand', '>=', $quantity)` and the decrement run as one `UPDATE`. If another till got there first, zero rows change and you know straight away. Run it in the same `DB::transaction` that saves the sale, so a failed payment doesn't leave stock taken.

Some shops are happy to sell below zero and fix it at the next count. Make that a per-tenant setting. Then skip the `>=` check but still use the database decrement, so the number stays right.

## Keep a movement for every change

Don't let any code write `on_hand = 42` directly. Record each change as a movement row: what, where, how many, why, who and when. Keep the balance table as a fast summary that you update in the same transaction.

When a manager asks why the count is off, the movements answer it. They also make refunds simple: a refund is a movement in the other direction, linked to the original sale.

## The other tricky parts

### The till must keep working when the internet doesn't

A shop can't stop selling when its connection drops. Decide early how much offline support you need. The simplest version queues sales in the browser and sends them when the connection returns, with an ID made on the device so a sale is never saved twice. Stock checks then happen after the fact, which is another reason to keep movements.

### Receipt numbers per location

Tax rules in many countries ask for receipt numbers without gaps. A database auto-increment can skip numbers when a transaction rolls back. Keep a counter row per location and increment it with a lock inside the sale transaction.

### Money and tax

Store amounts as integers in the smallest unit, such as cents or paise, never as floats. Tax rules differ by country and by product, so keep tax classes per tenant and record the rate used on each sale line. A rate change next year must not rewrite this year's receipts.

### Barcode scanning speed

A scanner types a code and presses Enter, often within a few milliseconds. The sale screen should look the code up in one indexed query and add the line without a full page reload. Put a unique index on barcode per tenant.

## A build plan for a POS SaaS

<DocSteps>

### 1. Create a test shop

Install the kit, create a tenant for one retailer and sign in on its subdomain.

### 2. Add products and locations

Build a Catalog module with tenant migrations for products, variants, barcodes and locations.

### 3. Record stock as movements

Write every change as a movement and update the balance in the same transaction.

### 4. Build the sale screen

Scan, pay, and take stock with the conditional decrement above, inside the sale's transaction.

### 5. Add shifts, refunds and receipts

Open and close shifts, number receipts per location and record refunds as reverse movements.

### 6. Add reports, then billing

Report on sales and stock value, then add a payment provider so each retailer pays for its plan.

</DocSteps>

## Converting an existing POS script

Two popular CodeCanyon POS scripts have their own conversion guides: [Convert Ultimate POS to a multi-tenant SaaS](/blog/convert-ultimate-pos-to-saas.html) and [Convert Stocky POS to a multi-tenant SaaS](/blog/convert-stocky-to-saas.html). Both explain what the license allows and what changes when every shop gets its own database.

<NextStep
  title="Spend your time on the till, not the tenant setup"
  text="Each retailer gets its own database, subdomain, users and roles out of the box. You start with products, stock and the sale screen."
  secondaryText="Read the database docs"
  secondaryLink="/docs/core/database.html"
/>
