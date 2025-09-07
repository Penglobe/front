// 외부 JSON -> 최소 페이로드

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

const nz = (x) => (x === -1 ? null : x);

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

// 최소 페이로드 생성
export function toCarbonRequestPayload(
  aiJson,
  opts = { merge: true, userId: null }
) {
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
      serving: { size: servingSize, unit },
      amount: { multiplier, totalSize, unit },
      nutrition: {
        energyKcal: nz(c.energy),
        carbG: nz(c.carbohydrate),
        proteinG: nz(c.protein),
        fatG: nz(c.fat),
      },
    };
  });

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
    userId: opts.userId,
    items: finalItems,
  };
}
