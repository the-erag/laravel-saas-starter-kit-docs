---
title: "Starter Kit Repository Access"
description: "How your GitHub account is invited to the starter kit repository after a GitHub Sponsors payment, and how to clone the private repository."
head:
  - - link
    - rel: canonical
      href: https://saas-laravel.com/docs/purchase/repository-access.html
  - - meta
    - property: og:title
      content: "Starter Kit Repository Access"
  - - meta
    - property: og:description
      content: "How your GitHub account is invited to the starter kit repository after a GitHub Sponsors payment, and how to clone the private repository."
  - - meta
    - property: og:url
      content: https://saas-laravel.com/docs/purchase/repository-access.html
  - - meta
    - name: twitter:title
      content: "Starter Kit Repository Access"
  - - meta
    - name: twitter:description
      content: "How your GitHub account is invited to the starter kit repository after a GitHub Sponsors payment, and how to clone the private repository."
---

# Repository access

Every starter kit has its own private GitHub repository:

| Kit | Repository |
| --- | --- |
| <Badge type="tip" text="Vue" /> | `the-erag/saas-laravel-starter-kit-vue` |
| <Badge type="tip" text="React" /> | `the-erag/saas-laravel-starter-kit-react` |
| <Badge type="tip" text="Svelte" /> | `the-erag/saas-laravel-starter-kit-svelte` |

If you buy the **All Starter Kits** bundle, you get access to all three.

## What you get

You get the full source of the kit: the Laravel backend plus the frontend for your framework. Access is for life, weekly updates are pushed to the same repository, and there's no recurring subscription.

## How access is granted

```text
Pay through GitHub Sponsors → your GitHub account is invited automatically → accept the invitation
```

1. Pick a kit on the [pricing page](/pricing) and pay through GitHub Sponsors (see [How to pay](/how-to-pay)).
2. As soon as the payment goes through, your GitHub account is invited to the kit repository automatically, or to all three if you bought the bundle.
3. GitHub sends you the invitation by email. Accept it there, or open the repository URL while you're signed in and accept the banner.

::: info Automatic access
Access goes to the GitHub account that made the sponsorship. Sponsor from the account you want to use with the kit.
:::

If the invitation doesn't turn up, open an issue or contact the maintainer through GitHub.

## Clone the repository

<PrivateRepoNotice />

::: code-group

```bash [Vue]
git clone https://github.com/the-erag/saas-laravel-starter-kit-vue.git vue
```

```bash [React]
git clone https://github.com/the-erag/saas-laravel-starter-kit-react.git react
```

```bash [Svelte]
git clone https://github.com/the-erag/saas-laravel-starter-kit-svelte.git svelte
```

:::

::: tip Authentication
To clone a private repository over HTTPS, Git has to authenticate with GitHub. Use GitHub CLI (`gh auth login`), a credential helper or a personal access token. SSH works as well, for example `git@github.com:the-erag/saas-laravel-starter-kit-vue.git`.
:::

What to do next:

- Set up your own `origin` and keep the kit as `upstream`, so you can pull in updates later. See [Updates → Recommended remote setup](/docs/purchase/updates#recommended-remote-setup).
- Carry on with [Installation](/docs/getting-started/installation).
