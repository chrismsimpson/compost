import {
  type Lexer,
  lexerIsEof,
  lexerPeek,
  type Source,
  type Parser,
  parserIsEof,
} from './parsing';

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
      x: Number.parseFloat(x.value || '0'),
      y: Number.parseFloat(y.value || '0'),
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
    x: Number.parseFloat(x.value || '0'),
    y: Number.parseFloat(y.value || '0'),
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

  const flagsToken = parsePathCommandPoint(parser);

  if (flagsToken instanceof Error) {
    return flagsToken;
  }

  skipCommas(parser);

  ///

  const end = parsePathCommandPoint(parser);

  if (end instanceof Error) {
    return end;
  }

  ///

  return [rad, rotation, flagsToken, end];
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
    return new Error('expected command');
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
    return new Error('eof reached');
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

      const arcs = cmd.arcs.map(arc => {
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
      });

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
    .map(instr => {
      return stringifyPathCommand(instr);
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

export type CoordModePathPoint = {
  mode: PathCoordMode;
  point: PathPoint;
};

export const deriveOnCurvePoints = (subPath: SubPath): CoordModePathPoint[] => {
  const points: CoordModePathPoint[] = [];

  let pos: CoordModePathPoint = {
    mode: PathCoordMode.Absolute,
    point: { x: 0, y: 0 },
  };

  for (const cmd of subPath) {
    switch (cmd.kind) {
      case 'moveTo':
      case 'lineTo': {
        if (cmd.points) {
          for (const p of cmd.points) {
            const pp: CoordModePathPoint = {
              mode: cmd.mode || PathCoordMode.Absolute,
              point: p,
            };

            points.push(pp);

            pos = pp;
          }
        }

        break;
      }

      case 'hLineTo': {
        if (cmd.x) {
          for (const n of cmd.x) {
            const p: PathPoint =
              (cmd.mode || PathCoordMode.Absolute) === PathCoordMode.Absolute
                ? { x: n, y: pos.point.y }
                : { x: n, y: 0 };

            const pp: CoordModePathPoint = {
              mode: cmd.mode || PathCoordMode.Absolute,
              point: p,
            };

            points.push(pp);

            pos = pp;
          }
        }

        break;
      }

      case 'vLineTo': {
        if (cmd.y) {
          for (const n of cmd.y) {
            const p: PathPoint =
              (cmd.mode || PathCoordMode.Absolute) === PathCoordMode.Absolute
                ? { x: pos.point.x, y: n }
                : { x: 0, y: n };

            const pp: CoordModePathPoint = {
              mode: cmd.mode || PathCoordMode.Absolute,
              point: p,
            };

            points.push(pp);

            pos = pp;
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

            const pp: CoordModePathPoint = {
              mode: cmd.mode || PathCoordMode.Absolute,
              point: endPoint,
            };

            points.push(pp);

            pos = pp;
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

            const pp: CoordModePathPoint = {
              mode: cmd.mode || PathCoordMode.Absolute,
              point: endPoint,
            };

            points.push(pp);

            pos = pp;
          }
        }

        break;
      }

      case 'smoothQuadraticBezierCurveTo': {
        if (cmd.points) {
          for (const endPoint of cmd.points) {
            const pp: CoordModePathPoint = {
              mode: cmd.mode || PathCoordMode.Absolute,
              point: endPoint,
            };

            points.push(pp);

            pos = pp;
          }
        }

        break;
      }

      case 'ellipticalArc': {
        if (cmd.arcs) {
          for (const arc of cmd.arcs) {
            const endPoint = arc[3];

            const pp: CoordModePathPoint = {
              mode: cmd.mode || PathCoordMode.Absolute,
              point: endPoint,
            };

            points.push(pp);

            pos = pp;
          }
        }

        break;
      }

      case 'closePath': {
        // close path will mean there are two points at
        // the same position (tail and head) but this
        // required for accurately calculating length

        const first = points[0];

        if (first) {
          points.push(first);
        }

        break;
      }

      default: {
        break;
      }
    }
  }

  return points;
};

export const onCurvePointsToAbsolute = (
  points: CoordModePathPoint[]
): PathPoint[] => {
  const pointsAbs: PathPoint[] = [];

  let posAbs = { x: 0, y: 0 };

  for (const pp of points) {
    const p = pp.point;

    const pointAbs =
      pp.mode === PathCoordMode.Absolute
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
