/*
 * Base Clara · regras de conversão
 *
 * Funções puras, sem DOM. Ficam separadas da interface para poderem ser
 * testadas no Node (testes/conversao.test.js) e reaproveitadas no app.
 * Uso BigInt em tudo porque um IPv6 tem 128 bits, bem acima do limite
 * seguro do Number do JavaScript (2^53).
 */
(function (global) {
  "use strict";

  const MAX_BITS = 512;

  const BASE_PATTERN = {
    2: /^[01]+$/,
    10: /^[0-9]+$/,
    16: /^[0-9a-f]+$/i
  };

  function bitLength(value) {
    return value === 0n ? 1 : value.toString(2).length;
  }

  // "10101101" -> "1010 1101" (agrupa a partir da direita)
  function groupFromRight(text, size) {
    const groups = [];
    for (let end = text.length; end > 0; end -= size) {
      groups.unshift(text.slice(Math.max(0, end - size), end));
    }
    return groups.join(" ");
  }

  function toBinary(value, width) {
    return value.toString(2).padStart(width, "0");
  }

  function toHex(value, width) {
    return value.toString(16).toUpperCase().padStart(Math.ceil(width / 4), "0");
  }

  /* ---------- Endereços de rede ---------- */

  function parseIPv4(text) {
    const parts = text.split(".");
    let value = 0n;
    for (const part of parts) {
      const octet = Number(part);
      if (octet > 255) {
        throw new Error(`O octeto ${part} passa de 255. Num IPv4 cada bloco tem 8 bits, então vai de 0 a 255.`);
      }
      value = (value << 8n) | BigInt(octet);
    }
    return {
      kind: "ipv4",
      label: "IPv4",
      bits: 32,
      value,
      separator: ".",
      blocks: parts.map((part) => {
        const octet = Number(part);
        return { text: String(octet), sub: toBinary(BigInt(octet), 8) };
      })
    };
  }

  function parseMAC(text) {
    const hex = text.replace(/[:.-]/g, "").toUpperCase();
    const pairs = hex.match(/.{2}/g);
    return {
      kind: "mac",
      label: "MAC",
      bits: 48,
      value: BigInt("0x" + hex),
      separator: ":",
      blocks: pairs.map((pair) => ({ text: pair, sub: toBinary(BigInt("0x" + pair), 8) }))
    };
  }

  // Expande a forma comprimida (::) e devolve os 8 hextetos completos.
  function parseIPv6(text) {
    const invalid = "Esse IPv6 não está completo. São 8 blocos de até 4 dígitos hex, e o :: pode aparecer só uma vez.";
    const halves = text.split("::");
    if (halves.length > 2) throw new Error(invalid);

    const left = halves[0] ? halves[0].split(":") : [];
    const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
    let groups;

    if (halves.length === 2) {
      const missing = 8 - left.length - right.length;
      if (missing < 1) throw new Error(invalid);
      groups = left.concat(new Array(missing).fill("0"), right);
    } else {
      groups = left;
    }

    if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/i.test(g))) {
      throw new Error(invalid);
    }

    const hextets = groups.map((g) => g.toUpperCase().padStart(4, "0"));
    return {
      kind: "ipv6",
      label: "IPv6",
      bits: 128,
      value: BigInt("0x" + hextets.join("")),
      separator: ":",
      blocks: hextets.map((h) => ({ text: h, sub: String(parseInt(h, 16)) }))
    };
  }

  // Reconhece IPv4 (no modo decimal) e MAC/IPv6 (no modo hexadecimal).
  // Devolve null quando o texto não tem cara de endereço.
  function parseAddress(text, base) {
    if (base === 10 && text.includes(".")) {
      if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(text)) {
        throw new Error("Para IPv4, use 4 números separados por ponto, como 192.168.1.10.");
      }
      return parseIPv4(text);
    }
    if (base === 16 && /[:.-]/.test(text)) {
      if (/^[0-9a-f]{2}([:-])[0-9a-f]{2}(\1[0-9a-f]{2}){4}$/i.test(text)) return parseMAC(text);
      if (/^[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}$/i.test(text)) return parseMAC(text); // formato Cisco
      if (text.includes(":")) return parseIPv6(text);
      throw new Error("Não reconheci o endereço. MAC usa 6 pares (00:1A:2B:3C:4D:5E) e IPv6 usa 8 blocos separados por dois-pontos.");
    }
    return null;
  }

  /* ---------- Entrada principal ---------- */

  function parseNumber(raw, base) {
    const source = String(raw);
    if (/[\r\n\t]/.test(source)) {
      throw new Error("Use uma linha só. Espaços e _ podem separar os grupos.");
    }

    let clean = source.trim().replace(/[ _]/g, "");
    if (!clean) throw new Error("Digite um valor para converter.");
    if (clean.startsWith("-")) throw new Error("Aqui só entram inteiros a partir de zero.");

    const address = parseAddress(clean, base);
    if (address) {
      return { value: address.value, sourceBits: address.bits, address };
    }

    if (base === 2 && /^0b/i.test(clean)) clean = clean.slice(2);
    if (base === 16 && /^0x/i.test(clean)) clean = clean.slice(2);
    if (!clean) throw new Error("Depois do prefixo, digite os algarismos.");

    if (!BASE_PATTERN[base].test(clean)) {
      if (base === 2) throw new Error("Em binário só existem 0 e 1. O prefixo 0b é opcional.");
      if (base === 10) throw new Error("Em decimal use de 0 a 9, sem vírgula. Para IPv4, separe os octetos com ponto.");
      throw new Error("Em hexadecimal use 0 a 9 e A a F. O prefixo 0x é opcional.");
    }

    const prefix = base === 2 ? "0b" : base === 16 ? "0x" : "";
    const value = BigInt(prefix + clean);

    // Em binário e hex os zeros à esquerda contam: "0F" ocupa 8 bits.
    const sourceBits = base === 2 ? clean.length : base === 16 ? clean.length * 4 : 0;
    if (Math.max(bitLength(value), sourceBits) > MAX_BITS) {
      throw new Error(`O limite é ${MAX_BITS} bits, para as tabelas continuarem legíveis.`);
    }
    return { value, sourceBits, address: null };
  }

  /* ---------- Passo a passo ---------- */

  function divisionSteps(value, divisor) {
    const d = BigInt(divisor);
    if (value === 0n) return [{ dividend: 0n, quotient: 0n, remainder: 0n }];
    const steps = [];
    for (let current = value; current > 0n; current /= d) {
      steps.push({ dividend: current, quotient: current / d, remainder: current % d });
    }
    return steps;
  }

  // Pesos (potências de 2) com bit 1, do maior para o menor.
  function activeWeights(value, width) {
    const weights = [];
    for (let power = width - 1; power >= 0; power -= 1) {
      const weight = 1n << BigInt(power);
      if (value & weight) weights.push(weight);
    }
    return weights;
  }

  const api = {
    MAX_BITS,
    bitLength,
    groupFromRight,
    toBinary,
    toHex,
    parseNumber,
    parseAddress,
    divisionSteps,
    activeWeights
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.Conversao = api;
})(this);
