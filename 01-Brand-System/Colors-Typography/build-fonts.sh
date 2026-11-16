#!/usr/bin/env bash
# Subsets Inter (OFL-1.1) to Latin and writes self-hosted WOFF files.
# Requires: python3 + fontTools (pyftsubset). Source fonts: Debian fonts-inter package.
# WOFF2 would be ~30% smaller but needs the `brotli` Python module (not installed offline).
set -euo pipefail
cd "$(dirname "$0")/../.."
SRC=/usr/share/fonts/opentype/inter
OUT=02-Public-Website/public/fonts
UNI="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2190-2199,U+2212,U+2215,U+2713,U+2715,U+2605"
FEAT="kern,liga,calt,tnum,case,ccmp,locl,mark,mkmk,cv11"
sub() { pyftsubset "$SRC/$1" --unicodes="$UNI" --layout-features="$FEAT" --flavor=woff --with-zopfli 2>/dev/null --output-file="$OUT/$2" || pyftsubset "$SRC/$1" --unicodes="$UNI" --layout-features="$FEAT" --flavor=woff --output-file="$OUT/$2"; echo "$2 $(wc -c < "$OUT/$2") bytes"; }
sub Inter-Regular.otf inter-400.woff
sub Inter-Medium.otf inter-500.woff
sub Inter-SemiBold.otf inter-600.woff
sub InterDisplay-SemiBold.otf inter-display-600.woff
sub InterDisplay-Bold.otf inter-display-700.woff
