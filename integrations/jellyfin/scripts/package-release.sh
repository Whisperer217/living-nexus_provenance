#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project="$root/LivingNexus.Jellyfin/LivingNexus.Jellyfin.csproj"
output="$root/repository/artifacts"
version="${1:-0.1.0.0}"
assembly="$root/LivingNexus.Jellyfin/bin/Release/net10.0/LivingNexus.Jellyfin.dll"
package="$output/living-nexus_${version}.zip"

rm -rf "$output"
mkdir -p "$output/package"
dotnet build "$project" --configuration Release --nologo /p:Version="$version"

test -s "$assembly"
cp "$assembly" "$output/package/"
cp "$root/build.yaml" "$output/package/build.yaml"
(
  cd "$output/package"
  zip -X -q "../$(basename "$package")" LivingNexus.Jellyfin.dll build.yaml
)
rm -rf "$output/package"
sha256sum "$package" | tee "$output/$(basename "$package").sha256"
printf 'package=%s\nsha256=%s\n' "$package" "$(cut -d ' ' -f 1 "$output/$(basename "$package").sha256")"
