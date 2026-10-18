import { strict as assert } from 'node:assert';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { generateDirectory } from '../scripts/generate-directory.mjs';
import { checkProfileOwnership } from '../scripts/check-profile-ownership.mjs';

const today = '2026-10-18';
const registry = { grab: { name: 'Grab' }, shopee: { name: 'Shopee' } };
const job = (company = 'grab', status = 'current') => ({
  company, role: 'Software Engineer', status, openToReferralRequests: true
});
const member = (github = 'aisha-dev', overrides = {}) => ({
  github, name: 'Aisha Rahman', contact: `https://github.com/${github}`,
  lastVerified: today, employment: [job()], ...overrides
});

async function fixture(t, profiles = [member()], companies = registry) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'coderant-peers-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'members'));
  await writeFile(path.join(root, 'companies.json'), JSON.stringify(companies));
  for (const profile of profiles) await saveMember(root, profile);
  return root;
}

async function saveMember(root, profile) {
  await writeFile(path.join(root, 'members', `${profile.github}.json`), JSON.stringify(profile));
}

const generate = (root, options = {}) => generateDirectory(root, { today, ...options });
const read = (root, filename) => readFile(path.join(root, filename), 'utf8');

test('groups same-name members by unique username and separates employment statuses', async (t) => {
  const root = await fixture(t, [
    member('aisha-dev'),
    member('aisha-backend', { employment: [{ ...job('grab', 'former'), openToReferralRequests: false }] })
  ]);
  await generate(root);
  const grab = await read(root, 'companies/grab.md');
  const [current, former] = grab.split('## Former employees');
  assert.match(current, /\[@aisha-dev\]/);
  assert.doesNotMatch(current, /\[@aisha-backend\]/);
  assert.match(former, /\[@aisha-backend\]/);
  assert.match(former, /\| No \| 2026-10-18 \|/);
  assert.match(grab, /\.\.\/members\/aisha-dev\.json/);
  assert.match(await read(root, 'companies/README.md'), /\[Grab\]\(\.\/grab\.md\) \| 1 \| 1/);
  assert.match(await read(root, 'directory/people.md'), /aisha-backend/);
  assert.doesNotMatch(grab, /shopee/);
});

test('generation is deterministic and check mode detects stale content without writing', async (t) => {
  const root = await fixture(t);
  await generate(root);
  assert.deepEqual(await generate(root), []);
  assert.deepEqual(await generate(root, { check: true }), []);
  const original = await read(root, 'companies/grab.md');
  await saveMember(root, member('aisha-dev', { name: 'New Name' }));
  await assert.rejects(generate(root, { check: true }), /out of date/);
  assert.equal(await read(root, 'companies/grab.md'), original);
  await generate(root);
  assert.match(await read(root, 'companies/grab.md'), /New Name/);
});

test('removes obsolete pages when employment changes or a member leaves', async (t) => {
  const root = await fixture(t);
  await generate(root);
  await saveMember(root, member('aisha-dev', { employment: [job('shopee')] }));
  await generate(root);
  assert.deepEqual((await readdir(path.join(root, 'companies'))).sort(), ['README.md', 'shopee.md']);
  await rm(path.join(root, 'members/aisha-dev.json'));
  await generate(root);
  assert.deepEqual(await readdir(path.join(root, 'companies')), ['README.md']);
  assert.match(await read(root, 'directory/people.md'), /No member profiles/);
});

test('supports no employment, multiple current companies and returning to a former company', async (t) => {
  const root = await fixture(t, [
    member('aisha-dev', { employment: [] }),
    member('another-dev', { employment: [job(), job('grab', 'former'), job('shopee')] })
  ]);
  await generate(root);
  const people = await read(root, 'directory/people.md');
  assert.match(people, /\[Grab\].*\[Shopee\]/);
  assert.match(await read(root, 'companies/README.md'), /\[Grab\].*\| 1 \| 1/);
});

test('escapes Markdown and HTML in generated fields', async (t) => {
  const root = await fixture(t, [member('aisha-dev', {
    name: '<img src=x> [A]|B',
    location: 'KL | Malaysia',
    employment: [{ ...job(), role: '[Engineer](https://example.com) | <script>' }]
  })], { grab: { name: 'Grab | <Company>' } });
  await generate(root);
  const grab = await read(root, 'companies/grab.md');
  assert.doesNotMatch(grab, /<img|<script>|<Company>/);
  assert.match(grab, /&lt;img src=x&gt;/);
  assert.ok(grab.includes('\\|'));
  assert.ok(grab.includes('\\[Engineer\\]\\(https://example.com\\)'));
});

test('phoneNumber is optional and accepts formatted strings without appearing in indexes', async (t) => {
  const root = await fixture(t);
  await generate(root);
  const pages = ['companies/grab.md', 'companies/README.md', 'directory/people.md'];
  const original = await Promise.all(pages.map((page) => read(root, page)));
  for (const phoneNumber of ['+60 12-345 6789', '0123456789']) {
    await saveMember(root, member('aisha-dev', { phoneNumber }));
    assert.deepEqual(await generate(root), []);
    assert.deepEqual(await Promise.all(pages.map((page) => read(root, page))), original);
    assert.equal(JSON.parse(await read(root, 'members/aisha-dev.json')).phoneNumber, phoneNumber);
  }
});

const invalidProfiles = [
  ['numeric phone number', { phoneNumber: 123456789 }, /phoneNumber.*non-empty/],
  ['null phone number', { phoneNumber: null }, /phoneNumber.*non-empty/],
  ['empty phone number', { phoneNumber: '' }, /phoneNumber.*non-empty/],
  ['whitespace phone number', { phoneNumber: '   ' }, /phoneNumber.*non-empty/],
  ['multiline phone number', { phoneNumber: '+60\n123456789' }, /phoneNumber.*single-line/],
  ['untrimmed phone number', { phoneNumber: ' +60123456789 ' }, /phoneNumber.*whitespace/],
  ['unknown company', { employment: [job('Grab')] }, /unknown company/],
  ['invalid status', { employment: [job('grab', 'previous')] }, /status must/],
  ['nonboolean referral preference', { employment: [{ ...job(), openToReferralRequests: 'yes' }] }, /boolean/],
  ['duplicate employment', { employment: [job(), job()] }, /duplicate company/],
  ['invalid date', { lastVerified: '2026-02-30' }, /real date/],
  ['future date', { lastVerified: '2026-10-19' }, /future/],
  ['invalid contact', { contact: 'javascript:alert(1)' }, /HTTPS/],
  ['unparseable contact', { contact: 'not a URL' }, /HTTPS/],
  ['contact credentials', { contact: 'https://user:secret@example.com' }, /credentials/],
  ['empty name', { name: '' }, /non-empty/],
  ['multiline field', { name: 'A\nB' }, /single-line/],
  ['unknown field', { typo: true }, /unknown field/],
  ['invalid username', { github: 'Bad--Username' }, /lowercase GitHub username/]
];

for (const [label, overrides, expected] of invalidProfiles) {
  test(`rejects ${label} before modifying output`, async (t) => {
    const root = await fixture(t);
    await generate(root);
    const original = await read(root, 'companies/grab.md');
    await saveMember(root, member('aisha-dev', overrides));
    await assert.rejects(generate(root), expected);
    assert.equal(await read(root, 'companies/grab.md'), original);
  });
}

test('requires filenames to match usernames', async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'members/wrong.json'), JSON.stringify(member()));
  await assert.rejects(generate(root), /filename must match/);
});

test('rejects invalid company IDs and duplicate display names', async (t) => {
  const root = await fixture(t, [], { '../grab': { name: 'Grab' } });
  await assert.rejects(generate(root), /invalid company ID/);
  await writeFile(path.join(root, 'companies.json'), JSON.stringify({
    grab: { name: 'Grab' }, 'grab-malaysia': { name: 'grab' }
  }));
  await assert.rejects(generate(root), /duplicate company name/);
});

test('reports malformed JSON and does not silently ignore unexpected member files', async (t) => {
  const root = await fixture(t, []);
  await writeFile(path.join(root, 'members/aisha.json'), '{');
  await assert.rejects(generate(root), /Cannot read JSON/);
  await rm(path.join(root, 'members/aisha.json'));
  await writeFile(path.join(root, 'members/aisha.md'), '# Aisha');
  await assert.rejects(generate(root), /only JSON/);
});

test('refuses to overwrite or delete manually authored pages', async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, 'companies'));
  await writeFile(path.join(root, 'companies/notes.md'), 'Keep this');
  await assert.rejects(generate(root), /without the generated marker/);
  assert.equal(await read(root, 'companies/notes.md'), 'Keep this');
  assert.deepEqual(await readdir(path.join(root, 'companies')), ['notes.md']);
});

test('validate mode checks profiles without requiring or writing generated files', async (t) => {
  const root = await fixture(t);
  assert.deepEqual(await generate(root, { validate: true }), []);
  assert.deepEqual((await readdir(root)).sort(), ['companies.json', 'members']);
});

test('ownership permits self-service additions, edits, deletions and registry updates', () => {
  for (const status of ['added', 'modified', 'removed']) {
    assert.doesNotThrow(() => checkProfileOwnership({
      author: 'Aisha-Dev',
      files: [{ filename: 'members/aisha-dev.json', status }, { filename: 'companies.json' }]
    }));
  }
});

test('ownership rejects editing others and renaming from or to another identity', () => {
  for (const file of [
    { filename: 'members/other-dev.json' },
    { filename: 'members/aisha-dev.json', previous_filename: 'members/other-dev.json' },
    { filename: 'members/other-dev.json', previous_filename: 'members/aisha-dev.json' },
    { filename: 'companies/grab.md' },
    { filename: 'directory/people.md' }
  ]) {
    assert.throws(() => checkProfileOwnership({ author: 'aisha-dev', files: [file] }));
  }
});

test('maintainers may handle authorized corrections and username changes', () => {
  assert.doesNotThrow(() => checkProfileOwnership({
    author: 'maintainer', maintainer: true,
    files: [{ filename: 'members/new-name.json', previous_filename: 'members/old-name.json' }]
  }));
});
