#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------
# VibeForge release script
# Usage: npm run release <version>   e.g.  npm run release 0.2.0
#
# What it does:
#   1. Validates git state and version argument
#   2. Bumps version in package.json, tauri.conf.json, and Cargo.toml
#   3. Commits, tags, and pushes
#   4. Builds the Tauri app for the current platform
#   5. Creates or updates a GitHub release and uploads the artifacts
#
# Run on Mac for macOS DMG, on Windows (Git Bash) for MSI/exe,
# on Linux for deb/AppImage. Each platform uploads to the same tag.
# -----------------------------------------------------------------------

VERSION="${1:-}"

# --- Validate version argument ------------------------------------------
if [[ -z "$VERSION" ]]; then
  echo "Usage: npm run release <version>  (e.g. npm run release 0.2.0)"
  exit 1
fi
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must be semver (e.g. 0.2.0), got: $VERSION"
  exit 1
fi

TAG="v$VERSION"

# --- Validate git state -------------------------------------------------
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: git working tree is dirty. Commit or stash changes first."
  exit 1
fi
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" != "main" ]]; then
  echo "Error: releases must be made from main (currently on '$BRANCH')."
  exit 1
fi

echo "Releasing VibeForge $TAG on $(uname -s)..."

# --- Bump version in three files ----------------------------------------
# macOS sed requires '' after -i; GNU sed does not — handle both
SED_INPLACE=(-i '')
if sed --version 2>/dev/null | grep -q GNU; then
  SED_INPLACE=(-i)
fi

sed "${SED_INPLACE[@]}" \
  "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" \
  package.json

sed "${SED_INPLACE[@]}" \
  "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" \
  src-tauri/tauri.conf.json

# Only bump the [package] version line (first occurrence) in Cargo.toml
awk -v ver="$VERSION" '
  /^\[package\]/ { in_pkg=1 }
  /^\[/ && !/^\[package\]/ { in_pkg=0 }
  in_pkg && /^version = / { sub(/"[^"]*"/, "\"" ver "\"") }
  { print }
' src-tauri/Cargo.toml > src-tauri/Cargo.toml.tmp && mv src-tauri/Cargo.toml.tmp src-tauri/Cargo.toml

echo "  Bumped versions to $VERSION"

# --- Commit, tag, push --------------------------------------------------
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
if git diff --cached --quiet; then
  echo "  Versions already at $VERSION — skipping version commit"
else
  git commit -m "chore: release $TAG"
  git push origin main
fi

if git rev-parse "$TAG" &>/dev/null; then
  echo "  Tag $TAG already exists — skipping tag"
else
  git tag "$TAG"
  git push origin "$TAG"
fi
echo "  Tagged and pushed $TAG"

# --- Build --------------------------------------------------------------
echo "  Building (this takes a few minutes)..."
npm run tauri build
echo "  Build complete"

# --- Collect artifacts for this platform --------------------------------
BUNDLE="src-tauri/target/release/bundle"
ARTIFACTS=()

OS="$(uname -s)"
ARCH="$(uname -m)"

if [[ "$OS" == "Darwin" ]]; then
  if [[ "$ARCH" == "arm64" ]]; then
    DMG="$BUNDLE/dmg/VibeForge_${VERSION}_aarch64.dmg"
  else
    DMG="$BUNDLE/dmg/VibeForge_${VERSION}_x64.dmg"
  fi
  [[ -f "$DMG" ]] && ARTIFACTS+=("$DMG")

elif [[ "$OS" == "Linux" ]]; then
  DEB=$(find "$BUNDLE/deb" -name "*.deb" 2>/dev/null | head -1)
  APPIMG=$(find "$BUNDLE/appimage" -name "*.AppImage" 2>/dev/null | head -1)
  [[ -n "$DEB"    ]] && ARTIFACTS+=("$DEB")
  [[ -n "$APPIMG" ]] && ARTIFACTS+=("$APPIMG")

else
  # Windows (Git Bash / MSYS)
  MSI=$(find "$BUNDLE/msi"  -name "*.msi" 2>/dev/null | head -1)
  EXE=$(find "$BUNDLE/nsis" -name "*-setup.exe" 2>/dev/null | head -1)
  [[ -n "$MSI" ]] && ARTIFACTS+=("$MSI")
  [[ -n "$EXE" ]] && ARTIFACTS+=("$EXE")
fi

if [[ ${#ARTIFACTS[@]} -eq 0 ]]; then
  echo "Warning: no artifacts found in $BUNDLE — check the build output above."
  exit 1
fi
echo "  Found artifacts: ${ARTIFACTS[*]}"

# --- Create or update GitHub release ------------------------------------
if gh release view "$TAG" &>/dev/null; then
  echo "  Release $TAG already exists — uploading artifacts..."
  gh release upload "$TAG" "${ARTIFACTS[@]}" --clobber
else
  echo "  Creating release $TAG..."
  gh release create "$TAG" \
    --title "$TAG" \
    --generate-notes \
    "${ARTIFACTS[@]}"
fi

echo ""
echo "Done! View the release at:"
echo "  https://github.com/danilakalinin/vibeforge/releases/tag/$TAG"
