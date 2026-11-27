// Pixel Quest status bar. Modified from Herdr's shipped `workspace-status` mod
// (Apache-2.0, Herdr 0.1.14): machine, a party health bar (one cell per agent,
// in its status color), "! n 입력 필요", the branch, the palette key, and two
// mana gauges for Claude's 5-hour / 7-day usage (tools/pq-usage.js saves them).
//
// It also keeps the quest log: when an agent turns done, the quest count goes
// up, the quest goes on the log (pq.log) and the "퀘스트 완료" banner opens over
// the window (role "quest", in the chosen decoration); when that makes a new
// level, the level-up banner opens instead. Levels and unlocks: progress.js.
// Herdr itself plays the done sound (settings.json `sounds.done`), so the
// banner stays silent. Key commands (keys.json "<key>": "pixel-quest.<cmd>"):
// quest (try the banner), levelup (try this level's level-up banner), quest_reset, palette, settings, journal, look_phase /
// look_season (step through the times of day / seasons to try them), toast (a sample
// notification, one level per press: error, warning, success, info), shop, pet_try (step the
// pet through its moods), medal_try (a sample medal notification; nothing is given).
//
// Rebirth (reborn.js): under a star a quest is worth more EXP (pq.quests is the run's EXP),
// star shards come along a later run's levels and for every 40 EXP past Lv.20 (settle: paid
// here after each quest, and once at start for what came before); the star and the shards
// show on the right plate (click: the shop's 별 tab).
//
// Gold, medals and the pet (economy.js, shared pq.eco): a quest pays +10 G and the pet's
// bond, a new best level +50 G, medals their own gold; update day pays for the past once.
// The coin and gold sit on the right plate (click: the pet shop). The pet lives right of
// the party bar and shows how things are: asleep at home (all resting), walking out and
// back (working), "!" and fidgeting (waiting, click: go there), crouched and crawling
// with a blinking low battery (usage 80%+, click: the usage card), hopping (a quest
// just done). It speaks up in a bubble over its head by itself (economy.js talkNext: news at
// once, then on its own beat); hover shows the same words as a tooltip.
//
// In-app update (update.js): at start and every six hours it asks GitHub for the newest
// release (one public address, no sign-in; shared pq.update keeps the answer so copies don't
// ask twice; off with pq.updateCheck false, and then nothing is asked). A new one gets a
// notification once (click: the update window) and a crystal on the brand bar. The window's
// [업데이트] comes back here as `update_run`: the mod's update.ps1 / update.sh downloads the
// release, checks it and only then replaces the mod (Herdr reloads it in place). The start
// after that shows the patch notes once (pq.update.seen). Commands: update (the window),
// update_check (look now), update_run, notes.

import { div, svg } from "gpui-kit";
import { h_flex, v_flex, Popup } from "gpui-base";
import { spaces, agents, panes, run, window, keys, shared, setShared, openOverlay, closeOverlay, nextCommand, readTextFile, appHome, watchFolder, notify, exec, checking } from "herdr";
import { P, unit, root, small, button, pic, texture, cells, usageWindow, span, USAGE_FILE, watchUsage, lvInfo, best, quests, openJournal, openPalette, openSettings, openGoto, openRename, openHelp, applyLook, lookBox, tryLook, veil, eco, setEco, openShop, openHero, coin, announce, openUpdate, updateState, zoneNow, reb, shard, expText, ART } from "../kit.js";
import * as U from "../update.js";
import { oldLevel, levelOf, progressAt, pushLog, pick, equipables } from "../progress.js";
import * as E from "../economy.js";
import { agentNames, partyLines } from "../dialogs.js";
import { drop, lootZone } from "../loot.js";
import { settle, mult, overLeft, canReborn } from "../reborn.js";

const COLOR = { working: P.working, blocked: P.blocked, done: P.done, idle: P.idle };
const MOOD_KO = { sleep: "모두 쉼", walk: "작업 중", alert: "입력 대기", tired: "사용량 80% 넘음", hop: "퀘스트 완료" };

// `pixel-quest.toast`: notifications to try the look with, one level per press.
const SAMPLES = [
  { title: "space.new failed", body: "cannot reach build-box: ssh: Could not resolve hostname build-box", level: "error" },
  { title: "에이전트가 입력을 기다립니다", body: "my-api · 계속하려면 확인이 필요합니다", level: "warning" },
  { title: "퀘스트 완료", body: "notes-app · 에이전트가 일을 마쳤습니다", level: "success" },
  { title: "Herdr 업데이트", body: "0.1.15 · 새 기능을 확인하세요", level: "info" },
];

export default class Status {
  init(_p, cx) {
    // The look (time of day, season, the work area's shape, the font size): now, every
    // minute, when the window or the side panel changes (render / .state clicks).
    this.dirty = false;
    applyLook();
    // The window size can only be read while rendering: redraw, then apply.
    // Clicks (the side panel shown or resized) land in layouts/.state; before the first
    // click that folder may not exist, so the layouts folder is watched instead. Three
    // failures in a row rest the watch until the next minute, so it neither spins nor
    // stops for good.
    let dir = `${appHome()}/layouts/.state`, resting = false;
    const watch = (cx) => cx.spawn(async () => {
      for (let fails = 0; fails < 3;) {
        try { await watchFolder(dir); fails = 0; this.dirty = true; } catch { fails++; dir = `${appHome()}/layouts`; }
      }
      resting = true;
    });
    watch(cx);
    cx.timer.every(60000, (cx) => {
      cx.notify(); this.dirty = true;
      if (resting) { resting = false; dir = `${appHome()}/layouts/.state`; watch(cx); }
    });
    cx.timer.every(700, () => { if (this.dirty) { this.dirty = false; applyLook(); } });
    // Claude usage: pixel-quest-usage.json in the app folder (tools/pq-usage.js writes it).
    this.usage = null;
    const load = (cx) => cx.spawn(async (cx) => {
      try {
        const text = await readTextFile(`${appHome()}/${USAGE_FILE}`);
        const next = text ? JSON.parse(text) : null;
        if (JSON.stringify(next) !== JSON.stringify(this.usage)) this.usage = next;
      } catch { /* keep the last reading */ }
      cx.notify();   // also moves the countdowns on
    });
    watchUsage(cx, load);
    // Update day: keep the level the first release showed (one per five quests)
    // as a floor, and start the unlocks from it. Nobody's level goes down.
    if (shared("pq.best") == null) {
      const q = Number(shared("pq.quests")) || 0;
      if (oldLevel(q) > levelOf(q)) setShared("pq.floor", oldLevel(q));
      setShared("pq.best", Math.max(oldLevel(q), levelOf(q)));
    }
    // Update day for gold: the quests and levels so far paid once, and the medals already
    // met (pq.eco missing = not paid yet; one value, so it is paid exactly once).
    this.medalQueue = [];
    if (shared("pq.eco") == null) {
      const r = E.start(quests(), best(), new Date());
      setEco(r.eco);
      this.medalQueue.push(...r.got);
    }
    // Star shards for EXP from before (overflow past Lv.20 that was never paid): once, at start.
    this.noteQueue = [];
    this.shards(quests());
    // The pet: where it is on its lane (0 = home, right of the party bar, to 1), and
    // where it heads next every 3.2 s while it walks or crawls (a native spring).
    this.pet = { x: 0, ms: 0, easing: "linear", right: false };
    this.laneW = 0;
    this.hopUntil = 0;
    this.tryMood = null;
    // The speech bubble (E.talkNext): open since sayAt, in the mood it spoke for.
    this.talk = { mood: null, at: Date.now() };
    this.sayAt = 0;
    this.sayMood = null;
    cx.timer.every(3200, (cx) => {
      const mood = this.mood;
      const walk = shared("pq.petWalk") !== false;
      const next = E.nextSpot(walk || !["walk", "tired"].includes(mood) ? mood : "sleep", this.pet.x);
      // It stands still while it speaks, so the bubble stays beside it.
      if (!next || !this.shown || this.sayAt) return;
      this.pet = { x: next.x, ms: next.ms, easing: next.easing, right: next.x > this.pet.x };
      cx.notify();
    });
    // The hop lasts about three seconds. Medals earned while the bar draws (quests and the
    // full party are seen in render) wait here: a notify() made during render never shows
    // (measured), so they go out from this timer.
    cx.timer.every(500, (cx) => {
      if (this.medalQueue.length) { const got = this.medalQueue; this.medalQueue = []; announce(got); }
      if (this.noteQueue.length) { const ns = this.noteQueue; this.noteQueue = []; for (const n of ns) notify(n); }
      // The patch notes after an update, once the saves have settled (three quiet seconds).
      if (shared("pq.update.notes") && Date.now() - this.bornAt > 3000) { setShared("pq.update.notes", null); openUpdate(true); }
      if (this.hopUntil && Date.now() > this.hopUntil) { this.hopUntil = 0; cx.notify(); }
      const now = Date.now();
      if (this.shown && this.mood) {
        const t = E.talkNext(this.talk, this.mood, now);
        this.talk = { mood: t.mood, at: t.at };
        if (t.show) { this.sayAt = now; this.sayMood = this.mood; cx.notify(); }
      }
      if (this.sayAt && now - this.sayAt > E.TALK.show) { this.sayAt = 0; cx.notify(); }
    });
    // In-app update. A check (herdr-app check) asks nothing and writes nothing.
    this.looking = 0;
    this.bornAt = Date.now();
    if (!checking()) {
      const seen = shared("pq.update.seen");
      if (seen !== U.VERSION) {
        // A newer build than the one last seen: its patch notes once (never on a first install),
        // and an install that was under way is over. The notes wait in shared state: an update
        // saves many files and each save starts this copy again, so a note kept here would be lost.
        if (U.notesDue(seen)) setShared("pq.update.notes", U.VERSION);
        setShared("pq.update.seen", U.VERSION);
        setShared("pq.update.busy", null);
      }
      this.look(cx);
      cx.timer.every(600000, (cx) => this.look(cx));
    }
    // Only status changes seen while this runs count: no fanfare for the past.
    this.last = new Map(agents().map((a) => [a.address, a.status]));
    // `pixel-quest.quest` (a key or `herdr-app do`) shows the banner once, to try it.
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        if (c === "quest") this.fanfare({ space_name: "미리보기 퀘스트", address: "demo" }, false);
        else if (c === "quest_reset") { setShared("pq.quests", 0); setShared("pq.floor", null); }
        else if (c === "palette") openPalette();
        else if (c === "goto") openGoto();
        else if (c === "settings") openSettings();
        else if (c === "journal") openJournal();
        else if (c === "rename_tab") openRename("tab");
        else if (c === "rename_space") openRename("space");
        else if (c === "help") openHelp();
        else if (c === "levelup") this.fanfare({ space_name: "미리보기 퀘스트", address: "demo" }, false, lvInfo().lv);
        else if (c === "look_phase") tryLook("phase");
        else if (c === "look_season") tryLook("season");
        else if (c === "shop") openShop();
        else if (c === "star") openHero("shop", "star");
        else if (c === "hero") openHero();
        else if (c === "pet_try") {
          const list = [null, "sleep", "walk", "alert", "tired", "hop"];
          this.tryMood = list[(list.indexOf(this.tryMood) + 1) % list.length];
          notify({ title: "펫 상황 미리보기", body: this.tryMood ? `상황: ${MOOD_KO[this.tryMood]}` : "실제 상황으로 돌아감", level: "info" });
        }
        else if (c === "medal_try") {
          const k = (this.medals = ((this.medals ?? -1) + 1) % E.MEDALS.length);
          announce([E.MEDALS[k]], true);
        }
        else if (c === "update") openUpdate();
        else if (c === "notes") openUpdate(true);
        else if (c === "update_check") this.look(cx, true);
        else if (c === "update_run") this.install(cx);
        else if (c === "toast") {
          const k = (this.toasts = ((this.toasts ?? -1) + 1) % SAMPLES.length);
          notify(SAMPLES[k]);
        }
        cx.notify();
      }
    });
  }

  // Asks GitHub for the newest release when it is time (force: now, and say what came of it).
  look(cx, force = false) {
    if (shared("pq.updateCheck") === false) {
      if (force) notify({ title: "업데이트 확인이 꺼져 있습니다", body: "던전 설정 · 모양 · 업데이트에서 켤 수 있습니다", level: "info" });
      return;
    }
    const cache = shared("pq.update") ?? null;
    if (!force && !U.due(cache, Date.now())) { this.tell(false, true); return; }
    // (A look that never came back stops counting after two minutes.)
    if (Date.now() - this.looking < U.LOOK_FOR) return;
    this.looking = Date.now();
    // The time goes in first, so another copy that starts meanwhile doesn't ask too.
    setShared("pq.update", { ...(cache ?? {}), at: Date.now() });
    cx.spawn(async (cx) => {
      let release = null;
      try {
        const r = await fetch(U.LATEST_URL, { headers: U.HEADERS });
        if (r.ok) release = U.fromRelease(await r.json());
      } catch { release = null; }
      setShared("pq.update", U.looked(cache, release, Date.now()));
      this.looking = 0;
      this.tell(force, Boolean(release));
      cx.notify();
    });
  }

  // A new version: a notification once per version (force: the window at once).
  tell(force, ok) {
    const st = updateState();
    if (st.state === "new") {
      if (force) openUpdate();
      else if (shared("pq.update.told") !== st.latest) {
        setShared("pq.update.told", st.latest);
        notify({ title: `새 버전 v${st.latest}`, body: "눌러서 업데이트", level: "info", action: { name: "pixel-quest.update" } });
      }
    } else if (force) {
      notify(ok ? { title: "최신 버전입니다", body: `Pixel Quest v${U.VERSION}`, level: "success" }
        : { title: "새 버전을 확인하지 못했습니다", body: "네트워크를 확인하고 잠시 뒤 다시 해 주세요", level: "warning" });
    }
  }

  // Installs the newest release (the update window's button). One at a time, in every copy.
  install(cx) {
    const st = updateState();
    if (st.state !== "new") return;
    const now = Date.now();
    if (now - (Number(shared("pq.update.busy")) || 0) < U.BUSY_FOR) { notify({ title: "이미 업데이트하는 중입니다", level: "info" }); return; }
    const plan = U.installer(window()?.platform, appHome(), st.latest);
    if (!plan) return;
    setShared("pq.update.busy", now);
    notify({ title: `v${st.latest} 받는 중…`, body: "검사를 통과하면 바로 바뀝니다. 잠시만 기다려 주세요", level: "info" });
    cx.spawn(async () => {
      let r = null, why = "";
      try { r = await exec(plan.command, plan.args, { timeout: 300000 }); } catch (e) { why = String(e?.message ?? e); }
      setShared("pq.update.busy", null);
      if (r?.code === 0) notify({ title: `v${st.latest} 설치 완료`, body: "바뀐 모습이 안 보이면 Herdr를 한 번 껐다 켜 주세요", level: "success", action: { name: "pixel-quest.notes" } });
      else notify({ title: "업데이트하지 못했습니다", body: `${U.lastLine(r) || why || "알 수 없는 오류"} · 지금 버전은 그대로입니다`, level: "error" });
    });
  }

  // The palette key as actually bound, not a hardcoded one.
  hint() {
    const mac = window()?.platform === "macos";
    const mod = { cmd: mac ? "⌘" : "Ctrl+", ctrl: mac ? "⌃" : "Ctrl+", shift: mac ? "⇧" : "Shift+", alt: mac ? "⌥" : "Alt+", option: mac ? "⌥" : "Alt+" };
    const b = keys().find((k) => k.section === "global" && k.action === "pixel-quest.palette")
      ?? keys().find((k) => k.section === "global" && k.action === "app.palette");
    const parts = b && b.keys.endsWith("--") ? [...b.keys.slice(0, -2).split("-"), "-"] : b?.keys.split("-");
    return parts && parts.map((p) => mod[p.toLowerCase()] ?? p.toUpperCase()).join("");
  }

  watch(list) {
    const working = list.filter((a) => a.status === "working").length;
    if (working > eco().partyMax) {
      const r = E.onParty(eco(), working, { now: new Date(), best: best() });
      setEco(r.eco);
      this.medalQueue.push(...r.got);
    }
    for (const a of list) {
      const was = this.last.get(a.address);
      if (a.status === "done" && was && was !== "done" && was !== "idle") this.fanfare(a);
      this.last.set(a.address, a.status);
    }
  }

  // Pays the star shards the run's EXP has earned (reborn.js settle) and says so. The words go
  // out from the timer: a notify() made during render never shows.
  shards(exp) {
    const r = settle(eco(), exp);
    if (r.eco !== eco()) setEco(r.eco);
    if (r.got) this.noteQueue.push({ title: `별조각 ${r.got}개를 받았습니다.`, body: `별조각 상점에서 쓸 수 있습니다. (보유: ${E.fmt(r.eco.shards)}개)`, level: "success", icon: `${ART}/shard.png`, action: { name: "pixel-quest.star" } });
  }

  // A member's name as its party row shows it (the tab someone named or the agent's own
  // title first, else its space: dialogs.js), so the banner, the log and the pet say the same.
  nameOf(a) {
    return partyLines(a, agentNames(agents(), panes(), spaces()).detail(a)).name || "agent";
  }

  // try: a level to show the level-up banner for (pixel-quest.levelup, nothing counted).
  fanfare(a, count = true, tryLv = null) {
    const before = lvInfo().lv;
    // Under a star a quest is worth more EXP (1.5 to 3).
    const n = (Number(shared("pq.quests")) || 0) + (count ? mult(reb().stars) : 0);
    const title = this.nameOf(a);
    let gold = 0, loot = null;
    if (count) {
      setShared("pq.quests", n);
      setShared("pq.log", pushLog(shared("pq.log"), { name: title, at: Date.now() }));
      setShared("pq.best", Math.max(Number(shared("pq.best")) || 1, progressAt(n, shared("pq.floor")).lv));
      // Gold, the day's count, the pet's bond, new medals (level gold follows pq.best).
      const working = agents().filter((x) => x.status === "working").length;
      const r = E.onQuest(eco(), { now: new Date(), best: best(), lv: lvInfo().lv, working });
      // The shown zone's loot may drop (loot.js): a legendary again or a zone's five pay gold.
      const d = drop(r.eco, lootZone(zoneNow()));
      setEco(d.eco);
      this.shards(n);
      gold = r.gained + (d.got?.gold ?? 0);
      loot = d.got;
      this.medalQueue.push(...r.got);
      this.hopUntil = Date.now() + 3000;
    }
    const after = tryLv ?? progressAt(n, shared("pq.floor")).lv;
    const up = Boolean(tryLv) || (count && after > before);
    const wear = up ? equipables(after, { frame: shared("pq.frame"), banner: shared("pq.bannerStyle") }) : [];
    // The level that opens a rebirth: the banner says so (with the guide, before the first one).
    const reborn = up && canReborn(eco(), after) && (Boolean(tryLv) || !canReborn(eco(), before));
    if (shared("pq.banner") === false && !up) return;
    const prev = shared("pq.banner.open");
    if (prev) closeOverlay(prev);
    const style = pick("banner", shared("pq.bannerStyle"), best());
    const id = openOverlay({
      mod: "pixel-quest", kind: "window", key: "pq-quest", frame: "none", width: 360, height: (wear.length ? 142 : 112) + (gold ? 16 : 0) + (loot ? 34 : 0) + (reborn ? 26 : 0),
      props: { role: "quest", title, agent: a.address, pane: a.pane, quests: expText(n), exp: mult(reb().stars), style, levelUp: up ? after : null, gold, loot, reborn: reborn ? (reb().stars ? "again" : "first") : null },
    });
    setShared("pq.banner.open", id);
  }

  // One usage window as a mana gauge: label, ten cells, percent, time to reset.
  gauge(u, id, label, long, w) {
    const r = usageWindow(w);
    return h_flex().id(id).gap(u(4)).items_center()
      .tooltip(r.over ? `${long} 한도: 기록 없음` : `${long} 한도 ${Math.round(r.pct)}% 사용 · ${r.at} 초기화`)
      .child(small(u, label, P.gt2))
      .child(cells(u, r))
      .child(small(u, r.over ? "--" : `${Math.round(r.pct)}%`, r.over ? P.dim : P.text))
      .when(r.left != null, (el) => el.child(small(u, span(r.left), P.dim)));
  }

  // The pet's speech bubble (the confirmed mockup's: fill, dark rim, a thin gold line inside),
  // over the pet's head. The status block clips what is drawn above it (measured) and the
  // terminal paints over the rest, so the bubble is a Popup: Herdr paints it in a layer above
  // the whole window, on its own opaque fill, and keeps it inside the window's edges.
  bubble(u) {
    const s = this.speech;
    const lane = u(10) + this.leftW + u(12);           // the bar's padding, the left plate, the gap
    const words = div().id("pet-say").max_w(u(280)).mb(u(2))
      .bg(P.raised).border(u(2)).border_color(P.ink).p(u(1))
      .child(div().border(u(1)).border_color(P.g2).px(u(6)).py(u(1)).child(small(u, s.words, P.text)));
    // The trigger is the top edge of the pet's box (it stands still while it speaks).
    return Popup.new("pet-say-at", div().size_full()).absolute().top(u(-(this.tall ? 18 : 0))).h(u(2)).w(s.w).left(lane + s.at)
      .anchor("bottom_center").content(root(u, words));
  }

  // The pet's lane: the free stretch right of the party bar. Home is its left end.
  petLane(u, list) {
    const e = eco();
    const tryIt = this.tryMood;
    const key = e.pet ?? (tryIt ? "slime" : null);
    this.shown = Boolean(key) && shared("pq.petShow") !== false;
    const waiting = list.find((a) => a.status === "blocked");
    const drain = E.drained(this.usage, Date.now() / 1000);
    const mood = tryIt ?? E.moodOf({ blocked: Boolean(waiting), hop: this.hopUntil > Date.now(), tired: Boolean(drain), working: list.some((a) => a.status === "working") });
    this.mood = mood;
    const lane = div().id("pet-lane").flex_1().h_full().relative()
      .on_size_change((sz, cx) => { if (Math.abs(sz.width - this.laneW) > 1) { this.laneW = sz.width; cx.notify(); } });
    if (!this.shown) {
      return shared("pq.petShow") === false ? lane : lane.child(div().id("pet-none").absolute().right(0).top(u(5)).cursor_pointer()
        .tooltip("상점에서 펫을 구매하면 여기서 함께 다닙니다 · 누르면 상점").on_click(() => openShop("dex"))
        .child(small(u, "펫 없음", P.dim)));
    }
    const crouch = mood === "sleep" || mood === "tired";
    const art = E.petArt(key, e.pets[key] ?? 0, crouch, this.pet.right);
    // The pet stands in line with the plates; its box reaches up over the sill and the spacer
    // (the tall status block draws them), so the marks stand above its head as in the
    // mockup: Z at the top right, "!" and the battery centred over it.
    const up = this.tall ? 18 : 0;
    const H = 26 + up;   // the bar's height inside its top edge, plus the room above
    const markW = mood === "tired" ? 36 : mood === "sleep" ? art.w + 4 : art.w;
    const boxW = Math.max(art.w, markW);
    // Its feet on the plates' bottom edge (the 20px plates sit 3px above the bar's floor), as
    // the mockup has it.
    const px = Math.round((boxW - art.w) / 2), top = H - 3 - art.h, mid = Math.round(boxW / 2);
    let img = pic(u, art.name, art.w, art.h).absolute().top(u(top)).left(u(px));
    if (mood === "hop") img = img.loop("top", { from: u(top - 6), to: u(top), period: 360 });
    else if (mood === "alert") img = img.loop("left", { from: u(px - 2), to: u(px + 2), period: 180 });
    else if (mood === "tired") img = img.loop("top", { from: u(top - 1), to: u(top), period: 1200 });
    let mark = null;
    if (mood === "sleep") mark = pic(u, "zz", 10, 8).absolute().left(u(px + art.w - 6)).top(u(Math.max(0, top - 6))).loop("opacity", { from: 0.25, to: 1, period: 1100 });
    else if (mood === "alert") mark = pic(u, "bang", 10, 16).absolute().left(u(mid - 5)).top(u(Math.max(0, top - 18))).loop("opacity", { from: 0.4, to: 1, period: 500 });
    else if (mood === "tired") {
      mark = div().absolute().left(u(mid - 18)).top(u(Math.max(0, top - 30))).w(u(36)).h(u(24))
        .child(pic(u, "batt-shell", 36, 24).absolute().top(0).left(0))
        .child(pic(u, "batt-bolt", 36, 24).absolute().top(0).left(0).loop("opacity", { from: 0, to: 1, period: 1000 }));
    }
    const room = Math.max(0, this.laneW - u(boxW));
    const ctx = { now: new Date(), best: best() };
    const say = E.bubble(e, ctx, { mood, who: waiting ? this.nameOf(waiting) : "", drain: drain ?? { label: "5시간", pct: 80 } });
    const name = E.petOf(key)?.name ?? key;
    // While it speaks, the bar draws the bubble beside it (bubble(): after the moss, which
    // would cover it otherwise).
    const speaking = this.sayAt && Date.now() - this.sayAt <= E.TALK.show;
    this.speech = speaking ? {
      words: this.sayMood === mood ? say : E.bubble(e, ctx, { mood: this.sayMood, who: waiting ? this.nameOf(waiting) : "", drain: drain ?? { label: "5시간", pct: 80 } }),
      at: room * this.pet.x, w: u(boxW), room,
    } : null;
    const box = div().id("pet").absolute().top(u(-up)).h(u(H)).w(u(boxW)).left(room * this.pet.x)
      // transition("left") never moved it in Herdr 0.1.15 (measured); a spring with no
      // overshoot does, its response scaled to the planned walk time.
      .spring("left", { response: Math.max(200, Math.round(this.pet.ms * 0.6)), damping: 1 })
      .cursor_pointer().tooltip(`${name} · ${say}`)
      .on_click(() => {
        if (mood === "alert" && waiting?.pane) run("pane.focus", { pane: waiting.pane });
        else if (mood === "tired") openOverlay({ mod: "pixel-quest", kind: "popup", frame: "none", width: 340, height: 296, props: { role: "usage" } });
        else openShop("dex");
      })
      .child(img)
      .when(Boolean(mark), (el) => el.child(mark));
    return lane.child(box);
  }

  render() {
    const u = unit();
    // The window's size (legal only while rendering) for the look's box shape.
    try { const v = globalThis.window?.viewport_size?.(); if (v && lookBox({ vw: v.width, vh: v.height })) this.dirty = true; } catch { /* no window yet */ }
    const list = agents();
    this.watch(list);
    const space = spaces().find((s) => s.active);
    const needs = list.filter((a) => a.status === "blocked").length;
    const key = this.hint();
    const cell = (a) => div().w(u(14)).h_full().bg(COLOR[a.status] ?? P.idle).border_r(u(2)).border_color(P.ink);
    // Text sits on dark stone plates so the brick band doesn't eat its contrast.
    const plate = () => h_flex().h(u(20)).px(u(6)).gap(u(12)).items_center().bg(P.chrome).border(u(2)).border_color(P.ink);
    const moss = (side, at) => pic(u, "moss", 22, 6).absolute().top(0)[side](u(at));
    const left = plate().on_size_change((sz, cx) => { if (Math.abs(sz.width - (this.leftW ?? 0)) > 1) { this.leftW = sz.width; cx.notify(); } })
      .child(div().text_color(P.muted).child(space?.machine ?? "이 컴퓨터"))
      .child(h_flex().gap(u(6)).items_center()
        .child(small(u, "파티", P.gt2))
        .child(h_flex().h(u(12)).border(u(2)).border_color(P.ink).bg(P.ink).children(list.slice(0, 12).map(cell)))
        .when(list.length === 0, (el) => el.child(small(u, "없음"))))
      .when(needs > 0, (el) => el.child(small(u, `! ${needs} 입력 필요`, P.blocked).loop("opacity", { from: 0.5, to: 1, period: 900 })))
      .when(Boolean(space?.branch), (el) => el.child(small(u, space.branch, P.muted)));
    const use = this.usage;
    // Click: the usage card above the bar (a popup at the pointer).
    const mana = shared("pq.gauges") !== false && use && (use.five_hour || use.seven_day) ? plate().id("usage").cursor_pointer()
      .hover((s) => s.border_color(P.g2))
      .on_click(() => openOverlay({ mod: "pixel-quest", kind: "popup", frame: "none", width: 340, height: 296, props: { role: "usage" } }))
      .child(this.gauge(u, "use-5h", "5H", "5시간", use.five_hour))
      .child(this.gauge(u, "use-7d", "7D", "7일", use.seven_day)) : null;
    const lv = lvInfo();
    const e = eco(), rb = reb();
    // Under a star the count is EXP (a quest is worth more than one); past Lv.20 it also says
    // how far the next overflow shard is, and that a rebirth is open.
    const over = overLeft(lv.q);
    const tip = (rb.stars ? `★${rb.stars} · 퀘스트 1개 = 경험치 ${mult(rb.stars)} · ` : "퀘스트 = 에이전트가 일을 끝낸 횟수 · ")
      + `Lv.${lv.lv} · 다음 레벨까지 ${expText(lv.left)}`
      + (over != null ? ` · 별조각까지 ${expText(over)}` : "");
    const right = plate()
      .child(h_flex().id("quests").gap(u(6)).items_center().cursor_pointer()
        .tooltip(tip)
        .on_click(() => openJournal())
        .when(rb.stars > 0, (el) => el.child(small(u, `★${rb.stars}`, P.g3)))
        .child(small(u, `${rb.stars ? "경험치" : "퀘스트"} ${expText(lv.q)}`, P.gt2))
        .child(cells(u, { pct: lv.frac * 100, tone: P.g2 }, 10, 4, 10)))
      .when(rb.stars > 0 || rb.shards > 0 || canReborn(e, lv.lv), (el) => el.child(h_flex().id("shards").gap(u(4)).items_center().cursor_pointer()
        .tooltip(`별조각 ${E.fmt(rb.shards)}개 · 누르면 별조각 상점`)
        .on_click(() => openHero("shop", "star"))
        .child(shard(u))
        .child(small(u, E.fmt(rb.shards), P.gt))))
      .child(h_flex().id("gold").gap(u(4)).items_center().cursor_pointer()
        .tooltip(`골드 ${E.fmt(e.gold)} G · 누적 ${E.fmt(e.earned)} G · 누르면 상점`)
        .on_click(() => openShop())
        .child(coin(u))
        .child(small(u, E.fmt(e.gold), P.gt)))
      .child(h_flex().id("palette").gap(u(6)).items_center().cursor_pointer().on_click(() => openPalette())
        .when(Boolean(key), (el) => el.child(div().border(u(2)).border_color(P.b1).bg(P.raised).px(u(4)).child(small(u, key, P.text))))
        .child(small(u, "명령", P.dim)));
    // The bar no longer clips (the pet's marks reach above it), so its bricks clip in a box.
    const bar = h_flex().on_size_change((sz, cx) => { this.barW = sz.width; if (lookBox({ workW: sz.width })) { this.dirty = true; cx.notify(); } }).w_full().h(u(28)).flex_none().relative().px(u(10)).gap(u(12)).items_center().bg(P.chrome).border_t(u(2)).border_color(P.ink)
      .child(div().absolute().top(0).left(0).right(0).bottom(0).overflow_hidden().child(texture(u, "strip", 2560, 48)).when(Boolean(veil()), (el) => el.child(veil())))
      .child(left)
      .child(this.petLane(u, list))
      .when(Boolean(mana), (el) => el.child(mana))
      .child(right)
      // Moss tufts belong to the dungeon (and the moss ruins); other zones keep their stone bare.
      .when(!P.zone || P.zone === "moss", (el) => el.child(moss("left", 250)).child(moss("left", 560)).child(moss("right", 260)))
      .when(Boolean(this.speech && this.leftW && this.barW), (el) => el.child(this.bubble(u)));
    // The tall block (44, layouts from stage 2 on) draws the spacer under the work body and
    // the stone sill itself; an older 28px block shows the bar alone.
    return root(u, v_flex().size_full().relative().justify_end()
      .on_size_change((sz, cx) => { const t = sz.height >= u(40); if (t !== this.tall) { this.tall = t; cx.notify(); } })
      .when(Boolean(this.tall), (el) => el
        .child(div().h(u(8)).flex_none())
        .child(div().h(u(8)).flex_none().relative().overflow_hidden().bg(P.ink).child(texture(u, "sill", 2560, 8)).when(Boolean(veil()), (x) => x.child(veil()))))
      .child(bar));
  }
}
