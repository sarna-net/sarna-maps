import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils';
import { SnapPosition } from '../Constants';
import { BorderEdge, BorderEdgeLoop, Faction } from './types';
import { Dimensions2d, Rectangle2d } from '../math-2d';

export interface BasicDisplayOptions {
    dimensions: Dimensions2d;
    viewRect: Rectangle2d;
    displayBorders?: boolean;
    displayNebulae?: boolean;
    displayClusters?: boolean;
    factions?: {
        displayBorders?: boolean;
        displayFactionNames?: boolean;
        fillAreas?: boolean;
    };
    systems?: {
        displayAbandonedSystems?: boolean;
        displayApocryphalSystems?: boolean;
        displayNormalSystems?: boolean;
        displayNoRecordSystems?: boolean;
        highlightCapitalSystems?: boolean;
        displaySystemNames?: boolean;
    };
}

export interface MinimapDisplayOptions extends BasicDisplayOptions {
    display?: boolean;
    position: SnapPosition;
}

export interface ScaleDisplayOptions {
    display?: boolean;
    position: SnapPosition;
    width: number;
    stepSize: number;
}

export interface LogoDisplayOptions {
    display?: boolean;
    position: SnapPosition;
    customLogoMarkup: string;
}

export interface ImageOutputOptions extends BasicDisplayOptions {
    name: string;
    path?: string;
    customStyles?: string;
    systemNamesDropShadow?: boolean;
    factionNamesDropShadow?: boolean;
    scale?: ScaleDisplayOptions;
    minimap?: MinimapDisplayOptions;
}

export class SvgWriter {

    public static writeSvgMap(
        factions: Map<string, Faction>,
        borderLoops: Map<string, BorderEdgeLoop[]>,
        options: ImageOutputOptions) {

        // svg viewBox's y is top left, not bottom left
        // viewRect is in map space, viewBox is in svg space
        const viewBox = `${options.viewRect.anchor.x} ` +
                        `${-options.viewRect.anchor.y - options.viewRect.dimensions.height} ` +
                        `${options.viewRect.dimensions.width} ` +
                        `${options.viewRect.dimensions.height}`;

        const content = fs.readFileSync(path.join(__dirname, '../templates', 'map-base.svg'), { encoding: 'utf8' })
            .replace('{WIDTH}', options.dimensions.width.toString(10))
            .replace('{HEIGHT}', options.dimensions.height.toString(10))
            .replace('{VIEWBOX}', viewBox)
            .replace('{DEFS}', '')
            .replace('{CSS}', '')
            .replace('{ELEMENTS}', this.renderBorders(borderLoops, factions));

        const outPath = path.join(
            options.path ? options.path : path.join(__dirname, '../out'),
            `${options.name}.svg`);
        Logger.info(`Now attempting to write file "${outPath}"`);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, content, { encoding: 'utf8' });
        Logger.info(`Wrote file "${outPath}".`);
    }



    public static writeNeighborhoodSvg(name: string, dimensions: Dimensions2d, viewRect: Rectangle2d, borderLoops: Map<string,BorderEdgeLoop[]>, factions: Map<string,Faction>) {
        let template = fs.readFileSync(path.join(__dirname, '../templates', 'map-base.svg'), { encoding: 'utf8' });
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

        fs.writeFileSync(path.join(__dirname, '../out', filename), template, { encoding: 'utf8' });
    }

    private static renderBorders(borderLoops: Map<string, BorderEdgeLoop[]>, factions: Map<string,Faction>): string {
        let ret = '';
        let edge: BorderEdge;
        let d: string;
        for(const [ factionId, faction ] of factions) {
            const loops = borderLoops.get(factionId);
            if(!loops || loops.length === 0) { continue }
            d = '';
            for(const loop of loops) {
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
