"""단색 배경 캐릭터 PNG 의 배경을 투명하게 만든다.

가장자리와 연결된 배경색 영역을 flood-fill 로 지우고, 외곽선 주변 1~2px 은
배경색과의 거리에 비례해 반투명 처리해 테두리 번짐(halo)을 줄인다.
외곽선에 갇힌 배경 구멍(팔과 몸 사이 등)은 지우지 않는다 — 흰 옷/우유 등 그림 일부까지 지워지기 때문.

사용법: python scripts/removeBg.py <png> [<png> ...]   (파일을 덮어씀)
의존성: pillow, numpy, scipy
"""

import sys

import numpy as np
from PIL import Image
from scipy import ndimage

FILL_TOL = 30  # 가장자리 연결 배경으로 볼 색 거리
EDGE_RANGE = 70  # 테두리 반투명 처리 시 색 거리 범위


def process(path: str) -> None:
    img = Image.open(path).convert("RGBA")
    rgba = np.asarray(img).astype(np.float32)
    rgb = rgba[..., :3]

    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.linalg.norm(rgb - bg, axis=-1)

    # 1) 가장자리와 연결된 배경
    near = dist < FILL_TOL
    labels, _ = ndimage.label(near)
    edge_labels = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    edge_labels = edge_labels[edge_labels != 0]
    bg_mask = np.isin(labels, edge_labels)

    alpha = np.where(bg_mask, 0.0, 255.0)

    # 2) 테두리 2px 반투명 처리
    ring = ndimage.binary_dilation(bg_mask, iterations=2) & ~bg_mask
    soft = np.clip(dist / EDGE_RANGE, 0, 1) * 255.0
    alpha = np.where(ring, np.minimum(alpha, soft), alpha)

    out = rgba.copy()
    out[..., 3] = alpha
    Image.fromarray(out.astype(np.uint8)).save(path)
    removed = bg_mask.mean() * 100
    print(f"{path}: bg={bg.astype(int).tolist()} removed={removed:.1f}%")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for p in sys.argv[1:]:
        process(p)
