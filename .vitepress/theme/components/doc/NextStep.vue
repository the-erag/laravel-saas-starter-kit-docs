<!--
  The closing call to action of a guide, use-case or tool page: a page-specific title and text,
  a button to pricing and one secondary link (usually a guide or doc page that goes deeper).
-->
<script setup lang="ts">
import { docHref } from './format';
import { site } from '../../../site';

withDefaults(defineProps<{ title: string; text: string; secondaryText?: string; secondaryLink?: string }>(), {
  secondaryText: 'Read the buyer\'s guide',
  secondaryLink: '/blog/laravel-saas-starter-kit.html',
});
</script>

<template>
  <aside class="next-step" aria-label="Next step">
    <p class="next-step-title">{{ title }}</p>
    <p class="next-step-text">{{ text }}</p>
    <div class="next-step-actions">
      <a class="sl-btn sl-btn--primary" href="/pricing.html">See pricing</a>
      <a class="sl-btn sl-btn--secondary" :href="docHref(secondaryLink)">{{ secondaryText }}</a>
    </div>
    <p class="next-step-note">{{ site.paymentNote }}</p>
  </aside>
</template>

<style>
.next-step {
  margin: 48px 0 8px;
  padding: 24px 26px;
  border: 1px solid var(--sl-border-strong);
  border-radius: var(--sl-radius);
  background: linear-gradient(160deg, var(--vp-c-brand-soft), transparent 70%), var(--sl-surface);
}

.vp-doc .next-step-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.45;
  color: var(--vp-c-text-1);
}

.vp-doc .next-step-text {
  margin: 8px 0 0;
  font-size: 15px;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}

.next-step-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}

.vp-doc .next-step-actions a {
  max-width: 100%;
  white-space: normal;
  text-align: center;
  text-decoration: none;
}

.vp-doc .next-step-actions .sl-btn--primary,
.vp-doc .next-step-actions .sl-btn--primary:hover {
  color: #fff;
}

.vp-doc .next-step-actions .sl-btn--secondary {
  color: var(--vp-c-text-1);
}

.vp-doc .next-step-note {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
}
</style>
