---
title: "Release Notes: Laravel SaaS Kit Updates"
description: "Release notes for the SaaS Laravel starter kits: new features, improvements and fixes shipped to the Vue, React and Svelte kits in every weekly update."
---

# Release Notes

What's new, improved and fixed in the SaaS Laravel starter kits. We push updates to your kit repository every week. To bring them into your project, see [Updates](/docs/purchase/updates).

<!--
Every release is a card for one kit, newest first. A change that ships to all three kits gets a card per kit.
Kit changes are collected in "Unreleased" cards at the top (see rule 6 in AGENTS.md); leave out `date` until it ships:

<ReleaseCard kit="vue" version="Unreleased">

- Added ...
- Fixed ...

</ReleaseCard>

When you publish, set the version (semantic versioning, per kit) and the date, for example
<ReleaseCard kit="vue" version="1.1.1" date="18 October 2026">.
Write plain descriptions only: no code, commands or file names in backticks. Start each line with Added, Changed,
Improved, Fixed or Removed, and describe anything buyers must do in words as the last line.
-->

<ReleaseFilter />

<ReleaseCard kit="vue" version="1.3.0" date="18 October 2026">

- Updated the frontend packages to their latest compatible versions, including Inertia 3.9, Vite 8.3, Reka UI 2.11, VueUse 15, Lucide 1.56, Laravel Passkeys 0.4 and vue-tsc 3.
- Updated ESLint to 9.39 with the Vue ESLint plugin 10, and TypeScript to 5.9. ESLint 10 and TypeScript 7 stay out until the lint and type-check tools support them.
- Fixed buttons, menu items, tabs and other clickable controls so they show a pointer cursor again, which Tailwind CSS v4 no longer adds by default.
- After updating, run npm install.

</ReleaseCard>

<ReleaseCard kit="react" version="1.3.0" date="18 October 2026">

- Updated the frontend packages to their latest compatible versions, including React 19.3, Inertia 3.9, Vite 8.3, the Radix UI components and Laravel Passkeys 0.4.
- Updated ESLint to 9.39 and TypeScript to 5.9. ESLint 10 and TypeScript 7 stay out until the lint and type-check tools support them.
- Fixed the Add Tenant page, which did not open, so you can create tenants again.
- Fixed buttons, menu items, tabs and other clickable controls so they show a pointer cursor again, which Tailwind CSS v4 no longer adds by default.
- After updating, run npm install.

</ReleaseCard>

<ReleaseCard kit="svelte" version="1.3.0" date="18 October 2026">

- Updated the frontend packages to their latest compatible versions, including Svelte 5.57, Inertia 3.9, Vite 8.3, Bits UI 2.19, Svelte Sonner 1.2, Lucide Svelte 1.0, Laravel Passkeys 0.4 and the Svelte Prettier plugin 4.
- Updated ESLint to 9.39 and TypeScript to 5.9. ESLint 10 and TypeScript 7 stay out until the lint and type-check tools support them.
- Fixed buttons, menu items, tabs and other clickable controls so they show a pointer cursor again, which Tailwind CSS v4 no longer adds by default.
- After updating, run npm install.

</ReleaseCard>

<ReleaseCard kit="vue" version="1.2.0" date="18 October 2026">

- Changed the minimum PHP version to 8.4. The included test tools already needed PHP 8.4, so the kit now says so, and automatic dependency updates run on the right PHP version.
- If you still run PHP 8.3, upgrade to PHP 8.4 or newer before updating.

</ReleaseCard>

<ReleaseCard kit="react" version="1.2.0" date="18 October 2026">

- Changed the minimum PHP version to 8.4. The included test tools already needed PHP 8.4, so the kit now says so, and automatic dependency updates run on the right PHP version.
- If you still run PHP 8.3, upgrade to PHP 8.4 or newer before updating.

</ReleaseCard>

<ReleaseCard kit="svelte" version="1.2.0" date="18 October 2026">

- Changed the minimum PHP version to 8.4. The included test tools already needed PHP 8.4, so the kit now says so, and automatic dependency updates run on the right PHP version.
- If you still run PHP 8.3, upgrade to PHP 8.4 or newer before updating.

</ReleaseCard>

<ReleaseCard kit="vue" version="1.1.0" date="11 October 2026">

- Updated all Composer dependencies to their latest versions, including Laravel 13.35, Inertia Laravel 3.5, Fortify 1.41, Pest 5.3, Larastan 3.13 and Laravel Boost 2.10.
- Added a Composer script that raises your dependency versions to the latest releases in one step.
- Fixed the settings and setup redirects, so the generated route types pass type checking with Laravel 13.35.
- Improved the Laravel Boost AI guidelines and skills to Boost 2.10, including the new testing best practices skill.
- Fixed the AI guideline files and skills to only cover Vue, so AI agents no longer load the other frameworks' skills.
- Changed the example environment file to leave the database password empty, the same as the React and Svelte kits. Your existing environment file is not changed.
- Improved the README with a link to the documentation, the default login users, and a reminder to keep your copy of the kit in a private repository. The Laravel logo at the top is removed.
- After updating, reinstall your Composer packages.

</ReleaseCard>

<ReleaseCard kit="react" version="1.1.0" date="11 October 2026">

- Updated all Composer dependencies to their latest versions, including Laravel 13.35, Inertia Laravel 3.5, Fortify 1.41, Pest 5.3, Larastan 3.13 and Laravel Boost 2.10.
- Added a Composer script that raises your dependency versions to the latest releases in one step.
- Fixed the settings and setup redirects, so the generated route types pass type checking with Laravel 13.35.
- Improved the Laravel Boost AI guidelines and skills to Boost 2.10, including the new testing best practices skill.
- Fixed the AI guideline files and skills to only cover React, so AI agents no longer load the other frameworks' skills.
- Improved the README with a link to the documentation, the default login users, and a reminder to keep your copy of the kit in a private repository. The Laravel logo at the top is removed.
- After updating, reinstall your Composer packages.

</ReleaseCard>

<ReleaseCard kit="svelte" version="1.1.0" date="11 October 2026">

- Updated all Composer dependencies to their latest versions, including Laravel 13.35, Inertia Laravel 3.5, Fortify 1.41, Pest 5.3, Larastan 3.13 and Laravel Boost 2.10.
- Added a Composer script that raises your dependency versions to the latest releases in one step.
- Fixed the settings and setup redirects, so the generated route types pass type checking with Laravel 13.35.
- Improved the Laravel Boost AI guidelines and skills to Boost 2.10, including the new testing best practices skill.
- Fixed the AI guideline files and skills to only cover Svelte, so AI agents no longer load the other frameworks' skills.
- Improved the README with a link to the documentation, the default login users, and a reminder to keep your copy of the kit in a private repository. The Laravel logo at the top is removed.
- After updating, reinstall your Composer packages.

</ReleaseCard>

<ReleaseCard kit="vue" version="1.0.2" date="2 October 2026">

- Changed the repository location to the ERAG GitHub organization. After updating, point your upstream remote to the new repository address.

</ReleaseCard>

<ReleaseCard kit="react" version="1.0.2" date="2 October 2026">

- Changed the repository location to the ERAG GitHub organization. After updating, point your upstream remote to the new repository address.

</ReleaseCard>

<ReleaseCard kit="svelte" version="1.0.2" date="2 October 2026">

- Changed the repository location to the ERAG GitHub organization. After updating, point your upstream remote to the new repository address.

</ReleaseCard>

<ReleaseCard kit="vue" version="1.0.1" date="29 September 2026">

- Improved the README to clone the kit into a folder named after the framework, which matches the kit's local domain in Laravel Herd.

</ReleaseCard>

<ReleaseCard kit="react" version="1.0.1" date="29 September 2026">

- Improved the README to clone the kit into a folder named after the framework, which matches the kit's local domain in Laravel Herd.

</ReleaseCard>

<ReleaseCard kit="svelte" version="1.0.1" date="29 September 2026">

- Improved the README to clone the kit into a folder named after the framework, which matches the kit's local domain in Laravel Herd.

</ReleaseCard>

<ReleaseCard kit="vue" version="1.0.0" date="28 September 2026">

- Changed the SaaS Laravel Commercial License to name ERAG (previously ERAG Technologies) as the copyright holder. The license terms are unchanged.

</ReleaseCard>

<ReleaseCard kit="react" version="1.0.0" date="28 September 2026">

- Changed the SaaS Laravel Commercial License to name ERAG (previously ERAG Technologies) as the copyright holder. The license terms are unchanged.

</ReleaseCard>

<ReleaseCard kit="svelte" version="1.0.0" date="28 September 2026">

- Changed the SaaS Laravel Commercial License to name ERAG (previously ERAG Technologies) as the copyright holder. The license terms are unchanged.

</ReleaseCard>
