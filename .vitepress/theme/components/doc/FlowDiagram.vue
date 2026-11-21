<!--
  A simple left-to-right flow (request flow, data flow). It stacks top-to-bottom on narrow screens.
  Each node is a string, or { label, note } for a second line. `backticks` become inline code.
  Flows with more than five steps are always drawn top-to-bottom, so they never wrap mid-row.
-->
<script setup lang="ts">
import { inlineCode } from './format';

type Node = string | { label: string; note?: string };

defineProps<{ nodes: Node[]; label: string; caption?: string }>();

const toNode = (node: Node) => (typeof node === 'string' ? { label: node } : node);
</script>

<template>
  <figure class="flow" :class="{ 'flow--vertical': nodes.length > 5 }">
    <ol class="flow-list" :aria-label="label">
      <li v-for="(node, index) in nodes" :key="index" class="flow-node">
        <span class="flow-label" v-html="inlineCode(toNode(node).label)" />
        <span v-if="toNode(node).note" class="flow-note" v-html="inlineCode(toNode(node).note!)" />
      </li>
    </ol>
    <figcaption v-if="caption" class="flow-caption" v-html="inlineCode(caption)" />
  </figure>
</template>

<style>
.flow {
  margin: 20px 0 24px;
  container-type: inline-size;
}

.vp-doc .flow-list {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 8px 28px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.vp-doc .flow-node {
  position: relative;
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  justify-content: center;
  min-width: 96px;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  text-align: center;
}

.flow-node + .flow-node::before {
  content: '→';
  position: absolute;
  top: 50%;
  left: -22px;
  transform: translateY(-50%);
  font-size: 15px;
  color: var(--vp-c-text-3);
}

.flow-label {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--vp-c-text-1);
}

.flow-note {
  margin-top: 2px;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--vp-c-text-2);
}

.vp-doc .flow code {
  font-size: 12px;
}

.flow-caption {
  margin-top: 8px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  text-align: center;
}

@container (max-width: 560px) {
  .vp-doc .flow-list {
    flex-direction: column;
    gap: 22px;
  }

  .flow-node + .flow-node::before {
    content: '↓';
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
  }
}

.vp-doc .flow--vertical .flow-list {
  flex-direction: column;
  gap: 22px;
  max-width: 440px;
  margin: 0 auto;
}

.flow--vertical .flow-node + .flow-node::before {
  content: '↓';
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
}
</style>
