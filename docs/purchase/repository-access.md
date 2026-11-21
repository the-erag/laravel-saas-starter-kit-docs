---
title: "Starter Kit Repository Access"
description: "How your GitHub account is invited to the starter kit repository after a GitHub Sponsors payment, and how to clone the private repository."
---

# Repository access

This page shows how you get into your kit's private GitHub repository after you pay, and how to clone it. Every starter kit has its own repository:

| Kit | Repository |
| --- | --- |
| <Badge type="tip" text="Vue" /> | `the-erag/saas-laravel-starter-kit-vue` |
| <Badge type="tip" text="React" /> | `the-erag/saas-laravel-starter-kit-react` |
| <Badge type="tip" text="Svelte" /> | `the-erag/saas-laravel-starter-kit-svelte` |
| <Badge type="tip" text="Livewire" /> | `the-erag/saas-laravel-starter-kit-livewire` |

The **All Starter Kits** bundle gives you access to all four.

<KeyIdea title="What you'll have at the end">

Access to your kit's private repository on your GitHub account, and a local clone of it, ready for [Installation](/docs/getting-started/installation).

</KeyIdea>

## What you get

You get the full source of the kit: the Laravel backend and the frontend for your framework. Access is lifetime, weekly updates go to the same repository, and there's no subscription.

<DocSteps>

## How access is granted

<FlowDiagram label="How access is granted" :nodes="['Pay through GitHub Sponsors', 'Your GitHub account is invited automatically', 'Accept the invitation']" />

1. Pick a kit on the [pricing page](/pricing) and pay through GitHub Sponsors (see [How to pay](/how-to-pay)).
2. Once the payment goes through, your GitHub account is invited to the kit repository automatically (or to all four if you bought the bundle).
3. GitHub sends you the invitation by email. Accept it there, or open the repository URL while you're signed in and accept the banner.

::: info Automatic access
Access goes to the GitHub account that made the sponsorship. Sponsor from the account you want to use with the kit.
:::

No invitation? Open an issue or contact the maintainer through GitHub.

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

```bash [Livewire]
git clone https://github.com/the-erag/saas-laravel-starter-kit-livewire.git livewire
```

:::

::: tip Authentication
To clone a private repository over HTTPS, Git has to authenticate with GitHub. Use GitHub CLI (`gh auth login`), a credential helper or a personal access token. SSH works too, for example `git@github.com:the-erag/saas-laravel-starter-kit-vue.git`.
:::

</DocSteps>

<DocDone>

**Done.** You have the code. Next:

- Set up your own `origin` and keep the kit as `upstream`, so you can pull updates later. See [Updates → Recommended remote setup](/docs/purchase/updates#recommended-remote-setup).
- Carry on with [Installation](/docs/getting-started/installation).

</DocDone>

<RelatedPages :links="[
  { text: 'Installation', link: '/docs/getting-started/installation', desc: 'Install and configure the kit you just cloned.' },
  { text: 'Updates', link: '/docs/purchase/updates', desc: 'Pull the weekly kit updates into your project.' },
  { text: 'FAQ', link: '/docs/reference/faq#purchase-and-access', desc: 'Pricing, payment and access questions.' },
]" />
