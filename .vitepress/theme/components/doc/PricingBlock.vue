<!--
  The one pricing block used in the middle of guide, use-case and tool pages.
  Prices come from site.ts, so they never drift from the pricing page.
-->
<script setup lang="ts">
import { formatPrice, kitPriceList, site } from '../../../site';
</script>

<template>
  <aside class="pricing-block" aria-label="SaaS Laravel pricing">
    <div class="pricing-block-body">
      <p class="pricing-block-title">Start from a kit that already has this foundation</p>
      <p class="pricing-block-text">
        SaaS Laravel is a one-time payment: {{ kitPriceList }} for one kit, or {{ formatPrice(site.bundlePrice) }} for all four.
        You get lifetime access to the repository and the weekly updates.
      </p>
    </div>
    <a class="sl-btn sl-btn--primary pricing-block-btn" href="/pricing.html">See pricing</a>
  </aside>
</template>

<style>
.pricing-block {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px 24px;
  margin: 36px 0;
  padding: 18px 22px;
  border: 1px solid var(--sl-border-strong);
  border-radius: 12px;
  background: linear-gradient(160deg, var(--vp-c-brand-soft), transparent 75%), var(--sl-surface);
}

.pricing-block-body {
  flex: 1 1 320px;
}

.vp-doc .pricing-block-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.5;
  color: var(--vp-c-text-1);
}

.vp-doc .pricing-block-text {
  margin: 4px 0 0;
  font-size: 14.5px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.vp-doc .pricing-block-btn,
.vp-doc .pricing-block-btn:hover {
  flex: 0 0 auto;
  color: #fff;
  text-decoration: none;
}
</style>
