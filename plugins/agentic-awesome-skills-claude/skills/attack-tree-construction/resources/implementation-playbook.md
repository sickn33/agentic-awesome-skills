# Attack Tree Construction Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

## Core Concepts

### 1. Attack Tree Structure

```
                    [Root Goal]
                         |
            ┌────────────┴────────────┐
            │                         │
       [Sub-goal 1]              [Sub-goal 2]
       (OR node)                 (AND node)
            │                         │
      ┌─────┴─────┐             ┌─────┴─────┐
      │           │             │           │
   [Attack]   [Attack]      [Attack]   [Attack]
    (leaf)     (leaf)        (leaf)     (leaf)
```

### 2. Node Types

| Type | Symbol | Description |
|------|--------|-------------|
| **OR** | Oval | Any child achieves goal |
| **AND** | Rectangle | All children required |
| **Leaf** | Box | Atomic attack step |

### 3. Attack Attributes

| Attribute | Description | Values |
|-----------|-------------|--------|
| **Cost** | Resources needed | $, $$, $$$ |
| **Time** | Duration to execute | Hours, Days, Weeks |
| **Skill** | Expertise required | Low, Medium, High |
| **Detection** | Likelihood of detection | Low, Medium, High |

## Templates

### Template 1: Attack Tree Data Model

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Optional, Union
import json

class NodeType(Enum):
    OR = "or"
    AND = "and"
    LEAF = "leaf"


class Difficulty(Enum):
    TRIVIAL = 1
    LOW = 2
    MEDIUM = 3
    HIGH = 4
    EXPERT = 5


class Cost(Enum):
    FREE = 0
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    VERY_HIGH = 4


class DetectionRisk(Enum):
    NONE = 0
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CERTAIN = 4


@dataclass
class AttackAttributes:
    difficulty: Difficulty = Difficulty.MEDIUM
    cost: Cost = Cost.MEDIUM
    detection_risk: DetectionRisk = DetectionRisk.MEDIUM
    time_hours: float = 8.0
    requires_insider: bool = False
    requires_physical: bool = False


@dataclass
class AttackNode:
    id: str
    name: str
    description: str
    node_type: NodeType
    attributes: AttackAttributes = field(default_factory=AttackAttributes)
    children: List['AttackNode'] = field(default_factory=list)
    mitigations: List[str] = field(default_factory=list)
    cve_refs: List[str] = field(default_factory=list)

    def add_child(self, child: 'AttackNode') -> None:
        self.children.append(child)

    def calculate_path_difficulty(self) -> float:
        """Calculate aggregate difficulty for this path."""
        if self.node_type == NodeType.LEAF:
            return self.attributes.difficulty.value

        if not self.children:
            return 0

        child_difficulties = [c.calculate_path_difficulty() for c in self.children]

        if self.node_type == NodeType.OR:
            return min(child_difficulties)
        else:  # AND
            return max(child_difficulties)

    def calculate_path_cost(self) -> float:
        """Calculate aggregate cost for this path."""
        if self.node_type == NodeType.LEAF:
            return self.attributes.cost.value

        if not self.children:
            return 0

        child_costs = [c.calculate_path_cost() for c in self.children]

        if self.node_type == NodeType.OR:
            return min(child_costs)
        else:  # AND
            return sum(child_costs)

    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "type": self.node_type.value,
            "attributes": {
                "difficulty": self.attributes.difficulty.name,
                "cost": self.attributes.cost.name,
                "detection_risk": self.attributes.detection_risk.name,
                "time_hours": self.attributes.time_hours,
            },
            "mitigations": self.mitigations,
            "children": [c.to_dict() for c in self.children]
        }


@dataclass
class AttackTree:
    name: str
    description: str
    root: AttackNode
    version: str = "1.0"

    def find_easiest_path(self) -> List[AttackNode]:
        """Find the path with lowest difficulty."""
        return self._find_path(self.root, minimize="difficulty")

    def find_cheapest_path(self) -> List[AttackNode]:
        """Find the path with lowest cost."""
        return self._find_path(self.root, minimize="cost")

    def find_stealthiest_path(self) -> List[AttackNode]:
        """Find the path with lowest detection risk."""
        return self._find_path(self.root, minimize="detection")

    def _find_path(
        self,
        node: AttackNode,
        minimize: str
    ) -> List[AttackNode]:
        """Recursive path finding."""
        if node.node_type == NodeType.LEAF:
            return [node]

        if not node.children:
            return [node]

        if node.node_type == NodeType.OR:
            # Pick the best child path
            best_path = None
            best_score = float('inf')

            for child in node.children:
                child_path = self._find_path(child, minimize)
                score = self._path_score(child_path, minimize)
                if score < best_score:
                    best_score = score
                    best_path = child_path

            return [node] + (best_path or [])
        else:  # AND
            # Must traverse all children
            path = [node]
            for child in node.children:
                path.extend(self._find_path(child, minimize))
            return path

    def _path_score(self, path: List[AttackNode], metric: str) -> float:
        """Calculate score for a path."""
        if metric == "difficulty":
            return sum(n.attributes.difficulty.value for n in path if n.node_type == NodeType.LEAF)
        elif metric == "cost":
            return sum(n.attributes.cost.value for n in path if n.node_type == NodeType.LEAF)
        elif metric == "detection":
            return sum(n.attributes.detection_risk.value for n in path if n.node_type == NodeType.LEAF)
        return 0

    def get_all_leaf_attacks(self) -> List[AttackNode]:
        """Get all leaf attack nodes."""
        leaves = []
        self._collect_leaves(self.root, leaves)
        return leaves

    def _collect_leaves(self, node: AttackNode, leaves: List[AttackNode]) -> None:
        if node.node_type == NodeType.LEAF:
            leaves.append(node)
        for child in node.children:
            self._collect_leaves(child, leaves)

    def get_unmitigated_attacks(self) -> List[AttackNode]:
        """Find attacks without mitigations."""
        return [n for n in self.get_all_leaf_attacks() if not n.mitigations]

    def export_json(self) -> str:
        """Export tree to JSON."""
        return json.dumps({
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "root": self.root.to_dict()
        }, indent=2)
```

### Template 2: Attack Tree Builder

```python
class AttackTreeBuilder:
    """Fluent builder for attack trees."""

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self._node_stack: List[AttackNode] = []
        self._root: Optional[AttackNode] = None

    def goal(self, id: str, name: str, description: str = "") -> 'AttackTreeBuilder':
        """Set the root goal (OR node by default)."""
        self._root = AttackNode(
            id=id,
            name=name,
            description=description,
            node_type=NodeType.OR
        )
        self._node_stack = [self._root]
        return self

    def or_node(self, id: str, name: str, description: str = "") -> 'AttackTreeBuilder':
        """Add an OR sub-goal."""
        node = AttackNode(
            id=id,
            name=name,
            description=description,
            node_type=NodeType.OR
        )
        self._current().add_child(node)
        self._node_stack.append(node)
        return self

    def and_node(self, id: str, name: str, description: str = "") -> 'AttackTreeBuilder':
        """Add an AND sub-goal (all children required)."""
        node = AttackNode(
            id=id,
            name=name,
            description=description,
            node_type=NodeType.AND
        )
        self._current().add_child(node)
        self._node_stack.append(node)
        return self

    def attack(
        self,
        id: str,
        name: str,
        description: str = "",
        difficulty: Difficulty = Difficulty.MEDIUM,
        cost: Cost = Cost.MEDIUM,
        detection: DetectionRisk = DetectionRisk.MEDIUM,
        time_hours: float = 8.0,
        mitigations: List[str] = None
    ) -> 'AttackTreeBuilder':
        """Add a leaf attack node."""
        node = AttackNode(
            id=id,
            name=name,
            description=description,
            node_type=NodeType.LEAF,
            attributes=AttackAttributes(
                difficulty=difficulty,
                cost=cost,
                detection_risk=detection,
                time_hours=time_hours
            ),
            mitigations=mitigations or []
        )
        self._current().add_child(node)
        return self

    def end(self) -> 'AttackTreeBuilder':
        """Close current node, return to parent."""
        if len(self._node_stack) > 1:
            self._node_stack.pop()
        return self

    def build(self) -> AttackTree:
        """Build the attack tree."""
        if not self._root:
            raise ValueError("No root goal defined")
        return AttackTree(
            name=self.name,
            description=self.description,
            root=self._root
        )

    def _current(self) -> AttackNode:
        if not self._node_stack:
            raise ValueError("No current node")
        return self._node_stack[-1]


# Example usage
def build_account_takeover_tree() -> AttackTree:
    """Build attack tree for account takeover scenario."""
    return (
        AttackTreeBuilder("Account Takeover", "Gain unauthorized access to user account")
        .goal("G1", "Take Over User Account")

        .or_node("S1", "Steal Credentials")
            .attack(
                "A1", "Phishing Attack",
                difficulty=Difficulty.LOW,
                cost=Cost.LOW,
                detection=DetectionRisk.MEDIUM,
                mitigations=["Security awareness training", "Email filtering"]
            )
            .attack(
                "A2", "Credential Stuffing",
                difficulty=Difficulty.TRIVIAL,
                cost=Cost.LOW,
                detection=DetectionRisk.HIGH,
                mitigations=["Rate limiting", "MFA", "Password breach monitoring"]
            )
            .attack(
                "A3", "Keylogger Malware",
                difficulty=Difficulty.MEDIUM,
                cost=Cost.MEDIUM,
                detection=DetectionRisk.MEDIUM,
                mitigations=["Endpoint protection", "MFA"]
            )
        .end()

        .or_node("S2", "Bypass Authentication")
            .attack(
                "A4", "Session Hijacking",
                difficulty=Difficulty.MEDIUM,
                cost=Cost.LOW,
                detection=DetectionRisk.LOW,
                mitigations=["Secure session management", "HTTPS only"]
            )
            .attack(
                "A5", "Authentication Bypass Vulnerability",
                difficulty=Difficulty.HIGH,
                cost=Cost.LOW,
                detection=DetectionRisk.LOW,
                mitigations=["Security testing", "Code review", "WAF"]
            )
        .end()

        .or_node("S3", "Social Engineering")
            .and_node("S3.1", "Account Recovery Attack")
                .attack(
                    "A6", "Gather Personal Information",
                    difficulty=Difficulty.LOW,
                    cost=Cost.FREE,
                    detection=DetectionRisk.NONE
                )
                .attack(
                    "A7", "Call Support Desk",
                    difficulty=Difficulty.MEDIUM,
                    cost=Cost.FREE,
                    detection=DetectionRisk.MEDIUM,
                    mitigations=["Support verification procedures", "Security questions"]
                )
            .end()
        .end()

        .build()
    )
```

### Template 3: Mermaid Diagram Generator

```python
class MermaidExporter:
    """Export attack trees to Mermaid diagram format."""

    def __init__(self, tree: AttackTree):
        self.tree = tree
        self._lines: List[str] = []
        self._node_count = 0

    def export(self) -> str:
        """Export tree to Mermaid flowchart."""
        self._lines = ["flowchart TD"]
        self._export_node(self.tree.root, None)
        return "\n".join(self._lines)

    def _export_node(self, node: AttackNode, parent_id: Optional[str]) -> str:
        """Recursively export nodes."""
        node_id = f"N{self._node_count}"
        self._node_count += 1

        # Node shape based on type
        if node.node_type == NodeType.OR:
            shape = f"{node_id}(({node.name}))"
        elif node.node_type == NodeType.AND:
            shape = f"{node_id}[{node.name}]"
        else:  # LEAF
            # Color based on difficulty
            style = self._get_leaf_style(node)
            shape = f"{node_id}[/{node.name}/]"
            self._lines.append(f"    style {node_id} {style}")

        self._lines.append(f"    {shape}")

        if parent_id:
            connector = "-->" if node.node_type != NodeType.AND else "==>"
            self._lines.append(f"    {parent_id} {connector} {node_id}")

        for child in node.children:
            self._export_node(child, node_id)

        return node_id

    def _get_leaf_style(self, node: AttackNode) -> str:
        """Get style based on attack attributes."""
        colors = {
            Difficulty.TRIVIAL: "fill:#ff6b6b",  # Red - easy attack
            Difficulty.LOW: "fill:#ffa06b",
            Difficulty.MEDIUM: "fill:#ffd93d",
            Difficulty.HIGH: "fill:#6bcb77",
            Difficulty.EXPERT: "fill:#4d96ff",  # Blue - hard attack
        }
        color = colors.get(node.attributes.difficulty, "fill:#gray")
        return color


class PlantUMLExporter:
    """Export attack trees to PlantUML format."""

    def __init__(self, tree: AttackTree):
        self.tree = tree

    def export(self) -> str:
        """Export tree to PlantUML."""
        lines = [
            "@startmindmap",
            f"* {self.tree.name}",
        ]
        self._export_node(self.tree.root, lines, 1)
        lines.append("@endmindmap")
        return "\n".join(lines)

    def _export_node(self, node: AttackNode, lines: List[str], depth: int) -> None:
        """Recursively export nodes."""
        prefix = "*" * (depth + 1)

        if node.node_type == NodeType.OR:
            marker = "[OR]"
        elif node.node_type == NodeType.AND:
            marker = "[AND]"
        else:
            diff = node.attributes.difficulty.name
            marker = f"<<{diff}>>"

        lines.append(f"{prefix} {marker} {node.name}")

        for child in node.children:
            self._export_node(child, lines, depth + 1)
```

### Template 4: Attack Path Analysis

```python
from typing import Set, Tuple

class AttackPathAnalyzer:
    """Analyze attack paths and coverage."""

    def __init__(self, tree: AttackTree):
        self.tree = tree

    def get_all_paths(self) -> List[List[AttackNode]]:
        """Get all possible attack paths."""
        paths = []
        self._collect_paths(self.tree.root, [], paths)
        return paths

    def _collect_paths(
        self,
        node: AttackNode,
        current_path: List[AttackNode],
        all_paths: List[List[AttackNode]]
    ) -> None:
        """Recursively collect all paths."""
        current_path = current_path + [node]

        if node.node_type == NodeType.LEAF:
            all_paths.append(current_path)
            return

        if not node.children:
            all_paths.append(current_path)
            return

        if node.node_type == NodeType.OR:
            # Each child is a separate path
            for child in node.children:
                self._collect_paths(child, current_path, all_paths)
        else:  # AND
            # Must combine all children
            child_paths = []
            for child in node.children:
                child_sub_paths = []
                self._collect_paths(child, [], child_sub_paths)
                child_paths.append(child_sub_paths)

            # Combine paths from all AND children
            combined = self._combine_and_paths(child_paths)
            for combo in combined:
                all_paths.append(current_path + combo)

    def _combine_and_paths(
        self,
        child_paths: List[List[List[AttackNode]]]
    ) -> List[List[AttackNode]]:
        """Combine paths from AND node children."""
        if not child_paths:
            return [[]]

        if len(child_paths) == 1:
            return [path for paths in child_paths for path in paths]

        # Cartesian product of all child path combinations
        result = [[]]
        for paths in child_paths:
            new_result = []
            for existing in result:
                for path in paths:
                    new_result.append(existing + path)
            result = new_result
        return result

    def calculate_path_metrics(self, path: List[AttackNode]) -> Dict:
        """Calculate metrics for a specific path."""
        leaves = [n for n in path if n.node_type == NodeType.LEAF]

        total_difficulty = sum(n.attributes.difficulty.value for n in leaves)
        total_cost = sum(n.attributes.cost.value for n in leaves)
        total_time = sum(n.attributes.time_hours for n in leaves)
        max_detection = max((n.attributes.detection_risk.value for n in leaves), default=0)

        return {
            "steps": len(leaves),
            "total_difficulty": total_difficulty,
            "avg_difficulty": total_difficulty / len(leaves) if leaves else 0,
            "total_cost": total_cost,
            "total_time_hours": total_time,
            "max_detection_risk": max_detection,
            "requires_insider": any(n.attributes.requires_insider for n in leaves),
            "requires_physical": any(n.attributes.requires_physical for n in leaves),
        }

    def identify_critical_nodes(self) -> List[Tuple[AttackNode, int]]:
        """Find nodes that appear in the most paths."""
        paths = self.get_all_paths()
        node_counts: Dict[str, Tuple[AttackNode, int]] = {}

        for path in paths:
            for node in path:
                if node.id not in node_counts:
                    node_counts[node.id] = (node, 0)
                node_counts[node.id] = (node, node_counts[node.id][1] + 1)

        return sorted(
            node_counts.values(),
            key=lambda x: x[1],
            reverse=True
        )

    def coverage_analysis(self, mitigated_attacks: Set[str]) -> Dict:
        """Analyze how mitigations affect attack coverage."""
        all_paths = self.get_all_paths()
        blocked_paths = []
        open_paths = []

        for path in all_paths:
            path_attacks = {n.id for n in path if n.node_type == NodeType.LEAF}
            if path_attacks & mitigated_attacks:
                blocked_paths.append(path)
            else:
                open_paths.append(path)

        return {
            "total_paths": len(all_paths),
            "blocked_paths": len(blocked_paths),
            "open_paths": len(open_paths),
            "coverage_percentage": len(blocked_paths) / len(all_paths) * 100 if all_paths else 0,
            "open_path_details": [
                {"path": [n.name for n in p], "metrics": self.calculate_path_metrics(p)}
                for p in open_paths[:5]  # Top 5 open paths
            ]
        }

    def prioritize_mitigations(self) -> List[Dict]:
        """Prioritize mitigations by impact."""
        critical_nodes = self.identify_critical_nodes()
        paths = self.get_all_paths()
        total_paths = len(paths)

        recommendations = []
        for node, count in critical_nodes:
            if node.node_type == NodeType.LEAF and node.mitigations:
                recommendations.append({
                    "attack": node.name,
                    "attack_id": node.id,
                    "paths_blocked": count,
                    "coverage_impact": count / total_paths * 100,
                    "difficulty": node.attributes.difficulty.name,
                    "mitigations": node.mitigations,
                })

        return sorted(recommendations, key=lambda x: x["coverage_impact"], reverse=True)
```

## Best Practices

### Do's
- **Start with clear goals** - Define what attacker wants
- **Be exhaustive** - Consider all attack vectors
- **Attribute attacks** - Cost, skill, and detection
- **Update regularly** - New threats emerge
- **Validate with experts** - Red team review

### Don'ts
- **Don't oversimplify** - Real attacks are complex
- **Don't ignore dependencies** - AND nodes matter
- **Don't forget insider threats** - Not all attackers are external
- **Don't skip mitigations** - Trees are for defense planning
- **Don't make it static** - Threat landscape evolves

## Resources

- [Attack Trees by Bruce Schneier](https://www.schneier.com/academic/archives/1999/12/attack_trees.html)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)
- [OWASP Attack Surface Analysis](https://owasp.org/www-community/controls/Attack_Surface_Analysis_Cheat_Sheet)
