const MathService = require("../services/MathService");

const service = new MathService({ get: () => null });

const tests = [
  // Issue report case
  ["410*408", "167280"],

  // Basic operations
  ["2+2", "4"],
  ["5+8*9", "77"],
  ["(25+8)^3", "35937"],
  ["10/3", "3.3333333333333"],
  ["-5+3", "-2"],
  ["10%3", "1"],

  // Square root & cube root
  ["sqrt(225)", "15"],
  ["sqrt(144)", "12"],
  ["sqrt(400)+8", "28"],
  ["cbrt(27)", "3"],

  // Absolute value
  ["abs(-25)", "25"],

  // Factorial
  ["factorial(8)", "40320"],
  ["8!", "40320"],
  ["5!", "120"],
  ["(5+3)!", "40320"],

  // Logarithms
  ["log(100)", "2"],
  ["ln(e)", "1"],

  // Trigonometry (degree)
  ["sin(30 deg)", "0.5"],
  ["cos(60 deg)", "0.5"],

  // Trigonometry (radian)
  ["sin(pi/2)", "1"],
  ["sin(pi/6)", "0.5"],

  // Constants
  ["pi", null],
  ["e", null],

  // Floor, ceil, round
  ["floor(3.7)", "3"],
  ["ceil(3.2)", "4"],
  ["round(3.5)", "4"],

  // Min, max
  ["min(3,7,1)", "1"],
  ["max(3,7,1)", "7"],

  // GCD, LCM
  ["gcd(120,96)", "24"],
  ["lcm(18,24)", "72"],

  // Base conversion
  ["bin(255)", "0b11111111"],
  ["oct(255)", "0o377"],
  ["hex(255)", "0xFF"],

  // Combinatorics
  ["10C3", "120"],
  ["10P4", "5040"],

  // Error cases
  ["5+*", null, true],
  ["1/0", null, true],
  ["import('fs')", null, true],
];

let passed = 0;
let failed = 0;

for (const [expr, expected, isError] of tests) {
  const { result, error } = service.evaluate(expr);

  if (isError) {
    if (error) {
      console.log(`✅ PASS: "${expr}" → error: "${error}"`);
      passed++;
    } else {
      console.log(`❌ FAIL: "${expr}" → expected error, got result: "${result}"`);
      failed++;
    }
    continue;
  }

  if (error) {
    console.log(`❌ FAIL: "${expr}" → unexpected error: "${error}"`);
    failed++;
    continue;
  }

  if (expected === null) {
    console.log(`✅ PASS: "${expr}" → ${result}`);
    passed++;
    continue;
  }

  if (result === expected) {
    console.log(`✅ PASS: "${expr}" → ${result}`);
    passed++;
  } else {
    const numResult = parseFloat(result);
    const numExpected = parseFloat(expected);
    if (!isNaN(numResult) && !isNaN(numExpected) && Math.abs(numResult - numExpected) < 1e-10) {
      console.log(`✅ PASS: "${expr}" → ${result} (≈ ${expected})`);
      passed++;
    } else {
      console.log(`❌ FAIL: "${expr}" → got "${result}", expected "${expected}"`);
      failed++;
    }
  }
}

console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
if (failed > 0) process.exit(1);
