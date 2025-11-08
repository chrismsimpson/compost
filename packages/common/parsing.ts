// source stuff

export interface Source {
  contents: string;
}

export interface Lexer {
  source: Source;
  position: number;
}

export const lexerIsEof = (lexer: Lexer): boolean => {
  return lexer.position >= lexer.source.contents.length;
};

export const lexerPeek = (lexer: Lexer): string | Error => {
  if (lexerIsEof(lexer)) {
    return new Error('eof reached');
  }

  // biome-ignore lint/style/noNonNullAssertion: :|
  return lexer.source.contents[lexer.position]!;
};

export const lexerPeekLength = (
  lexer: Lexer,
  length: number
): string | Error => {
  if (lexer.position + length > lexer.source.contents.length) {
    return new Error('eof reached');
  }

  return lexer.source.contents.slice(lexer.position, lexer.position + length);
};

export const lexerMatch = (
  lexer: Lexer,
  value: string | ((i: string) => boolean),
  distance = 0,
  length = 1
): boolean => {
  if (lexerIsEof(lexer)) {
    return false;
  }

  const _length =
    Math.max(
      1,
      typeof value === 'string' && length > value.length ? value.length : length
    ) + distance;

  const end = lexer.position + _length;

  if (end > lexer.source.contents.length) {
    return false;
  }

  const peek = lexerPeekLength(lexer, _length);

  if (peek instanceof Error) {
    return false;
  }

  const peekAtDistance = peek.slice(distance);

  if (peekAtDistance === null || peekAtDistance === undefined) {
    return false;
  }

  return typeof value === 'string'
    ? peekAtDistance === value
    : value(peekAtDistance);
};

export const isDigit = (c: string): boolean => {
  return c >= '0' && c <= '9';
};

export const isNumberSignificand = (c: string): boolean => {
  return isDigit(c) || c === 'e' || c === 'E' || c === '-';
};

// parsing stuff

export interface Parser<T> {
  source: Source;
  tokens: T[];
  position: number;
}

export const parserIsEof = <T>(parser: Parser<T>): boolean => {
  if (parser.position >= parser.tokens.length) {
    return true;
  }

  const current = parser.tokens[parser.position];

  if (!current) {
    return true;
  }

  return (
    typeof current === 'object' &&
    current !== null &&
    'kind' in current &&
    current.kind === 'eof'
  );
};
