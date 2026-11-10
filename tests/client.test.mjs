import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('client declares the package factory and both panel slots', async () => {
  const source = await fs.readFile(new URL('../client.js', import.meta.url), 'utf8');
  assert.match(source, /id:\s*'dsh-dshtipsandemail'/);
  assert.match(source, /name:\s*'sidebar\.panellist'/);
  assert.match(source, /id:\s*'dshtipsandemail'/);
  assert.match(source, /name:\s*'main'/);
  assert.match(source, /key:\s*'dshtipsandemail'/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML|new Function|eval\(/);
});

test('manifest declares a web bundle and compatibility', async () => {
  const manifest = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(manifest.name, 'dsh-dshtipsandemail');
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml');
  assert.equal(manifest.dsh.client.platform, 'web');
  assert.equal(manifest.dsh.compatibility.dshReleases['0.2.1-rc.3'], 'compatible');
  assert.ok(manifest.files.includes('client.js'));
  assert.ok(manifest.files.includes('README.md'));
});
