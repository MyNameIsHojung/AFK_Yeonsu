#!/usr/bin/env bash
# Codex 이미지 생성으로 단계별 집 배경을 만든다. (캐릭터 없음)
# 사용법: scripts/genBackgrounds.sh [room1.png ...]   (인자 없으면 6장 전체)
# 프롬프트 원문: docs/prompts/2026-11-06/backgroundPrompts.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="public/assets/bg"
mkdir -p "$ROOT/$OUT_DIR"

# 화풍 맞춤용 참고 이미지 (캐릭터 그림체)
STYLE_REF="$ROOT/public/assets/yeonsu/stage1.png"

STYLE='Background illustration for a cute 2D chibi cartoon mobile idle game, matching the art style of the attached character illustration: thick clean dark-brown outlines, soft cel shading, warm cozy pastel palette. A cozy room INSIDE A HOME, front view at eye level, slightly wide angle, the floor visible in the lower third. IMPORTANT: leave a large EMPTY open floor area in the lower-center of the image (no furniture, no objects there) so a character can be placed standing there later. No people, no characters, no animals, no text, no letters, no watermark. Square 1:1 composition.'

declare -a NAMES=(room1.png room2.png room3.png room4.png room5.png room6.png room7.png room8.png room9.png)
declare -a SUBJECTS=(
  'A baby nursery room in daytime: white wooden crib on one side with a hanging star mobile above it, soft pastel-blue walls with cloud wallpaper, a colorful play mat, stuffed toys and wooden blocks along the walls, a window with sunlight and light curtains.'
  'An elementary school kid bedroom in the afternoon: wooden bunk bed on one side, a toy box with robots and balls, a small desk with crayons and drawings taped on the wall, a world map poster, a window with sunny sky.'
  'A high-school exam student study room at night: a desk against the wall with a glowing desk lamp, tall stacks of workbooks, colorful sticky notes covering the wall, a calendar with circled dates (no readable text), a window showing a dark night sky with a moon, warm lamp light.'
  'A small single-person studio apartment of a tired office worker in the evening: a small sofa, a low table with a cup of instant noodles and a laptop, a clothes drying rack with shirts, a small fridge, a window with evening city lights.'
  'A living room converted into a home gym: a dumbbell rack, a barbell on a stand, a yoga mat, a protein shaker on a shelf, motivational posters without text, a big mirror on the wall, bright daylight from a window.'
  'A luxurious penthouse living room at night: a crystal chandelier, a trophy display cabinet with golden trophies, a red velvet sofa, a floor-to-ceiling window showing a sparkling city skyline at night, golden accents.'
  'A cozy private living cabin inside a space station: a large round window showing planet Earth and stars, a small bed strapped to the wall, plush toys and a water pouch floating in the air, soft white and light-blue panels with warm little lights, a flat floor.'
  'A heavenly living room high above the clouds: white and gold marble pillars, a fluffy cloud-shaped sofa, a golden harp, soft clouds drifting around the floor edges, warm glowing pastel pink and gold sky light, a smooth flat floor.'
  'A mysterious dimension room: a galaxy and swirling purple and teal nebula flowing across the walls and ceiling, a chair, books and a lamp floating in the air, a glowing portal ring on the back wall, a smooth glowing translucent floor.'
)

TARGETS=("$@")
[ ${#TARGETS[@]} -eq 0 ] && TARGETS=("${NAMES[@]}")

for target in "${TARGETS[@]}"; do
  idx=-1
  for i in "${!NAMES[@]}"; do [ "${NAMES[$i]}" = "$target" ] && idx=$i; done
  if [ "$idx" -lt 0 ]; then echo "알 수 없는 파일명: $target" >&2; exit 1; fi

  out="$ROOT/$OUT_DIR/$target"
  before=$(stat -f %m "$out" 2>/dev/null || echo 0)
  echo "[$(date +%H:%M:%S)] 생성 시작: $target"
  PROMPT="Use your image generation tool to create ONE image. The attached image is only a reference for the ART STYLE; do NOT draw that character.

Image description: ${STYLE} Scene: ${SUBJECTS[$idx]}

After the image is generated, save it as a PNG file at exactly this path (relative to the current working directory): ${OUT_DIR}/${target}
Do not modify any other files. When finished, reply with only the saved file path."

  codex exec -C "$ROOT" -s workspace-write --skip-git-repo-check -i "$STYLE_REF" -- "$PROMPT" >/dev/null

  after=$(stat -f %m "$out" 2>/dev/null || echo 0)
  if [ "$after" = "$before" ]; then
    echo "실패: $OUT_DIR/$target 가 새로 생성되지 않았습니다" >&2
    exit 1
  fi
  sips -Z 768 "$out" >/dev/null  # 게임용 768px 로 축소
  echo "[$(date +%H:%M:%S)] 완료: $OUT_DIR/$target"
done
