// Case study videos with data-play-times="N" play N times as soon as the page loads,
// then stop on their last frame. Everything else just autoplays and loops.
(function () {
  var videos = document.querySelectorAll("video[data-play-times]");

  Array.prototype.forEach.call(videos, function (video) {
    var times = parseInt(video.getAttribute("data-play-times"), 10) || 1;
    var played = 1;
    var lastTime = 0;

    // Show the final frame without playing (reduced motion, or autoplay blocked).
    var jumpToEnd = function () {
      video.loop = false;
      var seek = function () {
        video.currentTime = Math.max(0, video.duration - 0.05);
      };
      if (video.readyState >= 1) seek();
      else video.addEventListener("loadedmetadata", seek, { once: true });
    };

    // Count each loop: when the time jumps back to the start, one play has finished.
    // Turning loop off before the final play lets the video end and hold its last frame.
    video.loop = times > 1;
    video.addEventListener("timeupdate", function () {
      if (video.currentTime + 0.5 < lastTime) {
        played += 1;
        if (played >= times) video.loop = false;
      }
      lastTime = video.currentTime;
    });

    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      jumpToEnd();
      return;
    }

    var attempt = video.play();
    if (attempt && attempt.catch) attempt.catch(jumpToEnd);
  });
})();
