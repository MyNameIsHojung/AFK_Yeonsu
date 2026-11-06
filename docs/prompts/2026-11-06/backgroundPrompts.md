---
type: prompt
status: done
updated_at: 2026-11-06
---

# 단계별 집 배경 프롬프트 (Codex 이미지 생성용)

`scripts/genBackgrounds.sh` 가 사용. 화풍 참고용으로 `public/assets/yeonsu/stage1.png` 를 첨부 (캐릭터는 그리지 않음).

## 공통 (STYLE)
```
Background illustration for a cute 2D chibi cartoon mobile idle game, matching the art style of the
attached character illustration: thick clean dark-brown outlines, soft cel shading, warm cozy pastel
palette. A cozy room INSIDE A HOME, front view at eye level, slightly wide angle, the floor visible in
the lower third. IMPORTANT: leave a large EMPTY open floor area in the lower-center of the image
(no furniture, no objects there) so a character can be placed standing there later. No people, no
characters, no animals, no text, no letters, no watermark. Square 1:1 composition.
```

## 방별 (Scene)
| 파일 | 그려진 시간대 | 장면 |
|---|---|---|
| room1.png | day | 아기방: 흰 아기 침대 + 별 모빌, 구름 벽지, 놀이매트, 인형/블록, 햇살 창문 |
| room2.png | day | 초등학생 방: 이층 침대, 장난감 상자, 크레파스 책상, 세계지도 포스터 |
| room3.png | night | 수험생 공부방: 스탠드 켜진 책상, 문제집 더미, 포스트잇 벽, 달 보이는 창 |
| room4.png | evening | 직장인 원룸: 소파, 컵라면 + 노트북 테이블, 빨래 건조대, 저녁 도시 창 |
| room5.png | day | 거실 홈짐: 덤벨 랙, 바벨, 요가매트, 프로틴 쉐이커, 큰 거울 |
| room6.png | night | 펜트하우스 거실: 샹들리에, 트로피 장식장, 레드 벨벳 소파, 야경 통창 |

원문 영어 프롬프트는 스크립트의 `SUBJECTS` 배열 참고.
