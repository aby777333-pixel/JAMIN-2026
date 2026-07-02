/**
 * House-blessing / housewarming ceremony checklists per tradition.
 * Warm, practical, positive-only content (the Hindu Griha Pravesh checklist
 * lives on its own richer screen — /griha-pravesh — and is linked, not duplicated).
 */

import type { Tradition } from './engine';

export interface ChecklistItem {
  title: string;
  note?: string;
}

export const BLESSING_CHECKLISTS: Partial<Record<Tradition, { heading: string; items: ChecklistItem[] }>> = {
  muslim: {
    heading: 'New-home Dua & Milad',
    items: [
      { title: 'Enter with Bismillah', note: 'Step in with the right foot, reciting Bismillah and the du’a for entering the home.' },
      { title: 'Recite Surah Al-Baqarah', note: 'Play or recite it in the new home — it invites barakah and peace.' },
      { title: 'Offer 2 raka’at of Shukr', note: 'A prayer of gratitude in the new home.' },
      { title: 'Host a small Milad / du’a gathering', note: 'Invite family and neighbours; share the joy.' },
      { title: 'Feed family, neighbours & the needy', note: 'A meal or sweets — generosity blesses the house.' },
      { title: 'Set the prayer space', note: 'Choose a clean corner facing the Qibla (see the Qibla bearing on your property page).' },
      { title: 'Greet the neighbours', note: 'Introduce your family — good neighbourliness is half of faith.' },
    ],
  },
  christian: {
    heading: 'House Blessing',
    items: [
      { title: 'Invite your parish priest / pastor', note: 'Fix the blessing date together — weekends after Mass work well.' },
      { title: 'Keep holy water & a crucifix ready', note: 'For the blessing of each room.' },
      { title: 'Choose a scripture reading', note: 'Joshua 24:15 — "As for me and my house, we will serve the Lord" is a favourite.' },
      { title: 'Prepare a prayer corner / home altar', note: 'A Bible, cross and candle in a quiet spot.' },
      { title: 'Light a candle at the entrance', note: 'Christ’s light enters first.' },
      { title: 'Share a meal with family & neighbours', note: 'Break bread together in the new home.' },
      { title: 'A word of thanks', note: 'Close with a family prayer of gratitude.' },
    ],
  },
  sikh: {
    heading: 'Akhand Path / Sukhmani Sahib',
    items: [
      { title: 'Arrange an Akhand Path or Sukhmani Sahib', note: 'Coordinate with your Gurdwara for the path at home.' },
      { title: 'Prepare a clean space for Sri Guru Granth Sahib Ji', note: 'With proper seva and canopy if hosting the saroop.' },
      { title: 'Ardas for the new home', note: 'A prayer of gratitude and protection.' },
      { title: 'Kirtan & langar', note: 'Shabad kirtan followed by langar for sangat and neighbours.' },
      { title: 'Sarbat da bhala', note: 'A donation or seva in the community to share the blessing.' },
      { title: 'Invite the neighbours', note: 'The Guru’s door is open to all.' },
    ],
  },
  jain: {
    heading: 'Griha Pravesh (Jain)',
    items: [
      { title: 'Navkar Mantra on entering', note: 'Enter at an auspicious time reciting the Navkar Mantra.' },
      { title: 'Snatra Puja / small puja at home', note: 'Arrange with your local Jain sangh or temple.' },
      { title: 'Keep the kitchen pure-veg from day one', note: 'Many families also avoid root vegetables on the first day.' },
      { title: 'Light a ghee lamp', note: 'A gentle, auspicious start.' },
      { title: 'Offer food & donation (daan)', note: 'Share a meal or donate to the sadharmik / community.' },
      { title: 'Invite elders for ashirvad', note: 'Their blessings warm the new home.' },
    ],
  },
  other: {
    heading: 'Housewarming',
    items: [
      { title: 'Pick a happy date', note: 'A weekend works well — see the suggestions above.' },
      { title: 'A small gratitude moment', note: 'However your family gives thanks — take a minute together at the door.' },
      { title: 'First boil / first meal', note: 'Boiling milk or cooking something sweet first is a lovely pan-Indian custom.' },
      { title: 'Invite family & friends', note: 'A meal, laughter, and blessings for the new address.' },
      { title: 'Greet the neighbours', note: 'A sweet box goes a long way.' },
    ],
  },
  none: {
    heading: 'Housewarming',
    items: [
      { title: 'Pick a date that suits everyone', note: 'Weekends are easiest for guests.' },
      { title: 'First meal at home', note: 'Cook something special — sweet first, by tradition!' },
      { title: 'House tour & toast', note: 'Show loved ones around and raise a toast to new beginnings.' },
      { title: 'Meet the neighbours', note: 'Say hello — community makes a home.' },
    ],
  },
};
