// The lint rule that keeps raw-HTML sinks out of app/ and lib/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const eslint = new ESLint({ cwd: ROOT });

async function ruleIds(code, filePath) {
  const [res] = await eslint.lintText(code, { filePath });
  return res.messages.map((m) => m.ruleId);
}

const BANNED = {
  'el.innerHTML = s;': 'no-restricted-properties',
  'const h = el.outerHTML;': 'no-restricted-properties',
  "el.insertAdjacentHTML('beforeend', s);": 'no-restricted-properties',
  'popup.setHTML(s);': 'no-restricted-properties',
  'document.write(s);': 'no-restricted-properties',
  'export const A = () => <div dangerouslySetInnerHTML={{ __html: s }} />;': 'no-restricted-syntax',
};

test('raw-HTML sinks are lint errors in app/ and lib/', async () => {
  for (const [code, rule] of Object.entries(BANNED)) {
    for (const file of ['app/components/__lint_probe__.js', 'lib/__lint_probe__.js']) {
      const ids = await ruleIds(`const s = String(globalThis.x); const el = {}; const popup = {};\n${code}\n`, file);
      assert.ok(ids.includes(rule), `${file}: "${code}" should trip ${rule}, got ${JSON.stringify(ids)}`);
    }
  }
});

test('textContent / setDOMContent stay allowed', async () => {
  const ids = await ruleIds("const el = {}; el.textContent = 'x'; el.setDOMContent?.(el);\n", 'app/components/__lint_probe__.js');
  assert.ok(!ids.includes('no-restricted-properties') && !ids.includes('no-restricted-syntax'), JSON.stringify(ids));
});
