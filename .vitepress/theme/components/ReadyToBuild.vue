<script setup lang="ts">
import { site } from '../../site';
import KitCells from './KitCells.vue';
</script>

<template>
  <section class="sl-section ready" aria-labelledby="ready-title">
    <div class="sl-container">
      <div class="ready-heading">
        <h2 id="ready-title" class="ready-title">Ready to build?</h2>
        <p class="ready-text">Pick your kit, pay once, and start on the part only you can build.</p>
      </div>
      <KitCells />
      <p class="ready-note">{{ site.paymentNote }}</p>
    </div>
  </section>
</template>

<style scoped>
.ready {
  position: relative;
  padding-top: 0;
  overflow: hidden;
}

.ready::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(var(--sl-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--sl-border) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 60% 55% at 50% 30%, #000 20%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 60% 55% at 50% 30%, #000 20%, transparent 75%);
  opacity: 0.7;
  pointer-events: none;
}

.ready .sl-container {
  position: relative;
}

.ready-heading {
  padding: 0 0 48px;
  text-align: center;
}

.ready-title {
  margin: 0;
  border: 0;
  font-size: clamp(36px, 5vw, 56px);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.035em;
  color: var(--vp-c-text-1);
}

.ready-text {
  margin: 14px 0 0;
  font-size: 17px;
  color: var(--vp-c-text-2);
}

.ready-note {
  margin: 20px 0 0;
  font-size: 13px;
  text-align: center;
  color: var(--vp-c-text-3);
}
</style>
