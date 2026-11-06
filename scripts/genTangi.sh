#!/usr/bin/env bash
# Codex 이미지 생성으로 탱이(펫) 에셋을 만든다. 모두 투명 배경.
# 사용법: scripts/genTangi.sh [파일명...]   (인자 없으면 9단계 × 5프레임 전체)
#   예) scripts/genTangi.sh stage1.png                      (단계 기본 — 탱이 사진 + 연수 그림체 참고)
#   예) scripts/genTangi.sh stage1_blink.png stage1_dig.png (기본 이미지를 첨부해 같은 모습으로 프레임만 변경)
# 프롬프트 원문: docs/prompts/2026-11-06/tangiPrompts.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="public/assets/tangi"
mkdir -p "$ROOT/$OUT_DIR"

PET_PHOTO="$ROOT/base_img/F8C46FA3-26F3-4B0D-8CEC-A2B6D1BFEC8A_1_105_c.jpeg"
STYLE_REF="$ROOT/public/assets/yeonsu/stage1.png"

STYLE="Cute 2D chibi cartoon pet character for a mobile idle game, matching the art style of the attached chibi boy illustration: thick clean dark-brown outlines, soft cel shading, warm pastel palette, big head and small body, full body centered, a fully TRANSPARENT background (use the transparent background option of the image tool; alpha channel, no background color, no floor, no shadow), no text, no watermark, square 1:1 composition. The pet is the small white dog in the attached photo, named Tangi: soft fluffy curly white fur, floppy folded ears, big round shiny black eyes, small black nose, short dark drawn eyebrows, pink blush marks on the cheeks, small curled tail. Keep the same dog design consistently across all images."

# 단계별 외형 (연수 단계와 같은 테마)
declare -a STAGES=(
  'as a tiny newborn puppy, much smaller and rounder than the adult dog in the photo with chubby baby proportions, wearing a small light-blue baby bib, sitting'
  'as a young puppy, a bit smaller than the adult dog in the photo, wearing a tiny yellow cap and a small yellow backpack, sitting'
  'as the grown adult dog exactly like the photo, wearing a white headband (no text), sitting'
  'as the grown adult dog, wearing a tiny navy necktie and a small ID badge on a lanyard (no text), sitting'
  'as the grown adult dog, wearing a red sweatband on the head and holding a tiny dumbbell with one paw, sitting proudly'
  'as the grown adult dog, wearing a small golden crown and a short red royal cape, sitting proudly'
  'as the grown adult dog, wearing a small white and orange dog space suit with a clear round bubble helmet over the head (face clearly visible), sitting'
  'as the grown adult dog, with a small golden halo ring floating above the head and small white angel wings on the back, sitting'
  'as the grown adult dog, wearing a small dark navy cloak covered with tiny stars and a glowing galaxy pendant necklace, sitting'
)

# 프레임 (기본 이미지를 첨부해 같은 모습으로 변경)
declare -a FRAME_KEYS=(blink act happy dig)
declare -a FRAME_DESCS=(
  'the same sitting pose but with both eyes gently closed, as in the middle of a blink'
  'wagging the tail happily (tail swung to the other side) with the tongue sticking out and an open happy mouth'
  'eyes squeezed shut in a big happy smile with blushing cheeks and two small pink hearts floating near the head'
  'standing on all fours with the head down, digging the ground with the front paws, a small pile of brown dirt flying up beside the paws, tail up'
)

TARGETS=("$@")
if [ ${#TARGETS[@]} -eq 0 ]; then
  for n in 1 2 3 4 5 6 7 8 9; do
    TARGETS+=("stage${n}.png")
    for k in "${FRAME_KEYS[@]}"; do TARGETS+=("stage${n}_${k}.png"); done
  done
fi

for target in "${TARGETS[@]}"; do
  if [[ "$target" =~ ^stage([1-9])\.png$ ]]; then
    n="${BASH_REMATCH[1]}"
    REFS=(-i "$PET_PHOTO" -i "$STYLE_REF")
    DESC="${STYLE} The FIRST attached photo is the real dog (for likeness). The SECOND attached image is only an ART STYLE reference; do NOT draw the boy. Draw Tangi ${STAGES[$((n-1))]}."
  elif [[ "$target" =~ ^stage([1-9])_([a-z]+)\.png$ ]]; then
    n="${BASH_REMATCH[1]}"; k="${BASH_REMATCH[2]}"
    frame=""
    for i in "${!FRAME_KEYS[@]}"; do [ "${FRAME_KEYS[$i]}" = "$k" ] && frame="${FRAME_DESCS[$i]}"; done
    if [ -z "$frame" ]; then echo "알 수 없는 프레임: $k" >&2; exit 1; fi
    base="$ROOT/$OUT_DIR/stage${n}.png"
    if [ ! -f "$base" ]; then echo "먼저 탱이 stage${n}.png 를 생성하세요" >&2; exit 1; fi
    REFS=(-i "$base" -i "$PET_PHOTO")
    DESC="The FIRST attached image is the existing game pet illustration (Tangi). Redraw that exact pet as another animation frame: keep the identical art style, outfit and accessories, colors, size, position and framing. Change only the pose/face to: ${frame}. The second attached photo is the real dog, for likeness only. ${STYLE}"
  else
    echo "알 수 없는 파일명: $target" >&2; exit 1
  fi

  out="$ROOT/$OUT_DIR/$target"
  before=$(stat -f %m "$out" 2>/dev/null || echo 0)
  echo "[$(date +%H:%M:%S)] 생성 시작: tangi/$target"
  PROMPT="Use your image generation tool to create ONE image from the attached images.

Image description: ${DESC}

After the image is generated, save it as a PNG file at exactly this path (relative to the current working directory): ${OUT_DIR}/${target}
Do not modify any other files. When finished, reply with only the saved file path."

  codex exec -C "$ROOT" -s workspace-write --skip-git-repo-check "${REFS[@]}" -- "$PROMPT" >/dev/null

  after=$(stat -f %m "$out" 2>/dev/null || echo 0)
  if [ "$after" = "$before" ]; then
    echo "실패: $OUT_DIR/$target 가 새로 생성되지 않았습니다" >&2
    exit 1
  fi
  if ! sips -g hasAlpha "$out" | grep -q "hasAlpha: yes"; then
    echo "실패: $OUT_DIR/$target 에 투명 채널이 없습니다" >&2
    exit 1
  fi
  sips -Z 512 "$out" >/dev/null  # 게임용 512px 로 축소
  echo "[$(date +%H:%M:%S)] 완료: tangi/$target"
done
