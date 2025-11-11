import {
  type Lexer,
  lexerIsEof,
  lexerPeek,
  type Source,
  type Parser,
  parserIsEof,
} from './parsing';
import type { Point } from './geom';

type PathTokenKind = 'command' | 'number' | 'comma' | 'unknown' | 'eof';

type PathToken = {
  kind: PathTokenKind;
  value?: string | null;
};

const numberRe = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;

const lexPathToken = (lexer: Lexer): PathToken | Error => {
  while (!lexerIsEof(lexer)) {
    const peek = lexerPeek(lexer);

    if (peek instanceof Error) {
      return peek;
    }

    ///

    let unknown = false;

    switch (peek) {
      // commands

      case 'A':
      case 'a':
      case 'C':
      case 'c':
      case 'H':
      case 'h':
      case 'L':
      case 'l':
      case 'M':
      case 'm':
      case 'Q':
      case 'q':
      case 'S':
      case 's':
      case 'T':
      case 't':
      case 'V':
      case 'v':
      case 'Z':
      case 'z': {
        lexer.position += 1;

        return { kind: 'command', value: peek };
      }

      // numbers

      case '+':
      case '-':
      case '.':
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9': {
        const rest = lexer.source.contents.slice(lexer.position);

        const match = rest.match(numberRe);

        if (match && match[0].length > 0) {
          lexer.position += match[0].length;

          return { kind: 'number', value: match[0] };
        }

        unknown = true;

        break;
      }

      // whitespace

      case '\r':
      case ' ':
      case '\t':
      case '\n': {
        lexer.position += 1;

        break;
      }

      // punc

      case ',': {
        lexer.position += 1;

        return { kind: 'comma', value: peek };
      }

      // unknown/default

      default: {
        unknown = true;

        break;
      }
    }

    ///

    if (unknown) {
      lexer.position += 1;
      return { kind: 'unknown', value: peek };
    }
  }

  return { kind: 'eof', value: null };
};

const lexPathTokenFromSource = (source: Source): PathToken[] | Error => {
  const lexer: Lexer = { source, position: 0 };

  const tokens: PathToken[] = [];

  while (!lexerIsEof(lexer)) {
    const token = lexPathToken(lexer);

    if (token instanceof Error) {
      return token;
    }

    tokens.push(token);
  }

  if (tokens[tokens.length - 1]?.kind !== 'eof') {
    tokens.push({ kind: 'eof', value: null });
  }

  return tokens;
};

// path typing

export type PathPoint = {
  x: number;
  y: number;
};

export enum PathCoordMode {
  Absolute = 'Absolute',
  Relative = 'Relative',
}

export type PathCommandKind =
  | 'moveTo'
  | 'lineTo'
  | 'hLineTo'
  | 'vLineTo'
  | 'curveTo'
  | 'smoothCurveTo'
  | 'quadraticBezierCurveTo'
  | 'smoothQuadraticBezierCurveTo'
  | 'ellipticalArc'
  | 'closePath';

export type EllipticalArcComponents = [PathPoint, number, PathPoint, PathPoint];

export type PathCommand = {
  kind: PathCommandKind;
  mode?: PathCoordMode | null;
  points?: PathPoint[] | null;
  x?: number[] | null;
  y?: number[] | null;
  arcs?: EllipticalArcComponents[] | null;
};

const skipCommas = (parser: Parser<PathToken>) => {
  while (
    !parserIsEof(parser) &&
    parser.tokens[parser.position]?.kind === 'comma'
  ) {
    parser.position += 1;
  }
};

// path parsing

const parsePathCommandPoint = (
  parser: Parser<PathToken>
): PathPoint | Error => {
  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  const x = parser.tokens[parser.position];

  if (x?.kind !== 'number') {
    return new Error('expected number for x coordinate');
  }

  parser.position += 1;

  ///

  const next = parser.tokens[parser.position];

  if (next?.kind === 'number') {
    const y = next;

    parser.position += 1;

    return {
      x: Number.parseFloat(x.value ?? '0'),
      y: Number.parseFloat(y.value ?? '0'),
    };
  }

  ///

  if (next?.kind !== 'comma') {
    return new Error(
      `Expected number or comma delimiter when parsing point, got '${next?.kind}', value: '${next?.value}'`
    );
  }

  parser.position += 1;

  ///

  const y = parser.tokens[parser.position];

  if (y?.kind !== 'number') {
    return new Error('expected number for y coordinate');
  }

  parser.position += 1;

  ///

  return {
    x: Number.parseFloat(x.value ?? '0'),
    y: Number.parseFloat(y.value ?? '0'),
  };
};

const parsePathCommandPoints = (
  parser: Parser<PathToken>
): PathPoint[] | Error => {
  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  const points: PathPoint[] = [];

  while (!parserIsEof(parser)) {
    skipCommas(parser);

    const peek = parser.tokens[parser.position];

    if (peek?.kind === 'command' || peek?.kind === 'eof') {
      break;
    }

    const point = parsePathCommandPoint(parser);

    if (point instanceof Error) {
      return point;
    }

    points.push(point);

    skipCommas(parser);
  }

  ///

  return points;
};

const parsePathCommandNumbers = (
  parser: Parser<PathToken>
): number[] | Error => {
  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  const numbers: number[] = [];

  while (!parserIsEof(parser)) {
    skipCommas(parser);

    const peek = parser.tokens[parser.position];

    if (peek?.kind === 'command' || peek?.kind === 'eof') {
      break;
    }

    const numberTok = parser.tokens[parser.position];

    if (numberTok?.kind !== 'number') {
      return new Error('expected number');
    }

    parser.position += 1;

    numbers.push(Number.parseFloat(numberTok.value || '0'));

    skipCommas(parser);
  }

  return numbers;
};

const parsePathCommandMoveTo = (
  parser: Parser<PathToken>
): PathCommand | Error => {
  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  const command = parser.tokens[parser.position];

  if (
    command?.kind !== 'command' ||
    (command.value !== 'M' && command.value !== 'm')
  ) {
    return new Error('expected moveTo command');
  }

  parser.position += 1;

  ///

  const points = parsePathCommandPoints(parser);

  if (points instanceof Error) {
    return points;
  }

  if (!points || points.length === 0) {
    return new Error('expected at least one point for moveTo command');
  }

  ///

  return {
    kind: 'moveTo',
    mode:
      command.value === 'M' ? PathCoordMode.Absolute : PathCoordMode.Relative,
    points,
  };
};

const parsePathCommandLineTo = (
  parser: Parser<PathToken>
): PathCommand | Error => {
  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  const command = parser.tokens[parser.position];

  if (
    command?.kind !== 'command' ||
    (command.value !== 'L' && command.value !== 'l')
  ) {
    return new Error('expected lineTo command');
  }

  parser.position += 1;

  ///

  const points = parsePathCommandPoints(parser);

  if (points instanceof Error) {
    return points;
  }

  if (!points || points.length === 0) {
    return new Error('expected at least one point for lineTo command');
  }

  ///

  return {
    kind: 'lineTo',
    mode:
      command.value === 'L' ? PathCoordMode.Absolute : PathCoordMode.Relative,
    points,
  };
};

const parsePathCommandHLineTo = (
  parser: Parser<PathToken>
): PathCommand | Error => {
  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  const command = parser.tokens[parser.position];

  if (
    command?.kind !== 'command' ||
    (command.value !== 'H' && command.value !== 'h')
  ) {
    return new Error('expected hLineTo command');
  }

  parser.position += 1;

  ///

  const x = parsePathCommandNumbers(parser);

  if (x instanceof Error) {
    return x;
  }

  if (!x || x.length === 0) {
    return new Error('expected at least one x coordinate for hLineTo command');
  }

  ///

  return {
    kind: 'hLineTo',
    mode:
      command.value === 'H' ? PathCoordMode.Absolute : PathCoordMode.Relative,
    x,
  };
};

const parsePathCommandVLineTo = (
  parser: Parser<PathToken>
): PathCommand | Error => {
  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  const command = parser.tokens[parser.position];

  if (
    command?.kind !== 'command' ||
    (command.value !== 'V' && command.value !== 'v')
  ) {
    return new Error('expected vLineTo command');
  }

  parser.position += 1;

  ///

  const y = parsePathCommandNumbers(parser);

  if (y instanceof Error) {
    return y;
  }

  if (!y || y.length === 0) {
    return new Error('expected at least one y coordinate for vLineTo command');
  }

  ///

  return {
    kind: 'vLineTo',
    mode:
      command.value === 'V' ? PathCoordMode.Absolute : PathCoordMode.Relative,
    y,
  };
};

const parsePathCommandCurveTo = (
  parser: Parser<PathToken>
): PathCommand | Error => {
  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  const command = parser.tokens[parser.position];

  if (
    command?.kind !== 'command' ||
    (command.value !== 'C' && command.value !== 'c')
  ) {
    return new Error('expected curveTo command');
  }

  parser.position += 1;

  ///

  const points = parsePathCommandPoints(parser);

  if (points instanceof Error) {
    return points;
  }

  if (!points || points.length === 0) {
    return new Error('expected at least one point for curveTo command');
  }

  if (points.length % 3 !== 0) {
    return new Error('expected points count to be multiple of 3 for curveTo');
  }

  ///

  return {
    kind: 'curveTo',
    mode:
      command.value === 'C' ? PathCoordMode.Absolute : PathCoordMode.Relative,
    points,
  };
};

const parsePathCommandSmoothCurveTo = (
  parser: Parser<PathToken>
): PathCommand | Error => {
  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  const command = parser.tokens[parser.position];

  if (
    command?.kind !== 'command' ||
    (command.value !== 'S' && command.value !== 's')
  ) {
    return new Error('expected smoothCurveTo command');
  }

  parser.position += 1;

  ///

  const points = parsePathCommandPoints(parser);

  if (points instanceof Error) {
    return points;
  }

  if (!points || points.length === 0) {
    return new Error('expected at least one point for smoothCurveTo command');
  }

  if (points.length % 2 !== 0) {
    return new Error(
      'expected points count to be multiple of 2 for smoothCurveTo'
    );
  }

  ///

  return {
    kind: 'smoothCurveTo',
    mode:
      command.value === 'S' ? PathCoordMode.Absolute : PathCoordMode.Relative,
    points,
  };
};

const parsePathCommandQuadraticBezierCurveTo = (
  parser: Parser<PathToken>
): PathCommand | Error => {
  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  const command = parser.tokens[parser.position];

  if (
    command?.kind !== 'command' ||
    (command.value !== 'Q' && command.value !== 'q')
  ) {
    return new Error('expected quadraticBezierCurveTo command');
  }

  parser.position += 1;

  ///

  const points = parsePathCommandPoints(parser);

  if (points instanceof Error) {
    return points;
  }

  if (!points || points.length === 0) {
    return new Error(
      'expected at least one point for quadraticBezierCurveTo command'
    );
  }

  if (points.length % 2 !== 0) {
    return new Error(
      'expected points count to be multiple of 2 for quadraticBezierCurveTo'
    );
  }

  ///

  return {
    kind: 'quadraticBezierCurveTo',
    mode:
      command.value === 'Q' ? PathCoordMode.Absolute : PathCoordMode.Relative,
    points,
  };
};

const parsePathCommandSmoothQuadraticBezierCurveTo = (
  parser: Parser<PathToken>
): PathCommand | Error => {
  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  const command = parser.tokens[parser.position];

  if (
    command?.kind !== 'command' ||
    (command.value !== 'T' && command.value !== 't')
  ) {
    return new Error('expected smoothQuadraticBezierCurveTo command');
  }

  parser.position += 1;

  ///

  const points = parsePathCommandPoints(parser);

  if (points instanceof Error) {
    return points;
  }

  if (!points || points.length === 0) {
    return new Error(
      'expected at least one point for smoothQuadraticBezierCurveTo command'
    );
  }

  ///

  return {
    kind: 'smoothQuadraticBezierCurveTo',
    mode:
      command.value === 'T' ? PathCoordMode.Absolute : PathCoordMode.Relative,
    points,
  };
};

const parsePathCommandEllipticalArcComponents = (
  parser: Parser<PathToken>
): EllipticalArcComponents | Error => {
  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  const rad = parsePathCommandPoint(parser);

  if (rad instanceof Error) {
    return rad;
  }

  // coerce to non-negative as per SVG spec
  rad.x = Math.abs(rad.x);
  rad.y = Math.abs(rad.y);

  skipCommas(parser);

  ///

  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  const rotationToken = parser.tokens[parser.position];

  if (rotationToken?.kind !== 'number') {
    return new Error('expected number for arc rotation');
  }

  parser.position += 1;

  ///

  const rotation = Number.parseFloat(rotationToken.value || '0');

  skipCommas(parser);

  ///

  const flagsUnchecked = parsePathCommandPoint(parser);

  if (flagsUnchecked instanceof Error) {
    return flagsUnchecked;
  }

  const largeArc = flagsUnchecked.x;
  const sweep = flagsUnchecked.y;

  if ((largeArc !== 0 && largeArc !== 1) || (sweep !== 0 && sweep !== 1)) {
    return new Error('elliptical-arc flags must be 0 or 1');
  }

  const flags: PathPoint = { x: largeArc, y: sweep };

  skipCommas(parser);

  ///

  const end = parsePathCommandPoint(parser);

  if (end instanceof Error) {
    return end;
  }

  ///

  return [rad, rotation, flags, end];
};

const parsePathCommandEllipticalArc = (
  parser: Parser<PathToken>
): PathCommand | Error => {
  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  const command = parser.tokens[parser.position];

  if (
    command?.kind !== 'command' ||
    (command.value !== 'A' && command.value !== 'a')
  ) {
    return new Error('expected ellipticalArc command');
  }

  parser.position += 1;

  ///

  const arcs: EllipticalArcComponents[] = [];

  while (!parserIsEof(parser)) {
    skipCommas(parser);

    const peek = parser.tokens[parser.position];

    if (peek?.kind === 'command' || peek?.kind === 'eof') {
      break;
    }

    ///

    const arc = parsePathCommandEllipticalArcComponents(parser);

    if (arc instanceof Error) {
      return arc;
    }

    arcs.push(arc);

    skipCommas(parser);
  }

  ///

  if (arcs.length === 0) {
    return new Error('expected at least one arc for ellipticalArc command');
  }

  ///

  return {
    kind: 'ellipticalArc',
    mode:
      command.value === 'A' ? PathCoordMode.Absolute : PathCoordMode.Relative,
    arcs,
  };
};

const parsePathCommandClosePath = (
  parser: Parser<PathToken>
): PathCommand | Error => {
  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  const command = parser.tokens[parser.position];

  if (
    command?.kind !== 'command' ||
    (command.value !== 'Z' && command.value !== 'z')
  ) {
    return new Error('expected closePath command');
  }

  parser.position += 1;

  ///

  return {
    kind: 'closePath',
  };
};

const parsePathCommand = (
  parser: Parser<PathToken>
): PathCommand | null | Error => {
  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  skipCommas(parser);

  const peek = parser.tokens[parser.position];

  if (peek?.kind === 'eof') {
    return null;
  }

  if (peek?.kind !== 'command') {
    const found =
      peek == null
        ? 'end of input'
        : `${peek.kind}${peek.value != null ? ` (${peek.value})` : ''}`;

    return new Error(`expected command, found ${found}`);
  }

  ///

  switch (peek.value) {
    case 'M':
    case 'm':
      return parsePathCommandMoveTo(parser);

    case 'L':
    case 'l':
      return parsePathCommandLineTo(parser);

    case 'H':
    case 'h':
      return parsePathCommandHLineTo(parser);

    case 'V':
    case 'v':
      return parsePathCommandVLineTo(parser);

    case 'C':
    case 'c':
      return parsePathCommandCurveTo(parser);

    case 'S':
    case 's':
      return parsePathCommandSmoothCurveTo(parser);

    case 'Q':
    case 'q':
      return parsePathCommandQuadraticBezierCurveTo(parser);

    case 'T':
    case 't':
      return parsePathCommandSmoothQuadraticBezierCurveTo(parser);

    case 'A':
    case 'a':
      return parsePathCommandEllipticalArc(parser);

    case 'Z':
    case 'z':
      return parsePathCommandClosePath(parser);

    default:
      return new Error(`unknown path command: '${peek.value}'`);
  }
};

export type SubPath = PathCommand[];

const parseSubPath = (parser: Parser<PathToken>): SubPath | Error => {
  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  const commands: SubPath = [];

  while (!parserIsEof(parser)) {
    // If this isn't the first command in this subpath and we see a
    // new 'M'/'m', stop and let parseSubPaths start a new SubPath

    const peek = parser.tokens[parser.position];

    if (
      commands.length > 0 &&
      peek?.kind === 'command' &&
      (peek.value === 'M' || peek.value === 'm')
    ) {
      break;
    }

    const command = parsePathCommand(parser);

    if (command instanceof Error) {
      return command;
    }

    if (command === null) {
      break;
    }

    commands.push(command);

    ///

    if (command.kind === 'closePath') {
      break;
    }
  }

  ///

  return commands;
};

const parseSubPaths = (parser: Parser<PathToken>): SubPath[] | Error => {
  if (parserIsEof(parser)) {
    return [];
  }

  ///

  const subPaths: SubPath[] = [];

  while (!parserIsEof(parser)) {
    const subPath = parseSubPath(parser);

    if (subPath instanceof Error) {
      return subPath;
    }

    if (subPath.length === 0) {
      break;
    }

    subPaths.push(subPath);
  }

  ///

  return subPaths;
};

export type Path = SubPath[];

export const parsePath = (input: string): Path | Error => {
  const source: Source = { contents: input };

  const tokens = lexPathTokenFromSource(source);

  if (tokens instanceof Error) {
    return tokens;
  }

  const parser: Parser<PathToken> = {
    source,
    tokens,
    position: 0,
  };

  return parseSubPaths(parser);
};

// path stringification

export const stringifyPathCommand = (cmd: PathCommand): string => {
  switch (cmd.kind) {
    case 'moveTo': {
      if (!cmd.points) {
        return '';
      }

      return `${cmd.mode === PathCoordMode.Absolute ? 'M' : 'm'} ${cmd.points.map(p => `${p.x},${p.y}`).join(' ')}`;
    }

    case 'lineTo': {
      if (!cmd.points) {
        return '';
      }

      return `${cmd.mode === PathCoordMode.Absolute ? 'L' : 'l'} ${cmd.points.map(p => `${p.x},${p.y}`).join(' ')}`;
    }

    case 'hLineTo': {
      if (!cmd.x) {
        return '';
      }

      return `${cmd.mode === PathCoordMode.Absolute ? 'H' : 'h'} ${cmd.x.join(' ')}`;
    }

    case 'vLineTo': {
      if (!cmd.y) {
        return '';
      }

      return `${cmd.mode === PathCoordMode.Absolute ? 'V' : 'v'} ${cmd.y.join(' ')}`;
    }

    case 'curveTo': {
      if (!cmd.points) {
        return '';
      }

      return `${cmd.mode === PathCoordMode.Absolute ? 'C' : 'c'} ${cmd.points.map(p => `${p.x},${p.y}`).join(' ')}`;
    }

    case 'smoothCurveTo': {
      if (!cmd.points) {
        return '';
      }

      return `${cmd.mode === PathCoordMode.Absolute ? 'S' : 's'} ${cmd.points.map(p => `${p.x},${p.y}`).join(' ')}`;
    }

    case 'quadraticBezierCurveTo': {
      if (!cmd.points) {
        return '';
      }

      return `${cmd.mode === PathCoordMode.Absolute ? 'Q' : 'q'} ${cmd.points.map(p => `${p.x},${p.y}`).join(' ')}`;
    }

    case 'smoothQuadraticBezierCurveTo': {
      if (!cmd.points) {
        return '';
      }

      return `${cmd.mode === PathCoordMode.Absolute ? 'T' : 't'} ${cmd.points.map(p => `${p.x},${p.y}`).join(' ')}`;
    }

    case 'ellipticalArc': {
      if (!cmd.arcs) {
        return '';
      }

      const arcs = cmd.arcs
        .map(arc => {
          if (!arc) {
            return '';
          }

          const [rad, xRot, flags, end] = arc;

          if (!rad || !flags || !end) {
            return '';
          }

          const largeArcFlag = flags.x === 1 ? 1 : 0;
          const sweepFlag = flags.y === 1 ? 1 : 0;

          return `${rad.x},${rad.y} ${xRot} ${largeArcFlag} ${sweepFlag} ${end.x},${end.y}`;
        })
        .filter(s => s.length > 0);

      return `${cmd.mode === PathCoordMode.Absolute ? 'A' : 'a'} ${arcs.join(' ')}`;
    }

    case 'closePath': {
      return 'Z';
    }

    default: {
      return '';
    }
  }
};

export const stringifySubPath = (subPath: SubPath): string => {
  return subPath
    .map(cmd => {
      return stringifyPathCommand(cmd);
    })
    .join(' ');
};

export const stringifyPath = (path: Path): string => {
  return path
    .map(subPath => {
      return stringifySubPath(subPath);
    })
    .join(' ');
};

// path utils

export type PathCoord = Point & { mode: PathCoordMode };

export const deriveOnCurvePoints = (subPath: SubPath): PathCoord[] => {
  const coords: PathCoord[] = [];

  let posAbs: PathPoint = { x: 0, y: 0 };
  let subPathStartAbs: PathPoint | null = null;

  const updateAbsFrom = (c: PathCoord) => {
    const p = c.point;

    if ((c.mode || PathCoordMode.Absolute) === PathCoordMode.Absolute) {
      posAbs = { x: p.x, y: p.y };
    } else {
      posAbs = { x: posAbs.x + p.x, y: posAbs.y + p.y };
    }

    if (!subPathStartAbs) {
      subPathStartAbs = { ...posAbs };
    }
  };

  for (const cmd of subPath) {
    switch (cmd.kind) {
      case 'moveTo':
      case 'lineTo': {
        if (cmd.points) {
          for (const p of cmd.points) {
            const c: PathCoord = {
              mode: cmd.mode || PathCoordMode.Absolute,
              point: p,
            };

            coords.push(c);

            updateAbsFrom(c);
          }
        }

        break;
      }

      case 'hLineTo': {
        if (cmd.x) {
          for (const n of cmd.x) {
            const isAbs =
              (cmd.mode || PathCoordMode.Absolute) === PathCoordMode.Absolute;

            const p: PathPoint = isAbs ? { x: n, y: posAbs.y } : { x: n, y: 0 };

            const c: PathCoord = {
              mode: cmd.mode || PathCoordMode.Absolute,
              point: p,
            };

            coords.push(c);

            updateAbsFrom(c);
          }
        }

        break;
      }

      case 'vLineTo': {
        if (cmd.y) {
          for (const n of cmd.y) {
            const isAbs =
              (cmd.mode || PathCoordMode.Absolute) === PathCoordMode.Absolute;

            const p: PathPoint = isAbs ? { x: posAbs.x, y: n } : { x: 0, y: n };

            const c: PathCoord = {
              mode: cmd.mode || PathCoordMode.Absolute,
              point: p,
            };

            coords.push(c);

            updateAbsFrom(c);
          }
        }

        break;
      }

      case 'curveTo': {
        if (cmd.points) {
          for (let i = 0; i < cmd.points.length; i += 3) {
            const endPoint = cmd.points[i + 2];

            if (!endPoint) {
              break;
            }

            const c: PathCoord = {
              mode: cmd.mode || PathCoordMode.Absolute,
              point: endPoint,
            };

            coords.push(c);

            updateAbsFrom(c);
          }
        }

        break;
      }

      case 'smoothCurveTo':
      case 'quadraticBezierCurveTo': {
        if (cmd.points) {
          for (let i = 0; i < cmd.points.length; i += 2) {
            const endPoint = cmd.points[i + 1];

            if (!endPoint) {
              break;
            }

            const c: PathCoord = {
              mode: cmd.mode || PathCoordMode.Absolute,
              point: endPoint,
            };

            coords.push(c);

            updateAbsFrom(c);
          }
        }

        break;
      }

      case 'smoothQuadraticBezierCurveTo': {
        if (cmd.points) {
          for (const endPoint of cmd.points) {
            const c: PathCoord = {
              mode: cmd.mode || PathCoordMode.Absolute,
              point: endPoint,
            };

            coords.push(c);

            updateAbsFrom(c);
          }
        }

        break;
      }

      case 'ellipticalArc': {
        if (cmd.arcs) {
          for (const arc of cmd.arcs) {
            const endPoint = arc[3];

            const c: PathCoord = {
              mode: cmd.mode || PathCoordMode.Absolute,
              point: endPoint,
            };

            coords.push(c);

            updateAbsFrom(c);
          }
        }

        break;
      }

      case 'closePath': {
        if (!subPathStartAbs) {
          break;
        }

        const start: PathPoint = subPathStartAbs;

        const c: PathCoord = {
          mode: PathCoordMode.Absolute,
          point: { x: start.x, y: start.y },
        };

        coords.push(c);

        updateAbsFrom(c);

        break;
      }

      default: {
        break;
      }
    }
  }

  return coords;
};

export const onCurvePointsToAbsolute = (coords: PathCoord[]): PathPoint[] => {
  const pointsAbs: PathPoint[] = [];

  let posAbs = { x: 0, y: 0 };

  for (const c of coords) {
    const p: PathPoint = { x: c.x, y: c.y };

    const pointAbs =
      c.mode === PathCoordMode.Absolute
        ? p
        : { x: posAbs.x + p.x, y: posAbs.y + p.y };

    pointsAbs.push(pointAbs);

    posAbs = pointAbs;
  }

  return pointsAbs;
};

// note: does not account for curve extrema
export const getPathBoundingBox = (
  path: Path
): [number, number, number, number] | null => {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const subPath of path) {
    const points = deriveOnCurvePoints(subPath);
    const pointsAbs = onCurvePointsToAbsolute(points);

    for (const p of pointsAbs) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }

  if (
    minX === Number.POSITIVE_INFINITY ||
    minY === Number.POSITIVE_INFINITY ||
    maxX === Number.NEGATIVE_INFINITY ||
    maxY === Number.NEGATIVE_INFINITY
  ) {
    return null;
  }

  const width = maxX - minX;
  const height = maxY - minY;

  return [minX, minY, width, height];
};

// simplify

const distanceSquared = (a: PathPoint, b: PathPoint): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

const distance = (a: PathPoint, b: PathPoint): number =>
  Math.sqrt(distanceSquared(a, b));

const N03 = (t: number): number => (1 - t) ** 3;
const N13 = (t: number): number => 3 * t * (1 - t) ** 2;
const N23 = (t: number): number => 3 * t * t * (1 - t);
const N33 = (t: number): number => t ** 3;

const fitCubic = (
  points: PathPoint[],
  t: number[],
  start: PathPoint,
  end: PathPoint
): { cp1: PathPoint; cp2: PathPoint } | null => {
  const n = points.length;

  if (n < 2) {
    return null;
  }

  // initialize matrices for least squares fitting
  const c: [[number, number], [number, number]] = [
    [0, 0],
    [0, 0],
  ];
  const x: [number, number] = [0, 0];
  const y: [number, number] = [0, 0];

  // calculate the c and x matrices
  for (let i = 1; i < n - 1; i++) {
    const t_i = t[i];

    if (!t_i) {
      continue;
    }

    const b1 = N13(t_i);
    const b2 = N23(t_i);

    c[0][0] += b1 * b1;
    c[0][1] += b1 * b2;
    c[1][0] += b1 * b2;
    c[1][1] += b2 * b2;

    const p = points[i];

    if (!p) {
      continue;
    }

    x[0] += b1 * (p.x - (N03(t_i) * start.x + N33(t_i) * end.x));
    x[1] += b2 * (p.x - (N03(t_i) * start.x + N33(t_i) * end.x));

    y[0] += b1 * (p.y - (N03(t_i) * start.y + N33(t_i) * end.y));
    y[1] += b2 * (p.y - (N03(t_i) * start.y + N33(t_i) * end.y));
  }

  // calculate the determinant of c
  const det = c[0][0] * c[1][1] - c[0][1] * c[1][0];

  if (Math.abs(det) < 1e-6) {
    return null;
  }

  // invert matrix C
  const invC: [[number, number], [number, number]] = [
    [c[1][1] / det, -c[0][1] / det],
    [-c[1][0] / det, c[0][0] / det],
  ];

  // calculate control points
  const cp1x = invC[0][0] * x[0] + invC[0][1] * x[1];
  const cp2x = invC[1][0] * x[0] + invC[1][1] * x[1];

  const cp1y = invC[0][0] * y[0] + invC[0][1] * y[1];
  const cp2y = invC[1][0] * y[0] + invC[1][1] * y[1];

  return {
    cp1: { x: cp1x, y: cp1y },
    cp2: { x: cp2x, y: cp2y },
  };
};

const chordLengthParameterize = (points: PathPoint[]): [number, number[]] => {
  const t: number[] = [0];
  let total = 0;

  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];

    if (!p1 || !p2) {
      continue;
    }

    total += distance(p2, p1);

    t.push(total);
  }

  if (total === 0) {
    // all points coincide: keep params at 0
    for (let i = 1; i < t.length; i++) {
      t[i] = 0;
    }

    return [0, t];
  }

  for (let i = 1; i < t.length; i++) {
    const t_i = t[i];

    if (!t_i && t_i !== 0) {
      continue;
    }

    t[i] = t_i / total;
  }

  return [total, t];
};

const subdivideSubPath = (subPath: SubPath): SubPath[] => {
  const points = deriveOnCurvePoints(subPath);

  if (points.length < 2) {
    return [subPath];
  }

  const pointsAbs = onCurvePointsToAbsolute(points);
  const [totalLength, t] = chordLengthParameterize(pointsAbs);

  const minSubdivisions = 1;
  const maxSubdivisions = 10;

  const complexity = points.length;
  const normalizedLength = Math.log(totalLength + 1);
  const normalizedComplexity = Math.log(complexity + 1);

  const lengthWeight = 0.7;
  const complexityWeight = 0.3;

  const n =
    normalizedLength * lengthWeight + normalizedComplexity * complexityWeight;

  const subdivisions = Math.max(
    minSubdivisions,
    Math.min(Math.floor(n), maxSubdivisions)
  );

  if (subdivisions <= 1) {
    return [subPath];
  }

  // equal arc-length targets in [0,1]
  const targets = Array.from(
    { length: subdivisions - 1 },
    (_, i) => (i + 1) / subdivisions
  );

  // single pass over t (monotonic), O(N + K)
  const indexes: number[] = [];

  let j = 0;

  for (const target of targets) {
    while (j < t.length) {
      const tj = t[j];

      if (tj === undefined || tj >= target) {
        break;
      }

      j++;
    }

    if (j >= t.length) {
      break;
    }

    // avoid cutting at endpoints or duplicating cuts
    if (
      j > 0 &&
      j < t.length - 1 &&
      (indexes.length === 0 || indexes[indexes.length - 1] !== j)
    ) {
      indexes.push(j);
    }
  }

  const uniqueSortedIndexes = Array.from(new Set(indexes)).sort(
    (a, b) => a - b
  );

  if (uniqueSortedIndexes.length === 0) {
    return [subPath]; // if not cuts, return original
  }

  return subdivideSubPathAtIndices(subPath, uniqueSortedIndexes);
};

const subdivideSubPathAtIndices = (
  subPath: SubPath,
  indices: number[]
): SubPath[] => {
  const sortedIndices = [...indices]; // sorted previously

  const newSubPaths: SubPath[] = [];

  let currentSubPath: SubPath = [];
  let splitIdx = sortedIndices.shift();
  let ordinal = 0;

  let lastPoint: PathPoint | null = null;

  for (const cmd of subPath) {
    switch (cmd.kind) {
      case 'moveTo':
      case 'lineTo': {
        if (cmd.points) {
          let i = 0;
          for (const point of cmd.points) {
            if (splitIdx === ordinal) {
              if (currentSubPath.length > 0) {
                newSubPaths.push(currentSubPath);
              }

              if (lastPoint) {
                const moveCmd: PathCommand = {
                  kind: 'moveTo',
                  mode: PathCoordMode.Absolute,
                  points: [{ ...lastPoint }],
                };

                currentSubPath = [moveCmd];
              } else {
                currentSubPath = [];
              }

              splitIdx = sortedIndices.shift();
            }

            // if original was 'moveTo' and this is not the first
            // point, emit an implicit 'lineTo' per SVG spec
            const outKind: PathCommandKind =
              cmd.kind === 'moveTo' && i > 0 ? 'lineTo' : cmd.kind;

            const newCmd: PathCommand = {
              kind: outKind,
              mode: cmd.mode,
              points: [{ ...point }],
            };

            currentSubPath.push(newCmd);

            // update the last point
            lastPoint = { ...point };

            ordinal += 1;

            i += 1;
          }
        }

        break;
      }

      case 'hLineTo': {
        if (cmd.x) {
          for (const x of cmd.x) {
            if (splitIdx === ordinal) {
              if (currentSubPath.length > 0) {
                newSubPaths.push(currentSubPath);
              }

              if (lastPoint) {
                const moveCmd: PathCommand = {
                  kind: 'moveTo',
                  mode: PathCoordMode.Absolute,
                  points: [{ ...lastPoint }],
                };

                currentSubPath = [moveCmd];
              } else {
                currentSubPath = [];
              }

              splitIdx = sortedIndices.shift();
            }

            const newCmd: PathCommand = {
              kind: 'hLineTo',
              mode: cmd.mode,
              x: [x],
            };

            currentSubPath.push(newCmd);

            // calculate the new absolute position
            if (cmd.mode === PathCoordMode.Absolute) {
              lastPoint = { x, y: lastPoint ? lastPoint.y : 0 };
            } else {
              lastPoint = {
                x: lastPoint ? lastPoint.x + x : x,
                y: lastPoint ? lastPoint.y : 0,
              };
            }

            ordinal += 1;
          }
        }

        break;
      }

      case 'vLineTo': {
        if (cmd.y) {
          for (const y of cmd.y) {
            if (splitIdx === ordinal) {
              if (currentSubPath.length > 0) {
                newSubPaths.push(currentSubPath);
              }

              if (lastPoint) {
                const moveCmd: PathCommand = {
                  kind: 'moveTo',
                  mode: PathCoordMode.Absolute,
                  points: [{ ...lastPoint }],
                };

                currentSubPath = [moveCmd];
              } else {
                currentSubPath = [];
              }

              splitIdx = sortedIndices.shift();
            }

            const newCmd: PathCommand = {
              kind: 'vLineTo',
              mode: cmd.mode,
              y: [y],
            };

            currentSubPath.push(newCmd);

            // calculate the new absolute position
            if (cmd.mode === PathCoordMode.Absolute) {
              lastPoint = { x: lastPoint ? lastPoint.x : 0, y };
            } else {
              lastPoint = {
                x: lastPoint ? lastPoint.x : 0,
                y: lastPoint ? lastPoint.y + y : y,
              };
            }

            ordinal += 1;
          }
        }

        break;
      }

      case 'curveTo': {
        if (cmd.points) {
          for (let i = 0; i < cmd.points.length; i += 3) {
            const control1 = cmd.points[i];
            const control2 = cmd.points[i + 1];
            const endPoint = cmd.points[i + 2];

            if (!control1 || !control2 || !endPoint) {
              // invariant violation safe fallback
              return [subPath];
            }

            if (splitIdx === ordinal) {
              if (currentSubPath.length > 0) {
                newSubPaths.push(currentSubPath);
              }

              if (lastPoint) {
                const moveCmd: PathCommand = {
                  kind: 'moveTo',
                  mode: PathCoordMode.Absolute,
                  points: [{ ...lastPoint }],
                };

                currentSubPath = [moveCmd];
              } else {
                currentSubPath = [];
              }

              splitIdx = sortedIndices.shift();
            }

            const newCmd: PathCommand = {
              kind: 'curveTo',
              mode: cmd.mode,
              points: [{ ...control1 }, { ...control2 }, { ...endPoint }],
            };

            currentSubPath.push(newCmd);

            // update the last point
            lastPoint = { ...endPoint };

            ordinal += 1;
          }
        }
        break;
      }

      case 'smoothCurveTo':
      case 'quadraticBezierCurveTo': {
        if (cmd.points) {
          for (let i = 0; i < cmd.points.length; i += 2) {
            const control = cmd.points[i];
            const endPoint = cmd.points[i + 1];

            if (!control || !endPoint) {
              // invariant violation safe fallback
              return [subPath];
            }

            if (splitIdx === ordinal) {
              if (currentSubPath.length > 0) {
                newSubPaths.push(currentSubPath);
              }

              if (lastPoint) {
                const moveCmd: PathCommand = {
                  kind: 'moveTo',
                  mode: PathCoordMode.Absolute,
                  points: [{ ...lastPoint }],
                };

                currentSubPath = [moveCmd];
              } else {
                currentSubPath = [];
              }

              splitIdx = sortedIndices.shift();
            }

            const newCmd: PathCommand = {
              kind: cmd.kind,
              mode: cmd.mode,
              points: [{ ...control }, { ...endPoint }],
            };

            currentSubPath.push(newCmd);

            // update the last point
            lastPoint = { ...endPoint };

            ordinal += 1;
          }
        }
        break;
      }

      case 'smoothQuadraticBezierCurveTo': {
        if (cmd.points) {
          for (const endPoint of cmd.points) {
            if (!endPoint) {
              // invariant violation safe fallback
              return [subPath];
            }

            if (splitIdx === ordinal) {
              if (currentSubPath.length > 0) {
                newSubPaths.push(currentSubPath);
              }

              if (lastPoint) {
                const moveCmd: PathCommand = {
                  kind: 'moveTo',
                  mode: PathCoordMode.Absolute,
                  points: [{ ...lastPoint }],
                };

                currentSubPath = [moveCmd];
              } else {
                currentSubPath = [];
              }

              splitIdx = sortedIndices.shift();
            }

            const newCmd: PathCommand = {
              kind: 'smoothQuadraticBezierCurveTo',
              mode: cmd.mode,
              points: [{ ...endPoint }],
            };

            currentSubPath.push(newCmd);

            // update the last point
            lastPoint = { ...endPoint };

            ordinal += 1;
          }
        }

        break;
      }

      case 'ellipticalArc': {
        if (cmd.arcs) {
          for (const arc of cmd.arcs) {
            const [rad, xRot, flags, endPoint] = arc;

            if (!endPoint) {
              throw new Error(
                'Unexpected invalid ellipticalArc (missing endpoint) during subdivide'
              );
            }

            if (splitIdx === ordinal) {
              if (currentSubPath.length > 0) {
                newSubPaths.push(currentSubPath);
              }

              if (lastPoint) {
                const moveCmd: PathCommand = {
                  kind: 'moveTo',
                  mode: PathCoordMode.Absolute,
                  points: [{ ...lastPoint }],
                };

                currentSubPath = [moveCmd];
              } else {
                currentSubPath = [];
              }

              splitIdx = sortedIndices.shift();
            }

            const newCmd: PathCommand = {
              kind: 'ellipticalArc',
              mode: cmd.mode,
              arcs: [
                [
                  { x: rad.x, y: rad.y },
                  xRot,
                  { x: flags.x, y: flags.y },
                  { x: endPoint.x, y: endPoint.y },
                ],
              ],
            };

            currentSubPath.push(newCmd);

            // update the last point
            lastPoint = { ...endPoint };

            ordinal += 1;
          }
        }

        break;
      }

      default: {
        // (i.e. includes 'closePath')

        currentSubPath.push(cmd);

        break;
      }
    }
  }

  // push the remaining subpath if any
  if (currentSubPath.length > 0) {
    newSubPaths.push(currentSubPath);
  }

  return newSubPaths;
};

const subPathToCubic = (subPath: SubPath): SubPath => {
  const points = deriveOnCurvePoints(subPath);

  if (points.length < 2) {
    return subPath;
  }

  const pointsAbs = onCurvePointsToAbsolute(points);

  const [_, t] = chordLengthParameterize(pointsAbs);

  const start = pointsAbs[0];
  const end = pointsAbs[pointsAbs.length - 1];

  if (!start || !end) {
    return subPath;
  }

  const fit = fitCubic(pointsAbs, t, start, end);

  if (!fit) {
    return subPath;
  }

  return [
    {
      kind: 'moveTo',
      mode: PathCoordMode.Absolute,
      points: [start],
    },
    {
      kind: 'curveTo',
      mode: PathCoordMode.Absolute,
      points: [fit.cp1, fit.cp2, end],
    },
  ];
};

const getSubPathEndPointAbs = (sp: SubPath): PathPoint | null => {
  const pts = deriveOnCurvePoints(sp);
  const abs = onCurvePointsToAbsolute(pts);
  return abs.length ? (abs[abs.length - 1] ?? null) : null;
};

const joinSubPaths = (subPaths: SubPath[]): SubPath => {
  if (subPaths.length === 0) {
    return [];
  }

  const joinedSubPath: SubPath = [];
  let previousEndPoint: PathPoint | null = null;

  for (let i = 0; i < subPaths.length; i++) {
    const currentSubPath = subPaths[i];

    if (!currentSubPath || currentSubPath.length === 0) {
      continue;
    }

    const firstCmd = currentSubPath[0];
    if (!firstCmd || firstCmd.kind !== 'moveTo') {
      throw new Error(`SubPath ${i} does not start with a 'moveTo' command`);
    }

    const firstMoveToPoint = firstCmd.points?.[0];
    if (!firstMoveToPoint) {
      throw new Error(`SubPath ${i} 'moveTo' command lacks a point`);
    }

    if (i > 0) {
      if (!previousEndPoint) {
        throw new Error(
          `SubPath ${i} cannot be joined because there is no previous end point`
        );
      }

      const distanceThreshold = 1e-6;
      const dist = distance(previousEndPoint, firstMoveToPoint);
      if (dist > distanceThreshold) {
        throw new Error(
          `SubPath ${i} 'moveTo' point does not match the previous subpath's end point; distance: ${dist}`
        );
      }

      // remove the redundant 'moveTo' before joining
      const cmdsToJoin = currentSubPath.slice(1);
      joinedSubPath.push(...cmdsToJoin);
    } else {
      joinedSubPath.push(...currentSubPath);
    }

    // robustly get the last absolute on-curve point of the current subpath
    const endPoint = getSubPathEndPointAbs(currentSubPath);
    if (endPoint) {
      previousEndPoint = endPoint;
    } else {
      previousEndPoint = null;
    }
  }

  return joinedSubPath;
};

const simplifySubPath = (subPath: SubPath): SubPath => {
  const subPaths = subdivideSubPath(subPath);

  if (subPaths.length === 1 && subPaths[0] !== undefined) {
    return subPathToCubic(subPaths[0]);
  }

  return joinSubPaths(subPaths.map(subPathToCubic));
};

export const simplifyPath = (path: SubPath[]): SubPath[] => {
  return path.map(subPath => simplifySubPath(subPath));
};
