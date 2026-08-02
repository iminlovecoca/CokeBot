const BaseService = require("./BaseService");
const { create, all } = require("mathjs");

// Maximum allowed expression length to prevent abuse
const MAX_EXPRESSION_LENGTH = 500;

class MathService extends BaseService {
  constructor(locator) {
    super(locator);
    this.math = this._createMathInstance();
  }

  /**
   * Creates a restricted mathjs instance with custom functions.
   * No access to eval, import, createUnit, or other dangerous operations.
   */
  _createMathInstance() {
    const math = create(all);

    // Disable dangerous functions
    math.import(
      {
        import: function () {
          throw new Error("Function import is disabled.");
        },
        createUnit: function () {
          throw new Error("Function createUnit is disabled.");
        },
        evaluate: function () {
          throw new Error("Function evaluate is disabled.");
        },
        parse: function () {
          throw new Error("Function parse is disabled.");
        },
        simplify: function () {
          throw new Error("Function simplify is disabled.");
        },
        derivative: function () {
          throw new Error("Function derivative is disabled.");
        },
      },
      { override: true },
    );

    // Register custom functions for Casio-style operations
    math.import({
      // Factorial — also handled via preprocess for `n!` syntax
      factorial: function (n) {
        return math.gamma(n + 1);
      },

      // Base conversion
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

      // Combinatorics — nCr
      C: function (n, r) {
        return math.combinations(n, r);
      },

      // Combinatorics — nPr
      P: function (n, r) {
        return math.permutations(n, r);
      },
    }, { override: true });

    return math;
  }

  /**
   * Preprocesses raw expression string into mathjs-compatible syntax.
   * Handles: n! syntax, nCr/nPr notation, degree keyword in trig functions.
   */
  _preprocess(expr) {
    let processed = expr.trim();

    // Replace `(expr)!` with factorial(expr) — must run before digit version
    processed = processed.replace(/\(([^)]+)\)!/g, "factorial($1)");

    // Replace `n!` (number followed by !) with factorial(n)
    processed = processed.replace(/(\d+)!/g, "factorial($1)");

    // Replace `nCr` notation: 10C3 → C(10,3)
    processed = processed.replace(/(\d+)\s*C\s*(\d+)/g, "C($1,$2)");

    // Replace `nPr` notation: 10P4 → P(10,4)
    processed = processed.replace(/(\d+)\s*P\s*(\d+)/g, "P($1,$2)");

    // Replace `deg` keyword inside trig: sin(30 deg) → sind(30)
    processed = processed.replace(
      /\b(sin|cos|tan)\s*\(\s*([^)]+?)\s+deg\s*\)/gi,
      (_, fn, arg) => `${fn}d(${arg})`,
    );

    // Replace `asin/acos/atan` with deg output: asin(0.5 deg) → asind(0.5)
    processed = processed.replace(
      /\b(asin|acos|atan)\s*\(\s*([^)]+?)\s+deg\s*\)/gi,
      (_, fn, arg) => `${fn}d(${arg})`,
    );

    // Replace `log(x)` (Casio convention: base-10) → `log10(x)`
    // Must run BEFORE ln replacement. Use negative lookbehind to skip "ln" alias.
    processed = processed.replace(/\blog\s*\(/g, "log10(");

    // Replace `ln(x)` → `log(x)` (mathjs log = natural log)
    processed = processed.replace(/\bln\s*\(/g, "log(");

    // Replace `cbrt(x)` → `nthRoot(x, 3)` if not natively available
    processed = processed.replace(
      /\bcbrt\s*\(\s*([^)]+)\s*\)/g,
      "nthRoot($1, 3)",
    );

    return processed;
  }

  /**
   * Validates expression for unsafe patterns before evaluation.
   * Returns an error message string if invalid, null if safe.
   */
  _validate(expr) {
    if (!expr || expr.trim().length === 0) {
      return "Vui lòng nhập một biểu thức toán học.";
    }

    if (expr.length > MAX_EXPRESSION_LENGTH) {
      return `Biểu thức quá dài (tối đa ${MAX_EXPRESSION_LENGTH} ký tự).`;
    }

    // Block assignment operators
    if (/[^=!<>]=[^=]/.test(expr)) {
      return "Invalid mathematical expression.";
    }

    // Block access to object prototypes or property chains
    if (/\.\s*[a-zA-Z]/.test(expr)) {
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
   * Evaluates a mathematical expression and returns the result as a string.
   * Returns { result: string } on success, { error: string } on failure.
   */
  evaluate(expression) {
    // Validate input
    const validationError = this._validate(expression);
    if (validationError) {
      return { error: validationError };
    }

    try {
      // Preprocess Casio-style syntax into mathjs-compatible form
      const processed = this._preprocess(expression);

      // Evaluate using the restricted mathjs instance
      const result = this.math.evaluate(processed);

      // Handle special result types
      if (result === undefined || result === null) {
        return { error: "Invalid mathematical expression." };
      }

      // String results (from bin, oct, hex)
      if (typeof result === "string") {
        return { result };
      }

      // Check for Infinity
      if (result === Infinity || result === -Infinity) {
        return { error: "Result is Infinity." };
      }

      // Check for NaN
      if (typeof result === "number" && isNaN(result)) {
        return { error: "Invalid mathematical expression." };
      }

      // Format result — mathjs may return BigNumber or other types
      const formatted = this.math.format(result, {
        notation: "auto",
        precision: 14,
        lowerExp: -14,
        upperExp: 14,
      });

      return { result: formatted };
    } catch (err) {
      // Map common mathjs errors to user-friendly messages
      const msg = err.message || "";

      if (msg.includes("Division by zero") || msg.includes("divide by zero")) {
        return { error: "Division by zero." };
      }

      if (msg.includes("Unknown function") || msg.includes("Undefined function")) {
        return { error: "Unknown function." };
      }

      if (msg.includes("is disabled")) {
        return { error: "Invalid mathematical expression." };
      }

      return { error: "Invalid mathematical expression." };
    }
  }
}

module.exports = MathService;
