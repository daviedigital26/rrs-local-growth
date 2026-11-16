#!/usr/bin/env bash
# Offline-only helper for Claude Code cloud sessions where `npm install` is blocked.
# Links preinstalled global packages into ./node_modules so the build and tests run.
# In a normal environment, run `npm install` instead and ignore this script.
set -euo pipefail
cd "$(dirname "$0")/.."
G=/home/claude/.npm-global/lib/node_modules
T=/opt/npm-tools/node_modules
mkdir -p node_modules/@types
link() { [ -e "$2" ] && ln -sfn "$2" "node_modules/$1" && echo "linked $1 -> $2" || echo "MISSING $1 ($2)"; }
link react "$G/react"
link react-dom "$G/react-dom"
link typescript "$G/typescript"
link tsx "$T/tsx"
link playwright-core "$T/playwright-core"
link sharp "$G/sharp"
link @types/node "$T/@types/node"
