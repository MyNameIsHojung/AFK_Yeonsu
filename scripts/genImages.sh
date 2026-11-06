#!/usr/bin/env bash
# Codex 이미지 생성으로 연수 캐릭터 에셋을 만든다.
# 사용법: scripts/genImages.sh [파일명...]   (인자 없으면 단계 6장 + 단계별 표정 18장 전체 생성)
#   예) scripts/genImages.sh stage1.png
#   예) scripts/genImages.sh stage3_happy.png   (stage3.png 를 함께 첨부해 의상/포즈 유지, 표정만 변경)
#   예) BG=transparent scripts/genImages.sh stage3_blink.png stage3_act.png   (투명 배경 애니메이션 프레임)
# BG=transparent : 이미지 생성 도구의 투명 배경 옵션 사용 (기본은 크림색 단색 배경)
# 프롬프트 원문: docs/prompts/2026-11-06/imagePrompts.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="public/assets/yeonsu"
mkdir -p "$ROOT/$OUT_DIR"

if [ "${BG:-}" = "transparent" ]; then
  BG_PHRASE='a fully TRANSPARENT background (use the transparent background option of the image tool; alpha channel, no background color, no glow, no aura, no floor shadow)'
else
  BG_PHRASE='plain flat cream background (#FFF6EC)'
fi

STYLE="Cute 2D chibi cartoon character for a mobile idle game. Big head (about 1/2 of body height), small body, thick clean dark-brown outlines, soft cel shading, warm pastel palette, full body centered, ${BG_PHRASE}, no text, no watermark, square 1:1 composition. The character must clearly resemble the person in the attached reference photos: a young Korean man with thick straight black hair and blunt straight-cut bangs covering the forehead, thick dark straight eyebrows, round soft face with full cheeks, small calm double-lidded eyes, rounded nose, small pink lips. Keep the same face design consistently across all images."

declare -a NAMES=(stage1.png stage2.png stage3.png stage4.png stage5.png stage6.png expr_happy.png expr_surprised.png expr_pout.png)
declare -a SUBJECTS=(
  'as a baby in a light-blue onesie, sitting and holding a milk bottle, happy'
  'as an elementary school kid wearing a huge yellow backpack and a cap, waving'
  'as a high-school exam student with a white headband (no text), holding a thick workbook and pencil, determined tired eyes'
  'as an office worker in a navy suit and loose tie, holding a laptop and coffee, sleepy eye bags'
  'as a muscular gym guy in a tank top lifting a dumbbell, proud grin'
  'as a legendary king with a golden crown and red cape, confident smile, no glowing aura'
  'wearing a simple beige hoodie, big happy smile with closed eyes, blushing'
  'wearing a simple beige hoodie, surprised face with round open mouth "O"'
  'wearing a simple beige hoodie, cheeky face with pouted pursed lips'
)

# 단계별 표정/프레임: stageN_<key>.png
declare -a EXPR_KEYS=(happy surprised pout blink)
declare -a EXPR_FACES=(
  'a big happy smile with closed eyes and blushing cheeks'
  'a surprised face with wide eyes and a small round open mouth shaped like "O"'
  'a cheeky face with pouted, pursed lips pushed forward'
  'the same calm face but with both eyes gently closed, as in the middle of a blink'
)
# 단계별 동작 프레임: stageN_act.png (팔/소품 자세만 변경)
declare -a ACTS=(
  'lifting the milk bottle up to his mouth and drinking from it, eyes happily half closed'
  'the raised waving hand tilted to the other side as in mid-wave motion, cheerful smile'
  'looking down and writing in the open workbook with the pencil, focused'
  'sipping from the coffee cup held up to his mouth, eyes half closed and tired'
  'curling the dumbbell up higher with the arm fully flexed, cheeks puffed with effort'
  'raising one fist up triumphantly while the red cape flutters out to the side'
)

BASE_REFS=()
for f in "$ROOT"/base_img/*.jpeg; do BASE_REFS+=(-i "$f"); done

TARGETS=("$@")
if [ ${#TARGETS[@]} -eq 0 ]; then
  TARGETS=(stage1.png stage2.png stage3.png stage4.png stage5.png stage6.png)
  for n in 1 2 3 4 5 6; do for e in "${EXPR_KEYS[@]}"; do TARGETS+=("stage${n}_${e}.png"); done; done
fi

for target in "${TARGETS[@]}"; do
  REFS=("${BASE_REFS[@]}")
  if [[ "$target" =~ ^stage([1-6])_act\.png$ ]]; then
    n="${BASH_REMATCH[1]}"
    stage_img="$ROOT/$OUT_DIR/stage${n}.png"
    if [ ! -f "$stage_img" ]; then echo "먼저 stage${n}.png 를 생성하세요" >&2; exit 1; fi
    REFS=(-i "$stage_img" "${BASE_REFS[@]}")
    DESC="The FIRST attached image is the existing game character illustration. Redraw that exact character as the next frame of a simple idle animation: keep the identical art style, outfit, props, colors, character size, position and framing. Change only the arm/prop pose and face to: ${ACTS[$((n-1))]}. The other attached photos are the real person the character is based on, for face likeness only. ${STYLE}"
  elif [[ "$target" =~ ^stage([1-6])_([a-z]+)\.png$ ]]; then
    n="${BASH_REMATCH[1]}"; e="${BASH_REMATCH[2]}"
    face=""
    for i in "${!EXPR_KEYS[@]}"; do [ "${EXPR_KEYS[$i]}" = "$e" ] && face="${EXPR_FACES[$i]}"; done
    if [ -z "$face" ]; then echo "알 수 없는 표정: $e" >&2; exit 1; fi
    stage_img="$ROOT/$OUT_DIR/stage${n}.png"
    if [ ! -f "$stage_img" ]; then echo "먼저 stage${n}.png 를 생성하세요" >&2; exit 1; fi
    REFS=(-i "$stage_img" "${BASE_REFS[@]}")
    DESC="The FIRST attached image is the existing game character illustration. Redraw that exact character: keep the identical art style, outfit, props, pose, colors, framing and background. Change ONLY the facial expression to ${face}. The other attached photos are the real person the character is based on, for face likeness only. ${STYLE}"
  else
    idx=-1
    for i in "${!NAMES[@]}"; do [ "${NAMES[$i]}" = "$target" ] && idx=$i; done
    if [ "$idx" -lt 0 ]; then echo "알 수 없는 파일명: $target" >&2; exit 1; fi
    DESC="${STYLE} The character is drawn ${SUBJECTS[$idx]}."
  fi

  out="$ROOT/$OUT_DIR/$target"
  before=$(stat -f %m "$out" 2>/dev/null || echo 0)
  echo "[$(date +%H:%M:%S)] 생성 시작: $target"
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
  if [ "${BG:-}" = "transparent" ] && ! sips -g hasAlpha "$out" | grep -q "hasAlpha: yes"; then
    echo "실패: $OUT_DIR/$target 에 투명 채널이 없습니다" >&2
    exit 1
  fi
  sips -Z 512 "$ROOT/$OUT_DIR/$target" >/dev/null  # 게임용 512px 로 축소
  echo "[$(date +%H:%M:%S)] 완료: $OUT_DIR/$target"
done
