/* OpenStinger house figures — black / yellow instrument language.
   Craft borrowed (stations, hairline grid, bezier packets, FIG plates).
   Tokens and type stay OpenStinger. */
(function () {
  "use strict";

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function tokens() {
    return {
      black: cssVar("--black", "#080808"),
      surface: cssVar("--surface", "#111111"),
      surface2: cssVar("--surface2", "#181818"),
      border: cssVar("--border", "#242424"),
      yellow: cssVar("--yellow", "#f5c400"),
      yellowDim: cssVar("--yellow-dim", "#c49e00"),
      orange: cssVar("--orange", "#ff7a00"),
      red: cssVar("--red", "#e8326e"),
      white: cssVar("--white", "#efefef"),
      grey: cssVar("--grey", "#777"),
      sans: cssVar("--font", "Inter, system-ui, sans-serif"),
      mono: cssVar("--mono", "'JetBrains Mono', ui-monospace, monospace"),
    };
  }

  function prefersReduced() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function hexAlpha(hex, a) {
    const h = hex.replace("#", "");
    const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  function fit(ctx, text, max) {
    if (ctx.measureText(text).width <= max) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
    return t + "…";
  }

  function fillTracked(ctx, text, x, y, tracking) {
    let cx = x;
    const s = String(text);
    for (let i = 0; i < s.length; i++) {
      ctx.fillText(s[i], cx, y);
      cx += ctx.measureText(s[i]).width + tracking;
    }
    return cx;
  }

  function bezier(t, a, c, b) {
    const mt = 1 - t;
    return {
      x: mt * mt * a.x + 2 * mt * t * c.x + t * t * b.x,
      y: mt * mt * a.y + 2 * mt * t * c.y + t * t * b.y,
    };
  }

  function drawGrid(ctx, w, h, T) {
    ctx.strokeStyle = hexAlpha(T.white, 0.035);
    ctx.lineWidth = 1;
    const step = 24;
    ctx.beginPath();
    for (let x = step; x < w; x += step) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, h);
    }
    for (let y = step; y < h; y += step) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
    }
    ctx.stroke();
  }

  function strokeRect(ctx, x, y, w, h) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.stroke();
  }

  function fillStrokeRect(ctx, x, y, w, h) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();
  }

  function packet(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
    ctx.strokeStyle = hexAlpha(color, 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(x - 5.5, y - 5.5, 11, 11);
    ctx.stroke();
  }

  function stationFrame(ctx, box, T, active, accent) {
    const a = Math.max(0, Math.min(1, active));
    ctx.strokeStyle = a > 0.02 ? hexAlpha(accent, 0.22 + a * 0.5) : hexAlpha(T.white, 0.12);
    ctx.fillStyle = hexAlpha(accent, a * 0.06);
    ctx.lineWidth = 1;
    fillStrokeRect(ctx, box.x, box.y, box.w, box.h);
  }

  function ticks(ctx, box, T) {
    const c = 8;
    ctx.strokeStyle = hexAlpha(T.white, 0.22);
    ctx.lineWidth = 1;
    const pts = [
      [box.x + 5, box.y + 5, 1, 1],
      [box.x + box.w - 5, box.y + 5, -1, 1],
      [box.x + 5, box.y + box.h - 5, 1, -1],
      [box.x + box.w - 5, box.y + box.h - 5, -1, -1],
    ];
    pts.forEach(function (p) {
      ctx.beginPath();
      ctx.moveTo(p[0] + c * p[2], p[1]);
      ctx.lineTo(p[0], p[1]);
      ctx.lineTo(p[0], p[1] + c * p[3]);
      ctx.stroke();
    });
  }

  function connector(ctx, a, b, p, T, color) {
    const sameRow = Math.abs(a.y - b.y) < 4;
    let s, e;
    if (sameRow) {
      if (b.x < a.x) {
        s = { x: a.x, y: a.y + a.h / 2 };
        e = { x: b.x + b.w, y: b.y + b.h / 2 };
      } else {
        s = { x: a.x + a.w, y: a.y + a.h / 2 };
        e = { x: b.x, y: b.y + b.h / 2 };
      }
    } else {
      s = { x: a.x + a.w / 2, y: a.y + a.h };
      e = { x: b.x + b.w / 2, y: b.y };
    }
    ctx.strokeStyle = hexAlpha(T.white, 0.12);
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(e.x, e.y);
    ctx.stroke();
    ctx.setLineDash([]);
    if (p > 0 && p < 1) {
      packet(ctx, s.x + (e.x - s.x) * p, s.y + (e.y - s.y) * p, color);
    }
  }

  function legend(ctx, items, x, y, T, fs) {
    ctx.font = "500 " + fs + "px " + T.mono;
    ctx.textBaseline = "middle";
    let lx = x;
    items.forEach(function (it) {
      ctx.fillStyle = it.color;
      ctx.fillRect(lx, y - 2, 8, 3);
      ctx.fillStyle = hexAlpha(T.white, 0.38);
      ctx.fillText(it.label, lx + 13, y);
      lx += 13 + ctx.measureText(it.label).width + 16;
    });
  }

  /* ── FIG. WRITE / RECALL ─────────────────────────────────── */
  function drawRecall(ctx, w, h, state, T, reduced) {
    const CLIENTS = ["Cursor", "Claude Code", "OpenClaw", "Your agent"];
    const ROWS = [
      "episode · session jsonl",
      "entity · 3-stage dedup",
      "fact · valid_at / recorded_at",
      "thread · memory_query",
      "note · vault identity",
      "event · alignment log",
    ];

    drawGrid(ctx, w, h, T);

    const pad = 12;
    const chipW = Math.min(118, Math.max(78, w * 0.26));
    const coreX = pad + chipW + Math.max(22, w * 0.055);
    const fs = w < 420 ? 8 : 9.5;
    const box = { x: coreX, y: h * 0.12, w: w - coreX - pad, h: h * 0.7 };

    function clientPos(i) {
      return { x: pad + chipW, y: h * (0.22 + i * 0.19) };
    }
    function rowPos(i) {
      const rp = 10;
      const rowH = (box.h - rp * 2) / ROWS.length;
      return { x: box.x + rp, y: box.y + rp + rowH * i, w: box.w - rp * 2, h: rowH - 4 };
    }

    CLIENTS.forEach(function (_, i) {
      const a = clientPos(i);
      const b = { x: box.x, y: box.y + box.h * (0.18 + i * 0.2) };
      const c = { x: (a.x + b.x) / 2 + 16, y: a.y };
      ctx.strokeStyle = hexAlpha(T.white, 0.14);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
      ctx.stroke();
    });

    ctx.font = "500 " + fs + "px " + T.sans;
    ctx.textBaseline = "middle";
    CLIENTS.forEach(function (name, i) {
      const p = clientPos(i);
      ctx.strokeStyle = hexAlpha(T.white, 0.18);
      ctx.fillStyle = hexAlpha(T.black, 0.85);
      fillStrokeRect(ctx, pad, p.y - 11, chipW, 22);
      ctx.fillStyle = hexAlpha(T.white, 0.72);
      ctx.fillText(fit(ctx, name, chipW - 22), pad + 8, p.y + 0.5);
      ctx.fillStyle = T.yellow;
      ctx.fillRect(p.x - 6, p.y - 1.5, 3, 3);
    });

    ctx.strokeStyle = hexAlpha(T.yellow, 0.38);
    ctx.fillStyle = hexAlpha(T.yellow, 0.04);
    fillStrokeRect(ctx, box.x, box.y, box.w, box.h);

    ctx.fillStyle = hexAlpha(T.yellow, 0.88);
    ctx.font = "600 " + (fs - 0.5) + "px " + T.mono;
    fillTracked(ctx, "OPENSTINGER · MEMORY", box.x, box.y - 10, 0.6);

    ctx.font = "500 " + (fs - 0.5) + "px " + T.mono;
    ROWS.forEach(function (label, i) {
      const r = rowPos(i);
      const heat = state.rowHeat[i] || 0;
      ctx.strokeStyle = hexAlpha(T.white, 0.1 + heat * 0.42);
      ctx.fillStyle = hexAlpha(T.yellow, heat * 0.14);
      fillStrokeRect(ctx, r.x, r.y, r.w, r.h);
      ctx.fillStyle = hexAlpha(T.white, 0.42 + heat * 0.48);
      ctx.fillText(fit(ctx, label, r.w - 20), r.x + 8, r.y + r.h / 2);
      ctx.fillStyle = heat > 0.05 ? T.orange : hexAlpha(T.white, 0.22);
      ctx.fillRect(r.x + r.w - 8, r.y + r.h / 2 - 1.5, 3, 3);
    });

    state.packets.forEach(function (p) {
      const a = clientPos(p.client);
      const r = rowPos(p.row);
      const b = { x: box.x, y: r.y + r.h / 2 };
      const c = { x: (a.x + b.x) / 2 + 16, y: a.y };
      const t = p.dir === 1 ? p.t : 1 - p.t;
      const pos = bezier(Math.max(0, Math.min(1, t)), a, c, b);
      packet(ctx, pos.x, pos.y, p.dir === 1 ? T.yellow : T.orange);
    });

    legend(
      ctx,
      [
        { color: T.yellow, label: "write" },
        { color: T.orange, label: "recall" },
      ],
      pad,
      h * 0.94,
      T,
      fs - 0.5
    );

    if (reduced && state.packets.length === 0) {
      packet(ctx, (clientPos(0).x + box.x) / 2, clientPos(0).y, T.yellow);
      packet(ctx, (clientPos(1).x + box.x) / 2 + 8, clientPos(1).y, T.orange);
    }
  }

  function stepRecall(state, dt, reduced) {
    if (reduced) return;
    const nClients = 4;
    const nRows = 6;
    for (let i = state.packets.length - 1; i >= 0; i--) {
      const p = state.packets[i];
      p.t += dt * 0.55;
      if (p.t >= 1) {
        state.rowHeat[p.row] = 1;
        state.packets.splice(i, 1);
      }
    }
    for (let i = 0; i < state.rowHeat.length; i++) {
      state.rowHeat[i] = Math.max(0, state.rowHeat[i] - dt * 0.55);
    }
    state.spawnAt -= dt;
    if (state.spawnAt <= 0 && state.packets.length < 4) {
      state.spawnAt = 0.75 + Math.random() * 0.7;
      state.packets.push({
        client: Math.floor(Math.random() * nClients),
        row: Math.floor(Math.random() * nRows),
        dir: Math.random() > 0.45 ? 1 : -1,
        t: 0,
      });
    }
  }

  /* ── FIG. WRITE · STORE · DISTILL · RECALL ───────────────── */
  function pipelineBoxes(w, h) {
    const pad = 14;
    const top = pad + 16;
    const bottom = h - pad - 20;
    const usable = bottom - top;
    if (w / Math.max(h, 1) > 1.45) {
      const gap = Math.max(18, w * 0.03);
      const bw = (w - pad * 2 - gap * 3) / 4;
      return [0, 1, 2, 3].map(function (i) {
        return { x: pad + (bw + gap) * i, y: top, w: bw, h: usable };
      });
    }
    const gap = 22;
    const bh = (usable - gap * 3) / 4;
    return [0, 1, 2, 3].map(function (i) {
      return { x: pad, y: top + (bh + gap) * i, w: w - pad * 2, h: bh };
    });
  }

  function drawWriteStation(ctx, box, p, held, T, fs) {
    const clients = ["Cursor", "Claude Code", "OpenClaw"];
    const pad = 10;
    const rowH = Math.min(22, (box.h - pad * 2) / 5);
    const top = box.y + pad + 4;
    ctx.font = "500 " + (fs - 1) + "px " + T.sans;
    ctx.textBaseline = "middle";
    clients.forEach(function (name, i) {
      const appear = Math.max(0, Math.min(1, p * clients.length - i));
      if (appear <= 0 && held <= 0) return;
      const y = top + rowH * i;
      ctx.globalAlpha = held ? 1 : appear;
      ctx.strokeStyle = hexAlpha(T.white, 0.16);
      ctx.fillStyle = hexAlpha(T.black, 0.5);
      fillStrokeRect(ctx, box.x + pad, y, box.w - pad * 2, rowH - 4);
      ctx.fillStyle = hexAlpha(T.white, 0.7);
      ctx.fillText(fit(ctx, name, box.w - pad * 2 - 20), box.x + pad + 7, y + (rowH - 4) / 2);
      ctx.fillStyle = T.yellow;
      ctx.fillRect(box.x + box.w - pad - 12, y + (rowH - 4) / 2 - 1.5, 3, 3);
      ctx.globalAlpha = 1;
    });
    ctx.font = "500 " + (fs - 1.5) + "px " + T.mono;
    ctx.fillStyle = hexAlpha(T.yellow, held || p > 0.7 ? 0.85 : 0.35);
    ctx.fillText(fit(ctx, "localhost:8766/sse", box.w - pad * 2), box.x + pad, box.y + box.h - pad - 4);
    ticks(ctx, box, T);
  }

  function drawStoreStation(ctx, box, p, held, T, fs) {
    const rows = [
      "valid_at · recorded_at",
      "graph + vectors",
      "3-stage dedup",
      "12 audit tables",
    ];
    const pad = 10;
    const rowH = Math.min(24, (box.h - pad * 2) / rows.length);
    const top = box.y + (box.h - rowH * rows.length) / 2;
    ctx.font = "500 " + (fs - 1) + "px " + T.mono;
    ctx.textBaseline = "middle";
    rows.forEach(function (label, i) {
      const appear = Math.max(held, Math.min(1, p * rows.length - i));
      if (appear <= 0) return;
      const y = top + rowH * i;
      ctx.globalAlpha = appear;
      ctx.strokeStyle = hexAlpha(T.yellow, 0.22 + appear * 0.25);
      ctx.fillStyle = hexAlpha(T.yellow, 0.04 + appear * 0.05);
      fillStrokeRect(ctx, box.x + pad, y, box.w - pad * 2, rowH - 4);
      ctx.fillStyle = hexAlpha(T.white, 0.55 + appear * 0.3);
      ctx.fillText(fit(ctx, label, box.w - pad * 2 - 16), box.x + pad + 7, y + (rowH - 4) / 2);
      ctx.globalAlpha = 1;
    });
  }

  function drawDistillStation(ctx, box, p, held, T, fs) {
    const notes = [
      { name: "identity", c: T.yellow },
      { name: "domain", c: T.orange },
      { name: "methodology", c: T.white },
      { name: "preference", c: T.grey },
      { name: "constraint", c: T.red },
    ];
    const pad = 10;
    const rowH = Math.min(22, (box.h - pad * 2) / notes.length);
    const top = box.y + (box.h - rowH * notes.length) / 2;
    ctx.font = "500 " + (fs - 1) + "px " + T.mono;
    ctx.textBaseline = "middle";
    notes.forEach(function (n, i) {
      const appear = Math.max(held, Math.min(1, p * notes.length - i));
      if (appear <= 0) return;
      const y = top + rowH * i;
      ctx.globalAlpha = appear;
      ctx.strokeStyle = hexAlpha(n.c, 0.35);
      ctx.fillStyle = hexAlpha(n.c, 0.06);
      fillStrokeRect(ctx, box.x + pad, y, box.w - pad * 2, rowH - 4);
      ctx.fillStyle = hexAlpha(T.white, 0.72);
      ctx.fillText(fit(ctx, n.name, box.w - pad * 2 - 18), box.x + pad + 7, y + (rowH - 4) / 2);
      ctx.fillStyle = n.c;
      ctx.fillRect(box.x + box.w - pad - 12, y + (rowH - 4) / 2 - 1.5, 3, 3);
      ctx.globalAlpha = 1;
    });
  }

  function drawRecallStation(ctx, box, p, held, T, fs) {
    const lines = [
      { t: "memory_query", c: T.yellow },
      { t: "memory_wake_up", c: T.orange },
      { t: "pass", c: T.yellow },
      { t: "soft_flag", c: T.orange },
      { t: "hard_block", c: T.red },
    ];
    const pad = 10;
    const rowH = Math.min(22, (box.h - pad * 2) / lines.length);
    const top = box.y + (box.h - rowH * lines.length) / 2;
    ctx.font = "500 " + (fs - 1) + "px " + T.mono;
    ctx.textBaseline = "middle";
    lines.forEach(function (n, i) {
      const appear = Math.max(held, Math.min(1, p * lines.length - i));
      if (appear <= 0) return;
      const y = top + rowH * i;
      ctx.globalAlpha = appear;
      ctx.strokeStyle = hexAlpha(n.c, 0.32);
      ctx.fillStyle = hexAlpha(n.c, 0.05);
      fillStrokeRect(ctx, box.x + pad, y, box.w - pad * 2, rowH - 4);
      ctx.fillStyle = hexAlpha(T.white, 0.7);
      ctx.fillText(fit(ctx, n.t, box.w - pad * 2 - 12), box.x + pad + 7, y + (rowH - 4) / 2);
      ctx.globalAlpha = 1;
    });
  }

  function drawPipeline(ctx, w, h, state, T, reduced) {
    const STAGES = ["01 · WRITE", "02 · STORE", "03 · DISTILL", "04 · RECALL"];
    const accents = [T.yellow, T.yellow, T.orange, T.orange];
    const CYCLE = 7.6;
    const t = reduced ? 6.6 : state.clock;
    const held = reduced || state.settled ? 1 : 0;
    const span = function (start, len) {
      return Math.max(0, Math.min(1, (t - start) / len));
    };

    drawGrid(ctx, w, h, T);
    const boxes = pipelineBoxes(w, h);
    const fs = w < 460 ? 8 : 9.5;

    const writeP = span(0.15, 1.5);
    const storeP = Math.max(span(2.1, 1.2), held);
    const distillP = Math.max(span(3.7, 1.3), held);
    const recallP = Math.max(span(5.3, 0.9), held);
    const hops = [span(1.7, 0.4), span(3.35, 0.35), span(5.0, 0.3)];
    const active = [
      writeP > 0 && writeP < 1 ? 1 : writeP >= 1 ? 0.35 : 0,
      storeP > 0 && storeP < 1 ? 1 : storeP >= 1 ? 0.35 : 0,
      distillP > 0 && distillP < 1 ? 1 : distillP >= 1 ? 0.35 : 0,
      recallP > 0 ? 1 : 0,
    ];

    for (let i = 0; i < 3; i++) connector(ctx, boxes[i], boxes[i + 1], hops[i], T, accents[i + 1]);

    boxes.forEach(function (box, i) {
      stationFrame(ctx, box, T, active[i], accents[i]);
    });

    ctx.font = "600 " + fs + "px " + T.mono;
    ctx.textBaseline = "middle";
    boxes.forEach(function (box, i) {
      ctx.fillStyle = active[i] > 0.5 ? accents[i] : hexAlpha(T.white, 0.38);
      fillTracked(ctx, STAGES[i], box.x, box.y - 9, 0.55);
    });

    drawWriteStation(ctx, boxes[0], writeP, held, T, fs);
    drawStoreStation(ctx, boxes[1], storeP, held, T, fs);
    drawDistillStation(ctx, boxes[2], distillP, held, T, fs);
    drawRecallStation(ctx, boxes[3], recallP, held, T, fs);

    legend(
      ctx,
      [
        { color: T.yellow, label: "write / store" },
        { color: T.orange, label: "distill / recall" },
        { color: T.red, label: "gradient" },
      ],
      14,
      h - 8,
      T,
      fs - 1
    );
  }

  function stepPipeline(state, dt, reduced) {
    if (reduced) return;
    const CYCLE = 7.6;
    const next = state.clock + dt;
    if (next >= CYCLE) state.settled = true;
    state.clock = next % CYCLE;
  }

  /* ── FIG. TWO VOLUMES ────────────────────────────────────── */
  function volumeBoxes(w, h) {
    const pad = 14;
    const top = pad + 16;
    const bottom = h - pad - 20;
    const usable = bottom - top;
    if (w / Math.max(h, 1) > 1.5) {
      const gap = Math.max(22, w * 0.04);
      const bw = (w - pad * 2 - gap * 2) / 3;
      return [0, 1, 2].map(function (i) {
        return { x: pad + (bw + gap) * i, y: top, w: bw, h: usable };
      });
    }
    const gap = 22;
    const bh = (usable - gap * 2) / 3;
    return [0, 1, 2].map(function (i) {
      return { x: pad, y: top + (bh + gap) * i, w: w - pad * 2, h: bh };
    });
  }

  function drawVolumePlates(ctx, box, present, T, fs, host) {
    const vols = ["volume · graph", "volume · audit"];
    const pad = 12;
    const plateH = Math.min(30, Math.max(20, (box.h - pad * 2 - 28) / 2));
    const top = box.y + 14;
    const strength = 0.28 + present * 0.72;
    ctx.font = "500 " + (fs - 1) + "px " + T.mono;
    ctx.textBaseline = "middle";
    ctx.fillStyle = hexAlpha(T.white, 0.28 + present * 0.2);
    ctx.fillText(fit(ctx, host, box.w - pad * 2), box.x + pad, box.y + box.h - 10);
    vols.forEach(function (v, i) {
      const y = top + (plateH + 8) * i;
      ctx.globalAlpha = strength;
      ctx.strokeStyle = hexAlpha(T.yellow, 0.22 + present * 0.35);
      ctx.fillStyle = hexAlpha(T.yellow, 0.04 + present * 0.08);
      fillStrokeRect(ctx, box.x + pad, y, box.w - pad * 2, plateH);
      ctx.fillStyle = hexAlpha(T.white, 0.55 + present * 0.3);
      ctx.fillText(fit(ctx, v, box.w - pad * 2 - 12), box.x + pad + 8, y + plateH / 2);
      ctx.fillStyle = T.yellow;
      ctx.fillRect(box.x + box.w - pad - 12, y + plateH / 2 - 1.5, 3, 3);
      ctx.globalAlpha = 1;
    });
  }

  function drawVolumes(ctx, w, h, state, T, reduced) {
    const STAGES = ["01 · UNPLUG", "02 · MOVE", "03 · PLUG IN"];
    const CYCLE = 6.4;
    const t = reduced ? 5.4 : state.clock;
    const span = function (start, len) {
      return Math.max(0, Math.min(1, (t - start) / len));
    };
    drawGrid(ctx, w, h, T);
    const boxes = volumeBoxes(w, h);
    const fs = w < 460 ? 8 : 9.5;
    const unplug = span(0.1, 1.4);
    const move = span(1.7, 2.2);
    const plugin = span(4.2, 1.4);
    const hops = [span(1.5, 0.35), span(3.95, 0.35)];
    const active = [
      unplug > 0 && unplug < 1 ? 1 : 0.3,
      move > 0 && move < 1 ? 1 : move >= 1 ? 0.3 : 0.15,
      plugin > 0 ? 1 : 0.15,
    ];

    for (let i = 0; i < 2; i++) connector(ctx, boxes[i], boxes[i + 1], hops[i], T, T.yellow);

    boxes.forEach(function (box, i) {
      stationFrame(ctx, box, T, active[i], T.yellow);
    });
    ctx.font = "600 " + fs + "px " + T.mono;
    ctx.textBaseline = "middle";
    boxes.forEach(function (box, i) {
      ctx.fillStyle = active[i] > 0.5 ? T.yellow : hexAlpha(T.white, 0.38);
      fillTracked(ctx, STAGES[i], box.x, box.y - 9, 0.55);
    });

    const aPresent = reduced ? 1 : Math.max(0.22, 1 - Math.max(0, unplug - 0.35));
    const midPresent = reduced ? 1 : 0.22 + 0.78 * Math.max(0, Math.min(1, move));
    const bPresent = reduced ? 1 : 0.22 + 0.78 * Math.max(0, Math.min(1, (plugin - 0.1) / 0.7));
    drawVolumePlates(ctx, boxes[0], aPresent, T, fs, "host A · runtime");
    drawVolumePlates(ctx, boxes[1], midPresent, T, fs, "any host · any cloud");
    drawVolumePlates(ctx, boxes[2], bPresent, T, fs, "host B · memory restored");

    legend(
      ctx,
      [
        { color: T.yellow, label: "two Docker volumes" },
        { color: T.orange, label: "full state" },
      ],
      14,
      h - 8,
      T,
      fs - 1
    );
  }

  function stepVolumes(state, dt, reduced) {
    if (reduced) return;
    const CYCLE = 6.4;
    state.clock = (state.clock + dt) % CYCLE;
  }

  /* ── FIG. TOPOLOGY ───────────────────────────────────────── */
  function drawTopology(ctx, w, h, state, T, reduced) {
    drawGrid(ctx, w, h, T);
    const fs = w < 460 ? 8 : 9.5;
    const pad = 16;
    const clients = ["OpenClaw", "Cursor", "Claude Code", "Hermes", "DeerFlow", "LangGraph"];
    const stores = ["FalkorDB", "PostgreSQL", "vault/"];
    const storeSub = ["graph + vectors", "12 audit tables", "markdown notes"];

    const topY = h * 0.16;
    const midY = h * 0.42;
    const procY = h * 0.58;
    const botY = h * 0.82;

    const chipW = Math.min(92, (w - pad * 2) / clients.length - 8);
    const chipH = 22;
    const startX = pad + (w - pad * 2 - clients.length * (chipW + 8) + 8) / 2;

    ctx.font = "500 " + (fs - 1) + "px " + T.sans;
    ctx.textBaseline = "middle";
    const clientBoxes = clients.map(function (name, i) {
      const x = startX + i * (chipW + 8);
      const box = { x: x, y: topY - chipH / 2, w: chipW, h: chipH };
      ctx.strokeStyle = hexAlpha(T.white, 0.16);
      ctx.fillStyle = hexAlpha(T.black, 0.7);
      fillStrokeRect(ctx, box.x, box.y, box.w, box.h);
      ctx.fillStyle = hexAlpha(T.white, 0.7);
      ctx.fillText(fit(ctx, name, chipW - 10), box.x + 6, box.y + chipH / 2);
      return box;
    });

    const sse = { x: w * 0.18, y: midY - 14, w: w * 0.64, h: 28 };
    ctx.strokeStyle = hexAlpha(T.yellow, 0.4);
    ctx.fillStyle = hexAlpha(T.yellow, 0.05);
    fillStrokeRect(ctx, sse.x, sse.y, sse.w, sse.h);
    ctx.fillStyle = hexAlpha(T.yellow, 0.9);
    ctx.font = "600 " + fs + "px " + T.mono;
    ctx.fillText(fit(ctx, "MCP · SSE · http://localhost:8766/sse", sse.w - 16), sse.x + 10, sse.y + sse.h / 2);

    const proc = { x: w * 0.14, y: procY - 18, w: w * 0.72, h: 44 };
    ctx.strokeStyle = hexAlpha(T.yellow, 0.45);
    ctx.fillStyle = hexAlpha(T.yellow, 0.04);
    fillStrokeRect(ctx, proc.x, proc.y, proc.w, proc.h);
    ctx.fillStyle = T.yellow;
    ctx.font = "600 " + fs + "px " + T.mono;
    ctx.fillText(fit(ctx, "OPENSTINGER  ·  32 TOOLS", proc.w - 16), proc.x + 10, proc.y + 14);
    ctx.fillStyle = hexAlpha(T.white, 0.45);
    ctx.font = "500 " + (fs - 1) + "px " + T.mono;
    ctx.fillText("T1 12  ·  T2 11  ·  T3 9", proc.x + 10, proc.y + 32);

    const storeW = Math.min(150, (w - pad * 2 - 24) / 3);
    const storeGap = (w - pad * 2 - storeW * 3) / 2;
    const storeBoxes = stores.map(function (name, i) {
      const x = pad + i * (storeW + storeGap);
      const box = { x: x, y: botY - 22, w: storeW, h: 40 };
      const accent = i === 0 ? T.yellow : i === 1 ? T.orange : T.red;
      ctx.strokeStyle = hexAlpha(accent, 0.4);
      ctx.fillStyle = hexAlpha(accent, 0.05);
      fillStrokeRect(ctx, box.x, box.y, box.w, box.h);
      ctx.fillStyle = hexAlpha(T.white, 0.78);
      ctx.font = "600 " + (fs - 0.5) + "px " + T.mono;
      ctx.fillText(fit(ctx, name, storeW - 12), box.x + 8, box.y + 14);
      ctx.fillStyle = hexAlpha(T.white, 0.4);
      ctx.font = "500 " + (fs - 1.5) + "px " + T.mono;
      ctx.fillText(fit(ctx, storeSub[i], storeW - 12), box.x + 8, box.y + 28);
      return box;
    });

    ctx.strokeStyle = hexAlpha(T.white, 0.12);
    ctx.lineWidth = 1;
    clientBoxes.forEach(function (c) {
      ctx.beginPath();
      ctx.moveTo(c.x + c.w / 2, c.y + c.h);
      ctx.lineTo(sse.x + sse.w / 2, sse.y);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(sse.x + sse.w / 2, sse.y + sse.h);
    ctx.lineTo(proc.x + proc.w / 2, proc.y);
    ctx.stroke();
    storeBoxes.forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(proc.x + proc.w / 2, proc.y + proc.h);
      ctx.lineTo(s.x + s.w / 2, s.y);
      ctx.stroke();
    });

    const t = reduced ? 0.45 : state.clock % 1;
    clientBoxes.forEach(function (c, i) {
      const tt = (t + i * 0.12) % 1;
      const x = c.x + c.w / 2 + (sse.x + sse.w / 2 - (c.x + c.w / 2)) * tt;
      const y = c.y + c.h + (sse.y - (c.y + c.h)) * tt;
      packet(ctx, x, y, i % 2 === 0 ? T.yellow : T.orange);
    });
    packet(
      ctx,
      sse.x + sse.w / 2,
      sse.y + sse.h + (proc.y - (sse.y + sse.h)) * ((t + 0.3) % 1),
      T.yellow
    );

    legend(
      ctx,
      [
        { color: T.yellow, label: "write" },
        { color: T.orange, label: "recall" },
      ],
      pad,
      h - 8,
      T,
      fs - 1
    );
  }

  function stepTopology(state, dt, reduced) {
    if (reduced) return;
    state.clock += dt * 0.35;
  }

  /* ── FIG. THREE TIERS ────────────────────────────────────── */
  function tierBoxes(w, h) {
    const pad = 14;
    const top = pad + 16;
    const bottom = h - pad - 18;
    const usable = bottom - top;
    if (w / Math.max(h, 1) > 1.4) {
      const gap = Math.max(16, w * 0.03);
      const bw = (w - pad * 2 - gap * 2) / 3;
      return [0, 1, 2].map(function (i) {
        return { x: pad + (bw + gap) * i, y: top, w: bw, h: usable };
      });
    }
    const gap = 20;
    const bh = (usable - gap * 2) / 3;
    return [0, 1, 2].map(function (i) {
      return { x: pad, y: top + (bh + gap) * i, w: w - pad * 2, h: bh };
    });
  }

  function drawTiers(ctx, w, h, state, T, reduced) {
    const tiers = [
      {
        title: "01 · TIER 1",
        name: "TEMPORAL ENGINE",
        tools: "12 tools · Memory Harness",
        rows: ["memory_query", "memory_wake_up", "bi-temporal graph", "3-stage dedup"],
        accent: T.yellow,
      },
      {
        title: "02 · TIER 2",
        name: "STINGERVAULT",
        tools: "11 tools · Reasoning Harness",
        rows: ["identity", "domain", "methodology", "preference / constraint"],
        accent: T.orange,
      },
      {
        title: "03 · TIER 3",
        name: "GRADIENT",
        tools: "9 tools · Alignment Harness",
        rows: ["value coherence", "pass", "soft_flag", "hard_block"],
        accent: T.red,
      },
    ];
    const CYCLE = 6.8;
    const t = reduced ? 6 : state.clock;
    const span = function (start, len) {
      return Math.max(0, Math.min(1, (t - start) / len));
    };
    drawGrid(ctx, w, h, T);
    const boxes = tierBoxes(w, h);
    const fs = w < 460 ? 8 : 9.5;
    const phases = [span(0.15, 1.6), span(2.1, 1.6), span(4.1, 1.6)];
    const hops = [span(1.8, 0.3), span(3.8, 0.3)];
    const active = phases.map(function (p) {
      return p > 0 && p < 1 ? 1 : p >= 1 ? 0.4 : 0.12;
    });

    for (let i = 0; i < 2; i++) connector(ctx, boxes[i], boxes[i + 1], hops[i], T, tiers[i + 1].accent);

    boxes.forEach(function (box, i) {
      stationFrame(ctx, box, T, active[i], tiers[i].accent);
      const held = reduced || phases[i] > 0.2 ? Math.max(phases[i], reduced ? 1 : 0.15) : phases[i];
      ctx.font = "600 " + fs + "px " + T.mono;
      ctx.textBaseline = "middle";
      ctx.fillStyle = active[i] > 0.5 ? tiers[i].accent : hexAlpha(T.white, 0.38);
      fillTracked(ctx, tiers[i].title, box.x, box.y - 9, 0.55);

      ctx.fillStyle = hexAlpha(T.white, 0.82);
      ctx.font = "600 " + (fs + 0.5) + "px " + T.mono;
      ctx.fillText(fit(ctx, tiers[i].name, box.w - 20), box.x + 10, box.y + 16);
      ctx.fillStyle = hexAlpha(T.white, 0.4);
      ctx.font = "500 " + (fs - 1) + "px " + T.mono;
      ctx.fillText(fit(ctx, tiers[i].tools, box.w - 20), box.x + 10, box.y + 32);

      const rowH = Math.min(20, (box.h - 52) / tiers[i].rows.length);
      ctx.font = "500 " + (fs - 1) + "px " + T.mono;
      tiers[i].rows.forEach(function (row, ri) {
        const appear = Math.max(reduced ? 1 : 0, Math.min(1, held * tiers[i].rows.length - ri));
        if (appear <= 0) return;
        const y = box.y + 46 + rowH * ri;
        ctx.globalAlpha = appear;
        ctx.strokeStyle = hexAlpha(tiers[i].accent, 0.25);
        ctx.fillStyle = hexAlpha(tiers[i].accent, 0.04);
        fillStrokeRect(ctx, box.x + 10, y, box.w - 20, rowH - 4);
        ctx.fillStyle = hexAlpha(T.white, 0.7);
        ctx.fillText(fit(ctx, row, box.w - 32), box.x + 16, y + (rowH - 4) / 2);
        ctx.globalAlpha = 1;
      });
    });

    legend(
      ctx,
      [
        { color: T.yellow, label: "memory" },
        { color: T.orange, label: "vault" },
        { color: T.red, label: "alignment" },
      ],
      14,
      h - 8,
      T,
      fs - 1
    );
  }

  function stepTiers(state, dt, reduced) {
    if (reduced) return;
    state.clock = (state.clock + dt) % 6.8;
  }

  /* ── mount ───────────────────────────────────────────────── */
  const factories = {
    recall: {
      init: function () {
        return { packets: [], rowHeat: [0, 0, 0, 0, 0, 0], spawnAt: 0.25 };
      },
      step: stepRecall,
      draw: drawRecall,
    },
    pipeline: {
      init: function () {
        return { clock: 6.2, settled: true };
      },
      step: stepPipeline,
      draw: drawPipeline,
    },
    volumes: {
      init: function () {
        return { clock: 5.2 };
      },
      step: stepVolumes,
      draw: drawVolumes,
    },
    topology: {
      init: function () {
        return { clock: 0 };
      },
      step: stepTopology,
      draw: drawTopology,
    },
    tiers: {
      init: function () {
        return { clock: 5.6 };
      },
      step: stepTiers,
      draw: drawTiers,
    },
  };

  function mountCanvas(canvas) {
    const kind = canvas.getAttribute("data-figure");
    const factory = factories[kind];
    if (!factory) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = prefersReduced();
    const state = factory.init();
    let width = 0;
    let height = 0;
    let raf = 0;
    let running = true;
    let last = performance.now();
    const aboveFold = canvas.hasAttribute("data-live");

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function frame(now) {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      factory.step(state, dt, reduced);
      ctx.clearRect(0, 0, width, height);
      factory.draw(ctx, width, height, state, tokens(), reduced);
      if (running && !reduced) raf = requestAnimationFrame(frame);
    }

    resize();
    frame(performance.now());

    const ro = new ResizeObserver(function () {
      resize();
      if (reduced || !running) {
        last = performance.now();
        factory.draw(ctx, width, height, state, tokens(), reduced);
      }
    });
    ro.observe(canvas);

    let io = null;
    if (!reduced && !aboveFold) {
      running = false;
      cancelAnimationFrame(raf);
      io = new IntersectionObserver(
        function (entries) {
          const entry = entries[0];
          if (entry.isIntersecting && !running) {
            running = true;
            last = performance.now();
            raf = requestAnimationFrame(frame);
          } else if (!entry.isIntersecting && running) {
            running = false;
            cancelAnimationFrame(raf);
          }
        },
        { threshold: 0, rootMargin: "80px" }
      );
      io.observe(canvas);
      setTimeout(function () {
        if (!running) {
          running = true;
          last = performance.now();
          raf = requestAnimationFrame(frame);
        }
      }, 1600);
    }

    document.fonts &&
      document.fonts.ready.then(function () {
        resize();
        factory.draw(ctx, width, height, state, tokens(), reduced);
      });
  }

  function bootFigures() {
    document.querySelectorAll("canvas[data-figure]").forEach(mountCanvas);
  }

  function bootRise() {
    const nodes = document.querySelectorAll(".fi");
    if (!nodes.length) return;
    if (prefersReduced()) {
      nodes.forEach(function (el) {
        el.classList.add("on");
      });
      return;
    }
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) e.target.classList.add("on");
        });
      },
      { threshold: 0.08 }
    );
    nodes.forEach(function (el) {
      io.observe(el);
      setTimeout(function () {
        el.classList.add("on");
      }, 1800);
    });
  }

  function bootNav() {
    const ham = document.getElementById("hamburger");
    const nav = document.querySelector(".nav-links");
    if (!ham || !nav) return;
    ham.addEventListener("click", function () {
      const open = nav.classList.toggle("open");
      ham.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        ham.setAttribute("aria-expanded", "false");
      });
    });
  }

  function boot() {
    bootFigures();
    bootRise();
    bootNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
