/* Exact Opus 5.5 design contract; EN release proof held. */
window.LETTERS_DATA = {
 "author": "Opus5.5",
 "layout": {
  "frame": {
   "w": 1366,
   "h": 768,
   "unit": "1rem = 10 logical px; positions are [x,y,w,h] in logical px; rem = px/10",
   "minTargetLogical": 140,
   "minTargetRendered1128": 115.6,
   "lisaKeepOut": [
    12,
    599,
    150,
    169
   ]
  },
  "chrome": {
   "back": {
    "box": [
     20,
     16,
     140,
     140
    ],
    "class": "btn lt-btn lt-back",
    "action": "persist encounter, then Path.home(); resume at the saved substep"
   },
   "speaker": {
    "box": [
     180,
     16,
     140,
     140
    ],
    "class": "btn lt-btn lt-speaker",
    "action": "replay the current stage instruction line + target audio; never sends an engine event"
   },
   "flag": {
    "box": [
     340,
     41,
     90,
     90
    ],
    "class": "lt-flag",
    "interactive": false
   },
   "dots": {
    "centerX": 683,
    "y": 66,
    "dot": 24,
    "gap": 16,
    "class": "lt-dots",
    "count": "6, or 5 when physical is off",
    "interactive": false
   },
   "help": {
    "box": [
     1206,
     16,
     140,
     140
    ],
    "class": "btn lt-btn lt-help",
    "action": "stage-specific, see states"
   },
   "next": {
    "box": [
     1206,
     608,
     140,
     140
    ],
    "class": "btn lt-btn b-skip lt-next",
    "stages": [
     "listen",
     "word"
    ]
   }
  },
  "stages": {
   "listen": {
    "soundTrack": {
     "soundDisc": {
      "box": [
       553,
       214,
       260,
       260
      ],
      "class": "lt-el lt-sound lt-hit",
      "action": "replay sound x2"
     }
    },
    "bareTrack": {
     "picture": {
      "box": [
       533,
       194,
       300,
       300
      ],
      "class": "lt-el card lt-pic lt-mid lt-hit",
      "action": "replay full word then bare word"
     }
    }
   },
   "word": {
    "picture": {
     "box": [
      183,
      200,
      300,
      300
     ],
     "class": "lt-el card lt-pic lt-side lt-hit",
     "action": "replay target audio"
    },
    "label": {
     "box": [
      523,
      221,
      640,
      150
     ],
     "class": "lt-el lt-word lt-hit",
     "markup": "<span class=lt-art>o</span><span class=lt-noun><span class=lt-t>p</span>ato</span>",
     "action": "replay target audio + pulse .lt-t"
    }
   },
   "choice": {
    "left": {
     "box": [
      343,
      260,
      300,
      300
     ],
     "class": "lt-el card lt-choice lt-l lt-hit"
    },
    "right": {
     "box": [
      723,
      260,
      300,
      300
     ],
     "class": "lt-el card lt-choice lt-r lt-hit"
    },
    "distractor": {
     "p": "m",
     "a": "l",
     "m": "o",
     "o": "v",
     "l": "a",
     "v": "p"
    },
    "targetSide": {
     "p": "left",
     "m": "left",
     "l": "left",
     "a": "right",
     "o": "right",
     "v": "right"
    }
   },
   "formation": {
    "panel": {
     "box": [
      443,
      170,
      480,
      480
     ],
     "class": "lt-el card lt-form",
     "svg": "viewBox 0 0 400 400 drawn at 440x440"
    },
    "tapInstead": {
     "box": [
      983,
      330,
      160,
      160
     ],
     "class": "lt-el card lt-tapalt lt-hit",
     "content": "lowercase glyph, Andika 400"
    }
   },
   "screenKey": {
    "caseBridge": {
     "box": [
      433,
      180,
      500,
      160
     ],
     "class": "lt-el lt-case",
     "parts": [
      "lt-case-low 160x160 lowercase",
      "lt-case-arrow 100x60",
      "lt-key lt-cap 160x160 uppercase"
     ],
     "interactive": false
    },
    "keys": {
     "y": 450,
     "size": 150,
     "xs": [
      353,
      523,
      693,
      863
     ],
     "classes": [
      "lt-el lt-key lt-crop lt-k0 lt-hit",
      "lt-el lt-key lt-crop lt-k1 lt-hit",
      "lt-el lt-key lt-crop lt-k2 lt-hit",
      "lt-el lt-key lt-crop lt-k3 lt-hit"
     ]
    },
    "crops": {
     "p": [
      "U",
      "I",
      "O",
      "P"
     ],
     "a": [
      "A",
      "S",
      "D",
      "F"
     ],
     "m": [
      "V",
      "B",
      "N",
      "M"
     ],
     "o": [
      "U",
      "I",
      "O",
      "P"
     ],
     "l": [
      "H",
      "J",
      "K",
      "L"
     ],
     "v": [
      "X",
      "C",
      "V",
      "B"
     ]
    },
    "targetIndex": {
     "p": 3,
     "a": 0,
     "m": 3,
     "o": 2,
     "l": 3,
     "v": 2
    },
    "cropNote": "Contiguous real-row keys; identical positions on US QWERTY, PT QWERTY and DE QWERTZ (no Y/Z, no Ç); Russian ЙЦУКЕН shares the physical positions.",
    "tray": {
     "box": [
      1053,
      450,
      140,
      150
     ],
     "class": "lt-el card lt-tray",
     "interactive": false,
     "prints": "lowercase"
    }
   },
   "physicalKey": {
    "bigCap": {
     "box": [
      573,
      190,
      220,
      220
     ],
     "class": "lt-el lt-key lt-big",
     "content": "uppercase",
     "interactive": false
    },
    "arrow": {
     "box": [
      633,
      440,
      100,
      100
     ],
     "class": "lt-el lt-arrow",
     "content": "down arrow svg",
     "interactive": false
    },
    "tray": {
     "box": [
      603,
      560,
      160,
      140
     ],
     "class": "lt-el card lt-tray lt-phys",
     "interactive": false,
     "prints": "lowercase"
    },
    "touchInstead": {
     "box": [
      1003,
      250,
      160,
      160
     ],
     "class": "lt-el lt-key lt-touchalt lt-hit",
     "content": "uppercase",
     "action": "engine {type:'touch'}"
    }
   }
  },
  "states": [
   {
    "state": "boot",
    "enter": "Read S.letter. If an encounter is saved, LetterRules.restoreEncounter; otherwise LetterRules.createEncounter(plan,{physicalEnabled:Core.save.settings.physicalKeys!==false}). Run the runtime audio check. Track none: run recovery.",
    "exit": "go to encounter.step"
   },
   {
    "state": "listen",
    "lisa": "pose idle",
    "audio": {
     "sound": [
      "intro (first entry only)",
      "pause 400",
      "listen",
      "pause 300",
      "sound",
      "pause 600",
      "sound"
     ],
     "bare": [
      "intro (first entry only)",
      "pause 400",
      "full word",
      "pause 500",
      "bare word (skip if identical to full, mapping a)"
     ]
    },
    "input": {
     "soundDisc|picture": "replay the stage chain without the intro; resets auto-advance",
     "next": "advance {type:'continue'}",
     "help": "same as tapping soundDisc|picture; no engine event"
    },
    "next": "hidden (lt-off) until the chain completes once, then popin + nudge; auto-advance after 3000 ms",
    "onExit": "advance continue, then recordIntroduction + persist in the same tick"
   },
   {
    "state": "word",
    "lisa": "pose point",
    "audio": [
     "word",
     "pause 200",
     "target audio (sound track: sound; bare track: bare word)",
     "pulse .lt-t when the target audio starts"
    ],
    "input": {
     "picture|label": "replay target audio + pulse",
     "next": "advance continue",
     "help": "replay the stage audio; no engine event"
    },
    "next": "appears when the audio ends; auto-advance after 3000 ms"
   },
   {
    "state": "choice",
    "lisa": "pose tilt",
    "audio": [
     "tap",
     "pause 200",
     "target audio"
    ],
    "input": {
     "targetCard": "lock, add lt-ok, sfx good, Lisa cheer, hold 700 ms, advance {type:'choice',letter}",
     "otherCard (1st)": "add lt-soft to that card, play relisten + target audio; both cards stay tappable",
     "otherCard (2nd)": "lock; add lt-glow to the target; play show; advance {type:'choice',letter:<distractor>} (engine moves on with helped=true)",
     "help": "advance {type:'help'}; lt-glow on the target; play show; the child still taps"
    },
    "idle": {
     "8000": "replay tap + target audio",
     "16000": "help behaviour",
     "26000": "advance help, then {type:'choice',letter:target}"
    },
    "noPenalty": "no red, no wobble, no buzzer, no visible timer"
   },
   {
    "state": "formation",
    "lisa": "pose point",
    "audio": [
     "trace (demo animates during the line)",
     "tap_instead immediately after (tile nudges)"
    ],
    "demo": "lt-demo strokes animate stroke-dashoffset in order; per stroke max(600, length*2.4) ms / Core.speed; lt-start dot at the current stroke start",
    "input": {
     "svg pointer": "draw lt-ink polyline; mark sample points within tolerance; lifts allowed; when visited/24 >= 0.6: show lt-done-glyph, sfx good, hold 700 ms, advance {type:'trace'}",
     "tapInstead": "tile pulses, sfx good, hold 500 ms, advance {type:'touch'}",
     "help": "clear ink, replay demo + trace line; no engine event"
    },
    "idle": {
     "8000": "replay demo",
     "16000": "play tap_instead + nudge tile",
     "26000": "advance {type:'touch'}"
    }
   },
   {
    "state": "screenKey",
    "lisa": "pose point",
    "audio": [
     "case (case bridge visible)",
     "pause 300",
     "screen_key",
     "pause 200",
     "target audio"
    ],
    "input": {
     "targetKey": "add lt-down 120 ms, print lowercase into the tray, sfx good, play found, advance {type:'screenKey',letter:UPPER}",
     "neighbourKey (1st)": "press animation only, nothing prints; the target gets a nudge",
     "neighbourKey (2nd)": "advance {type:'help'}; lt-glow on the target; play show; wait for the tap",
     "help": "same as 2nd neighbour"
    },
    "idle": {
     "8000": "replay screen_key + target audio",
     "16000": "help behaviour",
     "26000": "auto-press the target (counts as helped)"
    }
   },
   {
    "state": "physicalKey",
    "skipWhen": "encounter.physicalEnabled false (the engine skips it)",
    "lisa": "pose point",
    "audio": [
     "real_key"
    ],
    "listeners": "document keydown/keyup -> LetterRules.keyboard(encounter, event); preventDefault only for the matching code; remove on exit and on flow kill",
    "input": {
     "matching keyup": "print lowercase into the tray, sfx good, play found, advance via the engine result",
     "touchInstead": "advance {type:'touch'}; print into the tray; play found",
     "help": "advance {type:'help'}; bigCap lt-glow; arrow bob; replay real_key"
    },
    "idle": {
     "8000": "play touch_instead + nudge touchInstead",
     "16000": "help behaviour",
     "26000": "advance {type:'touch'}"
    },
    "restoreNote": "restoreEncounter clears the held press; a fresh keydown and keyup are needed"
   },
   {
    "state": "finish",
    "audio": [
     "finish"
    ],
    "lisa": "pose cheer",
    "then": "recordCompletion + track rewrite + persist together, then Path.finishStep(flow) (+1 star via path-starpop when STAR_STEP.LETTER=1, then R)"
   },
   {
    "state": "recovery",
    "when": "No playable track at boot or mid-encounter (the bare word fails to load)",
    "then": "play Core.lisaLine('next'), S.letter=null, S.step++, Path.go(); no star; no introduction if listen never completed"
   }
  ],
  "persistence": "After every engine transition: S.letter.encounter = encounter; Core.persist(). Back button: persist, then Path.home().",
  "tokens": {
   "sizes": {
    "btn": "14rem",
    "soundDisc": "26rem",
    "picture": "30rem",
    "choice": "30rem",
    "choiceGlyph": "20rem",
    "formCard": "48rem",
    "tapAlt": "16rem",
    "key": "15rem",
    "keyGlyph": "8rem",
    "cap": "16rem",
    "bigCap": "22rem",
    "wordFont": "9.6rem"
   },
   "colors": {
    "text": "#263238",
    "article": "#8a8296",
    "targetMark": "#ffb300",
    "ink": "#7e57c2",
    "speaker": "#26a69a",
    "start": "#43a047",
    "keyBorder": "#cfc8d8",
    "keyShadow": "#b8b0c4",
    "guide": "#ece8f2",
    "rule": "#e8e3ef",
    "baseRule": "#cfc8d8"
   },
   "timingsMs": {
    "pauseAfterIntro": 400,
    "soundRepeatGap": 600,
    "autoAdvance": 3000,
    "okHold": 700,
    "tapHold": 500,
    "keyPress": 120,
    "idle1": 8000,
    "idle2": 16000,
    "idle3": 26000,
    "demoStrokeMin": 600,
    "demoMsPerUnit": 2.4,
    "note": "all divided by Core.speed; all waits go through flow.wait/flow.after so UI.go kills them"
   },
   "trace": {
    "samples": 24,
    "toleranceUnits": 60,
    "accept": 0.6,
    "pointerToViewBox": "svg.getScreenCTM().inverse()"
   }
  },
  "a11yLabels": {
   "back": {
    "ru": "Назад",
    "en": "Back"
   },
   "speaker": {
    "ru": "Послушать ещё раз",
    "en": "Listen again"
   },
   "help": {
    "ru": "Подсказка",
    "en": "Hint"
   },
   "next": {
    "ru": "Дальше",
    "en": "Next"
   },
   "sound": {
    "ru": "Звук",
    "en": "Sound"
   },
   "picture": {
    "ru": "Картинка: послушать слово",
    "en": "Picture: hear the word"
   },
   "choice": {
    "ru": "Буква {x}",
    "en": "Letter {x}"
   },
   "tapInstead": {
    "ru": "Нажать на букву",
    "en": "Tap the letter"
   },
   "key": {
    "ru": "Клавиша {X}",
    "en": "Key {X}"
   },
   "touchInstead": {
    "ru": "Нажать на экране",
    "en": "Tap on the screen"
   }
  }
 },
 "cssAsset": {
  "targetPath": "app/css/letters.css",
  "content": "/* LISA-18 letters screen. Scoped to .s-letters. 1rem = 10 logical px of the 1366x768 frame. Every interactive target >= 14rem (115.6 px at 1128x752). Reuses .btn .card .b-skip hintglow bob from style.css; only transform/opacity animate here. */\n.s-letters{position:absolute;left:0;top:0;width:136.6rem;height:76.8rem;overflow:hidden;font-family:'Andika',sans-serif;color:#3b2f4a;user-select:none;-webkit-user-select:none}\n.s-letters .lt-el{position:absolute;box-sizing:border-box}\n.s-letters .lt-hit{touch-action:none;cursor:pointer}\n.s-letters .lt-inert{pointer-events:none}\n.s-letters .btn.lt-btn{position:absolute;width:14rem;height:14rem;margin:0}\n.s-letters .lt-back{left:2rem;top:1.6rem}\n.s-letters .lt-speaker{left:18rem;top:1.6rem}\n.s-letters .lt-help{left:120.6rem;top:1.6rem}\n.s-letters .lt-next{left:120.6rem;top:60.8rem}\n.s-letters .lt-next.lt-off{opacity:0;pointer-events:none}\n.s-letters .lt-flag{position:absolute;left:34rem;top:4.1rem;width:9rem;height:9rem;border-radius:50%;overflow:hidden;background:#fff;box-shadow:0 .4rem 0 rgba(0,0,0,.16);pointer-events:none}\n.s-letters .lt-flag img,.s-letters .lt-flag svg{display:block;width:100%;height:100%;object-fit:cover}\n.s-letters .lt-dots{position:absolute;left:68.3rem;top:6.6rem;height:2.4rem;display:flex;gap:1.6rem;transform:translateX(-50%);pointer-events:none}\n.s-letters .lt-dots i{display:block;width:2.4rem;height:2.4rem;border-radius:50%;background:rgba(59,47,74,.18)}\n.s-letters .lt-dots i.lt-past{background:rgba(126,87,194,.45)}\n.s-letters .lt-dots i.lt-now{background:#7e57c2;transform:scale(1.25)}\n.s-letters .lt-sound{left:55.3rem;top:21.4rem;width:26rem;height:26rem;border-radius:50%;background:#26a69a;box-shadow:0 1rem 0 rgba(0,0,0,.16),0 1.6rem 2.6rem rgba(0,0,0,.16);display:flex;align-items:center;justify-content:center}\n.s-letters .lt-sound svg{width:12rem;height:12rem;fill:#fff}\n.s-letters .card.lt-pic{width:30rem;height:30rem;padding:2rem;display:flex;align-items:center;justify-content:center}\n.s-letters .card.lt-pic img,.s-letters .card.lt-pic svg{max-width:100%;max-height:100%}\n.s-letters .lt-pic.lt-mid{left:53.3rem;top:19.4rem}\n.s-letters .lt-pic.lt-side{left:18.3rem;top:20rem}\n.s-letters .lt-word{left:52.3rem;top:22.1rem;width:64rem;height:15rem;display:flex;align-items:center;gap:3.2rem;font-size:9.6rem;font-weight:700;line-height:1;color:#263238;white-space:nowrap}\n.s-letters .lt-art{font-weight:400;color:#8a8296}\n.s-letters .lt-t{position:relative;display:inline-block}\n.s-letters .lt-t::after{content:'';position:absolute;left:-.4rem;right:-.4rem;bottom:-1.6rem;height:1.2rem;border-radius:.6rem;background:#ffb300}\n.s-letters .lt-t.lt-pulse{animation:lt-pulse .6s ease-in-out 2}\n.s-letters .card.lt-choice{top:26rem;width:30rem;height:30rem;display:flex;align-items:center;justify-content:center;font-size:20rem;font-weight:400;line-height:1;color:#263238;transition:opacity .25s}\n.s-letters .lt-choice.lt-l{left:34.3rem}\n.s-letters .lt-choice.lt-r{left:72.3rem}\n.s-letters .lt-choice.lt-soft{opacity:.55}\n.s-letters .lt-choice.lt-ok{animation:lt-pulse .5s ease-in-out 1}\n.s-letters .card.lt-form{left:44.3rem;top:17rem;width:48rem;height:48rem;padding:2rem}\n.s-letters .lt-form svg{display:block;width:44rem;height:44rem;touch-action:none}\n.s-letters .lt-rule{fill:none;stroke:#e8e3ef;stroke-width:3}\n.s-letters .lt-rule.lt-base{stroke:#cfc8d8;stroke-width:4}\n.s-letters .lt-guide{fill:none;stroke:#ece8f2;stroke-width:40;stroke-linecap:round;stroke-linejoin:round}\n.s-letters .lt-demo{fill:none;stroke:#7e57c2;stroke-width:28;stroke-linecap:round;stroke-linejoin:round}\n.s-letters .lt-ink{fill:none;stroke:#7e57c2;stroke-width:24;stroke-linecap:round;stroke-linejoin:round;opacity:.8}\n.s-letters .lt-done-glyph{fill:none;stroke:#263238;stroke-width:28;stroke-linecap:round;stroke-linejoin:round}\n.s-letters .lt-start{fill:#43a047}\n.s-letters .card.lt-tapalt{left:98.3rem;top:33rem;width:16rem;height:16rem;display:flex;align-items:center;justify-content:center;font-size:11rem;line-height:1;color:#263238}\n.s-letters .lt-case{left:43.3rem;top:18rem;width:50rem;height:16rem;display:flex;align-items:center;justify-content:space-between;pointer-events:none}\n.s-letters .lt-case-low{width:16rem;height:16rem;display:flex;align-items:center;justify-content:center;font-size:12rem;line-height:1;color:#263238}\n.s-letters .lt-case-arrow{width:10rem;height:6rem;fill:#7e57c2}\n.s-letters .lt-key{display:flex;align-items:center;justify-content:center;background:#fff;border:.6rem solid #cfc8d8;border-radius:2.4rem;box-shadow:0 .8rem 0 #b8b0c4;font-weight:700;line-height:1;color:#263238;transition:transform .08s}\n.s-letters .lt-key.lt-cap{position:relative;width:16rem;height:16rem;font-size:8.4rem}\n.s-letters .lt-key.lt-crop{top:45rem;width:15rem;height:15rem;font-size:8rem}\n.s-letters .lt-k0{left:35.3rem}\n.s-letters .lt-k1{left:52.3rem}\n.s-letters .lt-k2{left:69.3rem}\n.s-letters .lt-k3{left:86.3rem}\n.s-letters .lt-key.lt-down{transform:translateY(.6rem)}\n.s-letters .card.lt-tray{left:105.3rem;top:45rem;width:14rem;height:15rem;display:flex;align-items:center;justify-content:center;font-size:10rem;line-height:1;color:#263238;pointer-events:none}\n.s-letters .lt-tray b{font-weight:400;animation:lt-print .35s ease-out 1}\n.s-letters .card.lt-tray.lt-phys{left:60.3rem;top:56rem;width:16rem;height:14rem}\n.s-letters .lt-key.lt-big{left:57.3rem;top:19rem;width:22rem;height:22rem;font-size:13rem;border-radius:3.2rem;pointer-events:none}\n.s-letters .lt-arrow{left:63.3rem;top:44rem;width:10rem;height:10rem;fill:#7e57c2;pointer-events:none;animation:bob 1.4s ease-in-out infinite}\n.s-letters .lt-key.lt-touchalt{left:100.3rem;top:25rem;width:16rem;height:16rem;font-size:8.4rem}\n.s-letters .lt-glow{animation:hintglow 1.2s ease-in-out infinite}\n@keyframes lt-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}\n@keyframes lt-print{0%{transform:scale(.4);opacity:0}100%{transform:scale(1);opacity:1}}\n@media (prefers-reduced-motion:reduce){.s-letters *,.s-letters *::after{animation:none!important;transition:none!important}}\n"
 },
 "formationPaths": {
  "viewBox": "0 0 400 400",
  "fontRef": {
   "family": "Andika",
   "weight": 400,
   "fontSize": 300,
   "textAnchor": "middle",
   "x": 200,
   "baseline": 300,
   "note": "Strokes are centrelines of the bundled Andika-Regular glyph at font-size 300 in this viewBox. The font is not rendered in the formation SVG."
  },
  "rules": {
   "ascender": 65,
   "xHeight": 150,
   "baseline": 300,
   "descender": 372,
   "x1": 20,
   "x2": 380,
   "classes": "lt-rule for ascender/xHeight/descender, lt-rule lt-base for baseline"
  },
  "strokeWidth": 28,
  "glyphs": {
   "p": {
    "strokes": [
     "M150 160 L150 358",
     "M150 196 C164 172 186 159 210 159 C242 159 260 190 260 225 C260 262 240 291 210 291 C186 291 166 282 150 266"
    ],
    "start": [
     [
      150,
      160
     ],
     [
      150,
      196
     ]
    ],
    "order": "stem down, then bowl clockwise"
   },
   "a": {
    "strokes": [
     "M236 166 C224 161 212 159 200 159 C168 159 145 196 145 234 C145 268 164 291 188 291 C202 291 209 277 212 262 L236 196",
     "M248 160 L253 286"
    ],
    "start": [
     [
      236,
      166
     ],
     [
      248,
      160
     ]
    ],
    "order": "bowl counterclockwise from top right, then stem down",
    "shape": "single-storey Andika a: flat bowl top meeting the stem, diagonal return into the stem"
   },
   "m": {
    "strokes": [
     "M114 160 L114 286",
     "M114 196 C124 172 142 160 162 160 C188 160 202 178 202 208 L202 286",
     "M202 196 C212 172 228 160 247 160 C272 160 287 178 287 208 L287 286"
    ],
    "start": [
     [
      114,
      160
     ],
     [
      114,
      196
     ],
     [
      202,
      196
     ]
    ],
    "order": "stem down, first arch, second arch"
   },
   "o": {
    "strokes": [
     "M200 158 C168 158 143 188 143 225 C143 262 168 292 200 292 C232 292 257 262 257 225 C257 188 232 158 200 158"
    ],
    "start": [
     [
      200,
      158
     ]
    ],
    "order": "from the top, counterclockwise, back to the top"
   },
   "l": {
    "strokes": [
     "M200 80 L200 286"
    ],
    "start": [
     [
      200,
      80
     ]
    ],
    "order": "one stroke straight down",
    "variant": "straight; the bundled Andika l has no tail (overlay 17.11.26)"
   },
   "v": {
    "strokes": [
     "M146 160 L200 290 L254 160"
    ],
    "start": [
     [
      146,
      160
     ]
    ],
    "order": "one stroke: down to the point, then up"
   }
  },
  "verify": "Render Andika 400 at font-size 300, text-anchor middle, x200, baseline y300 in the same 400x400 SVG, and overlay the strokes. Each glyph's centreline fractionInside must be >= 0.90. Return the PNG and JSON to Opus for visual acceptance; no path tuning outside Opus."
 },
 "copyRows": [
  {
   "key": "lisa_letters_intro",
   "ru": "Хочешь, открою секрет? В словах живут буквы! Давай найдём одну.",
   "en": "Want to know a secret? Letters live inside words! Let's find one.",
   "active": true,
   "used": "listen, first entry"
  },
  {
   "key": "lisa_letters_listen",
   "ru": "Послушай этот звук. Можешь повторить, если хочешь.",
   "en": "Listen to this sound. You can say it too, if you like.",
   "active": true,
   "used": "listen, sound track ONLY; never on the bare track"
  },
  {
   "key": "lisa_letters_word",
   "ru": "Вот наше слово. А эта буква стоит в самом начале!",
   "en": "Here is our word. And this letter is right at the start!",
   "active": true,
   "used": "word, both tracks"
  },
  {
   "key": "lisa_letters_inside",
   "ru": "Слушай, этот звук прячется внутри слова!",
   "en": "Listen, this sound is hiding inside the word!",
   "active": false,
   "used": "inactive (internal-letter bridge out of scope)"
  },
  {
   "key": "lisa_letters_tap",
   "ru": "Где наша буква? Покажи пальчиком.",
   "en": "Where is our letter? Show me with your finger.",
   "active": true,
   "used": "choice"
  },
  {
   "key": "lisa_letters_trace",
   "ru": "Смотри, как я рисую. Теперь ты, пальчиком!",
   "en": "Watch how I draw it. Now you, with your finger!",
   "active": true,
   "used": "formation, during the demo"
  },
  {
   "key": "lisa_letters_tap_instead",
   "ru": "Можно и просто нажать на букву. Как тебе удобнее.",
   "en": "You can just tap the letter too. Whatever you like.",
   "active": true,
   "used": "formation, right after trace"
  },
  {
   "key": "lisa_letters_case",
   "ru": "Это та же буква, только большая. На кнопке она вот такая.",
   "en": "This is the same letter, only big. On the key it looks like this.",
   "active": true,
   "used": "screenKey case bridge"
  },
  {
   "key": "lisa_letters_screen_key",
   "ru": "Найди эту букву на кнопках на экране.",
   "en": "Find this letter on the keys on the screen.",
   "active": true,
   "used": "screenKey"
  },
  {
   "key": "lisa_letters_real_key",
   "ru": "А теперь нажми эту букву на настоящей клавиатуре. Один разок!",
   "en": "Now press this letter on the real keyboard. Just once!",
   "active": true,
   "used": "physicalKey"
  },
  {
   "key": "lisa_letters_touch_instead",
   "ru": "Давай играть на экране. Так тоже здорово!",
   "en": "Let's play on the screen. That's great too!",
   "active": true,
   "used": "physicalKey idle 1"
  },
  {
   "key": "lisa_letters_relisten",
   "ru": "Давай послушаем ещё разок и посмотрим внимательно.",
   "en": "Let's listen once more and look closely.",
   "active": true,
   "used": "choice, first uncertain tap"
  },
  {
   "key": "lisa_letters_show",
   "ru": "Вот она, смотри! Нажмём вместе.",
   "en": "Here it is, look! Let's press it together.",
   "active": true,
   "used": "choice/screenKey/physicalKey help"
  },
  {
   "key": "lisa_letters_found",
   "ru": "Ты нажал, и появилась буква!",
   "en": "You pressed it, and the letter appeared!",
   "active": true,
   "used": "screenKey and physicalKey success"
  },
  {
   "key": "lisa_letters_name",
   "ru": "А ещё у буквы есть имя. Послушай, как её зовут.",
   "en": "A letter has a name too. Listen to what it's called.",
   "active": false,
   "used": "inactive (letter names out of scope)"
  },
  {
   "key": "lisa_letters_language",
   "ru": "Посмотри на флажок: сейчас мы играем на этом языке.",
   "en": "Look at the flag: this is the language we're playing in now.",
   "active": false,
   "used": "inactive (single PT track)"
  },
  {
   "key": "lisa_letters_script_contrast",
   "ru": "Да, в русском есть похожая буква! А здесь она звучит вот так.",
   "en": "Yes, Russian has a letter that looks like this! Here it sounds like this.",
   "active": false,
   "used": "inactive; the EN text is a faithful translation; an English-speaking child would need a different contrast, decided only if this is ever activated"
  },
  {
   "key": "lisa_letters_variant",
   "ru": "Ой, а в этом слове буква звучит по-другому. Так бывает!",
   "en": "Oh, in this word the letter sounds different. That happens!",
   "active": false,
   "used": "inactive"
  },
  {
   "key": "lisa_letters_group",
   "ru": "Эти буквы держатся за ручки и звучат вместе.",
   "en": "These letters hold hands and sound together.",
   "active": false,
   "used": "inactive"
  },
  {
   "key": "lisa_letters_blend",
   "ru": "Слушай, звуки соединяются, и получается слово!",
   "en": "Listen, the sounds join up and make a word!",
   "active": false,
   "used": "inactive"
  },
  {
   "key": "lisa_letters_review",
   "ru": "О, а эту букву мы уже встречали!",
   "en": "Oh, we've met this letter before!",
   "active": false,
   "used": "inactive (reviews not implemented; reviews use neutral lines)"
  },
  {
   "key": "lisa_letters_finish",
   "ru": "Ты сегодня нашёл новую букву! Фыр-фыр, бежим дальше.",
   "en": "You found a new letter today! Frr-frr, let's run on.",
   "active": true,
   "used": "finish of a new letter"
  },
  {
   "key": "lisa_letters_layout_help",
   "ru": "Ой, клавиатура шалит. Давай играть на экране, а взрослые её починят.",
   "en": "Oops, the keyboard is being cheeky. Let's play on the screen, and the grown-ups will fix it.",
   "active": false,
   "used": "inactive: KeyboardEvent.code works on any layout, so it has no trigger"
  }
 ],
 "copyNote": "The 23 RU rows are verbatim from tickets/LISA-05/COPY.tsv with no text change. The only fallback semantic correction is behavioural: lisa_letters_listen never plays on the bare track. The EN rows are drafts written by Opus 5.5 and are not published; no EN audio was produced.",
 "parentCopy": {
  "lettersToggle": {
   "label": {
    "ru": "Буквы",
    "en": "Letters"
   },
   "small": {
    "ru": "Иногда вместо второго блока слов: одна новая буква из знакомого слова. Только португальский, после 20 хорошо знакомых слов.",
    "en": "Sometimes replaces the second word block: one new letter from a familiar word. Portuguese only, after 20 well-known words."
   }
  },
  "physicalToggle": {
   "label": {
    "ru": "Настоящая клавиатура",
    "en": "Physical keyboard"
   },
   "small": {
    "ru": "В конце ребёнок нажимает букву на клавиатуре ноутбука. Выключено: только кнопки на экране.",
    "en": "At the end, your child presses the letter on the laptop keyboard. Off: on-screen keys only."
   }
  },
  "progress": {
   "heading": {
    "ru": "Буквы: что было в игре",
    "en": "Letters: what happened in the game"
   },
   "empty": {
    "ru": "Пока ни одной буквы.",
    "en": "No letters yet."
   },
   "row": {
    "ru": "{letter} · {word} · {date}",
    "en": "{letter} · {word} · {date}"
   },
   "chips": {
    "bySound": {
     "ru": "по звуку",
     "en": "by sound"
    },
    "byWord": {
     "ru": "по слову",
     "en": "by word"
    },
    "choseAlone": {
     "ru": "выбор без подсказки",
     "en": "chose without a hint"
    },
    "withHint": {
     "ru": "с подсказкой",
     "en": "with a hint"
    },
    "traced": {
     "ru": "обвёл пальцем",
     "en": "traced it"
    },
    "tapped": {
     "ru": "нажал на букву",
     "en": "tapped the letter"
    },
    "screenKey": {
     "ru": "нашёл на экране",
     "en": "found it on screen"
    },
    "physicalKey": {
     "ru": "нажал на клавиатуре",
     "en": "pressed it on the keyboard"
    }
   },
   "footnote": {
    "ru": "Это заметки о том, что было в игре, а не оценка чтения.",
    "en": "These are notes on what happened in the game, not a reading score."
   }
  },
  "earCheck": {
   "pending": {
    "ru": "Ждёт проверки на слух",
    "en": "Waiting for an ear check"
   },
   "approved": {
    "ru": "Одобрено вами",
    "en": "Approved by you"
   },
   "rejected": {
    "ru": "Отклонено",
    "en": "Rejected"
   },
   "missing": {
    "ru": "Записи пока нет",
    "en": "No recording yet"
   },
   "note": {
    "ru": "Ваше одобрение значит, что звук понятен ребёнку. Это не проверка носителем языка.",
    "en": "Your approval means the sound is clear for your child. It is not a native-speaker check."
   },
   "bareMode": {
    "ru": "Без отдельного звука: буква показывается через слово целиком.",
    "en": "No separate sound: the letter is shown through the whole word."
   }
  },
  "chipRules": "Show exactly one of bySound/byWord (from track). Show choseAlone only when the selection-unhelped flag for that track is true, otherwise withHint. Show traced or tapped from formation. Always show screenKey. Show physicalKey only when physicalKeyLocated is true. Chip verbs are masculine to match the approved child copy; see Q1."
 },
 "audioGateDecision": {
  "statuses": [
   "approved",
   "needs-ear-check",
   "rejected",
   "missing"
  ],
  "statusRecord": "{status, reviewer, reviewerKind:'parent'|'native-pt-pt', date} per asset; all 12 letter assets start at needs-ear-check (controller note 16.11); approval goes through the existing LISA-16 parent ear-check flow",
  "perMapping": {
   "sound": "sound_<v> approved AND word_<anchor>_bare approved AND the full-word clip available",
   "bare": "word_<anchor>_bare approved AND the full-word clip available, and sound_<v> NOT approved (pending, rejected or missing)",
   "none": "anything else"
  },
  "engineAttestation": "The wrapper builds assets[lower] only for track sound|bare: {approved:true, available:<files present>, reviewer:<bare-word reviewer>}. Track none gives no entry, so selectSession skips the mapping. A missing sound is never marked approved.",
  "cache": "S.letter.track is stored next to the cached plan when the plan is made",
  "runtime": "At boot and before each audio chain: recompute the track. Sound can downgrade to bare; bare never upgrades to sound mid-encounter. If the track is none or the bare clip fails to load, run recovery (lisaLine 'next', skip, no star).",
  "bareTrackBehaviour": [
   "no lisa_letters_listen; the listen stage plays the full word then the bare word with the picture",
   "target audio is the bare word in word, choice and screenKey",
   "observation: track:'bare', bareWordSelectionUnhelped:<engine soundSelectionUnhelped>, soundSelectionUnhelped:null",
   "parent chip: byWord plus the bareMode note"
  ],
  "honesty": "Parent approval means the clip is usable for this child. It is never shown or stored as native PT-PT validation. No pronunciation or phoneme-quality claim appears anywhere in the UI."
 },
 "acceptance": [
  "At 1128x752 and 1920x1080, every .lt-hit and .lt-btn bounding box is at least 110 px in both axes (expected 115.6 px at 1128), and document.elementFromPoint at its centre returns the element or a child.",
  "No interactive box overlaps another or the Lisa keep-out [12,599,150,169]; no content is clipped by the frame.",
  "No gender colour on the letters screen: computed colours of .lt-art and the noun are #8a8296 and #263238; the target mark is #ffb300.",
  "Sound track: the chain order matches states.listen. Bare track: lisa_letters_listen is never requested (spy on Snd.say), and a full play-through stores track:'bare' with soundSelectionUnhelped:null.",
  "Choice: the first uncertain tap gives lt-soft + relisten and the encounter stays on choice; the second gives show + glow and the engine advances with helped=true; no red, wobble or buzzer.",
  "Formation: a trace with two lifts that covers at least 60 % of samples completes as trace; the tap tile completes as touch; both are reachable from the start.",
  "The formation overlay check against Andika 400 is done and the l variant is chosen.",
  "screenKey: the crop matches the table for all 6 letters; neighbour taps print nothing; a target tap prints lowercase and plays found.",
  "physicalKey on a Russian layout: KeyP..KeyV keydown+keyup completes; held keyrepeat, Ctrl/Alt/Meta combos and a lone keyup do nothing; touchInstead completes equally; the listeners are removed after UI.go.",
  "With the physical setting off: 5 dots, no physicalKey stage.",
  "Back from any stage, then restart: resumes at the saved substep, and physicalKey needs a fresh press.",
  "Missing-audio recovery: no star, the path continues to R, and no introduction is recorded if listen never completed.",
  "Finish: exactly +1 star once (S.paid guard), even after a reload at finish.",
  "prefers-reduced-motion: no animations on .s-letters.",
  "Offline file:// in Firefox on the Surface: no network requests."
 ],
 "remainingHolds": [
  "PT-PT ear review of the 12 new letter assets: sound_p, sound_a_reduced, sound_m, sound_o_close, sound_l_initial, sound_v, word_duck_bare, word_yellow_bare, word_apple_bare, word_egg_bare, word_milk_bare, word_cow_bare. Highest risk: sound_a_reduced [ɐ], sound_o_close, sound_l_initial. No recordings exist yet.",
  "PT-PT review status of the 6 existing full-word clips (o pato, amarelo, a maçã, o ovo, o leite, a vaca) is unverified for the letters context.",
  "A native PT-PT check stays open even after parent approval; the UI never claims it.",
  "Andika a/l overlay verification (see formationPaths.verify).",
  "EN copy rows are an Opus draft: unpublished, with no audio; Danny proofs them before any EN release.",
  "Masculine forms in the approved RU rows (Q1).",
  "Integration (Codex/Sol): STEP.LETTER, STAR_STEP.LETTER, selectSession wiring into plan building, a letters subrecord in the save, index.html includes, content/ui.tsv rows, parent rows under Parent area, Daily path.",
  "The opposite-provider review of the engine is still pending; this is not merge or release approval.",
  "Reviews (+3/+7), names, internal letters, blends and EN/DE tracks stay out of scope."
 ]
};
