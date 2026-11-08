/* Holyhead Golf Club website mock-up (Tomoni, 05.11.2026). Club data comes from js/data.js (window.HGC). */
(function () {
  const H = window.HGC;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const store = {
    get(k) { try { return localStorage.getItem('hgc-' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('hgc-' + k, v); } catch (e) { /* private window */ } },
  };
  const gbp = n => '£' + (Math.round(n * 100) / 100).toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const todayIso = iso(new Date());
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  /* ---------- mock-up bar: style and colour switches ---------- */
  function setOpt(k, v) {
    root.dataset[k] = v; store.set(k, v);
    $$(`[data-set-${k}]`).forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute(`data-set-${k}`) === v)));
  }
  setOpt('style', params.get('style') || store.get('style') || 'heritage');
  setOpt('palette', params.get('palette') || store.get('palette') || 'green');
  $$('[data-set-style]').forEach(b => b.onclick = () => setOpt('style', b.dataset.setStyle));
  $$('[data-set-palette]').forEach(b => b.onclick = () => setOpt('palette', b.dataset.setPalette));
  if (params.has('clean')) { root.classList.add('noanim'); const mb = $('.mockbar'); if (mb) mb.remove(); root.style.setProperty('--mockbar', '0px'); }

  /* ---------- Welsh / English ---------- */
  function setLang(l) {
    $$('[data-cy]').forEach(el => {
      if (!el.dataset.en) el.dataset.en = el.innerHTML;
      if (l === 'cy') el.textContent = el.dataset.cy; else el.innerHTML = el.dataset.en;
    });
    root.lang = l === 'cy' ? 'cy' : 'en-GB';
    $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    store.set('lang', l);
  }
  $$('[data-lang]').forEach(b => b.onclick = () => setLang(b.dataset.lang));
  setLang(params.get('lang') || store.get('lang') || 'en');

  /* ---------- header + menu ---------- */
  const top = $('.top');
  if (document.body.classList.contains('home') && top) {
    const solid = () => top.classList.toggle('solid', scrollY > 60);
    addEventListener('scroll', solid, { passive: true }); solid();
  }
  const menu = $('.menu');
  $$('[data-menu]').forEach(b => b.onclick = () => { menu.classList.toggle('open'); document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : ''; });

  /* ---------- hero slideshow (stands in for the drone film) ---------- */
  const slides = $$('.hero .slide, .film .slide');
  if (slides.length) {
    let i = 0;
    const dots = $$('.hero .dots i, .film .dots i');
    const show = n => { slides.forEach((s, k) => s.classList.toggle('on', k === n)); dots.forEach((d, k) => d.classList.toggle('on', k === n)); };
    show(0);
    if (!root.classList.contains('noanim')) setInterval(() => { i = (i + 1) % slides.length; show(i); }, 7000);
  }

  /* ---------- prices ---------- */
  function dayInfo(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const m = d.getMonth() + 1;
    const season = (m === 4 || m === 10) ? 'low' : (m >= 5 && m <= 9) ? 'high' : 'winter';
    const bh = H.bankHolidays.includes(dateStr);
    const weekend = d.getDay() === 0 || d.getDay() === 6 || bh;
    return {
      season, weekend, bh,
      label: (bh ? 'Bank holiday' : weekend ? 'Weekend' : 'Weekday') + ' · ' + { low: 'low season (April and October)', high: 'high season (May to September)', winter: 'winter (November to March)' }[season],
      nice: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    };
  }
  function greenFee(dateStr, type) {
    const di = dayInfo(dateStr);
    if (di.season === 'winter') return { di, price: null };
    const row = H.greenFees[di.weekend ? 'weekend' : 'weekday'][type];
    return { di, price: row ? row[di.season === 'low' ? 0 : 1] : null };
  }
  function societyPrice(dateStr, pkg) {
    const di = dayInfo(dateStr);
    return { di, price: H.society.prices[pkg][di.weekend ? 1 : 0][{ winter: 0, low: 1, high: 2 }[di.season]] };
  }
  $$('input[type=date]').forEach(i => { if (!i.value) i.value = 'default' in i.dataset ? i.dataset.default : todayIso; if (!/birth|dob/i.test(i.closest('div').textContent)) i.min = todayIso; });

  /* quick book card */
  const qb = $('#quick');
  if (qb) {
    const upd = () => {
      const r = greenFee(qb.date.value, 'round');
      const n = +qb.players.value;
      $('#quick .price').innerHTML = r.price
        ? `${r.di.label.split(' · ')[0]} round: <b>${gbp(r.price)}</b> each${n > 1 ? ` · ${gbp(r.price * n)} for ${n}` : ''}`
        : `Winter rates show when you pick a time.`;
    };
    qb.addEventListener('input', upd); upd();
    qb.addEventListener('submit', e => { e.preventDefault(); window.open(H.links.booking, '_blank', 'noopener'); });
  }

  /* green fee finder (visitors) */
  const gf = $('#feefinder');
  if (gf) {
    const upd = () => {
      const r = greenFee(gf.date.value, gf.type.value);
      const n = +gf.players.value || 1;
      const ex = $$('[data-extra]', gf).reduce((t, el) => t + (+el.value || 0) * H.extras[el.dataset.extra], 0);
      $('#ff-day').textContent = r.di.nice + ' · ' + r.di.label;
      if (r.price == null) {
        $('#ff-each').textContent = 'Winter rate';
        $('#ff-total').textContent = 'November to March prices show on the booking page, or call 01407 763279.';
      } else {
        $('#ff-each').textContent = gbp(r.price) + ' each';
        $('#ff-total').textContent = `${n} × ${gbp(r.price)}${ex ? ' + extras ' + gbp(ex) : ''} = ${gbp(r.price * n + ex)}`;
      }
    };
    gf.addEventListener('input', upd); upd();
  }

  /* society calculators (home teaser + full form) */
  $$('[data-society]').forEach(f => {
    const upd = () => {
      const r = societyPrice(f.date.value, f.pkg.value);
      const n = Math.max(+f.golfers.value || 0, 0);
      const ex = $$('[data-extra]', f).reduce((t, el) => t + (+el.value || 0) * H.extras[el.dataset.extra], 0);
      const out = $('.out', f);
      $('.pp', out).textContent = gbp(r.price) + ' a golfer';
      let t = `${r.di.nice} · ${r.di.label}`;
      if (n < H.society.min) t += ` · Societies are ${H.society.min} golfers or more`;
      else t += ` · ${n} golfers = ${gbp(r.price * n)}${ex ? ' + extras ' + gbp(ex) + ' = ' + gbp(r.price * n + ex) : ''}`;
      $('.tt', out).textContent = t;
      const pk = $('.pkgdesc', f); if (pk) pk.textContent = H.society.packages[f.pkg.value];
      f.dataset.summary = `${f.pkg.value} · ${H.society.packages[f.pkg.value]} · ${r.di.nice} · ${n} golfers · ${gbp(r.price)} a golfer · total ${gbp(r.price * n + ex)}`;
    };
    f.addEventListener('input', upd); f.addEventListener('change', upd); upd();
    if (f.dataset.society === 'teaser') f.addEventListener('submit', e => {
      e.preventDefault();
      location.href = `societies.html?date=${f.date.value}&pkg=${f.pkg.value}&golfers=${f.golfers.value}#enquire`;
    });
  });
  const sf = $('#society-form');
  if (sf) ['date', 'pkg', 'golfers'].forEach(k => { if (params.get(k)) { sf[k].value = params.get(k); sf.dispatchEvent(new Event('input')); } });

  /* ---------- demo forms: nothing is sent ---------- */
  $$('form[data-demo]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const d = f.parentElement.querySelector('.done') || $('.done', f);
    if (!d) return;
    const s = $('.sum', d);
    if (s && f.dataset.summary) s.textContent = f.dataset.summary;
    d.classList.add('show');
    if (f.dataset.hide !== 'no') f.style.display = 'none';
    d.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));

  /* ---------- occasion picker (functions) ---------- */
  const occ = $('.occ');
  if (occ) {
    const pick = b => {
      $$('button', occ).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const o = H.occasions[b.dataset.occ];
      $('#occ-title').textContent = o.title;
      $('#occ-note').textContent = o.note;
      $('#occ-form').hidden = !!o.callOnly;
      $('#occ-call').hidden = !o.callOnly;
      const f = $('#occ-form'); if (f) f.dataset.summary = o.title;
    };
    $$('button', occ).forEach(b => b.onclick = () => pick(b));
    pick($('button', occ));
  }

  /* ---------- membership finder ---------- */
  const mf = $('#memfinder');
  if (mf) {
    const upd = () => {
      const age = mf.age.value, how = mf.how.value;
      let key = H.memRules.byAge[age] || 'full';
      if (age === 'adult' || age === 'senior') {
        if (how !== 'full') key = how;
      }
      if (age === 'senior' && how === 'full') key = 'senior';
      const m = H.membership.find(x => x.key === key);
      $('#mf-name').textContent = m.name;
      $('#mf-price').textContent = gbp(m.sub + (m.levy || 0));
      $('#mf-note').textContent = `Subscription ${gbp(m.sub)}${m.levy ? ' + levies ' + gbp(m.levy) : ''}${m.note ? '. ' + m.note : ''}.`;
      const ap = $('#apply-cat'); if (ap) ap.value = m.name;
    };
    mf.addEventListener('input', upd); upd();
  }

  /* ---------- hole explorer ---------- */
  const ex = $('.explorer');
  if (ex) {
    let n = 1, tee = 'white';
    const img = $('.shot img', ex);
    const draw = () => {
      const h = H.holes[n - 1], t = h[tee];
      img.style.opacity = 0;
      setTimeout(() => { img.src = `img/holes/hole-${n}.webp`; img.alt = `Hole ${n} from the drone flyover`; img.onload = () => img.style.opacity = 1; }, 150);
      $('.hn', ex).innerHTML = `<small>Hole</small>${n}`;
      $('[data-k=par]', ex).textContent = t[1];
      $('[data-k=yds]', ex).textContent = t[0];
      $('[data-k=si]', ex).textContent = t[2];
      $('.note', ex).textContent = h.note;
      $$('.strip button', ex).forEach((b, k) => b.setAttribute('aria-current', String(k + 1 === n)));
      $$('.tee', ex).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tee === tee)));
      if (location.hash !== '#hole-' + n && !params.has('clean')) history.replaceState(null, '', '#hole-' + n);
    };
    const go = k => { n = ((k - 1 + 18) % 18) + 1; draw(); };
    $$('.strip button', ex).forEach((b, k) => b.onclick = () => go(k + 1));
    $$('.tee', ex).forEach(b => b.onclick = () => { tee = b.dataset.tee; draw(); });
    $('[data-prev]', ex).onclick = () => go(n - 1);
    $('[data-next]', ex).onclick = () => go(n + 1);
    $('.shot .play', ex).onclick = () => openVideo(H.holes[n - 1].yt, `Hole ${n} flyover`);
    addEventListener('keydown', e => { if (e.target.closest('input,textarea,select')) return; if (e.key === 'ArrowRight') go(n + 1); if (e.key === 'ArrowLeft') go(n - 1); });
    let sx = null;
    $('.shot', ex).addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
    $('.shot', ex).addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) go(n + (dx < 0 ? 1 : -1)); sx = null; });
    const m = location.hash.match(/hole-(\d+)/); if (m) n = Math.min(18, Math.max(1, +m[1]));
    draw();
  }

  /* scorecard with tee switch */
  const sc = $('#scorecard');
  if (sc) {
    const draw = tee => {
      const rows = H.holes.map(h => h[tee]);
      const sum = (a, b, i) => rows.slice(a, b).reduce((t, r) => t + r[i], 0);
      const line = (a, b, label) => rows.slice(a, b).map((r, k) => `<tr><td>${a + k + 1}</td><td class="num">${r[0]}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td></tr>`).join('') +
        `<tr class="sub"><td>${label}</td><td class="num">${sum(a, b, 0).toLocaleString('en-GB')}</td><td class="num">${sum(a, b, 1)}</td><td></td></tr>`;
      $('tbody', sc).innerHTML = line(0, 9, 'Out') + line(9, 18, 'In') +
        `<tr class="sub"><td>Total</td><td class="num">${sum(0, 18, 0).toLocaleString('en-GB')}</td><td class="num">${sum(0, 18, 1)}</td><td></td></tr>`;
      const rt = H.ratings[tee];
      $('#sc-rating').textContent = `${rt.label}: course rating ${rt.cr}, slope ${rt.slope}`;
      $$('[data-sctee]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sctee === tee)));
    };
    $$('[data-sctee]').forEach(b => b.onclick = () => draw(b.dataset.sctee));
    draw('white');
  }

  /* ---------- video modal ---------- */
  const modal = $('#modal');
  function openVideo(id, title) {
    // YouTube refuses embeds on pages opened from a file (error 153), so the mock-up opens YouTube instead; a live site plays in the page
    if (location.protocol === 'file:') { window.open(`https://www.youtube.com/watch?v=${id}`, '_blank', 'noopener'); return; }
    $('.box', modal).innerHTML = `<button class="x" aria-label="Close">×</button><div class="vid"><iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="${title}"></iframe></div>
      <div class="bar"><span>${title} · the club's own drone footage</span><a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">Not playing? Open it on YouTube</a></div>`;
    modal.classList.add('open');
  }
  function openImage(src, alt) {
    $('.box', modal).innerHTML = `<button class="x" aria-label="Close">×</button><img class="lb" src="${src}" alt="${alt || ''}">`;
    modal.classList.add('open');
  }
  window.HGCvideo = openVideo;
  if (modal) {
    modal.addEventListener('click', e => { if (e.target === modal || e.target.classList.contains('x')) { modal.classList.remove('open'); $('.box', modal).innerHTML = ''; } });
    addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) { modal.classList.remove('open'); $('.box', modal).innerHTML = ''; } });
  }
  $$('[data-video]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); openVideo(b.dataset.video, b.dataset.title || 'Flyover'); }));
  $$('[data-lb]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openImage(a.getAttribute('href'), a.dataset.lb); }));

  /* ---------- live weather (Open-Meteo, no key) ---------- */
  const compass = d => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(d / 45) % 8];
  const wxText = c => c === 0 ? 'Clear' : c <= 2 ? 'Partly cloudy' : c === 3 ? 'Cloudy' : c <= 48 ? 'Fog' : c <= 57 ? 'Drizzle' : c <= 67 ? 'Rain' : c <= 77 ? 'Snow' : c <= 82 ? 'Showers' : 'Thunder';
  const putWx = (k, v) => $$(`[data-wx=${k}]`).forEach(el => el.textContent = v);
  const cloud = '<path d="M7 17.5h10a3.8 3.8 0 0 0 .5-7.6 5.3 5.3 0 0 0-10.2 1.5A3.1 3.1 0 0 0 7 17.5z"/>';
  const WXI = { sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
    part: '<path d="M8 3v1.4M2.8 8.2h1.4M4.4 4.6l1 1M11.6 4.6l-1 1"/><path d="M10.9 9.4A3.3 3.3 0 0 0 5 9.6"/>' + cloud, cloud,
    fog: '<path d="M4 8.5h16M6 12.5h12M4 16.5h16"/>', rain: cloud + '<path d="M9 19.5l-.8 2M13 19.5l-.8 2M16.6 19.5l-.8 2"/>',
    snow: cloud + '<path d="M9 20.5h.01M12.5 21h.01M16 20.5h.01"/>', storm: cloud + '<path d="M12.6 17.8l-1.8 2.6h2.6l-1.6 2.3"/>' };
  const wxIcon = c => WXI[c === 0 ? 'sun' : c <= 2 ? 'part' : c === 3 ? 'cloud' : c <= 48 ? 'fog' : c <= 67 || (c >= 80 && c <= 82) ? 'rain' : c <= 86 ? 'snow' : 'storm'];
  const loadWx = () =>
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${H.geo[0]}&longitude=${H.geo[1]}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,wind_speed_10m,weather_code&daily=sunset&wind_speed_unit=mph&timezone=Europe%2FLondon&forecast_days=2`)
      .then(r => r.json()).then(w => {
        const c = w.current;
        window.HGC_WX = c; window.dispatchEvent(new CustomEvent('hgc-wx', { detail: c }));
        putWx('temp', Math.round(c.temperature_2m) + '°C');
        putWx('desc', wxText(c.weather_code));
        putWx('wind', `${compass(c.wind_direction_10m)} ${Math.round(c.wind_speed_10m)} mph`);
        putWx('gust', `gusts ${Math.round(c.wind_gusts_10m)} mph`);
        putWx('sunset', 'Sunset ' + w.daily.sunset[0].slice(11));
        $$('.wx .arrow svg').forEach(s => s.style.transform = `rotate(${c.wind_direction_10m + 180}deg)`);
        const now = new Date(); const start = w.hourly.time.findIndex(t => new Date(t) >= now);
        $$('.hours').forEach(h => h.innerHTML = w.hourly.time.slice(start, start + 8).map((t, k) =>
          `<div>${t.slice(11, 13)}:00<b>${Math.round(w.hourly.temperature_2m[start + k])}°</b>${Math.round(w.hourly.wind_speed_10m[start + k])} mph</div>`).join(''));
        $$('.cond .wxi').forEach(el => el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${wxIcon(c.weather_code)}</svg>`);
        $$('.cond .warrow svg').forEach(s => s.style.transform = `rotate(${c.wind_direction_10m + 180}deg)`);   // points the way the wind blows
        putWx('at', new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }));
        $$('[data-wx-live]').forEach(el => el.hidden = false);
      }).catch(() => $$('[data-wx-off]').forEach(el => el.hidden = false));
  if ($('[data-wx]')) { loadWx(); setInterval(loadWx, 10 * 60 * 1000); }   // fresh every ten minutes while the page is open

  /* ---------- what the office changes in the editor (/admin): course status and fixtures ---------- */
  // the online example's editor saves to this browser only (see publish_pages.py), so that comes first
  const mine = k => { try { return localStorage.getItem('hgc-demo:' + k); } catch (e) { return null; } };
  const saved = f => { try { return mine(f) && Object.assign(JSON.parse(mine(f)), { _mod: mine(f + ':mod') }); } catch (e) { return null; } };
  const content = f => saved(f) ? Promise.resolve(saved(f)) : /^https?:/.test(location.protocol)
    ? fetch('content/' + f, { cache: 'no-store' }).then(r => r.ok ? r.json().then(j => (j._mod = r.headers.get('Last-Modified'), j)) : null).catch(() => null)
    : Promise.resolve(null);

  const STATUS = { open: ['Course open', 'Cwrs ar agor', 'open'], temp: ['Temporary greens', 'Lawntiau dros dro', 'open, on temporary greens'], closed: ['Course closed', 'Cwrs ar gau', 'closed'] };
  content('course-status.json').then(s => {
    if (!s) return;
    const k = /closed/i.test(s.status) ? 'closed' : /temporary/i.test(s.status) ? 'temp' : 'open', [en, cy, short] = STATUS[k];
    $$('[data-cs=pill]').forEach(a => { a.title = s.detail || ''; const t = $('span', a); t.textContent = en; t.dataset.cy = cy; });
    $$('[data-cs] .sdot').forEach(d => d.className = 'sdot ' + k);
    $$('[data-cs=detail]').forEach(el => el.textContent = s.detail || '');
    $$('[data-cs=line]').forEach(el => el.firstChild.textContent = 'Course status: ' + short);
    $$('[data-cs=sum]').forEach(el => el.textContent = short + '. ' + (s.detail || ''));
    if (s._mod) $$('[data-cs=upd]').forEach(el => el.textContent = 'Updated by the office, ' + new Date(s._mod).toLocaleString('en-GB', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) + '.');
  });

  /* ---------- club diary calendar ---------- */
  const cal = $('#calendar');
  const drawCal = diary => {
    const y = 2026, m = 10; // November 2026
    const first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7;
    let html = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="h">${d}</div>`).join('');
    for (let i = 0; i < lead; i++) html += '<div class="d x"></div>';
    for (let d = 1; d <= days; d++) {
      const key = `${y}-11-${String(d).padStart(2, '0')}`;
      const evs = (diary[key] || []).map(e => `<span class="ev">${e}</span>`).join('');
      html += `<div class="d${key === todayIso ? ' today' : ''}"><b>${d}</b>${evs}</div>`;
    }
    cal.innerHTML = html;
    // phones get the same diary as a list (the month grid is too narrow to read there)
    let list = $('#callist');
    if (!list) { list = document.createElement('ul'); list.id = 'callist'; list.className = 'callist'; cal.after(list); }
    list.innerHTML = Object.keys(diary).filter(k => k.startsWith(`${y}-11-`)).sort().map(k => {
      const d = new Date(k + 'T12:00');
      return `<li${k === todayIso ? ' class="today"' : ''}><b>${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</b><span>${diary[k].join('<br>')}</span></li>`;
    }).join('');
  };
  if (cal) drawCal(H.diary);
  content('fixtures.json').then(f => {
    if (!f) return;
    const diary = {};
    (f.fixtures || []).forEach(x => { const d = String(x.date).slice(0, 10); (diary[d] = diary[d] || []).push(esc(x.title) + (x.details ? ', ' + esc(x.details) : '')); });
    if (cal) drawCal(diary);
    const up = f.pdf && mine('file:' + f.pdf);
    if (f.pdf) (up ? fetch(up).then(r => r.blob()).then(b => URL.createObjectURL(b)) : Promise.resolve(f.pdf))
      .then(u => $$('[data-cs=pdf]').forEach(a => a.href = u)).catch(() => {});
  });

  /* ---------- "Ask the club" assistant (example: answers only from club facts) ---------- */
  const ask = $('.ask');
  if (ask) {
    const log = $('.log', ask);
    const say = (html, who = 'bot') => { const m = document.createElement('div'); m.className = 'm ' + who; m.innerHTML = html; log.appendChild(m); log.scrollTop = log.scrollHeight; };
    const answer = q => {
      const t = q.toLowerCase();
      if (/today|green fee|how much|price.*(round|golf)|cost/.test(t) && !/societ|group/.test(t)) {
        const r = greenFee(todayIso, 'round');
        return r.price ? `Today is a ${r.di.label}. A round is <b>${gbp(r.price)}</b>, a day ticket ${gbp(greenFee(todayIso, 'day').price)}, twilight ${gbp(greenFee(todayIso, 'twilight').price)}. <a href="${H.links.booking}" target="_blank" rel="noopener">Book a tee time</a>`
          : `We're in the winter season (November to March). Winter green fees show when you pick a time on the <a href="${H.links.booking}" target="_blank" rel="noopener">booking page</a>, or call the office on 01407 763279.`;
      }
      for (const r of H.answers) if (new RegExp(r.re).test(t)) return r.a;
      return null;
    };
    const handle = q => {
      say(q.replace(/</g, '&lt;'), 'me');
      setTimeout(() => {
        const a = answer(q);
        say(a || `I don't have that one in the club's information, so I won't guess. Leave your email and the office will reply: <form class="mini" style="display:flex;gap:6px;margin-top:8px"><input type="email" placeholder="Your email" style="min-height:40px"><button class="btn green sm" type="submit">Send</button></form>`);
        $$('form.mini', log).forEach(f => f.onsubmit = e => { e.preventDefault(); f.outerHTML = '<b>Thanks. Passed to the office.</b> <span class="eg">Example</span>'; });
      }, 450);
    };
    $('.bubble', ask).onclick = () => { ask.classList.toggle('open'); if (!log.children.length) say(H.askHello); };
    $('.hd button', ask).onclick = () => ask.classList.remove('open');
    $$('.qs button', ask).forEach(b => b.onclick = () => handle(b.textContent));
    $('form', ask).onsubmit = e => { e.preventDefault(); const i = $('input', e.target); if (i.value.trim()) { handle(i.value.trim()); i.value = ''; } };
    $$('[data-ask]').forEach(b => b.onclick = e => { e.preventDefault(); ask.classList.add('open'); if (!log.children.length) say(H.askHello); });
    if (params.get('ask') === 'open') { ask.classList.add('open'); say(H.askHello); (params.get('askq') || '').split('|').filter(Boolean).forEach((q, k) => setTimeout(() => handle(q), 50 + k * 10)); }
  }

  /* ---------- reveal on scroll ---------- */
  if ('IntersectionObserver' in window && !root.classList.contains('noanim')) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.rv').forEach(el => io.observe(el));
  } else $$('.rv').forEach(el => el.classList.add('in'));
})();
