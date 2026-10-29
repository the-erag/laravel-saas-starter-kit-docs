<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import FrameworkLogo from './FrameworkLogo.vue';

const props = withDefaults(defineProps<{ active?: boolean }>(), { active: true });

type Kit = 'vue' | 'react' | 'svelte';
type Line = { kind: 'read' | 'create' | 'update' | 'code' | 'run' | 'pass' | 'done'; text: string; meta?: string };

const sessions: { kit: Kit; label: string; prompt: string; lines: Line[] }[] = [
  {
    kit: 'vue',
    label: 'Vue',
    prompt: 'Add a Billing module with a Plans page for every tenant',
    lines: [
      { kind: 'read', text: 'AGENTS.md' },
      { kind: 'read', text: '.claude/skills/laravel-tenancy/SKILL.md' },
      { kind: 'read', text: '.claude/skills/inertia-vue-development/SKILL.md' },
      { kind: 'create', text: 'Modules/Billing/Services/PlanService.php', meta: '+48' },
      { kind: 'code', text: '+ final class PlanService' },
      { kind: 'code', text: '+     public function create(PlanData $data): Plan' },
      { kind: 'create', text: 'Modules/Billing/Data/PlanData.php', meta: '+31' },
      { kind: 'create', text: 'Modules/Billing/routes/tenant.php', meta: '+12' },
      { kind: 'create', text: 'resources/js/pages/billing/Plans.vue', meta: '+96' },
      { kind: 'update', text: 'config/permissions/tenant/billing.php', meta: '+9' },
      { kind: 'update', text: 'lang/*/modules/billing.php', meta: '17 languages' },
      { kind: 'run', text: 'php artisan test --filter=Billing' },
      { kind: 'pass', text: '6 passed' },
      { kind: 'done', text: 'Billing is ready. Plans page added to the tenant menu.' },
    ],
  },
  {
    kit: 'react',
    label: 'React',
    prompt: 'Add a Projects page where each tenant manages its own projects',
    lines: [
      { kind: 'read', text: 'AGENTS.md' },
      { kind: 'read', text: '.claude/skills/laravel-tenancy/SKILL.md' },
      { kind: 'read', text: '.claude/skills/inertia-react-development/SKILL.md' },
      { kind: 'create', text: 'Modules/Project/Services/ProjectService.php', meta: '+52' },
      { kind: 'code', text: '+ final class ProjectService' },
      { kind: 'code', text: '+     public function create(ProjectData $data): Project' },
      { kind: 'create', text: 'Modules/Project/Data/ProjectData.php', meta: '+28' },
      { kind: 'create', text: 'Modules/Project/routes/tenant.php', meta: '+14' },
      { kind: 'create', text: 'resources/js/pages/projects/index.tsx', meta: '+112' },
      { kind: 'update', text: 'config/permissions/tenant/projects.php', meta: '+11' },
      { kind: 'update', text: 'lang/*/modules/project.php', meta: '17 languages' },
      { kind: 'run', text: 'php artisan test --filter=Project' },
      { kind: 'pass', text: '8 passed' },
      { kind: 'done', text: 'Projects are ready. Page added to the tenant menu.' },
    ],
  },
  {
    kit: 'svelte',
    label: 'Svelte',
    prompt: 'Add support tickets that tenant admins can assign to their team',
    lines: [
      { kind: 'read', text: 'AGENTS.md' },
      { kind: 'read', text: '.claude/skills/laravel-tenancy/SKILL.md' },
      { kind: 'read', text: '.claude/skills/inertia-svelte-development/SKILL.md' },
      { kind: 'create', text: 'Modules/Ticket/Services/TicketService.php', meta: '+57' },
      { kind: 'code', text: '+ final class TicketService' },
      { kind: 'code', text: '+     public function assign(Ticket $ticket, User $user): void' },
      { kind: 'create', text: 'Modules/Ticket/Data/TicketData.php', meta: '+34' },
      { kind: 'create', text: 'Modules/Ticket/routes/tenant.php', meta: '+16' },
      { kind: 'create', text: 'resources/js/pages/tickets/Index.svelte', meta: '+104' },
      { kind: 'update', text: 'config/permissions/tenant/tickets.php', meta: '+10' },
      { kind: 'update', text: 'lang/*/modules/ticket.php', meta: '17 languages' },
      { kind: 'run', text: 'php artisan test --filter=Ticket' },
      { kind: 'pass', text: '7 passed' },
      { kind: 'done', text: 'Tickets are ready. Assign them from the tenant workspace.' },
    ],
  },
];

const moods = ['Thinking', 'Reading the guidelines', 'Cooking', 'Wiring permissions', 'Translating', 'Running tests'];
const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const root = ref<HTMLElement | null>(null);
const index = ref(0);
const typed = ref('');
const shown = ref(0);
const phase = ref<'typing' | 'working' | 'done'>('typing');
const frame = ref(0);
const seconds = ref(0);

const session = computed(() => sessions[index.value]);
const mood = computed(() => moods[Math.min(Math.floor(shown.value / 2.5), moods.length - 1)]);

let timers: number[] = [];
let spin = 0;
let clock = 0;
let visible = false;
let started = false;
let observer: IntersectionObserver | null = null;

const later = (ms: number, fn: () => void) => {
  timers.push(window.setTimeout(fn, ms));
};

const clear = () => {
  timers.forEach((timer) => window.clearTimeout(timer));
  timers = [];
  window.clearInterval(spin);
  window.clearInterval(clock);
};

const play = () => {
  clear();
  const { prompt, lines } = session.value;
  typed.value = '';
  shown.value = 0;
  seconds.value = 0;
  phase.value = 'typing';

  let at = 400;
  for (let i = 1; i <= prompt.length; i++) {
    later(at, () => (typed.value = prompt.slice(0, i)));
    at += 32;
  }

  later(at + 300, () => {
    phase.value = 'working';
    spin = window.setInterval(() => (frame.value = (frame.value + 1) % spinner.length), 80);
    clock = window.setInterval(() => seconds.value++, 1000);
  });
  at += 1500;

  lines.forEach((line, lineIndex) => {
    at += line.kind === 'code' ? 180 : line.kind === 'pass' ? 900 : 520;
    later(at, () => (shown.value = lineIndex + 1));
  });

  later(at + 200, () => {
    phase.value = 'done';
    window.clearInterval(spin);
    window.clearInterval(clock);
  });

  later(at + 4200, () => {
    index.value = (index.value + 1) % sessions.length;
    play();
  });
};

const pick = (next: number) => {
  index.value = next;
  if (visible) {
    play();
  }
};

const showAll = () => {
  typed.value = session.value.prompt;
  shown.value = session.value.lines.length;
  phase.value = 'done';
};

const update = () => {
  const run = visible && props.active;
  if (run && !started) {
    started = true;
    play();
  } else if (!run && started) {
    started = false;
    clear();
    showAll();
  }
};

watch(() => props.active, update);

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    showAll();
    return;
  }

  observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      update();
    },
    { threshold: 0.3 },
  );
  if (root.value) {
    observer.observe(root.value);
  }
});

onBeforeUnmount(() => {
  clear();
  observer?.disconnect();
});
</script>

<template>
  <div ref="root" class="term">
    <div class="term-bar">
      <span class="term-dots" aria-hidden="true"><i /><i /><i /></span>
      <span class="term-title">ai agent — ~/saas</span>
      <div class="term-kits" role="tablist" aria-label="Starter kit">
        <button
          v-for="(item, itemIndex) in sessions"
          :key="item.kit"
          type="button"
          role="tab"
          :aria-selected="itemIndex === index"
          :class="{ 'is-active': itemIndex === index }"
          @click="pick(itemIndex)"
        >
          <FrameworkLogo :name="item.kit" :size="12" />{{ item.label }}
        </button>
      </div>
    </div>

    <div class="term-body">
      <p class="term-prompt">
        <span class="term-caret">›</span><span>{{ typed }}</span><span v-if="phase === 'typing'" class="term-cursor" />
      </p>

      <TransitionGroup tag="div" name="term-line" class="term-lines">
        <p v-for="line in session.lines.slice(0, shown)" :key="`${session.kit}-${line.kind}-${line.text}`" :class="`term-line term-${line.kind}`">
          <template v-if="line.kind === 'code'">{{ line.text }}</template>
          <template v-else-if="line.kind === 'pass'"><b>✓</b> Tests {{ line.text }}</template>
          <template v-else-if="line.kind === 'done'"><b>✓</b> {{ line.text }}</template>
          <template v-else>
            <b>●</b>
            <em>{{ line.kind === 'read' ? 'Read' : line.kind === 'create' ? 'Create' : line.kind === 'update' ? 'Update' : 'Run' }}</em>
            <span>{{ line.text }}</span>
            <small v-if="line.meta">{{ line.meta }}</small>
          </template>
        </p>
      </TransitionGroup>

      <p v-if="phase === 'working'" class="term-status">
        <span class="term-spinner">{{ spinner[frame] }}</span>{{ mood }}…<small>{{ seconds }}s</small>
      </p>
    </div>
  </div>
</template>

<style scoped>
.term {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: #0d0d12;
  box-shadow: var(--sl-shadow-lg);
  color: #d4d4d8;
}

.term-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  background: #15151c;
}

.term-dots {
  display: inline-flex;
  gap: 6px;
}

.term-dots i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff5f57;
}

.term-dots i:nth-child(2) {
  background: #febc2e;
}

.term-dots i:nth-child(3) {
  background: #28c840;
}

.term-title {
  flex: 1;
  overflow: hidden;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: #71717a;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.term-kits {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background: #0d0d12;
}

.term-kits button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  color: #a1a1aa;
  transition: background-color 0.25s, color 0.25s;
}

.term-kits button.is-active {
  color: #fafafa;
  background: #26262f;
}

.term-body {
  height: 470px;
  padding: 20px 22px;
  overflow: hidden;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  line-height: 1.7;
}

.term-body p {
  margin: 0;
}

.term-prompt {
  display: flex;
  gap: 10px;
  margin-bottom: 14px !important;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fafafa;
  background: #15151c;
}

.term-caret {
  color: #a78bfa;
}

.term-cursor {
  display: inline-block;
  width: 7px;
  height: 15px;
  margin-left: 2px;
  vertical-align: -3px;
  background: #a78bfa;
  animation: term-blink 1s steps(1) infinite;
}

.term-lines {
  display: grid;
}

.term-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  white-space: nowrap;
}

.term-line b {
  font-weight: 400;
}

.term-line em {
  font-style: normal;
  font-weight: 600;
}

.term-line span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.term-line small {
  margin-left: auto;
  padding-left: 10px;
  font-size: 11.5px;
  color: #71717a;
}

.term-read {
  color: #a1a1aa;
}

.term-read b {
  color: #60a5fa;
}

.term-create b,
.term-create em {
  color: #4ade80;
}

.term-create small {
  color: #4ade80;
}

.term-update b,
.term-update em {
  color: #fbbf24;
}

.term-run b,
.term-run em {
  color: #c084fc;
}

.term-code {
  margin-left: 18px;
  white-space: pre;
  padding-left: 10px;
  border-left: 2px solid rgba(74, 222, 128, 0.35);
  color: #86efac;
  background: rgba(74, 222, 128, 0.06);
}

.term-pass {
  margin-left: 18px;
  color: #4ade80;
}

.term-done {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  color: #fafafa;
  white-space: normal;
  background: rgba(74, 222, 128, 0.12);
}

.term-done b {
  color: #4ade80;
}

.term-status {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px !important;
  color: #fbbf24;
}

.term-spinner {
  width: 12px;
  color: #a78bfa;
}

.term-status small {
  font-size: 11.5px;
  color: #71717a;
}

.term-line-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.term-line-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

@keyframes term-blink {
  50% {
    opacity: 0;
  }
}

@media (max-width: 560px) {
  .term-title {
    display: none;
  }

  .term-body {
    height: 440px;
    padding: 16px;
    font-size: 11px;
  }

  .term-line small {
    display: none;
  }
}
</style>
