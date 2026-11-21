import { basename } from 'node:path';

/**
 * Lists the screenshots in public/screenshots at build time, so the Live preview only shows tabs that have
 * real images. A file is `<kit>-<screen>-<light|dark>.webp`, with optional `-800` and `-1440` versions.
 */
export interface ScreenshotData {
  /** Base names that exist, e.g. "vue-users-light". */
  files: string[];
  /** Base names that also have an `-800` and a `-1440` version. */
  sized: string[];
}

declare const data: ScreenshotData;
export { data };

export default {
  watch: ['../../public/screenshots/*.webp'],
  load(watchedFiles: string[]): ScreenshotData {
    const names = new Set(watchedFiles.map((file) => basename(file, '.webp')));
    const files = [...names].filter((name) => !/-(800|1440)$/.test(name)).sort();

    return { files, sized: files.filter((name) => names.has(`${name}-800`) && names.has(`${name}-1440`)) };
  },
};
