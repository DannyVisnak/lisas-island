# Lisa's Island (Остров Лисы)

Offline language game for a pre-literate Russian-speaking child. Target languages:
European Portuguese (main), British English, German (optional). No network needed.

## Install (Fedora, no sudo)
```
cd kids-lang-game
./install.sh
```
Needs Firefox (`sudo dnf install firefox` if missing). The game is copied to
`~/.local/share/lisa-island/`; a launcher "Lisa's Island" appears in the app grid and on the Desktop
(if you see "untrusted launcher", right-click it and choose "Allow Launching").

## Play
Click the launcher, or run `~/.local/share/lisa-island/start-game.sh`. It opens a Firefox kiosk window with its
own profile. Sit next to him: ask him to point at the picture and say the word, and reuse the words in daily life.
Parent area (hold the gate): enable German, session length, volume, per-language progress.

## Exit
Alt+F4. (The Quit button in the parent area calls `window.close()`; if Firefox refuses, use Alt+F4.)

## Back up progress
Progress is in the game's Firefox profile: `~/.local/share/lisa-island/ffprofile/`
(localStorage key `lisa-island-v1`). Copy that folder while the game is closed. Re-running `install.sh`
updates the game but leaves the profile untouched. Note: the progress is tied to the install path, so keep it at
`~/.local/share/lisa-island/app/`.

## Add or change words
1. Edit `content/vocab.tsv` (columns: world id emoji_or_color en pt de ru q_en q_pt q_de) and/or `content/ui.tsv`.
2. Run, from the project folder:
```
tools/.venv/bin/python tools/build_data.py
tools/.venv/bin/python tools/fetch_images.py     # needs internet, only for new emoji
tools/.venv/bin/python tools/gen_audio.py        # only new clips are made; --force redoes all
tools/.venv/bin/python tools/check_assets.py     # confirms every file data.js references exists
./install.sh
```
Existing audio is skipped, so to change a spoken text, delete its .ogg or use `--force`.

### Prompt/audio race prevention

Question and target-word prompts must use `Flow.prompt` so the answer gate is active before playback or a scheduled replay begins. At 4 seconds, the watchdog checks whether the same playback chain is still active; if so, it rechecks every 350 ms, without stopping audio. Missing or inactive playback releases immediately. A separate 20-second absolute cap releases input without stopping audio. The per-clip safety timer settles playback. Do not use global `Snd.busy()` for answer gating: it includes personality speech and feedback. Regression coverage should hold real audio pending, attempt an answer, then finish or fail playback and verify the answer is accepted once afterward.

## Licences
- Emoji pictures: Noto Emoji (Google), Apache-2.0. Flags: region-flags (bundled in noto-emoji). See `app/img/LICENSES.md`.
- Speech: generated offline with Piper TTS (MIT). Voice dataset licences per the official model cards
  (https://huggingface.co/rhasspy/piper-voices, checked 15.11.2026):
  - pt_PT: tugão-medium, dataset licence CC0.
  - de: thorsten-medium, dataset licence CC0.
  - en_GB: jenny_dioco-medium, licence "see URL" (https://github.com/dioco-group/jenny-tts-dataset).
  - ru: irina-medium (RHVoice), licence listed as "Unknown".
  Private family use is fine; check the English and Russian terms before publishing or selling the game.
- The fox Lisa and all code are original.

## Native app (Electron, no browser UI)

`desktop/` packages `app/` as an unpacked Electron app (no AppImage, no FUSE needed).
Rebuild after any change in `app/`: `desktop/build.sh` -> `desktop/dist/lisa-island-linux-x64.tar.gz` (copies `app/` fresh).
Ship `install.sh` plus that tar.gz (next to each other, or leave it in `desktop/dist/`); `install.sh` then installs to
`~/.local/share/lisa-island/app-native/` and the launcher runs `app-native/lisa-island`. Firefox kiosk is only the
fallback when no packaged app is present. Exit: Alt+F4 or the parent-area Quit button.
Progress (localStorage) is stored in `~/.config/Lisa's Island/`; it does NOT carry over from the old Firefox profile.
Smoke test: `cd desktop && xvfb-run -a node test-electron.js`.
