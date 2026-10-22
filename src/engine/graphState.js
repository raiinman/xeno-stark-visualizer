// Clean-room incremental commit & synapse graph engine (MIT License)
export function createGraphState() {
  return {
    nodesMap: new Map(),
    edgesList: [],
    clustersList: []
  };
}
