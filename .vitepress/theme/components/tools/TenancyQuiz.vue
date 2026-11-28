<!--
  "Which Laravel tenancy model fits you?" Eight questions, each answer adds points to a single database
  or to a database per tenant. The weights are shown on the page under "How this quiz works", so keep
  that table in sync with `questions` below. Runs fully in the browser; nothing is sent anywhere.
-->
<script setup lang="ts">
import { computed, reactive } from 'vue';

type Side = 'single' | 'perTenant';

interface Option {
  label: string;
  single: number;
  perTenant: number;
  reason?: { side: Side; text: string };
}

interface Question {
  id: string;
  text: string;
  hint?: string;
  options: Option[];
}

const questions: Question[] = [
  {
    id: 'customers',
    text: 'Who are your customers?',
    options: [
      { label: 'Companies or schools that sign a contract', single: 0, perTenant: 2, reason: { side: 'perTenant', text: 'Business customers often ask where their data lives and expect it kept apart.' } },
      { label: 'Individuals or small teams on a self-serve plan', single: 2, perTenant: 0, reason: { side: 'single', text: 'Self-serve sign-ups with small accounts are cheaper to run in one database.' } },
      { label: 'A mix of both', single: 0, perTenant: 0 },
    ],
  },
  {
    id: 'count',
    text: 'How many tenants do you expect in two years?',
    hint: 'A tenant is one customer account: a company, a school, a workspace.',
    options: [
      { label: 'Under 1,000', single: 0, perTenant: 1 },
      { label: '1,000 to 10,000', single: 1, perTenant: 0 },
      { label: 'Tens of thousands or more, many of them free or tiny', single: 3, perTenant: 0, reason: { side: 'single', text: 'Tens of thousands of mostly tiny accounts means tens of thousands of databases to create, migrate and back up.' } },
    ],
  },
  {
    id: 'isolation',
    text: 'Do customers ask for data isolation, their own backup or export, or a security review?',
    options: [
      { label: 'Yes, often', single: 0, perTenant: 3, reason: { side: 'perTenant', text: 'A separate database is an easy answer to isolation questions, and you can back up, restore or export one customer on its own.' } },
      { label: 'Sometimes', single: 0, perTenant: 1 },
      { label: 'No', single: 1, perTenant: 0 },
    ],
  },
  {
    id: 'cross',
    text: 'Does your product need to query across all tenants, live?',
    hint: 'For example a marketplace, global search, or one user browsing many accounts.',
    options: [
      { label: 'Yes, it is a core feature', single: 3, perTenant: 0, reason: { side: 'single', text: 'Live queries across every tenant are one SQL query in a shared database, and a loop or a copy with a database per tenant.' } },
      { label: 'Only for our own internal reports', single: 1, perTenant: 0 },
      { label: 'No, each account stands alone', single: 0, perTenant: 1 },
    ],
  },
  {
    id: 'sharing',
    text: 'Will tenants share records with each other?',
    options: [
      { label: 'Yes, records move or are shared between accounts', single: 3, perTenant: 0, reason: { side: 'single', text: 'Records shared between accounts are awkward when every account has its own database.' } },
      { label: 'No', single: 0, perTenant: 1 },
    ],
  },
  {
    id: 'hosting',
    text: 'Can your app create databases on your database server?',
    hint: 'Database per tenant runs CREATE DATABASE when a tenant is created.',
    options: [
      { label: 'Yes, we control the database server', single: 0, perTenant: 0 },
      { label: 'Not sure', single: 1, perTenant: 0, reason: { side: 'single', text: 'Check that your database host lets the app create databases before you choose a database per tenant.' } },
      { label: 'No: shared hosting or a fixed number of databases', single: 3, perTenant: 0, reason: { side: 'single', text: 'Without permission to create databases, a database per tenant is not possible on that host.' } },
    ],
  },
  {
    id: 'size',
    text: 'How uneven is the data between your customers?',
    options: [
      { label: 'Some customers will have millions of rows, others very few', single: 0, perTenant: 2, reason: { side: 'perTenant', text: 'Separate databases keep one huge customer from slowing down queries and migrations for small ones.' } },
      { label: 'Roughly the same size, and small', single: 1, perTenant: 0 },
      { label: 'No idea yet', single: 0, perTenant: 0 },
    ],
  },
  {
    id: 'ops',
    text: 'How do you feel about running migrations and backups across many databases?',
    options: [
      { label: 'Fine, as long as it is automated', single: 0, perTenant: 1 },
      { label: 'We would rather run one database', single: 2, perTenant: 0, reason: { side: 'single', text: 'One database means one migration run and one backup, which is simpler for a small team.' } },
    ],
  },
];

const answers = reactive<Record<string, number | null>>(Object.fromEntries(questions.map((q) => [q.id, null])));

const answered = computed(() => questions.filter((q) => answers[q.id] !== null).length);
const complete = computed(() => answered.value === questions.length);

const chosen = computed(() =>
  questions.flatMap((q) => (answers[q.id] === null ? [] : [q.options[answers[q.id] as number]])),
);

const score = computed(() =>
  chosen.value.reduce((total, option) => ({ single: total.single + option.single, perTenant: total.perTenant + option.perTenant }), {
    single: 0,
    perTenant: 0,
  }),
);

const verdict = computed<'single' | 'perTenant' | 'close'>(() => {
  const diff = score.value.perTenant - score.value.single;

  if (Math.abs(diff) <= 1) {
    return 'close';
  }

  return diff > 0 ? 'perTenant' : 'single';
});

const reasons = computed(() => chosen.value.flatMap((option) => (option.reason ? [option.reason] : [])));
const reasonsFor = (side: Side) => reasons.value.filter((reason) => reason.side === side).map((reason) => reason.text);

const blocked = computed(() => answers.hosting === 2);

const reset = () => {
  questions.forEach((q) => (answers[q.id] = null));
};
</script>

<template>
  <div class="tool-card quiz vp-raw">
    <form class="quiz-form" @submit.prevent>
      <fieldset v-for="(question, index) in questions" :key="question.id" class="quiz-question">
        <legend class="quiz-legend">
          <span class="quiz-number">{{ index + 1 }}.</span> {{ question.text }}
        </legend>
        <p v-if="question.hint" class="quiz-hint">{{ question.hint }}</p>
        <div class="quiz-options">
          <label v-for="(option, optionIndex) in question.options" :key="option.label" class="quiz-option" :class="{ 'is-selected': answers[question.id] === optionIndex }">
            <input v-model="answers[question.id]" type="radio" :name="question.id" :value="optionIndex" />
            <span>{{ option.label }}</span>
          </label>
        </div>
      </fieldset>
    </form>

    <div class="quiz-result" aria-live="polite">
      <p v-if="!complete" class="quiz-progress">
        {{ answered }} of {{ questions.length }} answered. Your result appears here when every question has an answer.
      </p>

      <template v-else>
        <p class="tool-eyebrow">Your result</p>

        <p v-if="blocked" class="quiz-verdict">A single database</p>
        <p v-else-if="verdict === 'perTenant'" class="quiz-verdict">A database per tenant</p>
        <p v-else-if="verdict === 'single'" class="quiz-verdict">A single database</p>
        <p v-else class="quiz-verdict">It's a close call</p>

        <p class="quiz-score">
          Points for a single database: <strong>{{ score.single }}</strong> · for a database per tenant: <strong>{{ score.perTenant }}</strong>
        </p>

        <p v-if="blocked" class="quiz-summary">
          Your host can't create databases, which rules out a database per tenant there. Start with one database and a
          <code>tenant_id</code> on every tenant table, or move to a host where you control the database server.
        </p>
        <p v-else-if="verdict === 'perTenant'" class="quiz-summary">
          Your answers point to isolation: customers who care where their data lives, and accounts that grow unevenly.
          Give each tenant its own database, and automate creating, migrating and backing them up from the start.
        </p>
        <p v-else-if="verdict === 'single'" class="quiz-summary">
          Your answers point to scale and sharing: many small accounts, or features that read across tenants.
          Keep every tenant in one database with a <code>tenant_id</code> column, and make that scope impossible to forget.
        </p>
        <p v-else class="quiz-summary">
          Neither model clearly wins for you. Decide on the question that matters most to your buyers: if they ask about
          isolation, pick a database per tenant; if you need live queries across tenants, pick a single database.
        </p>

        <div v-if="reasonsFor('perTenant').length" class="quiz-reasons">
          <p class="quiz-reasons-title">For a database per tenant</p>
          <ul>
            <li v-for="text in reasonsFor('perTenant')" :key="text">{{ text }}</li>
          </ul>
        </div>
        <div v-if="reasonsFor('single').length" class="quiz-reasons">
          <p class="quiz-reasons-title">For a single database</p>
          <ul>
            <li v-for="text in reasonsFor('single')" :key="text">{{ text }}</li>
          </ul>
        </div>

        <button type="button" class="sl-btn sl-btn--secondary quiz-reset" @click="reset">Start again</button>
      </template>
    </div>
  </div>
</template>

<style>
.tool-card {
  margin: 28px 0 36px;
  padding: 22px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
}

@media (max-width: 640px) {
  .tool-card {
    padding: 14px;
  }
}

.tool-eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
}

.quiz-question {
  margin: 0 0 22px;
  padding: 0;
  border: 0;
  min-width: 0;
}

.quiz-legend {
  padding: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--vp-c-text-1);
}

.quiz-number {
  color: var(--vp-c-text-2);
}

.quiz-hint {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}

.quiz-options {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.quiz-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
  font-size: 15px;
  line-height: 1.5;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: border-color 0.15s;
}

.quiz-option:hover {
  border-color: var(--vp-c-text-3);
}

.quiz-option.is-selected {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.quiz-option input {
  flex-shrink: 0;
  margin-top: 4px;
  accent-color: var(--vp-c-brand-1);
}

.quiz-option:focus-within {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.quiz-result {
  padding: 18px 20px;
  border: 1px solid var(--sl-border-strong);
  border-radius: 12px;
  background: var(--vp-c-bg);
}

.quiz-progress {
  margin: 0;
  font-size: 15px;
  color: var(--vp-c-text-2);
}

.quiz-verdict {
  margin: 4px 0 0;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--vp-c-text-1);
}

.quiz-score {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.quiz-summary {
  margin: 12px 0 0;
  font-size: 15.5px;
  line-height: 1.65;
  color: var(--vp-c-text-1);
}

.quiz-summary code {
  font-size: 0.9em;
}

.quiz-reasons {
  margin-top: 14px;
}

.quiz-reasons-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.quiz-reasons ul {
  margin: 6px 0 0;
  padding-left: 20px;
  font-size: 14.5px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.quiz-reset {
  margin-top: 18px;
  cursor: pointer;
}
</style>
