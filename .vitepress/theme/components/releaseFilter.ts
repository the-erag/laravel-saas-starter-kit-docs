import { ref } from 'vue';

export type ReleaseKit = 'vue' | 'react' | 'svelte';

// Shared by ReleaseFilter (the tabs) and every ReleaseCard on the release notes page.
export const releaseFilter = ref<'all' | ReleaseKit>('all');
