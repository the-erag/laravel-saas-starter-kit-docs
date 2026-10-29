<script setup lang="ts">
import SlIcon, { type IconName } from './SlIcon.vue';

const items: { icon: IconName; title: string; text: string }[] = [
  { icon: 'users', title: 'Demo users for every role', text: 'Sign in as super admin, admin, manager, employee or user and see exactly what each one can do.' },
  { icon: 'terminal', title: 'One-command setup', text: 'composer setup installs everything, creates your .env, runs the migrations and builds the frontend.' },
  { icon: 'layout-grid', title: '25+ finished screens', text: 'Sign-in, dashboard, tenants, users, roles, settings and error pages, designed and connected.' },
  { icon: 'package', title: 'Reusable form parts', text: 'Inputs, selects, password fields, buttons and confirm dialogs that look the same everywhere.' },
  { icon: 'flask', title: '35+ tests included', text: 'Tests for sign-in, tenants and settings tell you right away when a change breaks something.' },
  { icon: 'book', title: 'Docs for every feature', text: 'Step-by-step guides for installing the kit and for every core feature it ships with.' },
];
</script>

<template>
  <section id="features" class="sl-section box" aria-labelledby="out-of-the-box-title">
    <div class="box-glow" aria-hidden="true" />
    <div class="sl-container box-layout">
      <div class="box-intro">
        <p class="sl-eyebrow">What you get</p>
        <h2 id="out-of-the-box-title" class="sl-h2">A working, signed-in app from the first install</h2>
        <p class="sl-lead box-lead">
          Install a kit and you get a real product you can sign in to, not an empty Laravel project. Here is what comes
          in the box.
        </p>
        <a class="sl-link box-link" href="/docs.html">Read the documentation →</a>
      </div>

      <div class="box-grid">
        <div v-for="item in items" :key="item.title" class="box-card">
          <span class="box-icon"><SlIcon :name="item.icon" :size="18" /></span>
          <p class="box-title">{{ item.title }}</p>
          <p class="box-text">{{ item.text }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.box {
  position: relative;
  overflow: hidden;
  border-top: 1px solid var(--sl-border);
}

.box-glow {
  position: absolute;
  top: -180px;
  right: -120px;
  width: 620px;
  height: 620px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--vp-c-brand-soft), transparent 65%);
  pointer-events: none;
}

.box-layout {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  align-items: center;
  gap: 64px;
}

.box-intro .sl-eyebrow {
  display: flex;
  line-height: 1;
}

.box-lead {
  margin-top: 16px;
}






.box-link {
  display: inline-block;
  margin-top: 28px;
}

.box-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--sl-border);
  border-left: 1px solid var(--sl-border);
}

.box-card {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  align-content: start;
  column-gap: 10px;
  padding: 22px 24px;
  border-right: 1px solid var(--sl-border);
  border-bottom: 1px solid var(--sl-border);
  transition: background-color 0.25s ease;
}

.box-card:hover {
  background: var(--sl-surface);
}

.box-icon {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  color: var(--vp-c-text-2);
  transition: color 0.25s ease;
}

.box-card:hover .box-icon {
  color: var(--vp-c-brand-1);
}

.box-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--vp-c-text-1);
}

.box-text {
  grid-column: 1 / -1;
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

@media (max-width: 960px) {
  .box-layout {
    grid-template-columns: 1fr;
    gap: 40px;
  }

}

@media (max-width: 560px) {
  .box-grid {
    grid-template-columns: 1fr;
  }

  .box-glow {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .box-card,
  .box-icon {
    transition: none;
  }

  .box-card:hover {
    transform: none;
  }
}
</style>
