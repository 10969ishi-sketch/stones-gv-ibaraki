/* Glamping Village IBARAKI — 映像ファーストHP（提案デモ） */
(() => {
  const html = document.documentElement;
  html.classList.remove('no-js');
  html.classList.add('js');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const noVideo = reduce || saveData; // 動きを減らす設定・データセーバー時は静止画だけ
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- 冒頭映像 ---------- */
  const hero = $('#heroVideo');
  // 表示枠が縦長ならスマホ用（縦）の映像、横長ならPC用。サイズが変わったら途中から切り替える
  let heroKind = null;
  const setHero = () => {
    const r = hero.getBoundingClientRect();
    const kind = r.width && r.height && r.width / r.height < 0.9 ? 'sp' : 'pc';
    if (kind === heroKind) return;
    heroKind = kind;
    hero.poster = kind === 'sp' ? hero.dataset.posterSp : hero.dataset.posterPc;
    if (noVideo) return;
    const t = hero.currentTime || 0;
    hero.src = kind === 'sp' ? hero.dataset.sp : hero.dataset.pc;
    if (t) hero.addEventListener('loadedmetadata', () => { hero.currentTime = t; }, { once: true });
    const p = hero.play();
    if (p) p.catch(() => {});
  };
  setHero();
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(setHero, 300); });

  // 読み込みの幕：映像が再生できる状態になったら開ける（最短0.9秒・最長2.2秒）
  const t0 = performance.now();
  let opened = false;
  const open = () => {
    if (opened) return;
    opened = true;
    setTimeout(() => html.classList.add('loaded'), Math.max(0, 900 - (performance.now() - t0)));
  };
  if (noVideo) open();
  hero.addEventListener('canplay', open, { once: true });
  setTimeout(open, 2200);

  // 映像に合わせて「一日の時刻」を進める（build_hero.py のカット割りと対応）
  const SCENES = [
    [0.0,  '05:40', '太平洋から昇る朝日'],
    [2.95, '06:00', '屋根越しに見る二ツ島'],
    [7.25, '06:30', '赤いデッキに並ぶドームテント'],
    [10.05,'07:00', '堤防の目の前に建つヴィレッジ'],
    [13.35,'08:00', '朝ごはんは大津港のしらす丼'],
    [15.25,'11:00', '波打ち際のウッドデッキ'],
    [18.55,'15:00', '海に浮かぶ二ツ島'],
    [21.85,'18:00', '地酒と、海の幸'],
    [23.15,'19:30', '夜のバレルサウナ'],
    [25.45,'20:00', '潮風の外気浴'],
    [27.75,'21:30', '焚き火を囲む夜'],
    [30.05,'05:40', '太平洋から昇る朝日'],
  ];
  const cTime = $('.clock-time'), cCap = $('.clock-cap'), cBar = $('.clock-bar i');
  let scene = 0, heroVisible = true;
  const tick = () => {
    if (heroVisible && hero.duration) {
      const t = hero.currentTime;
      let i = 0;
      while (i < SCENES.length - 1 && t >= SCENES[i + 1][0]) i++;
      if (i !== scene) {
        scene = i;
        cCap.classList.add('swap');
        setTimeout(() => { cTime.textContent = SCENES[i][1]; cCap.textContent = SCENES[i][2]; cCap.classList.remove('swap'); }, 250);
      }
      cBar.style.transform = `scaleX(${t / hero.duration})`;
    }
    requestAnimationFrame(tick);
  };
  if (!noVideo) requestAnimationFrame(tick);

  new IntersectionObserver(([e]) => {
    heroVisible = e.isIntersecting;
    if (noVideo) return;
    if (heroVisible) { const p = hero.play(); if (p) p.catch(() => {}); } else hero.pause();
  }, { threshold: 0.05 }).observe($('.hero'));

  // 映像だけを見るモード
  const filmBtn = $('.film-btn');
  filmBtn.addEventListener('click', () => {
    const on = !html.classList.contains('cinema');
    html.classList.toggle('cinema', on);
    filmBtn.setAttribute('aria-pressed', on);
    if (on && hero.paused && !noVideo) hero.play().catch(() => {});
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && html.classList.contains('cinema')) filmBtn.click();
  });

  /* ---------- ヘッダー・スマホ下部バー ---------- */
  const hd = $('#hd'), spBar = $('.sp-bar');
  const onScroll = () => {
    const y = scrollY;
    hd.classList.toggle('scrolled', y > 40);
    spBar.classList.toggle('show', y > innerHeight * 0.6);
    if (y > innerHeight && html.classList.contains('cinema')) filmBtn.click();
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // スマホメニュー
  const menuBtn = $('.hd-menu'), menu = $('#menu');
  const setMenu = on => {
    html.classList.toggle('menu-open', on);
    menuBtn.setAttribute('aria-expanded', on);
    menu.setAttribute('aria-hidden', !on);
  };
  menuBtn.addEventListener('click', () => setMenu(!html.classList.contains('menu-open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ---------- ループ映像：近づいたら読み込み、見えている間だけ再生 ---------- */
  const lv = $$('video.lv');
  // 重ねて切り替える場所（サウナ・客室）は .on の映像だけ再生する
  const playable = v => {
    const stack = v.closest('.sauna-stage, .room-stage');
    return !stack || v.classList.contains('on');
  };
  const play = v => { if (v.src && playable(v)) { const p = v.play(); if (p) p.catch(() => {}); } };
  const loadIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const v = e.target;
    if (!v.getAttribute('src') && v.dataset.src && !noVideo) { v.src = v.dataset.src; v.load(); }
    loadIO.unobserve(v);
  }), { rootMargin: '700px 700px' });
  const visible = new Set();
  const playIO = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { visible.add(v); play(v); } else { visible.delete(v); v.pause(); }
  }), { threshold: 0.12 });
  lv.forEach(v => { loadIO.observe(v); playIO.observe(v); });

  /* ---------- スクロールで現れる ---------- */
  const rvIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const sibs = $$(':scope > .rv', el.parentElement);
    el.style.transitionDelay = `${Math.min(sibs.indexOf(el), 4) * 0.08}s`;
    el.classList.add('in');
    rvIO.unobserve(el);
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach(el => rvIO.observe(el));

  /* ---------- ある一日：PCは縦スクロールで横に流す ---------- */
  const day = $('.day'), track = $('.day-track'), dayBar = $('.day-progress i');
  const mqPin = matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
  let dist = 0;
  const measure = () => {
    if (mqPin.matches) {
      day.classList.add('pin-on');
      track.style.transform = '';
      const last = track.lastElementChild;
      const gut = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      dist = Math.max(0, last.offsetLeft + last.offsetWidth + gut - innerWidth);
      day.style.height = `${innerHeight + dist}px`;
    } else {
      day.classList.remove('pin-on');
      day.style.height = '';
      track.style.transform = '';
      dist = 0;
    }
    pinScroll();
  };
  const pinScroll = () => {
    if (!day.classList.contains('pin-on')) return;
    const r = day.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, day.offsetHeight - innerHeight), 0, 1);
    track.style.transform = `translate3d(${-p * dist}px,0,0)`;
    dayBar.style.transform = `scaleX(${p})`;
  };
  track.addEventListener('scroll', () => {
    if (day.classList.contains('pin-on')) return;
    const max = track.scrollWidth - track.clientWidth;
    dayBar.style.transform = `scaleX(${max > 0 ? track.scrollLeft / max : 0})`;
  }, { passive: true });
  addEventListener('scroll', pinScroll, { passive: true });
  addEventListener('resize', measure);
  addEventListener('load', measure);
  measure();

  /* ---------- サウナ：読み進めると映像が切り替わる ---------- */
  const stage = $('.sauna-stage');
  const stageVids = $$('video', stage), dots = $$('.sauna-dots li'), steps = $$('.step');
  const setStep = i => {
    stageVids.forEach((v, k) => {
      v.classList.toggle('on', k === i);
      if (k === i) { if (visible.has(v)) play(v); } else v.pause();
    });
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
    steps.forEach((s, k) => s.classList.toggle('on', k === i));
  };
  const stepIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) setStep(+e.target.dataset.step);
  }), { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => stepIO.observe(s));
  setStep(0);

  /* ---------- タブ（客室・プラン） ---------- */
  const selectTab = tab => {
    const list = tab.closest('[role=tablist]');
    $$('[role=tab]', list).forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !on;
      if (!on) $$('video', panel).forEach(v => v.pause());
    });
  };
  $$('[role=tab]').forEach(t => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const tabs = $$('[role=tab]', t.closest('[role=tablist]'));
      const n = tabs[(tabs.indexOf(t) + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); selectTab(n);
    });
  });

  // 客室の写真切り替え
  $$('.room-media').forEach(m => {
    const items = [...$('.room-stage', m).children];
    const thumbs = $$('.room-thumbs button', m);
    thumbs.forEach((b, i) => b.addEventListener('click', () => {
      items.forEach((it, k) => {
        it.classList.toggle('on', k === i);
        if (it.tagName === 'VIDEO') { if (k === i) play(it); else it.pause(); }
      });
      thumbs.forEach((x, k) => x.classList.toggle('on', k === i));
    }));
  });

  // 広告などから #plan-family 等で来たら、そのプランを開いた状態にする
  const openPlanFromHash = () => {
    const id = location.hash.slice(1);
    if (!/^plan-/.test(id)) return;
    const tab = $(`[role=tab][aria-controls="${id}"]`);
    if (!tab) return;
    selectTab(tab);
    requestAnimationFrame(() => $('#plans').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }));
  };
  addEventListener('hashchange', openPlanFromHash);
  openPlanFromHash();
})();
