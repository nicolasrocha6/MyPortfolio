// Runner headline: the Claude Code logo from the tool stack sprints across the
// headline as its letters rise, flips down to the floor (level with the bottom
// of the tool stack), runs right until it bumps the wall, and then the floor
// under it juts up into the tool stack. The runner rides up into the stack's
// top slot and becomes the Claude Code logo there.
// Below 761px wide the tool stack is a plain row, so the runner just runs off.
//
// For smooth motion, the whole path is built from curves and sampled at about
// 60fps, and only transform and opacity are animated so the browser can run
// everything on the compositor. The stack's rise is sampled from the same
// curve as the runner, so the two stay locked together.
(function () {
  var headline = document.querySelector("[data-runner-headline]");
  if (!headline) return;

  var root = headline.querySelector(".runner-row");
  var runner = headline.querySelector(".runner-sprite");
  var tools = document.querySelector(".tool-logos");
  var statements = document.querySelector(".statements");
  if (!root || !runner) return;

  // Skip the animation for people who ask for less motion.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var START = 450; // ms after load, so the header and portrait come in first
  var TRAVEL = 800; // ms to cross the headline
  var W = 28; // sprite size in px, same as the Claude Code logo in the stack
  var H = 17.6;
  var FRAME = 1000 / 60;

  // Easing helpers
  function lerp(a, b, u) { return a + (b - a) * u; }
  function easeInOut(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
  function easeOut(u) { return 1 - Math.pow(1 - u, 3); }
  function backOut(u) {
    var c1 = 1.5, c3 = c1 + 1;
    return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
  }
  function bump(u) { return Math.sin(Math.PI * u); } // 0 → 1 → 0

  function pose(p) {
    return (
      "translate(" + (p.x - W / 2).toFixed(2) + "px," + (p.y - H / 2).toFixed(2) + "px)" +
      " rotate(" + (p.r || 0).toFixed(2) + "deg)" +
      " scale(" + (p.sx === undefined ? 1 : p.sx).toFixed(3) + "," + (p.sy === undefined ? 1 : p.sy).toFixed(3) + ")"
    );
  }

  // Samples a list of segments ({ d: ms, at: u → pose }) into keyframes.
  function sample(segments) {
    var total = segments.reduce(function (sum, s) { return sum + s.d; }, 0);
    var frames = [];
    var t = 0;
    segments.forEach(function (seg, n) {
      var steps = Math.max(1, Math.ceil(seg.d / FRAME));
      for (var i = n === 0 ? 0 : 1; i <= steps; i++) {
        var u = i / steps;
        frames.push({ transform: pose(seg.at(u)), offset: Math.min(1, (t + seg.d * u) / total) });
      }
      t += seg.d;
    });
    frames[frames.length - 1].offset = 1;
    return { total: total, keyframes: frames };
  }

  function revealToolsNow() {
    if (!tools) return;
    tools.style.animation = "none";
    tools.style.opacity = "1";
  }

  function run() {
    var box = root.getBoundingClientRect();
    var letters = Array.prototype.slice.call(root.querySelectorAll("[data-letter]"));
    if (!letters.length) return;

    // Path across the headline: through every letter's center, timed by
    // distance so the speed stays even over wide and narrow letters.
    var path = letters.map(function (el) {
      var b = el.getBoundingClientRect();
      return { x: b.left + b.width / 2 - box.left, y: b.top + b.height / 2 - box.top };
    });
    var first = path[0];
    var last = path[path.length - 1];
    path.unshift({ x: first.x - 18, y: first.y });
    path.push({ x: last.x + 20, y: last.y });

    var dist = [0];
    for (var p = 1; p < path.length; p++) {
      dist.push(dist[p - 1] + Math.hypot(path[p].x - path[p - 1].x, path[p].y - path[p - 1].y));
    }
    var pathLength = dist[dist.length - 1];

    function along(s) {
      var i = 1;
      while (i < dist.length - 1 && dist[i] < s) i++;
      var u = (s - dist[i - 1]) / (dist[i] - dist[i - 1] || 1);
      return { x: lerp(path[i - 1].x, path[i].x, u), y: lerp(path[i - 1].y, path[i].y, u) };
    }

    // Letters rise into place just as the runner reaches each one.
    letters.forEach(function (el, i) {
      el.animate(
        [
          { opacity: 0, transform: "translateY(.45em) rotate(" + (i % 2 ? 8 : -8) + "deg) scale(.8)" },
          { opacity: 1, transform: "translateY(-.06em) scale(1.04)", offset: 0.7 },
          { opacity: 1, transform: "none" }
        ],
        {
          duration: 280,
          delay: START + (TRAVEL * dist[i + 1]) / pathLength - 60,
          fill: "backwards",
          easing: "cubic-bezier(.2,.7,.25,1)"
        }
      );
    });

    var HOP = 22; // px per hop while running
    var segments = [
      {
        d: TRAVEL,
        at: function (u) {
          var s = u * pathLength;
          var q = along(s);
          return { x: q.x, y: q.y - 3 * Math.abs(Math.sin((Math.PI * s) / HOP)) };
        }
      }
    ];

    var x = last.x + 20;
    var y = last.y;
    var stacked = tools && getComputedStyle(tools).position === "absolute";

    if (!stacked) {
      // Narrow screens: keep running off to the right on the headline.
      var exit = window.innerWidth - box.left + W;
      segments.push({
        d: (exit - x) / 0.8,
        at: function (u) {
          var dx = (exit - x) * u;
          return { x: x + dx, y: y - 4 * Math.abs(Math.sin((Math.PI * dx) / HOP)) };
        }
      });
      var narrow = sample(segments);
      runner.style.visibility = "visible";
      var exitAnim = runner.animate(narrow.keyframes, { duration: narrow.total, delay: START, fill: "both" });
      exitAnim.onfinish = function () {
        runner.style.visibility = "hidden";
        exitAnim.cancel();
      };
      return;
    }

    // Measure the tool stack in its final position. The runner ends in the
    // top slot, so the real Claude Code logo there is hidden until it arrives.
    var slot = tools.querySelector("[data-stack-top]");
    var items = Array.prototype.slice.call(tools.querySelectorAll("li"));
    var stack = tools.getBoundingClientRect();
    var slotBox = (slot || tools).getBoundingClientRect();
    var stackX = stack.left + stack.width / 2 - box.left;
    var top = slotBox.top + slotBox.height / 2 - box.top; // runner center in the top slot
    var floor = stack.bottom - box.top - H / 2; // runner center when standing on the floor
    var rise = floor - top; // how far the stack (and runner) travel up

    // Flip down to the floor, clearing the statements text.
    var textRight = statements ? statements.getBoundingClientRect().right - box.left : x + 120;
    var landX = Math.min(Math.max(textRight + 20, x + 70), stackX - 70);
    var jumpFrom = x + 6;
    var drop = floor - (y + 2);
    // Projectile arc: pick its height so the flip peaks about 8px above the takeoff.
    var arc = drop / 4 + 8;
    for (var tries = 0; tries < 20; tries++) {
      var uTop = Math.max(0, (1 - drop / (4 * arc)) / 2);
      var peakAbove = 4 * arc * uTop * (1 - uTop) - drop * uTop;
      arc += (8 - peakAbove) * 0.5;
    }
    var bumpX = stackX + 6;
    var runFrom = landX + 14;

    // Starts from rest and reaches full speed by u = 0.3, without a jolt.
    function accelIn(u) {
      var a = 0.3;
      return (u < a ? (u * u) / (2 * a) : u - a / 2) / (1 - a / 2);
    }

    // Stack rise: 1 → 0 with a small overshoot, shared by the runner and the stack.
    // The smoothstep inside eases it out of rest so it never starts with a jolt.
    function riseOffset(u) { return rise * (1 - backOut(u * u * (3 - 2 * u))); }

    segments.push(
      // Crouch before the jump, drifting forward so the run doesn't stop dead
      { d: 60, at: function (u) { return { x: lerp(x, jumpFrom, easeOut(u)), y: y + 2 * u, sy: 1 - 0.15 * easeOut(u) }; } },
      // Flip in a projectile arc down to the floor
      {
        d: 520,
        at: function (u) {
          return {
            x: lerp(jumpFrom, landX, u),
            y: lerp(y + 2, floor, u) - arc * 4 * u * (1 - u),
            r: 360 * easeInOut(u),
            sy: lerp(0.85, 1, Math.min(1, u * 4))
          };
        }
      },
      // Land with a squash, sliding forward to soak up the fall
      { d: 160, at: function (u) { return { x: lerp(landX, runFrom, easeOut(u)), y: floor, sx: 1 + 0.18 * bump(u), sy: 1 - 0.24 * bump(u) }; } },
      // Run to the wall
      {
        d: (bumpX - runFrom) / 0.75 / (1 - 0.15),
        at: function (u) {
          var dx = (bumpX - runFrom) * accelIn(u);
          return { x: runFrom + dx, y: floor - 4 * Math.abs(Math.sin((Math.PI * dx) / HOP)) };
        }
      },
      // Bonk: squash against the wall
      { d: 60, at: function (u) { return { x: bumpX + bump(u), y: floor, r: -8 * bump(u), sx: 1 - 0.22 * bump(u), sy: 1 + 0.08 * bump(u) }; } },
      // Stumble back
      {
        d: 220,
        at: function (u) {
          var e = easeOut(u);
          return { x: lerp(bumpX, stackX - 4, e), y: floor - 5 * bump(u), r: -12 * bump(u) };
        }
      },
      // Shake it off
      { d: 180, at: function (u) { return { x: stackX - 4, y: floor, r: 6 * Math.sin(4 * Math.PI * u) * (1 - u) }; } },
      // Step to the middle of the stack
      { d: 80, at: function (u) { return { x: lerp(stackX - 4, stackX, easeInOut(u)), y: floor }; } },
      // The floor rumbles; the runner braces
      {
        d: 200,
        at: function (u) {
          return { x: stackX + 1.2 * Math.sin(10 * Math.PI * u), y: floor, sx: 1 + 0.08 * easeOut(u), sy: 1 - 0.16 * easeOut(u) };
        }
      }
    );

    var riseStartAt = segments.reduce(function (sum, s) { return sum + s.d; }, 0);
    var RISE = 620;
    var SETTLE = 180;

    segments.push(
      // Ride the stack up into the top slot
      {
        d: RISE,
        at: function (u) {
          return {
            x: stackX,
            y: top + riseOffset(u),
            sx: lerp(1.08, 1, Math.min(1, u * 3)),
            sy: lerp(0.84, 1, Math.min(1, u * 3)) + 0.06 * bump(Math.min(1, u * 1.4))
          };
        }
      },
      // Settle into place
      { d: SETTLE, at: function (u) { return { x: stackX, y: top, sx: 1 + 0.1 * bump(u), sy: 1 - 0.12 * bump(u) }; } }
    );

    var timeline = sample(segments);
    runner.style.visibility = "visible";
    var main = runner.animate(timeline.keyframes, { duration: timeline.total, delay: START, fill: "both" });

    // Tool stack: a fixed clip at the floor hides whatever is below it, and the
    // logos move up with the same curve as the runner.
    tools.style.animation = "none";
    tools.style.opacity = "1";
    tools.style.clipPath = "inset(-200px -60px 0 -60px)";
    if (slot) slot.style.visibility = "hidden";

    var riseFrames = [];
    var riseSteps = Math.ceil(RISE / FRAME);
    for (var i = 0; i <= riseSteps; i++) {
      riseFrames.push({ transform: "translateY(" + riseOffset(i / riseSteps).toFixed(2) + "px)" });
    }
    items.forEach(function (li) {
      li.animate(riseFrames, { duration: RISE, delay: START + riseStartAt, fill: "backwards" });
    });

    // Each logo pops a little as it clears the floor, bottom one first.
    items
      .filter(function (li) { return li !== slot; })
      .reverse()
      .forEach(function (li, n) {
        var img = li.querySelector("img");
        if (!img) return;
        img.animate(
          [{ transform: "scale(.6)", opacity: 0.3 }, { transform: "scale(1.12)", opacity: 1, offset: 0.6 }, { transform: "none", opacity: 1 }],
          { duration: 280, delay: START + riseStartAt + 40 + n * 70, fill: "backwards", easing: "ease-out" }
        );
      });

    // Hand off: the runner is now the Claude Code logo at the top of the stack.
    main.onfinish = function () {
      if (slot) slot.style.visibility = "";
      tools.style.clipPath = "";
      runner.style.visibility = "hidden";
      main.cancel();
    };
  }

  // Wait for fonts and the runner image before measuring positions.
  var start = function () {
    runner.decode().then(run).catch(revealToolsNow);
  };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start, start);
  } else {
    start();
  }
})();
