"use client";

// ── Connector line between pipeline phases ──────────────────────────────

interface PipelineConnectorProps {
  /**
   * Whether the source phase is complete and the target phase is reachable.
   * Controls the color and animation of the connector.
   */
  active: boolean;
  /** Whether the target phase is blocked. Grays out the connector. */
  blocked?: boolean;
}

export function PipelineConnector({
  active,
  blocked = false,
}: PipelineConnectorProps) {
  const baseClasses = "relative flex h-10 w-8 items-center sm:w-12";

  // Determine connector style
  let lineColor: string;
  let arrowColor: string;
  let lineStyle: React.CSSProperties = {};

  if (blocked) {
    lineColor = "bg-gray-4";
    arrowColor = "text-gray-4";
  } else if (active) {
    lineColor = "";
    arrowColor = "text-green-400";
    // Animated gradient via inline styles (no styled-jsx required)
    lineStyle = {
      background:
        "linear-gradient(90deg, rgb(74, 222, 128) 0%, rgb(34, 197, 94) 50%, rgb(74, 222, 128) 100%)",
      backgroundSize: "200% 100%",
      animation: "pipeline-flow 2s ease-in-out infinite",
    };
  } else {
    lineColor = "bg-gray-6";
    arrowColor = "text-gray-6";
  }

  return (
    <div className={baseClasses}>
      {/* Keyframe animation injected once */}
      {active && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes pipeline-flow {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `,
          }}
        />
      )}

      {/* Line */}
      <div
        className={`h-0.5 flex-1 ${lineColor}`}
        style={lineStyle}
      />
      {/* Arrow head */}
      <svg
        className={`h-3 w-3 shrink-0 ${arrowColor}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M5 3l14 9-14 9V3z" />
      </svg>
    </div>
  );
}
