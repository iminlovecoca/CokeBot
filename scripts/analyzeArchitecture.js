const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = "c:/Users/khang/Documents/Build/CokeBot";

function getAllJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllJsFiles(full));
    } else if (full.endsWith('.js')) {
      results.push(full);
    }
  });
  return results;
}

function countLines(content) {
  return content.split(/\r?\n/).length;
}

function extractRequires(content) {
  const regex = /require\(['\"]([^'\"]+)['\"]\)/g;
  const requires = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    requires.push(match[1]);
  }
  return requires;
}

function resolveRequire(baseFile, reqPath) {
  // Resolve only relative paths
  if (reqPath.startsWith('.')) {
    const resolved = path.resolve(path.dirname(baseFile), reqPath);
    // Add .js if missing and file exists
    if (fs.existsSync(resolved + '.js')) return resolved + '.js';
    if (fs.existsSync(resolved)) return resolved;
  }
  // For non-relative (node_modules) just return the module name
  return reqPath;
}

function buildDependencyGraph(files) {
  const graph = {};
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const reqs = extractRequires(content).map(r => resolveRequire(file, r));
    graph[file] = reqs.filter(r => typeof r === 'string');
  });
  return graph;
}

function detectCycles(graph) {
  const visited = new Set();
  const stack = new Set();
  const cycles = [];
  function dfs(node, path) {
    if (stack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push(path.slice(cycleStart).concat(node));
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.add(node);
    const neighbors = graph[node] || [];
    neighbors.forEach(nb => {
      if (graph[nb]) dfs(nb, path.concat(nb));
    });
    stack.delete(node);
  }
  Object.keys(graph).forEach(node => dfs(node, [node]));
  return cycles;
}

function extractExports(content) {
  const exports = [];
  const regex = /module\.exports\s*=\s*(\{[^}]*\}|\w+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const expr = match[1];
    if (expr.startsWith('{')) {
      // extract named exports
      const names = expr.replace(/[{}]/g, '').split(',').map(s => s.split(':')[0].trim());
      exports.push(...names);
    } else {
      exports.push(expr.trim());
    }
  }
  return exports;
}

function findExportUsages(files, exportMap) {
  const usage = {};
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    Object.entries(exportMap).forEach(([mod, names]) => {
      names.forEach(name => {
        const re = new RegExp('\\b' + name + '\\b', 'g');
        if (re.test(content)) {
          usage[name] = usage[name] || [];
          usage[name].push(file);
        }
      });
    });
  });
  return usage;
}

function main() {
  const files = getAllJsFiles(PROJECT_ROOT);
  const fileStats = {};
  const exportMap = {};
  const largeFiles = [];
  files.forEach(f => {
    const content = fs.readFileSync(f, 'utf-8');
    const lines = countLines(content);
    fileStats[f] = { lines };
    if (lines > 500) largeFiles.push({ file: f, lines });
    const exports = extractExports(content);
    if (exports.length) exportMap[f] = exports;
  });

  const graph = buildDependencyGraph(files);
  const cycles = detectCycles(graph);

  const exportUsages = findExportUsages(files, exportMap);
  const deadExports = [];
  Object.entries(exportMap).forEach(([mod, names]) => {
    names.forEach(n => {
      if (!exportUsages[n] || exportUsages[n].length === 0) {
        deadExports.push({ module: mod, export: n });
      }
    });
  });

  const report = {
    totalFiles: files.length,
    largeFiles,
    dependencyCycles: cycles,
    deadExports,
  };
  const outPath = path.join(PROJECT_ROOT, 'architecture_report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log('Architecture analysis complete. Report written to', outPath);
}

main();
