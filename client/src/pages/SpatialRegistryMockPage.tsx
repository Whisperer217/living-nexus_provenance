import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  SPATIAL_REGISTRY_STUDY,
  type SpatialRegistryNode,
  type SpatialRegistryNodeId,
} from "@/lib/spatialRegistryMock";
import "./spatial-registry-mock.css";

const nodeById = Object.fromEntries(
  SPATIAL_REGISTRY_STUDY.nodes.map((node) => [node.id, node]),
) as Record<SpatialRegistryNodeId, SpatialRegistryNode>;

function NodeGlyph({ id }: { id: SpatialRegistryNodeId }) {
  if (id === "work") {
    return <span className="spatial-study__crystal" aria-hidden="true"><i /><i /><i /></span>;
  }

  return <span className="spatial-study__node-mark" aria-hidden="true" />;
}

export default function SpatialRegistryMockPage() {
  const [, navigate] = useLocation();
  const [selectedNodeId, setSelectedNodeId] = useState<SpatialRegistryNodeId>("work");
  const selectedNode = nodeById[selectedNodeId];
  const selectedPosition = useMemo(() => selectedNode.position, [selectedNode]);

  return (
    <main className="spatial-study" aria-labelledby="spatial-study-title">
      <div className="spatial-study__sky" aria-hidden="true" />
      <header className="spatial-study__header">
        <div>
          <button className="spatial-study__home" type="button" onClick={() => navigate("/")}>
            <span aria-hidden="true">←</span> Living Nexus
          </button>
          <p className="spatial-study__eyebrow">Illustrative spatial study</p>
          <h1 id="spatial-study-title">State directs the next deliberate path.</h1>
        </div>
        <p className="spatial-study__disclaimer">{SPATIAL_REGISTRY_STUDY.disclaimer}</p>
      </header>

      <section className="spatial-study__layout" aria-label="Spatial Registry orientation study">
        <aside className="spatial-study__legend" aria-label="Study boundaries">
          <p className="spatial-study__eyebrow">Orientation only</p>
          <h2>One map. No claims.</h2>
          <p>The constellation demonstrates relationships, not a live creator graph. Choosing a node changes only the explanation below.</p>
          <dl>
            <div><dt>Reads</dt><dd>None</dd></div>
            <div><dt>Writes</dt><dd>None</dd></div>
            <div><dt>Player</dt><dd>Not connected</dd></div>
            <div><dt>AI context</dt><dd>Not connected</dd></div>
          </dl>
        </aside>

        <section className="spatial-study__constellation" aria-label="Illustrative relationship constellation">
          <svg className="spatial-study__threads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {SPATIAL_REGISTRY_STUDY.edges.map(([from, to]) => {
              const start = nodeById[from].position;
              const end = nodeById[to].position;
              return <line key={`${from}-${to}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />;
            })}
            <circle cx={selectedPosition.x} cy={selectedPosition.y} r="11" className="spatial-study__selection-halo" />
          </svg>
          <div className="spatial-study__orbit spatial-study__orbit--one" aria-hidden="true" />
          <div className="spatial-study__orbit spatial-study__orbit--two" aria-hidden="true" />

          {SPATIAL_REGISTRY_STUDY.nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              className={`spatial-study__node spatial-study__node--${node.id}${selectedNodeId === node.id ? " is-selected" : ""}`}
              style={{ left: `${node.position.x}%`, top: `${node.position.y}%` }}
              aria-pressed={selectedNodeId === node.id}
              onClick={() => setSelectedNodeId(node.id)}
            >
              <NodeGlyph id={node.id} />
              <span>{node.label}</span>
            </button>
          ))}
        </section>

        <section className="spatial-study__inspector" aria-live="polite" aria-atomic="true">
          <p className="spatial-study__eyebrow">{selectedNode.eyebrow}</p>
          <h2>{selectedNode.label}</h2>
          <p>{selectedNode.description}</p>
          <div className="spatial-study__inspector-rule" />
          <p className="spatial-study__quiet-note">This study changes orientation only. Its paths do not perform an action.</p>
        </section>
      </section>

      <nav className="spatial-study__pathway-list" aria-label="Study pathways">
        {SPATIAL_REGISTRY_STUDY.nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            className={selectedNodeId === node.id ? "is-selected" : ""}
            onClick={() => setSelectedNodeId(node.id)}
          >
            {node.label}
          </button>
        ))}
      </nav>

      <footer className="spatial-study__footer">
        <span>Living Nexus · visual orientation study</span>
        <span>Future live projection requires separate approval.</span>
      </footer>
    </main>
  );
}
