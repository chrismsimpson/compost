import { cuidLength, generateCuid2 } from '@compost/common/cuid';
import {
  type NodeData,
  toNode,
  type Node,
  nodeDataSchema,
  type Surface,
} from '@compost/common/canvas';
import { relations, sql } from 'drizzle-orm';
import {
  type UpdateDeleteAction,
  pgTable,
  varchar,
  jsonb,
  timestamp,
  doublePrecision,
  integer,
} from 'drizzle-orm/pg-core';

const deleteCascadeAction = { onDelete: 'cascade' as UpdateDeleteAction };
const updateCascadeAction = { onUpdate: 'cascade' as UpdateDeleteAction };

const idPrimaryKey = {
  id: varchar('id', { length: cuidLength })
    .notNull()
    .$defaultFn(() => generateCuid2())
    .primaryKey(),
};

const surfaceId = {
  surfaceId: varchar('surfaceId', { length: cuidLength })
    .notNull()
    .references(() => Surfaces.id, {
      ...deleteCascadeAction,
      ...updateCascadeAction,
    }),
};

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

export type SurfaceRow = typeof Surfaces.$inferSelect;

export const rowToSurface = (row: SurfaceRow): Surface => ({
  id: row.id,
  name: row.name,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  deletedAt: row.deletedAt,
});

export const Nodes = pgTable(
  'Nodes',
  {
    ...idPrimaryKey,
    ...surfaceId,
    type: varchar('type', { length: 100 }).notNull(),
    x: doublePrecision('x'),
    y: doublePrecision('y'),
    width: doublePrecision('width').default(0),
    height: doublePrecision('height').default(0),
    z: integer('z'),
    min_x: doublePrecision('min_x'),
    min_y: doublePrecision('min_y'),
    max_x: doublePrecision('max_x'),
    max_y: doublePrecision('max_y'),
    data: jsonb('data').$type<NodeData>(),
    // data: jsonb('data'),
    ...createdAt,
    ...updatedAt,
    ...deletedAt,
  },
  table => []
);

export type NodeRow = typeof Nodes.$inferSelect;

export const rowToNode = (row: NodeRow): Node | Error => {
  if (row.type !== 'shape' && row.type !== 'comment') {
    return new Error('Invalid type');
  }

  const nodeData = nodeDataSchema.safeParse(row.data);

  if (!nodeData.success) {
    return new Error('Invalid node data');
  }

  return toNode(
    row.id,
    row.surfaceId,
    row.type,
    row.x,
    row.y,
    row.z,
    row.width,
    row.height,
    row.min_x,
    row.min_y,
    row.max_x,
    row.max_y,
    nodeData.data
  );
};

export const mapNodes = (rows: NodeRow[]): Node[] | Error => {
  const nodes: Node[] = [];
  for (const r of rows) {
    const mapped = rowToNode(r);
    if (mapped instanceof Error) return mapped; // bubble first error
    nodes.push(mapped);
  }
  return nodes;
};
