import { BorderEdge, BorderEdgeLoop, Faction } from '../../mapgen';

export function renderBorders(
  borderLoops: Record<string, BorderEdgeLoop[]>,
  factions: Record<string,Faction>
): string {
  let ret = '';
  let edge: BorderEdge;
  let d: string;
  Object.keys(factions).forEach((factionId) => {
    const faction = factions[factionId];
    const loops = borderLoops[factionId];
    if(!loops || loops.length === 0) {
      return;
    }
    d = '';
    loops.forEach((loop) => {
      loop.edges.forEach((edge, edgeIndex) => {
        if(edgeIndex === 0) {
          d += ` M${edge.node1.x.toFixed(2)},${(-edge.node1.y).toFixed(2)}`;
        }
        if(!edge.n1c2 || !edge.n2c1) {
          d += ` L${edge.node2.x.toFixed(2)},${(-edge.node2.y).toFixed(2)}`;
        } else {
          d += ` C${edge.n1c2.x.toFixed(2)},${(-edge.n1c2.y).toFixed(2)}`;
          d +=  ` ${edge.n2c1.x.toFixed(2)},${(-edge.n2c1.y).toFixed(2)}`;
          d +=  ` ${edge.node2.x.toFixed(2)},${(-edge.node2.y).toFixed(2)}`;
        }
      });
    });
    if(d.length === 0) {
      return;
    }

    // create SVG markup
    ret += `<path fill-rule="evenodd" class="border ${factionId}" ` +
      `style="stroke: ${faction.color}; stroke-width: 1px; ` +
      `fill: ${faction.color}; fill-opacity: .25" d="${d}" />\n`;
  });
  return ret;
}
