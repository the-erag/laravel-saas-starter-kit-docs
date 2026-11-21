<!--
  Wraps the numbered "## 1. ..." sections of a step-by-step guide and draws a step line beside them.
  Leave a blank line after the opening tag and before the closing tag so the Markdown inside is parsed.
-->
<template>
  <div class="doc-steps">
    <slot />
  </div>
</template>

<style>
.doc-steps {
  position: relative;
  margin: 32px 0 8px;
  padding-left: 36px;
}

.doc-steps::before {
  content: '';
  position: absolute;
  top: 10px;
  bottom: 12px;
  left: 11px;
  width: 1px;
  background: var(--vp-c-border);
}

.vp-doc .doc-steps > h2 {
  position: relative;
  margin-top: 40px;
  padding-top: 0;
  border-top: 0;
}

.vp-doc .doc-steps > h2:first-child {
  margin-top: 0;
}

.vp-doc .doc-steps > h2::before {
  content: '';
  position: absolute;
  top: 7px;
  left: -36px;
  width: 23px;
  height: 23px;
  box-sizing: border-box;
  border: 1px solid var(--vp-c-border);
  border-radius: 50%;
  background: radial-gradient(circle, var(--vp-c-text-2) 0 3.5px, transparent 4px), var(--vp-c-bg);
}

/* On phones VitePress pulls code blocks to the screen edge; inside steps keep them clear of the step line. */
@media (max-width: 639px) {
  .vp-doc .doc-steps div[class*='language-'],
  .vp-doc .doc-steps .vp-code-group {
    margin-left: 0;
  }

  .vp-doc .doc-steps div[class*='language-'],
  .vp-doc .doc-steps .vp-code-group .tabs {
    border-top-left-radius: 8px;
  }

  .vp-doc .doc-steps div[class*='language-'] {
    border-bottom-left-radius: 8px;
  }

  .vp-doc .doc-steps .vp-code-group div[class*='language-'] {
    border-top-left-radius: 0;
  }
}

@media (max-width: 640px) {
  .doc-steps {
    padding-left: 28px;
  }

  .doc-steps::before {
    left: 8px;
  }

  .vp-doc .doc-steps > h2::before {
    left: -28px;
    width: 17px;
    height: 17px;
    top: 6px;
  }
}
</style>
