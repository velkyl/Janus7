import { parseSafeExpr, evalSafeAst } from '../../../../core/safe-eval.js';

function _normalize(expr) {
  return String(expr ?? '')
    .replace(/\bAND\b/gi, '&&')
    .replace(/\bOR\b/gi, '||')
    .replace(/\bNOT\b/gi, '!')
    .trim();
}

export function parseExpr(expr) {
  return parseSafeExpr(_normalize(expr));
}

export function evalAst(ast, ctx) {
  return evalSafeAst(ast, ctx);
}

export function parseCheckExpr(expr) {
  const raw = String(expr ?? '').trim();
  const m = raw.match(/^CHECK\(([^,]+),\s*(?:DC\s*=\s*)?(\d+)\)$/i);
  if (m) return { type: 'check', key: m[1].trim(), dc: Number.parseInt(m[2], 10) };
  return null;
}
