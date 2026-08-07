import React, { useEffect, useRef } from "react";

export type PipelineStage =
  | "idle"
  | "reading"
  | "hashing"
  | "exif"
  | "music"
  | "ai_detect"
  | "provenance"
  | "wid"
  | "complete"
  | "error";

interface StageNode {
  id: PipelineStage;
  label: string;
  sublabel: string;
  x: number;
  y: number;
}

const STAGES: StageNode[] = [
  { id: "reading",   label: "File Read",       sublabel: "ArrayBuffer → Memory",      x: 80,  y: 160 },
  { id: "hashing",   label: "Hash",            sublabel: "SHA-256 · MD5",             x: 240, y: 160 },
  { id: "exif",      label: "EXIF / XMP",      sublabel: "IPTC · GPS · Camera Chain", x: 400, y: 80  },
  { id: "music",     label: "Music Tags",      sublabel: "ID3 · ISRC · BPM · Key",    x: 400, y: 160 },
  { id: "ai_detect", label: "AI Detection",    sublabel: "12 Platforms · Prompt",     x: 400, y: 240 },
  { id: "provenance",label: "Provenance Map",  sublabel: "Chain Assembly",            x: 580, y: 160 },
  { id: "wid",       label: "WID Issuance",    sublabel: "ECDSA · Registry",          x: 740, y: 160 },
];

const EDGES: [PipelineStage, PipelineStage][] = [
  ["reading",    "hashing"],
  ["hashing",    "exif"],
  ["hashing",    "music"],
  ["hashing",    "ai_detect"],
  ["exif",       "provenance"],
  ["music",      "provenance"],
  ["ai_detect",  "provenance"],
  ["provenance", "wid"],
];

const STAGE_ORDER: PipelineStage[] = [
  "idle", "reading", "hashing", "exif", "music", "ai_detect", "provenance", "wid", "complete",
];

function stageIndex(s: PipelineStage) { return STAGE_ORDER.indexOf(s); }

function isActive(node: PipelineStage, current: PipelineStage) {
  return node === current;
}
function isComplete(node: PipelineStage, current: PipelineStage) {
  return stageIndex(node) < stageIndex(current) && stageIndex(current) > 0;
}

interface Props {
  activeStage: PipelineStage;
  fileName?: string;
  compact?: boolean;
}

export default function IngestionArchitectureDiagram({ activeStage, fileName, compact = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const W = compact ? 680 : 840;
  const H = compact ? 260 : 320;
  const scaleX = compact ? 0.8 : 1;
  const scaleY = compact ? 0.8 : 1;

  function nodeColor(id: PipelineStage) {
    if (activeStage === "error" && id === activeStage) return "#EF4444";
    if (isActive(id, activeStage)) return "#D4AF37";
    if (isComplete(id, activeStage)) return "#4B5563";
    return "#1F2937";
  }
  function nodeBorder(id: PipelineStage) {
    if (activeStage === "error" && id === activeStage) return "#EF4444";
    if (isActive(id, activeStage)) return "#D4AF37";
    if (isComplete(id, activeStage)) return "#6B7280";
    return "#374151";
  }
  function nodeTextColor(id: PipelineStage) {
    if (isActive(id, activeStage)) return "#000000";
    if (isComplete(id, activeStage)) return "#9CA3AF";
    return "#6B7280";
  }
  function edgeColor(from: PipelineStage, to: PipelineStage) {
    if (isComplete(from, activeStage) && isComplete(to, activeStage)) return "#4B5563";
    if (isComplete(from, activeStage) && isActive(to, activeStage)) return "#D4AF37";
    return "#1F2937";
  }

  function nodeX(n: StageNode) { return n.x * scaleX; }
  function nodeY(n: StageNode) { return n.y * scaleY + (compact ? 10 : 40); }

  function getNode(id: PipelineStage) { return STAGES.find(s => s.id === id)!; }

  return (
    <div className="w-full rounded-xl border border-[#1F2937] bg-[#0A0A0A] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1F2937]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
          <span className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-widest">
            Ingestion Pipeline
          </span>
        </div>
        {fileName && (
          <span className="text-[10px] font-mono text-[#6B7280] truncate max-w-[200px]">{fileName}</span>
        )}
        <span className="text-[10px] font-mono text-[#4B5563] uppercase tracking-widest">
          {activeStage === "idle" ? "Waiting" :
           activeStage === "complete" ? "✓ Complete" :
           activeStage === "error" ? "✗ Error" :
           "Processing…"}
        </span>
      </div>

      {/* SVG Diagram */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: compact ? 200 : 260 }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#374151" />
          </marker>
          <marker id="arrowhead-gold" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#D4AF37" />
          </marker>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {EDGES.map(([fromId, toId]) => {
          const from = getNode(fromId);
          const to = getNode(toId);
          if (!from || !to) return null;
          const fx = nodeX(from) + 52;
          const fy = nodeY(from) + 18;
          const tx = nodeX(to) - 4;
          const ty = nodeY(to) + 18;
          const color = edgeColor(fromId, toId);
          const isGold = isComplete(fromId, activeStage) && isActive(toId, activeStage);
          return (
            <line
              key={`${fromId}-${toId}`}
              x1={fx} y1={fy} x2={tx} y2={ty}
              stroke={color}
              strokeWidth={isGold ? 1.5 : 1}
              markerEnd={isGold ? "url(#arrowhead-gold)" : "url(#arrowhead)"}
              style={{ transition: "stroke 0.3s ease" }}
            />
          );
        })}

        {/* Nodes */}
        {STAGES.map(node => {
          const active = isActive(node.id, activeStage);
          const complete = isComplete(node.id, activeStage);
          const nx = nodeX(node);
          const ny = nodeY(node);
          return (
            <g key={node.id} transform={`translate(${nx}, ${ny})`}>
              <rect
                x={0} y={0} width={104} height={36}
                rx={6}
                fill={nodeColor(node.id)}
                stroke={nodeBorder(node.id)}
                strokeWidth={active ? 1.5 : 1}
                filter={active ? "url(#glow)" : undefined}
                style={{ transition: "all 0.3s ease" }}
              />
              <text
                x={52} y={13}
                textAnchor="middle"
                fontSize={active ? 9 : 8}
                fontWeight={active ? "700" : "500"}
                fontFamily="monospace"
                fill={nodeTextColor(node.id)}
                style={{ transition: "all 0.3s ease" }}
              >
                {node.label}
              </text>
              <text
                x={52} y={27}
                textAnchor="middle"
                fontSize={7}
                fontFamily="monospace"
                fill={active ? "#000000" : "#374151"}
                style={{ transition: "all 0.3s ease" }}
              >
                {node.sublabel}
              </text>
              {complete && (
                <text x={96} y={10} fontSize={8} fill="#6B7280">✓</text>
              )}
            </g>
          );
        })}

        {/* File entry label */}
        <text x={20} y={nodeY(STAGES[0]) + 18} textAnchor="middle" fontSize={8} fontFamily="monospace" fill="#374151">
          FILE
        </text>
        <line
          x1={28} y1={nodeY(STAGES[0]) + 18}
          x2={nodeX(STAGES[0]) - 2} y2={nodeY(STAGES[0]) + 18}
          stroke={stageIndex(activeStage) > 0 ? "#4B5563" : "#1F2937"}
          strokeWidth={1}
          markerEnd="url(#arrowhead)"
        />
      </svg>

      {/* Stage legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-[#1F2937]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-[#D4AF37]" />
          <span className="text-[9px] font-mono text-[#6B7280]">Active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-[#4B5563]" />
          <span className="text-[9px] font-mono text-[#6B7280]">Complete</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-[#1F2937] border border-[#374151]" />
          <span className="text-[9px] font-mono text-[#6B7280]">Pending</span>
        </div>
        {activeStage === "complete" && (
          <div className="ml-auto text-[9px] font-mono text-[#D4AF37]">
            ✓ Provenance Object assembled
          </div>
        )}
      </div>
    </div>
  );
}
