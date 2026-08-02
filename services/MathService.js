const BaseService = require("./BaseService");
const { create, all } = require("mathjs");

// Maximum allowed expression length to prevent abuse
const MAX_EXPRESSION_LENGTH = 500;

// Forbidden AST symbol names that must not be referenced in expressions
const FORBIDDEN_SYMBOLS = new Set([
  "import",
  "createUnit",
  "evaluate",
  "parse",
  "simplify",
  "derivative",
  "eval",
  "Function",
  "process",
  "require",
  "global",
  "window",
  "document",
]);

class MathService extends BaseService {
  constructor(locator) {
    super(locator);
    this.math = this._createMathInstance();
  }

  /**
   * Creates a configured mathjs instance with Casio-style custom functions.
   */
  _createMathInstance() {
    const math = create(all);

    // Register custom functions for Casio-style operations
    math.import(
      {
        // Factorial — gamma(n + 1)
        factorial: function (n) {
          if (typeof n !== "number" || isNaN(n)) {
            throw new Error("Invalid argument for factorial.");
          }
          if (n < 0) {
            throw new Error("Factorial is not defined for negative numbers.");
          }
          return math.gamma(n + 1);
        },

        // Base conversion helpers
        bin: function (n) {
          return "0b" + Math.trunc(n).toString(2);
        },
        oct: function (n) {
          return "0o" + Math.trunc(n).toString(8);
        },
        hex: function (n) {
          return "0x" + Math.trunc(n).toString(16).toUpperCase();
        },

        // Degree-based trigonometric helpers
        sind: function (x) {
          return math.sin(math.unit(x, "deg"));
        },
        cosd: function (x) {
          return math.cos(math.unit(x, "deg"));
        },
        tand: function (x) {
          return math.tan(math.unit(x, "deg"));
        },
        asind: function (x) {
          return math.number(math.asin(x), "deg");
        },
        acosd: function (x) {
          return math.number(math.acos(x), "deg");
        },
        atand: function (x) {
          return math.number(math.atan(x), "deg");
        },

        // Random — rand() or rand(min, max)
        rand: function (...args) {
          if (args.length === 0) return Math.random();
          if (args.length === 2) {
            const [min, max] = args;
            return Math.floor(Math.random() * (max - min + 1)) + min;
          }
          throw new Error("rand() expects 0 or 2 arguments.");
        },

        // Combinatorics — nCr & nPr
        C: function (n, r) {
          return math.combinations(n, r);
        },
        P: function (n, r) {
          return math.permutations(n, r);
        },
      },
      { override: true },
    );

    return math;
  }

  /**
   * Preprocesses raw expression string into mathjs-compatible syntax.
   * Handles: n! syntax, nCr/nPr notation, degree keyword in trig functions.
   */
  _preprocess(expr) {
    let processed = expr.trim();

    // Replace `(expr)!` with factorial(expr)
    processed = processed.replace(/\(([^)]+)\)!/g, "factorial($1)");

    // Replace `n!` (number followed by !) with factorial(n)
    processed = processed.replace(/(\d+)!/g, "factorial($1)");

    // Replace `nCr` notation: 10C3 → C(10,3)
    processed = processed.replace(/(\d+)\s*C\s*(\d+)/gi, "C($1,$2)");

    // Replace `nPr` notation: 10P4 → P(10,4)
    processed = processed.replace(/(\d+)\s*P\s*(\d+)/gi, "P($1,$2)");

    // Replace `deg` keyword inside trig: sin(30 deg) → sind(30)
    processed = processed.replace(
      /\b(sin|cos|tan)\s*\(\s*([^)]+?)\s+deg\s*\)/gi,
      (_, fn, arg) => `${fn.toLowerCase()}d(${arg})`,
    );

    // Replace `asin/acos/atan` with deg output: asin(0.5 deg) → asind(0.5)
    processed = processed.replace(
      /\b(asin|acos|atan)\s*\(\s*([^)]+?)\s+deg\s*\)/gi,
      (_, fn, arg) => `${fn.toLowerCase()}d(${arg})`,
    );

    // Replace `log(x)` (Casio convention: base-10) → `log10(x)`
    processed = processed.replace(/\blog\s*\(/g, "log10(");

    // Replace `ln(x)` → `log(x)` (mathjs log = natural log)
    processed = processed.replace(/\bln\s*\(/g, "log(");

    // Replace `cbrt(x)` → `nthRoot(x, 3)`
    processed = processed.replace(
      /\bcbrt\s*\(\s*([^)]+)\s*\)/g,
      "nthRoot($1, 3)",
    );

    return processed;
  }

  /**
   * Validates expression string & AST nodes for security and correctness.
   */
  _validateString(expr) {
    if (!expr || expr.trim().length === 0) {
      return "Vui lòng nhập một biểu thức toán học.";
    }

    if (expr.length > MAX_EXPRESSION_LENGTH) {
      return `Biểu thức quá dài (tối đa ${MAX_EXPRESSION_LENGTH} ký tự).`;
    }

    // Block assignment operators (= but not ==, !=, <=, >=)
    if (/[^=!<>]=[^=]/.test(expr)) {
      return "Invalid mathematical expression.";
    }

    // Block string literals
    if (/["'`]/.test(expr)) {
      return "Invalid mathematical expression.";
    }

    // Block semicolons (multi-statement)
    if (/;/.test(expr)) {
      return "Invalid mathematical expression.";
    }

    return null;
  }

  /**
   * Inspects parsed AST node to ensure no dangerous operations (property access, assignments, etc.)
   */
  _validateAST(node) {
    let invalid = false;

    node.traverse((n) => {
      // Disallow assignments, property accessors, object literals
      if (
        n.isAssignmentNode ||
        n.isFunctionAssignmentNode ||
        n.isAccessorNode ||
        n.isObjectNode
      ) {
        invalid = true;
      }
      // Disallow forbidden symbol names
      if (n.isSymbolNode && FORBIDDEN_SYMBOLS.has(n.name)) {
        invalid = true;
      }
    });

    return !invalid;
  }

  /**
   * Evaluates a mathematical expression and returns the result as a string.
   * Returns { result: string } on success, { error: string } on failure.
   */
  evaluate(expression) {
    const stringErr = this._validateString(expression);
    if (stringErr) {
      return { error: stringErr };
    }

    try {
      const processed = this._preprocess(expression);

      // Parse AST
      const astNode = this.math.parse(processed);

      // Validate AST
      if (!this._validateAST(astNode)) {
        return { error: "Invalid mathematical expression." };
      }

      // Compile and evaluate AST node
      const compiled = astNode.compile();
      const result = compiled.evaluate();

      if (result === undefined || result === null) {
        return { error: "Invalid mathematical expression." };
      }

      // String results (from bin, oct, hex)
      if (typeof result === "string") {
        return { result };
      }

      // Check for Infinity / NaN
      if (typeof result === "number") {
        if (isNaN(result)) return { error: "Invalid mathematical expression." };
        if (!isFinite(result)) return { error: "Division by zero." };
      }

      // Format result
      const formatted = this.math.format(result, {
        notation: "auto",
        precision: 14,
        lowerExp: -14,
        upperExp: 14,
      });

      return { result: formatted };
    } catch (err) {
      const msg = err.message || "";

      if (
        msg.includes("Division by zero") ||
        msg.includes("divide by zero") ||
        msg.includes("Infinity")
      ) {
        return { error: "Division by zero." };
      }

      if (
        msg.includes("Undefined symbol") ||
        msg.includes("Undefined function")
      ) {
        return { error: "Unknown function." };
      }

      return { error: "Invalid mathematical expression." };
    }
  }
}

module.exports = MathService;
