<!--
  Laravel SaaS hosting cost calculator. Prices are list prices read on each provider's pricing page
  (see `pricesCheckedOn`); the sizing rules are our own assumptions. The page explains both under
  "How this calculator works", so keep that section in sync with the numbers and rules below.
  Runs fully in the browser; nothing is sent anywhere.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';

const pricesCheckedOn = '27 November 2026';

type Stack = 'forge' | 'droplet' | 'cloud';
type Email = 'postmark' | 'ses';

/** DigitalOcean Basic (Regular) Droplets, $/month. */
const droplet: Record<number, number> = { 1: 6, 2: 12, 4: 24, 8: 48, 16: 96 };
const dropletBackupShare = { weekly: 0.2, daily: 0.3 };
const spacesBase = 5;

const forgePlans = { hobby: 12, growth: 19 };

/** Laravel Cloud compute, monthly cap per instance. */
const cloudCompute = [
  { name: 'Flex 1 GiB', price: 12 },
  { name: 'Flex 2 GiB', price: 24 },
  { name: 'Pro 4 GiB', price: 32 },
  { name: 'Pro 8 GiB', price: 64 },
  { name: 'Pro 16 GiB', price: 128 },
];
const cloudPlans = { starter: 5, starterCredit: 5, growth: 20 };

/** Our sizing assumption: app server RAM (GiB) by daily active users across all tenants. */
const appTiers = [
  { maxUsers: 200, ram: 2 },
  { maxUsers: 1000, ram: 4 },
  { maxUsers: 5000, ram: 8 },
  { maxUsers: 20000, ram: 16 },
];
const ramSteps = [1, 2, 4, 8, 16];

const tenants = ref(50);
const dailyUsers = ref(300);
const emails = ref(3000);
const stack = ref<Stack>('forge');
const emailProvider = ref<Email>('postmark');

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const usersTier = computed(() => {
  const users = clamp(dailyUsers.value, 1, 1_000_000);
  const index = appTiers.findIndex((tier) => users <= tier.maxUsers);

  return index === -1 ? appTiers.length - 1 : index;
});

const tooBig = computed(() => clamp(dailyUsers.value, 1, 1_000_000) > 20000 || clamp(tenants.value, 1, 1_000_000) > 5000);

const stepUp = (ram: number) => ramSteps[Math.min(ramSteps.length - 1, ramSteps.indexOf(ram) + 1)];

const separateDatabase = computed(() => clamp(tenants.value, 1, 1_000_000) > 50 || clamp(dailyUsers.value, 1, 1_000_000) > 1000);
const separateWorker = computed(() => clamp(dailyUsers.value, 1, 1_000_000) > 1000);

const databaseRam = computed(() => {
  const count = clamp(tenants.value, 1, 1_000_000);
  const users = clamp(dailyUsers.value, 1, 1_000_000);

  if (count <= 200 && users <= 1000) {
    return 4;
  }

  return count <= 1000 && users <= 5000 ? 8 : 16;
});

const emailCost = computed(() => {
  const count = clamp(emails.value, 0, 10_000_000);

  if (emailProvider.value === 'ses') {
    return (count / 1000) * 0.1;
  }

  if (count <= 100) {
    return 0;
  }

  return 15 + Math.ceil(Math.max(0, count - 10000) / 1000) * 1.8;
});

interface Line {
  label: string;
  amount: number;
}

const serverScenario = (headroom: boolean): Line[] => {
  const appRam = headroom ? stepUp(appTiers[usersTier.value].ram) : appTiers[usersTier.value].ram;
  const lines: Line[] = [{ label: `App server, ${appRam} GiB droplet`, amount: droplet[appRam] }];
  let servers = 1;
  let backedUp = droplet[appRam];

  if (separateDatabase.value) {
    const dbRam = headroom ? stepUp(databaseRam.value) : databaseRam.value;
    lines.push({ label: `MySQL server, ${dbRam} GiB droplet`, amount: droplet[dbRam] });
    servers++;
    backedUp += droplet[dbRam];
  }

  if (separateWorker.value) {
    lines.push({ label: 'Queue worker, 2 GiB droplet', amount: droplet[2] });
    servers++;
  }

  const share = headroom ? dropletBackupShare.daily : dropletBackupShare.weekly;
  lines.push({ label: `Droplet backups, ${headroom ? 'daily (30%)' : 'weekly (20%)'}`, amount: backedUp * share });
  lines.push({ label: 'Offsite database dumps, Spaces', amount: spacesBase });

  if (stack.value === 'forge') {
    lines.push({ label: servers > 1 ? 'Laravel Forge Growth' : 'Laravel Forge Hobby', amount: servers > 1 ? forgePlans.growth : forgePlans.hobby });
  }

  return lines;
};

const cloudScenario = (headroom: boolean): Line[] => {
  const index = Math.min(cloudCompute.length - 1, usersTier.value + 1 + (headroom ? 1 : 0));
  const app = cloudCompute[index];
  const starter = !headroom && index <= 1 && !separateWorker.value;
  const lines: Line[] = [
    { label: starter ? 'Cloud Starter plan, minus $5 usage credit' : 'Cloud Growth plan', amount: starter ? cloudPlans.starter - cloudPlans.starterCredit : cloudPlans.growth },
    { label: `App compute, ${app.name} (always awake)`, amount: app.price },
  ];

  if (separateWorker.value || headroom) {
    lines.push({ label: 'Queue worker compute, Flex 1 GiB', amount: cloudCompute[0].price });
  }

  return lines;
};

const lines = (headroom: boolean): Line[] => [
  ...(stack.value === 'cloud' ? cloudScenario(headroom) : serverScenario(headroom)),
  { label: emailProvider.value === 'ses' ? 'Email, Amazon SES' : 'Email, Postmark', amount: emailCost.value },
];

const lean = computed(() => lines(false));
const roomy = computed(() => lines(true));
const total = (items: Line[]) => items.reduce((sum, line) => sum + line.amount, 0);

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
</script>

<template>
  <div class="tool-card calc vp-raw">
    <form class="calc-form" @submit.prevent>
      <div class="calc-field">
        <label for="calc-tenants">Tenants</label>
        <input id="calc-tenants" v-model.number="tenants" type="number" min="1" max="100000" step="1" inputmode="numeric" />
        <p class="calc-help">Customer accounts, such as companies or schools.</p>
      </div>
      <div class="calc-field">
        <label for="calc-users">Daily active users, all tenants together</label>
        <input id="calc-users" v-model.number="dailyUsers" type="number" min="1" max="1000000" step="10" inputmode="numeric" />
        <p class="calc-help">People who sign in on a normal working day.</p>
      </div>
      <div class="calc-field">
        <label for="calc-emails">Emails per month</label>
        <input id="calc-emails" v-model.number="emails" type="number" min="0" max="10000000" step="100" inputmode="numeric" />
        <p class="calc-help">Invitations, password resets, notifications.</p>
      </div>
      <fieldset class="calc-field calc-choice">
        <legend>Hosting</legend>
        <label><input v-model="stack" type="radio" value="forge" /> Laravel Forge with DigitalOcean droplets</label>
        <label><input v-model="stack" type="radio" value="droplet" /> DigitalOcean droplets you manage yourself</label>
        <label><input v-model="stack" type="radio" value="cloud" /> Laravel Cloud</label>
      </fieldset>
      <fieldset class="calc-field calc-choice">
        <legend>Email provider</legend>
        <label><input v-model="emailProvider" type="radio" value="postmark" /> Postmark</label>
        <label><input v-model="emailProvider" type="radio" value="ses" /> Amazon SES</label>
      </fieldset>
    </form>

    <div class="calc-result" aria-live="polite">
      <p class="tool-eyebrow">Estimate per month</p>
      <p class="calc-total">{{ money(total(lean)) }} to {{ money(total(roomy)) }}</p>
      <p class="calc-note">
        A rough estimate from list prices checked on {{ pricesCheckedOn }}, before tax and payment fees.
        <template v-if="stack === 'cloud'">The database and cache are not included: see the note below the calculator.</template>
      </p>
      <p v-if="tooBig" class="calc-warning">
        Past about 20,000 daily users or 5,000 tenants, this simple model stops being useful. Load-test your own app and size from what you measure.
      </p>

      <div class="calc-columns">
        <div v-for="scenario in [{ title: 'Lean', items: lean }, { title: 'With headroom', items: roomy }]" :key="scenario.title" class="calc-scenario">
          <p class="calc-scenario-title">{{ scenario.title }}: {{ money(total(scenario.items)) }}</p>
          <table>
            <tbody>
              <tr v-for="line in scenario.items" :key="line.label">
                <th scope="row">{{ line.label }}</th>
                <td>{{ money(line.amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.calc-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px 20px;
  margin-bottom: 22px;
}

.calc-field {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.calc-field > label,
.calc-field legend {
  display: block;
  padding: 0;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.calc-field input[type='number'] {
  width: 100%;
  margin-top: 6px;
  padding: 8px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  font-size: 15px;
  color: var(--vp-c-text-1);
}

.calc-field input[type='number']:focus {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 1px;
}

.calc-help {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.calc-choice label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 8px;
  font-size: 14.5px;
  line-height: 1.45;
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.calc-choice input {
  margin-top: 3px;
  accent-color: var(--vp-c-brand-1);
}

.calc-result {
  padding: 18px 20px;
  border: 1px solid var(--sl-border-strong);
  border-radius: 12px;
  background: var(--vp-c-bg);
}

.calc-total {
  margin: 4px 0 0;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--vp-c-text-1);
}

.calc-note,
.calc-warning {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.calc-warning {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--sl-warning-soft);
  color: var(--vp-c-text-1);
}

.calc-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.calc-scenario-title {
  margin: 0 0 6px;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.calc-scenario table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.calc-scenario th,
.calc-scenario td {
  padding: 6px 0;
  border-top: 1px solid var(--vp-c-divider);
  text-align: left;
  font-weight: 400;
  color: var(--vp-c-text-2);
  vertical-align: top;
}

.calc-scenario td {
  padding-left: 12px;
  text-align: right;
  white-space: nowrap;
  color: var(--vp-c-text-1);
}
</style>
