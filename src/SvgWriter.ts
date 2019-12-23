import * as fs from 'fs';
import * as path from 'path';
import {Faction} from './Entities';
import {Dimensions2D, Rectangle2D} from './Math2D';
import {BorderEdge, BorderEdgeLoop} from './VoronoiBorder';

export class SvgWriter {

    public static writeNeighborhoodSvg(name: string, dimensions: Dimensions2D, viewRect: Rectangle2D, borderLoops: Map<string,BorderEdgeLoop[]>, factions: Map<string,Faction>) {
        let template = fs.readFileSync(path.join(__dirname, '../templates', 'map-base.svg'), { encoding: 'utf8'});
        const filename = `${name}.svg`;

        // svg viewBox's y is top left, not bottom left
        // viewRect is in map space, viewBox is in svg space
        const viewBox = `${viewRect.anchor.x} ${-viewRect.anchor.y - viewRect.dimensions.height} ` +
                        `${viewRect.dimensions.width} ${viewRect.dimensions.height}`;

        template = template.replace('{WIDTH}', dimensions.width + '');
        template = template.replace('{HEIGHT}', dimensions.height + '');
        template = template.replace('{VIEWBOX}', viewBox);
        template = template.replace('{DEFS}', '');
        template = template.replace('{CSS}', '');
        template = template.replace('{ELEMENTS}', this.renderBorders(borderLoops, factions));

        fs.writeFileSync(path.join(__dirname, '../out', filename), template, { encoding: 'utf8'});
    }

    private static renderBorders(borderLoops: Map<string,BorderEdgeLoop[]>, factions: Map<string,Faction>): string {
        let ret = '';
        let edge: BorderEdge;
        let d: string;
        for(let [factionId, faction] of factions) {
            let loops = borderLoops.get(factionId);
            if(!loops || loops.length === 0) { continue; }
            d = '';
            for(let loop of loops) {
                for(let edgeIdx = 0; edgeIdx < loop.edges.length; edgeIdx++) {
                    edge = loop.edges[edgeIdx];
                    if(edgeIdx === 0) {
                        d += ` M${edge.node1.x.toFixed(2)},${(-edge.node1.y).toFixed(2)}`;
                    }
                    if(!edge.n1c2 || !edge.n2c1) {
                        d += ` L${edge.node2.x.toFixed(2)},${(-edge.node2.y).toFixed(2)}`;
                    } else {
                        d += ` C${edge.n1c2.x.toFixed(2)},${(-edge.n1c2.y).toFixed(2)}`;
                        d +=  ` ${edge.n2c1.x.toFixed(2)},${(-edge.n2c1.y).toFixed(2)}`;
                        d +=  ` ${edge.node2.x.toFixed(2)},${(-edge.node2.y).toFixed(2)}`;
                    }
                }
            }
            if(d.length === 0) {
                continue;
            }

            // create SVG markup
            ret += `<path fill-rule="evenodd" class="border ${factionId}" ` +
                `style="stroke: ${faction.color}; stroke-width: 1px; ` +
                `fill: ${faction.color}; fill-opacity: .25" d="${d}" />\n`;
        }
        return ret;
    }
}
