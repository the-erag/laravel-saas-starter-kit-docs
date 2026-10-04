---
title: "Release Notes"
description: "Release notes for the SaaS Laravel starter kits: new features, improvements and fixes shipped to the Vue, React and Svelte kits in every weekly update."
head:
  - - link
    - rel: canonical
      href: https://saas-laravel.com/releases.html
  - - meta
    - property: og:title
      content: "Release Notes"
  - - meta
    - property: og:description
      content: "Release notes for the SaaS Laravel starter kits: new features, improvements and fixes shipped to the Vue, React and Svelte kits in every weekly update."
  - - meta
    - property: og:url
      content: https://saas-laravel.com/releases.html
  - - meta
    - name: twitter:title
      content: "Release Notes"
  - - meta
    - name: twitter:description
      content: "Release notes for the SaaS Laravel starter kits: new features, improvements and fixes shipped to the Vue, React and Svelte kits in every weekly update."
---

# Release Notes

What's new, improved and fixed in the SaaS Laravel starter kits. We push updates to your kit repository every week. To bring them into your project, see [Updates](/docs/purchase/updates).

<!--
Kit changes are collected under "## Unreleased" at the top (see rule 6 in AGENTS.md).
When you publish a release, rename "Unreleased" to the version and add the date line.
Releases are listed newest first in this format:

## v1.2.0 <Badge type="info" text="All kits" />

<p class="release-meta">Released 27 September 2026</p>

- Added ...
- Fixed ...

Badges: text="All kits" (type="info") or text="Vue" / "React" / "Svelte" (type="tip").
-->

## Unreleased <Badge type="info" text="All kits" />

- Changed: the kit repositories moved to the ERAG GitHub organization, [`the-erag`](https://github.com/the-erag). Update your upstream remote, for example `git remote set-url upstream https://github.com/the-erag/saas-laravel-starter-kit-vue.git` (use `-react` or `-svelte` for the other kits).
- Changed: the SaaS Laravel Commercial License now names ERAG as the copyright holder.
- Improved: the README now clones each kit into a folder named after its framework (`vue`, `react` or `svelte`), which matches the kit's `.test` domain in Laravel Herd.
