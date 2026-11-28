// Header and hero behavior from the Figma design:
// dark-mode toggle, Menu dropdown,
// and the 16-week GitHub contribution grid.
(function () {
  var GITHUB_USER = "nicolasrocha6";

  // Dark mode: remembers the choice, otherwise follows the system setting.
  var root = document.documentElement;
  var toggle = document.querySelector("[data-theme-toggle]");
  var saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) {}
  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  var setTheme = function (theme) {
    root.setAttribute("data-theme", theme);
    if (toggle) toggle.setAttribute("aria-pressed", String(theme === "dark"));
  };
  setTheme(saved || (prefersDark ? "dark" : "light"));
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      setTheme(next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  // Menu dropdown
  var menuButton = document.querySelector("[data-menu-button]");
  var menuPanel = menuButton && document.getElementById(menuButton.getAttribute("aria-controls"));
  if (menuButton && menuPanel) {
    var setOpen = function (open) {
      menuButton.setAttribute("aria-expanded", String(open));
      menuPanel.hidden = !open;
    };
    menuButton.addEventListener("click", function (event) {
      event.stopPropagation();
      setOpen(menuPanel.hidden);
    });
    menuPanel.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });
    document.addEventListener("click", function (event) {
      if (!menuPanel.hidden && !menuPanel.contains(event.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !menuPanel.hidden) {
        setOpen(false);
        menuButton.focus();
      }
    });
  }

  // GitHub grid: one column per week (Sunday to Saturday), 16 weeks, ending today.
  // Counts come from a public contributions API; if it is unreachable,
  // the grid still shows, with every day empty.
  var grid = document.querySelector("[data-github-grid]");
  if (grid) {
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var isoDate = function (d) {
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    };

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var start = new Date(today);
    start.setDate(start.getDate() - start.getDay() - 15 * 7);

    var cells = {};
    for (var d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      var cell = document.createElement("span");
      cell.className = "github-cell";
      cell.title = isoDate(d) + " · 0 contributions";
      grid.appendChild(cell);
      cells[isoDate(d)] = cell;
    }

    if (window.fetch) {
      fetch("https://github-contributions-api.jogruber.de/v4/" + GITHUB_USER + "?y=last")
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          if (!data || !data.contributions) return;
          var total = 0;
          data.contributions.forEach(function (day) {
            var target = cells[day.date];
            if (!target || !day.count) return;
            total += day.count;
            target.setAttribute("data-level", String(day.level || 1));
            target.title = day.date + " · " + day.count + " contribution" + (day.count === 1 ? "" : "s");
          });
          grid.setAttribute("aria-label", total + " GitHub contributions over the last 16 weeks");
        })
        .catch(function () {});
    }
  }
})();
