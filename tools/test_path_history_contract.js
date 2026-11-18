'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the real Node-side contract without importing the browser suite's runner.
const source = fs.readFileSync(path.join(__dirname, 'smoke_path.js'), 'utf8');
const start = source.indexOf('async function historyContract(lib) {');
const end = source.indexOf('\n/* ---------- one solver', start);
assert.ok(start >= 0 && end > start, 'historyContract source boundaries exist');
const ids = ['hist_castle', 'hist_tiles', 'hist_tram', 'hist_ship', 'hist_doll', 'hist_print'];

function fixture() {
  return {
    found: ids.slice(), legacy: ['float'], old: ids[0],
    progression: ids.flatMap(id => [id, 'float']),
    domains: ids.map(() => 'history'), oneLesson: true
  };
}

async function runContract(result) {
  let checks = 0, evaluations = 0;
  const lib = { expect(value, message) { checks++; assert.ok(value, message); } };
  const context = vm.createContext({
    ev: async (actualLib, callback) => {
      assert.equal(actualLib, lib);
      assert.equal(typeof callback, 'function');
      evaluations++;
      return result;
    }
  });
  vm.runInContext(source.slice(start, end), context, { filename: 'smoke_path.js' });
  await context.historyContract(lib);
  assert.equal(evaluations, 1, 'browser contract data is fetched once');
  assert.equal(checks, 5, 'every existing Node assertion is exercised');
}

test('historyContract validates browser results without relying on browser globals in Node', async () => {
  await runContract(fixture());
});

test('historyContract still rejects out-of-order history progression', async () => {
  const result = fixture();
  [result.progression[0], result.progression[2]] = [result.progression[2], result.progression[0]];
  await assert.rejects(runContract(result), /reaches all six history lessons in order/);
});

test('historyContract still requires non-history interleaving', async () => {
  const result = fixture();
  result.progression = ids.slice();
  await assert.rejects(runContract(result), /interleaves completed non-history lessons/);
});
