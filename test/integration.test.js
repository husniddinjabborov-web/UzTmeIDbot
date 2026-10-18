'use strict';

/**
 * HAQIQIY API bilan tekshiruv. Faqat INTEGRATION=1 bo'lganda ishlaydi:
 *   INTEGRATION=1 npm run test:integration
 * Mock ishlatilmaydi. Natijalar tashqi xizmatlarning joriy holatiga bog'liq.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const ON = process.env.INTEGRATION === '1';
const { resolveInput } = require('../src/resolver');
const idsOf = r => Object.fromEntries(r.ids.map(i => [i.type, i.value]));

describe('jonli API (INTEGRATION=1)', { skip: !ON && 'INTEGRATION=1 qo\'yilmagan' }, () => {
  const live = [
    ['GitHub repozitoriy', 'https://github.com/torvalds/linux', r => /^\d+$/.test(idsOf(r).repository_id)],
    ['GitHub foydalanuvchi', 'github torvalds', r => /^\d+$/.test(idsOf(r).user_id)],
    ['npm', 'https://www.npmjs.com/package/express', r => idsOf(r).package_name === 'express'],
    ['PyPI', 'https://pypi.org/project/requests/', r => idsOf(r).package_name === 'requests']
  ];
  for (const [name, input, check] of live) {
    test(name, async () => {
      const { results } = await resolveInput(input);
      console.log(`  [JONLI] ${name}:`, JSON.stringify(results[0].ids));
      assert.ok(check(results[0]));
    });
  }
  test('mavjud bo\'lmagan GitHub foydalanuvchisi → NOT_FOUND', async () => {
    await assert.rejects(() => resolveInput('github this-user-does-not-exist-zz9-qq8-xx7'), e => e.code === 'NOT_FOUND');
  });
});
