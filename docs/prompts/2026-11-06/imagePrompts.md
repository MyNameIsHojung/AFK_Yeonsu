---
type: prompt
status: done
updated_at: 2026-11-06
---

# 연수 캐릭터 이미지 프롬프트 (Codex 이미지 생성용)

`scripts/genImages.sh` 가 이 문서의 값과 같은 프롬프트를 사용한다. 수정 시 둘 다 갱신.

## 공통 스타일 (STYLE)
```
Cute 2D chibi cartoon character for a mobile idle game. Big head (about 1/2 of body height), small body,
thick clean dark-brown outlines, soft cel shading, warm pastel palette, full body centered,
plain flat cream background (#FFF6EC), no text, no watermark, square 1:1 composition.
The character must clearly resemble the person in the attached reference photos: a young Korean man
with thick straight black hair and blunt straight-cut bangs covering the forehead, thick dark straight
eyebrows, round soft face with full cheeks, small calm double-lidded eyes, rounded nose, small pink lips.
Keep the same face design consistently across all images.
```

## 단계별 (STAGE)
| 파일 | 프롬프트 |
|---|---|
| stage1.png | as a baby in a light-blue onesie, sitting and holding a milk bottle, happy |
| stage2.png | as an elementary school kid wearing a huge yellow backpack and a cap, waving |
| stage3.png | as a high-school exam student with a white headband (no text), holding a thick workbook and pencil, determined tired eyes |
| stage4.png | as an office worker in a navy suit and loose tie, holding a laptop and coffee, sleepy eye bags |
| stage5.png | as a muscular gym guy in a tank top lifting a dumbbell, proud grin |
| stage6.png | as a legendary king with a golden crown and red cape, glowing golden aura, confident smile |

## 단계별 표정 (사용 중) — `stage{1..6}_{happy,surprised,pout}.png`
해당 `stageN.png` 를 첫 번째 이미지로 첨부하고, 아래 지시 + STYLE 을 사용한다.
```
The FIRST attached image is the existing game character illustration. Redraw that exact character:
keep the identical art style, outfit, props, pose, colors, framing and background.
Change ONLY the facial expression to <FACE>. The other attached photos are the real person
the character is based on, for face likeness only.
```
| 표정 | FACE |
|---|---|
| happy | a big happy smile with closed eyes and blushing cheeks |
| surprised | a surprised face with wide eyes and a small round open mouth shaped like "O" |
| pout | a cheeky face with pouted, pursed lips pushed forward |

## 애니메이션 프레임 — `stage{1..6}_blink.png`, `stage{1..6}_act.png`
- blink: 표정 모드와 같은 지시, FACE = `the same calm face but with both eyes gently closed, as in the middle of a blink`
- act: stageN.png 첨부, "next frame of a simple idle animation" — 팔/소품 자세만 변경 (스크립트 `ACTS` 배열)
  - 1 젖병 빨기 / 2 손 흔드는 각도 / 3 필기 / 4 커피 마시기 / 5 덤벨 컬 / 6 주먹 들고 망토 휘날림
- 6단계 전체(기본, 표정, 프레임)는 `BG=transparent` 로 재생성 — 기존 금빛 오라가 배경과 분리되지 않아 오라를 빼고 CSS 로 표현
- 1~5단계는 크림색 배경으로 생성 후 `scripts/removeBg.py` 로 배경 제거 (프레임 간 테두리 일치)

## 공통 표정 (미사용, canonical: false) — 단계별 표정으로 대체됨
| 파일 | 프롬프트 |
|---|---|
| expr_happy.png | wearing a simple beige hoodie, big happy smile with closed eyes, blushing |
| expr_surprised.png | wearing a simple beige hoodie, surprised face with round open mouth "O" |
| expr_pout.png | wearing a simple beige hoodie, cheeky face with pouted pursed lips |
