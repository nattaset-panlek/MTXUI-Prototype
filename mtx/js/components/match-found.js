/* Component: "Match Found" video, transparent, played over the current screen.
     MTX_MATCH_FOUND.play(onDone)  -> plays once, then onDone; if the video is missing or can't play, onDone runs right away
     MTX_MATCH_FOUND.isPlaying()   -> true while it plays; app.js blocks input meanwhile

   Browsers can't play Bink (.bk2). Source for the page: WebM VP9 with alpha, mtx/assets/video/match-found.webm */
(function () {
  const SRC = "mtx/assets/video/match-found.webm";
  let video = null;

  function play(onDone) {
    stop();
    const el = document.createElement("video");
    el.className = "mtx-match-found";
    el.src = SRC;
    el.muted = true;          // muted video may start without a user gesture
    el.playsInline = true;
    el.preload = "auto";
    el.setAttribute("aria-hidden", "true");
    let finished = false;
    const end = () => { if (finished) return; finished = true; if (video === el) stop(); onDone?.(); };
    el.addEventListener("ended", end);
    el.addEventListener("error", end);
    // a stalled video must not hold the flow: give up if it never starts
    const guard = setTimeout(() => { if (el.currentTime === 0) end(); }, 5000);
    el.addEventListener("playing", () => clearTimeout(guard), { once: true });
    video = el;
    (document.getElementById("stage") || document.body).appendChild(el);
    el.play()?.catch(end);
  }
  function stop() { video?.remove(); video = null; }

  window.MTX_MATCH_FOUND = { play, stop, isPlaying: () => !!video };
})();
