// 외부 JSON -> 최소 페이로드

// 한 음식 안에서 "채워진 값"이 많은 걸 우선
function pickBestCandidate(candidates = []) {
  const score = (c) => {
    const v = (x) => (x != null && x !== -1 ? 1 : 0);
    return (
      v(c.energy) +
      v(c.carbohydrate) +
      v(c.protein) +
      v(c.fat) +
      v(c.servingSize) +
      v(c.totalServingSize)
    );
  };
  return [...candidates].sort((a, b) => score(b) - score(a))[0] ?? null;
}

// -1 → null
// -1은 FoodLens가 "모름"으로 표시하는 값
const nz = (x) => (x === -1 ? null : x);

// 같은 음식 합치기 : name+brand+unit 기준으로 totalSize 합산
function mergeSameItems(items) {
  const keyOf = (it) =>
    [it.name ?? "", it.brand ?? "", it.amount.unit ?? ""].join("|");
  const map = new Map();
  for (const it of items) {
    const k = keyOf(it);
    if (!map.has(k)) map.set(k, { ...it });
    else {
      const acc = map.get(k);
      acc.amount.totalSize =
        (acc.amount.totalSize ?? 0) + (it.amount.totalSize ?? 0);
      map.set(k, acc);
    }
  }
  return [...map.values()];
}

// 외부(AI) JSON -> 백엔드에 보낼 최소 페이로드
export function toCarbonRequestPayload(aiJson, opts = { merge: true }) {
  const items = (aiJson?.foods || []).map((f) => {
    const c = pickBestCandidate(f.candidates || []) || {};
    const unit = c.unit ?? "g";
    const servingSize = nz(c.servingSize);
    const multiplier = f.eatAmount ?? 1;
    const totalSize = nz(
      c.totalServingSize ??
        (servingSize != null ? servingSize * multiplier : null)
    );

    return {
      name: c.foodName ?? f.name ?? null,
      id: c.id ?? null,
      brand: c.manufacturer ?? null,
      serving: { size: servingSize, unit }, // 1회 제공량
      amount: { multiplier, totalSize, unit }, // 총량, 배수
      nutrition: {
        // 칼로리, 탄, 단, 지
        energyKcal: nz(c.energy),
        carbG: nz(c.carbohydrate),
        proteinG: nz(c.protein),
        fatG: nz(c.fat),
      },
    };
  });

  // 이름이 없는 음식, 양이 없는 음식은 필터링
  // 총량이 비어 있으면 servingSize * multiplier로 채움
  const cleaned = items
    .filter(
      (x) => x.name && (x.amount.totalSize != null || x.serving.size != null)
    )
    .map((x) => {
      if (x.amount.totalSize == null && x.serving.size != null) {
        x.amount.totalSize = x.serving.size * (x.amount.multiplier ?? 1);
      }
      return x;
    });

  const finalItems = opts.merge ? mergeSameItems(cleaned) : cleaned;

  return {
    timestamp: Date.now(),
    source: "FoodLens",
    items: finalItems,
  };
}
