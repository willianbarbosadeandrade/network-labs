// Rodar com: node --test base-clara/testes/conversao.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../js/conversao.js");

test("decimal, binário e hexadecimal chegam ao mesmo valor", () => {
  assert.equal(C.parseNumber("173", 10).value, 173n);
  assert.equal(C.parseNumber("1010 1101", 2).value, 173n);
  assert.equal(C.parseNumber("0b1010_1101", 2).value, 173n);
  assert.equal(C.parseNumber("ad", 16).value, 173n);
  assert.equal(C.parseNumber("0xAD", 16).value, 173n);
  assert.equal(C.parseNumber("0", 10).value, 0n);
});

test("zeros à esquerda contam na largura em binário e hex", () => {
  assert.equal(C.parseNumber("0F", 16).sourceBits, 8);
  assert.equal(C.parseNumber("0001", 2).sourceBits, 4);
});

test("formatação em grupos", () => {
  assert.equal(C.groupFromRight("10101101", 4), "1010 1101");
  assert.equal(C.groupFromRight("101", 4), "101");
  assert.equal(C.toBinary(5n, 8), "00000101");
  assert.equal(C.toHex(255n, 16), "00FF");
});

test("128 bits (IPv6 máximo) sem perder precisão", () => {
  const max = (1n << 128n) - 1n;
  assert.equal(C.parseNumber(max.toString(), 10).value, max);
  assert.equal(C.toHex(max, 128), "F".repeat(32));
});

test("IPv4 com pontos", () => {
  const r = C.parseNumber("192.168.1.10", 10);
  assert.equal(r.address.kind, "ipv4");
  assert.equal(r.value, 0xC0A8010An);
  assert.equal(r.sourceBits, 32);
  assert.deepEqual(r.address.blocks.map((b) => b.sub), ["11000000", "10101000", "00000001", "00001010"]);
  assert.throws(() => C.parseNumber("192.168.1.300", 10), /passa de 255/);
  assert.throws(() => C.parseNumber("192.168.1", 10), /4 números/);
});

test("MAC com dois-pontos, hífen e formato Cisco", () => {
  for (const mac of ["00:1A:2B:3C:4D:5E", "00-1a-2b-3c-4d-5e", "001a.2b3c.4d5e"]) {
    const r = C.parseNumber(mac, 16);
    assert.equal(r.address.kind, "mac", mac);
    assert.equal(r.value, 0x001A2B3C4D5En, mac);
  }
  assert.throws(() => C.parseNumber("00:1A-2B:3C:4D:5E", 16)); // separadores misturados
});

test("IPv6 completo e comprimido", () => {
  const full = C.parseNumber("2001:0db8:0000:0000:0000:ff00:0042:8329", 16);
  const short = C.parseNumber("2001:db8::ff00:42:8329", 16);
  assert.equal(full.address.kind, "ipv6");
  assert.equal(full.value, short.value);
  assert.equal(full.value, 0x20010DB8000000000000FF0000428329n);
  assert.equal(C.parseNumber("::1", 16).value, 1n);
  assert.equal(C.parseNumber("::", 16).value, 0n);
  assert.throws(() => C.parseNumber("2001::db8::1", 16), /IPv6/);
  assert.throws(() => C.parseNumber("1:2:3:4:5:6:7:8:9", 16), /IPv6/);
  assert.throws(() => C.parseNumber("12345::1", 16), /IPv6/);
});

test("entradas inválidas dão mensagem clara", () => {
  assert.throws(() => C.parseNumber("", 10), /Digite/);
  assert.throws(() => C.parseNumber("-5", 10), /zero/);
  assert.throws(() => C.parseNumber("1,5", 10), /decimal/);
  assert.throws(() => C.parseNumber("102", 2), /binário/);
  assert.throws(() => C.parseNumber("zz", 16), /hexadecimal/);
  assert.throws(() => C.parseNumber("0x", 16), /prefixo/);
  assert.throws(() => C.parseNumber("1".repeat(513), 2), /limite/);
});

test("divisões sucessivas e pesos ligados", () => {
  const steps = C.divisionSteps(173n, 2);
  assert.equal(steps.map((s) => s.remainder).reverse().join(""), "10101101");
  assert.equal(C.divisionSteps(173n, 16).map((s) => s.remainder.toString(16)).reverse().join(""), "ad");
  assert.deepEqual(C.activeWeights(173n, 8), [128n, 32n, 8n, 4n, 1n]);
  assert.deepEqual(C.activeWeights(0n, 8), []);
});
