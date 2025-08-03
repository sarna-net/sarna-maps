<?xml version="1.0" encoding="UTF-8" standalone="no"?>

<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
	 version="1.1"
	 width="{{WIDTH}}px"
     height="{{HEIGHT}}px">

  <defs>
    <pattern id="border-fill-D" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(-45)">
      <line x1="0" y1="0" x2="0" y2="4" style="stroke:rgb(200, 100, 100); stroke-width: 4.5px" />
    </pattern>
{{DEFS}}
  </defs>

  <style>
    text { fill: #000; font-family: Tahoma, Arial, sans-serif; font-size: 2.5px; text-rendering: optimizeLegibility; }
    g.border-labels text { alignment-baseline: middle; font-size: 2px; font-style: italic; font-weight: bold; text-rendering: geometricPrecision; }
    path.label-connector { fill: none; stroke: #000; stroke-width: 0.25; }
    path { stroke-linejoin: round; stroke-linecap: round; }
    path.logo { fill: #000; fill-rule: evenodd; stroke: none; }

    /*g.system-labels text { font-size: 2.5px; text-shadow: #fff 0 0 0.5px, #fff 0 0 0.5px; }*/
    g.system-labels text { font-size: 2.5px; text-shadow: #fff 0 0 5px, #fff 0 0 5px; }
    g.system-labels text.abandoned { fill: #555; font-style: italic; }
    g.system-labels text.undiscovered { fill: #555; font-style: italic; }
    g.system-labels text tspan.sup { font-size: 1.5px; }
    g.system-labels .additions { fill: #666; font-size: 1.5px; }
    g.system-labels .additions tspan.apocryphal { fill: #c00; }
    g.system-labels .apocryphal tspan.sup { fill: #c00 }
    g.system-labels path.connector { stroke: black; stroke-width: 0.2; fill: none; }
    g.borders .faction-border-D path { stroke: none; stroke-width: 0; fill: url(#disputed-border-fill); }
{{CSS}}
  </style>

{{ELEMENTS}}
</svg>
