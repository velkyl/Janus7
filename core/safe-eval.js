/**
 * @file core/safe-eval.js
 * @module janus7
 * @phase 1
 *
 * Strikt begrenzte Expression-Evaluation fuer JANUS7.
 *
 * Ziel:
 * - KEIN dynamic function constructor
 * - KEIN `with`
 * - KEINE Funktionsaufrufe
 * - KEIN dynamischer Property-Zugriff via []
 * - KEINE Objekt-/Array-Literale
 *
 * Unterstuetzte Syntax:
 * - Literale: Zahlen, Strings, true, false, null
 * - Identifier / Pfade: week, value, playerState.skills.lore
 * - Operatoren: !, ==, !=, >, >=, <, <=, AND/OR/NOT, &&, ||
 * - Klammern: (...)
 */

const MAX_EXPR_LENGTH = 512;
const BLOCKED_SEGMENTS = new Set(['constructor', 'prototype', '__proto__']);
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const PATH_RE = /^[A-Za-z_][A-Za-z0-9_.]*$/;

/**
 * @typedef {object} SafeExprLiteralNode
 * @property {'literal'} type
 * @property {string|number|boolean|null} value
 */

/**
 * @typedef {object} SafeExprIdentifierNode
 * @property {'identifier'} type
 * @property {string} value
 */

/**
 * @typedef {object} SafeExprUnaryNode
 * @property {'unary'} type
 * @property {'!'} operator
 * @property {SafeExprAst} argument
 */

/**
 * @typedef {object} SafeExprBinaryNode
 * @property {'binary'} type
 * @property {'&&'|'||'|'=='|'!='|'>'|'>='|'<'|'<='} operator
 * @property {SafeExprAst} left
 * @property {SafeExprAst} right
 */

/**
 * @typedef {SafeExprLiteralNode|SafeExprIdentifierNode|SafeExprUnaryNode|SafeExprBinaryNode} SafeExprAst
 */

function _isDigit(ch) {
  return ch >= '0' && ch <= '9';
}

function _isIdentStart(ch) {
  return /[A-Za-z_]/.test(ch);
}

function _isIdent(ch) {
  return /[A-Za-z0-9_]/.test(ch);
}

function _validatePath(path) {
  if (!PATH_RE.test(path)) throw new Error(`Ungueltiger Identifier/Pfad: ${path}`);
  const parts = path.split('.');
  for (const part of parts) {
    if (!IDENTIFIER_RE.test(part)) throw new Error(`Ungueltiges Pfadsegment: ${part}`);
    if (BLOCKED_SEGMENTS.has(part)) throw new Error(`Blockiertes Pfadsegment: ${part}`);
  }
}

function _tokenize(expr) {
  const s = String(expr ?? '').trim();
  if (!s) return [];
  if (s.length > MAX_EXPR_LENGTH) throw new Error(`Expression zu lang (${s.length} > ${MAX_EXPR_LENGTH})`);
  const tokens = [];
  let i = 0;

  while (i < s.length) {
    const ch = s[i];

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (ch === '(' || ch === ')') {
      tokens.push({ type: ch });
      i += 1;
      continue;
    }

    if (ch === '!' && s[i + 1] !== '=') {
      tokens.push({ type: 'op', value: '!' });
      i += 1;
      continue;
    }

    const two = s.slice(i, i + 2);
    if (['&&', '||', '==', '!=', '>=', '<='].includes(two)) {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }

    if (['>', '<'].includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i += 1;
      continue;
    }

    if (_isDigit(ch) || ((ch === '-' || ch === '+') && _isDigit(s[i + 1])) || (ch === '.' && _isDigit(s[i + 1]))) {
      let j = i + 1;
      while (j < s.length && /[0-9.]/.test(s[j])) j += 1;
      const raw = s.slice(i, j);
      if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(raw)) throw new Error(`Ungueltige Zahl: ${raw}`);
      tokens.push({ type: 'number', value: Number(raw) });
      i = j;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let value = '';
      while (j < s.length) {
        const cur = s[j];
        if (cur === '\\') {
          const next = s[j + 1];
          if (!next) throw new Error('Ungueltige Escape-Sequenz');
          value += next;
          j += 2;
          continue;
        }
        if (cur === quote) break;
        value += cur;
        j += 1;
      }
      if (j >= s.length || s[j] !== quote) throw new Error('Stringliteral nicht geschlossen');
      tokens.push({ type: 'string', value });
      i = j + 1;
      continue;
    }

    if (_isIdentStart(ch)) {
      let j = i + 1;
      while (j < s.length && (_isIdent(s[j]) || s[j] === '.')) j += 1;
      const raw = s.slice(i, j);
      const upper = raw.toUpperCase();
      if (upper === 'AND') {
        tokens.push({ type: 'op', value: '&&' });
      } else if (upper === 'OR') {
        tokens.push({ type: 'op', value: '||' });
      } else if (upper === 'NOT') {
        tokens.push({ type: 'op', value: '!' });
      } else if (upper === 'TRUE') {
        tokens.push({ type: 'literal', value: true });
      } else if (upper === 'FALSE') {
        tokens.push({ type: 'literal', value: false });
      } else if (upper === 'NULL') {
        tokens.push({ type: 'literal', value: null });
      } else {
        _validatePath(raw);
        tokens.push({ type: 'identifier', value: raw });
      }
      i = j;
      continue;
    }

    throw new Error(`Unerlaubtes Zeichen in Expression: ${ch}`);
  }

  return tokens;
}

function _readPath(ctx, path) {
  if (!ctx || typeof ctx !== 'object') return undefined;
  const parts = String(path).split('.');
  let current = ctx;
  for (const part of parts) {
    if (BLOCKED_SEGMENTS.has(part)) return undefined;
    if (current == null || typeof current !== 'object') return undefined;
    if (!Object.prototype.hasOwnProperty.call(current, part)) return undefined;
    current = current[part];
  }
  return current;
}

function _literalNode(value) {
  return { type: 'literal', value };
}

function _binaryNode(operator, left, right) {
  return { type: 'binary', operator, left, right };
}

function _unaryNode(operator, argument) {
  return { type: 'unary', operator, argument };
}

function _parse(tokens) {
  let index = 0;

  function peek() {
    return tokens[index] ?? null;
  }

  function consume(type = null, value = null) {
    const token = peek();
    if (!token) return null;
    if (type && token.type !== type) return null;
    if (value != null && token.value !== value) return null;
    index += 1;
    return token;
  }

  function parsePrimary() {
    const token = peek();
    if (!token) throw new Error('Unerwartetes Ende der Expression');
    if (consume('(')) {
      const node = parseOr();
      if (!consume(')')) throw new Error('Fehlende schliessende Klammer');
      return node;
    }
    if (token.type === 'number' || token.type === 'string' || token.type === 'literal') {
      index += 1;
      return _literalNode(token.value);
    }
    if (token.type === 'identifier') {
      index += 1;
      return { type: 'identifier', value: token.value };
    }
    throw new Error(`Unerwartetes Token: ${token.type}${token.value ? ` (${token.value})` : ''}`);
  }

  function parseUnary() {
    const token = peek();
    if (token?.type === 'op' && token.value === '!') {
      consume('op', '!');
      return _unaryNode('!', parseUnary());
    }
    return parsePrimary();
  }

  function parseCompare() {
    let node = parseUnary();
    while (true) {
      const token = peek();
      if (!token || token.type !== 'op' || !['==', '!=', '>', '>=', '<', '<='].includes(token.value)) break;
      consume('op', token.value);
      node = _binaryNode(token.value, node, parseUnary());
    }
    return node;
  }

  function parseAnd() {
    let node = parseCompare();
    while (consume('op', '&&')) {
      node = _binaryNode('&&', node, parseCompare());
    }
    return node;
  }

  function parseOr() {
    let node = parseAnd();
    while (consume('op', '||')) {
      node = _binaryNode('||', node, parseAnd());
    }
    return node;
  }

  const ast = parseOr();
  if (index < tokens.length) {
    const token = tokens[index];
    throw new Error(`Unerwartetes Rest-Token: ${token.type}${token.value ? ` (${token.value})` : ''}`);
  }
  return ast;
}

function _evaluate(node, ctx) {
  switch (node?.type) {
    case 'literal':
      return node.value;
    case 'identifier':
      return _readPath(ctx, node.value);
    case 'unary':
      if (node.operator === '!') return !_evaluate(node.argument, ctx);
      return undefined;
    case 'binary': {
      if (node.operator === '&&') return Boolean(_evaluate(node.left, ctx)) && Boolean(_evaluate(node.right, ctx));
      if (node.operator === '||') return Boolean(_evaluate(node.left, ctx)) || Boolean(_evaluate(node.right, ctx));
      const left = _evaluate(node.left, ctx);
      const right = _evaluate(node.right, ctx);
      switch (node.operator) {
        case '==': return left == right;
        case '!=': return left != right;
        case '>': return left > right;
        case '>=': return left >= right;
        case '<': return left < right;
        case '<=': return left <= right;
        default: return undefined;
      }
    }
    default:
      return undefined;
  }
}

/**
 * Compiles a restricted boolean expression into a safe predicate function.
 *
 * @param {string} expr
 * @returns {(ctx?: Record<string, unknown>) => boolean}
 */
export function compileSafeBoolExpr(expr) {
  const source = String(expr ?? '').trim();
  if (!source) return () => true;
  const tokens = _tokenize(source);
  const ast = _parse(tokens);
  return (ctx = {}) => {
    try {
      return Boolean(_evaluate(ast, ctx));
    } catch {
      return false;
    }
  };
}

/**
 * Parses a restricted expression string into an abstract syntax tree.
 *
 * @param {string} expr
 * @returns {SafeExprAst|null}
 */
export function parseSafeExpr(expr) {
  const source = String(expr ?? '').trim();
  if (!source) return null;
  return _parse(_tokenize(source));
}

/**
 * Evaluates a previously parsed expression tree against a context object.
 *
 * @param {SafeExprAst|null} ast
 * @param {Record<string, unknown>} [ctx]
 * @returns {boolean}
 */
export function evalSafeAst(ast, ctx = {}) {
  try {
    return Boolean(_evaluate(ast, ctx));
  } catch {
    return false;
  }
}

/**
 * Normalizes a nullable input into a trimmed string.
 *
 * @param {unknown} v
 * @returns {string}
 */
export function safeString(v) { return String(v ?? '').trim(); }

/**
 * Converts a value to a finite number and falls back to `0` for invalid input.
 *
 * @param {unknown} v
 * @returns {number}
 */
export function toNumber(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
