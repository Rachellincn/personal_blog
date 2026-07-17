type Variables = Record<string, number>;
type Node = (variables: Variables) => number;

const functions: Record<string, (value: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  exp: Math.exp,
  log: Math.log,
  sqrt: Math.sqrt,
  abs: Math.abs,
};

const cache = new Map<string, Node>();

export function compileExpression(source: string): Node {
  const normalized = source.replace(/\s+/g, "").toLowerCase();
  const cached = cache.get(normalized);
  if (cached) return cached;
  const node = new Parser(normalized).parse();
  cache.set(normalized, node);
  return node;
}

export function evaluateExpression(
  source: string,
  variables: Variables,
  fallback = 0,
) {
  try {
    const value = compileExpression(source)(variables);
    return Number.isFinite(value) && Math.abs(value) < 1e8 ? value : fallback;
  } catch {
    return fallback;
  }
}

class Parser {
  private index = 0;
  private readonly source: string;
  constructor(source: string) {
    this.source = source;
  }
  parse() {
    if (!this.source) throw new Error("Empty expression");
    const node = this.expression();
    if (this.index !== this.source.length)
      throw new Error(`Unexpected token at ${this.index}`);
    return node;
  }
  private expression(): Node {
    let left = this.term();
    while (this.peek() === "+" || this.peek() === "-") {
      const operator = this.take();
      const right = this.term();
      const previous = left;
      left = operator === "+"
        ? (variables) => previous(variables) + right(variables)
        : (variables) => previous(variables) - right(variables);
    }
    return left;
  }
  private term(): Node {
    let left = this.power();
    while (this.peek() === "*" || this.peek() === "/") {
      const operator = this.take();
      const right = this.power();
      const previous = left;
      left = operator === "*"
        ? (variables) => previous(variables) * right(variables)
        : (variables) => previous(variables) / right(variables);
    }
    return left;
  }
  private power(): Node {
    const base = this.unary();
    if (this.peek() !== "^") return base;
    this.take();
    const exponent = this.power();
    return (variables) => base(variables) ** exponent(variables);
  }
  private unary(): Node {
    if (this.peek() === "+") {
      this.take();
      return this.unary();
    }
    if (this.peek() === "-") {
      this.take();
      const value = this.unary();
      return (variables) => -value(variables);
    }
    return this.primary();
  }
  private primary(): Node {
    if (this.peek() === "(") {
      this.take();
      const value = this.expression();
      this.expect(")");
      return value;
    }
    const number = this.readNumber();
    if (number !== null) return () => number;
    const identifier = this.readIdentifier();
    if (!identifier) throw new Error(`Expected value at ${this.index}`);
    if (identifier === "pi") return () => Math.PI;
    if (identifier === "e") return () => Math.E;
    if (functions[identifier]) {
      this.expect("(");
      const argument = this.expression();
      this.expect(")");
      return (variables) => functions[identifier](argument(variables));
    }
    return (variables) => variables[identifier] ?? 0;
  }
  private readNumber() {
    const match = this.source.slice(this.index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/);
    if (!match) return null;
    this.index += match[0].length;
    return Number(match[0]);
  }
  private readIdentifier() {
    const match = this.source.slice(this.index).match(/^[a-z][a-z0-9_]*/);
    if (!match) return "";
    this.index += match[0].length;
    return match[0];
  }
  private peek() { return this.source[this.index] ?? ""; }
  private take() { return this.source[this.index++] ?? ""; }
  private expect(character: string) {
    if (this.take() !== character)
      throw new Error(`Expected ${character} at ${this.index - 1}`);
  }
}
