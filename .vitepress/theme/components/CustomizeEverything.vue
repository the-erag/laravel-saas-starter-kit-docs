<script setup lang="ts">
import { computed, ref } from 'vue';
import { frameworkKeys, kits, type FrameworkKey } from '../../site';
import FrameworkLogo from './FrameworkLogo.vue';
import SectionHeading from './SectionHeading.vue';
import SlIcon from './SlIcon.vue';

const tree: { name: string; depth: number; folder?: boolean; active?: boolean }[] = [
  { name: 'my-saas', depth: 0, folder: true },
  { name: 'app', depth: 1, folder: true },
  { name: 'Modules', depth: 1, folder: true },
  { name: 'Tenant', depth: 2, folder: true },
  { name: 'User', depth: 2, folder: true },
  { name: 'config', depth: 1, folder: true },
  { name: 'database', depth: 1, folder: true },
  { name: 'lang', depth: 1, folder: true },
  { name: 'resources/js', depth: 1, folder: true },
  { name: 'components', depth: 2, folder: true },
  { name: 'AppLogo', depth: 3, active: true },
  { name: 'layouts', depth: 2, folder: true },
  { name: 'pages', depth: 2, folder: true },
  { name: 'routes', depth: 1, folder: true },
  { name: 'tests', depth: 1, folder: true },
];

const framework = ref<FrameworkKey>('vue');

const steps = computed(() => [
  { comment: '# 1. Clone your kit from its private repository', lines: [`git clone https://github.com/the-erag/saas-laravel-starter-kit-${framework.value}.git my-saas`, 'cd my-saas'] },
  { comment: '# 2. Keep the kit as upstream, push to your own repo', lines: ['git remote rename origin upstream', 'git remote add origin git@github.com:your-org/my-saas.git'] },
  { comment: '# 3. Install and run', lines: ['composer install && npm install', 'cp .env.example .env && php artisan key:generate', 'php artisan migrate --seed', 'composer run dev'] },
  { comment: '# Later: pull the weekly updates', lines: ['git fetch upstream && git merge upstream/main'] },
]);

const points = [
  { title: 'Full source code', text: 'No package to extend and no locked core. Every controller, service, page and translation is a file you can edit.' },
  { title: 'Your own repository', text: 'Push the code to your private repository as origin and build your product on top of it.' },
  { title: 'Updates with one merge', text: 'Keep the kit as upstream and merge the weekly updates when you are ready.' },
];
</script>

<template>
  <section class="sl-section">
    <div class="sl-container">
      <SectionHeading
        :center="false"
        eyebrow="Customize"
        title="Clone it, own it, customize everything"
        lead="After purchase you get the complete source code in a private GitHub repository. Clone it, push it to your own repository and change anything, from the logo to the tenant pipeline."
      />

      <div class="custom">
        <div class="tree" aria-hidden="true">
          <div
            v-for="(item, index) in tree"
            :key="`${item.name}-${index}`"
            class="tree-item"
            :class="{ 'tree-item--folder': item.folder, 'tree-item--active': item.active }"
            :style="{ paddingLeft: `${12 + item.depth * 16}px` }"
          >
            <span class="tree-icon">{{ item.folder ? '▾' : '·' }}</span>{{ item.name }}
          </div>
        </div>

        <div class="terminal">
          <div class="terminal-bar">
            <span class="terminal-dots" aria-hidden="true"><i /><i /><i /></span>
            <div class="terminal-tabs" role="tablist" aria-label="Starter kit">
              <button
                v-for="key in frameworkKeys"
                :key="key"
                type="button"
                role="tab"
                :aria-selected="framework === key"
                :class="{ active: framework === key }"
                @click="framework = key"
              >
                <FrameworkLogo :name="key" :size="13" />
                {{ kits[key].title.replace(' Starter Kit', '') }}
              </button>
            </div>
          </div>
          <pre class="terminal-body"><code><template v-for="step in steps" :key="step.comment"><span class="terminal-comment">{{ step.comment }}</span>
<template v-for="line in step.lines" :key="line"><span class="terminal-prompt">$ </span>{{ line }}
</template>
</template></code></pre>
        </div>
      </div>

      <div class="points">
        <div v-for="point in points" :key="point.title" class="point">
          <span class="point-icon"><SlIcon name="check" :size="14" /></span>
          <div>
            <h3 class="point-title">{{ point.title }}</h3>
            <p class="sl-text point-text">{{ point.text }}</p>
          </div>
        </div>
      </div>

      <p class="links">
        <a class="sl-link" href="/docs/getting-started/installation.html">Installation guide →</a>
        <a class="sl-link" href="/docs/purchase/updates.html">How updates work →</a>
      </p>
    </div>
  </section>
</template>

<style scoped>
.custom {
  display: grid;
  grid-template-columns: minmax(0, 0.55fr) minmax(0, 1.45fr);
  gap: 20px;
}

.tree {
  padding: 16px 8px;
  border: 1px solid var(--sl-border);
  border-radius: var(--sl-radius);
  background: var(--sl-surface);
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 3px;
  padding-right: 12px;
  padding-bottom: 3px;
  line-height: 1.5;
  border-radius: 6px;
  white-space: nowrap;
}

.tree-item--folder {
  color: var(--vp-c-text-1);
}

.tree-item--active {
  background: var(--vp-c-brand-soft);
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.tree-icon {
  width: 10px;
  color: var(--vp-c-text-3);
}

.terminal {
  overflow: hidden;
  border: 1px solid #27272a;
  border-radius: var(--sl-radius);
  background: #0b0b0f;
  box-shadow: var(--sl-shadow-lg);
}

.terminal-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-bottom: 1px solid #27272a;
  background: #121217;
}

.terminal-dots {
  display: inline-flex;
  gap: 6px;
}

.terminal-dots i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #3f3f46;
}

.terminal-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.terminal-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
  color: #a1a1aa;
  transition: background-color 0.2s, color 0.2s;
}

.terminal-tabs button:hover {
  color: #fafafa;
}

.terminal-tabs button.active {
  background: #27272a;
  color: #fafafa;
}

.terminal-body {
  margin: 0;
  padding: 20px 22px;
  overflow-x: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.75;
  color: #e4e4e7;
  white-space: pre;
}

.terminal-comment {
  color: #71717a;
}

.terminal-prompt {
  color: #a78bfa;
  user-select: none;
}

.points {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-top: 28px;
}

.point {
  display: flex;
  gap: 12px;
}

.point-icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 24px;
  height: 24px;
  margin-top: 1px;
  border-radius: 50%;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.point-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.point-text {
  margin-top: 4px;
  font-size: 14px;
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-top: 24px;
}

@media (max-width: 960px) {
  .custom {
    grid-template-columns: 1fr;
  }

  .tree {
    display: none;
  }

  .points {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .terminal-body {
    padding: 16px;
    font-size: 12px;
  }
}
</style>
