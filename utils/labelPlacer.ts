// Label placement utilities based on candidate directions and scoring
// Lightweight, dependency-free implementation

import { Node, Connection } from '../types';

type Rect = { x: number; y: number; w: number; h: number };
export type DirKey = 'N'|'NE'|'E'|'SE'|'S'|'SW'|'W'|'NW';

const DIRS: Record<DirKey, { x: number; y: number }> = {
  N:  { x:  0, y: -1 },
  NE: { x:  1, y: -1 },
  E:  { x:  1, y:  0 },
  SE: { x:  1, y:  1 },
  S:  { x:  0, y:  1 },
  SW: { x: -1, y:  1 },
  W:  { x: -1, y:  0 },
  NW: { x: -1, y: -1 },
};

const norm = (x: number, y: number) => {
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
};

const angle = (x: number, y: number) => Math.atan2(y, x);
const angDist = (a: number, b: number) => {
  let d = Math.abs(a - b) % (2 * Math.PI);
  return d > Math.PI ? 2 * Math.PI - d : d;
};

const intersects = (a: Rect, b: Rect) => !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
const contains = (outer: Rect, inner: Rect) => inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;

export interface PlacementWeights {
  wCollide: number;
  wEdge: number;
  wDist: number;
  wClip: number;
}

export interface ComputeOptions {
  maxSteps?: number; // how many radius expansions
  stepGap?: number; // px per step
  baseGap?: number; // additional gap from icon edge
  weights?: Partial<PlacementWeights>;
  // Optional remembered side preferences by node id
  preferredSides?: Record<string, Partial<Record<DirKey, number>>>;
}

export type LabelRects = Record<string, Rect>;

export function computeLabelRects(
  nodes: Node[],
  connections: Connection[],
  viewportWorld: Rect,
  measure: (text: string) => { w: number; h: number },
  opts: ComputeOptions = {}
): LabelRects {
  const weights: PlacementWeights = {
    wCollide: 1000,
    wEdge: 5,
    wDist: 0.2,
    wClip: 5000,
    ...opts.weights,
  };
  const maxSteps = opts.maxSteps ?? 6;
  const stepGap = opts.stepGap ?? 8;
  const baseExtraGap = opts.baseGap ?? 6;

  // Pre-index node icon rectangles in world coords
  const nodeRects = new Map<string, Rect>();
  nodes.forEach(n => {
    const s = n.style.iconSize;
    nodeRects.set(n.id, { x: n.x - s / 2, y: n.y - s / 2, w: s, h: s });
  });

  // Build adjacency for quick access
  const neighborMap = new Map<string, { x: number; y: number }[]>();
  nodes.forEach(n => neighborMap.set(n.id, []));
  connections.forEach(c => {
    const a = nodes.find(n => n.id === c.from.nodeId);
    const b = nodes.find(n => n.id === c.to.nodeId);
    if (!a || !b) return;
    neighborMap.get(a.id)!.push({ x: b.x, y: b.y });
    neighborMap.get(b.id)!.push({ x: a.x, y: a.y });
  });

  const placed: LabelRects = {};

  // Iteration order: by degree descending to place crowded nodes first
  const nodesByDegree = [...nodes].sort((a, b) => (neighborMap.get(b.id)?.length || 0) - (neighborMap.get(a.id)?.length || 0));

  for (const node of nodesByDegree) {
    const labelSize = measure(node.name || '');
    const iconHalf = node.style.iconSize / 2;
    const baseRadius = iconHalf + baseExtraGap;
    const neighbors = neighborMap.get(node.id) || [];
    const neighborAngles = neighbors.map(p => angle(p.x - node.x, p.y - node.y));

    let chosen: Rect | null = null;

    for (let step = 0; step < maxSteps; step++) {
      const r = baseRadius + step * stepGap + Math.max(labelSize.w, labelSize.h) / 2;

      let bestScore = Infinity;
      let bestRect: Rect | null = null;

      (Object.keys(DIRS) as DirKey[]).forEach((key) => {
        const dir = norm(DIRS[key].x, DIRS[key].y);
        const cx = node.x + dir.x * r;
        const cy = node.y + dir.y * r;
        const rect: Rect = { x: cx - labelSize.w / 2, y: cy - labelSize.h / 2, w: labelSize.w, h: labelSize.h };

        const collideWithNode = [...nodeRects.values()].some(nr => intersects(rect, nr)) ? 1 : 0;
        const collideWithLabels = Object.values(placed).some(pr => intersects(rect, pr)) ? 1 : 0;
        const collisions = collideWithNode + collideWithLabels;

        // Edge congestion: count neighbors roughly aligned with label direction (within 30°)
        const theta = angle(dir.x, dir.y);
        const alignedCount = neighborAngles.reduce((acc, a) => acc + (angDist(a, theta) < Math.PI / 6 ? 1 : 0), 0);

        const distPenalty = step; // farther radius => larger step index
        const clipPenalty = contains(viewportWorld, rect) ? 0 : 1;

        // Side bias/preference (lower score is better). Positive bonuses subtract from score.
        const sideBonus = opts.preferredSides?.[node.id]?.[key] ?? 0;

        const score =
          collisions * weights.wCollide +
          alignedCount * weights.wEdge +
          distPenalty * weights.wDist +
          clipPenalty * weights.wClip -
          sideBonus;

        if (score < bestScore) {
          bestScore = score;
          bestRect = rect;
        }
      });

      // If we found a collision-free and in-view candidate, pick it, else expand radius
      if (bestRect) {
        const isCollisionFree = ![...nodeRects.values()].some(nr => intersects(bestRect!, nr)) && !Object.values(placed).some(pr => intersects(bestRect!, pr));
        const inView = contains(viewportWorld, bestRect);
        if (isCollisionFree && inView) {
          chosen = bestRect;
          break;
        }
        // If none is perfect, accept the lowest score on the last step
        if (step === maxSteps - 1) chosen = bestRect;
      }
    }

    // Fallback: place just below the icon
    if (!chosen) {
      chosen = { x: node.x - labelSize.w / 2, y: node.y + iconHalf + 6, w: labelSize.w, h: labelSize.h };
    }

    placed[node.id] = chosen;
  }

  return placed;
}