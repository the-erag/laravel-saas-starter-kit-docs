---
title: "Build an HR and Payroll SaaS with Laravel"
description: "Plan a multi-tenant HR and payroll SaaS in Laravel: employee records per company, manager and employee roles, leave, payroll runs and a build plan."
breadcrumb: "HR and payroll SaaS with Laravel"
sidebar: false
editLink: false
howTo:
  name: "Build an HR and payroll SaaS on the SaaS Laravel kit"
  steps:
    - name: "Create a test company as a tenant"
      text: "Install the kit and create a tenant for one employer with its own subdomain and database."
      anchor: "a-build-plan-for-an-hr-and-payroll-saas"
    - name: "Add employees and the reporting line"
      text: "Create a People module with employee records, departments and a manager for each employee."
    - name: "Protect salary and bank data"
      text: "Encrypt sensitive columns and put them behind their own permission, separate from the employee directory."
    - name: "Add leave with approvals"
      text: "Add leave types, balances and requests that the employee's manager approves, using the company's work week."
    - name: "Run payroll as a locked batch"
      text: "Calculate a pay period in a queued batch, review it, then lock it so payslips can no longer change."
    - name: "Add billing"
      text: "Add a payment provider and bill each company per employee."
---

# Build an HR and Payroll SaaS with Laravel

This page helps you plan an HR product that many employers use for their own staff: employee records, leave, attendance and payroll. It covers the modules, how managers and employees map to roles, what each company owns, the parts that need extra care, and a build plan on the [SaaS Laravel](/blog/laravel-saas-starter-kit.html) kit.

HR data is some of the most sensitive data a company holds: salaries, bank details, ID numbers, sick notes. A separate database per employer is a strong start, but it isn't the whole answer. Inside one company, most people must not see most of it.

## Be honest about payroll before you start

Leave, records and approvals work much the same everywhere. Payroll doesn't. Income tax, social security, pensions and reporting to the tax office change by country, and often by state, every year.

You have two realistic routes. You can pick one country, learn its rules properly and keep them current. Or you can build the HR side and connect to a payroll provider that already handles the tax rules. Trying to support "every country" from day one is how payroll products ship wrong payslips. We'd start with one country, or with HR only.

## The modules an HR and payroll SaaS needs

- **People**: employee records, departments, job titles and who reports to whom.
- **Leave**: leave types, yearly balances, requests and approvals.
- **Attendance**: clock in and out, or simple timesheets.
- **Payroll**: pay periods, salary components, deductions and payslips.
- **Documents**: contracts and letters per employee.
- **Self-service**: where employees see their own payslips, balances and details.

## Managers and employees as tenant roles

| Person | Kit role | What they do |
| --- | --- | --- |
| Company owner or HR director | Super Admin | Everything, including payroll settings |
| HR officer | Admin | Employee records, leave types, documents |
| Payroll officer | Custom role: Payroll | Pay periods, salary data, payslips |
| Line manager | Manager | Approve leave and timesheets for their own reports |
| Employee | Employee or User | Their own profile, leave, timesheets and payslips |

Notice that HR officer and payroll officer are separate. In many companies the person who manages leave must not see salaries. Give salary data its own permissions, such as "View Salaries" and "Run Payroll", and give them to the Payroll role only.

"Manager" in the table means the employee's own manager, not anyone with the Manager role. Store a `manager_id` on each employee. A leave approval checks both the permission and that the approver manages that employee.

## What each company owns and what is central

| Tenant database (one per employer) | Central database |
| --- | --- |
| Employee records, departments, managers | The employer as a tenant, with its status |
| Salaries, bank details, tax IDs (encrypted) | Its subdomain |
| Leave balances, requests and approvals | Your plans and per-employee billing, once you add it |
| Attendance and timesheets | Your support staff accounts |
| Pay periods and locked payslips | Maintenance mode for all workspaces |

<PricingBlock />

## Protect salary and bank data inside the tenant

A separate database stops one company seeing another's staff. It doesn't stop a curious employee in the same company. Two layers help.

First, encrypt the most sensitive columns. Laravel's `encrypted` cast stores the value encrypted with your `APP_KEY` and decrypts it when you read it:

```php
class EmployeeBankAccount extends Model
{
    protected function casts(): array
    {
        return [
            'account_number' => 'encrypted',
            'tax_id' => 'encrypted',
        ];
    }
}
```

Encrypted columns can't be searched or sorted in SQL, so only encrypt what you never filter on. Keep a backup of `APP_KEY` somewhere safe: lose it and that data is gone.

Second, keep salary and bank data in their own tables and their own screens. The employee directory, which everyone can see, should never load them at all. That's safer than hiding a column in the frontend.

## The other tricky parts

### Payslips must never change after payroll is run

Once a payslip is paid and reported, it's a legal record. Run payroll as a pay period with three states: draft, reviewed and locked. Calculate in draft, let the payroll officer review, then lock. After locking, a correction is a new adjustment in the next period, not an edit.

For a company with hundreds of employees, calculate the period in a queued job batch rather than in one request. The kit's queue setup keeps each job in the right company's database.

### Salary changes have a start date

A raise agreed in March may start in April, or be backdated to January. Store salary as rows with an "effective from" date, not one number on the employee. Payroll then reads the salary that applied in each part of the period.

### Leave balances and the work week

Leave days depend on which days the company works. The kit already stores a work week on each tenant: Monday to Friday, Monday to Saturday or Sunday to Thursday. Use it when you count working days in a leave request. Public holidays differ by country and region, so store them per company.

### Employees leave, and their data stays

When someone leaves, you usually can't delete their records straight away, because tax and employment law set how long you keep them. Deactivate their user account so they can't sign in, and keep the employee record. Decide with the customer how long to keep it and when to delete it.

## A build plan for an HR and payroll SaaS

<DocSteps>

### 1. Create a test company

Install the kit, create a tenant for one employer and sign in on its subdomain.

### 2. Add employees and reporting lines

Build a People module with tenant migrations for employees, departments and managers.

### 3. Protect salary and bank data

Encrypt sensitive columns and put them behind their own permissions and screens.

### 4. Add leave with approvals

Add leave types, balances and requests approved by each employee's own manager, using the tenant's work week.

### 5. Run payroll as a locked batch

Calculate a period in a queued batch, review it, then lock it. Start with one country's rules or a payroll provider.

### 6. Add billing

Add a payment provider and bill each company per active employee.

</DocSteps>

## Converting Worksuite instead

Worksuite on CodeCanyon combines HR, CRM and projects. If you were thinking of starting from it, read [Convert Worksuite to a multi-tenant SaaS](/blog/convert-worksuite-to-saas.html) for what its license allows and how its users map to tenant roles.

<NextStep
  title="Start with employees and leave, on a separate database per company"
  text="Tenants, roles, invitations and queued jobs are already set up. You start with the HR modules your customers need first."
  secondaryText="Read the security checklist"
  secondaryLink="/blog/laravel-saas-security-checklist.html"
/>
