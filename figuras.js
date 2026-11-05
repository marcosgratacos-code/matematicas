/* Figuras: dibuja figuras de problemas de mates en SVG a partir de una descripción (JSON).
   Las usa tanto el generador de problemas integrado como las respuestas de la IA.
   Tipos: triangulo, elevacion, sector, valla, plano (gráficas, vectores, complejos, geometría con coordenadas). */
(function (global) {
  "use strict";
  var W = 440, uid = 0, PI = Math.PI, RAD = PI / 180;

  /* ---------- utilidades ---------- */
  function f2(n) { return String(Math.round(n * 100) / 100); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var GREEK = { alpha: "α", beta: "β", gamma: "γ", theta: "θ", phi: "φ", varphi: "φ", pi: "π", delta: "Δ", lambda: "λ", omega: "ω", sqrt: "√", cdot: "·", times: "×", circ: "°", degree: "°", rightarrow: "→", to: "→", vec: "", overrightarrow: "", pm: "±", leq: "≤", geq: "≥", infty: "∞" };
  function clean(t) {
    t = String(t == null ? "" : t);
    return t.replace(/\$/g, "").replace(/\^\{?\\circ\}?/g, "°")
      .replace(/\\[dt]?frac\{([^}]*)\}\{([^}]*)\}/g, "$1/$2")
      .replace(/\^2/g, "²").replace(/\^3/g, "³")
      .replace(/\\([a-zA-Z]+)/g, function (m, k) { return GREEK.hasOwnProperty(k) ? GREEK[k] : k; })
      .replace(/[{}]/g, "");
  }
  function num(v) { return typeof v === "number" && isFinite(v); }
  function fmtNum(x) { return String(+x.toFixed(6)).replace(".", ","); }

  /* ---------- evaluador de expresiones f(x) (sin eval) ---------- */
  var FN = { sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp };
  var NAMES = ["asin", "acos", "atan", "sqrt", "sin", "cos", "tan", "abs", "log", "exp", "ln", "pi", "e", "x"];
  function powr(a, b) {
    if (a < 0 && Math.abs(b - Math.round(b)) > 1e-9) {
      for (var q = 3; q <= 9; q += 2) {
        if (Math.abs(b * q - Math.round(b * q)) < 1e-9) return (Math.round(b * q) % 2 ? -1 : 1) * Math.pow(-a, b);
      }
      return NaN;
    }
    return Math.pow(a, b);
  }
  function compile(src) {
    var s = String(src).toLowerCase().replace(/\s+/g, "").replace(/−/g, "-").replace(/[·×]/g, "*").replace(/π/g, "pi")
      .replace(/√/g, "sqrt").replace(/\*\*/g, "^").replace(/²/g, "^2").replace(/³/g, "^3").replace(/,/g, ".").replace(/\bsen\b/g, "sin");
    var pos = 0;
    function peek() { return s.charAt(pos); }
    function parseExpr() {
      var f = parseTerm();
      while (peek() === "+" || peek() === "-") {
        var op = s.charAt(pos++), g = parseTerm();
        f = (function (a, b, o) { return o === "+" ? function (x) { return a(x) + b(x); } : function (x) { return a(x) - b(x); }; })(f, g, op);
      }
      return f;
    }
    function parseTerm() {
      var f = parseUnary();
      for (;;) {
        var c = peek(), g;
        if (c === "*" || c === "/") {
          pos++; g = parseUnary();
          f = (function (a, b, o) { return o === "*" ? function (x) { return a(x) * b(x); } : function (x) { return a(x) / b(x); }; })(f, g, c);
        } else if (c && /[a-z0-9.(]/.test(c)) {
          g = parsePower();
          f = (function (a, b) { return function (x) { return a(x) * b(x); }; })(f, g);
        } else break;
      }
      return f;
    }
    function parseUnary() {
      if (peek() === "-") { pos++; var f = parseUnary(); return function (x) { return -f(x); }; }
      if (peek() === "+") { pos++; return parseUnary(); }
      return parsePower();
    }
    function parsePower() {
      var b = parseAtom();
      if (peek() === "^") { pos++; var e = parseUnary(); return function (x) { return powr(b(x), e(x)); }; }
      return b;
    }
    function parseAtom() {
      var c = peek(), m;
      if (c === "(") { pos++; var f = parseExpr(); if (peek() !== ")") throw new Error("falta )"); pos++; return f; }
      if ((m = /^[0-9]*\.?[0-9]+/.exec(s.slice(pos)))) { pos += m[0].length; var v = parseFloat(m[0]); return function () { return v; }; }
      for (var i = 0; i < NAMES.length; i++) {
        var nm = NAMES[i];
        if (s.substr(pos, nm.length) === nm) {
          pos += nm.length;
          if (nm === "x") return function (x) { return x; };
          if (nm === "pi") return function () { return PI; };
          if (nm === "e") return function () { return Math.E; };
          var arg = peek() === "(" ? parseAtom() : parsePower(), fn = FN[nm];
          return function (x) { return fn(arg(x)); };
        }
      }
      throw new Error("expresión no válida");
    }
    var out = parseExpr();
    if (pos < s.length) throw new Error("sobra texto");
    return out;
  }
  function calc(str) {
    try { return compile(String(str).replace(/°/g, "*pi/180"))(0); } catch (e) { return NaN; }
  }

  /* ---------- SVG: primitivas ---------- */
  function wrap(w, h, body, alt) {
    return '<svg class="fig" viewBox="0 0 ' + f2(w) + " " + f2(h) + '" role="img" aria-label="' + esc(alt || "Figura del problema") + '" xmlns="http://www.w3.org/2000/svg">' + body + "</svg>";
  }
  function line(x1, y1, x2, y2, cls) { return '<line class="ln ' + (cls || "") + '" x1="' + f2(x1) + '" y1="' + f2(y1) + '" x2="' + f2(x2) + '" y2="' + f2(y2) + '"/>'; }
  function dot(x, y, cls, r) { return '<circle class="pt ' + (cls || "") + '" cx="' + f2(x) + '" cy="' + f2(y) + '" r="' + (r || 4.2) + '"/>'; }
  function txt(x, y, s, cls, anchor) {
    if (s === "" || s == null) return "";
    return '<text class="t ' + (cls || "") + '" x="' + f2(x) + '" y="' + f2(y) + '" text-anchor="' + (anchor || "middle") + '" dominant-baseline="central">' + esc(clean(s)) + "</text>";
  }
  function head(x1, y1, x2, y2, cls) {
    var a = Math.atan2(y2 - y1, x2 - x1), L = 10, w = 4.2;
    var bx = x2 - L * Math.cos(a), by = y2 - L * Math.sin(a);
    var p = [x2, y2, bx - w * Math.sin(a), by + w * Math.cos(a), bx + w * Math.sin(a), by - w * Math.cos(a)].map(f2);
    return '<polygon class="hd ' + (cls || "") + '" points="' + p[0] + "," + p[1] + " " + p[2] + "," + p[3] + " " + p[4] + "," + p[5] + '"/>';
  }
  function normA(d) { while (d > PI) d -= 2 * PI; while (d <= -PI) d += 2 * PI; return d; }
  /* marca de ángulo entre dos direcciones (ángulos de pantalla, radianes). Devuelve el arco y la etiqueta. */
  function angleMark(cx, cy, a0, a1, r, text, rhoMax, sweep) {
    var d = sweep != null ? sweep : normA(a1 - a0), out = "";
    var right = Math.abs(Math.abs(d) - PI / 2) < 0.03 && (!text || /^90/.test(clean(text)));
    if (right) {
      var s = Math.min(r, 14) * 0.8, u = [Math.cos(a0) * s, Math.sin(a0) * s], v = [Math.cos(a1) * s, Math.sin(a1) * s];
      return '<path class="angl" d="M ' + f2(cx + u[0]) + " " + f2(cy + u[1]) + " l " + f2(v[0]) + " " + f2(v[1]) + " l " + f2(-u[0]) + " " + f2(-u[1]) + '"/>';
    }
    var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a0 + d), y1 = cy + r * Math.sin(a0 + d);
    out += '<path class="angl" d="M ' + f2(x0) + " " + f2(y0) + " A " + f2(r) + " " + f2(r) + " 0 " + (Math.abs(d) > PI ? 1 : 0) + " " + (d > 0 ? 1 : 0) + " " + f2(x1) + " " + f2(y1) + '"/>';
    if (text) {
      var bis = a0 + d / 2, half = Math.max(Math.abs(d) / 2, 0.12);
      var need = (6 + 5.2 * clean(text).length) / Math.sin(Math.min(half, PI / 2)) * 0.62;
      var rho = Math.max(r + 10, Math.min(need, rhoMax || 90));
      out += txt(cx + rho * Math.cos(bis), cy + rho * Math.sin(bis), text, "ang");
    }
    return out;
  }
  function view(xmin, xmax, ymin, ymax, o) {
    o = o || {};
    var pl = o.padL == null ? 24 : o.padL, pr = o.padR == null ? 24 : o.padR, pt = o.padT == null ? 24 : o.padT, pb = o.padB == null ? 24 : o.padB;
    var dx = Math.max(xmax - xmin, 1e-6), dy = Math.max(ymax - ymin, 1e-6);
    var availW = W - pl - pr, availH = (o.maxH || 300) - pt - pb;
    var s = Math.min(availW / dx, availH / dy), w = dx * s, h = dy * s, ox = pl + (availW - w) / 2;
    return { s: s, H: h + pt + pb, X: function (x) { return ox + (x - xmin) * s; }, Y: function (y) { return pt + (ymax - y) * s; } };
  }
  function unit(dx, dy) { var l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }

  /* ---------- triángulo (se resuelve a partir de 3 datos y se dibuja a escala) ---------- */
  function solveTri(g) {
    var S = [g.a, g.b, g.c], A = [g.A, g.B, g.C], i;
    var nA = A.filter(num).length, nS = S.filter(num).length;
    if (nA + nS < 3 || nS === 0) throw new Error("triángulo: faltan datos");
    if (nA >= 2) {
      if (nA === 2) { var k0 = A.findIndex(function (v) { return !num(v); }); A[k0] = 180 - A.filter(num).reduce(function (s, v) { return s + v; }, 0); }
      var ks = S.findIndex(num), k = S[ks] / Math.sin(A[ks] * RAD);
      for (i = 0; i < 3; i++) S[i] = k * Math.sin(A[i] * RAD);
    } else if (nS === 3 || (nS === 2 && A.findIndex(num) === S.findIndex(function (v) { return !num(v); }))) {
      var im = S.findIndex(function (v) { return !num(v); });
      if (im >= 0) { /* dos lados y el ángulo comprendido */
        var p = (im + 1) % 3, q = (im + 2) % 3;
        S[im] = Math.sqrt(S[p] * S[p] + S[q] * S[q] - 2 * S[p] * S[q] * Math.cos(A[im] * RAD));
      }
      for (i = 0; i < 3; i++) {
        var j = (i + 1) % 3, l = (i + 2) % 3;
        A[i] = Math.acos((S[j] * S[j] + S[l] * S[l] - S[i] * S[i]) / (2 * S[j] * S[l])) / RAD;
      }
    } else {
      var ia = A.findIndex(num);
      {
        var oi = ia, other = S.findIndex(function (v, ix) { return num(v) && ix !== oi; });
        if (!num(S[oi])) throw new Error("triángulo: datos no válidos");
        A[other] = Math.asin(Math.min(1, S[other] * Math.sin(A[oi] * RAD) / S[oi])) / RAD;
        var third = 3 - oi - other;
        A[third] = 180 - A[oi] - A[other];
        S[third] = S[oi] * Math.sin(A[third] * RAD) / Math.sin(A[oi] * RAD);
      }
    }
    if (!S.every(function (v) { return num(v) && v > 0; }) || !A.every(function (v) { return num(v) && v > 0; })) throw new Error("triángulo imposible");
    return { a: S[0], b: S[1], c: S[2], A: A[0], B: A[1], C: A[2] };
  }

  /* si faltan datos numéricos, los saco de las etiquetas («10 m», «45°») */
  function fromLabels(sp) {
    var g = {}, k, m;
    ["a", "b", "c", "A", "B", "C"].forEach(function (x) { if (num(sp[x])) g[x] = sp[x]; });
    [["lados", ["a", "b", "c"]], ["angulos", ["A", "B", "C"]]].forEach(function (pr) {
      var lab = sp[pr[0]] || {};
      pr[1].forEach(function (x) { if (!num(g[x]) && lab[x] != null && (m = /^\s*(?:[A-Za-z]\s*=\s*)?(-?\d+(?:[.,]\d+)?)/.exec(String(lab[x])))) g[x] = parseFloat(m[1].replace(",", ".")); });
    });
    return g;
  }
  function triangulo(sp) {
    var g, un = sp.unidad || "";
    try { g = solveTri(sp); } catch (e) { g = solveTri(fromLabels(sp)); }
    var P = { A: [0, 0], B: [g.c, 0], C: [g.b * Math.cos(g.A * RAD), g.b * Math.sin(g.A * RAD)] };
    var names = sp.vertices || ["A", "B", "C"];
    var xmin = Math.min(0, P.C[0]), xmax = Math.max(g.c, P.C[0]);
    var v = view(xmin, xmax, 0, P.C[1], { padL: 46, padR: 46, padT: 38, padB: 38, maxH: 340 });
    var S = {}; ["A", "B", "C"].forEach(function (k) { S[k] = [v.X(P[k][0]), v.Y(P[k][1])]; });
    var cen = [(S.A[0] + S.B[0] + S.C[0]) / 3, (S.A[1] + S.B[1] + S.C[1]) / 3], out = "";
    var lab = sp.lados || {}, angs = sp.angulos || {};
    if (sp.rio) {
      out += '<rect class="water" x="0" y="' + f2(S.C[1]) + '" width="' + W + '" height="' + f2(S.A[1] - S.C[1]) + '"/>';
      out += line(8, S.A[1], W - 8, S.A[1], "bank") + line(8, S.C[1], W - 8, S.C[1], "bank");
      out += txt(W - 14, (S.A[1] + S.C[1]) / 2 + (S.C[0] > W / 2 ? 0 : 0), "río", "sm", "end");
    }
    out += '<polygon class="poly" points="' + [S.A, S.B, S.C].map(function (p) { return f2(p[0]) + "," + f2(p[1]); }).join(" ") + '"/>';
    if (sp.altura) {
      out += line(S.C[0], S.C[1], S.C[0], S.A[1], "dash thin");
      var sq = 9, dirx = S.C[0] >= (S.A[0] + S.B[0]) / 2 ? -1 : 1;
      out += '<path class="angl" d="M ' + f2(S.C[0]) + " " + f2(S.A[1] - sq) + " h " + (dirx * sq) + " v " + sq + '"/>';
      out += txt(S.C[0] - dirx * 8, (S.A[1] + S.C[1]) / 2, sp.altura === true ? "h" : sp.altura, "acc", dirx < 0 ? "end" : "start");
    }
    /* ángulos */
    var order = ["A", "B", "C"];
    order.forEach(function (k, i) {
      var t = angs[k] != null ? angs[k] : (num(sp[k]) && !sp.angulos ? Math.round(sp[k] * 10) / 10 + "°" : "");
      if (t === "" || t === false) return;
      var p = S[k], n1 = S[order[(i + 1) % 3]], n2 = S[order[(i + 2) % 3]];
      var l1 = Math.hypot(n1[0] - p[0], n1[1] - p[1]), l2 = Math.hypot(n2[0] - p[0], n2[1] - p[1]), m = Math.min(l1, l2);
      out += angleMark(p[0], p[1], Math.atan2(n1[1] - p[1], n1[0] - p[0]), Math.atan2(n2[1] - p[1], n2[0] - p[0]), Math.min(28, m * 0.3), String(t), m * 0.62);
    });
    /* lados */
    var sides = { a: ["B", "C"], b: ["C", "A"], c: ["A", "B"] };
    Object.keys(sides).forEach(function (k) {
      var t = lab[k] != null ? lab[k] : (num(sp[k]) && !sp.lados ? fmtNum(sp[k]) + (un ? " " + un : "") : "");
      if (t === "" || t === false) return;
      var p = S[sides[k][0]], q = S[sides[k][1]], mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      var nrm = unit(-(q[1] - p[1]), q[0] - p[0]);
      if ((mid[0] + nrm[0] - cen[0]) * nrm[0] + (mid[1] + nrm[1] - cen[1]) * nrm[1] < 0) nrm = [-nrm[0], -nrm[1]];
      var tl = clean(String(t === true ? k : t)).length, off = 8 + 7 * Math.abs(nrm[1]) + 3.7 * tl * Math.abs(nrm[0]);
      out += txt(mid[0] + nrm[0] * off, mid[1] + nrm[1] * off, String(t === true ? k : t), "");
    });
    out += line(S.A[0], S.A[1], S.B[0], S.B[1], "ac") + line(S.B[0], S.B[1], S.C[0], S.C[1], "ac") + line(S.C[0], S.C[1], S.A[0], S.A[1], "ac");
    order.forEach(function (k, i) {
      var d = unit(S[k][0] - cen[0], S[k][1] - cen[1]), nm = String(names[i]);
      out += dot(S[k][0], S[k][1]) + txt(S[k][0] + d[0] * 17, S[k][1] + d[1] * 17, nm, "v");
    });
    return wrap(W, v.H, out, sp.alt || "Triángulo " + names.join(""));
  }

  /* ---------- ángulo de elevación (torre, edificio, árbol…) ---------- */
  function elevacion(sp) {
    var ta = Math.tan(sp.alfa * RAD), x = 0, h, xA;
    if (num(sp.beta)) { var tb = Math.tan(sp.beta * RAD); x = sp.d * ta / (tb - ta); h = x * tb; xA = -(x + sp.d); }
    else { h = sp.d * ta; xA = -sp.d; }
    if (!(h > 0) || !isFinite(h)) throw new Error("elevación: datos incoherentes");
    var v = view(xA, 0, 0, h, { padL: 34, padR: 62, padT: 34, padB: 66, maxH: 330 });
    var XA = v.X(xA), XB = v.X(-x), X0 = v.X(0), Y0 = v.Y(0), YT = v.Y(h), un = sp.unidad || "m";
    var two = num(sp.beta), nm = sp.nombres || ["A", "B"], out = "";
    out += '<rect class="soil" x="14" y="' + f2(Y0) + '" width="' + (W - 28) + '" height="9"/>' + line(14, Y0, W - 14, Y0, "");
    out += '<rect class="tower" x="' + f2(X0 - 6) + '" y="' + f2(YT) + '" width="12" height="' + f2(Y0 - YT) + '"/>';
    out += '<path class="angl" d="M ' + f2(X0 - 6) + " " + f2(Y0 - 9) + " h -9 v 9\"/>";
    out += line(XA, Y0, X0, YT, "ac") + (two ? line(XB, Y0, X0, YT, "ac") : "");
    var angA = Math.atan2(YT - Y0, X0 - XA), rA = Math.min(34, (two ? XB - XA : X0 - XA) * 0.38);
    out += angleMark(XA, Y0, 0, angA, rA, sp.etAlfa != null ? sp.etAlfa : sp.alfa + "°", ((two ? XB - XA : X0 - XA)) * 0.6);
    if (two) {
      var angB = Math.atan2(YT - Y0, X0 - XB);
      out += angleMark(XB, Y0, 0, angB, Math.min(30, (X0 - XB) * 0.4), sp.etBeta != null ? sp.etBeta : sp.beta + "°", (X0 - XB) * 0.6);
    }
    /* cota de distancia */
    var xe = two ? XB : X0, dy = Y0 + 38;
    out += line(XA, Y0 + 28, XA, dy + 6, "thin muted") + line(xe, Y0 + 28, xe, dy + 6, "thin muted");
    out += line(XA, dy, xe, dy, "thin muted") + head(XA + 10, dy, XA, dy, "m") + head(xe - 10, dy, xe, dy, "m");
    out += txt((XA + xe) / 2, dy + 14, sp.etD != null ? sp.etD : sp.d + " " + un, "");
    out += dot(XA, Y0) + txt(XA, Y0 + 19, nm[0], "v");
    if (two) out += dot(XB, Y0) + txt(XB, Y0 + 19, nm[1], "v");
    out += txt(X0, Y0 + 19, sp.etBase != null ? sp.etBase : "Base", "sm");
    out += dot(X0, YT, "alt") + txt(X0 + 11, YT - 11, sp.etCima != null ? sp.etCima : "Cima", "sm", "start");
    out += txt(X0 + 13, (Y0 + YT) / 2, sp.etH != null ? sp.etH : "h", "acc", "start");
    return wrap(W, v.H, out, sp.alt || "Observación de una torre con ángulo de elevación");
  }

  /* ---------- sector circular ---------- */
  function sector(sp) {
    var th = sp.theta * RAD, N = 60, pts = [[0, 0], [1, 0]], i;
    for (i = 1; i <= N; i++) pts.push([Math.cos(th * i / N), Math.sin(th * i / N)]);
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var v = view(Math.min.apply(0, xs), Math.max.apply(0, xs), Math.min.apply(0, ys), Math.max.apply(0, ys), { padL: 44, padR: 50, padT: 34, padB: 34, maxH: 330 });
    var R = v.s, cx = v.X(0), cy = v.Y(0), ex = v.X(1), ey = v.Y(0), tx = v.X(Math.cos(th)), ty = v.Y(Math.sin(th)), out = "";
    var large = sp.theta > 180 ? 1 : 0;
    out += '<path class="poly" d="M ' + f2(cx) + " " + f2(cy) + " L " + f2(ex) + " " + f2(ey) + " A " + f2(R) + " " + f2(R) + " 0 " + large + " 0 " + f2(tx) + " " + f2(ty) + ' Z"/>';
    out += '<path class="ln ac thick" fill="none" d="M ' + f2(ex) + " " + f2(ey) + " A " + f2(R) + " " + f2(R) + " 0 " + large + " 0 " + f2(tx) + " " + f2(ty) + '"/>';
    var ra = Math.min(26, R * 0.3), bis = -th / 2;
    out += '<path class="angl" d="M ' + f2(cx + ra) + " " + f2(cy) + " A " + f2(ra) + " " + f2(ra) + " 0 " + large + " 0 " + f2(cx + ra * Math.cos(-th)) + " " + f2(cy + ra * Math.sin(-th)) + '"/>';
    var rl = th < 1.1 ? Math.min(R * 0.62, ra + 38) : ra + 16;
    out += txt(cx + rl * Math.cos(bis), cy + rl * Math.sin(bis), sp.etTheta != null ? sp.etTheta : sp.theta + "°", "ang");
    out += txt((cx + ex) / 2, cy + 15, sp.etR != null ? sp.etR : "r", "");
    var mx = cx + (R + 20) * Math.cos(bis), my = cy + (R + 14) * Math.sin(bis);
    out += txt(mx, my, sp.etS != null ? sp.etS : "s", "acc");
    out += dot(cx, cy) + txt(cx - 13, cy + 11, sp.etO != null ? sp.etO : "O", "v");
    return wrap(W, v.H, out, sp.alt || "Sector circular");
  }

  /* ---------- terreno junto a un río ---------- */
  function valla(sp) {
    var w = 250, h = 130, x0 = (W - w) / 2, y0 = 74, out = "", i;
    var wave = "M 10 " + 40;
    for (i = 0; i <= 20; i++) wave += " L " + f2(10 + i * 21) + " " + f2(40 + Math.sin(i * 0.9) * 5);
    out += '<path class="water" d="' + wave + ' L ' + (W - 10) + " " + (y0) + " L 10 " + y0 + ' Z"/>';
    out += txt(W - 40, 56, sp.etRio != null ? sp.etRio : "río", "sm");
    out += line(10, y0, W - 10, y0, "bank");
    out += '<rect class="poly" x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + h + '" stroke="none"/>';
    out += '<path class="ln ac thick" d="M ' + x0 + " " + y0 + " V " + (y0 + h) + " H " + (x0 + w) + " V " + y0 + '" fill="none"/>';
    for (i = 0; i <= 6; i++) out += dot(x0 + i * w / 6, y0 + h, "post", 2.6);
    [0, 1].forEach(function (k) { for (var j = 1; j < 4; j++) out += dot(x0 + k * w, y0 + j * h / 4, "post", 2.6); });
    out += txt(x0 - 16, y0 + h / 2, sp.etX != null ? sp.etX : "x", "acc", "end");
    out += txt(x0 + w + 16, y0 + h / 2, sp.etX != null ? sp.etX : "x", "acc", "start");
    out += txt(x0 + w / 2, y0 + h + 18, sp.etY != null ? sp.etY : "y", "acc");
    out += txt(x0 + w / 2, y0 + 16, "sin valla", "sm");
    return wrap(W, y0 + h + 36, out, sp.alt || "Terreno rectangular junto a un río");
  }

  /* ---------- plano cartesiano genérico ---------- */
  function niceStep(range, target) {
    var raw = range / target, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
  }
  var DIRS = { n: [0, -1], s: [0, 1], e: [1, 0], o: [-1, 0], w: [-1, 0], ne: [0.71, -0.71], no: [-0.71, -0.71], nw: [-0.71, -0.71], se: [0.71, 0.71], so: [-0.71, 0.71], sw: [-0.71, 0.71] };
  var FCLS = ["f0", "f1", "f2", "f3"];

  function plano(sp) {
    var xr = sp.x || [-5, 5], yr = sp.y || [-5, 5], xmin = xr[0], xmax = xr[1], ymin = yr[0], ymax = yr[1];
    var funcs = (sp.funciones || []).map(function (f) { return typeof f === "string" ? { f: f } : f; });
    var equal = sp.proporcion === "igual" || (!funcs.length && sp.proporcion !== "libre");
    var pl = 38, pr = 22, pt = 16, pb = 28, availW = W - pl - pr, dx = xmax - xmin, dy = ymax - ymin, sx, sy, ox = pl, plotH;
    if (!(dx > 0) || !(dy > 0)) throw new Error("rangos x/y no válidos");
    if (equal) {
      var s0 = Math.min(availW / dx, 310 / dy); sx = sy = s0; ox = pl + (availW - dx * s0) / 2; plotH = dy * s0;
    } else { sx = availW / dx; plotH = Math.min(310, Math.max(190, availW * 0.62)); sy = plotH / dy; }
    var plotW = dx * sx, H = plotH + pt + pb;
    function X(x) { return ox + (x - xmin) * sx; }
    function Y(y) { return pt + (ymax - y) * sy; }
    var id = "cp" + (++uid), out = "", i;
    var named = {}, pts = [];
    if (Array.isArray(sp.puntos)) sp.puntos.forEach(function (p) { pts.push(p); if (p.n) named[p.n] = p.p; });
    else if (sp.puntos) Object.keys(sp.puntos).forEach(function (k) { var v = sp.puntos[k], o = Array.isArray(v) ? { p: v, n: k } : { p: v.p, n: v.n != null ? v.n : k, pos: v.pos, dir: v.dir, cls: v.cls }; pts.push(o); named[k] = o.p; });
    function R(v) {
      if (Array.isArray(v)) return v;
      if (named.hasOwnProperty(v)) return named[v];
      throw new Error("punto desconocido: " + v);
    }
    var cenx = 0, ceny = 0;
    pts.forEach(function (p) { cenx += p.p[0]; ceny += p.p[1]; });
    if (pts.length) { cenx /= pts.length; ceny /= pts.length; }

    /* colocación de etiquetas sin solapes (con otras etiquetas, ejes, líneas y puntos) */
    var boxes = [], samples = [];
    function addBox(cx, cy, w, h) { boxes.push({ x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 }); }
    function sampleLine(x1, y1, x2, y2) { var n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 5)); for (var k = 0; k <= n; k++) samples.push([x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n]); }
    var showAxes = sp.ejes !== false, axNames = Array.isArray(sp.ejes) ? sp.ejes : ["x", "y"];
    var axY = (ymin <= 0 && ymax >= 0) ? Y(0) : Y(ymin), axX = (xmin <= 0 && xmax >= 0) ? X(0) : X(xmin);
    function hit(b) {
      var k, o, s;
      if (b.x0 < 3 || b.x1 > W - 3 || b.y0 < 3 || b.y1 > H - 3) return true;
      for (k = 0; k < boxes.length; k++) { o = boxes[k]; if (b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0) return true; }
      for (k = 0; k < samples.length; k++) { s = samples[k]; if (s[0] > b.x0 - 1 && s[0] < b.x1 + 1 && s[1] > b.y0 - 1 && s[1] < b.y1 + 1) return true; }
      if (showAxes) {
        if (b.y0 < axY + 3 && b.y1 > axY - 3 && b.x1 > ox && b.x0 < ox + plotW) return true;
        if (b.x0 < axX + 3 && b.x1 > axX - 3 && b.y1 > pt && b.y0 < pt + plotH) return true;
      }
      return false;
    }
    var ORDER = [[0, -1], [0, 1], [1, 0], [-1, 0], [0.71, -0.71], [0.71, 0.71], [-0.71, -0.71], [-0.71, 0.71]];
    function place(px, py, text, pref, gap) {
      var w = 7.2 * clean(text).length + 6, h = 15, cands = [pref].concat(ORDER), first = null, k, d, cx, cy, b;
      gap = gap || 8;
      for (k = 0; k < cands.length; k++) {
        d = cands[k]; cx = px + d[0] * (gap + (w / 2) * Math.abs(d[0])); cy = py + d[1] * (gap + (h / 2) * Math.abs(d[1]));
        b = { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 };
        if (!first) first = [cx, cy, b];
        if (!hit(b)) { boxes.push(b); return [cx, cy]; }
      }
      boxes.push(first[2]); return [first[0], first[1]];
    }

    var stx = sp.pasoX || niceStep(dx, 8), sty = sp.pasoY || (equal ? stx : niceStep(dy, 7));
    out += '<defs><clipPath id="' + id + '"><rect x="' + f2(ox) + '" y="' + pt + '" width="' + f2(plotW) + '" height="' + f2(plotH) + '"/></clipPath></defs>';
    if (sp.rejilla !== false) {
      for (i = Math.ceil(xmin / stx - 1e-9); i * stx <= xmax + 1e-9; i++) out += '<line class="gridl" x1="' + f2(X(i * stx)) + '" y1="' + pt + '" x2="' + f2(X(i * stx)) + '" y2="' + f2(pt + plotH) + '"/>';
      for (i = Math.ceil(ymin / sty - 1e-9); i * sty <= ymax + 1e-9; i++) out += '<line class="gridl" x1="' + f2(ox) + '" y1="' + f2(Y(i * sty)) + '" x2="' + f2(ox + plotW) + '" y2="' + f2(Y(i * sty)) + '"/>';
    }
    out += '<rect class="frame" x="' + f2(ox) + '" y="' + pt + '" width="' + f2(plotW) + '" height="' + f2(plotH) + '"/>';
    if (showAxes) {
      out += line(ox, axY, ox + plotW, axY, "axis") + head(ox + plotW - 8, axY, ox + plotW, axY, "ax") + line(axX, pt + plotH, axX, pt, "axis") + head(axX, pt + 8, axX, pt, "ax");
      var lx, ly, tl;
      for (i = Math.ceil(xmin / stx - 1e-9); i * stx <= xmax + 1e-9; i++) {
        if (Math.abs(i) < 1e-9) continue;
        tl = fmtNum(i * stx); lx = X(i * stx); ly = Math.min(axY + 13, pt + plotH + 13);
        out += line(lx, axY - 3, lx, axY + 3, "axis") + txt(lx, ly, tl, "sm"); addBox(lx, ly, 7 * tl.length + 4, 13);
      }
      for (i = Math.ceil(ymin / sty - 1e-9); i * sty <= ymax + 1e-9; i++) {
        if (Math.abs(i) < 1e-9) continue;
        tl = fmtNum(i * sty); lx = Math.max(axX - 7, ox - 4); ly = Y(i * sty);
        out += line(axX - 3, ly, axX + 3, ly, "axis") + txt(lx, ly, tl, "sm", "end"); addBox(lx - 3.5 * tl.length, ly, 7 * tl.length + 4, 13);
      }
      out += txt(ox + plotW - 8, axY - 11, axNames[0], "sm", "end") + txt(axX + 9, pt + 8, axNames[1], "sm", "start");
      addBox(ox + plotW - 8 - 4 * axNames[0].length, axY - 11, 8 * axNames[0].length + 4, 13); addBox(axX + 9 + 4 * axNames[1].length, pt + 8, 8 * axNames[1].length + 4, 13);
      if (xmin <= 0 && xmax >= 0 && ymin <= 0 && ymax >= 0) { out += txt(axX - 8, axY + 11, "O", "sm", "end"); addBox(axX - 12, axY + 11, 12, 13); }
    }
    /* contenido recortado al marco */
    var clip = "";
    (sp.rectas || []).forEach(function (r) {
      if (r.x != null) { clip += line(X(r.x), pt, X(r.x), pt + plotH, "dash asym"); sampleLine(X(r.x), pt, X(r.x), pt + plotH); }
      else if (r.y != null) { clip += line(ox, Y(r.y), ox + plotW, Y(r.y), "dash asym"); sampleLine(ox, Y(r.y), ox + plotW, Y(r.y)); }
      else if (r.m != null) { clip += line(X(xmin), Y(r.m * xmin + (r.n || 0)), X(xmax), Y(r.m * xmax + (r.n || 0)), "dash asym"); sampleLine(X(xmin), Y(r.m * xmin + (r.n || 0)), X(xmax), Y(r.m * xmax + (r.n || 0))); }
    });
    if (sp.poligono) {
      var poly = sp.poligono.map(R);
      clip += '<polygon class="poly" points="' + poly.map(function (p) { return f2(X(p[0])) + "," + f2(Y(p[1])); }).join(" ") + '"/>';
      poly.forEach(function (p, k) { var q = poly[(k + 1) % poly.length]; sampleLine(X(p[0]), Y(p[1]), X(q[0]), Y(q[1])); });
    }
    (sp.circulos || []).forEach(function (c) {
      clip += '<ellipse class="ln ac" fill="none" cx="' + f2(X(c.c[0])) + '" cy="' + f2(Y(c.c[1])) + '" rx="' + f2(c.r * sx) + '" ry="' + f2(c.r * sy) + '"/>';
      for (var a = 0; a < 72; a++) samples.push([X(c.c[0]) + c.r * sx * Math.cos(a * PI / 36), Y(c.c[1]) + c.r * sy * Math.sin(a * PI / 36)]);
    });
    var flabels = [];
    funcs.forEach(function (fo, k) {
      var fn = compile(fo.f), d = "", pen = false, prev = NaN, N = 600, lastIn = -1, lim = (ymax - ymin) * 3 + 1;
      var a = num(fo.desde) ? fo.desde : xmin, b = num(fo.hasta) ? fo.hasta : xmax;
      for (i = 0; i <= N; i++) {
        var xx = a + (b - a) * i / N, yy = fn(xx);
        if (!isFinite(yy) || Math.abs(yy) > 1e7 || (pen && Math.abs(yy - prev) > (ymax - ymin) * 2.2 && (Math.abs(yy) > lim || Math.abs(prev) > lim))) { pen = false; prev = NaN; if (!isFinite(yy)) continue; }
        d += (pen ? " L " : " M ") + f2(X(xx)) + " " + f2(Y(yy)); pen = true; prev = yy;
        if (i % 6 === 0 && yy >= ymin && yy <= ymax) samples.push([X(xx), Y(yy)]);
        if (yy > ymin + dy * 0.04 && yy < ymax - dy * 0.04 && xx > xmin + dx * 0.04) lastIn = i;
      }
      var disc = fo.trazo === "discontinuo" || fo.trazo === "dash";
      clip += '<path class="ln fn ' + FCLS[k % 4] + (disc ? " dash" : "") + '" fill="none" d="' + d + '"/>';
      if (fo.etiqueta && lastIn >= 0) flabels.push({ x: a + (b - a) * lastIn / N, fn: fn, t: fo.etiqueta, cls: FCLS[k % 4] });
    });
    out += '<g clip-path="url(#' + id + ')">' + clip + "</g>";
    /* segmentos y vectores */
    var segLabels = [];
    (sp.segmentos || []).forEach(function (s) {
      if (Array.isArray(s) && s.length >= 2 && typeof s[0] === "string") s = { de: s[0], a: s[1], n: s[2] };
      var p = R(s.de), q = R(s.a), x1 = X(p[0]), y1 = Y(p[1]), x2 = X(q[0]), y2 = Y(q[1]);
      var cls = (s.trazo === "discontinuo" || s.trazo === "dash" ? "dash " : "") + (s.color === "marca" ? "mk" : s.color === "angulo" ? "ang2" : "ac");
      out += line(x1, y1, x2, y2, cls) + (s.flecha ? head(x1, y1, x2, y2, cls) : "");
      sampleLine(x1, y1, x2, y2);
      if (s.n) segLabels.push({ x1: x1, y1: y1, x2: x2, y2: y2, t: s.n });
    });
    /* ángulos */
    (sp.angulos || []).forEach(function (an) {
      var c = R(an.en), a0, a1, sweep = null;
      if (an.entre) { var p1 = R(an.entre[0]), p2 = R(an.entre[1]); a0 = Math.atan2(-(p1[1] - c[1]), (p1[0] - c[0])); a1 = Math.atan2(-(p2[1] - c[1]), (p2[0] - c[0])); }
      else { a0 = -an.de * RAD; a1 = -an.a * RAD; var sw = ((an.a - an.de) % 360 + 360) % 360; if (sw === 0) sw = 360; sweep = -sw * RAD; if (sw >= 359.9) sweep = -359.9 * RAD; }
      out += angleMark(X(c[0]), Y(c[1]), a0, a1, an.r || 24, an.n != null ? an.n : "", 60, sweep);
      var bis = a0 + (sweep != null ? sweep : normA(a1 - a0)) / 2, rr = (an.r || 24) + 12; addBox(X(c[0]) + rr * Math.cos(bis), Y(c[1]) + rr * Math.sin(bis), 16, 16);
    });
    /* puntos: primero los marcadores (para esquivarlos), luego las etiquetas */
    pts.forEach(function (p) { addBox(X(p.p[0]), Y(p.p[1]), 12, 12); });
    segLabels.forEach(function (s) {
      var mx = (s.x1 + s.x2) / 2, my = (s.y1 + s.y2) / 2, nr = unit(-(s.y2 - s.y1), s.x2 - s.x1), pref = nr;
      if (pts.length && (mx - X(cenx)) * nr[0] + (my - Y(ceny)) * nr[1] < 0) pref = [-nr[0], -nr[1]];
      var pos = place(mx, my, s.t, pref, 5); out += txt(pos[0], pos[1], s.t, "acc");
    });
    var ptsOut = "", labOut = "";
    pts.forEach(function (p) {
      var px = X(p.p[0]), py = Y(p.p[1]), d;
      if (p.dir) d = unit(p.dir[0], -p.dir[1]);
      else if (p.pos && DIRS[p.pos]) d = DIRS[p.pos];
      else if (pts.length > 2) d = unit(px - X(cenx), py - Y(ceny));
      else d = [0.71, -0.71];
      ptsOut += dot(px, py, p.cls === "marca" ? "alt" : "");
      if (p.n) { var pos = place(px, py, p.n, d, 8); labOut += txt(pos[0], pos[1], p.n, "v"); }
    });
    (sp.textos || []).forEach(function (t) { var tpos = place(X(t.p[0]), Y(t.p[1]), t.t, [0, 0], 0); labOut += txt(tpos[0], tpos[1], t.t, "sm"); });
    flabels.forEach(function (f) {
      var px = Math.min(X(f.x), ox + plotW - 8), pos = place(px, Y(f.fn(f.x)), f.t, [-0.71, -0.71], 8);
      labOut += txt(pos[0], pos[1], f.t, "fl " + f.cls);
    });
    return wrap(W, H, out + ptsOut + labOut, sp.alt || "Gráfica del problema");
  }

  var TIPOS = { triangulo: triangulo, elevacion: elevacion, sector: sector, valla: valla, plano: plano, grafica: plano, vectores: plano, complejos: plano };
  function render(spec) {
    try {
      if (typeof spec === "string") spec = JSON.parse(spec);
      var fn = TIPOS[spec.tipo];
      if (!fn) throw new Error("tipo de figura desconocido: " + spec.tipo);
      return '<figure class="fig-wrap">' + fn(spec) + "</figure>";
    } catch (e) {
      return '<p class="fig-err">No he podido dibujar la figura (' + esc(e.message) + ").</p>";
    }
  }

  global.Figuras = { render: render, compile: compile, calc: calc, solveTri: solveTri, clean: clean };
})(window);
