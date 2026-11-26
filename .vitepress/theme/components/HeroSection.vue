<script setup lang="ts">
import { formatPrice, site } from '../../site';
import HeroShowcase from './HeroShowcase.vue';
import HeroStack from './HeroStack.vue';
import SlIcon from './SlIcon.vue';

// VitePress jumps to same-page anchors; these two buttons scroll smoothly instead (the router skips prevented clicks).
const scrollToSection = (event: MouseEvent, id: string) => {
  const target = document.getElementById(id);

  if (!target) {
    return;
  }

  event.preventDefault();
  const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--vp-nav-height'), 10) || 64;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - navHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  history.pushState(null, '', `#${id}`);
};
</script>

<template>
  <section class="hero">
    <div class="hero-glow" />
    <div class="hero-grid-bg" />
    <div class="sl-container hero-inner">
      <div class="hero-copy sl-reveal">
        <a href="/releases.html" class="sl-pill hero-pill">
          <span class="hero-pill-dot" />Now on Laravel 13
          <span class="vpi-arrow-right hero-pill-arrow" />
        </a>
        <h1 class="sl-h1">
          Laravel 13 SaaS Starter Kits for <span class="sl-gradient-text">Multi-Tenant</span> Apps
        </h1>
        <p class="sl-lead">
          SaaS Laravel is a Laravel 13 multi-tenant SaaS starter kit where every customer gets their own database, with sign-in, users,
          roles and permissions already working. It's for developers and small teams building a SaaS with Vue, React,
          Svelte or Livewire who don't want to build that foundation from scratch.
        </p>
        <div class="sl-actions hero-actions">
          <a class="sl-btn sl-btn--primary sl-btn--lg" href="/pricing.html">
            Get the kit — from {{ formatPrice(site.kitPriceFrom) }} <span class="vpi-arrow-right" />
          </a>
          <a class="sl-btn sl-btn--secondary sl-btn--lg" href="#preview" @click="scrollToSection($event, 'preview')">See it live</a>
        </div>
        <p class="hero-note"><span>One-time payment</span> · <span>Lifetime access</span> · <span>Weekly updates</span></p>
        <a class="hero-tree-link" href="#customize">
          <SlIcon name="code" :size="15" />
          See the folder structure and how easy it is to customize
          <span class="vpi-arrow-right hero-tree-arrow" />
        </a>
      </div>
      <div class="hero-visual sl-reveal">
        <HeroShowcase />
      </div>
    </div>
    <div class="sl-container hero-frameworks sl-reveal">
      <span class="hero-plus hero-plus--tl" aria-hidden="true" />
      <span class="hero-plus hero-plus--tr" aria-hidden="true" />
      <span class="hero-plus hero-plus--bl" aria-hidden="true" />
      <span class="hero-plus hero-plus--br" aria-hidden="true" />
      <span class="hero-frameworks-label">Built on</span>
      <HeroStack />
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  padding: 72px 0 24px;
  overflow: hidden;
}

.hero-glow {
  position: absolute;
  inset: -160px 0 auto;
  height: 720px;
  background: var(--sl-glow);
  pointer-events: none;
}

.hero-grid-bg {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(var(--sl-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--sl-border) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 75%);
  opacity: 0.6;
  pointer-events: none;
}

/* The hero runs a little wider than other sections so the kit preview has room. */
.hero-inner,
.hero-frameworks {
  max-width: 1320px;
}

.hero-inner {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
  align-items: center;
  gap: 48px;
}

.hero-pill {
  margin-bottom: 24px;
  text-decoration: none;
  transition: border-color 0.2s;
}

.hero-pill:hover {
  border-color: var(--sl-border-strong);
}

.hero-pill-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--sl-success);
  box-shadow: 0 0 0 3px var(--sl-success-soft);
}

.hero-pill-arrow {
  width: 14px;
  height: 14px;
}

.hero-actions {
  margin-top: 32px;
}

.hero-tree-link {
  display: flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  margin-top: 22px;
  font-size: 14.5px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.2s;
}

.hero-tree-link :deep(.sl-icon) {
  color: var(--vp-c-brand-1);
}

.hero-tree-link:hover {
  color: var(--vp-c-brand-1);
}

.hero-tree-arrow {
  width: 14px;
  height: 14px;
  transition: transform 0.2s;
}

.hero-tree-link:hover .hero-tree-arrow {
  transform: translateX(3px);
}

.hero-note {
  margin: 14px 0 0;
  font-size: 13.5px;
  color: var(--vp-c-text-3);
}

.hero-note span {
  white-space: nowrap;
}

.hero-frameworks {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 84px;
  margin-top: 56px;
  padding-top: 0;
  padding-bottom: 0;
  border-top: 1px solid var(--sl-border);
  border-bottom: 1px solid var(--sl-border);
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.hero-frameworks::before,
.hero-frameworks::after {
  content: '';
  position: absolute;
  top: -12px;
  bottom: -12px;
  width: 1px;
  background: var(--sl-border-strong);
  opacity: 0.5;
  pointer-events: none;
}

.hero-frameworks::before {
  left: -0.5px;
}

.hero-frameworks::after {
  right: -0.5px;
}

.hero-plus {
  position: absolute;
  width: 11px;
  height: 11px;
  pointer-events: none;
}

.hero-plus::before,
.hero-plus::after {
  content: '';
  position: absolute;
  background: var(--vp-c-brand-1);
}

.hero-plus::before {
  top: 5px;
  left: 0;
  width: 11px;
  height: 1px;
}

.hero-plus::after {
  top: 0;
  left: 5px;
  width: 1px;
  height: 11px;
}

.hero-plus--tl {
  top: -6px;
  left: -6px;
}

.hero-plus--tr {
  top: -6px;
  right: -6px;
}

.hero-plus--bl {
  bottom: -6px;
  left: -6px;
}

.hero-plus--br {
  right: -6px;
  bottom: -6px;
}

.hero-frameworks-label {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  align-self: stretch;
  padding: 0 28px 0 4px;
  border-right: 1px solid var(--sl-border);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
}

.hero-visual {
  position: relative;
  animation-delay: 0.12s;
}




@media (max-width: 1180px) {
  .hero-inner {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
    gap: 40px;
  }
}

@media (max-width: 960px) {
  .hero {
    padding: 48px 0 16px;
  }

  .hero-inner {
    grid-template-columns: 1fr;
    gap: 48px;
  }
}

@media (max-width: 480px) {
  .hero-actions .sl-btn {
    width: 100%;
  }

  .hero-note {
    text-align: center;
  }
}

@media (max-width: 560px) {
  .hero-frameworks {
    flex-wrap: wrap;
  }

  .hero-plus,
  .hero-frameworks::before,
  .hero-frameworks::after {
    display: none;
  }

  .hero-frameworks .hero-stack {
    min-height: 64px;
  }

  .hero-frameworks-label {
    width: 100%;
    padding: 14px 0 0;
    border-right: 0;
  }
}
</style>
