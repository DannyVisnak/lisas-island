#!/usr/bin/env bash
# One-time install, no sudo. Copies the game to ~/.local/share/lisa-island,
# creates a dedicated Firefox profile and a launcher.
set -eu
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/.local/share/lisa-island"
PROFILE="$DEST/ffprofile"

NATIVE_DIR="$SRC/desktop/dist/lisa-island-linux-x64"
NATIVE_TAR="$SRC/lisa-island-linux-x64.tar.gz"
[ -f "$NATIVE_TAR" ] || NATIVE_TAR="$SRC/desktop/dist/lisa-island-linux-x64.tar.gz"
[ -d "$SRC/lisa-island-linux-x64" ] && NATIVE_DIR="$SRC/lisa-island-linux-x64"
HAVE_NATIVE=0
if [ -x "$NATIVE_DIR/lisa-island" ] || [ -f "$NATIVE_TAR" ]; then HAVE_NATIVE=1; fi

if [ "$HAVE_NATIVE" = 0 ]; then
  command -v firefox >/dev/null || { echo "Firefox not found (Fedora: sudo dnf install firefox)"; exit 1; }
  [ -f "$SRC/app/index.html" ] || { echo "app/index.html missing"; exit 1; }
fi

if [ "$HAVE_NATIVE" = 1 ]; then
  # Native Electron app (no browser UI). Progress from the old Firefox profile does not carry over.
  NATIVE="$DEST/app-native"
  mkdir -p "$DEST"
  rm -rf "$NATIVE"
  if [ -x "$NATIVE_DIR/lisa-island" ]; then
    cp -r "$NATIVE_DIR" "$NATIVE"
  else
    mkdir -p "$NATIVE"
    tar -xzf "$NATIVE_TAR" -C "$NATIVE" --strip-components=1
  fi
  [ -x "$NATIVE/lisa-island" ] || { echo "packaged app is broken: $NATIVE/lisa-island missing"; exit 1; }
  ICON="$NATIVE/resources/app/game/icon/lisa.png"
  EXEC="$NATIVE/lisa-island"
else
  mkdir -p "$DEST" "$PROFILE"
  # Update the app but never touch the profile (it holds the progress).
  rm -rf "$DEST/app"
  cp -r "$SRC/app" "$DEST/app"
  cp "$SRC/start-game.sh" "$DEST/start-game.sh"
  chmod +x "$DEST/start-game.sh"

  cat > "$PROFILE/user.js" <<'JS'
user_pref("apz.allow_zooming", false);
user_pref("browser.gesture.swipe.left", "");
user_pref("browser.gesture.swipe.right", "");
user_pref("widget.disable-swipe-tracker", true);
user_pref("browser.startup.homepage_override.mstone", "ignore");
user_pref("startup.homepage_welcome_url", "");
user_pref("startup.homepage_welcome_url.additional", "");
user_pref("browser.aboutwelcome.enabled", false);
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("browser.sessionstore.resume_from_crash", false);
user_pref("browser.sessionstore.max_resumed_crashes", 0);
user_pref("media.autoplay.default", 0);
user_pref("media.autoplay.blocking_policy", 0);
user_pref("app.update.auto", false);
user_pref("app.update.enabled", false);
user_pref("app.update.checkInstallTime", false);
user_pref("browser.tabs.warnOnClose", false);
user_pref("browser.warnOnQuit", false);
user_pref("browser.fullscreen.autohide", false);
user_pref("datareporting.policy.dataSubmissionEnabled", false);
user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);
user_pref("dom.w3c_touch_events.enabled", 1);
JS
  EXEC="$DEST/start-game.sh"
  ICON="$DEST/app/icon/lisa.png"
  [ -f "$ICON" ] || ICON="$DEST/app/img/ui_fox.svg"
fi
DESKTOP="[Desktop Entry]
Type=Application
Name=Lisa's Island
Comment=Language game (offline)
Exec=$EXEC
Icon=$ICON
Terminal=false
StartupWMClass=lisa-island
Categories=Education;Game;"

mkdir -p "$HOME/.local/share/applications"
printf '%s\n' "$DESKTOP" > "$HOME/.local/share/applications/lisa-island.desktop"
chmod +x "$HOME/.local/share/applications/lisa-island.desktop"

DESK="$(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Desktop")"
if [ -d "$DESK" ]; then
  printf '%s\n' "$DESKTOP" > "$DESK/lisa-island.desktop"
  chmod +x "$DESK/lisa-island.desktop"
  command -v gio >/dev/null && gio set "$DESK/lisa-island.desktop" metadata::trusted true 2>/dev/null || true
fi

echo "Installed to $DEST ($([ "$HAVE_NATIVE" = 1 ] && echo native Electron app || echo Firefox kiosk fallback))"
echo "Start: click 'Lisa's Island' on the Desktop / in the app grid, or run $EXEC"
echo "Exit: Alt+F4 or the Quit button in the parent area"
