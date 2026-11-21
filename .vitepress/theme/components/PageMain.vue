<!--
  Replaces VitePress's VPPage (see the alias in .vitepress/config.mts) for pages with `layout: page`.
  It's the same component with <main> instead of <div>, so the home, pricing and other marketing pages
  get a main landmark like the docs pages already have. The class stays VPPage, so styles don't change.
-->
<template>
  <main class="VPPage">
    <slot name="page-top" />
    <Content />
    <slot name="page-bottom" />
  </main>
</template>
