/* Profesor virtual de mates: chat al lado del buscador.
   - Problemas con figura a escala, comprobación de respuestas, pistas y solución paso a paso (integrado, funciona sin conexión).
   - Preguntas libres y problemas «a medida» con una IA (Gemini gratis o Claude) usando la clave del propio alumno, guardada solo en su navegador. */
(function () {
  "use strict";
  var host = document.getElementById("tutor");
  if (!host || !window.Generador || !window.Figuras) return;
  var G = window.Generador, F = window.Figuras, BT = "```";

  /* ---------- utilidades ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function $(sel, el) { return (el || host).querySelector(sel); }
  var LS = "mates1btx-tutor";
  function load() { try { return JSON.parse(localStorage.getItem(LS) || "{}") || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(LS, JSON.stringify({ prov: cfg.prov, key: cfg.key, model: cfg.model, topic: state.topic, level: state.level })); } catch (e) {} }
  var saved = load();
  var cfg = { prov: saved.prov || "free", key: saved.key || "", model: saved.model || "" };
  var state = { topic: saved.topic || "", level: saved.level || 2, cur: null, hintN: 0, busy: false, hist: [], ctrl: null, last: null };
  var DEFAULT_MODEL = { free: "openai", gemini: "gemini-flash-latest", claude: "claude-sonnet-5-5" };
  function hasKey() { return cfg.key.length > 10; }
  /* servicio realmente en uso: sin clave siempre se usa la IA gratuita integrada */
  function prov() { return cfg.prov !== "free" && hasKey() ? cfg.prov : "free"; }
  function model() { return (cfg.prov === prov() && cfg.model) || DEFAULT_MODEL[prov()]; }
  function aiOn() { return true; }

  /* ---------- Markdown + LaTeX (sin dependencias) ---------- */
  function figHtml(txt) {
    var t = txt.replace(/\/\*[\s\S]*?\*\//g, "").replace(/,\s*([}\]])/g, "$1");
    try { return F.render(JSON.parse(t)); } catch (e) { return '<p class="fig-err">No he podido dibujar la figura.</p>'; }
  }
  function md(src, inlineOnly) {
    var maths = [];
    src = String(src == null ? "" : src).replace(/\r/g, "").replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g, function (m) { maths.push(m); return "\u0001" + (maths.length - 1) + "\u0002"; });
    function inline(s) {
      return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, "$1<em>$2</em>").replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }
    var DET = { pista: "Pista", solucion: "Solución paso a paso", "solución": "Solución paso a paso", ejemplo: "Ejemplo", nota: "Nota" };
    function blocks(lines) {
      var out = "", i = 0, m;
      while (i < lines.length) {
        var ln = lines[i];
        if (/^\s*$/.test(ln)) { i++; continue; }
        if (/^\s*```/.test(ln)) {
          var lang = ln.replace(/^\s*```/, "").trim().toLowerCase(), buf = []; i++;
          while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]);
          var closed = i < lines.length; i++;
          out += (lang === "figura" || lang === "figure") ? (closed ? figHtml(buf.join("\n")) : '<p class="fig-wait">Dibujando la figura…</p>') : "<pre><code>" + esc(buf.join("\n")) + "</code></pre>";
          continue;
        }
        if ((m = /^:::\s*(pista|soluci[oó]n|ejemplo|nota)\s*$/i.exec(ln))) {
          var kind = m[1].toLowerCase(), inner = []; i++;
          while (i < lines.length && !/^:::\s*$/.test(lines[i])) inner.push(lines[i++]);
          i++;
          out += '<details class="rev ' + (kind[0] === "s" ? "sol" : kind) + '"><summary>' + DET[kind] + "</summary><div>" + blocks(inner) + "</div></details>";
          continue;
        }
        if ((m = /^(#{1,4})\s+(.*)$/.exec(ln))) { out += "<h4>" + inline(m[2]) + "</h4>"; i++; continue; }
        if (/^\s*(-{3,}|\*{3,})\s*$/.test(ln)) { out += "<hr>"; i++; continue; }
        if (/^\s*([-*+]|\d+[.)])\s+/.test(ln)) {
          var ord = /^\s*\d/.test(ln), items = [];
          while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, "")); i++; }
          out += (ord ? "<ol>" : "<ul>") + items.map(function (x) { return "<li>" + inline(x) + "</li>"; }).join("") + (ord ? "</ol>" : "</ul>");
          continue;
        }
        if (/^>\s?/.test(ln)) {
          var q = []; while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ""));
          out += "<blockquote>" + inline(q.join("\n")).replace(/\n/g, "<br>") + "</blockquote>"; continue;
        }
        if (ln.indexOf("|") >= 0 && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
          var cells = function (s) { return s.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map(function (c) { return inline(c.trim()); }); };
          var hd = cells(ln); i += 2; var rows = [];
          while (i < lines.length && lines[i].indexOf("|") >= 0 && !/^\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
          out += '<div class="tbl"><table><thead><tr>' + hd.map(function (c) { return "<th>" + c + "</th>"; }).join("") + "</tr></thead><tbody>" +
            rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
          continue;
        }
        var para = [];
        while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^\s*```/.test(lines[i]) && !/^:::/.test(lines[i]) && !/^(#{1,4})\s+/.test(lines[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i]) && !/^>\s?/.test(lines[i])) para.push(lines[i++]);
        if (!para.length) { para.push(lines[i++]); }
        out += "<p>" + inline(para.join("\n")).replace(/\n/g, "<br>") + "</p>";
      }
      return out;
    }
    var html = inlineOnly ? inline(src) : blocks(src.split("\n"));
    return html.replace(/\u0001(\d+)\u0002/g, function (m, n) { return esc(maths[+n]); });
  }
  var MATH_OPTS = { delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }, { left: "$", right: "$", display: false }], throwOnError: false, strict: false };
  function typeset(el, tries) {
    if (window.renderMathInElement) { try { window.renderMathInElement(el, MATH_OPTS); } catch (e) {} }
    else if ((tries || 0) < 20) setTimeout(function () { typeset(el, (tries || 0) + 1); }, 300);
  }

  /* ---------- interfaz ---------- */
  var TOPICS = G.temas;
  host.innerHTML =
    '<div class="tt-head"><div class="tt-title"><h2>Profesor virtual de matemáticas</h2><span class="tt-st" id="tt-st"></span></div>' +
    '<div class="tt-hb"><button type="button" id="tt-new" title="Nueva conversación" aria-label="Nueva conversación"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg></button>' +
    '<button type="button" id="tt-cfg" title="Ajustes de la IA" aria-label="Ajustes de la IA"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></button>' +
    '<button type="button" id="tt-x" class="tt-close" title="Cerrar" aria-label="Cerrar el chat"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div></div>' +
    '<div class="tt-cfgp" id="tt-cfgp" hidden>' +
    '<p class="tt-note">Por defecto uso una <b>IA gratuita integrada</b> (sin clave; es un servicio de terceros, así que no escribas datos personales). Para respuestas más finas y figuras más fiables, usa tu propia clave: con <b>Gemini es gratis</b> en <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>. La clave se guarda <b>solo en este navegador</b>.</p>' +
    '<label>Servicio<select id="tt-prov"><option value="free">IA gratuita integrada (sin clave)</option><option value="gemini">Gemini (con tu clave, gratis)</option><option value="claude">Claude (Anthropic, de pago)</option></select></label>' +
    '<label>Clave de API<input id="tt-key" type="password" autocomplete="off" spellcheck="false" placeholder="Pega tu clave aquí"></label>' +
    '<label>Modelo<input id="tt-model" list="tt-models" spellcheck="false"><datalist id="tt-models"></datalist></label>' +
    '<div class="tt-row"><button type="button" class="btn primary small" id="tt-save">Guardar</button><button type="button" class="btn small" id="tt-rm">Quitar clave</button></div></div>' +
    '<div class="tt-opts"><label>Tema<select id="tt-topic"><option value="">Todos los temas</option></select></label><label>Nivel<select id="tt-level"></select></label></div>' +
    '<div class="tt-msgs" id="tt-msgs" aria-live="polite"></div>' +
    '<div class="tt-chips" id="tt-chips"></div>' +
    '<form class="tt-form" id="tt-form"><textarea id="tt-in" rows="1" placeholder="Escribe tu duda…" aria-label="Escribe tu duda"></textarea><button type="submit" class="btn primary" id="tt-send">Enviar</button></form>';
  var elMsgs = $("#tt-msgs"), elIn = $("#tt-in"), elSend = $("#tt-send"), elChips = $("#tt-chips"), elSt = $("#tt-st"), elCfgP = $("#tt-cfgp");
  var selT = $("#tt-topic"), selL = $("#tt-level"), selP = $("#tt-prov"), inKey = $("#tt-key"), inModel = $("#tt-model");
  Object.keys(TOPICS).forEach(function (k) { selT.insertAdjacentHTML("beforeend", '<option value="' + k + '">' + esc(TOPICS[k]) + "</option>"); });
  Object.keys(G.niveles).forEach(function (k) { selL.insertAdjacentHTML("beforeend", '<option value="' + k + '">' + esc(G.niveles[k]) + "</option>"); });
  selT.value = state.topic; selL.value = String(state.level); selP.value = cfg.prov; inKey.value = cfg.key; inModel.value = cfg.model;
  var fab = document.createElement("button");
  fab.type = "button"; fab.id = "tt-fab"; fab.className = "btn primary"; fab.setAttribute("aria-label", "Abrir el profesor virtual");
  fab.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/></svg> Pregunta al profe';
  document.body.appendChild(fab);

  function setStatus() {
    elSt.textContent = "IA conectada · " + ({ free: "gratuita integrada", gemini: "Gemini", claude: "Claude" })[prov()];
    elSt.className = "tt-st on";
    var ph = "Pregúntame lo que quieras…";
    elIn.placeholder = ph;
  }
  function chips() {
    var own = prov() !== "free";
    var c = own ? [["Inventa un problema (IA)", "ia"], ["Problema rápido (sin IA)", "p"]] : [["Inventa un problema", "p"], ["Problema a medida (IA)", "ia"]];
    c = c.concat([["Otro parecido", "same"], ["Dame una pista", "hint"], ["Resumen de teoría", "teoria"]]);
    elChips.innerHTML = c.map(function (x) { return '<button type="button" class="chip" data-c="' + x[1] + '">' + esc(x[0]) + "</button>"; }).join("");
  }
  setStatus(); chips();

  /* ---------- mensajes ---------- */
  function nearBottom() { return elMsgs.scrollHeight - elMsgs.scrollTop - elMsgs.clientHeight < 140; }
  function toEnd() { elMsgs.scrollTop = elMsgs.scrollHeight; }
  function addUser(text) {
    var d = document.createElement("div"); d.className = "tt-m tt-user"; d.innerHTML = '<div class="tt-b">' + esc(text).replace(/\n/g, "<br>") + "</div>";
    elMsgs.appendChild(d); toEnd(); return d;
  }
  function addBot(html, cls) {
    var d = document.createElement("div"); d.className = "tt-m tt-bot" + (cls ? " " + cls : "");
    d.innerHTML = '<div class="tt-b md">' + (html || "") + "</div>";
    elMsgs.appendChild(d); typeset(d); toEnd(); return d;
  }
  function say(text) { return addBot(md(text)); }
  function busy(b) { state.busy = b; elSend.textContent = b ? "Parar" : "Enviar"; host.classList.toggle("is-busy", b); }

  /* ---------- teoría integrada ---------- */
  var TEORIA = {
    trig: "### Trigonometría\n- **Radianes:** $180^\\circ=\\pi$ rad. Longitud de arco $s=\\theta r$; área del sector $A=\\tfrac12 r^2\\theta$.\n- **Identidad fundamental:** $\\sin^2\\alpha+\\cos^2\\alpha=1$ y $\\tan\\alpha=\\dfrac{\\sin\\alpha}{\\cos\\alpha}$.\n- **Teorema del seno:** $\\dfrac{a}{\\sin A}=\\dfrac{b}{\\sin B}=\\dfrac{c}{\\sin C}$ (un lado y su ángulo opuesto conocidos).\n- **Teorema del coseno:** $a^2=b^2+c^2-2bc\\cos A$ (dos lados y el ángulo que forman, o los tres lados).\n- **Área:** $\\tfrac12 bc\\sin A$ y fórmula de Herón.\n- **Ángulo de elevación:** se mide desde la horizontal hacia arriba; en el triángulo rectángulo $\\tan\\alpha=\\dfrac{\\text{opuesto}}{\\text{adyacente}}$.",
    deriv: "### Derivadas\n- **Definición:** $f'(a)=\\displaystyle\\lim_{h\\to0}\\dfrac{f(a+h)-f(a)}{h}$ = pendiente de la tangente.\n- **Básicas:** $(x^n)'=nx^{n-1}$, $(e^x)'=e^x$, $(\\ln x)'=\\dfrac1x$, $(\\sin x)'=\\cos x$, $(\\cos x)'=-\\sin x$.\n- **Reglas:** $(u+v)'=u'+v'$; $(uv)'=u'v+uv'$; $\\left(\\dfrac uv\\right)'=\\dfrac{u'v-uv'}{v^2}$; cadena $(f\\circ g)'=f'(g)\\cdot g'$.\n- **Tangente en $x_0$:** $y-f(x_0)=f'(x_0)(x-x_0)$.\n- **Extremos:** $f'(x)=0$; si $f'$ pasa de + a − es máximo, de − a + mínimo.\n- **Optimización:** 1) variable y relación, 2) función de una variable, 3) derivar e igualar a 0, 4) comprobar que es máximo/mínimo, 5) responder con unidades.",
    vect: "### Vectores\n- **Entre dos puntos:** $\\overrightarrow{AB}=B-A$. **Módulo:** $|\\vec u|=\\sqrt{u_1^2+u_2^2}$.\n- **Punto medio:** $M=\\left(\\dfrac{x_A+x_B}2,\\dfrac{y_A+y_B}2\\right)$.\n- **Producto escalar:** $\\vec u\\cdot\\vec v=u_1v_1+u_2v_2=|\\vec u||\\vec v|\\cos\\theta$.\n- **Ángulo:** $\\cos\\theta=\\dfrac{\\vec u\\cdot\\vec v}{|\\vec u||\\vec v|}$. **Perpendiculares:** $\\vec u\\cdot\\vec v=0$.\n- **Paralelogramo $ABCD$:** $\\overrightarrow{AB}=\\overrightarrow{DC}$, y las diagonales se cortan en su punto medio.",
    comp: "### Números complejos\n- $i^2=-1$. Forma binómica $z=a+bi$; conjugado $\\bar z=a-bi$; módulo $|z|=\\sqrt{a^2+b^2}$.\n- **Producto:** se desarrolla usando $i^2=-1$. **Cociente:** multiplica por el conjugado del denominador.\n- **Forma polar:** $z=r_\\varphi$ con $r=|z|$ y $\\tan\\varphi=\\dfrac ba$ (mira el cuadrante).\n- **Producto/cociente en polar:** $r_\\alpha\\cdot s_\\beta=(rs)_{\\alpha+\\beta}$ y $\\dfrac{r_\\alpha}{s_\\beta}=\\left(\\dfrac rs\\right)_{\\alpha-\\beta}$.\n- **Moivre:** $(r_\\varphi)^n=(r^n)_{n\\varphi}$.",
    func: "### Funciones y límites\n- **Dominio:** excluye ceros de denominadores, radicandos negativos (raíz par) y argumentos no positivos de logaritmos.\n- **Asíntota vertical $x=a$:** $\\lim_{x\\to a}f(x)=\\pm\\infty$. **Horizontal $y=\\ell$:** $\\lim_{x\\to\\pm\\infty}f(x)=\\ell$.\n- **Oblicua $y=mx+n$:** $m=\\lim\\dfrac{f(x)}x$, $n=\\lim(f(x)-mx)$ (o divide los polinomios).\n- **Racionales en $\\infty$:** mismo grado → cociente de coeficientes principales; mayor grado arriba → $\\pm\\infty$; menor → 0.\n- **Indeterminación $0/0$:** factoriza y simplifica. **Notable:** $\\lim_{x\\to0}\\dfrac{\\sin x}{x}=1$.",
    exp: "### Exponenciales y logaritmos\n- $\\log_a b=x\\iff a^x=b$. **Cambio de base:** $\\log_a b=\\dfrac{\\ln b}{\\ln a}$.\n- $\\log(AB)=\\log A+\\log B$; $\\log\\dfrac AB=\\log A-\\log B$; $\\log A^n=n\\log A$.\n- **Ecuaciones exponenciales:** iguala bases o toma logaritmos. **Logarítmicas:** reduce a un solo logaritmo, exponencia y **comprueba el dominio**.\n- **Crecimiento:** $P(t)=P_0e^{kt}$; tiempo de duplicación $t=\\dfrac{\\ln2}{k}$."
  };

  /* ---------- problemas integrados ---------- */
  function fmtAns(q) {
    if (q.ansTxt) return q.ansTxt;
    var one = function (x) { return G.fx(x, 2); };
    return (Array.isArray(q.ans) ? q.ans.map(one).join("; ") : one(q.ans)) + (q.u ? " " + q.u : "");
  }
  function plain(s) { return String(s).replace(/\*\*/g, ""); }
  function llmText(p) {
    var t = "[Problema generado por la aplicación y mostrado al alumno con su figura]\n" + p.titulo + " (" + p.temaNombre + ", nivel " + p.nivelNombre + ")\n" + plain(p.enunciado) + "\nDatos: " + (p.datos || []).map(plain).join("; ") + "\nApartados: " + p.preguntas.map(function (q, i) { return (i + 1) + ") " + plain(q.t); }).join(" ");
    t += "\n[Solución interna, no la reveles salvo que el alumno la pida]: " + p.solucion.map(plain).join(" ") + " Respuestas: " + p.preguntas.map(function (q, i) { return q.ans === null ? "" : (i + 1) + ") " + fmtAns(q); }).join(" ");
    return t;
  }
  function parseNum(t) {
    t = t.replace(/[()\[\]]/g, "").replace(/[,.;]+$/, "").replace(/[°º]/g, "").replace(/\s*(?:grados|rad|cm²|m²|cm2|m2|cm|km|m|h)\.?$/i, "").trim();
    return t ? F.calc(t) : NaN;
  }
  function parseAns(str, n) {
    str = str.trim(); if (!str) return null;
    var toks = n > 1 ? str.split(/;|\s+y\s+|\s+/).filter(Boolean) : [str];
    if (n > 1 && toks.length < n) toks = str.split(/[;,\s]+/).filter(Boolean);
    var vals = toks.map(parseNum);
    return vals.some(isNaN) ? NaN : vals;
  }
  function close(a, b, tol) { return Math.abs(a - b) <= Math.max(0.011, (tol || 0.006) * Math.abs(b)); }

  function problemCard(p) {
    var el = document.createElement("article"); el.className = "pb"; var hint = 0;
    var h = '<div class="pb-tag"><span>' + esc(p.temaNombre) + "</span><span>" + esc(p.nivelNombre) + "</span></div><h4>" + esc(p.titulo) + "</h4>";
    h += '<div class="md">' + md(p.enunciado) + "</div>";
    if (p.figura) h += F.render(p.figura);
    if (p.datos && p.datos.length) h += '<div class="pb-sec"><b>Datos</b><ul>' + p.datos.map(function (d) { return "<li>" + md(d, true) + "</li>"; }).join("") + "</ul></div>";
    h += '<div class="pb-sec"><b>Calcula</b><ol class="pb-q">' + p.preguntas.map(function (q, i) {
      var many = Array.isArray(q.ans) ? q.ans.length : 1;
      return "<li><div>" + md(q.t, true) + "</div>" + (q.ans === null ? "" : '<div class="pb-ck"><input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="Respuesta del apartado ' + (i + 1) + '" placeholder="' + (many > 1 ? "separa con ;" : "tu respuesta") + (q.u ? " (" + q.u + ")" : "") + '" data-i="' + i + '"><button type="button" class="btn small" data-ck="' + i + '">Comprobar</button><span class="pb-fb" aria-live="polite"></span></div>') + "</li>";
    }).join("") + "</ol></div>";
    h += '<div class="pb-act"><button type="button" class="btn small" data-a="hint">Dame una pista</button><button type="button" class="btn small" data-a="sol">Ver solución paso a paso</button><button type="button" class="btn small" data-a="same">Otro parecido</button><button type="button" class="btn small" data-a="hard">Más difícil</button><button type="button" class="btn small" data-a="search">Buscar en las colecciones</button></div><div class="pb-rev"></div>';
    el.innerHTML = h;
    var rev = $(".pb-rev", el);
    function check(i) {
      var q = p.preguntas[i], inp = $('input[data-i="' + i + '"]', el), fb = inp.parentNode.querySelector(".pb-fb");
      var want = Array.isArray(q.ans) ? q.ans : [q.ans], got = parseAns(inp.value, want.length);
      fb.className = "pb-fb";
      if (got === null) { fb.textContent = ""; return; }
      if (got === NaN || (typeof got === "number" && isNaN(got)) || (Array.isArray(got) && got.some(isNaN))) { fb.className = "pb-fb bad"; fb.textContent = "Escribe números (también vale 3/5, pi/3 o 2,5)."; return; }
      if (got.length !== want.length) { fb.className = "pb-fb bad"; fb.textContent = "Faltan datos: se esperan " + want.length + " valores separados por «;»."; return; }
      var ok = want.every(function (w, k) { return close(got[k], w, q.tol); });
      fb.className = "pb-fb " + (ok ? "ok" : "bad");
      fb.textContent = ok ? "✓ ¡Correcto!" : "✗ Todavía no. Revisa el cálculo (o pide una pista).";
    }
    el.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-ck")) { check(+b.getAttribute("data-ck")); return; }
      var a = b.getAttribute("data-a"); if (!a) return;
      if (a === "hint") {
        if (hint >= p.pistas.length) { b.disabled = true; b.textContent = "No hay más pistas"; return; }
        rev.insertAdjacentHTML("beforeend", '<div class="pb-hint"><b>Pista ' + (hint + 1) + "/" + p.pistas.length + ".</b> " + md(p.pistas[hint], true) + "</div>");
        hint++; typeset(rev); if (hint >= p.pistas.length) { b.textContent = "Sin más pistas"; }
      } else if (a === "sol") {
        var ex = $(".pb-sol", el);
        if (ex) { ex.hidden = !ex.hidden; b.textContent = ex.hidden ? "Ver solución paso a paso" : "Ocultar solución"; return; }
        var s = '<div class="pb-sol"><h5>Solución paso a paso</h5>' + p.solucion.map(function (x) { return '<div class="pb-step">' + md(x) + "</div>"; }).join("");
        if (p.figuraSol) s += F.render(p.figuraSol);
        s += '<p class="pb-res"><b>Resultados:</b> ' + p.preguntas.map(function (q, i) { return q.ans === null ? "" : (i + 1) + ") " + esc(fmtAns(q)); }).filter(Boolean).join(" · ") + "</p></div>";
        rev.insertAdjacentHTML("beforeend", s); b.textContent = "Ocultar solución"; typeset(rev);
        setTimeout(function () { $(".pb-sol", el).scrollIntoView({ block: "nearest", behavior: "smooth" }); }, 60);
      } else if (a === "same") newProblem({ plantilla: p.id });
      else if (a === "hard") { state.level = Math.min(3, p.nivel + 1); selL.value = String(state.level); newProblem({ tema: p.tema, nivel: state.level, evitar: p.id }); }
      else if (a === "search") searchSite(p.busca);
    });
    el.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.matches("input[data-i]")) { e.preventDefault(); check(+e.target.getAttribute("data-i")); } });
    return el;
  }
  function newProblem(o) {
    o = o || {}; o.tema = o.tema != null ? o.tema : (o.plantilla ? undefined : state.topic); o.nivel = o.nivel || state.level;
    if (o.plantilla) { o.tema = undefined; }
    if (!o.evitar && state.cur) o.evitar = state.cur.id;
    var p = G.crear(o);
    state.cur = p; state.hintN = 0;
    var d = addBot("", "wide"); var b = d.querySelector(".tt-b"); b.className = "tt-b"; b.appendChild(problemCard(p)); typeset(d);
    state.hist.push({ role: "model", text: llmText(p) });
    d.scrollIntoView({ block: "start", behavior: "smooth" });
    return p;
  }
  function revealHint() {
    if (!state.cur) { say("Primero pídeme un problema con **Inventa un problema** y te ayudo con las pistas."); return; }
    var cards = elMsgs.querySelectorAll(".pb"), last = cards[cards.length - 1];
    if (last) { var btn = last.querySelector('[data-a="hint"]'); if (btn) { btn.click(); last.scrollIntoView({ block: "nearest", behavior: "smooth" }); } }
  }
  function revealSolution() {
    var cards = elMsgs.querySelectorAll(".pb"), last = cards[cards.length - 1];
    if (last) last.querySelector('[data-a="sol"]').click(); else say("Aún no hay ningún problema. Pulsa **Inventa un problema**.");
  }
  function searchSite(q) {
    if (window.MatesBuscador) { window.MatesBuscador.setQuery(q); say("Te he puesto en el buscador de la izquierda los problemas de las colecciones sobre **«" + q + "»**."); if (window.innerWidth < 1180) host.classList.remove("open"); }
  }

  /* ---------- IA ---------- */
  var SYSTEM = [
    "Eres «Profe Mates», un profesor virtual de matemáticas para alumnos de 1.º de Bachillerato (Catalunya, curso 2026/27). El temario incluye: trigonometría (radianes, teoremas del seno y del coseno, ecuaciones trigonométricas), funciones y límites, derivadas (reglas, recta tangente, extremos, optimización), vectores y producto escalar, números complejos (binómica, polar, Moivre), exponenciales y logaritmos. También puedes contestar preguntas de cualquier otra materia o tema, con claridad y sin enrollarte.",
    "IDIOMA: responde SIEMPRE en el idioma del último mensaje del alumno (si escribe en castellano, en castellano; si escribe en catalán, en catalán), aunque el temario esté en catalán. Sé cercano, preciso y didáctico. No inventes datos: si no estás seguro, dilo.",
    "FORMATO: Markdown. Fórmulas siempre en LaTeX: $...$ en línea y $$...$$ destacadas. Sin HTML.",
    "",
    "CUANDO PIDAN UN PROBLEMA (o «inventa un problema»), responde SIEMPRE con esta estructura:",
    "1. Un título corto en negrita.",
    "2. Enunciado con un contexto real y cifras realistas y coherentes (que el triángulo exista, que no haya ambigüedad, que los resultados salgan razonables). Apartados numerados 1), 2), 3) de dificultad creciente, a nivel de examen de 1.º de Bachillerato. Pon unidades.",
    "3. Una figura en un bloque " + BT + "figura siempre que haya geometría, gráfica, vectores o complejos (ver reglas abajo). La figura debe coincidir EXACTAMENTE con los datos del enunciado.",
    "4. «Datos» en una lista breve.",
    "5. NO resuelvas el problema. Ofrece ayuda en bloques desplegables con esta sintaxis exacta (cada marca en su propia línea):",
    ":::pista",
    "una o dos pistas graduales, sin dar el resultado",
    ":::",
    ":::solucion",
    "solución paso a paso con LaTeX, nombrando fórmulas o teoremas, con comprobación del resultado y la respuesta final de cada apartado",
    ":::",
    "Antes de escribir, resuelve mentalmente el problema y verifica que los números cuadran (usa la solución para escribir la solución, no al revés).",
    "",
    "CUANDO EXPLIQUES o corrijas: paso a paso, justificando cada paso, nombrando la fórmula, y comprobando el resultado. Si el alumno se equivoca, señala el error con amabilidad y explica por qué. Si el alumno responde a un problema, comprueba su resultado antes de decirle si está bien.",
    "",
    "FIGURAS: un bloque " + BT + "figura con JSON válido (sin comentarios ni comas finales). Tipos disponibles (todas las medidas en las unidades del problema; las figuras se dibujan a escala):",
    '- {"tipo":"triangulo","A":38,"B":56,"c":24,"lados":{"c":"24 m","a":"?","b":"?"},"angulos":{"A":"38°","B":"56°","C":"?"}} → triángulo ABC resuelto a partir de 3 datos cualesquiera entre lados a,b,c (a opuesto a A…) y ángulos A,B,C en grados. «lados» y «angulos» son solo las etiquetas (opcionales; texto corto). Opcional: "vertices":["A","B","C"], "unidad":"m", "rio":true (dibuja un río entre la orilla AB y C), "altura":"w = ?" (dibuja la altura desde C).',
    '- {"tipo":"elevacion","d":24,"alfa":38,"beta":56,"etD":"24 m","etH":"h = ?","etAlfa":"38°","etBeta":"56°"} → torre/edificio/árbol vista desde un punto A (omite "beta" y entonces "d" es la distancia de A a la base) o desde dos puntos alineados A y B (d = distancia AB, alfa en A, beta en B, beta>alfa). Etiquetas opcionales: "etBase","etCima","nombres":["A","B"].',
    '- {"tipo":"sector","theta":60,"etR":"r = 8 cm","etTheta":"60°","etS":"s = ?"} → sector circular.',
    '- {"tipo":"valla","etX":"x","etY":"y"} → terreno rectangular junto a un río (valla en 3 lados).',
    '- {"tipo":"plano","x":[-5,5],"y":[-4,6],"funciones":[{"f":"x^3-3*x","etiqueta":"f(x)","trazo":"discontinuo"}],"puntos":{"A":[1,2],"B":[4,3]},"segmentos":[{"de":"A","a":"B","flecha":true,"n":"u"}],"poligono":["A","B","C"],"circulos":[{"c":[0,0],"r":1}],"rectas":[{"x":2},{"y":1},{"m":1,"n":2}],"angulos":[{"en":"A","entre":["B","C"],"n":"θ"}],"textos":[{"p":[1,1],"t":"texto"}],"ejes":["x","y"]} → plano cartesiano con coordenadas reales; sirve para gráficas de funciones, vectores, números complejos (ejes ["Re","Im"]), circunferencia goniométrica y cualquier figura geométrica con coordenadas. Todos los campos salvo "x" e "y" son opcionales. Las funciones se escriben en x con ^, sin, cos, tan, ln, log, exp, sqrt, abs, pi (ejemplo: (2*x+1)/(x-3)). "rectas" con "x":c (vertical), "y":c (horizontal) o "m","n" (y=mx+n) dibuja asíntotas o rectas auxiliares discontinuas. Los puntos pueden llevar "pos":"n|s|e|o|ne|no|se|so". Elige "x" e "y" para que se vea toda la figura.',
    "REGLA CLAVE DE LAS FIGURAS: en las etiquetas («lados», «angulos», «etH», «etD»…) muestra SOLO los datos del enunciado y pon «?» en lo que se pide; la figura nunca debe revelar resultados. Si «lados» o «angulos» están presentes, solo se dibujan las etiquetas que escribas. Para que el triángulo se dibuje necesitas dar 3 datos (como números en A, B, C, a, b, c); los que sean incógnitas del problema ocúltalos con «?» en las etiquetas.",
    "No uses otros tipos. Etiquetas cortas. Si no hace falta figura, no la pongas."
  ].join("\n");

  function norm(hist) {
    var out = [];
    hist.forEach(function (m) {
      if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].text += "\n\n" + m.text; else out.push({ role: m.role, text: m.text });
    });
    if (out.length && out[0].role !== "user") out.unshift({ role: "user", text: "Hola" });
    return out.slice(-24);
  }
  function apiErr(status, body) {
    var m = ""; try { var j = JSON.parse(body); m = (j.error && (j.error.message || j.error)) || ""; } catch (e) { m = String(body).slice(0, 200); }
    if (typeof m !== "string") m = JSON.stringify(m);
    if (status === 400 && /api key|API_KEY/i.test(m)) return "La clave de API no es válida. Revísala en ⚙.";
    if (status === 401 || status === 403) return "El servicio ha rechazado la clave (" + status + "). Comprueba que está bien copiada y que tiene permiso: " + m.slice(0, 120);
    if (status === 404) return "No encuentro el modelo «" + model() + "». Cámbialo en ⚙ (por ejemplo gemini-flash-latest).";
    if (status === 402 || status === 502 || status === 503) return "La IA gratuita está saturada ahora mismo. Inténtalo en un minuto o conecta tu propia clave en ⚙.";
    if (status === 429) return "Se ha alcanzado el límite de peticiones de la IA gratuita. Espera un minuto y vuelve a intentarlo.";
    return "Error " + status + ": " + m.slice(0, 220);
  }
  async function streamChat(hist, onText, signal) {
    var sys = SYSTEM + "\n\nContexto de la interfaz: tema elegido por el alumno: " + (state.topic ? TOPICS[state.topic] : "ninguno (libre)") + "; nivel: " + G.niveles[state.level] + ".";
    var msgs = norm(hist), resp, P = prov();
    if (P === "free") {
      resp = await fetch("https://text.pollinations.ai/openai", {
        method: "POST", signal: signal, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: model(), stream: true, temperature: 0.6, messages: [{ role: "system", content: sys }].concat(msgs.map(function (m) { return { role: m.role === "user" ? "user" : "assistant", content: m.text }; })) })
      });
    } else if (P === "gemini") {
      resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model()) + ":streamGenerateContent?alt=sse", {
        method: "POST", signal: signal, headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: msgs.map(function (m) { return { role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] }; }), generationConfig: { temperature: 0.7 } })
      });
    } else {
      resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: signal, headers: { "content-type": "application/json", "x-api-key": cfg.key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: model(), max_tokens: 4096, stream: true, system: sys, messages: msgs.map(function (m) { return { role: m.role === "user" ? "user" : "assistant", content: m.text }; }) })
      });
    }
    if (!resp.ok) throw new Error(apiErr(resp.status, await resp.text()));
    var reader = resp.body.getReader(), dec = new TextDecoder(), buf = "", any = false;
    for (;;) {
      var r = await reader.read(); if (r.done) break;
      buf += dec.decode(r.value, { stream: true });
      var idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        var line = buf.slice(0, idx).replace(/\r$/, ""); buf = buf.slice(idx + 1);
        if (line.indexOf("data:") !== 0) continue;
        var d = line.slice(5).trim(); if (!d || d === "[DONE]") continue;
        var j; try { j = JSON.parse(d); } catch (e) { continue; }
        if (j.error) throw new Error(apiErr(500, JSON.stringify(j)));
        if (P === "free") {
          var dl = j.choices && j.choices[0] && j.choices[0].delta;
          if (dl && dl.content) { any = true; onText(dl.content); }
        } else if (P === "gemini") {
          if (j.promptFeedback && j.promptFeedback.blockReason) throw new Error("La IA no ha podido responder a eso (" + j.promptFeedback.blockReason + ").");
          var parts = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
          (parts || []).forEach(function (p) { if (p.text && !p.thought) { any = true; onText(p.text); } });
        } else if (j.type === "content_block_delta" && j.delta && j.delta.text) { any = true; onText(j.delta.text); }
      }
    }
    if (!any) throw new Error("La IA no ha devuelto texto. Inténtalo de nuevo o reformula la pregunta.");
  }
  function askLLM(text) {
    state.hist.push({ role: "user", text: text });
    var d = addBot('<span class="tt-dots" aria-label="Pensando"><i></i><i></i><i></i></span>'), b = d.querySelector(".tt-b"), acc = "", raf = 0, ctrl = new AbortController();
    state.ctrl = ctrl; busy(true);
    setTimeout(function () { if (!acc && state.busy && b.querySelector(".tt-dots")) b.insertAdjacentHTML("beforeend", '<p class="tt-stop">Pensando… la IA gratuita puede tardar hasta un minuto.</p>'); }, 7000);
    function paint(final) {
      raf = 0; var stick = nearBottom();
      b.innerHTML = md(acc); typeset(b);
      if (stick) toEnd();
      if (final) return;
    }
    streamChat(state.hist, function (t) { acc += t; if (!raf) raf = setTimeout(function () { paint(false); }, 140); }, ctrl.signal).then(function () {
      clearTimeout(raf); paint(true); state.hist.push({ role: "model", text: acc }); finish(d, acc);
    }).catch(function (e) {
      clearTimeout(raf);
      if (e.name === "AbortError") { if (acc) { paint(true); state.hist.push({ role: "model", text: acc }); b.insertAdjacentHTML("beforeend", '<p class="tt-stop">(respuesta detenida)</p>'); } else d.remove(); }
      else { b.innerHTML = '<p class="tt-err">' + esc(/Failed to fetch|NetworkError/i.test(e.message) ? "No he podido conectar con la IA. Comprueba tu conexión a internet." : e.message) + '</p><p><button type="button" class="btn small" data-c="cfg">Abrir ajustes</button></p>'; if (acc) state.hist.push({ role: "model", text: acc }); else state.hist.pop(); }
      busy(false);
    });
    function finish(d2, txt) {
      busy(false);
      d2.querySelector(".tt-b").insertAdjacentHTML("beforeend", '<div class="tt-via">Respondido con ' + ({ free: "la IA gratuita integrada", gemini: "Gemini", claude: "Claude" })[prov()] + " · " + esc(model()) + "</div>");
      if (/```figura|:::pista|:::solucion/.test(txt)) {
        d2.querySelector(".tt-b").insertAdjacentHTML("beforeend", '<div class="tt-sug"><button type="button" class="chip" data-c="llm-more">Otro parecido</button><button type="button" class="chip" data-c="llm-hard">Más difícil</button><button type="button" class="chip" data-c="llm-solve">Resuélvelo paso a paso</button></div>');
      }
    }
  }
  var LLM_PROMPTS = {
    ia: function () { return "Inventa un problema original de " + (state.topic ? TOPICS[state.topic] : "matemáticas de 1.º de Bachillerato (elige tú el tema)") + ", nivel " + G.niveles[state.level].toLowerCase() + ", con figura y datos detallados. Sin resolver." },
    "llm-more": function () { return "Dame otro problema parecido pero con otro contexto y otros datos, con su figura. Sin resolver."; },
    "llm-hard": function () { return "Dame uno más difícil sobre lo mismo, con su figura. Sin resolver."; },
    "llm-solve": function () { return "Resuelve ahora el último problema paso a paso, comprobando el resultado."; }
  };

  /* ---------- rutas ---------- */
  var PROB_RE = /(problema|ejercicio|inventa|gener|crea|prop[oó]n|plantea|dame otro|otro parecido|m[aá]s similares)/i;
  var HARD_RE = /(m[aá]s dif[ií]cil|dif[ií]cil|examen)/i, EASY_RE = /(m[aá]s f[aá]cil|b[aá]sico|sencillo)/i;
  function theory(t) {
    var k = state.topic;
    if (!k) { say("Elige un **tema** arriba (Trigonometría, Derivadas, Vectores…) y te muestro su resumen de teoría."); return; }
    say(TEORIA[k]);
  }
  function fallback(text) {
    var out = "Para responder preguntas libres necesito conectar una IA (es gratis con Gemini). Pulsa ⚙ arriba a la derecha y pega tu clave.\n\nMientras tanto puedo **inventarte problemas con dibujo**, darte **pistas**, **corregir tus respuestas** y mostrarte la **solución paso a paso**. Prueba con «inventa un problema de teorema del seno».";
    var d = addBot(md(out));
    var B = window.MatesBuscador;
    if (B) {
      var hits = B.search(text, "").list;
      if (!hits.length) { var words = text.split(/\s+/).filter(function (w) { return w.length > 4; }); for (var i = 0; i < words.length && !hits.length; i++) hits = B.search(words[i], "").list; }
      if (hits.length) {
        var h = '<p><b>En las colecciones del profe</b> he encontrado:</p><ul class="tt-hits">' + hits.slice(0, 3).map(function (r) {
          var c = B.cols[r.p.c];
          return "<li><b>" + esc(c.code) + " · " + (c.kind === "ex" ? "Cuestión " : "Problema ") + esc(r.p.n) + "</b> (pág. " + r.p.p + ') — ' + esc(r.p.t.replace(/\s+/g, " ").slice(0, 130)) + '… <a href="https://drive.google.com/file/d/' + c.id + '/view" target="_blank" rel="noopener">Abrir PDF</a></li>';
        }).join("") + '</ul><p><button type="button" class="btn small" data-c="site" data-q="' + esc(text) + '">Verlos en el buscador</button></p>';
        d.querySelector(".tt-b").insertAdjacentHTML("beforeend", h);
      }
    }
  }
  function route(text) {
    if (/^\s*(dame (una )?|otra )?pista/i.test(text) && state.cur) { revealHint(); return; }
    if (/^\s*(ver |dame |mu[eé]strame |quiero )?(la )?(soluci[oó]n|resoluci[oó]n)( paso a paso)?\s*[.!]?$/i.test(text) && state.cur) { revealSolution(); return; }
    if (/^\s*(resumen de )?(la )?teor[ií]a/i.test(text) && text.length < 40) { theory(); return; }
    if (aiOn()) { askLLM(text); return; }
    if (PROB_RE.test(text)) {
      var o = { texto: text };
      if (HARD_RE.test(text)) o.nivel = 3; else if (EASY_RE.test(text)) o.nivel = 1;
      var tm = [["trig", /(trigon|seno|coseno|tangente|[aá]ngulo|torre|radian|tri[aá]ngulo)/i], ["deriv", /(deriv|tangente|m[aá]ximo|m[ií]nimo|optimiz)/i], ["vect", /(vector|escalar)/i], ["comp", /(complej|polar|moivre)/i], ["func", /(l[ií]mite|as[ií]ntota|dominio|funci[oó]n)/i], ["exp", /(logar|exponen|crecimiento)/i]];
      if (!state.topic) tm.some(function (t) { if (t[1].test(text)) { o.tema = t[0]; return true; } });
      newProblem(o); return;
    }
    fallback(text);
  }
  function send(text) {
    text = (text || "").trim(); if (!text) return;
    if (state.busy) return;
    addUser(text); elIn.value = ""; autosize(); route(text);
  }

  /* ---------- eventos ---------- */
  function autosize() { elIn.style.height = "auto"; elIn.style.height = Math.min(elIn.scrollHeight, 130) + "px"; }
  elIn.addEventListener("input", autosize);
  elIn.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#tt-form").requestSubmit(); } });
  $("#tt-form").addEventListener("submit", function (e) {
    e.preventDefault();
    if (state.busy) { if (state.ctrl) state.ctrl.abort(); return; }
    send(elIn.value);
  });
  function action(c, el) {
    if (c === "cfg") { elCfgP.hidden = false; return; }
    if (c === "site") { searchSite(el.getAttribute("data-q")); return; }
    if (state.busy) return;
    if (c === "p") { addUser("Inventa un problema"); newProblem({}); }
    else if (c === "same") { addUser("Otro parecido"); if (state.cur) newProblem({ plantilla: state.cur.id }); else newProblem({}); }
    else if (c === "hint") { addUser("Dame una pista"); revealHint(); }
    else if (c === "teoria") { addUser("Resumen de teoría"); theory(); }
    else if (LLM_PROMPTS[c]) { var t = LLM_PROMPTS[c](); addUser(t); askLLM(t); }
  }
  host.addEventListener("click", function (e) { var b = e.target.closest("[data-c]"); if (b) action(b.getAttribute("data-c"), b); });
  $("#tt-cfg").addEventListener("click", function () { elCfgP.hidden = !elCfgP.hidden; });
  $("#tt-x").addEventListener("click", function () { host.classList.remove("open"); fab.hidden = false; });
  fab.addEventListener("click", function () { host.classList.add("open"); fab.hidden = true; setTimeout(function () { elIn.focus(); }, 50); });
  selT.addEventListener("change", function () { state.topic = selT.value; save(); });
  selL.addEventListener("change", function () { state.level = +selL.value; save(); });
  function fillModels() {
    var l = cfg.prov === "free" ? ["openai"] : cfg.prov === "gemini" ? ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-pro-latest"] : ["claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5"];
    $("#tt-models").innerHTML = l.map(function (m) { return '<option value="' + m + '">'; }).join("");
    inModel.placeholder = DEFAULT_MODEL[cfg.prov]; inKey.disabled = cfg.prov === "free"; inKey.placeholder = cfg.prov === "free" ? "No hace falta clave" : "Pega tu clave aquí";
  }
  fillModels();
  selP.addEventListener("change", function () { cfg.prov = selP.value; inModel.value = ""; fillModels(); });
  fillModels();
  $("#tt-save").addEventListener("click", function () {
    cfg.prov = selP.value; cfg.key = inKey.value.trim(); cfg.model = inModel.value.trim(); save(); setStatus(); chips(); elCfgP.hidden = true;
    if (cfg.prov !== "free" && !hasKey()) { say("He guardado los ajustes, pero falta la clave de API: mientras tanto uso la IA gratuita integrada."); return; }
    if (prov() === "free") { say("Listo: uso **la IA gratuita integrada**."); return; }
    var nm = ({ gemini: "Gemini", claude: "Claude" })[prov()], d = say("Probando tu clave de " + nm + "…"), got = "";
    streamChat([{ role: "user", text: "Responde solo con la palabra: OK" }], function (t) { got += t; }, null).then(function () {
      d.querySelector(".tt-b").innerHTML = md("✓ **" + nm + " funciona** con tu clave (modelo `" + model() + "`). A partir de ahora contesto con " + nm + "."); typeset(d);
    }).catch(function (e) {
      d.querySelector(".tt-b").innerHTML = '<p class="tt-err">' + esc("No he podido usar " + nm + ": " + e.message) + "</p><p>Mientras no se arregle, las preguntas fallarán: puedes volver a <b>IA gratuita integrada</b> en ⚙.</p>";
    });
  });
  $("#tt-rm").addEventListener("click", function () { cfg.key = ""; inKey.value = ""; save(); setStatus(); chips(); say("He borrado la clave de este navegador. Vuelvo a usar la IA gratuita integrada."); });
  $("#tt-new").addEventListener("click", function () {
    if (state.ctrl) state.ctrl.abort(); state.hist = []; state.cur = null; elMsgs.innerHTML = ""; busy(false); welcome();
  });

  function welcome() {
    var h = "<p><b>¡Hola!</b> Soy tu profe de mates de 1.º de Bachillerato. Puedo:</p><ul><li>inventarte <b>problemas con dibujo, datos y solución paso a paso</b> (nuevos cada vez);</li><li>darte <b>pistas</b> y <b>comprobar tus respuestas</b>;</li><li>" + "responder <b>cualquier duda</b> y crear problemas a medida con IA." + "</li></ul><p>Elige un <b>tema</b> y un <b>nivel</b> y pulsa <b>Inventa un problema</b>.</p>";
    addBot(h);
  }
  welcome();
  window.MatesTutor = { open: function () { fab.click(); } };
})();
