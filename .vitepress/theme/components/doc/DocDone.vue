<!-- A small "you're done" line at the end of a step-by-step guide. -->
<template>
  <div class="doc-done" role="note">
    <span class="doc-done-icon" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="14" height="14"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </span>
    <div class="doc-done-body"><slot /></div>
  </div>
</template>

<style>
.doc-done {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 32px 0 8px;
  padding: 14px 18px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.doc-done-icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 24px;
  height: 24px;
  margin-top: 1px;
  border-radius: 50%;
  background: var(--sl-success-soft);
  color: var(--sl-success);
}

.doc-done-body {
  font-size: 15px;
  line-height: 1.65;
}

.vp-doc .doc-done-body > :first-child {
  margin-top: 0;
}

.vp-doc .doc-done-body > :last-child {
  margin-bottom: 0;
}
</style>
