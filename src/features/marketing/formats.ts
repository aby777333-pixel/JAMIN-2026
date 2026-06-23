/** Export formats (§5.09) — aspect ratios for the generated ad. */
export const AD_FORMATS = [
  { key: 'post', label: 'Post', w: 1, h: 1 },
  { key: 'story', label: 'Story', w: 9, h: 16 },
  { key: 'status', label: 'Status', w: 9, h: 16 },
  { key: 'flyer', label: 'Flyer', w: 3, h: 4 },
  { key: 'banner', label: 'Banner', w: 16, h: 9 },
] as const;

export type AdFormatKey = (typeof AD_FORMATS)[number]['key'];
