<script setup lang="ts">
import { computed, ref } from 'vue';
import { frameworkKeys, kits, type FrameworkKey } from '../../site';
import FrameworkLogo from './FrameworkLogo.vue';
import SectionHeading from './SectionHeading.vue';
import SlIcon from './SlIcon.vue';

type Node = { name: string; kind: 'dir' | 'file' | 'more'; saas?: boolean; open?: boolean; active?: boolean; children?: Node[] };

const file = (name: string, active = false): Node => ({ name, kind: 'file', active });
const more: Node = { name: '', kind: 'more' };
const dir = (name: string, children: Node[], options: { saas?: boolean; open?: boolean } = {}): Node => ({ name, kind: 'dir', children, ...options });
const saas = (name: string): Node => dir(name, [more], { saas: true });

const kebab = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const frontend = {
  vue: { ext: '.vue', app: 'app.ts', hooks: 'composables', hookFiles: ['useAppearance.ts', 'useInitials.ts', 'useTwoFactorAuth.ts'] },
  react: { ext: '.tsx', app: 'app.tsx', hooks: 'hooks', hookFiles: ['use-appearance.tsx', 'use-initials.tsx', 'use-two-factor-auth.ts'] },
  svelte: { ext: '.svelte', app: 'app.ts', hooks: 'lib', hookFiles: ['theme.svelte.ts', 'initials.ts', 'twoFactorAuth.svelte.ts'] },
};
const framework = ref<FrameworkKey>('vue');

const tree = computed<Node>(() => {
  const fw = frontend[framework.value];
  const page = (base: string, active = false) => file((framework.value === 'react' ? kebab(base) : base) + fw.ext, active);

  return dir('my-saas', [
    dir('app', [
      dir('Concerns', [file('PasswordValidationRules.php'), file('ProfileValidationRules.php')]),
      dir('Http', [
        dir('Controllers', [file('Controller.php')]),
        dir('Middleware', [file('HandleAppearance.php'), file('HandleInertiaRequests.php'), more]),
      ]),
      dir('Models', [file('User.php'), more]),
      dir('Providers', [file('AppServiceProvider.php'), more]),
    ]),
    dir(
      'Modules',
      [
        dir('Auth', [dir('Actions', [file('CreateNewUser.php'), file('ResetUserPassword.php')]), more]),
        saas('Tenant'),
        saas('User'),
        saas('RolePermission'),
        saas('Menu'),
        saas('Notification'),
        saas('Settings'),
        saas('Dashboard'),
      ],
      { saas: true, open: true },
    ),
    dir('config', [file('app.php'), file('auth.php'), file('database.php'), file('fortify.php'), file('inertia.php'), file('session.php'), more]),
    dir('database', [dir('factories', [file('UserFactory.php')]), dir('migrations', [more]), dir('seeders', [file('DatabaseSeeder.php'), more])]),
    dir('lang', [dir('en', [file('auth.php'), file('pagination.php'), file('passwords.php'), file('validation.php'), saas('modules')]), more]),
    dir(
      'resources/js',
      [
        dir('components', [page('AppLogo', true), page('AppShell'), page('AppSidebar'), page('Breadcrumbs'), page('NavMain'), page('UserInfo'), dir('ui', [more]), saas('common'), more], { open: true }),
        dir(fw.hooks, [...fw.hookFiles.map((name) => file(name)), more]),
        dir('layouts', [
          page('AppLayout'),
          page('AuthLayout'),
          dir('app', [page('AppHeaderLayout'), page('AppSidebarLayout')]),
          dir('auth', [page('AuthCardLayout'), page('AuthSimpleLayout'), page('AuthSplitLayout')]),
          dir('settings', [page('Layout')]),
        ]),
        dir(
          'pages',
          [
            dir(
              'auth',
              [page('ConfirmPassword'), page('ForgotPassword'), page('Login'), page('Register'), page('ResetPassword'), page('TwoFactorChallenge'), page('VerifyEmail'), more],
              { open: true },
            ),
            dir('settings', [page('Appearance'), page('Profile'), page('Security'), more]),
            page('Dashboard'),
            saas('tenants'),
            saas('users'),
            saas('roles'),
            saas('setup'),
            saas('notifications'),
          ],
          { open: true },
        ),
        file(fw.app),
      ],
      { open: true },
    ),
    dir('routes', [file('console.php'), file('web.php'), more]),
    dir('tests', [dir('Feature', [dir('Auth', [more]), dir('Settings', [more]), file('DashboardTest.php'), more])]),
    file('AGENTS.md'),
    file('composer.json'),
    file('package.json'),
    file('vite.config.ts'),
  ], { open: true });
});

const closed = ref(new Set<string>());
const opened = ref(new Set<string>());

const isOpen = (path: string, node: Node) => (opened.value.has(path) ? true : closed.value.has(path) ? false : !!node.open);

const toggle = (path: string, node: Node) => {
  const open = isOpen(path, node);
  const nextClosed = new Set(closed.value);
  const nextOpened = new Set(opened.value);
  if (open) {
    nextOpened.delete(path);
    nextClosed.add(path);
  } else {
    nextClosed.delete(path);
    nextOpened.add(path);
  }
  closed.value = nextClosed;
  opened.value = nextOpened;
};

const rows = computed(() => {
  const list: { node: Node; path: string; depth: number; open: boolean }[] = [];
  const walk = (node: Node, path: string, depth: number) => {
    const open = node.kind === 'dir' && isOpen(path, node);
    list.push({ node, path, depth, open });
    if (open) {
      node.children?.forEach((child, index) => walk(child, `${path}/${child.name || `more-${index}`}`, depth + 1));
    }
  };
  walk(tree.value, 'my-saas', 0);
  return list;
});

const setAll = (open: boolean) => {
  const paths: string[] = [];
  const walk = (node: Node, path: string) => {
    if (node.kind !== 'dir') {
      return;
    }
    if (path !== 'my-saas') {
      paths.push(path);
    }
    node.children?.forEach((child, index) => walk(child, `${path}/${child.name || `more-${index}`}`));
  };
  walk(tree.value, 'my-saas');
  opened.value = new Set(open ? paths : []);
  closed.value = new Set(open ? [] : paths);
};

const fileType = (name: string) => {
  if (name.endsWith('.php')) return 'php';
  if (name.endsWith('.vue')) return 'vue';
  if (name.endsWith('.tsx')) return 'react';
  if (name.endsWith('.svelte')) return 'svelte';
  if (name.endsWith('.ts')) return 'ts';
  if (name.endsWith('.json')) return 'json';
  return 'md';
};

const steps = computed(() => [
  { comment: '# 1. Clone your kit from its private repository', lines: [`git clone https://github.com/the-erag/saas-laravel-starter-kit-${framework.value}.git my-saas`, 'cd my-saas'] },
  { comment: '# 2. Keep the kit as upstream, push to your own repo', lines: ['git remote rename origin upstream', 'git remote add origin git@github.com:your-org/my-saas.git'] },
  { comment: '# 3. Install and run', lines: ['composer install && npm install', 'cp .env.example .env && php artisan key:generate', 'php artisan migrate --seed', 'composer run dev'] },
  { comment: '# Later: pull the weekly updates', lines: ['git fetch upstream && git merge upstream/main'] },
]);

const points = [
  { title: 'Full source code', text: 'Nothing is hidden inside a package. Every file in this tree is yours to open and edit.' },
  { title: 'Your own repository', text: 'Push the code to your private repository as origin and build your product on top of it.' },
  { title: 'Updates with one merge', text: 'Keep the kit as upstream and merge the weekly updates when you are ready.' },
];
</script>

<template>
  <section id="customize" class="sl-section customize">
    <div class="sl-container">
      <SectionHeading
        :center="false"
        eyebrow="Customize"
        title="Clone it, own it, customize everything"
        lead="After purchase you get the complete source code in a private GitHub repository. Clone it, push it to your own repository and change anything, from the logo to how new customers are set up."
      />

      <div class="ide">
        <div class="ide-bar">
          <span class="ide-dots" aria-hidden="true"><i /><i /><i /></span>
          <span class="ide-title">my-saas</span>
          <div class="ide-tabs" role="tablist" aria-label="Starter kit">
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

        <div class="ide-body">
          <div class="explorer">
            <div class="explorer-head">
              <span>Explorer</span>
              <div class="explorer-actions">
                <button type="button" title="Expand all" aria-label="Expand all folders" @click="setAll(true)">⊞</button>
                <button type="button" title="Collapse all" aria-label="Collapse all folders" @click="setAll(false)">⊟</button>
              </div>
            </div>
            <div class="explorer-legend">
              <span><i class="legend-dot legend-dot--laravel" />Laravel starter kit, shown in full</span>
              <span><i class="legend-dot legend-dot--saas" />Added by SaaS Laravel</span>
            </div>
            <ul class="tree" role="tree">
              <li
                v-for="row in rows"
                :key="row.path"
                role="treeitem"
                :aria-expanded="row.node.kind === 'dir' ? row.open : undefined"
                class="tree-row"
                :class="[`tree-row--${row.node.kind}`, { 'is-saas': row.node.saas, 'is-active': row.node.active }]"
                :style="{ '--depth': row.depth }"
              >
                <button v-if="row.node.kind === 'dir'" type="button" class="tree-folder" @click="toggle(row.path, row.node)">
                  <span class="tree-chevron" :class="{ 'is-open': row.open }">›</span>
                  <span class="tree-folder-icon" :class="{ 'is-open': row.open }" />
                  <span class="tree-name">{{ row.node.name }}</span>
                  <span v-if="row.node.saas" class="tree-tag">SaaS</span>
                </button>
                <span v-else-if="row.node.kind === 'file'" class="tree-file">
                  <span class="tree-file-icon" :class="`is-${fileType(row.node.name)}`" />
                  <span class="tree-name">{{ row.node.name }}</span>
                  <span v-if="row.node.active" class="tree-hint">your logo</span>
                </span>
                <span v-else class="tree-more" aria-label="More files">• • •</span>
              </li>
            </ul>
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
.customize {
  padding-top: 24px;
  scroll-margin-top: var(--vp-nav-height, 64px);
}

.ide {
  overflow: hidden;
  border: 1px solid #27272a;
  border-radius: var(--sl-radius);
  background: #0b0b0f;
  box-shadow: var(--sl-shadow-lg);
}

.ide-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-bottom: 1px solid #27272a;
  background: #121217;
}

.ide-dots {
  display: inline-flex;
  gap: 6px;
}

.ide-dots i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff5f57;
}

.ide-dots i:nth-child(2) {
  background: #febc2e;
}

.ide-dots i:nth-child(3) {
  background: #28c840;
}

.ide-title {
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: #71717a;
}

.ide-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-left: auto;
}

.ide-tabs button {
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

.ide-tabs button:hover {
  color: #fafafa;
}

.ide-tabs button.active {
  background: #27272a;
  color: #fafafa;
}

.ide-body {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  height: 540px;
}

.explorer {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid #27272a;
  background: #101015;
}

.explorer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 6px 16px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #71717a;
}

.explorer-actions {
  display: flex;
  gap: 2px;
}

.explorer-actions button {
  width: 24px;
  height: 22px;
  border-radius: 5px;
  font-size: 14px;
  line-height: 1;
  color: #a1a1aa;
}

.explorer-actions button:hover {
  color: #fafafa;
  background: #27272a;
}

.explorer-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  padding: 0 16px 10px;
  border-bottom: 1px solid #1f1f26;
  font-size: 11.5px;
  color: #a1a1aa;
}

.explorer-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot--laravel {
  background: #d4d4d8;
}

.legend-dot--saas {
  background: #a78bfa;
}

.tree {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 8px 8px 16px;
  overflow-y: auto;
  list-style: none;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  scrollbar-width: thin;
  scrollbar-color: #3f3f46 transparent;
}

.tree-row {
  margin: 0;
  padding-left: calc(var(--depth) * 14px);
}

.tree-folder,
.tree-file,
.tree-more {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 3px 8px;
  border-radius: 6px;
  line-height: 1.5;
  white-space: nowrap;
  text-align: left;
}

.tree-folder {
  color: #e4e4e7;
  cursor: pointer;
}

.tree-folder:hover,
.tree-file:hover {
  background: #1c1c24;
}

.tree-chevron {
  display: inline-block;
  width: 10px;
  color: #71717a;
  transition: transform 0.2s;
}

.tree-chevron.is-open {
  transform: rotate(90deg);
}

.tree-folder-icon {
  width: 14px;
  height: 11px;
  border-radius: 2px;
  background: #71717a;
  clip-path: polygon(0 0, 40% 0, 50% 18%, 100% 18%, 100% 100%, 0 100%);
}

.is-saas > .tree-folder .tree-folder-icon {
  background: #a78bfa;
}

.is-saas > .tree-folder .tree-name {
  color: #c4b5fd;
}

.tree-tag {
  padding: 0 6px;
  border-radius: 4px;
  font-family: var(--vp-font-family-base);
  font-size: 10px;
  font-weight: 600;
  color: #c4b5fd;
  background: rgba(167, 139, 250, 0.14);
}

.tree-file {
  padding-left: 24px;
  color: #a1a1aa;
}

.tree-file-icon {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: #71717a;
}

.tree-file-icon.is-php {
  background: #818cf8;
}

.tree-file-icon.is-vue {
  background: #41b883;
}

.tree-file-icon.is-react {
  background: #38bdf8;
}

.tree-file-icon.is-svelte {
  background: #ff3e00;
}

.tree-file-icon.is-ts {
  background: #3b82f6;
}

.tree-file-icon.is-json {
  background: #facc15;
}

.is-active > .tree-file {
  color: #fafafa;
  background: rgba(167, 139, 250, 0.16);
}

.tree-hint {
  padding: 0 6px;
  border-radius: 4px;
  font-family: var(--vp-font-family-base);
  font-size: 10px;
  color: #c4b5fd;
  background: rgba(167, 139, 250, 0.14);
}

.tree-more {
  padding-left: 26px;
  letter-spacing: 0.2em;
  color: #52525b;
}

.terminal-body {
  margin: 0;
  padding: 20px 22px;
  overflow: auto;
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
  .ide-body {
    grid-template-columns: 1fr;
    grid-template-rows: 380px auto;
    height: auto;
  }

  .explorer {
    border-right: 0;
    border-bottom: 1px solid #27272a;
  }

  .ide-title {
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
