#!/usr/bin/env bash
# Start Lisa's Island in a Firefox kiosk window. Exit with Alt+F4.
set -eu
HOME_DIR="${LISA_HOME:-$HOME/.local/share/lisa-island}"
if [ -f "$HOME_DIR/app/index.html" ]; then
  APP="$HOME_DIR/app/index.html"
else
  APP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/app/index.html"
fi
PROFILE="$HOME_DIR/ffprofile"
mkdir -p "$PROFILE"
export MOZ_USE_XINPUT2=1
exec firefox --no-remote --profile "$PROFILE" --kiosk "file://$APP"
