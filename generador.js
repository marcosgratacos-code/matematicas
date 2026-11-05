/* Generador de problemas de Mates 1.º Bachillerato.
   Cada plantilla inventa números nuevos, calcula las soluciones de verdad y devuelve un problema completo:
   enunciado, datos, apartados (con respuesta para comprobar), figura a escala, pistas y solución paso a paso. */
(function (global) {
  "use strict";
  var r = String.raw, PI = Math.PI, RAD = PI / 180;

  /* ---------- utilidades ---------- */
  function R(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function P(a) { return a[R(0, a.length - 1)]; }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
  function rd(x, d) { var m = Math.pow(10, d == null ? 2 : d); return Math.round(x * m) / m; }
  function fx(x, d) { return String(rd(x, d)).replace(".", ","); }          /* número para texto */
  function tx(x, d) { return fx(x, d).replace(",", "{,}"); }                  /* número para TeX */
  function sin(d) { return Math.sin(d * RAD); } function cos(d) { return Math.cos(d * RAD); } function tan(d) { return Math.tan(d * RAD); }
  function acosD(x) { return Math.acos(Math.max(-1, Math.min(1, x))) / RAD; }
  function sgnTerm(c, v, first) {
    if (c === 0) return "";
    var s = c < 0 ? "-" : (first ? "" : "+"), a = Math.abs(c);
    return s + ((a === 1 && v) ? v : String(a) + v);
  }
  function polyTex(cs, X) {
    X = X || "x";
    var deg = cs.length - 1, out = "";
    cs.forEach(function (c, i) { var p = deg - i; out += sgnTerm(c, p === 0 ? "" : p === 1 ? X : X + "^{" + p + "}", out === ""); });
    return out || "0";
  }
  function polyStr(cs) { return polyTex(cs).replace(/\^\{(\d+)\}/g, "^$1"); }
  function polyEval(cs, x) { return cs.reduce(function (s, c) { return s * x + c; }, 0); }
  function par(n) { return n < 0 ? "(" + tx(n) + ")" : tx(n); }
  function frac(p, q) { /* fracción reducida en TeX */
    var g = gcd(p, q) || 1; p /= g; q /= g; if (q < 0) { p = -p; q = -q; }
    return q === 1 ? String(p) : (p < 0 ? "-" : "") + r`\dfrac{${Math.abs(p)}}{${q}}`;
  }
  function cx(a, b) {
    var s = ""; if (a !== 0) s += tx(a);
    if (b !== 0) { var ab = Math.abs(b); s += (b < 0 ? "-" : (a !== 0 ? "+" : "")) + (ab === 1 ? "" : tx(ab)) + "i"; }
    return s || "0";
  }
  function lista(v) { return v.map(function (x) { return fx(x); }).join("; "); }
  function ysRange(fn, a, b, padFrac) {
    var lo = Infinity, hi = -Infinity, i, y;
    for (i = 0; i <= 120; i++) { y = fn(a + (b - a) * i / 120); if (isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); } }
    var pad = (hi - lo) * (padFrac || 0.15) || 1;
    return [Math.floor((lo - pad) * 2) / 2, Math.ceil((hi + pad) * 2) / 2];
  }
  function bounds(points, margin, withOrigin) {
    var xs = points.map(function (p) { return p[0]; }), ys = points.map(function (p) { return p[1]; });
    if (withOrigin) { xs.push(0); ys.push(0); }
    var x0 = Math.floor(Math.min.apply(0, xs)) - margin, x1 = Math.ceil(Math.max.apply(0, xs)) + margin;
    var y0 = Math.floor(Math.min.apply(0, ys)) - margin, y1 = Math.ceil(Math.max.apply(0, ys)) + margin;
    if (x1 - x0 < 6) { x0 -= 1; x1 += 2; } if (y1 - y0 < 6) { y0 -= 1; y1 += 2; }
    return { x: [x0, x1], y: [y0, y1] };
  }
  var NIVELES = { 1: "Básico", 2: "Medio", 3: "Examen" };
  var TEMAS = { trig: "Trigonometría", deriv: "Derivadas", vect: "Vectores", comp: "Números complejos", func: "Funciones y límites", exp: "Exponenciales y logaritmos" };

  var T = [];
  function add(t) { T.push(t); }

  /* =================== TRIGONOMETRÍA =================== */
  add({ id: "torre1", tema: "trig", nivel: 1, busca: "trigonometria", kw: /(altura|torre|[aá]rbol|edificio|antena|faro|elevaci)/i,
    gen: function () {
      var o = P([{ un: "un árbol", del: "del árbol", top: "la copa" }, { un: "un edificio", del: "del edificio", top: "la azotea" }, { un: "un faro", del: "del faro", top: "la luz" }, { un: "una antena", del: "de la antena", top: "la punta" }]);
      var al = R(25, 62), d = P([15, 20, 25, 30, 40, 45, 50, 60]), h = d * tan(al), L = d / cos(al);
      return {
        titulo: "Altura " + o.del,
        enunciado: "Desde un punto del suelo situado a **" + d + " m** de la base de " + o.un + ", se ve " + o.top + " con un **ángulo de elevación de " + al + "°**.",
        datos: ["Distancia horizontal del observador a la base: " + d + " m", "Ángulo de elevación: " + al + "°", "El suelo es horizontal y " + o.un + " es perpendicular al suelo"],
        preguntas: [{ t: "Calcula la altura " + o.del + ".", ans: h, u: "m" }, { t: "¿A qué distancia en línea recta está el observador de " + o.top + "?", ans: L, u: "m" }],
        figura: { tipo: "elevacion", d: d, alfa: al, etD: d + " m", etH: "h = ?", etAlfa: al + "°", nombres: ["A"], etCima: "" },
        pistas: ["Dibuja el triángulo rectángulo que forman el observador, la base y la parte alta. ¿Qué lado es el cateto opuesto al ángulo y cuál el adyacente?", r`Como conoces el cateto adyacente $d$ y quieres el opuesto $h$, la razón que los relaciona es $\tan\alpha=\dfrac{h}{d}$.`, "Para la distancia en línea recta (la hipotenusa) usa el coseno o el teorema de Pitágoras con $h$ y $d$."],
        solucion: [
          r`**1. Esquema.** El observador, la base y la parte alta forman un triángulo rectángulo. El cateto horizontal es $d=${d}$ m y el ángulo en el observador es $\alpha=${al}^\circ$.`,
          r`**2. Razón adecuada.** $h$ es el cateto opuesto a $\alpha$ y $d$ el adyacente, así que $$\tan\alpha=\dfrac{h}{d}\;\Rightarrow\; h=d\tan\alpha .$$`,
          r`**3. Altura.** $h=${d}\cdot\tan ${al}^\circ=${d}\cdot ${tx(tan(al), 4)}=${tx(h)}$ m.`,
          r`**4. Distancia en línea recta (hipotenusa $L$).** $\cos\alpha=\dfrac{d}{L}\;\Rightarrow\;L=\dfrac{d}{\cos\alpha}=\dfrac{${d}}{${tx(cos(al), 4)}}=${tx(L)}$ m.`,
          r`**5. Comprobación.** Por Pitágoras, $\sqrt{d^2+h^2}=\sqrt{${d}^2+${tx(h)}^2}=${tx(Math.sqrt(d * d + h * h))}$ m ✓.`]
      };
    } });

  add({ id: "sector", tema: "trig", nivel: 1, busca: "radianes", kw: /(radian|sector|arco)/i,
    gen: function () {
      var rr = R(4, 15), th = P([30, 45, 60, 72, 90, 120, 135, 150, 210, 240, 270, 300]), g = gcd(th, 180), p = th / g, q = 180 / g;
      var rad = th * RAD, s = rr * rad, A = 0.5 * rr * rr * rad;
      var fr = (p === 1 ? r`\dfrac{\pi}{${q}}` : r`\dfrac{${p}\pi}{${q}}`);
      return {
        titulo: "Sector circular",
        enunciado: "Un sector circular tiene un radio de **" + rr + " cm** y un ángulo central de **" + th + "°**.",
        datos: ["Radio: " + rr + " cm", "Ángulo central: " + th + "°"],
        preguntas: [{ t: "Expresa el ángulo en radianes (puedes escribir, por ejemplo, pi/3).", ans: rad, u: "rad" }, { t: "Calcula la longitud del arco.", ans: s, u: "cm" }, { t: "Calcula el área del sector.", ans: A, u: "cm²" }],
        figura: { tipo: "sector", theta: th, etR: "r = " + rr + " cm", etTheta: th + "°", etS: "s = ?" },
        pistas: [r`Recuerda que $180^\circ=\pi$ rad. Multiplica los grados por $\dfrac{\pi}{180}$.`, r`Con el ángulo en radianes, la longitud del arco es $s=\theta\cdot r$.`, r`El área del sector es una fracción del círculo: $A=\dfrac{1}{2}\,r^2\,\theta$ (con $\theta$ en radianes).`],
        solucion: [
          r`**1. Pasar a radianes.** $\theta=${th}^\circ\cdot\dfrac{\pi\ \text{rad}}{180^\circ}=${fr}\ \text{rad}\approx ${tx(rad, 4)}$ rad.`,
          r`**2. Longitud del arco.** $s=\theta\,r=${fr}\cdot ${rr}\approx ${tx(s)}$ cm.`,
          r`**3. Área.** $A=\dfrac{1}{2}r^2\theta=\dfrac{1}{2}\cdot ${rr}^2\cdot ${tx(rad, 4)}\approx ${tx(A)}$ cm².`,
          r`**4. Comprobación.** $A=\dfrac{1}{2}\,s\,r=\dfrac{1}{2}\cdot ${tx(s)}\cdot ${rr}=${tx(0.5 * s * rr)}$ cm² ✓.`]
      };
    } });

  function trianguloSeno(rio) {
    var A, B, C, c;
    do { A = R(rio ? 45 : 35, 80); B = R(rio ? 45 : 30, 75); C = 180 - A - B; } while (C < 25 || C > 100);
    c = rio ? P([40, 50, 60, 80, 100]) : R(6, 20);
    var a = c * sin(A) / sin(C), b = c * sin(B) / sin(C), w = b * sin(A), un = rio ? "m" : "cm";
    var pasos = [
      r`**1. Tercer ángulo.** $C=180^\circ-A-B=180^\circ-${A}^\circ-${B}^\circ=${C}^\circ$.`,
      r`**2. Teorema del seno.** $$\dfrac{a}{\sin A}=\dfrac{b}{\sin B}=\dfrac{c}{\sin C}$$ Conocemos $c=${c}$ y $C=${C}^\circ$, así que podemos despejar los otros lados.`,
      r`**3. Lado $b$.** $b=\dfrac{c\,\sin B}{\sin C}=\dfrac{${c}\cdot\sin ${B}^\circ}{\sin ${C}^\circ}=\dfrac{${c}\cdot ${tx(sin(B), 4)}}{${tx(sin(C), 4)}}=${tx(b)}$ ${un}.`,
      r`**4. Lado $a$.** $a=\dfrac{c\,\sin A}{\sin C}=\dfrac{${c}\cdot ${tx(sin(A), 4)}}{${tx(sin(C), 4)}}=${tx(a)}$ ${un}.`];
    var o = rio ? {
      titulo: "Anchura de un río",
      enunciado: "Para medir la anchura de un río, dos excursionistas se colocan en la misma orilla, en los puntos **A** y **B**, separados **" + c + " m**. Desde A ven un árbol **C** de la orilla opuesta formando un ángulo $\\widehat{CAB}=" + A + "^\\circ$, y desde B lo ven con $\\widehat{CBA}=" + B + "^\\circ$.",
      datos: ["Distancia AB = " + c + " m (sobre la orilla)", "Ángulo en A: " + A + "°", "Ángulo en B: " + B + "°", "Las dos orillas son paralelas"],
      preguntas: [{ t: "Calcula la distancia de A al árbol.", ans: b, u: "m" }, { t: "Calcula la distancia de B al árbol.", ans: a, u: "m" }, { t: "Calcula la anchura del río (distancia del árbol a la orilla de A y B).", ans: w, u: "m" }],
      figura: { tipo: "triangulo", A: A, B: B, c: c, rio: true, altura: "w = ?", lados: { c: c + " m", a: "", b: "" }, angulos: { A: A + "°", B: B + "°" } },
      figuraSol: { tipo: "triangulo", A: A, B: B, c: c, rio: true, altura: "w = " + fx(w) + " m", lados: { c: c + " m", a: fx(a) + " m", b: fx(b) + " m" }, angulos: { A: A + "°", B: B + "°" } },
      pistas: ["Lo que mides es un triángulo ABC del que conoces un lado (AB) y dos ángulos. Calcula primero el tercer ángulo.", "Con un lado y su ángulo opuesto conocidos, el teorema del seno te da los demás lados.", r`La anchura del río es la altura del triángulo sobre AB: en el triángulo rectángulo formado, $w=AC\cdot\sin A$.`],
      solucion: pasos.concat([r`**5. Anchura del río.** Es la distancia de $C$ a la recta $AB$ (altura del triángulo). En el triángulo rectángulo con hipotenusa $AC=b$: $w=b\,\sin A=${tx(b)}\cdot ${tx(sin(A), 4)}=${tx(w)}$ m.`, r`**6. Comprobación.** Desde B: $a\,\sin B=${tx(a)}\cdot ${tx(sin(B), 4)}=${tx(a * sin(B))}$ m ✓.`])
    } : {
      titulo: "Resolver un triángulo (teorema del seno)",
      enunciado: "En el triángulo $ABC$ se conocen los ángulos $\\hat A=" + A + "^\\circ$, $\\hat B=" + B + "^\\circ$ y el lado $c=AB=" + c + "$ cm. **Resuelve el triángulo**: calcula el ángulo $\\hat C$ y los lados $a$ y $b$.",
      datos: ["Â = " + A + "°", "B̂ = " + B + "°", "c = AB = " + c + " cm"],
      preguntas: [{ t: "Calcula el ángulo C.", ans: C, u: "°" }, { t: "Calcula el lado a (opuesto a A).", ans: a, u: "cm" }, { t: "Calcula el lado b (opuesto a B).", ans: b, u: "cm" }],
      figura: { tipo: "triangulo", A: A, B: B, c: c, lados: { c: "c = " + c + " cm", a: "a = ?", b: "b = ?" }, angulos: { A: A + "°", B: B + "°", C: "C = ?" } },
      pistas: ["Los ángulos de un triángulo suman 180°. ¿Cuánto vale C?", r`Cada lado es proporcional al seno de su ángulo opuesto: $\dfrac{a}{\sin A}=\dfrac{b}{\sin B}=\dfrac{c}{\sin C}$.`, "Ya conoces $c$ y $C$, así que esa razón vale un número concreto."],
      solucion: pasos.concat([r`**5. Comprobación.** Por el teorema del coseno, $a^2+b^2-2ab\cos C=${tx(a * a + b * b - 2 * a * b * cos(C))}\approx c^2=${c * c}$ ✓.`])
    };
    return o;
  }
  add({ id: "seno", tema: "trig", nivel: 2, busca: "teorema del seno", kw: /(seno|dos [aá]ngulos)/i, gen: function () { return trianguloSeno(false); } });
  add({ id: "rio", tema: "trig", nivel: 3, busca: "teorema del seno", kw: /(r[ií]o|anchura|inaccesible)/i, gen: function () { return trianguloSeno(true); } });

  add({ id: "coseno", tema: "trig", nivel: 2, busca: "teorema del coseno", kw: /(coseno|senderos|dos lados)/i,
    gen: function () {
      var b = R(4, 15), c = R(4, 15), A = R(35, 120), a = Math.sqrt(b * b + c * c - 2 * b * c * cos(A));
      var B = acosD((a * a + c * c - b * b) / (2 * a * c)), C = 180 - A - B;
      return {
        titulo: "Dos senderos desde un refugio",
        enunciado: "Dos senderos parten del refugio **A** formando un ángulo de **" + A + "°**. Uno lleva al lago **B**, a **" + c + " km** del refugio, y el otro a la cima **C**, a **" + b + " km**. Un helicóptero quiere volar en línea recta del lago a la cima.",
        datos: ["AB = " + c + " km (refugio–lago)", "AC = " + b + " km (refugio–cima)", "Ángulo en el refugio: " + A + "°"],
        preguntas: [{ t: "¿Qué distancia hay entre el lago y la cima (lado a = BC)?", ans: a, u: "km" }, { t: "Calcula el ángulo en el lago (B).", ans: B, u: "°" }, { t: "Calcula el ángulo en la cima (C).", ans: C, u: "°" }],
        figura: { tipo: "triangulo", A: A, b: b, c: c, lados: { b: b + " km", c: c + " km", a: "a = ?" }, angulos: { A: A + "°", B: "B = ?", C: "C = ?" } },
        pistas: ["Conoces dos lados y el ángulo que forman: ese es el caso del teorema del coseno.", r`$a^2=b^2+c^2-2bc\cos A$. Cuidado: con $A$ obtuso el coseno es negativo.`, r`Para los ángulos que faltan puedes despejar de nuevo con el coseno: $\cos B=\dfrac{a^2+c^2-b^2}{2ac}$. El tercero sale restando de 180°.`],
        solucion: [
          r`**1. Teorema del coseno.** $a^2=b^2+c^2-2bc\cos A=${b}^2+${c}^2-2\cdot ${b}\cdot ${c}\cdot\cos ${A}^\circ$.`,
          r`$a^2=${b * b}+${c * c}-${2 * b * c}\cdot ${par(rd(cos(A), 4))}=${tx(a * a)}\;\Rightarrow\;a=${tx(a)}$ km.`,
          r`**2. Ángulo B.** $\cos B=\dfrac{a^2+c^2-b^2}{2ac}=\dfrac{${tx(a * a)}+${c * c}-${b * b}}{2\cdot ${tx(a)}\cdot ${c}}=${tx((a * a + c * c - b * b) / (2 * a * c), 4)}\;\Rightarrow\;B=${tx(B)}^\circ$.`,
          r`**3. Ángulo C.** $C=180^\circ-A-B=180^\circ-${A}^\circ-${tx(B)}^\circ=${tx(C)}^\circ$.`,
          r`**4. Comprobación.** Teorema del seno: $\dfrac{a}{\sin A}=${tx(a / sin(A))}$ y $\dfrac{b}{\sin B}=${tx(b / sin(B))}$ ✓.`]
      };
    } });

  add({ id: "cosenoSSS", tema: "trig", nivel: 2, busca: "teorema del coseno", kw: /(tres lados|her[oó]n|parque|terreno)/i,
    gen: function () {
      var a = R(5, 12), b = R(5, 12), c = R(Math.abs(a - b) + 2, a + b - 2), s = (a + b + c) / 2;
      var A = acosD((b * b + c * c - a * a) / (2 * b * c)), B = acosD((a * a + c * c - b * b) / (2 * a * c)), C = 180 - A - B;
      var area = Math.sqrt(s * (s - a) * (s - b) * (s - c)), mx = Math.max(a, b, c), L = a === mx ? "A" : b === mx ? "B" : "C", ang = { A: A, B: B, C: C }[L];
      var opp = { A: "a", B: "b", C: "c" }[L], ang2 = {}; ang2[L] = "?";
      return {
        titulo: "Un parque triangular",
        enunciado: "Un parque tiene forma de triángulo con lados de **" + a + " m**, **" + b + " m** y **" + c + " m**. Se quiere conocer su mayor ángulo y la superficie a cubrir de césped.",
        datos: ["a = " + a + " m", "b = " + b + " m", "c = " + c + " m"],
        preguntas: [{ t: "Calcula el mayor de los ángulos del parque.", ans: ang, u: "°" }, { t: "Calcula su área (fórmula de Herón o con el seno).", ans: area, u: "m²" }],
        figura: { tipo: "triangulo", a: a, b: b, c: c, unidad: "m", angulos: ang2 },
        pistas: ["El mayor ángulo es el que se opone al mayor lado.", r`Con los tres lados, despeja el coseno: $\cos A=\dfrac{b^2+c^2-a^2}{2bc}$ (y análogo para los otros).`, r`Herón: $A=\sqrt{s(s-a)(s-b)(s-c)}$, con $s=\dfrac{a+b+c}{2}$ el semiperímetro.`],
        solucion: [
          r`**1. Mayor ángulo.** El mayor lado es $${opp}=${mx}$ m, luego el mayor ángulo es $\hat ${L}$.`,
          L === "A" ? r`$\cos A=\dfrac{b^2+c^2-a^2}{2bc}=\dfrac{${b * b}+${c * c}-${a * a}}{2\cdot ${b}\cdot ${c}}=${tx((b * b + c * c - a * a) / (2 * b * c), 4)}\Rightarrow A=${tx(A)}^\circ$.` :
            L === "B" ? r`$\cos B=\dfrac{a^2+c^2-b^2}{2ac}=\dfrac{${a * a}+${c * c}-${b * b}}{2\cdot ${a}\cdot ${c}}=${tx((a * a + c * c - b * b) / (2 * a * c), 4)}\Rightarrow B=${tx(B)}^\circ$.` :
              r`$\cos C=\dfrac{a^2+b^2-c^2}{2ab}=\dfrac{${a * a}+${b * b}-${c * c}}{2\cdot ${a}\cdot ${b}}=${tx((a * a + b * b - c * c) / (2 * a * b), 4)}\Rightarrow C=${tx(C)}^\circ$.`,
          r`**2. Área (Herón).** $s=\dfrac{${a}+${b}+${c}}{2}=${tx(s)}$ y $$A=\sqrt{${tx(s)}\,(${tx(s - a)})(${tx(s - b)})(${tx(s - c)})}=${tx(area)}\ \text{m}^2.$$`,
          r`**3. Comprobación con el seno.** $A=\dfrac{1}{2}\,ab\sin C=\dfrac{1}{2}\cdot ${a}\cdot ${b}\cdot ${tx(sin(C), 4)}=${tx(0.5 * a * b * sin(C))}$ m² ✓.`]
      };
    } });

  add({ id: "torre2", tema: "trig", nivel: 2, busca: "trigonometria", kw: /(dos [aá]ngulos de elevaci|dos puntos|torre|inventa)/i,
    gen: function () {
      var obj = P([{ un: "una torre", la: "la torre", top: "su parte más alta" }, { un: "un edificio", la: "el edificio", top: "su azotea" }, { un: "una chimenea", la: "la chimenea", top: "su boca" }, { un: "un campanario", la: "el campanario", top: "su cruz" }]);
      var al = R(25, 45), be = R(al + 12, Math.min(al + 30, 72)), d = P([10, 12, 15, 20, 24, 30, 40, 50]);
      var ta = tan(al), tb = tan(be), x = d * ta / (tb - ta), h = x * tb;
      return {
        titulo: "Dos ángulos de elevación",
        enunciado: "Desde un punto **A** del suelo se observa " + obj.top + " de " + obj.un + " con un ángulo de elevación de **" + al + "°**. Si avanzas **" + d + " m** en línea recta hacia la base hasta un punto **B**, el ángulo de elevación pasa a ser de **" + be + "°**.",
        datos: ["Ángulo de elevación desde A: " + al + "°", "Ángulo de elevación desde B: " + be + "°", "Distancia AB = " + d + " m", "A, B y la base están alineados sobre el suelo horizontal"],
        preguntas: [{ t: "Calcula la altura de " + obj.la + ".", ans: h, u: "m" }, { t: "Calcula la distancia de B a la base.", ans: x, u: "m" }],
        figura: { tipo: "elevacion", d: d, alfa: al, beta: be, etD: d + " m", etH: "h = ?", etAlfa: al + "°", etBeta: be + "°" },
        pistas: ["Llama $x$ a la distancia de B a la base. Entonces A está a $x+d$ de la base.", r`Escribe la altura $h$ de dos formas con la tangente: $h=x\tan\beta$ y $h=(x+d)\tan\alpha$.`, r`Iguala ambas expresiones y despeja $x$: $x\tan\beta=(x+d)\tan\alpha$.`],
        solucion: [
          r`**1. Incógnitas.** Sea $x$ la distancia de B a la base. Entonces A está a $x+${d}$ m. Hay dos triángulos rectángulos con el mismo cateto vertical $h$.`,
          r`**2. Dos ecuaciones.** $$\tan ${be}^\circ=\dfrac{h}{x}\quad\text{y}\quad\tan ${al}^\circ=\dfrac{h}{x+${d}}.$$`,
          r`**3. Igualar $h$.** $x\tan ${be}^\circ=(x+${d})\tan ${al}^\circ\;\Rightarrow\; x\,(\tan ${be}^\circ-\tan ${al}^\circ)=${d}\tan ${al}^\circ$.`,
          r`**4. Despejar $x$.** $x=\dfrac{${d}\cdot ${tx(ta, 4)}}{${tx(tb, 4)}-${tx(ta, 4)}}=${tx(x)}$ m.`,
          r`**5. Altura.** $h=x\tan ${be}^\circ=${tx(x)}\cdot ${tx(tb, 4)}=${tx(h)}$ m.`,
          r`**6. Comprobación.** Desde A: $(x+d)\tan ${al}^\circ=${tx(x + d)}\cdot ${tx(ta, 4)}=${tx((x + d) * ta)}$ m ✓.`]
      };
    } });

  add({ id: "ecuacionTrig", tema: "trig", nivel: 3, busca: "ecuaciones trigonometricas", kw: /(ecuaci[oó]n trigonom|ecuaciones trigonom|resuelve la ecuaci)/i,
    gen: function () {
      var fn = P(["sin", "cos"]), tbl = fn === "sin" ? { "1/2": [30, 150], "-1/2": [210, 330], "0": [0, 180], "1": [90], "-1": [270] } : { "1/2": [60, 300], "-1/2": [120, 240], "0": [90, 270], "1": [0], "-1": [180] };
      var val = { "1/2": 0.5, "-1/2": -0.5, "0": 0, "1": 1, "-1": -1 }, tex = { "1/2": r`\dfrac{1}{2}`, "-1/2": r`-\dfrac{1}{2}`, "0": "0", "1": "1", "-1": "-1" };
      var keys = Object.keys(tbl), k1 = P(keys), k2; do { k2 = P(keys); } while (k2 === k1);
      var p = val[k1], q = val[k2], A = 4, B = -4 * (p + q), C = 4 * p * q, g = gcd(gcd(A, B), C || 1) || 1; A /= g; B /= g; C /= g;
      var F = fn === "sin" ? r`\sin` : r`\cos`, eq = sgnTerm(A, F + "^2 x", true) + sgnTerm(B, F + " x", false) + sgnTerm(C, "", false) + "=0";
      var sols = tbl[k1].concat(tbl[k2]).sort(function (a, b) { return a - b; });
      var D = B * B - 4 * A * C, pts = {};
      sols.forEach(function (a) { pts[a + "°"] = { p: [cos(a), sin(a)], dir: [cos(a), sin(a)] }; });
      var segs = sols.map(function (a) { return { de: [0, 0], a: [cos(a), sin(a)], color: "angulo", trazo: "discontinuo" }; });
      return {
        titulo: "Ecuación trigonométrica",
        enunciado: "Resuelve la ecuación $" + eq + "$ en el intervalo $[0^\\circ,\\,360^\\circ)$.",
        datos: ["Da todas las soluciones en grados", "Pista del método: cambio de variable $t=\\" + fn + " x$"],
        preguntas: [{ t: "Escribe todas las soluciones en grados, separadas por «;» (de menor a mayor).", ans: sols, u: "°" }],
        figura: { tipo: "plano", x: [-1.7, 1.7], y: [-1.5, 1.5], circulos: [{ c: [0, 0], r: 1 }], alt: "Circunferencia goniométrica" },
        figuraSol: { tipo: "plano", x: [-1.7, 1.7], y: [-1.5, 1.5], circulos: [{ c: [0, 0], r: 1 }], puntos: pts, segmentos: segs, alt: "Soluciones en la circunferencia goniométrica" },
        pistas: [r`Cambia de variable: $t=${F} x$. La ecuación pasa a ser una ecuación de segundo grado en $t$.`, "Resuélvela con la fórmula general y recuerda que el seno y el coseno siempre están entre −1 y 1.", "Para cada valor de $t$ busca los ángulos del intervalo con la circunferencia goniométrica."],
        solucion: [
          r`**1. Cambio de variable.** Con $t=${F} x$: $${polyTex([A, B, C], "t")}=0$.`,
          r`**2. Fórmula general.** $t=\dfrac{-(${B})\pm\sqrt{${B}^2-4\cdot ${par(A)}\cdot ${par(C)}}}{2\cdot ${par(A)}}=\dfrac{${-B}\pm\sqrt{${D}}}{${2 * A}}$, de donde $t_1=${tex[k1]}$ y $t_2=${tex[k2]}$.`,
          r`**3. Deshacer el cambio.** $${F} x=${tex[k1]}\Rightarrow x=${tbl[k1].map(function (a) { return a + "^\\circ"; }).join(r`\ \text{o}\ `)}$.`,
          r`$${F} x=${tex[k2]}\Rightarrow x=${tbl[k2].map(function (a) { return a + "^\\circ"; }).join(r`\ \text{o}\ `)}$.`,
          r`**4. Comprobación.** Ambos valores de $t$ están en $[-1,1]$, así que todas las soluciones son válidas: $x\in\{${sols.join(",\\ ")}\}^\circ$.`]
      };
    } });

  /* =================== DERIVADAS =================== */
  add({ id: "derivBasica", tema: "deriv", nivel: 1, busca: "derivada", kw: /(deriva|derivada de)/i,
    gen: function () {
      var a = R(1, 4), b = R(-5, 5), c = R(-6, 6), d = R(-5, 5), x0 = R(-2, 3), cs = [a, b, c, d];
      var d1 = [3 * a, 2 * b, c], d2 = [6 * a, 2 * b], m = polyEval(d1, x0), cur = polyEval(d2, x0);
      return {
        titulo: "Derivada de un polinomio",
        enunciado: "Dada la función $f(x)=" + polyTex(cs) + "$, calcula su derivada y evalúala.",
        datos: ["Polinomio de grado 3", "Punto: x = " + x0, "Regla de las potencias: (xⁿ)′ = n·xⁿ⁻¹"],
        preguntas: [{ t: "Escribe $f'(x)$ (compruébalo con la solución).", ans: null }, { t: "Calcula $f'(" + x0 + ")$, la pendiente de la gráfica en $x=" + x0 + "$.", ans: m }, { t: "Calcula $f''(" + x0 + ")$.", ans: cur }],
        pistas: [r`Usa la regla de las potencias: $(x^n)'=n\,x^{n-1}$ y deriva término a término.`, "La derivada de una constante es 0 y la de $kx$ es $k$.", "Para $f''$, vuelve a derivar $f'$."],
        solucion: [
          r`**1. Derivar término a término.** $f'(x)=${polyTex(d1)}$.`,
          r`**2. Evaluar.** $f'(${x0})=${3 * a}\cdot ${par(x0)}^2+${par(2 * b)}\cdot ${par(x0)}+${par(c)}=${tx(m)}$.`,
          r`**3. Segunda derivada.** $f''(x)=${polyTex(d2)}$, y $f''(${x0})=${tx(cur)}$.`]
      };
    } });

  add({ id: "derivReglas", tema: "deriv", nivel: 2, busca: "regla cadena", kw: /(regla|producto|cociente|cadena)/i,
    gen: function () {
      var v = R(0, 2), a, b, x0, f, fd, ans, pasos, tit, pistas;
      if (v === 0) {
        a = R(1, 4); b = R(-3, 3); x0 = 1; tit = "Regla del producto";
        f = r`(${sgnTerm(a, "x", true)}${sgnTerm(b, "", false)})\,e^{x}`; ans = (2 * a + b) * Math.E;
        fd = r`f'(x)=${a}\,e^{x}+(${sgnTerm(a, "x", true)}${sgnTerm(b, "", false)})\,e^{x}=(${sgnTerm(a, "x", true)}${sgnTerm(a + b, "", false)})\,e^{x}`;
        pasos = [r`**1. Regla del producto.** $(u\cdot v)'=u'v+uv'$ con $u=${sgnTerm(a, "x", true)}${sgnTerm(b, "", false)}$ y $v=e^{x}$.`, r`**2. Derivar.** $${fd}$.`, r`**3. Evaluar.** $f'(1)=(${a}+${a + b})\,e=${2 * a + b}\,e\approx ${tx(ans)}$.`];
        pistas = [r`Es un producto de dos funciones: $u(x)$ y $e^{x}$.`, r`$(uv)'=u'v+uv'$ y recuerda que $(e^{x})'=e^{x}$.`];
      } else if (v === 1) {
        a = R(1, 6); b = R(1, 4); x0 = b + R(1, 3); tit = "Regla del cociente";
        f = r`\dfrac{x^2+${a}}{x-${b}}`; ans = (x0 * x0 - 2 * b * x0 - a) / Math.pow(x0 - b, 2);
        fd = r`f'(x)=\dfrac{2x\,(x-${b})-(x^2+${a})\cdot 1}{(x-${b})^2}=\dfrac{x^2-${2 * b}x-${a}}{(x-${b})^2}`;
        pasos = [r`**1. Regla del cociente.** $\left(\dfrac{u}{v}\right)'=\dfrac{u'v-uv'}{v^2}$ con $u=x^2+${a}$ y $v=x-${b}$.`, r`**2. Derivar y simplificar.** $${fd}$.`, r`**3. Evaluar.** $f'(${x0})=\dfrac{${x0 * x0}-${2 * b * x0}-${a}}{${Math.pow(x0 - b, 2)}}=${tx(ans)}$.`];
        pistas = [r`Es un cociente $u/v$ con $u=x^2+${a}$ y $v=x-${b}$.`, r`$\left(\dfrac{u}{v}\right)'=\dfrac{u'v-uv'}{v^2}$.`];
      } else {
        var t = P([[1, 5, 2], [2, 1, 2], [3, 1, 1], [4, 9, 2], [1, 16, 3]]); a = t[0]; b = t[1]; x0 = t[2]; tit = "Regla de la cadena";
        var rad = Math.sqrt(a * x0 * x0 + b); f = r`\sqrt{${a === 1 ? "" : a}x^2+${b}}`; ans = a * x0 / rad;
        fd = r`f'(x)=\dfrac{1}{2\sqrt{${a === 1 ? "" : a}x^2+${b}}}\cdot ${2 * a}x=\dfrac{${a === 1 ? "" : a}x}{\sqrt{${a === 1 ? "" : a}x^2+${b}}}`;
        pasos = [r`**1. Regla de la cadena.** Función exterior $\sqrt{u}$ (derivada $\dfrac{1}{2\sqrt{u}}$) e interior $u=${a === 1 ? "" : a}x^2+${b}$ (derivada $${2 * a}x$).`, r`**2. Derivar.** $${fd}$.`, r`**3. Evaluar.** $f'(${x0})=\dfrac{${a * x0}}{\sqrt{${a * x0 * x0 + b}}}=\dfrac{${a * x0}}{${rad}}=${tx(ans)}$.`];
        pistas = [r`Tienes una raíz de una expresión: función compuesta.`, r`$(\sqrt{u})'=\dfrac{u'}{2\sqrt{u}}$.`];
      }
      return {
        titulo: tit, enunciado: "Calcula la derivada de $f(x)=" + f + "$ y el valor de $f'(" + x0 + ")$.",
        datos: ["Punto: x = " + x0],
        preguntas: [{ t: "Calcula $f'(" + x0 + ")$ (puedes dejarlo con decimales).", ans: ans }],
        pistas: pistas, solucion: pasos
      };
    } });

  add({ id: "tangente", tema: "deriv", nivel: 2, busca: "recta tangente", kw: /(tangente)/i,
    gen: function () {
      var p, q, rr, x0, m, cs, y0, n;
      do { p = R(-2, 2); q = R(-4, 2); rr = R(-3, 3); x0 = R(-2, 2); cs = [1, p, q, rr]; m = 3 * x0 * x0 + 2 * p * x0 + q; } while (m === 0 || Math.abs(m) > 14);
      y0 = polyEval(cs, x0); n = y0 - m * x0;
      var fn = function (x) { return polyEval(cs, x); }, yr = ysRange(fn, x0 - 3, x0 + 3, 0.12), xcut = -n / m;
      var base = { tipo: "plano", x: [x0 - 3, x0 + 3], y: [Math.max(yr[0], -14), Math.min(yr[1], 14)], funciones: [{ f: polyStr(cs), etiqueta: "f(x)" }], puntos: { P: [x0, y0] } };
      var sol = JSON.parse(JSON.stringify(base)); sol.funciones.push({ f: "(" + m + ")*x+(" + n + ")", trazo: "discontinuo", etiqueta: "tangente" });
      return {
        titulo: "Recta tangente a una curva",
        enunciado: "Sea $f(x)=" + polyTex(cs) + "$ y sea $P$ el punto de su gráfica de abscisa $x=" + x0 + "$. Halla la **ecuación de la recta tangente** a la gráfica en $P$, en la forma $y=mx+n$.",
        datos: ["Punto de tangencia: P con x = " + x0, "Recta tangente: y − f(x₀) = f′(x₀)·(x − x₀)"],
        preguntas: [{ t: "Calcula la pendiente $m=f'(" + x0 + ")$.", ans: m }, { t: "Calcula la ordenada en el origen $n$ de la tangente.", ans: n }, { t: "¿En qué punto $x$ corta la tangente al eje $OX$?", ans: xcut }],
        figura: base, figuraSol: sol,
        pistas: ["La pendiente de la tangente es la derivada de la función en el punto: $m=f'(x_0)$.", r`Necesitas también la ordenada del punto: $y_0=f(x_0)$. Después usa $y-y_0=m(x-x_0)$.`, "Para el corte con el eje $OX$ haz $y=0$ en la ecuación de la tangente."],
        solucion: [
          r`**1. Derivada.** $f'(x)=${polyTex([3, 2 * p, q])}$.`,
          r`**2. Pendiente.** $m=f'(${x0})=${tx(m)}$.`,
          r`**3. Punto.** $y_0=f(${x0})=${tx(y0)}$, luego $P=(${x0},\,${tx(y0)})$.`,
          r`**4. Ecuación.** $y-${par(y0)}=${par(m)}(x-${par(x0)})\;\Rightarrow\; y=${sgnTerm(m, "x", true)}${sgnTerm(n, "", false)}$, es decir, $n=${tx(n)}$.`,
          r`**5. Corte con OX.** $0=${tx(m)}x+${par(n)}\Rightarrow x=${tx(xcut)}$.`]
      };
    } });

  add({ id: "extremos", tema: "deriv", nivel: 3, busca: "extremos", kw: /(m[aá]ximo|m[ií]nimo|extremo|crece|monoton)/i,
    gen: function () {
      var p = R(-2, 1), q = p + R(1, 3), s = P([1, -1]), d0 = R(-3, 5), cs = [2 * s, -3 * (p + q) * s, 6 * p * q * s, d0];
      var fp = polyEval(cs, p), fq = polyEval(cs, q), maxX = s === 1 ? p : q, minX = s === 1 ? q : p;
      var fn = function (x) { return polyEval(cs, x); }, yr = ysRange(fn, p - 1.5, q + 1.5, 0.15);
      var base = { tipo: "plano", x: [p - 1.5, q + 1.5], y: yr, funciones: [{ f: polyStr(cs), etiqueta: "f(x)" }], alt: "Gráfica de f" };
      var sol = JSON.parse(JSON.stringify(base)); sol.puntos = {}; sol.puntos["Máx (" + maxX + ", " + fx(fn(maxX)) + ")"] = { p: [maxX, fn(maxX)], pos: "n" }; sol.puntos["Mín (" + minX + ", " + fx(fn(minX)) + ")"] = { p: [minX, fn(minX)], pos: "s" };
      var dcs = [6 * s, -6 * s * (p + q), 6 * s * p * q];
      return {
        titulo: "Crecimiento, máximos y mínimos",
        enunciado: "Estudia la función $f(x)=" + polyTex(cs) + "$: determina dónde crece y decrece y calcula sus extremos relativos (observa su gráfica).",
        datos: ["Función polinómica de grado 3", "Extremos relativos: puntos donde $f'(x)=0$ y cambia el signo"],
        preguntas: [{ t: "Halla las abscisas de los puntos críticos (separadas por «;», de menor a mayor).", ans: [p, q] }, { t: "¿Cuál es el valor (ordenada) del máximo relativo?", ans: Math.max(fp, fq) }, { t: "¿Cuál es el valor (ordenada) del mínimo relativo?", ans: Math.min(fp, fq) }],
        figura: base, figuraSol: sol,
        pistas: ["Los extremos relativos están donde $f'(x)=0$. Calcula $f'(x)$ e iguálala a 0.", "Resuelve la ecuación de segundo grado. Después estudia el signo de $f'$ en cada intervalo.", "Si $f'$ pasa de + a −, hay un máximo; si pasa de − a +, hay un mínimo. Sustituye en $f$ para sacar las ordenadas."],
        solucion: [
          r`**1. Derivada.** $f'(x)=${polyTex(dcs)}=${s === 1 ? "6" : "-6"}(x-${par(p)})(x-${par(q)})$.`,
          r`**2. Puntos críticos.** $f'(x)=0\Rightarrow x=${p}$ o $x=${q}$.`,
          r`**3. Signo de $f'$.** ` + (s === 1
            ? r`$f'>0$ en $(-\infty,${p})$ y en $(${q},+\infty)$ (crece); $f'<0$ en $(${p},${q})$ (decrece).`
            : r`$f'<0$ en $(-\infty,${p})$ y en $(${q},+\infty)$ (decrece); $f'>0$ en $(${p},${q})$ (crece).`),
          r`**4. Extremos.** En $x=${maxX}$ hay un **máximo** (${s === 1 ? "pasa de crecer a decrecer" : "pasa de crecer a decrecer"}) y en $x=${minX}$ un **mínimo**.`,
          r`**5. Valores.** $f(${p})=${tx(fp)}$ y $f(${q})=${tx(fq)}$. Máximo: $(${maxX},\,${tx(fn(maxX))})$; mínimo: $(${minX},\,${tx(fn(minX))})$.`]
      };
    } });

  add({ id: "optimiza", tema: "deriv", nivel: 3, busca: "optimizacion", kw: /(optimiz|valla|cercar|m[aá]xima|[aá]rea m[aá]x|per[ií]metro)/i,
    gen: function () {
      if (Math.random() < 0.7) {
        var L = P([40, 60, 80, 100, 120, 160, 200]), x = L / 4, y = L / 2, A = x * y;
        return {
          titulo: "Optimización: cercar un terreno junto a un río",
          enunciado: "Un agricultor dispone de **" + L + " m** de valla para cercar un terreno rectangular junto a un río. En el lado del río no hace falta valla. ¿Qué dimensiones dan el **área máxima**?",
          datos: ["Longitud total de valla: " + L + " m", "Solo se cercan 3 lados", "Variable: x = lado perpendicular al río"],
          preguntas: [{ t: "Dimensión $x$ de los lados perpendiculares al río.", ans: x, u: "m" }, { t: "Dimensión $y$ del lado paralelo al río.", ans: y, u: "m" }, { t: "Área máxima.", ans: A, u: "m²" }],
          figura: { tipo: "valla", etX: "x", etY: "y" },
          pistas: ["Llama $x$ a los dos lados perpendiculares al río e $y$ al paralelo. La valla total es $2x+y=" + L + "$.", r`Despeja $y=${L}-2x$ y escribe el área $A(x)=x\,y$ como función de una sola variable.`, "Deriva $A(x)$, iguala a 0 y comprueba con la segunda derivada que es un máximo."],
          solucion: [
            r`**1. Planteamiento.** Valla: $2x+y=${L}\Rightarrow y=${L}-2x$. Área: $A=x\,y$.`,
            r`**2. Función a maximizar.** $A(x)=x(${L}-2x)=${L}x-2x^2$, con $0<x<${L / 2}$.`,
            r`**3. Derivar.** $A'(x)=${L}-4x=0\Rightarrow x=${x}$ m.`,
            r`**4. Es máximo.** $A''(x)=-4<0$ ✓.`,
            r`**5. Resultado.** $y=${L}-2\cdot ${x}=${y}$ m y $A=${x}\cdot ${y}=${A}$ m².`]
        };
      }
      var s = P([4, 5, 6, 8, 10]), Ar = s * s;
      return {
        titulo: "Optimización: perímetro mínimo",
        enunciado: "De todos los rectángulos de **" + Ar + " cm²** de área, ¿cuál tiene el **perímetro mínimo**?",
        datos: ["Área fija: " + Ar + " cm²", "Lados $x$ e $y$ con $xy=" + Ar + "$"],
        preguntas: [{ t: "Lado $x$ del rectángulo de perímetro mínimo.", ans: s, u: "cm" }, { t: "Perímetro mínimo.", ans: 4 * s, u: "cm" }],
        pistas: ["Pon el área como $xy=" + Ar + "$ y despeja $y$.", r`El perímetro es $P(x)=2\left(x+\dfrac{${Ar}}{x}\right)$. Deriva.`],
        solucion: [
          r`**1.** $y=\dfrac{${Ar}}{x}$ y $P(x)=2x+2y=2x+\dfrac{${2 * Ar}}{x}$.`,
          r`**2.** $P'(x)=2-\dfrac{${2 * Ar}}{x^2}=0\Rightarrow x^2=${Ar}\Rightarrow x=${s}$ cm.`,
          r`**3.** $P''(x)=\dfrac{${4 * Ar}}{x^3}>0$: mínimo. Entonces $y=${s}$ (¡un cuadrado!) y $P=4\cdot ${s}=${4 * s}$ cm.`]
      };
    } });

  /* =================== VECTORES =================== */
  add({ id: "vectorBasico", tema: "vect", nivel: 1, busca: "vectores", kw: /(vector|punto medio|m[oó]dulo)/i,
    gen: function () {
      var A, B;
      do { A = [R(-4, 4), R(-4, 4)]; B = [R(-4, 6), R(-4, 6)]; } while (A[0] === B[0] && A[1] === B[1]);
      var dx = B[0] - A[0], dy = B[1] - A[1], mod = Math.hypot(dx, dy), M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], bd = bounds([A, B], 1, true);
      var base = { tipo: "plano", x: bd.x, y: bd.y, proporcion: "igual", puntos: { A: A, B: B }, segmentos: [{ de: "A", a: "B", flecha: true, n: "AB" }] };
      var sol = JSON.parse(JSON.stringify(base)); sol.puntos.M = { p: M, cls: "marca" };
      return {
        titulo: "Vector entre dos puntos",
        enunciado: "Dados los puntos $A(" + A[0] + "," + A[1] + ")$ y $B(" + B[0] + "," + B[1] + ")$, trabaja con el vector $\\overrightarrow{AB}$.",
        datos: ["A = (" + A + ")", "B = (" + B + ")"],
        preguntas: [{ t: "Componentes del vector $\\overrightarrow{AB}$ (separadas por «;»).", ans: [dx, dy] }, { t: "Módulo $|\\overrightarrow{AB}|$.", ans: mod }, { t: "Coordenadas del punto medio $M$ de $AB$ (separadas por «;»).", ans: M }],
        figura: base, figuraSol: sol,
        pistas: ["Las componentes de $\\overrightarrow{AB}$ son (extremo − origen): $B-A$.", r`El módulo es $\sqrt{u_1^2+u_2^2}$.`, r`El punto medio es la media de las coordenadas: $M=\left(\dfrac{x_A+x_B}{2},\dfrac{y_A+y_B}{2}\right)$.`],
        solucion: [
          r`**1. Componentes.** $\overrightarrow{AB}=B-A=(${B[0]}-${par(A[0])},\,${B[1]}-${par(A[1])})=(${dx},\,${dy})$.`,
          r`**2. Módulo.** $|\overrightarrow{AB}|=\sqrt{${dx}^2+${dy}^2}=\sqrt{${dx * dx + dy * dy}}\approx ${tx(mod)}$.`,
          r`**3. Punto medio.** $M=\left(\dfrac{${A[0]}+${par(B[0])}}{2},\dfrac{${A[1]}+${par(B[1])}}{2}\right)=(${tx(M[0])},\,${tx(M[1])})$.`]
      };
    } });

  add({ id: "escalar", tema: "vect", nivel: 2, busca: "producto escalar", kw: /(escalar|perpendicular|[aá]ngulo entre)/i,
    gen: function () {
      var u, v, cr;
      do { u = [R(-5, 5), R(-5, 5)]; v = [R(-5, 5), R(-5, 5)]; cr = u[0] * v[1] - u[1] * v[0]; } while (!u[0] || (!v[0] && !v[1]) || cr === 0);
      var dot = u[0] * v[0] + u[1] * v[1], mu = Math.hypot(u[0], u[1]), mv = Math.hypot(v[0], v[1]), th = acosD(dot / (mu * mv));
      var t = P([-3, -2, -1, 1, 2, 3]), e = u[0] * t, k = -u[1] * t, m = Math.max(Math.abs(u[0]), Math.abs(u[1]), Math.abs(v[0]), Math.abs(v[1])) + 1;
      return {
        titulo: "Producto escalar y ángulo",
        enunciado: "Sean los vectores $\\vec u=(" + u[0] + "," + u[1] + ")$ y $\\vec v=(" + v[0] + "," + v[1] + ")$.",
        datos: ["u = (" + u + ")", "v = (" + v + ")"],
        preguntas: [{ t: "Calcula $\\vec u\\cdot\\vec v$.", ans: dot }, { t: "Calcula el ángulo $\\theta$ que forman $\\vec u$ y $\\vec v$ (en grados).", ans: th, u: "°" }, { t: "Halla $k$ para que $\\vec w=(k,\\," + e + ")$ sea perpendicular a $\\vec u$.", ans: k }],
        figura: { tipo: "plano", x: [-m, m], y: [-m, m], proporcion: "igual", puntos: { O: { p: [0, 0], n: "", cls: "" }, U: { p: u, n: "" }, V: { p: v, n: "" } }, segmentos: [{ de: [0, 0], a: u, flecha: true, n: "u" }, { de: [0, 0], a: v, flecha: true, n: "v", color: "marca" }], angulos: [{ en: [0, 0], entre: [u, v], n: "θ", r: 26 }] },
        pistas: [r`$\vec u\cdot\vec v=u_1v_1+u_2v_2$.`, r`$\cos\theta=\dfrac{\vec u\cdot\vec v}{|\vec u|\,|\vec v|}$.`, r`Dos vectores son perpendiculares si su producto escalar es 0: $\vec w\cdot\vec u=0$.`],
        solucion: [
          r`**1. Producto escalar.** $\vec u\cdot\vec v=${par(u[0])}\cdot ${par(v[0])}+${par(u[1])}\cdot ${par(v[1])}=${dot}$.`,
          r`**2. Módulos.** $|\vec u|=\sqrt{${u[0] * u[0] + u[1] * u[1]}}\approx ${tx(mu, 3)}$ y $|\vec v|=\sqrt{${v[0] * v[0] + v[1] * v[1]}}\approx ${tx(mv, 3)}$.`,
          r`**3. Ángulo.** $\cos\theta=\dfrac{${dot}}{${tx(mu, 3)}\cdot ${tx(mv, 3)}}=${tx(dot / (mu * mv), 4)}\Rightarrow\theta=${tx(th)}^\circ$.`,
          r`**4. Perpendicularidad.** $\vec w\cdot\vec u=0\Rightarrow ${par(u[0])}\cdot k+${par(u[1])}\cdot ${par(e)}=0\Rightarrow ${sgnTerm(u[0], "k", true)}${sgnTerm(u[1] * e, "", false)}=0\Rightarrow k=${tx(k)}$.`]
      };
    } });

  add({ id: "paralelogramo", tema: "vect", nivel: 2, busca: "paralelogramo", kw: /(paralelogramo|cuarto v[eé]rtice)/i,
    gen: function () {
      var A, B, C;
      do { A = [R(-3, 3), R(-3, 3)]; B = [R(-2, 5), R(-3, 4)]; C = [R(-3, 6), R(-3, 6)]; } while ((B[0] - A[0]) * (C[1] - B[1]) - (B[1] - A[1]) * (C[0] - B[0]) === 0);
      var D = [A[0] + C[0] - B[0], A[1] + C[1] - B[1]], M = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2], bd = bounds([A, B, C, D], 1, true);
      var base = { tipo: "plano", x: bd.x, y: bd.y, proporcion: "igual", puntos: { A: A, B: B, C: C }, segmentos: [["A", "B"], ["B", "C"]] };
      var sol = { tipo: "plano", x: bd.x, y: bd.y, proporcion: "igual", puntos: { A: A, B: B, C: C, D: { p: D, cls: "marca" } }, poligono: ["A", "B", "C", "D"], segmentos: [{ de: "A", a: "C", trazo: "discontinuo", color: "angulo" }, { de: "B", a: "D", trazo: "discontinuo", color: "angulo" }] };
      return {
        titulo: "El cuarto vértice de un paralelogramo",
        enunciado: "Los puntos $A(" + A + ")$, $B(" + B + ")$ y $C(" + C + ")$ son tres vértices consecutivos de un paralelogramo $ABCD$.",
        datos: ["A = (" + A + ")", "B = (" + B + ")", "C = (" + C + ")", "En un paralelogramo, $\\overrightarrow{AB}=\\overrightarrow{DC}$"],
        preguntas: [{ t: "Halla las coordenadas del vértice $D$ (separadas por «;»).", ans: D }, { t: "Halla el punto de corte de las diagonales (separadas por «;»).", ans: M }],
        figura: base, figuraSol: sol,
        pistas: [r`En un paralelogramo $ABCD$ se cumple $\overrightarrow{AD}=\overrightarrow{BC}$ (lados opuestos iguales y paralelos).`, "Escribe $D-A=C-B$ y despeja $D$.", "Las diagonales se cortan en su punto medio: el punto medio de $AC$."],
        solucion: [
          r`**1. Condición.** $\overrightarrow{AD}=\overrightarrow{BC}\Rightarrow D-A=C-B\Rightarrow D=A+C-B$.`,
          r`**2. Cálculo.** $D=(${A[0]}+${par(C[0])}-${par(B[0])},\,${A[1]}+${par(C[1])}-${par(B[1])})=(${D[0]},\,${D[1]})$.`,
          r`**3. Diagonales.** Se cortan en el punto medio de $AC$: $M=\left(\dfrac{${A[0]}+${par(C[0])}}{2},\dfrac{${A[1]}+${par(C[1])}}{2}\right)=(${tx(M[0])},\,${tx(M[1])})$.`,
          r`**4. Comprobación.** El punto medio de $BD$ es $\left(\dfrac{${B[0]}+${par(D[0])}}{2},\dfrac{${B[1]}+${par(D[1])}}{2}\right)=(${tx((B[0] + D[0]) / 2)},\,${tx((B[1] + D[1]) / 2)})$, el mismo punto ✓.`]
      };
    } });

  /* =================== COMPLEJOS =================== */
  add({ id: "complejoOps", tema: "comp", nivel: 1, busca: "complejos", kw: /(complejo|binomica|binómica|conjugado)/i,
    gen: function () {
      var a, b, c, d;
      do { a = R(-5, 5); b = R(-5, 5); c = R(-3, 3); d = R(-3, 3); } while (!a || !b || !c || !d);
      var den = c * c + d * d, q = [(a * c + b * d) / den, (b * c - a * d) / den], pr = [a * c - b * d, a * d + b * c], s = [a + c, b + d], mod = Math.hypot(a, b);
      var m = Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d), Math.abs(s[0]), Math.abs(s[1])) + 1;
      var base = { tipo: "plano", x: [-m, m], y: [-m, m], proporcion: "igual", ejes: ["Re", "Im"], puntos: { z1: { p: [a, b], n: "z₁" }, z2: { p: [c, d], n: "z₂" } }, segmentos: [{ de: [0, 0], a: [a, b], flecha: true }, { de: [0, 0], a: [c, d], flecha: true, color: "marca" }] };
      var sol = JSON.parse(JSON.stringify(base)); sol.puntos.s = { p: s, n: "z₁+z₂", cls: "marca" };
      sol.segmentos.push({ de: [a, b], a: s, trazo: "discontinuo", color: "angulo" }, { de: [c, d], a: s, trazo: "discontinuo", color: "angulo" });
      return {
        titulo: "Operaciones con complejos",
        enunciado: "Sean $z_1=" + cx(a, b) + "$ y $z_2=" + cx(c, d) + "$. Realiza las operaciones indicadas.",
        datos: ["z₁ = " + a + (b < 0 ? " − " : " + ") + Math.abs(b) + "i", "z₂ = " + c + (d < 0 ? " − " : " + ") + Math.abs(d) + "i", "i² = −1"],
        preguntas: [{ t: "$z_1+z_2$ (parte real ; parte imaginaria).", ans: s }, { t: "$z_1\\cdot z_2$ (parte real ; parte imaginaria).", ans: pr }, { t: "$\\dfrac{z_1}{z_2}$ (parte real ; parte imaginaria, puedes escribir fracciones como 3/5).", ans: q }, { t: "Módulo $|z_1|$.", ans: mod }],
        figura: base, figuraSol: sol,
        pistas: ["La suma se hace componente a componente.", "En el producto, desarrolla y usa $i^2=-1$.", r`Para dividir, multiplica numerador y denominador por el **conjugado** del denominador: $\overline{z_2}=${cx(c, -d)}$.`],
        solucion: [
          r`**1. Suma.** $z_1+z_2=(${a}+${par(c)})+(${b}+${par(d)})i=${cx(s[0], s[1])}$.`,
          r`**2. Producto.** $(${cx(a, b)})(${cx(c, d)})=${a * c}${sgnTerm(a * d, "i", false)}${sgnTerm(b * c, "i", false)}${sgnTerm(b * d, "i^2", false)}=${cx(pr[0], pr[1])}$.`,
          r`**3. Cociente.** $\dfrac{z_1}{z_2}=\dfrac{(${cx(a, b)})(${cx(c, -d)})}{(${cx(c, d)})(${cx(c, -d)})}=\dfrac{${cx(a * c + b * d, b * c - a * d)}}{${den}}=${tx(q[0], 3)}${q[1] < 0 ? "-" : "+"}${tx(Math.abs(q[1]), 3)}i$.`,
          r`**4. Módulo.** $|z_1|=\sqrt{${a}^2+${b}^2}=\sqrt{${a * a + b * b}}\approx ${tx(mod)}$.`]
      };
    } });

  add({ id: "polar", tema: "comp", nivel: 2, busca: "polar", kw: /(polar|moivre|argumento|potencia de)/i,
    gen: function () {
      var base = P([
        { re: [1, 0], im: [1, 0], r: "\\sqrt{2}", rv: Math.SQRT2, ph: 45 }, { re: [-1, 0], im: [1, 0], r: "\\sqrt{2}", rv: Math.SQRT2, ph: 135 },
        { re: [-1, 0], im: [-1, 0], r: "\\sqrt{2}", rv: Math.SQRT2, ph: 225 }, { re: [1, 0], im: [-1, 0], r: "\\sqrt{2}", rv: Math.SQRT2, ph: 315 },
        { re: [1, 1], im: [1, 0], r: "2", rv: 2, ph: 30 }, { re: [1, 0], im: [1, 1], r: "2", rv: 2, ph: 60 },
        { re: [-1, 0], im: [1, 1], r: "2", rv: 2, ph: 120 }, { re: [-1, 1], im: [1, 0], r: "2", rv: 2, ph: 150 },
        { re: [-1, 1], im: [-1, 0], r: "2", rv: 2, ph: 210 }, { re: [1, 0], im: [-1, 1], r: "2", rv: 2, ph: 300 }]);
      /* re/im: [coef, usaRaiz3]  (si el 2.º es 1, el coeficiente multiplica a √3) */
      var k = P([1, 1, 2, 3]), n = P([3, 4, 5, 6]);
      function comp(c) { var cc = c[0], val = cc * (c[1] ? Math.sqrt(3) : 1); return { v: val * k, t: (cc < 0 ? "-" : "") + (c[1] ? ((k === 1 ? "" : k) + "\\sqrt{3}") : String(k)) }; }
      var re = comp(base.re), im = comp(base.im);
      var imT = im.t === "1" ? "" : im.t === "-1" ? "-" : im.t, tex = re.t + (imT.charAt(0) === "-" ? "" : "+") + imT + "i";
      var rr = base.rv * k, ph = base.ph, rn = Math.pow(rr, n), phn = (n * ph) % 360, m = Math.ceil(rr) + 1;
      var rtex = k === 1 ? base.r : (base.r === "2" ? String(2 * k) : k + base.r);
      return {
        titulo: "Forma polar y potencias",
        enunciado: "Dado el complejo $z=" + tex + "$, exprésalo en forma polar y calcula $z^{" + n + "}$.",
        datos: ["Forma polar: $z=r_\\varphi$ con $r=|z|$ y $\\varphi=\\arg z$", "Potencia (Moivre): $(r_\\varphi)^n=(r^n)_{n\\varphi}$"],
        preguntas: [{ t: "Módulo $r=|z|$.", ans: rr }, { t: "Argumento $\\varphi$ en grados (entre 0° y 360°).", ans: ph, u: "°" }, { t: "$z^{" + n + "}$: módulo ; argumento (entre 0° y 360°).", ans: [rn, phn] }],
        figura: { tipo: "plano", x: [-m, m], y: [-m, m], proporcion: "igual", ejes: ["Re", "Im"], puntos: { z: { p: [re.v, im.v], n: "z" } }, segmentos: [{ de: [0, 0], a: [re.v, im.v], flecha: true }], angulos: [{ en: [0, 0], de: 0, a: ph, n: "φ", r: 22 }] },
        pistas: [r`Módulo: $r=\sqrt{a^2+b^2}$ para $z=a+bi$.`, r`Argumento: $\tan\varphi=\dfrac{b}{a}$, pero decide el cuadrante mirando los signos de $a$ y $b$ (haz un dibujo).`, r`Moivre: eleva el módulo a $n$ y multiplica el argumento por $n$.`],
        solucion: [
          r`**1. Módulo.** $r=\sqrt{(${tx(re.v, 3)})^2+(${tx(im.v, 3)})^2}=\sqrt{${tx(re.v * re.v + im.v * im.v)}}=${rtex}\approx ${tx(rr)}$.`,
          r`**2. Argumento.** $\tan\varphi=\dfrac{${tx(im.v, 3)}}{${tx(re.v, 3)}}=${tx(im.v / re.v, 4)}$. Mirando los signos, $z$ está en el cuadrante ${re.v > 0 && im.v > 0 ? "I" : re.v < 0 && im.v > 0 ? "II" : re.v < 0 ? "III" : "IV"}, luego $\varphi=${ph}^\circ$.`,
          r`**3. Forma polar.** $z=(${rtex})_{${ph}^\circ}$.`,
          r`**4. Moivre.** $z^{${n}}=\left(${rtex}\right)^{${n}}_{\,${n}\cdot ${ph}^\circ}=(${tx(rn)})_{${n * ph}^\circ}$. Restando vueltas completas de $360^\circ$, el argumento queda en $${phn}^\circ$: $z^{${n}}=(${tx(rn)})_{${phn}^\circ}$.`]
      };
    } });

  /* =================== FUNCIONES Y LÍMITES =================== */
  add({ id: "asintotas", tema: "func", nivel: 2, busca: "asintotas", kw: /(as[ií]ntota|homogr|dominio)/i,
    gen: function () {
      var oblicua = Math.random() < 0.4, p = P([-3, -2, -1, 1, 2, 3]);
      if (!oblicua) {
        var a, b; do { a = P([1, 2, 3, -1, -2]); b = R(-4, 4); } while (b === a * p);
        var base = { tipo: "plano", x: [p - 5, p + 5], y: [a - 6, a + 6], funciones: [{ f: "(" + a + "*x+" + b + ")/(x-" + p + ")", etiqueta: "f(x)" }] };
        var sol = JSON.parse(JSON.stringify(base)); sol.rectas = [{ x: p }, { y: a }];
        return {
          titulo: "Asíntotas de una función racional",
          enunciado: "Estudia la función $f(x)=\\dfrac{" + polyTex([a, b]) + "}{x" + (p < 0 ? "+" + (-p) : "-" + p) + "}$ (observa su gráfica).",
          datos: ["Función racional (cociente de polinomios)"],
          preguntas: [{ t: "¿En qué valor $x=p$ hay una asíntota vertical?", ans: p }, { t: "¿Cuál es la ecuación de la asíntota horizontal $y=\\ell$? (indica $\\ell$)", ans: a }, { t: "Calcula $f(0)$ (corte con el eje $OY$).", ans: -b / p }],
          figura: base, figuraSol: sol,
          pistas: ["La asíntota vertical está donde se anula el denominador (y no el numerador).", r`La horizontal es $\displaystyle\lim_{x\to\infty}f(x)$: compara los coeficientes de mayor grado.`, "Para $f(0)$ sustituye $x=0$."],
          solucion: [
            r`**1. Dominio.** El denominador se anula en $x=${p}$, luego $\text{Dom}\,f=\mathbb{R}\setminus\{${p}\}$.`,
            r`**2. Asíntota vertical.** $\displaystyle\lim_{x\to ${p}^\pm}f(x)=\pm\infty$ (el numerador en $x=${p}$ vale ${a * p + b}\neq 0$). Asíntota: $x=${p}$.`,
            r`**3. Asíntota horizontal.** $\displaystyle\lim_{x\to\pm\infty}\dfrac{${polyTex([a, b])}}{x${p < 0 ? "+" + (-p) : "-" + p}}=${a}$. Asíntota: $y=${a}$.`,
            r`**4. Corte con OY.** $f(0)=\dfrac{${b}}{${-p}}=${tx(-b / p)}$.`]
        };
      }
      var k = R(-2, 2), b0 = R(-3, 3), Rm = b0 + p * (k + p), nn = k + p;
      if (Rm === 0) b0 += 1;
      var f = "(x^2+" + k + "*x+" + b0 + ")/(x-" + p + ")";
      var lo = Math.min(p - 6, p + 6) + nn, hi = p + 6 + nn, base2 = { tipo: "plano", x: [p - 6, p + 6], y: [Math.floor(lo - 4), Math.ceil(hi + 4)], funciones: [{ f: f, etiqueta: "f(x)" }] };
      var sol2 = JSON.parse(JSON.stringify(base2)); sol2.rectas = [{ x: p }, { m: 1, n: nn }];
      var Rm2 = b0 + p * (k + p);
      return {
        titulo: "Asíntota oblicua",
        enunciado: "Estudia la función $f(x)=\\dfrac{" + polyTex([1, k, b0]) + "}{x" + (p < 0 ? "+" + (-p) : "-" + p) + "}$ (observa su gráfica).",
        datos: ["Grado del numerador = grado del denominador + 1 → posible asíntota oblicua $y=mx+n$"],
        preguntas: [{ t: "Asíntota vertical $x=p$: indica $p$.", ans: p }, { t: "Pendiente $m$ de la asíntota oblicua.", ans: 1 }, { t: "Ordenada $n$ de la asíntota oblicua $y=mx+n$.", ans: nn }],
        figura: base2, figuraSol: sol2,
        pistas: ["La vertical está donde se anula el denominador.", r`$m=\displaystyle\lim_{x\to\infty}\dfrac{f(x)}{x}$ y $n=\displaystyle\lim_{x\to\infty}(f(x)-mx)$. También sirve dividir los polinomios.`, "Haz la división: el cociente es la asíntota oblicua."],
        solucion: [
          r`**1. Vertical.** $x=${p}$ anula el denominador y el numerador vale ${p * p + k * p + b0}\neq 0$: asíntota vertical $x=${p}$.`,
          r`**2. División.** $\dfrac{${polyTex([1, k, b0])}}{x${p < 0 ? "+" + (-p) : "-" + p}}=x${sgnTerm(nn, "", false)}+\dfrac{${Rm2}}{x${p < 0 ? "+" + (-p) : "-" + p}}$.`,
          r`**3. Oblicua.** Como $\dfrac{${Rm2}}{x${p < 0 ? "+" + (-p) : "-" + p}}\to 0$, la asíntota es $y=x${sgnTerm(nn, "", false)}$: $m=1$, $n=${nn}$.`]
      };
    } });

  add({ id: "limites", tema: "func", nivel: 2, busca: "limites", kw: /(l[ií]mite)/i,
    gen: function () {
      var a = R(1, 6), d = R(1, 4), b = R(-4, 4), c = R(-3, 3), e = R(-4, 4), f = R(-3, 3);
      var p = R(1, 4), q = R(-3, 3); while (q === p) q = R(-3, 3);
      var s1 = R(2, 7), s2 = R(2, 5); while (s1 === s2) s2 = R(2, 5);
      return {
        titulo: "Cálculo de límites",
        enunciado: "Calcula los siguientes límites:\n\n(a) $\\displaystyle\\lim_{x\\to\\infty}\\dfrac{" + polyTex([a, b, c]) + "}{" + polyTex([d, e, f]) + "}$\n\n(b) $\\displaystyle\\lim_{x\\to " + p + "}\\dfrac{" + polyTex([1, -(p + q), p * q]) + "}{x" + (p > 0 ? "-" + p : "+" + (-p)) + "}$\n\n(c) $\\displaystyle\\lim_{x\\to 0}\\dfrac{\\sin(" + s1 + "x)}{" + s2 + "x}$",
        datos: ["(a) Compara los grados de numerador y denominador", "(b) Aparece una indeterminación $0/0$", "(c) Límite notable: $\\lim_{u\\to0}\\frac{\\sin u}{u}=1$"],
        preguntas: [{ t: "Límite (a).", ans: a / d }, { t: "Límite (b).", ans: p - q }, { t: "Límite (c) (puedes escribir una fracción).", ans: s1 / s2 }],
        pistas: ["(a) Divide numerador y denominador por $x^2$, o fíjate solo en los términos de mayor grado.", "(b) Factoriza el numerador: tiene una raíz $x=" + p + "$, así que se puede simplificar con el denominador.", "(c) Multiplica y divide para que dentro del seno y debajo aparezca lo mismo."],
        solucion: [
          r`**(a)** Mismo grado: el límite es el cociente de los coeficientes principales, $\dfrac{${a}}{${d}}=${tx(a / d)}$.`,
          r`**(b)** $x^2${sgnTerm(-(p + q), "x", false)}${sgnTerm(p * q, "", false)}=(x-${par(p)})(x-${par(q)})$. Simplificando $(x-${par(p)})$: $\displaystyle\lim_{x\to ${p}}(x-${par(q)})=${p}-${par(q)}=${p - q}$.`,
          r`**(c)** $\dfrac{\sin(${s1}x)}{${s2}x}=\dfrac{${s1}}{${s2}}\cdot\dfrac{\sin(${s1}x)}{${s1}x}\to\dfrac{${s1}}{${s2}}\cdot 1=${tx(s1 / s2, 4)}$.`]
      };
    } });

  /* =================== EXPONENCIALES Y LOGARITMOS =================== */
  add({ id: "exponencial", tema: "exp", nivel: 1, busca: "logaritmo", kw: /(exponencial|ecuaci[oó]n exp)/i,
    gen: function () {
      var bs = P([2, 3, 5]), n = R(2, 4), m = P([1, 2, 3]), k = R(-2, 3), B = Math.pow(bs, n), x = (n - k) / m, N = P([7, 10, 11, 12, 20, 30, 50]), x3 = Math.log(N) / Math.log(bs);
      var ex = m === 1 ? "x" : m + "x";
      return {
        titulo: "Ecuaciones exponenciales",
        enunciado: "Resuelve: (a) $" + bs + "^{" + ex + sgnTerm(k, "", false) + "}=" + B + "$  (b) $" + bs + "^{x}=" + N + "$",
        datos: ["Si $a^u=a^v$ entonces $u=v$", "Definición: $a^x=b\\iff x=\\log_a b$"],
        preguntas: [{ t: "Solución de (a).", ans: x }, { t: "Solución de (b) (con decimales; puedes usar una calculadora).", ans: x3 }],
        pistas: ["En (a) escribe " + B + " como potencia de " + bs + " y iguala los exponentes.", r`En (b) no se puede igualar bases: toma logaritmos, $x=\log_{${bs}} ${N}=\dfrac{\ln ${N}}{\ln ${bs}}$.`],
        solucion: [
          r`**(a)** $${B}=${bs}^{${n}}$, luego $${bs}^{${ex}${sgnTerm(k, "", false)}}=${bs}^{${n}}\Rightarrow ${ex}${sgnTerm(k, "", false)}=${n}\Rightarrow x=\dfrac{${n - k}}{${m}}=${tx(x)}$.`,
          r`**(b)** $x=\log_{${bs}} ${N}=\dfrac{\ln ${N}}{\ln ${bs}}=\dfrac{${tx(Math.log(N), 4)}}{${tx(Math.log(bs), 4)}}\approx ${tx(x3, 3)}$.`]
      };
    } });

  add({ id: "logEcuacion", tema: "exp", nivel: 2, busca: "logaritmo", kw: /(logar[ií]tmic|ecuaci[oó]n log|logaritmo)/i,
    gen: function () {
      var t = P([[2, 4, 3, 5], [2, 6, 6, 10], [3, 2, 4, 5], [5, 2, 12, 13], [2, 3, 1, 3], [3, 3, 3, 6]]), b = t[0], n = t[1], p = t[2], s = t[3], Bn = Math.pow(b, n);
      return {
        titulo: "Ecuación logarítmica",
        enunciado: "Resuelve la ecuación $\\log_{" + b + "}(x+" + p + ")+\\log_{" + b + "}(x-" + p + ")=" + n + "$.",
        datos: ["$\\log_a A+\\log_a B=\\log_a(AB)$", "Comprueba siempre que los argumentos de los logaritmos sean positivos"],
        preguntas: [{ t: "Solución $x$ de la ecuación.", ans: s }],
        pistas: ["Usa la suma de logaritmos para dejar un único logaritmo en el miembro izquierdo.", r`Después $\log_a A=n\iff A=a^n$.`, "Te saldrá una ecuación de segundo grado con dos raíces: comprueba cuál es válida."],
        solucion: [
          r`**1. Un solo logaritmo.** $\log_{${b}}\big[(x+${p})(x-${p})\big]=${n}\Rightarrow \log_{${b}}(x^2-${p * p})=${n}$.`,
          r`**2. Exponenciar.** $x^2-${p * p}=${b}^{${n}}=${Bn}\Rightarrow x^2=${Bn + p * p}\Rightarrow x=\pm ${s}$.`,
          r`**3. Dominio.** Hace falta $x+${p}>0$ y $x-${p}>0$, es decir $x>${p}$. Por tanto $x=-${s}$ **no vale** y la solución es $x=${s}$.`,
          r`**4. Comprobación.** $\log_{${b}}(${s + p})+\log_{${b}}(${s - p})=\log_{${b}}${(s + p) * (s - p)}=\log_{${b}}${b}^{${n}}=${n}$ ✓.`]
      };
    } });

  add({ id: "crecimiento", tema: "exp", nivel: 2, busca: "exponencial", kw: /(crecimiento|poblaci[oó]n|bacteria|inter[eé]s)/i,
    gen: function () {
      var P0 = P([100, 200, 500, 1000]), f = P([2, 3, 4]), t1 = P([2, 3, 4, 5]), T = t1 + R(1, t1), P1 = f * P0, k = Math.log(f) / t1, PT = P0 * Math.exp(k * T), td = Math.LN2 / k;
      var kk = +k.toFixed(6);
      return {
        titulo: "Crecimiento exponencial",
        enunciado: "Un cultivo de bacterias crece según $P(t)=P_0\\,e^{kt}$ ($t$ en horas). Al empezar hay **" + P0 + "** bacterias y al cabo de **" + t1 + " h** hay **" + P1 + "**.",
        datos: ["P(0) = " + P0, "P(" + t1 + ") = " + P1, "Modelo: P(t) = P₀·e^(kt)"],
        preguntas: [{ t: "Calcula la constante $k$ (por hora).", ans: k, tol: 0.01 }, { t: "¿Cuántas bacterias habrá a las " + T + " horas?", ans: PT, tol: 0.03 }, { t: "¿Cuánto tarda la población en duplicarse (en horas)?", ans: td, tol: 0.02, u: "h" }],
        figura: { tipo: "plano", x: [0, T * 1.1], y: [0, Math.ceil(PT * 1.1 / 100) * 100], ejes: ["t (h)", "P"], funciones: [{ f: P0 + "*exp(" + kk + "*x)", etiqueta: "P(t)" }], puntos: { A: { p: [0, P0], n: P0 + "", pos: "ne" }, B: { p: [t1, P1], n: "(" + t1 + ", " + P1 + ")", pos: "se" } } },
        pistas: [r`Usa el dato de $t=${t1}$: $${P1}=${P0}\,e^{${t1}k}$ y despeja $e^{${t1}k}$.`, r`Toma logaritmos neperianos: $${t1}k=\ln ${f}$.`, r`Duplicarse: $2P_0=P_0e^{kt}\Rightarrow t=\dfrac{\ln 2}{k}$.`],
        solucion: [
          r`**1. Constante $k$.** $${P1}=${P0}e^{${t1}k}\Rightarrow e^{${t1}k}=${f}\Rightarrow ${t1}k=\ln ${f}\Rightarrow k=\dfrac{\ln ${f}}{${t1}}\approx ${tx(k, 4)}$ h⁻¹.`,
          r`**2. Población a las ${T} h.** $P(${T})=${P0}\,e^{${tx(k, 4)}\cdot ${T}}\approx ${tx(PT, 0)}$ bacterias.`,
          r`**3. Tiempo de duplicación.** $2P_0=P_0e^{kt}\Rightarrow t=\dfrac{\ln 2}{k}=\dfrac{${tx(Math.LN2, 4)}}{${tx(k, 4)}}\approx ${tx(td)}$ h.`]
      };
    } });

  /* =================== API =================== */
  function crear(o) {
    o = o || {};
    var list = T.filter(function (t) { return !o.tema || t.tema === o.tema; }), pick = null;
    if (o.plantilla) pick = T.filter(function (t) { return t.id === o.plantilla; })[0] || null;
    if (!pick && o.texto) {
      var hit = list.filter(function (t) { return t.kw && t.kw.test(o.texto); });
      if (hit.length) { var h2 = hit.filter(function (t) { return t.id !== o.evitar; }); pick = P(h2.length ? h2 : hit); }
    }
    if (!pick) {
      var lvl = o.nivel || 2, best = Math.min.apply(null, list.map(function (t) { return Math.abs(t.nivel - lvl); }));
      var c = list.filter(function (t) { return Math.abs(t.nivel - lvl) === best && t.id !== o.evitar; });
      pick = P(c.length ? c : list);
    }
    var p = pick.gen();
    p.id = pick.id; p.tema = pick.tema; p.temaNombre = TEMAS[pick.tema]; p.nivel = pick.nivel; p.nivelNombre = NIVELES[pick.nivel]; p.busca = pick.busca;
    return p;
  }
  global.Generador = { crear: crear, temas: TEMAS, niveles: NIVELES, plantillas: T, fx: fx };
})(window);
