<script setup lang="ts">
import { ref } from 'vue';
import { faqParts, homeFaqs } from '../../data/home-faqs';
import SectionHeading from './SectionHeading.vue';

// Accordion in the WAI-ARIA pattern: each question is a heading with a button that shows or hides its answer.
// The first answer starts open. Closed answers stay in the HTML, hidden, so search engines still see them.
const open = ref<boolean[]>(homeFaqs.map((_, index) => index === 0));

const toggle = (index: number) => {
  open.value[index] = !open.value[index];
};
</script>

<template>
  <section id="faq" class="sl-section home-faq" aria-labelledby="faq-title">
    <div class="sl-container home-faq-inner">
      <SectionHeading eyebrow="FAQ" title="Frequently asked questions" lead="Short answers to what developers ask before they buy.">
        <span id="faq-title">Frequently asked questions</span>
      </SectionHeading>

      <div class="faq-list">
        <div v-for="(item, index) in homeFaqs" :key="item.question" class="faq-item" :class="{ 'is-open': open[index] }">
          <h3 class="faq-question">
            <button
              :id="`faq-q-${index}`"
              type="button"
              :aria-expanded="open[index] ? 'true' : 'false'"
              :aria-controls="`faq-a-${index}`"
              @click="toggle(index)"
            >
              <span>{{ item.question }}</span>
              <span class="vpi-plus faq-icon" aria-hidden="true" />
            </button>
          </h3>
          <div v-show="open[index]" :id="`faq-a-${index}`" class="faq-answer" role="region" :aria-labelledby="`faq-q-${index}`">
            <p>
              <template v-for="(part, partIndex) in faqParts(item.answer)" :key="partIndex">
                <a v-if="part.type === 'link'" class="sl-link" :href="part.href">{{ part.text }}</a>
                <code v-else-if="part.type === 'code'">{{ part.text }}</code>
                <template v-else>{{ part.text }}</template>
              </template>
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-faq {
  border-top: 1px solid var(--sl-border);
}

.home-faq-inner {
  max-width: 840px;
}

.faq-list {
  display: grid;
  gap: 12px;
}

.faq-item {
  border: 1px solid var(--sl-border);
  border-radius: var(--sl-radius-sm);
  background: var(--sl-surface);
  transition: border-color 0.2s;
}

.faq-item.is-open {
  border-color: var(--sl-border-strong);
}

.faq-question {
  margin: 0;
  border: 0;
  padding: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.45;
  letter-spacing: normal;
}

.faq-question button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 18px 20px;
  border-radius: var(--sl-radius-sm);
  font: inherit;
  text-align: left;
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.faq-question button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.faq-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  color: var(--vp-c-text-3);
  transition: transform 0.2s;
}

.faq-item.is-open .faq-icon {
  transform: rotate(45deg);
  color: var(--vp-c-brand-1);
}

.faq-answer p {
  margin: 0;
  padding: 0 20px 18px;
  font-size: 15px;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}

.faq-answer code {
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--vp-c-default-soft);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-1);
}

@media (prefers-reduced-motion: reduce) {
  .faq-icon {
    transition: none;
  }
}
</style>
