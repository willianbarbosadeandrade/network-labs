/*
 * Base Clara · interface
 * Liga o conversor, o trilho de bits, as tabelas e os exercícios.
 * As contas ficam em conversao.js; aqui é só tela.
 */
(function () {
  "use strict";

  const {
    MAX_BITS, bitLength, groupFromRight, toBinary, toHex,
    parseNumber, divisionSteps, activeWeights
  } = window.Conversao;

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => document.querySelectorAll(selector);

  const state = {
    base: 10,
    value: 173n,
    width: 8,
    learning: true,
    exercise: null,
    lastExerciseType: -1,
    correct: 0,
    streak: 0
  };

  function escapeHTML(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const pad = (value, length) => String(value).padStart(length, "0");

  // Soma longa (IPv6 tem dezenas de termos) vira um resumo que abre ao clicar.
  function sumMarkup(terms, total) {
    if (!terms.length) return "Nenhum peso ligado = 0";
    const full = terms.join(" + ") + " = " + total;
    if (terms.length <= 10) return full;
    const short = terms.slice(0, 3).join(" + ") + " + … + " + terms.slice(-2).join(" + ") + " = " + total;
    return `<details class="long-sum"><summary>${short}</summary>${full}<br><small>${terms.length} pesos ligados.</small></details>`;
  }

  /* ---------- Conversor ---------- */

  function chooseWidth(value, sourceBits) {
    const selected = $("widthSelect").value;
    const needed = Math.max(bitLength(value), sourceBits || 0);
    let width;
    if (selected === "auto") {
      width = Math.max(8, Math.ceil(needed / 8) * 8);
    } else {
      width = Math.max(parseInt(selected, 10), needed);
      width = Math.ceil(width / 4) * 4;
    }
    return Math.min(MAX_BITS, width);
  }

  function helpFor(base) {
    if (base === 2) return "Use 0 e 1. Pode separar com espaço ou _ e usar o prefixo 0b.";
    if (base === 16) return "Use 0 a 9 e A a F, com ou sem 0x. Também aceita MAC e IPv6.";
    return "Use algarismos de 0 a 9 ou um IPv4 como 192.168.1.10.";
  }

  function setHelp(message, isError) {
    const help = $("inputHelp");
    help.textContent = message;
    help.classList.toggle("error", isError);
    $("valueInput").setAttribute("aria-invalid", String(isError));
  }

  function clearScreen() {
    ["decimalResult", "binaryResult", "hexResult"].forEach((id) => { $(id).textContent = "-"; });
    ["bitRail", "nibbleStrip", "division2Body", "division16Body", "binaryExpansionBody",
      "hexExpansionBody", "groupExplainer", "division2Result", "division16Result",
      "binaryExpansionSummary", "hexExpansionSummary"].forEach((id) => { $(id).innerHTML = ""; });
    $("sumEquation").textContent = "Corrija a entrada para ver os pesos.";
    $("widthNote").textContent = "entrada inválida";
    $("addressDetail").hidden = true;
  }

  function syncBaseButtons() {
    $$("[data-base]").forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.base) === state.base));
    });
    $$("[data-result-base]").forEach((row) => {
      row.classList.toggle("current", Number(row.dataset.resultBase) === state.base);
    });
    const input = $("valueInput");
    input.inputMode = state.base === 10 ? "decimal" : "text";
    input.placeholder = { 2: "Ex.: 1010 1101", 10: "Ex.: 173 ou 192.168.1.10", 16: "Ex.: AD ou 00:1A:2B:3C:4D:5E" }[state.base];
  }

  function updateConverter() {
    syncBaseButtons();
    let parsed;
    try {
      parsed = parseNumber($("valueInput").value, state.base);
    } catch (error) {
      setHelp(error.message, true);
      clearScreen();
      return;
    }

    state.value = parsed.value;
    state.width = chooseWidth(parsed.value, parsed.sourceBits);
    $("widthNote").textContent = state.width + " bits exibidos";

    if (parsed.address) {
      setHelp(`${parsed.address.label} reconhecido: ${parsed.address.blocks.length} blocos, ${parsed.address.bits} bits.`, false);
      showAddress(parsed.address);
    } else {
      setHelp(helpFor(state.base), false);
      $("addressDetail").hidden = true;
    }

    renderResults();
    renderBits();
    renderMethods();
    selectByte(state.value <= 255n ? Number(state.value) : null);
  }

  function showAddress(address) {
    const box = $("addressDetail");
    box.innerHTML = '<div class="address-line">' +
      addressBlocks(address.blocks.map((b) => b.text), address.separator, address.blocks.map((b) => b.sub)) +
      "</div>";
    box.hidden = false;
  }

  function renderResults() {
    const binary = toBinary(state.value, state.width);
    const hex = toHex(state.value, state.width);
    $("decimalResult").textContent = state.value.toString();
    $("binaryResult").textContent = groupFromRight(binary, 4);
    $("hexResult").textContent = groupFromRight(hex, 2);
    $("decimalResult").dataset.copyValue = state.value.toString();
    $("binaryResult").dataset.copyValue = binary;
    $("hexResult").dataset.copyValue = hex;
  }

  function renderBits() {
    const bits = toBinary(state.value, state.width);
    let rail = "";
    for (let i = 0; i < bits.length; i += 1) {
      const power = bits.length - i - 1;
      const weight = (1n << BigInt(power)).toString();
      const on = bits[i] === "1";
      rail += `<div class="bit-column">
        <span class="bit-power">2<sup>${power}</sup></span>
        <span class="bit-weight" title="${weight}">${weight}</span>
        <button type="button" class="bit-button${on ? " is-on" : ""}" data-bit-power="${power}"
          ${state.learning ? "" : "disabled"} aria-label="Bit da posição ${power}, valor ${on ? 1 : 0}">${on ? 1 : 0}</button>
      </div>`;
    }
    $("bitRail").innerHTML = rail;

    let nibbles = "";
    for (let start = 0; start < bits.length; start += 4) {
      const group = bits.slice(start, start + 4);
      nibbles += `<div class="nibble-card"><code>${group}</code><strong>→ ${parseInt(group, 2).toString(16).toUpperCase()}</strong></div>`;
    }
    $("nibbleStrip").innerHTML = nibbles;

    const terms = activeWeights(state.value, state.width).map(String);
    $("sumEquation").innerHTML = sumMarkup(terms, state.value.toString());
  }

  // Clicar num bit liga/desliga aquele peso e passa a entrada para binário.
  function toggleBit(power) {
    state.value ^= 1n << BigInt(power);
    state.base = 2;
    $("valueInput").value = toBinary(state.value, state.width);
    updateConverter();
  }

  /* ---------- Como chegamos ao resultado ---------- */

  function renderDivision(divisor, bodyId, resultId) {
    const steps = divisionSteps(state.value, divisor);
    const digit = (n) => (divisor === 16 ? n.toString(16).toUpperCase() : n.toString());

    $(bodyId).innerHTML = steps.map((step) => {
      let rest = step.remainder.toString();
      if (divisor === 16 && step.remainder > 9n) rest += ` (${digit(step.remainder)})`;
      return `<tr><td><code>${step.dividend}</code></td><td><code>${step.quotient}</code></td><td class="remainder"><code>${rest}</code></td></tr>`;
    }).join("");

    const readUp = steps.slice().reverse().map((step) => digit(step.remainder)).join("");
    $(resultId).innerHTML = `Lendo os restos de baixo para cima: <code>${readUp}</code>.`;
  }

  function renderMethods() {
    renderDivision(2, "division2Body", "division2Result");
    renderDivision(16, "division16Body", "division16Result");

    const bits = toBinary(state.value, state.width);
    let binaryRows = "";
    for (let i = 0; i < bits.length; i += 1) {
      const power = bits.length - i - 1;
      const weight = 1n << BigInt(power);
      const bit = bits[i] === "1" ? 1n : 0n;
      binaryRows += `<tr><td><code>${bit}</code></td><td><code>2<sup>${power}</sup></code></td><td><code>${weight}</code></td><td><code>${bit * weight}</code></td></tr>`;
    }
    $("binaryExpansionBody").innerHTML = binaryRows;
    const binaryTerms = activeWeights(state.value, state.width).map(String);
    $("binaryExpansionSummary").innerHTML = binaryTerms.length
      ? "Somando só os bits ligados: " + sumMarkup(binaryTerms, state.value.toString())
      : "Todos os bits estão desligados: <code>0 = 0</code>.";

    const hex = toHex(state.value, state.width);
    let hexRows = "";
    const hexTerms = [];
    for (let i = 0; i < hex.length; i += 1) {
      const power = hex.length - i - 1;
      const digitValue = BigInt(parseInt(hex[i], 16));
      const contribution = digitValue * 16n ** BigInt(power);
      if (digitValue) hexTerms.push(contribution.toString());
      hexRows += `<tr><td><code>${hex[i]}</code></td><td><code>${digitValue}</code></td><td><code>16<sup>${power}</sup></code></td><td><code>${contribution}</code></td></tr>`;
    }
    $("hexExpansionBody").innerHTML = hexRows;
    $("hexExpansionSummary").innerHTML = hexTerms.length
      ? "Somando os dígitos diferentes de zero: " + sumMarkup(hexTerms, state.value.toString())
      : "Todos os dígitos valem zero: <code>0 = 0</code>.";

    let groups = "";
    for (let i = 0; i < bits.length; i += 4) {
      const quartet = bits.slice(i, i + 4);
      groups += `<div class="group-step"><span class="bits">${quartet}</span><span class="arrow">↓</span><span class="hex">${parseInt(quartet, 2).toString(16).toUpperCase()}</span></div>`;
    }
    $("groupExplainer").innerHTML = groups;
  }

  /* ---------- Tabelas ---------- */

  function renderHexReference() {
    const names = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
      "A vale dez", "B vale onze", "C vale doze", "D vale treze", "E vale catorze", "F vale quinze"];
    $("hexReferenceBody").innerHTML = names.map((name, i) =>
      `<tr><td>${i}</td><td>${pad(i.toString(2), 4)}</td><td>${i.toString(16).toUpperCase()}</td><td>${name}</td></tr>`
    ).join("");
  }

  function renderByteMatrix() {
    let html = "<thead><tr><th>+</th>";
    for (let col = 0; col < 16; col += 1) html += `<th>${col.toString(16).toUpperCase()}</th>`;
    html += "</tr></thead><tbody>";
    for (let row = 0; row < 16; row += 1) {
      html += `<tr><th>${row.toString(16).toUpperCase()}</th>`;
      for (let col = 0; col < 16; col += 1) {
        const value = row * 16 + col;
        const hex = pad(value.toString(16).toUpperCase(), 2);
        html += `<td><button type="button" class="byte-cell" data-byte="${value}" title="${hex} hex = ${value} decimal = ${pad(value.toString(2), 8)} binário"><strong>${hex}</strong><small>${value}</small></button></td>`;
      }
      html += "</tr>";
    }
    $("byteMatrix").innerHTML = html + "</tbody>";
  }

  function selectByte(value, announce) {
    $$("[data-byte]").forEach((cell) => {
      cell.classList.toggle("selected", value !== null && Number(cell.dataset.byte) === value);
    });
    if (value === null) {
      $("byteDetail").textContent = "O valor atual não cabe em um byte. A tabela vai só de 0 a 255.";
      return;
    }
    const hex = pad(value.toString(16).toUpperCase(), 2);
    $("byteDetail").innerHTML = `<code>${hex}<sub>16</sub></code> = <code>${value}<sub>10</sub></code> = ` +
      `<code>${groupFromRight(pad(value.toString(2), 8), 4)}<sub>2</sub></code>. ` +
      `Nibble alto: <code>${hex[0]}</code>; nibble baixo: <code>${hex[1]}</code>.`;
    if (announce) toast("Byte " + hex + " selecionado");
  }

  function searchByte() {
    const raw = $("byteSearch").value.trim().replace(/[ _]/g, "");
    if (!raw) {
      selectByte(state.value <= 255n ? Number(state.value) : null);
      return;
    }
    let value = null;
    if (/^0b[01]{1,8}$/i.test(raw)) value = parseInt(raw.slice(2), 2);
    else if (/^0x[0-9a-f]{1,2}$/i.test(raw)) value = parseInt(raw.slice(2), 16);
    else if (/^[0-9a-f]{1,2}$/i.test(raw) && /[a-f]/i.test(raw)) value = parseInt(raw, 16);
    else if (/^\d{1,3}$/.test(raw)) value = parseInt(raw, 10);

    if (value === null || value > 255) {
      selectByte(null);
      $("byteDetail").textContent = "Busca inválida. Use 0 a 255, 0x00 a 0xFF ou 0b00000000 a 0b11111111.";
    } else {
      selectByte(value);
    }
  }

  /* ---------- IPv4, IPv6 e MAC ---------- */

  function addressBlocks(values, separator, subtitles) {
    return values.map((value, i) =>
      `<span class="address-pair"><span class="address-block"><strong>${escapeHTML(value)}</strong><small>${escapeHTML(subtitles[i])}</small></span>` +
      (i < values.length - 1 ? `<span class="address-separator">${separator}</span>` : "") + "</span>"
    ).join("");
  }

  function renderNetworks() {
    const ipv4 = [192, 168, 1, 10];
    $("ipv4Address").innerHTML = addressBlocks(ipv4.map(String), ".", ipv4.map((n) => pad(n.toString(2), 8)));
    $("ipv4Body").innerHTML = ipv4.map((n, i) =>
      `<tr><td>${i + 1}</td><td><code>${n}</code></td><td><code>${groupFromRight(pad(n.toString(2), 8), 4)}</code></td><td><code>${pad(n.toString(16).toUpperCase(), 2)}</code></td></tr>`
    ).join("");

    const ipv6 = ["2001", "0DB8", "0000", "0000", "0000", "FF00", "0042", "8329"];
    $("ipv6Address").innerHTML = addressBlocks(ipv6, ":", ipv6.map((h) => pad(parseInt(h, 16).toString(2), 16)));
    $("ipv6Body").innerHTML = ipv6.map((h) => {
      const n = parseInt(h, 16);
      return `<tr><td><code>${h}</code></td><td><code>${groupFromRight(pad(n.toString(2), 16), 4)}</code></td><td><code>${n}</code></td></tr>`;
    }).join("");

    const mac = ["00", "1A", "2B", "3C", "4D", "5E"];
    $("macAddress").innerHTML = addressBlocks(mac, ":", mac.map((h) => pad(parseInt(h, 16).toString(2), 8)));
    $("macBody").innerHTML = mac.map((h, i) => {
      const n = parseInt(h, 16);
      return `<tr><td>${i + 1}</td><td><code>${h}</code></td><td><code>${groupFromRight(pad(n.toString(2), 8), 4)}</code></td><td><code>${n}</code></td></tr>`;
    }).join("");
  }

  const EXAMPLES = {
    ipv4: { base: 10, value: "192.168.1.10", message: "IPv4 carregado no conversor" },
    ipv6: { base: 16, value: "2001:db8::ff00:42:8329", message: "IPv6 carregado no conversor" },
    mac: { base: 16, value: "00:1A:2B:3C:4D:5E", message: "MAC carregado no conversor" }
  };

  function loadExample(kind) {
    const example = EXAMPLES[kind];
    state.base = example.base;
    $("valueInput").value = example.value;
    $("widthSelect").value = "auto";
    updateConverter();
    $("conversor").scrollIntoView({ behavior: "smooth", block: "start" });
    toast(example.message);
  }

  /* ---------- Avisos e cópia ---------- */

  let toastTimer;
  function toast(message) {
    const box = $("toast");
    box.textContent = message;
    box.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove("show"), 1800);
  }

  function copy(text) {
    const fallback = () => {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy");
        toast("Valor copiado");
      } catch (error) {
        toast("Selecione o valor e copie manualmente");
      }
      area.remove();
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => toast("Valor copiado")).catch(fallback);
    } else {
      fallback();
    }
  }

  /* ---------- Exercícios ---------- */

  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const POWERS_OF_TWO = [1, 2, 4, 8, 16, 32, 64, 128];

  function readAnswer(input, base) {
    let clean = String(input).trim().replace(/[ _]/g, "");
    if (base === 2) clean = clean.replace(/^0b/i, "");
    if (base === 16) clean = clean.replace(/^0x/i, "");
    const patterns = { 2: /^[01]+$/, 10: /^[0-9]+$/, 16: /^[0-9a-f]+$/i };
    if (!patterns[base].test(clean)) return null;
    return BigInt((base === 2 ? "0b" : base === 16 ? "0x" : "") + clean);
  }

  const weightText = (n) => activeWeights(BigInt(n), 8).join(" + ") || "0";

  function makeExercise(type) {
    let n;

    if (type === 0) {
      n = randomInt(2, 255);
      const expected = n.toString(2);
      return {
        kind: "Decimal → binário",
        question: `Como <code>${n}<sub>10</sub></code> fica em binário?`,
        placeholder: "Ex.: 101010",
        hints: [
          `Divida ${n} por 2 e anote o resto. Repita com cada quociente.`,
          "Leia os restos de baixo para cima. No byte, os pesos são 128, 64, 32, 16, 8, 4, 2 e 1."
        ],
        solution: `<strong>Solução:</strong> ${n}<sub>10</sub> = <code>${expected}<sub>2</sub></code>. Pesos ligados: ${weightText(n)}.`,
        check: (input) => readAnswer(input, 2) === BigInt(n),
        wrong: (input) => {
          const bitsOnly = String(input).replace(/[^01]/g, "");
          if (bitsOnly.split("").reverse().join("") === expected) {
            return "Os bits estão certos, mas na ordem invertida. Os restos se leem de baixo para cima.";
          }
          return `Procure o maior peso que cabe em ${n} e vá descendo.`;
        }
      };
    }

    if (type === 1) {
      n = randomInt(8, 255);
      const binary = pad(n.toString(2), 8);
      return {
        kind: "Binário → decimal",
        question: `Qual é o valor decimal de <code>${groupFromRight(binary, 4)}<sub>2</sub></code>?`,
        placeholder: "Ex.: 173",
        hints: [
          "Comece pela direita: os pesos são 1, 2, 4, 8, 16, 32, 64 e 128.",
          `Some só os pesos com bit 1: ${weightText(n)}.`
        ],
        solution: `<strong>Solução:</strong> ${weightText(n)} = <code>${n}<sub>10</sub></code>.`,
        check: (input) => readAnswer(input, 10) === BigInt(n),
        wrong: () => "Confira o alinhamento: o bit da direita vale 1 e cada posição à esquerda dobra."
      };
    }

    if (type === 2) {
      n = randomInt(16, 255);
      const binary = pad(n.toString(2), 8);
      const hex = pad(n.toString(16).toUpperCase(), 2);
      return {
        kind: "Binário → hexadecimal",
        question: `Converta <code>${groupFromRight(binary, 4)}<sub>2</sub></code> para hexadecimal.`,
        placeholder: "Ex.: AD",
        hints: [
          "Separe em grupos de 4 bits, da direita para a esquerda.",
          `Os grupos são ${binary.slice(0, 4)} e ${binary.slice(4)}. Cada um vira um dígito de 0 a F.`
        ],
        solution: `<strong>Solução:</strong> <code>${binary.slice(0, 4)} → ${hex[0]}</code> e <code>${binary.slice(4)} → ${hex[1]}</code>, então <code>${hex}<sub>16</sub></code>.`,
        check: (input) => readAnswer(input, 16) === BigInt(n),
        wrong: () => "Agrupe a partir da direita. Cada grupo de 4 bits vira exatamente um dígito hex."
      };
    }

    if (type === 3) {
      n = randomInt(0, 255);
      const hex = pad(n.toString(16).toUpperCase(), 2);
      const binary = pad(n.toString(2), 8);
      return {
        kind: "Byte de MAC",
        question: `Num endereço MAC, como o byte <code>${hex}<sub>16</sub></code> fica em 8 bits?`,
        placeholder: "8 bits, ex.: 00011010",
        hints: [
          "Converta cada dígito hex em 4 bits.",
          `${hex[0]} ocupa os 4 primeiros bits e ${hex[1]} os 4 últimos.`
        ],
        solution: `<strong>Solução:</strong> <code>${hex[0]} → ${binary.slice(0, 4)}</code> e <code>${hex[1]} → ${binary.slice(4)}</code>, então <code>${groupFromRight(binary, 4)}</code>.`,
        check: (input) => String(input).trim().replace(/[ _]/g, "").replace(/^0b/i, "") === binary,
        wrong: (input) => {
          if (readAnswer(input, 2) === BigInt(n)) {
            return "O valor está certo, mas um byte de MAC sempre aparece com 8 bits. Complete com zeros à esquerda.";
          }
          return "Converta cada dígito hex separado, em 4 bits cada.";
        }
      };
    }

    if (type === 4) {
      n = randomInt(1, 255);
      return {
        kind: "Pesos binários",
        question: `Quais pesos ligados formam <code>${n}<sub>10</sub></code>? Separe com +.`,
        placeholder: "Ex.: 128 + 32 + 8",
        hints: [
          `Comece pelo maior peso que não passa de ${n}.`,
          "Use 128, 64, 32, 16, 8, 4, 2, 1 e vá subtraindo."
        ],
        solution: `<strong>Solução:</strong> <code>${weightText(n)} = ${n}</code>.`,
        check: (input) => {
          const numbers = (String(input).match(/\d+/g) || []).map(Number);
          const unique = new Set(numbers).size === numbers.length; // cada peso só uma vez
          const onlyPowers = numbers.every((x) => POWERS_OF_TWO.includes(x));
          return numbers.length > 0 && unique && onlyPowers && numbers.reduce((a, b) => a + b, 0) === n;
        },
        wrong: () => `A soma ainda não fecha em ${n}. Use só potências de 2, cada uma uma vez.`
      };
    }

    if (type === 5) {
      n = randomInt(220, 300);
      const valid = n <= 255;
      return {
        kind: "Validação IPv4",
        question: `<code>${n}</code> pode ser um octeto de um endereço IPv4? Responda sim ou não.`,
        placeholder: "sim ou não",
        hints: ["Um octeto tem 8 bits.", "O menor valor é 0 e o maior é 255: são 256 combinações contando o zero."],
        solution: `<strong>Solução:</strong> ${valid ? "Sim" : "Não"}. ${n} ${valid ? "está entre 0 e 255." : "passa de 255, o maior valor em 8 bits."}`,
        check: (input) => {
          const answer = String(input).trim().toLowerCase();
          return valid ? ["s", "sim", "yes"].includes(answer) : ["n", "não", "nao", "no"].includes(answer);
        },
        wrong: () => "Lembre: 8 bits dão 256 combinações, numeradas de 0 a 255."
      };
    }

    n = randomInt(256, 65535);
    const hextet = pad(n.toString(16).toUpperCase(), 4);
    return {
      kind: "Hexteto IPv6",
      question: `Qual é o valor decimal do hexteto IPv6 <code>${hextet}<sub>16</sub></code>?`,
      placeholder: "Valor decimal",
      hints: ["Os pesos em hex são 16³, 16², 16¹ e 16⁰.", "Da direita para a esquerda: 1, 16, 256 e 4096."],
      solution: `<strong>Solução:</strong> <code>${hextet}<sub>16</sub> = ${n}<sub>10</sub></code>. Um hexteto vai até 65.535.`,
      check: (input) => readAnswer(input, 10) === BigInt(n),
      wrong: () => "Não leia o hexteto como decimal. Cada posição é uma potência de 16."
    };
  }

  function newExercise(focus) {
    let type = randomInt(0, 6);
    if (type === state.lastExerciseType) type = (type + 1) % 7;
    state.lastExerciseType = type;
    state.exercise = Object.assign(makeExercise(type), { hintIndex: 0, solved: false });

    $("questionKind").textContent = state.exercise.kind;
    $("exerciseQuestion").innerHTML = state.exercise.question;
    $("answerInput").value = "";
    $("answerInput").placeholder = state.exercise.placeholder;
    setFeedback("", "Escreva sua resposta e clique em verificar.");
    if (focus) $("answerInput").focus();
  }

  function setFeedback(kind, html) {
    const box = $("exerciseFeedback");
    box.className = "feedback" + (kind ? " " + kind : "");
    box.innerHTML = html;
  }

  function updateScore() {
    $("correctCount").textContent = state.correct;
    $("streakCount").textContent = state.streak;
  }

  function checkExercise(event) {
    event.preventDefault();
    const input = $("answerInput").value;
    const exercise = state.exercise;
    if (!input.trim()) {
      setFeedback("error", "Digite uma resposta antes de verificar.");
      return;
    }
    if (exercise.check(input)) {
      if (!exercise.solved) {
        state.correct += 1;
        state.streak += 1;
        exercise.solved = true;
        updateScore();
      }
      setFeedback("success", "✓ <strong>Correto.</strong> " + exercise.solution);
    } else {
      if (!exercise.solved) {
        state.streak = 0;
        updateScore();
      }
      setFeedback("error", "Ainda não. " + escapeHTML(exercise.wrong(input)) + " Tente de novo.");
    }
  }

  function showHint() {
    const exercise = state.exercise;
    const i = Math.min(exercise.hintIndex, exercise.hints.length - 1);
    setFeedback("hint", `<strong>Pista ${i + 1}:</strong> ${escapeHTML(exercise.hints[i])}`);
    exercise.hintIndex = Math.min(i + 1, exercise.hints.length - 1);
  }

  function revealSolution() {
    state.streak = 0;
    updateScore();
    setFeedback("hint", state.exercise.solution + " Quando quiser, gere uma nova questão.");
  }

  /* ---------- Modo aprendizado, abas e instalação ---------- */

  function setLearningMode(enabled) {
    state.learning = enabled;
    $$(".learning-detail").forEach((el) => { el.hidden = !enabled; });
    $$('.nav a[href="#tabelas"], .nav a[href="#redes"]').forEach((link) => { link.hidden = !enabled; });
    renderBits();
    toast(enabled ? "Modo aprendizado ligado" : "Modo conversão rápida");
  }

  function setupTabs(attribute, names) {
    $$(`[${attribute}]`).forEach((button) => {
      button.addEventListener("click", () => {
        const chosen = button.getAttribute(attribute);
        $$(`[${attribute}]`).forEach((tab) => tab.setAttribute("aria-selected", String(tab === button)));
        names.forEach((name) => { $(name + "Panel").hidden = name !== chosen; });
      });
    });
  }

  // Instalação como app.
  // Chrome, Edge e Android oferecem o evento beforeinstallprompt, então dá para ter um botão.
  // No iPhone não existe esse evento: a única forma é Compartilhar > Adicionar à Tela de Início,
  // então mostramos o passo a passo num aviso.
  let installPrompt = null;
  const BANNER_KEY = "baseClara.avisoInstalarFechado";

  const isIOS = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPad se apresenta como Mac

  const isInstalled = () =>
    window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

  function bannerWasClosed() {
    try { return localStorage.getItem(BANNER_KEY) === "1"; } catch (error) { return false; }
  }

  function showBanner(html, withButton) {
    if (bannerWasClosed()) return;
    $("installBannerText").innerHTML = html;
    $("installBannerButton").hidden = !withButton;
    $("installBanner").hidden = false;
    document.body.classList.add("has-banner");
  }

  function hideBanner(remember) {
    $("installBanner").hidden = true;
    document.body.classList.remove("has-banner");
    if (remember) {
      try { localStorage.setItem(BANNER_KEY, "1"); } catch (error) { /* modo privado: tudo bem */ }
    }
  }

  async function askToInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    $("installButton").hidden = true;
    hideBanner(false);
  }

  function setupInstall() {
    if (isInstalled()) {
      // Já está aberto como app: não faz sentido pedir para instalar.
      $("instalar").hidden = true;
    } else if (isIOS()) {
      $("iosInstallLine").classList.add("is-current");
      showBanner($("iosSteps").innerHTML, false);
    }

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      installPrompt = event;
      $("installButton").hidden = false;
      showBanner("<strong>Base Clara pode virar app</strong> no seu aparelho, e funciona sem internet.", true);
    });
    window.addEventListener("appinstalled", () => {
      hideBanner(true);
      $("instalar").hidden = true;
      toast("Base Clara instalado");
    });

    $("installButton").addEventListener("click", askToInstall);
    $("installBannerButton").addEventListener("click", askToInstall);
    $("installBannerClose").addEventListener("click", () => hideBanner(true));

    // O service worker só funciona via http(s); aberto direto do arquivo, é ignorado.
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  function bindEvents() {
    let typingTimer;
    $("valueInput").addEventListener("input", () => {
      clearTimeout(typingTimer);
      typingTimer = setTimeout(updateConverter, 70);
    });
    $("widthSelect").addEventListener("change", updateConverter);

    $$("[data-base]").forEach((button) => {
      button.addEventListener("click", () => {
        state.base = Number(button.dataset.base);
        updateConverter();
        $("valueInput").focus();
        $("valueInput").select();
      });
    });

    $$("[data-preset-value]").forEach((chip) => {
      chip.addEventListener("click", () => {
        state.base = 10;
        $("valueInput").value = chip.dataset.presetValue;
        $("widthSelect").value = "auto";
        updateConverter();
      });
    });

    $$("[data-copy-target]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = $(button.dataset.copyTarget);
        copy(target.dataset.copyValue || target.textContent);
      });
    });

    // Um ouvinte só para todos os bits (eles são redesenhados a cada mudança).
    $("bitRail").addEventListener("click", (event) => {
      const bit = event.target.closest("[data-bit-power]");
      if (bit && !bit.disabled) toggleBit(Number(bit.dataset.bitPower));
    });

    $("byteMatrix").addEventListener("click", (event) => {
      const cell = event.target.closest("[data-byte]");
      if (cell) selectByte(Number(cell.dataset.byte), true);
    });

    $("learningToggle").addEventListener("change", (event) => setLearningMode(event.target.checked));
    $("byteSearch").addEventListener("input", searchByte);
    $("clearByteSearch").addEventListener("click", () => {
      $("byteSearch").value = "";
      searchByte();
      $("byteSearch").focus();
    });

    $$("[data-network-load]").forEach((button) => {
      button.addEventListener("click", () => loadExample(button.dataset.networkLoad));
    });

    $("exerciseForm").addEventListener("submit", checkExercise);
    $("newQuestion").addEventListener("click", () => newExercise(true));
    $("hintButton").addEventListener("click", showHint);
    $("revealButton").addEventListener("click", revealSolution);
  }

  renderHexReference();
  renderByteMatrix();
  renderNetworks();
  setupTabs("data-method", ["division", "position", "group"]);
  setupTabs("data-network", ["ipv4", "ipv6", "mac"]);
  bindEvents();
  setupInstall();
  updateConverter();
  newExercise(false);
})();
