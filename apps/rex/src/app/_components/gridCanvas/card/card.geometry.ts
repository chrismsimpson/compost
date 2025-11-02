import { MeshGeometry } from 'pixi.js';

export const cardGeometry = new MeshGeometry({
  positions: new Float32Array([
    0,
    0, // x, y
    0,
    1, // x, y
    1,
    1, // x, y,
    1,
    0, // x, y,
  ]),
  uvs: new Float32Array([0, 0, 0, 1, 1, 1, 1, 0]),
  indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  topology: 'triangle-list',
});
