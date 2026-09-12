import { clubSchema } from './index.ts';
// Synthetic IDs are independent of names and of future publisher mappings.
export const clubs = [
  ['Manchester Redside', 'MRS', '#dd554e'], ['Manchester Sky FC', 'MSK', '#73c6ed'],
  ['Liverpool Dockside', 'LDS', '#dc343f'], ['Mersey Blue FC', 'MBL', '#4877db'],
  ['North London Athletic', 'NLA', '#eb625c'], ['West London Royal', 'WLR', '#5674dc'],
  ['Madrid Imperial', 'MIM', '#eee5ce'], ['Madrid Metropolitan', 'MMT', '#b9607b']
].map(([name, short, color], i) => clubSchema.parse({ id: `club-${String(i + 1).padStart(2, '0')}`, name, short, color }));
