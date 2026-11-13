// "퀘스트 완료": the banner the status bar opens when an agent finishes, in the
// decoration chosen in the adventure log (props.style: basic | flag | torch |
// gems | crown | legend, unlocked by level). With props.levelUp it is the
// level-up banner instead, listing what the new level gives. It leaves by
// itself after a few seconds. Click: go to that agent's pane (level up: open
// the adventure log). A new frame or banner can be put on right there (바로 착용). props.gold:
// the gold the quest made (one more line, "+10 G"). Copyright (c) 2026 cubha. MIT License.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, closeOverlay, run, shared, setShared } from "herdr";
import { P, unit, root, pic, frame, small, button, rewardIcon, openJournal, coin } from "../kit.js";
import { fmt } from "../economy.js";
import { rewardsAt, titleOf, equipables } from "../progress.js";

// Gems falling in the gem-rain banners: [left, start offset, speed px/s, art, size].
const GEMS = [[60, 0, 70, "gem-done", 18], [110, 60, 55, "gem-working", 18], [170, 20, 80, "ico-crystal", 16],
  [230, 95, 62, "gem-done", 18], [280, 40, 74, "gem-working", 18], [90, 110, 58, "ico-crystal", 16], [250, 75, 66, "ico-crystal", 16]];

export default class Quest {
  init(_p, cx) {
    const p = props() ?? {};
    this.t0 = Date.now();
    // Loops go there and back; a fall goes one way, so the gems move by timer.
    if (p.style === "gems" || p.style === "legend") cx.timer.every(50, (cx) => cx.notify());
    // A level that opens something to put on stays longer, so there is time to click.
    const wear = p.levelUp ? equipables(p.levelUp).length : 0;
    cx.timer.after(wear ? 10000 : p.levelUp ? 6000 : 4500, () => {
      closeOverlay(props()?.overlay);
      // A newer banner may have replaced this one: leave its handle alone.
      if (shared("pq.banner.open") === props()?.overlay) setShared("pq.banner.open", null);
    });
  }

  render() {
    const u = unit();
    const p = props() ?? {};
    const style = p.levelUp ? "basic" : p.style ?? "basic";
    const legend = style === "legend";
    // Sparkles: the same crystal at four spots, out of step so they twinkle.
    const spark = (top, left, period) => pic(u, "ico-crystal", 16).absolute().top(u(top)).left(u(left)).loop("opacity", { from: 0, to: 1, period });
    const close = () => { closeOverlay(p.overlay); if (shared("pq.banner.open") === p.overlay) setShared("pq.banner.open", null); };
    const deco = [];
    if (style === "basic" || style === "flag") deco.push(spark(6, 14, 500), spark(48, 30, 700), spark(8, 300, 620), spark(50, 286, 820));
    if (style === "flag") {
      // Loops move left/top only, so the right-hand pair is placed from the left
      // too (the banner's inside is 324px wide).
      const pen = (at, art, period) => pic(u, art, 16, 32).absolute().top(0).left(u(at)).loop("left", { from: u(at), to: u(at + 1), period });
      deco.push(pen(18, "pennant-red", 900), pen(40, "pennant-blue", 1100), pen(268, "pennant-blue", 1000), pen(290, "pennant-red", 1200));
    }
    if (style === "torch" || legend) {
      deco.push(
        pic(u, "torch-glow", 96, 60).absolute().top(u(8)).left(u(-34)).loop("opacity", { from: 0.35, to: 1, period: 700 }),
        pic(u, "torch-glow", 96, 60).absolute().top(u(8)).right(u(-34)).loop("opacity", { from: 0.35, to: 1, period: 820 }),
        pic(u, "torch", 18, 38).absolute().top(u(22)).left(u(6)),
        pic(u, "torch", 18, 38).absolute().top(u(22)).right(u(6)));
    }
    if (style === "gems" || legend) {
      const t = (Date.now() - (this.t0 ?? Date.now())) / 1000;
      for (const [left, off, speed, art, size] of GEMS) {
        const y = ((off + t * speed) % 130) - 20;
        deco.push(pic(u, art, size).absolute().left(u(left)).top(u(y)));
      }
    }
    if (style === "crown" || legend) {
      deco.push(div().absolute().top(0).left(0).right(0).bottom(0).border(u(2)).border_color(P.g4).loop("opacity", { from: 0.2, to: 1, period: 900 }));
    }
    const ttl = p.levelUp ? "레벨 업!" : legend ? "전설의 퀘스트 완료!" : "퀘스트 완료!";
    let lines;
    if (p.levelUp) {
      const got = rewardsAt(p.levelUp);
      lines = [
        div().text_color(P.text).child(`Lv.${p.levelUp} · ${titleOf(p.levelUp)}`),
        got.length
          ? h_flex().flex_wrap().gap(u(4)).items_center().justify_center().max_w(u(320))
            .child(small(u, "새로 얻음:", P.done))
            .children(got.map((r) => h_flex().gap(u(3)).items_center().child(rewardIcon(u, r)).child(small(u, r.text, P.done))))
          : small(u, "모험은 계속됩니다", P.done),
      ];
      // Frames and banners the level opens: put on at once (the same choice as the
      // adventure log's 꾸미기 tab).
      const wear = equipables(p.levelUp, { frame: shared("pq.frame"), banner: shared("pq.bannerStyle") });
      if (wear.length) lines.push(h_flex().gap(u(6)).items_center().justify_center()
        .children(wear.map((w) => button(u, `wear-${w.kind}`,
          small(u, w.on ? `${w.text} 착용 중` : `${w.text} 바로 착용`, w.on ? P.gt : P.text),
          () => setShared(w.shared, w.key), { on: w.on, pad: [1, 6] }))));
    } else {
      lines = [
        div().max_w(u(300)).truncate().text_color(P.text).child(p.title ?? ""),
        small(u, `보상: 경험치 +1 · 누적 퀘스트 ${p.quests ?? 1}`, P.done),
      ];
    }
    if (p.gold) lines.push(h_flex().gap(u(4)).items_center().justify_center().child(coin(u)).child(small(u, `+${fmt(p.gold)} G`, P.gt2)));
    const body = v_flex().relative().size_full().overflow_hidden().items_center().justify_center().gap(u(4))
      .children(deco)
      .child(h_flex().gap(u(8)).items_center()
        .child(pic(u, "ico-chest-open", 16))
        .child(div().text_color(P.gt).child(ttl))
        .child(pic(u, "ico-chest-open", 16)))
      .children(lines);
    let el = div().id("quest").relative().size_full().cursor_pointer()
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click(() => {
        if (p.levelUp) openJournal();
        else if (p.pane) run("pane.focus", { pane: p.pane });
        close();
      })
      .child(frame(u, "gold", body, { pad: [4, 8], floor: true }).size_full());
    if (style === "crown" || legend) el = el.child(pic(u, "banner-crown", 44, 24).absolute().top(0).left(u(158)));
    return root(u, el);
  }
}
