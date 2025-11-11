import { cuidLength, generateCuid2 } from '@compost/common/cuid';
import type { NodeData } from '@compost/common/canvas';
import { relations, sql } from 'drizzle-orm';
import {
  // type UpdateDeleteAction,
  pgTable,
  varchar,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';

// const deleteCascadeAction = { onDelete: 'cascade' as UpdateDeleteAction };
// const updateCascadeAction = { onUpdate: 'cascade' as UpdateDeleteAction };

const idPrimaryKey = {
  id: varchar('id', { length: cuidLength })
    .notNull()
    .$defaultFn(() => generateCuid2())
    .primaryKey(),
};

// const surfaceId = {
//   surfaceId: varchar('surfaceId', { length: cuidLength })
//     .notNull()
//     .references(() => Surfaces.id, {
//       ...deleteCascadeAction,
//       ...updateCascadeAction,
//     }),
// };

const createdAt = {
  createdAt: timestamp('createdAt', {
    mode: 'date',
    precision: 3,
  })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
};

const updatedAt = {
  updatedAt: timestamp('updatedAt', {
    mode: 'date',
    precision: 3,
  })
    .$onUpdate(() => new Date())
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
};

const deletedAt = {
  deletedAt: timestamp('deletedAt', {
    mode: 'date',
    precision: 3,
  }),
};

// tables

export const Surfaces = pgTable(
  'Surfaces',
  {
    ...idPrimaryKey,
    name: varchar('name', { length: 255 }).notNull(),
    ...createdAt,
    ...updatedAt,
    ...deletedAt,
  },
  table => []
);

export const Nodes = pgTable(
  'Nodes',
  {
    ...idPrimaryKey,
    // ...surfaceId,
    data: jsonb('data').$type<NodeData>(),
    ...createdAt,
    ...updatedAt,
    ...deletedAt,
  },
  table => []
);
