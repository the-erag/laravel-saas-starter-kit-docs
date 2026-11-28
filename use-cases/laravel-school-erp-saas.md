---
title: "Build a School ERP SaaS with Laravel"
description: "Plan a multi-tenant school ERP SaaS in Laravel: one database per school, roles for staff, students and parents, record-level access and a build plan."
breadcrumb: "School ERP SaaS with Laravel"
sidebar: false
editLink: false
howTo:
  name: "Build a school ERP SaaS on the SaaS Laravel kit"
  steps:
    - name: "Set up one school as a test tenant"
      text: "Install the kit and create a school workspace with its own subdomain and database."
      anchor: "a-build-plan-for-a-school-erp"
    - name: "Model the academic structure"
      text: "Add academic years, classes, sections and subjects as tenant tables in a School module."
    - name: "Add people and their links"
      text: "Add students and guardians, and link each guardian user to their own children."
    - name: "Add custom roles for teachers and parents"
      text: "Create Teacher, Parent and Student roles with tenant permissions, and scope every query to the user's own classes or children."
    - name: "Build attendance, exams and results"
      text: "Record attendance per period, enter marks, and publish results only when the term is locked."
    - name: "Add fees and billing"
      text: "Track fee invoices per student inside the tenant, and bill the school for your SaaS separately."
---

# Build a School ERP SaaS with Laravel

If you want to sell school management software to many schools, this page shows you how to plan it on Laravel. It covers the modules, how teachers, students and parents map to roles, what data stays inside each school, the hard parts, and a build plan on the [SaaS Laravel](/blog/laravel-saas-starter-kit.html) kit.

Schools are a natural fit for one database per tenant. Each school gets its own data, its own address such as `greenfield.your-erp.com`, and its own users.

## Why schools want their own database

A school holds data about children: names, addresses, health notes, marks. Principals and school boards ask where that data lives and who can reach it. "Your school has its own database" is an answer they understand.

It also helps you operate. When one school asks for its records at the end of a contract, you export one database. When a teacher deletes a class by mistake, you restore one school without touching the others.

## The modules a school ERP needs

Most school ERPs share the same core. We'd build it as a few modules in the kit's `Modules/` folder:

- **Academics**: academic years, terms, classes, sections and subjects.
- **People**: students, guardians and staff profiles, with the links between them.
- **Attendance**: daily or per-period attendance, with absence alerts to parents.
- **Exams**: exam schedules, marks entry and report cards.
- **Timetable**: which teacher teaches which subject, in which room, and when.
- **Fees**: fee plans, invoices per student and payment records.
- **Notices**: announcements to a class, a year group or everyone.

Start with Academics, People and Attendance. A school can run on those for a term while you build the rest.

## Teachers, students and parents as tenant roles

The kit gives every school the same five system roles: Super Admin, Admin, Manager, Employee and User. A school also needs roles that only make sense in education, so add them as custom roles on the Roles page or seed them per tenant.

| Person | Role | What they can do |
| --- | --- | --- |
| Principal | Super Admin (the workspace owner) | Everything in the school, including settings and users |
| School office staff | Admin | Admissions, fees, timetables, user accounts |
| Head of year | Manager | Attendance and results for their year group |
| Teacher | Custom role: Teacher | Attendance and marks for their own classes |
| Parent | Custom role: Parent | Their own children's attendance, results and fees |
| Student | Custom role: Student | Their own timetable, results and notices |

Custom roles start with no permissions. You give them a set from the Assign permissions dialog, or from a seeder that runs when a school is created.

## Record-level access: a parent sees only their own child

This is the rule that matters most, and roles alone don't enforce it. A "View Results" permission lets a parent open the results page. It must never let them see another family's results.

Link guardian users to students, then filter every query through that link:

```php
public function resultsVisibleTo(User $user): Builder
{
    return ExamResult::query()
        ->when($user->hasRole('parent'), fn (Builder $query) => $query
            ->whereIn('student_id', $user->guardianOf()->pluck('students.id')))
        ->when($user->hasRole('teacher'), fn (Builder $query) => $query
            ->whereIn('class_section_id', $user->teachingSections()->pluck('id')));
}
```

Put this in the Exams service and use it for the page, the PDF report card and any download. Then write a test that signs in as one parent and asserts they get a 404 for another child's report.

## What lives in each school's database and what is central

| School database (tenant) | Central database |
| --- | --- |
| Students, guardians, staff profiles | The school as a tenant: name, contact, status |
| Classes, subjects, timetables | The school's domain or domains |
| Attendance, marks, report cards | Your own staff and support accounts |
| Fee invoices and payments to the school | What the school pays you, once you add billing |
| The school's users, roles and menus | Global maintenance mode |

Fees can confuse people, because there are two kinds of money. Parents pay the school, and that belongs in the school's database. The school pays you for the software, and that belongs in the central database.

<PricingBlock />

## The tricky parts of a school ERP

### The academic year rolls over

Every year students move up a class, sections change and some students leave. Don't overwrite last year's class on the student record. Keep an enrolment table that links a student to a section for one academic year. Promotion then creates new rows, and last year's report cards still point at the right class.

### Results must not change after they're published

Teachers enter marks over weeks, and corrections happen. Once a report card goes to parents, though, its numbers must stay as they were. Add a "locked" state to the exam term. After locking, edits need an Admin, and each change should leave a note of who changed what and why. The kit doesn't include an audit log, so plan one for this module.

### Parents with more than one child, and children with two homes

A parent account can link to several students. A student can have two guardian accounts that should both see everything, or a court order that says one shouldn't. Model guardianship as its own table with a flag for access, instead of a single `parent_id` column.

### Schools work different weeks

Some schools run Monday to Friday, some Monday to Saturday, some Sunday to Thursday. The kit already stores a work week on each tenant (`mon_fri`, `mon_sat` or `sun_thu`), which is a good start for timetables and attendance calendars. Holidays and term dates you'll still store per school.

### Lots of parents sign in at once

Results day brings everyone at the same time. Render report cards ahead of time in a queued job and store them, rather than building a PDF on every request.

## A build plan for a school ERP

<DocSteps>

### 1. Set up one school as a test tenant

Install the kit and create a school from the central app. Sign in on its subdomain as the principal. The [multi-tenancy docs](/docs/core/multi-tenancy.html) show what tenant creation sets up.

### 2. Model the academic structure

Add academic years, classes, sections and subjects as tenant migrations in a School module.

### 3. Add people and their links

Add students, guardians and staff. Link guardian users to students through a guardianship table.

### 4. Add the Teacher, Parent and Student roles

Seed them with their tenant permissions, and add the record-level rule before you build any list page.

### 5. Build attendance, exams and results

Record attendance, enter marks, lock terms and publish report cards from a queued job.

### 6. Add fees, then bill the school

Track what parents owe the school. Separately, add a payment provider so each school pays you for the software.

</DocSteps>

## Converting an existing school script instead

Many people start from InfixEdu, a school ERP sold on CodeCanyon. [Convert InfixEdu School ERP to a multi-tenant SaaS](/blog/convert-infixedu-to-saas.html) explains what its license allows and how to move it onto a database per school.

<NextStep
  title="Give every school its own database from day one"
  text="Tenant creation, separate databases, roles and invitations are already built. You start with classes, students and attendance."
  secondaryText="Read the roles and permissions docs"
  secondaryLink="/docs/core/users-roles-permissions.html"
/>
