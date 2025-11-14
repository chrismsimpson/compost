export type Point = {
  x: number;
  y: number;
};

export type CanvasCoord = Point & {
  space: 'canvas';
};

export type DOMCoord = Point & {
  space: 'dom';
};

export type ScreenCoord = Point & {
  space: 'screen';
};
