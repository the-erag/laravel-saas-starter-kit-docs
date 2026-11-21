<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { testimonials } from '../../data/testimonials';
import SectionHeading from './SectionHeading.vue';

const hasSamples = computed(() => testimonials.some((testimonial) => testimonial.sample));
const heading = computed(() => `Trusted by ${testimonials.filter((testimonial) => !testimonial.team).length} developers`);
const showStars = computed(() => !testimonials.every((testimonial) => testimonial.rating === 5));
const isMounted = ref(false);
const loop = computed(() => (isMounted.value ? [...testimonials, ...testimonials] : testimonials));

const viewport = ref<HTMLElement | null>(null);
const track = ref<HTMLElement | null>(null);

const speed = 0.35;
let offset = 0;
let frame = 0;
let hovering = false;
let dragging = false;
let resumeTimer: ReturnType<typeof setTimeout> | undefined;
let pausedUntilResume = false;
let reducedMotion = false;
let startX = 0;
let startOffset = 0;

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const setWidth = () => (track.value ? track.value.scrollWidth / 2 : 0);

const normalize = () => {
  const width = setWidth();
  if (!width) {
    return;
  }
  offset = ((offset % width) + width) % width;
};

const render = () => {
  if (track.value) {
    track.value.style.transform = `translate3d(${-offset}px, 0, 0)`;
  }
};

const isPaused = () => hovering || dragging || pausedUntilResume || reducedMotion;

const tick = () => {
  if (!isPaused()) {
    offset += speed;
    normalize();
    render();
  }
  frame = requestAnimationFrame(tick);
};

const pauseThenResume = (delay: number) => {
  pausedUntilResume = true;
  clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => {
    pausedUntilResume = false;
  }, delay);
};

const onMouseEnter = () => {
  hovering = true;
};

const onMouseLeave = () => {
  hovering = false;
};

const onPointerDown = (event: PointerEvent) => {
  // Capturing the pointer would swallow clicks on profile links.
  if ((event.target as HTMLElement).closest('a')) {
    return;
  }
  dragging = true;
  startX = event.clientX;
  startOffset = offset;
  viewport.value?.setPointerCapture(event.pointerId);
};

const onPointerMove = (event: PointerEvent) => {
  if (!dragging) {
    return;
  }
  offset = startOffset - (event.clientX - startX);
  normalize();
  render();
};

const onPointerUp = (event: PointerEvent) => {
  if (!dragging) {
    return;
  }
  dragging = false;
  viewport.value?.releasePointerCapture(event.pointerId);
  pauseThenResume(event.pointerType === 'mouse' ? 0 : 2500);
};

const onWheel = (event: WheelEvent) => {
  if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) {
    return;
  }
  event.preventDefault();
  offset += event.deltaX;
  normalize();
  render();
  pauseThenResume(1500);
};

const onFocusIn = () => {
  pausedUntilResume = true;
};

const onFocusOut = () => {
  pausedUntilResume = false;
};

onMounted(() => {
  isMounted.value = true;
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  viewport.value?.addEventListener('wheel', onWheel, { passive: false });
  frame = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  clearTimeout(resumeTimer);
  viewport.value?.removeEventListener('wheel', onWheel);
});
</script>

<template>
  <section class="sl-section testimonials" aria-labelledby="testimonials-title">
    <div class="sl-container">
      <SectionHeading eyebrow="Testimonials" :title="heading" lead="Developers building faster with SaaS Laravel starter kits.">
        <span id="testimonials-title">{{ heading }}</span>
      </SectionHeading>
      <p v-if="hasSamples" class="sample-note">Sample testimonials</p>
    </div>

    <div
      ref="viewport"
      class="viewport"
      role="region"
      aria-label="Testimonials"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @focusin="onFocusIn"
      @focusout="onFocusOut"
    >
      <ul ref="track" class="track">
        <li
          v-for="(testimonial, index) in loop"
          :key="`${testimonial.name}-${index}`"
          class="card"
          :aria-hidden="index >= testimonials.length ? 'true' : undefined"
        >
          <svg class="quote" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9.6 6C6.5 7.3 4.5 10 4.5 13.6V18h5.4v-5.4H7.2c.1-2 1.2-3.5 3.3-4.5L9.6 6Zm9 0c-3.1 1.3-5.1 4-5.1 7.6V18h5.4v-5.4h-2.7c.1-2 1.2-3.5 3.3-4.5L18.6 6Z"
              fill="currentColor"
            />
          </svg>
          <div v-if="showStars" class="stars" :aria-label="`${testimonial.rating} out of 5 stars`" role="img">
            <svg v-for="star in 5" :key="star" viewBox="0 0 20 20" :class="{ off: star > testimonial.rating }" aria-hidden="true">
              <path
                d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <p class="review" :class="{ 'review--no-stars': !showStars }">{{ testimonial.review }}</p>
          <div class="person">
            <img v-if="testimonial.avatar" :src="testimonial.avatar" :alt="testimonial.name" class="avatar" width="40" height="40" loading="lazy" />
            <span v-else class="avatar" :style="{ '--avatar-accent': testimonial.accent }" aria-hidden="true">{{ initials(testimonial.name) }}</span>
            <div class="person-meta">
              <span class="person-name">
                <a v-if="testimonial.link" :href="testimonial.link" target="_blank" rel="noopener noreferrer">{{ testimonial.name }}</a>
                <template v-else>{{ testimonial.name }}</template>
                <span v-if="testimonial.kit" class="badge">{{ testimonial.kit }}</span>
                <span v-if="testimonial.team" class="badge badge--team">Team</span>
              </span>
              <span>{{ testimonial.role }}<template v-if="testimonial.location"> · {{ testimonial.location }}</template></span>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.testimonials {
  overflow: hidden;
}

.sample-note {
  margin: -32px 0 32px;
  font-size: 12px;
  text-align: center;
  color: var(--vp-c-text-3);
}

.viewport {
  --gap: 20px;
  --per-view: 3.5;
  container-type: inline-size;
  position: relative;
  max-width: 1400px;
  margin: 0 auto;
  padding: 12px 0 20px;
  overflow: hidden;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
}

.viewport:active {
  cursor: grabbing;
}

.track {
  display: flex;
  width: max-content;
  margin: 0;
  padding: 0;
  list-style: none;
  will-change: transform;
}

.card {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  width: calc((100cqw - var(--gap) * (var(--per-view) - 1)) / var(--per-view));
  min-height: 236px;
  margin: 0 var(--gap) 0 0;
  padding: 24px;
  border: 1px solid var(--sl-border);
  border-radius: var(--sl-radius);
  background: var(--sl-surface);
  box-shadow: var(--sl-shadow-sm);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.card:hover {
  border-color: var(--sl-border-strong);
  box-shadow: var(--sl-shadow);
  transform: translateY(-4px);
}

.quote {
  position: absolute;
  top: 20px;
  right: 22px;
  width: 30px;
  height: 30px;
  color: var(--vp-c-brand-1);
  opacity: 0.14;
}

.stars {
  display: flex;
  gap: 3px;
  color: #f59e0b;
}

.stars svg {
  width: 16px;
  height: 16px;
}

.stars svg.off {
  color: var(--vp-c-default-soft);
}

.review {
  flex: 1;
  margin: 14px 0 20px;
  font-size: 15px;
  line-height: 1.6;
  color: var(--vp-c-text-1);
}

.person {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--sl-border);
}

.avatar {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, color-mix(in srgb, var(--avatar-accent, var(--vp-c-brand-1)) 70%, #fff), var(--avatar-accent, var(--vp-c-brand-1)));
  box-shadow:
    0 0 0 2px var(--sl-surface),
    0 0 0 3px color-mix(in srgb, var(--avatar-accent, var(--vp-c-brand-1)) 35%, transparent);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.15);
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  object-fit: cover;
}

.person-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.person-meta .person-name {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.3;
  color: var(--vp-c-text-1);
}

.review--no-stars {
  margin-top: 0;
  padding-right: 36px;
}

.person-meta span {
  overflow: hidden;
  font-size: 12.5px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--vp-c-text-2);
}

.person-meta .person-name {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: visible;
}

.person-name a {
  color: inherit;
  text-decoration: none;
}

.person-name a:hover {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
}

.person-meta .badge {
  flex-shrink: 0;
  padding: 1px 7px;
  border: 1px solid var(--sl-border);
  border-radius: 999px;
  background: var(--vp-c-default-soft);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.person-meta .badge--team {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 35%, transparent);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

@container (max-width: 960px) {
  .card {
    --per-view: 2.4;
  }
}

@container (max-width: 640px) {
  .card {
    --gap: 14px;
    --per-view: 1.1;
    min-height: 220px;
    padding: 20px;
  }
}

@media (max-width: 640px) {
  .viewport {
    padding-right: 16px;
    padding-left: 16px;
    -webkit-mask-image: none;
    mask-image: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }

  .card:hover {
    transform: none;
  }
}
</style>
