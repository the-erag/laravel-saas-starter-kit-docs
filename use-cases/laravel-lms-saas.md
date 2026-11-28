---
title: "Build an LMS SaaS with Laravel"
description: "Plan a multi-tenant LMS SaaS in Laravel: an academy per tenant, instructor and learner roles, video delivery, progress tracking and a build plan."
breadcrumb: "LMS SaaS with Laravel"
sidebar: false
editLink: false
howTo:
  name: "Build an LMS SaaS on the SaaS Laravel kit"
  steps:
    - name: "Create a test academy as a tenant"
      text: "Install the kit and create a tenant for one academy with its own subdomain and database."
      anchor: "a-build-plan-for-an-lms-saas"
    - name: "Add courses, sections and lessons"
      text: "Create a Learning module with courses, sections and lessons as tenant tables."
    - name: "Deliver video through a video service"
      text: "Upload lessons to a video host and show them with short-lived signed playback URLs instead of serving files from the app server."
    - name: "Add enrolments and progress"
      text: "Enrol learners, record lesson progress in small batched writes, and compute course completion."
    - name: "Add quizzes and certificates"
      text: "Add quizzes with attempts, and issue certificates from a queued job when a course is completed."
    - name: "Add billing"
      text: "Add a payment provider for the academy's plan, and separately for course sales if the academy sells courses."
---

# Build an LMS SaaS with Laravel

This page is for developers who want to sell a learning platform to many academies, training companies or schools. It covers the modules, how instructors and learners map to roles, what each academy owns, the hard parts (video, progress tracking and certificates), and a build plan on the [SaaS Laravel](/blog/laravel-saas-starter-kit.html) kit.

Each academy becomes a tenant with its own database and its own address, such as `code-academy.your-lms.com`. Its courses, learners and results stay in that database.

## First check: an academy platform or a course marketplace?

These two products sound alike and need different data models.

An **academy platform** sells each customer a private school. A company trains its staff, or a coach runs their own courses for their own learners. Learners belong to one academy. That fits a database per tenant well.

A **course marketplace** puts every instructor's courses in one shared catalog, and one learner account buys from many instructors. Search, reviews and recommendations all cross instructors. A shared database with a `tenant_id` fits that better, and a database per tenant would fight you on every cross-catalog query. If that's your product, we'd say the SaaS Laravel kit is the wrong base. [Single vs multi-database tenancy](/blog/single-vs-multi-database-tenancy-laravel.html) explains the trade-off in more detail. The [tenancy model quiz](/tools/laravel-tenancy-model-quiz.html) can help you check.

The rest of this page assumes an academy platform.

## The modules an LMS needs

- **Courses**: courses, sections and lessons, with draft and published states.
- **Media**: video, PDFs and slides for each lesson.
- **Enrolments**: who is on which course, from when, and until when.
- **Progress**: which lessons each learner has finished, and how far into each video they got.
- **Quizzes**: questions, attempts, scores and pass marks.
- **Certificates**: a PDF with the learner's name, the course and a check code.
- **Cohorts**: optional groups that start together and get lessons on a schedule.

## Instructors and learners as tenant roles

| Person | Kit role | What they do |
| --- | --- | --- |
| Academy owner | Super Admin | Everything, including settings and users |
| Training manager | Admin or Manager | Enrol people, see every learner's progress, run reports |
| Instructor | Custom role: Instructor | Build and edit their own courses, see their learners |
| Teaching assistant | Custom role | Grade quizzes and answer questions on assigned courses |
| Learner | User | Their own courses, progress and certificates |

The kit's invitation flow fits corporate training well. A training manager adds staff from a list, and each person gets an email with a signed link that lasts 7 days, where they set their own password.

Instructors usually own courses. A permission like "Edit Courses" lets an instructor open the editor. A check in the service decides which courses they may edit: their own, or all of them if they also have "Edit All Courses".

## What each academy owns and what is central

| Tenant database (one per academy) | Central database |
| --- | --- |
| Courses, sections, lessons, quizzes | The academy as a tenant, with its status |
| Enrolments, progress, quiz attempts | Its subdomain |
| Certificates and their check codes | Your plans and subscriptions, once you add billing |
| References to video files on your video host | Your own staff accounts |
| The academy's users, roles and menus | Maintenance mode for all workspaces |

The video files themselves usually live with a video host, not in either database. The tenant database stores the host's ID for each video.

<PricingBlock />

## Video: don't serve it from your app server

Video is the biggest cost in most LMS products and the easiest to get wrong. Streaming large files through PHP ties up workers, and a server's bandwidth bill grows with every learner.

Upload lessons to a service built for video, which handles encoding and adaptive streaming. Store its video ID on the lesson. When a learner opens a lesson, check they're enrolled, then give the player a playback URL that expires after a short time. A shared link then stops working after a few minutes instead of living on a forum.

If you do keep small files yourself, such as PDFs, the kit already suffixes the `local` and `public` disks per tenant. For production, use object storage with a prefix per academy.

## Progress tracking without flooding the database

A video player can report progress every few seconds. With hundreds of learners, that's a lot of writes for little value. Send progress at sensible points instead: every 30 seconds, on pause and when the video ends. Store one row per learner per lesson and update it, rather than inserting a new row each time:

```php
public function recordProgress(User $learner, Lesson $lesson, int $seconds): void
{
    LessonProgress::query()->upsert(
        [['user_id' => $learner->id, 'lesson_id' => $lesson->id, 'seconds_watched' => $seconds, 'updated_at' => now()]],
        uniqueBy: ['user_id', 'lesson_id'],
        update: ['seconds_watched', 'updated_at'],
    );
}
```

Mark a lesson complete when the learner passes a threshold you choose, such as 90% of the video. Compute course completion from completed lessons. Store it on the enrolment when it changes, so dashboards don't count lessons on every page view.

## The other tricky parts

### Certificates people can check

An employer may want to confirm a certificate is real. Give each certificate a random check code and a public page on the academy's domain that shows the name, course and date for that code. Generate the PDF in a queued job when the course is completed. The kit's queue setup keeps the job in the academy's tenant, so the right logo and name end up on it.

### Changing a course after people finish it

An instructor edits a lesson or adds a new one. Did the people who finished last month stop being "complete"? Decide this as a rule. We'd freeze completion on the enrolment at the moment it happens, and only count new lessons for people still in progress.

### Lessons on a schedule

Cohort courses release a lesson each week. "Each Monday at 9:00" means local time for the academy. The kit runs in UTC and has no time zone per tenant, so store one on the tenant and compute release times from it.

## A build plan for an LMS SaaS

<DocSteps>

### 1. Create a test academy

Install the kit, create a tenant for one academy and sign in on its subdomain.

### 2. Add courses, sections and lessons

Build a Learning module with tenant migrations and draft or published states.

### 3. Deliver video through a video host

Store the host's video ID per lesson and show it with short-lived playback URLs.

### 4. Add enrolments and progress

Enrol learners, invite them by email, and record progress with the upsert above.

### 5. Add quizzes and certificates

Add attempts and pass marks, and issue certificates from a queued job.

### 6. Add billing

Bill the academy for its plan. If academies sell courses to the public, that's a second, separate payment flow inside the tenant.

</DocSteps>

## Converting Academy LMS or NeonLMS

If you were planning to start from an LMS script on CodeCanyon, read [Convert Academy LMS or NeonLMS to a SaaS](/blog/convert-academy-lms-neonlms-to-saas.html). It covers what the licenses allow and how courses, instructors and students map to tenants.

<NextStep
  title="Give each academy its own space from the first lesson"
  text="Tenants, separate databases, invitations and roles are already in place. You start with courses, video and progress."
  secondaryText="Read the multi-tenancy docs"
  secondaryLink="/docs/core/multi-tenancy.html"
/>
