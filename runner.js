// Runner headline: a small runner sprints across the letters of the headline,
// lands on the landing line, then exits to the right.
// Ported from the Framer code component "RunnerHeadline" to plain JavaScript.
(function () {
  var headline = document.querySelector("[data-runner-headline]");
  if (!headline) return;

  var root = headline.querySelector(".runner-row");
  var runner = headline.querySelector(".runner-sprite");
  if (!root || !runner) return;

  // Skip the animation for people who ask for less motion.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  function transform(x, y) {
    return "translate(" + (x - 21) + "px," + (y - 14) + "px)";
  }

  function run() {
    var box = root.getBoundingClientRect();
    var letters = Array.prototype.slice.call(
      root.querySelectorAll("[data-letter]")
    );

    // Center point of each letter, relative to the headline row.
    var points = letters.map(function (el) {
      var b = el.getBoundingClientRect();
      return {
        x: b.left + b.width / 2 - box.left,
        y: b.top + b.height / 2 - box.top
      };
    });

    // 1. Letters rise into place one after another.
    letters.forEach(function (el, i) {
      el.animate(
        [
          {
            clipPath: "inset(100% 0 0)",
            transform:
              "translateY(.45em) rotate(" + (i % 2 ? 8 : -8) + "deg) scale(.8)"
          },
          {
            clipPath: "inset(0)",
            transform: "translateY(-.06em) scale(1.04)",
            offset: 0.78
          },
          { clipPath: "inset(0)", transform: "none" }
        ],
        {
          duration: 310,
          delay: 100 + (1200 * (i + 1)) / (letters.length + 1),
          fill: "backwards",
          easing: "cubic-bezier(.2,.7,.25,1)"
        }
      );
    });

    var first = points[0];
    var last = points[points.length - 1];

    // 2. The runner travels across every letter.
    var travelFrames = [{ transform: transform(first.x - 26, first.y) }];
    points.forEach(function (p) {
      travelFrames.push({ transform: transform(p.x, p.y) });
    });
    travelFrames.push({ transform: transform(last.x + 28, last.y) });

    var travel = runner.animate(travelFrames, {
      duration: 1200,
      delay: 100,
      fill: "both"
    });

    // 3. A small hop while running.
    var hop = runner.animate(
      [{ marginTop: "0px" }, { marginTop: "-5px" }, { marginTop: "0px" }],
      { duration: 150, iterations: Infinity }
    );

    runner.style.visibility = "visible";

    travel.onfinish = function () {
      hop.cancel();

      var x = last.x + 28;
      var y = last.y;
      var bounds = root.getBoundingClientRect();

      // Find the landing line closest to the headline's vertical position.
      var target = Array.prototype.slice
        .call(document.querySelectorAll(".runner-landing-line"))
        .map(function (el) {
          return el.getBoundingClientRect();
        })
        .filter(function (b) {
          return b.width > 0 && b.height > 0;
        })
        .sort(function (a, b) {
          return Math.abs(a.top - bounds.top) - Math.abs(b.top - bounds.top);
        })[0];

      var ground = target
        ? Math.max(y + 32, target.bottom - bounds.top - 11)
        : y + 90;

      function pose(a, b, r, s) {
        r = r || 0;
        s = s === undefined ? 1 : s;
        return transform(a, b) + " rotate(" + r + "deg) scaleX(" + s + ")";
      }

      var exit = Math.max(
        x + 65,
        window.innerWidth - root.getBoundingClientRect().left + 45
      );
      var speed = Math.max(0.08, (last.x + 28 - (first.x - 26)) / 1200);
      var dash = (exit - x - 24) / speed;
      var preparation = 1050;
      var duration = preparation + dash;

      function beat(v) {
        return ((v / 0.69) * preparation) / duration;
      }

      var steps = Math.max(8, Math.round(dash / 75));

      // The landing sequence: a jump, a flip, a pause, then a run off the edge.
      var keyframes = [
        { transform: pose(x, y), offset: 0 },
        { transform: pose(x, y), offset: beat(0.04) },
        { transform: pose(x + 8, y - 7, 28), offset: beat(0.08) },
        { transform: pose(x + 19, ground, 180), offset: beat(0.24) },
        { transform: pose(x + 20, ground - 4, 188), offset: beat(0.28) },
        { transform: pose(x + 20, ground, 180), offset: beat(0.33) },
        { transform: pose(x + 22, ground - 14, 295), offset: beat(0.4) },
        { transform: pose(x + 24, ground, 360), offset: beat(0.46) },
        { transform: pose(x + 24, ground, 360, -1), offset: beat(0.53) },
        { transform: pose(x + 24, ground, 360, -1), offset: beat(0.6) },
        { transform: pose(x + 24, ground, 360), offset: beat(0.64) },
        { transform: pose(x + 24, ground, 360), offset: beat(0.69) }
      ];

      for (var i = 0; i < steps; i++) {
        keyframes.push({
          transform: pose(
            x + 24 + ((exit - x - 24) * (i + 1)) / steps,
            ground - (i % 2 === 0 ? 5 : 0),
            360
          ),
          offset:
            i === steps - 1
              ? 1
              : (preparation + (dash * (i + 1)) / steps) / duration
        });
      }

      var ending = runner.animate(keyframes, {
        duration: duration,
        fill: "both"
      });

      ending.onfinish = function () {
        runner.style.visibility = "hidden";
        ending.cancel();
        travel.cancel();
      };
    };
  }

  // Wait for the runner image to load before measuring positions.
  runner.decode().then(run).catch(function () {});
})();
