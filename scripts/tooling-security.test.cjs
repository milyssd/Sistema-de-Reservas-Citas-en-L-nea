const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');

const mobileRequire = createRequire(path.resolve(__dirname, '../apps/mobile/package.json'));
const expoRequire = createRequire(mobileRequire.resolve('expo/package.json'));
const cliRoot = path.dirname(expoRequire.resolve('@expo/cli/package.json'));
const cliRequire = createRequire(path.join(cliRoot, 'package.json'));
const forge = process.env.FORGE_TEST_PACKAGE
  ? require(path.resolve(process.env.FORGE_TEST_PACKAGE))
  : cliRequire('node-forge');
const pair = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const forgePublic = forge.pki.publicKeyFromPem(pair.publicKey);
const forgePrivate = forge.pki.privateKeyFromPem(pair.privateKey);
const message = Buffer.from('Agenda abierta: firma de interoperabilidad');
const digest = crypto.createHash('sha256').update(message).digest();
const asn1 = forge.asn1;
const node = (type, constructed, value) =>
  asn1.create(asn1.Class.UNIVERSAL, type, constructed, value);
const oid = () => node(asn1.Type.OID, false, asn1.oidToDer(forge.oids.sha256).getBytes());
const nil = () => node(asn1.Type.NULL, false, '');
const signatureForAlgorithm = (children) => {
  const info = node(asn1.Type.SEQUENCE, true, [
    node(asn1.Type.SEQUENCE, true, children),
    node(asn1.Type.OCTETSTRING, false, digest.toString('binary')),
  ]);
  const encoded = Buffer.from(asn1.toDer(info).getBytes(), 'binary');
  // Generate a valid RSA signature over deliberately malformed DigestInfo.
  // The disposable test key never leaves this process.
  const block = Buffer.concat([
    Buffer.from([0, 1]),
    Buffer.alloc(256 - encoded.length - 3, 0xff),
    Buffer.from([0]),
    encoded,
  ]);
  return crypto.privateEncrypt(
    { key: pair.privateKey, padding: crypto.constants.RSA_NO_PADDING },
    block,
  );
};
function forgeAccepts(signature) {
  try {
    return forgePublic.verify(digest.toString('binary'), signature.toString('binary'));
  } catch {
    return false;
  }
}

test('node-forge patch rejects extra nested DigestAlgorithm elements (GHSA-86w9-cpqp-85rv)', () => {
  const malformed = [
    ['extra NULL', [oid(), nil(), nil()]],
    ['extra nested SEQUENCE', [oid(), nil(), node(asn1.Type.SEQUENCE, true, [nil()])]],
    ['unmatched optional element', [oid(), node(asn1.Type.INTEGER, false, '\x01')]],
    ['OID after optional NULL', [oid(), nil(), oid()]],
    ['nested element replacing NULL', [oid(), node(asn1.Type.SEQUENCE, true, [nil()])]],
    ['nonempty NULL parameter', [oid(), node(asn1.Type.NULL, false, '\x00')]],
  ];
  for (const [label, children] of malformed) {
    const signature = signatureForAlgorithm(children);
    assert.equal(
      crypto.verify('sha256', message, pair.publicKey, signature),
      false,
      `Node: ${label}`,
    );
    assert.equal(forgeAccepts(signature), false, `Forge must reject ${label}`);
  }
});

test('node-forge still verifies interoperable PKCS#1 v1.5 SHA signatures', () => {
  for (const algorithm of ['sha256', 'sha384', 'sha512']) {
    const signature = crypto.sign(algorithm, message, pair.privateKey);
    const bytes = crypto.createHash(algorithm).update(message).digest('binary');
    assert.equal(forgePublic.verify(bytes, signature.toString('binary')), true);
    const md = forge.md[algorithm].create();
    md.update(message.toString('binary'));
    assert.equal(
      crypto.verify(
        algorithm,
        message,
        pair.publicKey,
        Buffer.from(forgePrivate.sign(md), 'binary'),
      ),
      true,
    );
  }
  assert.equal(
    forgeAccepts(signatureForAlgorithm([oid()])),
    true,
    'SHA parameters may remain absent',
  );
  assert.equal(
    forgeAccepts(crypto.sign('sha256', Buffer.from('different message'), pair.privateKey)),
    false,
  );
});

test('node-forge certificate signatures remain compatible with Node X509', () => {
  const certificate = forge.pki.createCertificate();
  certificate.publicKey = forgePublic;
  certificate.serialNumber = '01';
  certificate.validity.notBefore = new Date('2020-01-01T00:00:00.000Z');
  certificate.validity.notAfter = new Date('2035-01-01T00:00:00.000Z');
  certificate.setSubject([{ name: 'commonName', value: 'tooling.example.test' }]);
  certificate.setIssuer(certificate.subject.attributes);
  certificate.sign(forgePrivate, forge.md.sha256.create());
  assert.equal(certificate.verify(certificate), true);
  const native = new crypto.X509Certificate(forge.pki.certificateToPem(certificate));
  assert.equal(native.verify(crypto.createPublicKey(pair.publicKey)), true);
});

test('Expo CLI uses compatible public Zod APIs in every schema module', () => {
  const schemaRoot = process.env.EXPO_SCHEMA_TEST_ROOT
    ? path.resolve(process.env.EXPO_SCHEMA_TEST_ROOT)
    : cliRoot;
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const p = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
    });
  const modules = walk(path.join(schemaRoot, 'build')).filter((p) =>
    /require\(["']zod["']\)/.test(fs.readFileSync(p, 'utf8')),
  );
  assert.deepEqual(modules.map((p) => path.basename(p)).sort(), [
    'DevToolsPlugin.schema.js',
    'createMCPDevToolsExtensionSchema.js',
  ]);
  const { PluginSchema, DevToolsPluginOutputSchema } = require(
    path.join(schemaRoot, 'build/src/start/server/DevToolsPlugin.schema.js'),
  );
  const { createMCPDevToolsExtensionSchema } = require(
    path.join(schemaRoot, 'build/src/start/server/createMCPDevToolsExtensionSchema.js'),
  );
  const plugin = {
    packageName: 'agenda-tools',
    packageRoot: '/tmp/agenda-tools',
    cliExtensions: {
      description: 'Test extension',
      entryPoint: 'index.js',
      commands: [
        {
          name: 'inspect',
          title: 'Inspect',
          environments: ['cli', 'mcp'],
          parameters: [
            { name: 'limit', type: 'number' },
            { name: 'enabled', type: 'confirm' },
            { name: 'query', type: 'text' },
          ],
        },
      ],
    },
  };
  assert.deepEqual(PluginSchema.parse(plugin), plugin);
  assert.equal(PluginSchema.safeParse({ ...plugin, packageName: '' }).success, false);
  assert.equal(
    PluginSchema.safeParse({ ...plugin, cliExtensions: { ...plugin.cliExtensions, commands: [] } })
      .success,
    false,
  );
  const schema = createMCPDevToolsExtensionSchema(plugin);
  assert.deepEqual(schema.parse({ command: 'inspect', limit: 5, enabled: true, query: 'demo' }), {
    command: 'inspect',
    limit: 5,
    enabled: true,
    query: 'demo',
  });
  for (const value of [
    { command: 'other' },
    { command: 'inspect', limit: '5' },
    { command: 'inspect', unknown: true },
  ]) {
    const result = schema.safeParse(value);
    assert.equal(result.success, false);
    assert.ok(result.error.issues.length);
  }
  const output = [
    { type: 'text', text: 'Ready', level: 'info' },
    { type: 'image', url: 'https://example.test/a.png' },
    { type: 'audio', url: 'https://example.test/a.mp3' },
  ];
  assert.deepEqual(DevToolsPluginOutputSchema.parse(output), output);
  const malformed = DevToolsPluginOutputSchema.safeParse([{ type: 'image', url: 'not-a-url' }]);
  assert.equal(malformed.success, false);
  assert.ok(malformed.error.issues.length);
});
