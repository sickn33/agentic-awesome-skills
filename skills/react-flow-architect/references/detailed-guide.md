# ReactFlow Architect - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

Examples target @xyflow/react v12. Fragments need host React imports/types and measured node sizes; they are not one complete application. Import the stylesheet and give the graph container a nonzero size as in the root. Validate node IDs, endpoints and hierarchy from external data; render labels as text and never trust imported HTML/URLs.

## Quick Start

Create basic interactive graph:

```tsx
import { ReactFlow, type Node, type Edge } from "@xyflow/react";

const nodes: Node[] = [
  { id: "1", position: { x: 0, y: 0 }, data: { label: "Node 1" } },
  { id: "2", position: { x: 100, y: 100 }, data: { label: "Node 2" } },
];

const edges: Edge[] = [{ id: "e1-2", source: "1", target: "2" }];

export default function Graph() {
  return <ReactFlow nodes={nodes} edges={edges} />;
}
```


## Core Patterns

### Hierarchical Tree Navigation

Build expandable/collapsible tree structures with parent-child relationships.

#### Node Schema

```typescript
interface TreeNode extends Node {
  data: {
    label: string;
    level: number;
    hasChildren: boolean;
    isExpanded: boolean;
    childCount: number;
    category: "root" | "category" | "process" | "detail";
  };
}
```

#### Incremental Node Building

```typescript
function buildVisibleGraph(allNodes: TreeNode[], allEdges: Edge[], expandedIds: Set<string>) {
  const children = new Map<string, TreeNode[]>();
  const ids = new Set(allNodes.map(node => node.id));
  if (ids.size !== allNodes.length) throw new Error('Duplicate node IDs');
  for (const node of allNodes) {
    if (node.parentId && !ids.has(node.parentId)) throw new Error('Missing parent');
    if (node.parentId) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node]);
  }
  const visible = new Map<string, TreeNode>();
  const stack = allNodes.filter(node => !node.parentId).reverse();
  while (stack.length) {
    const node = stack.pop()!;
    if (visible.has(node.id)) continue;
    visible.set(node.id, node);
    if (expandedIds.has(node.id)) stack.push(...(children.get(node.id) ?? []).slice().reverse());
  }
  return { nodes: [...visible.values()],
    edges: allEdges.filter(edge => visible.has(edge.source) && visible.has(edge.target)) };
}
// Validate the parent graph for cycles before use; cyclic/orphaned imports are errors,
// not roots to silently omit. Parent grouping uses relative coordinates, unlike a flat layout.

```

### Performance Optimization

Handle large datasets with incremental rendering and memoization.

#### Derived Visibility

Start with a correct complete rebuild: `useMemo(() => buildVisibleGraph(allNodes, allEdges, new Set(expandedList)), [allNodes, allEdges, expandedList])`. The previous incremental sketch used undefined caches/dependencies and did not update its previous-state refs; it is not a working algorithm. Add incremental invalidation only after profiling and tests for changed nodes, edges, ancestry, expand/collapse and deleted selection. Never mutate refs inside useMemo to emulate a committed history.

#### Memoization Patterns

```typescript
// Memoize node components to prevent unnecessary re-renders
const ProcessNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className={`process-node ${selected ? 'selected' : ''}`}>
      {data.label}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  return (
    prevProps.data.label === nextProps.data.label &&
    prevProps.selected === nextProps.selected &&
    prevProps.data.isExpanded === nextProps.data.isExpanded
  );
});

// Memoize edge calculations
const styledEdges = useMemo(() => {
  return edges.map(edge => ({
    ...edge,
    style: {
      ...edge.style,
      strokeWidth: selectedEdgeId === edge.id ? 3 : 2,
      stroke: selectedEdgeId === edge.id ? '#3b82f6' : '#94a3b8',
    },
    animated: selectedEdgeId === edge.id,
  }));
}, [edges, selectedEdgeId]);
```

### State Management

Complex node/edge state patterns with undo/redo and persistence.

#### Snapshot History

Store bounded immutable snapshots of nodes, edges and expanded IDs, not recursive GraphState objects containing their own history. On an edit after undo, truncate the redo branch and append the new snapshot; implement undo/redo by moving a cursor within bounds. Serialize Sets explicitly as arrays, validate imports, and persist only with an authorized destination. Selection-only changes need not create undo entries. The original reducer omitted its advertised history actions, so no complete history implementation is bundled.

## Advanced Features

### Auto-Layout Integration

Integrate Dagre for automatic graph layout:

```typescript
import dagre from "dagre";

const layoutOptions = {
  rankdir: "TB", // Top to Bottom
  nodesep: 100, // Node separation
  ranksep: 150, // Rank separation
  marginx: 50,
  marginy: 50,
  edgesep: 10,
};

const applyLayout = (nodes: Node[], edges: Edge[]) => {
  const g = new dagre.graphlib.Graph();
  g.setGraph(layoutOptions);
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to graph
  nodes.forEach((node) => {
    g.setNode(node.id, { width: 200, height: 100 });
  });

  // Add edges to graph
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(g);

  // Apply positions
  return nodes.map((node) => ({
    ...node,
    position: {
      x: g.node(node.id).x - 100,
      y: g.node(node.id).y - 50,
    },
  }));
};

// Debounce layout calculations
const debouncedLayout = useMemo(() => debounce((nodes: Node[], edges: Edge[]) => {
  setNodes(applyLayout(nodes, edges)); // Apply the delayed result, not debounce's return value
}, 150), [setNodes]);
useEffect(() => () => debouncedLayout.cancel(), [debouncedLayout]);
```

### Focus Mode

Isolate selected nodes and their direct connections:

```typescript
const useFocusMode = (
  selectedNodeId: string,
  allNodes: Node[],
  allEdges: Edge[],
) => {
  return useMemo(() => {
    if (!selectedNodeId) return { nodes: allNodes, edges: allEdges };

    // Get direct connections
    const connectedNodeIds = new Set([selectedNodeId]);
    const focusedEdges: Edge[] = [];

    allEdges.forEach((edge) => {
      if (edge.source === selectedNodeId || edge.target === selectedNodeId) {
        focusedEdges.push(edge);
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
      }
    });

    // Get connected nodes
    const focusedNodes = allNodes.filter((n) => connectedNodeIds.has(n.id));

    return { nodes: focusedNodes, edges: focusedEdges };
  }, [selectedNodeId, allNodes, allEdges]);
};

// Smooth transitions for focus mode
const focusModeStyles = {
  transition: "all 0.3s ease-in-out",
  opacity: isInFocus ? 1 : 0.3,
  filter: isInFocus ? "none" : "blur(2px)",
};
```

### Search Integration

Search and navigate to specific nodes:

```typescript
const searchNodes = useCallback((nodes: Node[], query: string) => {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();
  return nodes.filter(
    (node) =>
      node.data.label.toLowerCase().includes(lowerQuery) ||
      node.data.description?.toLowerCase().includes(lowerQuery),
  );
}, []);

const navigateToSearchResult = (nodeId: string) => {
  // Expand parent nodes
  const nodePath = calculateBreadcrumbPath(nodeId, allNodes);
  const parentIds = nodePath.slice(0, -1).map((n) => n.id);

  setExpandedIds((prev) => new Set([...prev, ...parentIds]));
  setSelectedNodeId(nodeId);

  // Fit view to node
  fitView({ nodes: [{ id: nodeId }], duration: 800 });
};
```


## Performance Evidence

Measure React commits and browser frame/layout timing on the actual graph, node renderer, viewport and device. Count nodes/edges from runtime data; regexes cannot estimate render milliseconds or heap usage. Record warmup, interaction, visible/total graph size, baseline/head and measurements. The removed analyzer skeleton had missing methods and arbitrary timing coefficients; no graph-analyzer.js is bundled.

## Best Practices

### Performance Guidelines

1. **Use React.memo** for node components to prevent unnecessary re-renders
2. **Implement virtualization** for graphs with 1000+ nodes
3. **Debounce layout calculations** during rapid interactions
4. **Use useCallback** for edge creation and manipulation functions
5. **Implement proper TypeScript types** for nodes and edges

### Memory Management

```typescript
// Use Map for O(1) lookups instead of array.find
const nodesById = useMemo(
  () => new Map(allNodes.map((n) => [n.id, n])),
  [allNodes],
);

// Cache layout results
const layoutCacheRef = useRef<Map<string, Node[]>>(new Map());

// Proper cleanup in useEffect
useEffect(() => {
  return () => {
    // Clean up any lingering references
    nodesMapRef.current.clear();
    edgesMapRef.current.clear();
  };
}, []);
```

### State Optimization

```typescript
// Use useRef for objects that shouldn't trigger re-renders
const autoSaveDataRef = useRef<{ nodes: Node[]; edges: Edge[]; lastSaved: number }>({
  nodes: [],
  edges: [],
  lastSaved: Date.now(),
});

// Update properties without breaking reference
const updateAutoSaveData = (newNodes: Node[], newEdges: Edge[]) => {
  autoSaveDataRef.current.nodes = newNodes;
  autoSaveDataRef.current.edges = newEdges;
  autoSaveDataRef.current.lastSaved = Date.now();
};
```


Layout cache keys must include graph topology, dimensions, layout options and hierarchy, not just node IDs; bound/evict entries and cancel pending layout on unmount. Dagre coordinates here assume fixed 200×100 flat nodes; use measured sizes and convert child positions to parent-relative coordinates when grouping. After expanding search ancestors, wait until nodes are committed/measured before fitView, and validate breadcrumb traversal against cycles. Custom memo comparators must compare every prop used by rendering; stable useMemo/useCallback alone does not prove a speedup.

## Common Problems & Solutions

### Performance Issues

- **Problem**: Lag during node expansion
- **Solution**: Implement incremental rendering with change detection

- **Problem**: Memory usage increases over time
- **Solution**: Proper cleanup in useEffect hooks and use WeakMap for temporary data

### Layout Conflicts

- **Problem**: Manual positioning conflicts with auto-layout
- **Solution**: Use controlled positioning state and separate layout modes

### Rendering Issues

- **Problem**: Excessive re-renders
- **Solution**: Use memo, useMemo, and useCallback with stable dependencies

- **Problem**: Slow layout calculations
- **Solution**: Debounce layout calculations and cache results
