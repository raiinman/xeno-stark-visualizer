// Transitive Blast-Radius Contagion BFS Solver (MIT License)
import { createGraphState } from './graphState.js';

export function computeTransitiveContagion(startPath, edgesList) {
  createGraphState();
  const hops = new Map([[startPath, 0]]);
  const queue = [startPath];
  while (queue.length > 0) {
    const curr = queue.shift();
    const hop = hops.get(curr);
    for (const edge of edgesList) {
      if (edge.target === curr && !hops.has(edge.source)) {
        hops.set(edge.source, hop + 1);
        queue.push(edge.source);
      }
    }
  }
  return hops;
}
