---
name: react-flow-architect
description: "Build production-ready ReactFlow applications with hierarchical navigation, performance optimization, and advanced state management."
risk: critical
source: community
date_added: "2026-02-27"
---

# ReactFlow Architect

Build production-ready ReactFlow applications with hierarchical navigation, performance optimization, and advanced state management.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Minimal Controlled Graph Example

Target React Flow v12 (`@xyflow/react`); use matching docs for older reactflow v11 projects. This is a starting component, not an implementation of hierarchy/history/persistence.

```tsx
import { ReactFlow, useNodesState, useEdgesState, addEdge, type Connection } from '@xyflow/react';
import { useCallback } from 'react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Start' } },
  { id: '2', position: { x: 250, y: 0 }, data: { label: 'Next' } },
];
export default function InteractiveGraph() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const onConnect = useCallback((connection: Connection) =>
    setEdges(previous => addEdge(connection, previous)), [setEdges]);
  return <div style={{ width: '100%', height: 500 }}>
    <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange} onConnect={onConnect} fitView />
  </div>;
}
```

Install the reviewed compatible package version in the host project and run its typecheck/browser checks. Hooks such as useReactFlow need a ReactFlowProvider ancestor outside the component invoking them; the minimal example avoids that hook. No compile or browser execution is asserted here.

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
