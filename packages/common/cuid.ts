import { init } from '@paralleldrive/cuid2';

export const cuidLength = 24;

export const generateCuid2 = init({ length: cuidLength });
