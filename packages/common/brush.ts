import {
  type Lexer,
  lexerIsEof,
  lexerMatch,
  lexerPeek,
  type Parser,
  parserIsEof,
  type Source,
} from './parsing';

// brush lexing

const isBrushSignificand = (c: string): boolean => {
  return '0123456789abcdefABCDEF'.includes(c);
};

const isBrushName = (c: string): boolean => {
  return 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(c);
};

export type BrushTokenKind = 'punc' | 'number' | 'name' | 'unknown' | 'eof';

export type BrushToken = {
  kind: BrushTokenKind;
  value?: string | null;
};

const lexBrushToken = (lexer: Lexer): BrushToken[] | Error => {
  const lexHexComponents = (): BrushToken[] => {
    const components: BrushToken[] = [];

    while (!lexerIsEof(lexer)) {
      const component = lexer.source.contents.slice(
        lexer.position,
        lexer.position + 2
      );

      if (component.length !== 2) {
        break;
      }

      components.push({ kind: 'number', value: component });

      lexer.position += 2;

      ///

      if (components.length === 4) {
        break;
      }
    }

    return components;
  };

  ///

  while (!lexerIsEof(lexer)) {
    const peek = lexerPeek(lexer);

    if (peek instanceof Error) {
      return peek;
    }

    ///

    let unknown = false;

    switch (peek) {
      // punc

      case ',':
      case ':':
      case ';':
      case '(':
      case ')': {
        lexer.position += 1;
        return [{ kind: 'punc', value: peek }];
      }

      // special case

      case '#': {
        lexer.position += 1;

        let tokens: BrushToken[] = [{ kind: 'punc', value: peek }];

        const hexComponents = lexHexComponents();

        if (hexComponents.length === 3 || hexComponents.length === 4) {
          tokens = [...tokens, ...hexComponents];
        }

        return tokens;
      }

      // biome-ignore lint/suspicious/noFallthroughSwitchClause: intentional fallthrough
      case '0': {
        if (lexerMatch(lexer, 'x', 1)) {
          lexer.position += 2;

          let tokens: BrushToken[] = [{ kind: 'punc', value: '0x' }];

          const hexComponents = lexHexComponents();

          if (hexComponents.length === 3 || hexComponents.length === 4) {
            tokens = [...tokens, ...hexComponents];
          }

          return tokens;
        }

        // fallthrough
      }

      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
      case 'a':
      case 'b':
      case 'c':
      case 'd':
      case 'e':
      case 'f':
      case 'A':
      case 'B':
      case 'C':
      case 'D':
      case 'E':
      case 'F': {
        const start = lexer.position;

        while (!lexerIsEof(lexer)) {
          lexer.position += 1;

          if (lexerIsEof(lexer)) {
            break;
          }

          if (
            lexerMatch(lexer, '.') &&
            !lexerMatch(lexer, isBrushSignificand, 1)
          ) {
            break;
          }

          if (
            !lexerMatch(lexer, '.') &&
            !lexerMatch(lexer, isBrushSignificand)
          ) {
            break;
          }
        }

        const source = lexer.source.contents.slice(start, lexer.position);

        return [{ kind: 'number', value: source }];
      }

      // whitespace

      case '\r':
      case ' ':
      case '\t':
      case '\n': {
        lexer.position += 1;

        break;
      }

      // names

      default: {
        if (peek && isBrushName(peek)) {
          const start = lexer.position;

          while (!lexerIsEof(lexer)) {
            lexer.position += 1;

            if (lexerIsEof(lexer)) {
              break;
            }

            if (!lexerMatch(lexer, isBrushName)) {
              break;
            }
          }

          const source = lexer.source.contents.slice(start, lexer.position);

          return [{ kind: 'name', value: source }];
        }

        unknown = true;

        break;
      }
    }

    ///

    if (unknown) {
      lexer.position += 1;
      return [{ kind: 'unknown', value: peek }];
    }
  }

  ///

  return [{ kind: 'eof', value: null }];
};

const lexBrushTokensFromSource = (source: Source): BrushToken[] | Error => {
  const lexer: Lexer = { source, position: 0 };

  const tokens: BrushToken[] = [];

  while (!lexerIsEof(lexer)) {
    const subTokens = lexBrushToken(lexer);

    if (subTokens instanceof Error) {
      return subTokens;
    }

    tokens.push(...subTokens);
  }

  ///

  if (tokens[tokens.length - 1]?.kind !== 'eof') {
    tokens.push({ kind: 'eof' });
  }

  ///

  return tokens;
};

// brush type

export type Brush = {
  red: number;
  green: number;
  blue: number;
  alpha?: number | null;
  width?: number | null;
  unit?: string | null;
  style?: string | null;
};

// brush parsing

const isColorBrushPrefix = (prefix: BrushToken): boolean => {
  if (
    prefix.kind === 'punc' &&
    (prefix.value === '#' || prefix.value === '0x')
  ) {
    return true;
  }

  if (
    prefix.kind === 'name' &&
    (prefix.value === 'rgb' || prefix.value === 'rgba')
  ) {
    return true;
  }

  return false;
};

const parseBrushStroke = (
  parser: Parser<BrushToken>
): [number, string, string] | Error => {
  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  const multiplier = parser.tokens[parser.position];

  if (multiplier?.kind !== 'number' || !multiplier.value) {
    return new Error('Expected number');
  }

  parser.position += 1;

  ///

  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  const unit = parser.tokens[parser.position];

  if (!unit || unit.kind !== 'name') {
    return new Error('Expected name');
  }

  const validUnits = ['px', 'pt', 'em', 'rem', 'vw'];

  if (!unit.value || !validUnits.includes(unit.value)) {
    return new Error(`Expected valid unit, instead found '${unit.value}'`);
  }

  parser.position += 1;

  ///

  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  const style = parser.tokens[parser.position];

  if (!style || style.kind !== 'name') {
    return new Error('Expected name');
  }

  const validStyles = [
    'solid',
    'dotted',
    'dashed',
    'double',
    'groove',
    'ridge',
    'inset',
    'outset',
    'none',
    'hidden',
  ];

  if (!style.value || !validStyles.includes(style.value)) {
    return new Error(`Expected valid style, instead found '${style.value}'`);
  }

  parser.position += 1;

  ///

  return [Number.parseFloat(multiplier.value), unit.value, style.value];
};

const parseBrushColor = (
  parser: Parser<BrushToken>
): [number, number, number, number | null] | Error => {
  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  ///

  // TODO: extend to support hsl, hsv, etc.

  ///

  const prefix = parser.tokens[parser.position];

  if (!prefix || !isColorBrushPrefix(prefix)) {
    return new Error(
      `Expected a color starting with '#' or '0x' or 'rgb' or 'rgba'`
    );
  }

  parser.position += 1;

  ///

  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  const isRgb = prefix.value === 'rgb';
  const isRgba = prefix.value === 'rgba';

  if (isRgb || isRgba) {
    const openParen = parser.tokens[parser.position];

    if (!openParen || openParen.kind !== 'punc' || openParen.value !== '(') {
      return new Error(`Expected '('`);
    }

    parser.position += 1;
  }

  ///

  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  const component1 = parser.tokens[parser.position];

  if (!component1 || component1.kind !== 'number') {
    return new Error('Expected number');
  }

  parser.position += 1;

  ///

  if (isRgb || isRgba) {
    if (parserIsEof(parser)) {
      return new Error('eof reached');
    }

    const comma1 = parser.tokens[parser.position];

    if (!comma1 || comma1.kind !== 'punc' || comma1.value !== ',') {
      return new Error(`Expected ','`);
    }

    parser.position += 1;
  }

  ///

  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  const component2 = parser.tokens[parser.position];

  if (!component2 || component2.kind !== 'number') {
    return new Error('Expected number');
  }

  parser.position += 1;

  ///

  if (isRgb || isRgba) {
    if (parserIsEof(parser)) {
      return new Error('eof reached');
    }

    const comma2 = parser.tokens[parser.position];

    if (!comma2 || comma2.kind !== 'punc' || comma2.value !== ',') {
      return new Error(`Expected ','`);
    }

    parser.position += 1;
  }

  ///

  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  const component3 = parser.tokens[parser.position];

  if (!component3 || component3.kind !== 'number') {
    return new Error('Expected number');
  }

  parser.position += 1;

  ///

  let component4: BrushToken | null = null;

  ///

  if (isRgba) {
    if (parserIsEof(parser)) {
      return new Error('eof reached');
    }

    const comma3 = parser.tokens[parser.position];

    if (!comma3 || comma3.kind !== 'punc' || comma3.value !== ',') {
      return new Error(`Expected ','`);
    }

    parser.position += 1;

    ///

    if (parserIsEof(parser)) {
      return new Error('eof reached');
    }

    const possibleComponent4 = parser.tokens[parser.position];

    if (!possibleComponent4 || possibleComponent4.kind !== 'number') {
      return new Error('Expected number for alpha in rgba');
    }

    parser.position += 1;

    ///

    component4 = possibleComponent4;
  } else if (!parserIsEof(parser)) {
    const possibleComponent4 = parser.tokens[parser.position];

    if (possibleComponent4 && possibleComponent4.kind === 'number') {
      component4 = possibleComponent4;

      parser.position += 1;
    }
  }

  ///

  if (isRgb || isRgba) {
    if (parserIsEof(parser)) {
      return new Error('eof reached');
    }

    const closeParen = parser.tokens[parser.position];

    if (!closeParen || closeParen.kind !== 'punc' || closeParen.value !== ')') {
      return new Error(`Expected ')'`);
    }

    parser.position += 1;
  }

  ///

  if (isRgb || isRgba) {
    return [
      Number.parseFloat(component1.value ?? '0'),
      Number.parseFloat(component2.value ?? '0'),
      Number.parseFloat(component3.value ?? '0'),
      component4 ? Number.parseFloat(component4.value ?? '0') : null,
    ];
  }

  ///

  return [
    Number.parseInt(component1.value ?? '0', 16),
    Number.parseInt(component2.value ?? '0', 16),
    Number.parseInt(component3.value ?? '0', 16),
    component4 ? Number.parseInt(component4.value ?? '0', 16) : null,
  ];
};

export const parseBrush = (input: string): Brush | Error => {
  const source = { contents: input };

  const tokens = lexBrushTokensFromSource(source);

  if (tokens instanceof Error) {
    return tokens;
  }

  if (!tokens) {
    return new Error('expected brush tokens');
  }

  ///

  const parser: Parser<BrushToken> = { source, tokens, position: 0 };

  ///

  if (parserIsEof(parser)) {
    return new Error('eof reached');
  }

  const peek = parser.tokens[parser.position];

  if (!peek) {
    return new Error('Expected token');
  }

  ///

  // first handle 'none' case

  if (peek.kind === 'name' && peek.value === 'none') {
    return {
      red: 0,
      green: 0,
      blue: 0,
      alpha: 0,
      width: null,
      unit: null,
      style: null,
    };
  }

  ///

  // next, if things are prefixed with a number, we can presume it's a stroke brush

  let stroke: [number, string, string] | null = null;

  if (peek.kind === 'number') {
    const _stroke = parseBrushStroke(parser);

    if (_stroke instanceof Error) {
      return _stroke;
    }

    if (!_stroke) {
      return new Error('Expected stroke');
    }

    stroke = _stroke;
  }

  ///

  const color = parseBrushColor(parser);

  if (color instanceof Error) {
    return color;
  }

  if (!color) {
    return new Error('Expected color');
  }

  ///

  return {
    red: color[0],
    green: color[1],
    blue: color[2],
    alpha: color[3],
    width: stroke ? stroke[0] : null,
    unit: stroke ? stroke[1] : null,
    style: stroke ? stroke[2] : null,
  };
};
