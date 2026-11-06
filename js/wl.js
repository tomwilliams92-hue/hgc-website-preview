/* v3 (05.11.2026), West Lancs layout: menu overlay, home panels, hero flyover, tile slider, hole-by-hole slider. */
(function () {
  const H = window.HGC;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const calm = root.classList.contains('noanim') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search);

  /* menu */
  const menu = $('.wlmenu');
  const setMenu = open => { menu.classList.toggle('open', open); document.body.style.overflow = open ? 'hidden' : ''; };
  $$('[data-wlmenu]').forEach(b => b.onclick = () => setMenu(!menu.classList.contains('open')));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* the MENU button turns dark once it sits over white */
  const onScroll = () => {
    document.body.classList.toggle('scrolled', scrollY > 140);
    document.body.classList.toggle('past', scrollY > innerHeight * 0.6);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* example + colour pill */
  const dp = $('.designpill');
  if (dp) $('.dp-open', dp).onclick = () => dp.classList.toggle('open');

  /* home panels: gentle zoom as each arrives, chevrons go to the next */
  const panels = $$('.panel');
  if (panels.length) {
    const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('in', e.isIntersecting)), { threshold: .5 });
    panels.forEach(p => io.observe(p));
    $$('.panel .down').forEach(b => b.onclick = () => { const p = b.closest('.panel').nextElementSibling; if (p) scrollTo({ top: p.offsetTop, behavior: calm ? 'auto' : 'smooth' }); });
  }

  /* hero: the club's flyover of the 10th, muted, looping, half speed (needs the site served over http; YouTube won't play from a file).
     Phones keep the photo: YouTube's overlay shows there, autoplay can be blocked, and it would stream 4K over mobile data. */
  const yb = $('.ytbg');
  if (yb && /^https?:/.test(location.protocol) && (!calm || params.has('clean')) && !matchMedia('(max-width: 760px)').matches) {
    const fit = () => {
      const w = yb.clientWidth, h = yb.clientHeight, ifr = $('iframe', yb);
      if (!ifr) return;
      const Hh = Math.max(h / 0.72, w * 9 / 16);              // the old scorecard banner starts 78% down the frame
      // lay the player out at 4K and scale it down, so YouTube sends its 2160p stream rather than stretching 1080p
      ifr.style.width = '3840px'; ifr.style.height = '2160px'; ifr.style.top = (-0.05 * Hh) + 'px';
      ifr.style.transformOrigin = 'top center'; ifr.style.transform = `translateX(-50%) scale(${Hh / 2160})`;
    };
    window.onYouTubeIframeAPIReady = () => {
      new YT.Player('ytbg-player', {
        videoId: yb.dataset.yt,
        playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, modestbranding: 1, playsinline: 1, rel: 0, iv_load_policy: 3, fs: 0, loop: 1, playlist: yb.dataset.yt },
        events: {
          onReady: e => { fit(); e.target.mute(); e.target.setPlaybackRate(0.5); e.target.playVideo(); },
          onStateChange: e => {
            if (e.data === 1) { yb.classList.add('playing'); yb.closest('.panel').classList.add('vid'); e.target.setPlaybackRate(0.5); }
            if (e.data === 0) { e.target.seekTo(0); e.target.playVideo(); }
          },
        },
      });
      addEventListener('resize', fit);
    };
    // the video waits until the page has finished loading, so the photo and words appear first
    const loadYT = () => setTimeout(() => { const tag = document.createElement('script'); tag.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(tag); }, 1200);
    document.readyState === 'complete' ? loadYT() : addEventListener('load', loadYT);
  }

  /* tile slider arrows */
  $$('.wltiles').forEach(w => {
    const tr = $('.track', w), step = () => tr.firstElementChild.getBoundingClientRect().width + 10;
    $('.arr.l', w).onclick = () => tr.scrollBy({ left: -step(), behavior: 'smooth' });
    $('.arr.r', w).onclick = () => tr.scrollBy({ left: step(), behavior: 'smooth' });
  });

  /* hole-by-hole slider */
  const hh = $('.holeview');
  if (hh) {
    const words = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen'];
    const frames = $$('.fr', hh), nums = $$('.nums button', hh);
    let n = 1;
    const tees = [['white', 'White', '#fff'], ['yellow', 'Yellow', '#f2c614'], ['red', 'Red', '#d11f26']];
    const draw = () => {
      const h = H.holes[n - 1], w = h.white;
      frames.forEach((f, k) => { f.classList.toggle('on', k === n - 1); const im = $('img', f); if (Math.abs(k - (n - 1)) <= 1 && im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; } });
      nums.forEach((b, k) => b.setAttribute('aria-current', String(k === n - 1)));
      $('.holecap h2', hh).textContent = 'Hole ' + words[n - 1];
      $('.holecap .meta', hh).textContent = `Par ${w[1]}, ${w[0]} yards from the whites, stroke index ${w[2]}`;
      $('.holeinfo .desc').textContent = h.note;
      $('[data-hb=men]').innerHTML = tees.slice(0, 2).map(([k, l, c]) => `<tr><td><span class="sw" style="background:${c}"></span>${l}</td><td>${h[k][1]}</td><td>${h[k][0]}</td><td>${h[k][2]}</td></tr>`).join('');
      $('[data-hb=ladies]').innerHTML = `<tr><td><span class="sw" style="background:${tees[2][2]}"></span>Red</td><td>${h.red[1]}</td><td>${h.red[0]}</td><td>${h.red[2]}</td></tr>`;
      if (!params.has('clean')) history.replaceState(null, '', '#hole-' + n);
    };
    const go = k => { n = ((k - 1 + 18) % 18) + 1; draw(); };
    nums.forEach((b, k) => b.onclick = () => go(k + 1));
    $('.nav.l', hh).onclick = () => go(n - 1);
    $('.nav.r', hh).onclick = () => go(n + 1);
    $('.play', hh).onclick = () => window.HGCvideo(H.holes[n - 1].yt, `Hole ${n} flyover`);
    addEventListener('keydown', e => { if (e.target.closest('input,textarea,select')) return; if (e.key === 'ArrowRight') go(n + 1); if (e.key === 'ArrowLeft') go(n - 1); });
    let sx = null;
    hh.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
    hh.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) go(n + (dx < 0 ? 1 : -1)); sx = null; });
    const m = location.hash.match(/hole-(\d+)/); if (m) n = Math.min(18, Math.max(1, +m[1]));
    draw();
  }
})();
