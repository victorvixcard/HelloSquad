// Gerado por packages/ui/scripts/extract-ds.ts a partir de ds/hellosquad/components/bundle.js (objeto D) e squad/*/agent.yaml.
// Não edite à mão: rode pnpm --filter @hellosquad/ui extract:ds.

/** Desenho oficial de cada forma: viewBox -170 -170 340 340, olhos em três cortes ópticos. */
export const AGENT_SHAPES = {
  "coord": {
    "color": "#FF4D1F",
    "shade": "#E83A0E",
    "body": "<circle cx=\"0\" cy=\"0\" r=\"150\" style=\"fill: #FF4D1F\"></circle>",
    "ring": "<circle cx=\"0\" cy=\"0\" r=\"150\" style=\"fill: #FFFFFF; stroke: #FFFFFF; stroke-width: 44; stroke-linejoin: round\"></circle>",
    "inner": "",
    "eyes": {
      "oval": {
        "o135": "<ellipse cx=\"-30\" cy=\"-28\" rx=\"25.65\" ry=\"31.05\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"30\" cy=\"-28\" rx=\"25.65\" ry=\"31.05\" style=\"fill: #0F0D22\"></ellipse>",
        "o118": "<ellipse cx=\"-30\" cy=\"-28\" rx=\"22.42\" ry=\"27.14\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"30\" cy=\"-28\" rx=\"22.42\" ry=\"27.14\" style=\"fill: #0F0D22\"></ellipse>",
        "o1": "<ellipse cx=\"-30\" cy=\"-28\" rx=\"19\" ry=\"23\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"30\" cy=\"-28\" rx=\"19\" ry=\"23\" style=\"fill: #0F0D22\"></ellipse>"
      },
      "big": {
        "o135": "<ellipse cx=\"-27.3\" cy=\"-23.95\" rx=\"20.26\" ry=\"24.53\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"32.7\" cy=\"-30.7\" rx=\"29.75\" ry=\"36.02\" style=\"fill: #0F0D22\"></ellipse>",
        "o118": "<ellipse cx=\"-27.64\" cy=\"-24.46\" rx=\"17.71\" ry=\"21.44\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"32.36\" cy=\"-30.36\" rx=\"26.01\" ry=\"31.48\" style=\"fill: #0F0D22\"></ellipse>",
        "o1": "<ellipse cx=\"-28\" cy=\"-25\" rx=\"15.01\" ry=\"18.17\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"32\" cy=\"-30\" rx=\"22.04\" ry=\"26.68\" style=\"fill: #0F0D22\"></ellipse>"
      },
      "happy": {
        "o135": "<path d=\"M-54.3,-19.9 C-48.9,-48.25 -11.1,-48.25 -5.7,-19.9\" style=\"fill: none; stroke: #0F0D22; stroke-width: 13.5; stroke-linecap: round\"></path><path d=\"M5.7,-19.9 C11.1,-48.25 48.9,-48.25 54.3,-19.9\" style=\"fill: none; stroke: #0F0D22; stroke-width: 13.5; stroke-linecap: round\"></path>",
        "o118": "<path d=\"M-51.24,-20.92 C-46.52,-45.7 -13.48,-45.7 -8.76,-20.92\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.8; stroke-linecap: round\"></path><path d=\"M8.76,-20.92 C13.48,-45.7 46.52,-45.7 51.24,-20.92\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.8; stroke-linecap: round\"></path>",
        "o1": "<path d=\"M-48,-22 C-44,-43 -16,-43 -12,-22\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10; stroke-linecap: round\"></path><path d=\"M12,-22 C16,-43 44,-43 48,-22\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10; stroke-linecap: round\"></path>"
      },
      "wink": {
        "o135": "<ellipse cx=\"-30\" cy=\"-28\" rx=\"25.65\" ry=\"31.05\" style=\"fill: #0F0D22\"></ellipse><path d=\"M5.7,-19.9 C11.1,-48.25 48.9,-48.25 54.3,-19.9\" style=\"fill: none; stroke: #0F0D22; stroke-width: 13.5; stroke-linecap: round\"></path>",
        "o118": "<ellipse cx=\"-30\" cy=\"-28\" rx=\"22.42\" ry=\"27.14\" style=\"fill: #0F0D22\"></ellipse><path d=\"M8.76,-20.92 C13.48,-45.7 46.52,-45.7 51.24,-20.92\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.8; stroke-linecap: round\"></path>",
        "o1": "<ellipse cx=\"-30\" cy=\"-28\" rx=\"19\" ry=\"23\" style=\"fill: #0F0D22\"></ellipse><path d=\"M12,-22 C16,-43 44,-43 48,-22\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10; stroke-linecap: round\"></path>"
      },
      "serio": {
        "o135": "<path d=\"M-54.47,-37.31 L-5.53,-37.31 A25.65,31.05 0 1 1 -54.47,-37.31 Z\" style=\"fill: #0F0D22\"></path><path d=\"M5.53,-37.31 L54.47,-37.31 A25.65,31.05 0 1 1 5.53,-37.31 Z\" style=\"fill: #0F0D22\"></path>",
        "o118": "<path d=\"M-51.39,-36.14 L-8.61,-36.14 A22.42,27.14 0 1 1 -51.39,-36.14 Z\" style=\"fill: #0F0D22\"></path><path d=\"M8.61,-36.14 L51.39,-36.14 A22.42,27.14 0 1 1 8.61,-36.14 Z\" style=\"fill: #0F0D22\"></path>",
        "o1": "<path d=\"M-48.12,-34.9 L-11.88,-34.9 A19,23 0 1 1 -48.12,-34.9 Z\" style=\"fill: #0F0D22\"></path><path d=\"M11.88,-34.9 L48.12,-34.9 A19,23 0 1 1 11.88,-34.9 Z\" style=\"fill: #0F0D22\"></path>"
      },
      "sleep": {
        "o135": "<path d=\"M-52.95,-32.05 C-46.2,-11.8 -13.8,-11.8 -7.05,-32.05\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.83; stroke-linecap: round\"></path><path d=\"M7.05,-32.05 C13.8,-11.8 46.2,-11.8 52.95,-32.05\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.83; stroke-linecap: round\"></path>",
        "o118": "<path d=\"M-50.06,-31.54 C-44.16,-13.84 -15.84,-13.84 -9.94,-31.54\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.21; stroke-linecap: round\"></path><path d=\"M9.94,-31.54 C15.84,-13.84 44.16,-13.84 50.06,-31.54\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.21; stroke-linecap: round\"></path>",
        "o1": "<path d=\"M-47,-31 C-42,-16 -18,-16 -13,-31\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.5; stroke-linecap: round\"></path><path d=\"M13,-31 C18,-16 42,-16 47,-31\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.5; stroke-linecap: round\"></path>"
      }
    }
  },
  "arch": {
    "color": "#8A3BFF",
    "shade": "#7A2EF0",
    "body": "<path d=\"M-110,-60 A110,110 0 0 1 110,-60 L110,132 A28,28 0 0 1 82,160 L-82,160 A28,28 0 0 1 -110,132 Z\" style=\"fill: #8A3BFF\"></path>",
    "ring": "<path d=\"M-110,-60 A110,110 0 0 1 110,-60 L110,132 A28,28 0 0 1 82,160 L-82,160 A28,28 0 0 1 -110,132 Z\" style=\"fill: #FFFFFF; stroke: #FFFFFF; stroke-width: 44; stroke-linejoin: round\"></path>",
    "inner": "",
    "eyes": {
      "oval": {
        "o135": "<ellipse cx=\"-22\" cy=\"-72\" rx=\"24.3\" ry=\"29.7\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"34\" cy=\"-72\" rx=\"24.3\" ry=\"29.7\" style=\"fill: #0F0D22\"></ellipse>",
        "o118": "<ellipse cx=\"-22\" cy=\"-72\" rx=\"21.24\" ry=\"25.96\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"34\" cy=\"-72\" rx=\"21.24\" ry=\"25.96\" style=\"fill: #0F0D22\"></ellipse>",
        "o1": "<ellipse cx=\"-22\" cy=\"-72\" rx=\"18\" ry=\"22\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"34\" cy=\"-72\" rx=\"18\" ry=\"22\" style=\"fill: #0F0D22\"></ellipse>"
      },
      "big": {
        "o135": "<ellipse cx=\"-19.44\" cy=\"-68.16\" rx=\"19.2\" ry=\"23.46\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"36.56\" cy=\"-74.56\" rx=\"28.19\" ry=\"34.45\" style=\"fill: #0F0D22\"></ellipse>",
        "o118": "<ellipse cx=\"-19.76\" cy=\"-68.65\" rx=\"16.78\" ry=\"20.51\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"36.24\" cy=\"-74.24\" rx=\"24.64\" ry=\"30.11\" style=\"fill: #0F0D22\"></ellipse>",
        "o1": "<ellipse cx=\"-20.11\" cy=\"-69.16\" rx=\"14.22\" ry=\"17.38\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"35.89\" cy=\"-73.89\" rx=\"20.88\" ry=\"25.52\" style=\"fill: #0F0D22\"></ellipse>"
      },
      "happy": {
        "o135": "<path d=\"M-45.02,-64.33 C-39.91,-91.18 -4.09,-91.18 1.02,-64.33\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.79; stroke-linecap: round\"></path><path d=\"M10.98,-64.33 C16.09,-91.18 51.91,-91.18 57.02,-64.33\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.79; stroke-linecap: round\"></path>",
        "o118": "<path d=\"M-42.12,-65.29 C-37.65,-88.77 -6.35,-88.77 -1.88,-65.29\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.18; stroke-linecap: round\"></path><path d=\"M13.88,-65.29 C18.35,-88.77 49.65,-88.77 54.12,-65.29\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.18; stroke-linecap: round\"></path>",
        "o1": "<path d=\"M-39.05,-66.32 C-35.26,-86.21 -8.74,-86.21 -4.95,-66.32\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.47; stroke-linecap: round\"></path><path d=\"M16.95,-66.32 C20.74,-86.21 47.26,-86.21 51.05,-66.32\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.47; stroke-linecap: round\"></path>"
      },
      "wink": {
        "o135": "<ellipse cx=\"-22\" cy=\"-72\" rx=\"24.3\" ry=\"29.7\" style=\"fill: #0F0D22\"></ellipse><path d=\"M10.98,-64.33 C16.09,-91.18 51.91,-91.18 57.02,-64.33\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.79; stroke-linecap: round\"></path>",
        "o118": "<ellipse cx=\"-22\" cy=\"-72\" rx=\"21.24\" ry=\"25.96\" style=\"fill: #0F0D22\"></ellipse><path d=\"M13.88,-65.29 C18.35,-88.77 49.65,-88.77 54.12,-65.29\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.18; stroke-linecap: round\"></path>",
        "o1": "<ellipse cx=\"-22\" cy=\"-72\" rx=\"18\" ry=\"22\" style=\"fill: #0F0D22\"></ellipse><path d=\"M16.95,-66.32 C20.74,-86.21 47.26,-86.21 51.05,-66.32\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.47; stroke-linecap: round\"></path>"
      },
      "serio": {
        "o135": "<path d=\"M-45.18,-80.91 L1.18,-80.91 A24.3,29.7 0 1 1 -45.18,-80.91 Z\" style=\"fill: #0F0D22\"></path><path d=\"M10.82,-80.91 L57.18,-80.91 A24.3,29.7 0 1 1 10.82,-80.91 Z\" style=\"fill: #0F0D22\"></path>",
        "o118": "<path d=\"M-42.26,-79.79 L-1.74,-79.79 A21.24,25.96 0 1 1 -42.26,-79.79 Z\" style=\"fill: #0F0D22\"></path><path d=\"M13.74,-79.79 L54.26,-79.79 A21.24,25.96 0 1 1 13.74,-79.79 Z\" style=\"fill: #0F0D22\"></path>",
        "o1": "<path d=\"M-39.17,-78.6 L-4.83,-78.6 A18,22 0 1 1 -39.17,-78.6 Z\" style=\"fill: #0F0D22\"></path><path d=\"M16.83,-78.6 L51.17,-78.6 A18,22 0 1 1 16.83,-78.6 Z\" style=\"fill: #0F0D22\"></path>"
      },
      "sleep": {
        "o135": "<path d=\"M-43.74,-75.84 C-37.35,-56.65 -6.65,-56.65 -0.26,-75.84\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.15; stroke-linecap: round\"></path><path d=\"M12.26,-75.84 C18.65,-56.65 49.35,-56.65 55.74,-75.84\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.15; stroke-linecap: round\"></path>",
        "o118": "<path d=\"M-41,-75.35 C-35.41,-58.59 -8.59,-58.59 -3,-75.35\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10.62; stroke-linecap: round\"></path><path d=\"M15,-75.35 C20.59,-58.59 47.41,-58.59 53,-75.35\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10.62; stroke-linecap: round\"></path>",
        "o1": "<path d=\"M-38.11,-74.84 C-33.37,-60.63 -10.63,-60.63 -5.89,-74.84\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9; stroke-linecap: round\"></path><path d=\"M17.89,-74.84 C22.63,-60.63 45.37,-60.63 50.11,-74.84\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9; stroke-linecap: round\"></path>"
      }
    }
  },
  "leaf": {
    "color": "#FF2E9A",
    "shade": "#EC1F89",
    "body": "<path d=\"M-110,-150 L0,-150 A150,150 0 0 1 150,0 L150,110 A40,40 0 0 1 110,150 L0,150 A150,150 0 0 1 -150,0 L-150,-110 A40,40 0 0 1 -110,-150 Z\" style=\"fill: #FF2E9A\"></path>",
    "ring": "<path d=\"M-110,-150 L0,-150 A150,150 0 0 1 150,0 L150,110 A40,40 0 0 1 110,150 L0,150 A150,150 0 0 1 -150,0 L-150,-110 A40,40 0 0 1 -110,-150 Z\" style=\"fill: #FFFFFF; stroke: #FFFFFF; stroke-width: 44; stroke-linejoin: round\"></path>",
    "inner": "",
    "eyes": {
      "oval": {
        "o135": "<ellipse cx=\"-27\" cy=\"-24\" rx=\"24.3\" ry=\"29.7\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"31\" cy=\"-24\" rx=\"24.3\" ry=\"29.7\" style=\"fill: #0F0D22\"></ellipse>",
        "o118": "<ellipse cx=\"-27\" cy=\"-24\" rx=\"21.24\" ry=\"25.96\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"31\" cy=\"-24\" rx=\"21.24\" ry=\"25.96\" style=\"fill: #0F0D22\"></ellipse>",
        "o1": "<ellipse cx=\"-27\" cy=\"-24\" rx=\"18\" ry=\"22\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"31\" cy=\"-24\" rx=\"18\" ry=\"22\" style=\"fill: #0F0D22\"></ellipse>"
      },
      "big": {
        "o135": "<ellipse cx=\"-24.44\" cy=\"-20.16\" rx=\"19.2\" ry=\"23.46\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"33.56\" cy=\"-26.56\" rx=\"28.19\" ry=\"34.45\" style=\"fill: #0F0D22\"></ellipse>",
        "o118": "<ellipse cx=\"-24.76\" cy=\"-20.65\" rx=\"16.78\" ry=\"20.51\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"33.24\" cy=\"-26.24\" rx=\"24.64\" ry=\"30.11\" style=\"fill: #0F0D22\"></ellipse>",
        "o1": "<ellipse cx=\"-25.11\" cy=\"-21.16\" rx=\"14.22\" ry=\"17.38\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"32.89\" cy=\"-25.89\" rx=\"20.88\" ry=\"25.52\" style=\"fill: #0F0D22\"></ellipse>"
      },
      "happy": {
        "o135": "<path d=\"M-50.02,-16.33 C-44.91,-43.18 -9.09,-43.18 -3.98,-16.33\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.79; stroke-linecap: round\"></path><path d=\"M7.98,-16.33 C13.09,-43.18 48.91,-43.18 54.02,-16.33\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.79; stroke-linecap: round\"></path>",
        "o118": "<path d=\"M-47.12,-17.29 C-42.65,-40.77 -11.35,-40.77 -6.88,-17.29\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.18; stroke-linecap: round\"></path><path d=\"M10.88,-17.29 C15.35,-40.77 46.65,-40.77 51.12,-17.29\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.18; stroke-linecap: round\"></path>",
        "o1": "<path d=\"M-44.05,-18.32 C-40.26,-38.21 -13.74,-38.21 -9.95,-18.32\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.47; stroke-linecap: round\"></path><path d=\"M13.95,-18.32 C17.74,-38.21 44.26,-38.21 48.05,-18.32\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.47; stroke-linecap: round\"></path>"
      },
      "wink": {
        "o135": "<ellipse cx=\"-27\" cy=\"-24\" rx=\"24.3\" ry=\"29.7\" style=\"fill: #0F0D22\"></ellipse><path d=\"M7.98,-16.33 C13.09,-43.18 48.91,-43.18 54.02,-16.33\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.79; stroke-linecap: round\"></path>",
        "o118": "<ellipse cx=\"-27\" cy=\"-24\" rx=\"21.24\" ry=\"25.96\" style=\"fill: #0F0D22\"></ellipse><path d=\"M10.88,-17.29 C15.35,-40.77 46.65,-40.77 51.12,-17.29\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.18; stroke-linecap: round\"></path>",
        "o1": "<ellipse cx=\"-27\" cy=\"-24\" rx=\"18\" ry=\"22\" style=\"fill: #0F0D22\"></ellipse><path d=\"M13.95,-18.32 C17.74,-38.21 44.26,-38.21 48.05,-18.32\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.47; stroke-linecap: round\"></path>"
      },
      "serio": {
        "o135": "<path d=\"M-50.18,-32.91 L-3.82,-32.91 A24.3,29.7 0 1 1 -50.18,-32.91 Z\" style=\"fill: #0F0D22\"></path><path d=\"M7.82,-32.91 L54.18,-32.91 A24.3,29.7 0 1 1 7.82,-32.91 Z\" style=\"fill: #0F0D22\"></path>",
        "o118": "<path d=\"M-47.26,-31.79 L-6.74,-31.79 A21.24,25.96 0 1 1 -47.26,-31.79 Z\" style=\"fill: #0F0D22\"></path><path d=\"M10.74,-31.79 L51.26,-31.79 A21.24,25.96 0 1 1 10.74,-31.79 Z\" style=\"fill: #0F0D22\"></path>",
        "o1": "<path d=\"M-44.17,-30.6 L-9.83,-30.6 A18,22 0 1 1 -44.17,-30.6 Z\" style=\"fill: #0F0D22\"></path><path d=\"M13.83,-30.6 L48.17,-30.6 A18,22 0 1 1 13.83,-30.6 Z\" style=\"fill: #0F0D22\"></path>"
      },
      "sleep": {
        "o135": "<path d=\"M-48.74,-27.84 C-42.35,-8.65 -11.65,-8.65 -5.26,-27.84\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.15; stroke-linecap: round\"></path><path d=\"M9.26,-27.84 C15.65,-8.65 46.35,-8.65 52.74,-27.84\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.15; stroke-linecap: round\"></path>",
        "o118": "<path d=\"M-46,-27.35 C-40.41,-10.59 -13.59,-10.59 -8,-27.35\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10.62; stroke-linecap: round\"></path><path d=\"M12,-27.35 C17.59,-10.59 44.41,-10.59 50,-27.35\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10.62; stroke-linecap: round\"></path>",
        "o1": "<path d=\"M-43.11,-26.84 C-38.37,-12.63 -15.63,-12.63 -10.89,-26.84\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9; stroke-linecap: round\"></path><path d=\"M14.89,-26.84 C19.63,-12.63 42.37,-12.63 47.11,-26.84\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9; stroke-linecap: round\"></path>"
      }
    }
  },
  "pill": {
    "color": "#FFE11A",
    "shade": "#EED00C",
    "body": "<path d=\"M-85,-130 L25,-130 A65,65 0 0 1 72.2,-20.3 A12,12 0 0 0 80.9,0 L85,0 A65,65 0 0 1 85,130 L-25,130 A65,65 0 0 1 -72.2,20.3 A12,12 0 0 0 -80.9,0 L-85,0 A65,65 0 0 1 -85,-130 Z\" style=\"fill: #FFE11A\"></path>",
    "ring": "<path d=\"M-85,-130 L25,-130 A65,65 0 0 1 72.2,-20.3 A12,12 0 0 0 80.9,0 L85,0 A65,65 0 0 1 85,130 L-25,130 A65,65 0 0 1 -72.2,20.3 A12,12 0 0 0 -80.9,0 L-85,0 A65,65 0 0 1 -85,-130 Z\" style=\"fill: #FFFFFF; stroke: #FFFFFF; stroke-width: 44; stroke-linejoin: round\"></path>",
    "inner": "",
    "eyes": {
      "oval": {
        "o135": "<ellipse cx=\"-52\" cy=\"-65\" rx=\"22.95\" ry=\"28.35\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"2\" cy=\"-65\" rx=\"22.95\" ry=\"28.35\" style=\"fill: #0F0D22\"></ellipse>",
        "o118": "<ellipse cx=\"-52\" cy=\"-65\" rx=\"20.06\" ry=\"24.78\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"2\" cy=\"-65\" rx=\"20.06\" ry=\"24.78\" style=\"fill: #0F0D22\"></ellipse>",
        "o1": "<ellipse cx=\"-52\" cy=\"-65\" rx=\"17\" ry=\"21\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"2\" cy=\"-65\" rx=\"17\" ry=\"21\" style=\"fill: #0F0D22\"></ellipse>"
      },
      "big": {
        "o135": "<ellipse cx=\"-49.58\" cy=\"-61.38\" rx=\"18.13\" ry=\"22.4\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"4.42\" cy=\"-67.42\" rx=\"26.62\" ry=\"32.89\" style=\"fill: #0F0D22\"></ellipse>",
        "o118": "<ellipse cx=\"-49.89\" cy=\"-61.83\" rx=\"15.85\" ry=\"19.58\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"4.11\" cy=\"-67.11\" rx=\"23.27\" ry=\"28.74\" style=\"fill: #0F0D22\"></ellipse>",
        "o1": "<ellipse cx=\"-50.21\" cy=\"-62.32\" rx=\"13.43\" ry=\"16.59\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"3.79\" cy=\"-66.79\" rx=\"19.72\" ry=\"24.36\" style=\"fill: #0F0D22\"></ellipse>"
      },
      "happy": {
        "o135": "<path d=\"M-73.74,-57.75 C-68.91,-83.12 -35.09,-83.12 -30.26,-57.75\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.08; stroke-linecap: round\"></path><path d=\"M-19.74,-57.75 C-14.91,-83.12 18.91,-83.12 23.74,-57.75\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.08; stroke-linecap: round\"></path>",
        "o118": "<path d=\"M-71,-58.67 C-66.78,-80.84 -37.22,-80.84 -33,-58.67\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10.56; stroke-linecap: round\"></path><path d=\"M-17,-58.67 C-12.78,-80.84 16.78,-80.84 21,-58.67\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10.56; stroke-linecap: round\"></path>",
        "o1": "<path d=\"M-68.11,-59.63 C-64.53,-78.42 -39.47,-78.42 -35.89,-59.63\" style=\"fill: none; stroke: #0F0D22; stroke-width: 8.95; stroke-linecap: round\"></path><path d=\"M-14.11,-59.63 C-10.53,-78.42 14.53,-78.42 18.11,-59.63\" style=\"fill: none; stroke: #0F0D22; stroke-width: 8.95; stroke-linecap: round\"></path>"
      },
      "wink": {
        "o135": "<ellipse cx=\"-52\" cy=\"-65\" rx=\"22.95\" ry=\"28.35\" style=\"fill: #0F0D22\"></ellipse><path d=\"M-19.74,-57.75 C-14.91,-83.12 18.91,-83.12 23.74,-57.75\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.08; stroke-linecap: round\"></path>",
        "o118": "<ellipse cx=\"-52\" cy=\"-65\" rx=\"20.06\" ry=\"24.78\" style=\"fill: #0F0D22\"></ellipse><path d=\"M-17,-58.67 C-12.78,-80.84 16.78,-80.84 21,-58.67\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10.56; stroke-linecap: round\"></path>",
        "o1": "<ellipse cx=\"-52\" cy=\"-65\" rx=\"17\" ry=\"21\" style=\"fill: #0F0D22\"></ellipse><path d=\"M-14.11,-59.63 C-10.53,-78.42 14.53,-78.42 18.11,-59.63\" style=\"fill: none; stroke: #0F0D22; stroke-width: 8.95; stroke-linecap: round\"></path>"
      },
      "serio": {
        "o135": "<path d=\"M-73.89,-73.5 L-30.11,-73.5 A22.95,28.35 0 1 1 -73.89,-73.5 Z\" style=\"fill: #0F0D22\"></path><path d=\"M-19.89,-73.5 L23.89,-73.5 A22.95,28.35 0 1 1 -19.89,-73.5 Z\" style=\"fill: #0F0D22\"></path>",
        "o118": "<path d=\"M-71.14,-72.43 L-32.86,-72.43 A20.06,24.78 0 1 1 -71.14,-72.43 Z\" style=\"fill: #0F0D22\"></path><path d=\"M-17.14,-72.43 L21.14,-72.43 A20.06,24.78 0 1 1 -17.14,-72.43 Z\" style=\"fill: #0F0D22\"></path>",
        "o1": "<path d=\"M-68.22,-71.3 L-35.78,-71.3 A17,21 0 1 1 -68.22,-71.3 Z\" style=\"fill: #0F0D22\"></path><path d=\"M-14.22,-71.3 L18.22,-71.3 A17,21 0 1 1 -14.22,-71.3 Z\" style=\"fill: #0F0D22\"></path>"
      },
      "sleep": {
        "o135": "<path d=\"M-72.53,-68.62 C-66.49,-50.51 -37.51,-50.51 -31.47,-68.62\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.48; stroke-linecap: round\"></path><path d=\"M-18.53,-68.62 C-12.49,-50.51 16.49,-50.51 22.53,-68.62\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.48; stroke-linecap: round\"></path>",
        "o118": "<path d=\"M-69.95,-68.17 C-64.67,-52.33 -39.33,-52.33 -34.05,-68.17\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10.03; stroke-linecap: round\"></path><path d=\"M-15.95,-68.17 C-10.67,-52.33 14.67,-52.33 19.95,-68.17\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10.03; stroke-linecap: round\"></path>",
        "o1": "<path d=\"M-67.21,-67.68 C-62.74,-54.26 -41.26,-54.26 -36.79,-67.68\" style=\"fill: none; stroke: #0F0D22; stroke-width: 8.5; stroke-linecap: round\"></path><path d=\"M-13.21,-67.68 C-8.74,-54.26 12.74,-54.26 17.21,-67.68\" style=\"fill: none; stroke: #0F0D22; stroke-width: 8.5; stroke-linecap: round\"></path>"
      }
    }
  },
  "hex": {
    "color": "#B6FF2E",
    "shade": "#A2EA1A",
    "body": "<path d=\"M53.69,-144 L97.86,-118.5 A107.4,107.4 0 0 1 151.55,-25.5 L151.55,25.5 A107.4,107.4 0 0 1 97.86,118.5 L53.69,144 A107.4,107.4 0 0 1 -53.69,144 L-97.86,118.5 A107.4,107.4 0 0 1 -151.55,25.5 L-151.55,-25.5 A107.4,107.4 0 0 1 -97.86,-118.5 L-53.69,-144 A107.4,107.4 0 0 1 53.69,-144 Z\" style=\"fill: #B6FF2E\"></path>",
    "ring": "<path d=\"M53.69,-144 L97.86,-118.5 A107.4,107.4 0 0 1 151.55,-25.5 L151.55,25.5 A107.4,107.4 0 0 1 97.86,118.5 L53.69,144 A107.4,107.4 0 0 1 -53.69,144 L-97.86,118.5 A107.4,107.4 0 0 1 -151.55,25.5 L-151.55,-25.5 A107.4,107.4 0 0 1 -97.86,-118.5 L-53.69,-144 A107.4,107.4 0 0 1 53.69,-144 Z\" style=\"fill: #FFFFFF; stroke: #FFFFFF; stroke-width: 44; stroke-linejoin: round\"></path>",
    "inner": "rotate(-12)",
    "eyes": {
      "oval": {
        "o135": "<ellipse cx=\"26\" cy=\"-31\" rx=\"24.3\" ry=\"29.7\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"82\" cy=\"-31\" rx=\"24.3\" ry=\"29.7\" style=\"fill: #0F0D22\"></ellipse>",
        "o118": "<ellipse cx=\"26\" cy=\"-31\" rx=\"21.24\" ry=\"25.96\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"82\" cy=\"-31\" rx=\"21.24\" ry=\"25.96\" style=\"fill: #0F0D22\"></ellipse>",
        "o1": "<ellipse cx=\"26\" cy=\"-31\" rx=\"18\" ry=\"22\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"82\" cy=\"-31\" rx=\"18\" ry=\"22\" style=\"fill: #0F0D22\"></ellipse>"
      },
      "big": {
        "o135": "<ellipse cx=\"28.56\" cy=\"-27.16\" rx=\"19.2\" ry=\"23.46\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"84.56\" cy=\"-33.56\" rx=\"28.19\" ry=\"34.45\" style=\"fill: #0F0D22\"></ellipse>",
        "o118": "<ellipse cx=\"28.24\" cy=\"-27.65\" rx=\"16.78\" ry=\"20.51\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"84.24\" cy=\"-33.24\" rx=\"24.64\" ry=\"30.11\" style=\"fill: #0F0D22\"></ellipse>",
        "o1": "<ellipse cx=\"27.89\" cy=\"-28.16\" rx=\"14.22\" ry=\"17.38\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"83.89\" cy=\"-32.89\" rx=\"20.88\" ry=\"25.52\" style=\"fill: #0F0D22\"></ellipse>"
      },
      "happy": {
        "o135": "<path d=\"M2.98,-23.33 C8.09,-50.18 43.91,-50.18 49.02,-23.33\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.79; stroke-linecap: round\"></path><path d=\"M58.98,-23.33 C64.09,-50.18 99.91,-50.18 105.02,-23.33\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.79; stroke-linecap: round\"></path>",
        "o118": "<path d=\"M5.88,-24.29 C10.35,-47.77 41.65,-47.77 46.12,-24.29\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.18; stroke-linecap: round\"></path><path d=\"M61.88,-24.29 C66.35,-47.77 97.65,-47.77 102.12,-24.29\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.18; stroke-linecap: round\"></path>",
        "o1": "<path d=\"M8.95,-25.32 C12.74,-45.21 39.26,-45.21 43.05,-25.32\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.47; stroke-linecap: round\"></path><path d=\"M64.95,-25.32 C68.74,-45.21 95.26,-45.21 99.05,-25.32\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.47; stroke-linecap: round\"></path>"
      },
      "wink": {
        "o135": "<ellipse cx=\"26\" cy=\"-31\" rx=\"24.3\" ry=\"29.7\" style=\"fill: #0F0D22\"></ellipse><path d=\"M58.98,-23.33 C64.09,-50.18 99.91,-50.18 105.02,-23.33\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.79; stroke-linecap: round\"></path>",
        "o118": "<ellipse cx=\"26\" cy=\"-31\" rx=\"21.24\" ry=\"25.96\" style=\"fill: #0F0D22\"></ellipse><path d=\"M61.88,-24.29 C66.35,-47.77 97.65,-47.77 102.12,-24.29\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.18; stroke-linecap: round\"></path>",
        "o1": "<ellipse cx=\"26\" cy=\"-31\" rx=\"18\" ry=\"22\" style=\"fill: #0F0D22\"></ellipse><path d=\"M64.95,-25.32 C68.74,-45.21 95.26,-45.21 99.05,-25.32\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.47; stroke-linecap: round\"></path>"
      },
      "serio": {
        "o135": "<path d=\"M2.82,-39.91 L49.18,-39.91 A24.3,29.7 0 1 1 2.82,-39.91 Z\" style=\"fill: #0F0D22\"></path><path d=\"M58.82,-39.91 L105.18,-39.91 A24.3,29.7 0 1 1 58.82,-39.91 Z\" style=\"fill: #0F0D22\"></path>",
        "o118": "<path d=\"M5.74,-38.79 L46.26,-38.79 A21.24,25.96 0 1 1 5.74,-38.79 Z\" style=\"fill: #0F0D22\"></path><path d=\"M61.74,-38.79 L102.26,-38.79 A21.24,25.96 0 1 1 61.74,-38.79 Z\" style=\"fill: #0F0D22\"></path>",
        "o1": "<path d=\"M8.83,-37.6 L43.17,-37.6 A18,22 0 1 1 8.83,-37.6 Z\" style=\"fill: #0F0D22\"></path><path d=\"M64.83,-37.6 L99.17,-37.6 A18,22 0 1 1 64.83,-37.6 Z\" style=\"fill: #0F0D22\"></path>"
      },
      "sleep": {
        "o135": "<path d=\"M4.26,-34.84 C10.65,-15.65 41.35,-15.65 47.74,-34.84\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.15; stroke-linecap: round\"></path><path d=\"M60.26,-34.84 C66.65,-15.65 97.35,-15.65 103.74,-34.84\" style=\"fill: none; stroke: #0F0D22; stroke-width: 12.15; stroke-linecap: round\"></path>",
        "o118": "<path d=\"M7,-34.35 C12.59,-17.59 39.41,-17.59 45,-34.35\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10.62; stroke-linecap: round\"></path><path d=\"M63,-34.35 C68.59,-17.59 95.41,-17.59 101,-34.35\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10.62; stroke-linecap: round\"></path>",
        "o1": "<path d=\"M9.89,-33.84 C14.63,-19.63 37.37,-19.63 42.11,-33.84\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9; stroke-linecap: round\"></path><path d=\"M65.89,-33.84 C70.63,-19.63 93.37,-19.63 98.11,-33.84\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9; stroke-linecap: round\"></path>"
      }
    }
  },
  "funnel": {
    "color": "#00E5C3",
    "shade": "#00CFB0",
    "body": "<path d=\"M-72.3,-120 L72.3,-120 A58,58 0 0 1 121.93,-32.07 L54.82,79.16 A64,64 0 0 1 -54.82,79.16 L-121.93,-32.07 A58,58 0 0 1 -72.3,-120 Z\" style=\"fill: #00E5C3\"></path>",
    "ring": "<path d=\"M-72.3,-120 L72.3,-120 A58,58 0 0 1 121.93,-32.07 L54.82,79.16 A64,64 0 0 1 -54.82,79.16 L-121.93,-32.07 A58,58 0 0 1 -72.3,-120 Z\" style=\"fill: #FFFFFF; stroke: #FFFFFF; stroke-width: 44; stroke-linejoin: round\"></path>",
    "inner": "translate(0 6) scale(1.2)",
    "eyes": {
      "oval": {
        "o135": "<ellipse cx=\"-24\" cy=\"-58\" rx=\"20.25\" ry=\"24.71\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"24\" cy=\"-58\" rx=\"20.25\" ry=\"24.71\" style=\"fill: #0F0D22\"></ellipse>",
        "o118": "<ellipse cx=\"-24\" cy=\"-58\" rx=\"17.7\" ry=\"21.59\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"24\" cy=\"-58\" rx=\"17.7\" ry=\"21.59\" style=\"fill: #0F0D22\"></ellipse>",
        "o1": "<ellipse cx=\"-24\" cy=\"-58\" rx=\"15\" ry=\"18.3\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"24\" cy=\"-58\" rx=\"15\" ry=\"18.3\" style=\"fill: #0F0D22\"></ellipse>"
      },
      "big": {
        "o135": "<ellipse cx=\"-21.87\" cy=\"-54.8\" rx=\"16\" ry=\"19.52\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"26.13\" cy=\"-60.13\" rx=\"23.49\" ry=\"28.66\" style=\"fill: #0F0D22\"></ellipse>",
        "o118": "<ellipse cx=\"-22.14\" cy=\"-55.21\" rx=\"13.98\" ry=\"17.06\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"25.86\" cy=\"-59.86\" rx=\"20.53\" ry=\"25.05\" style=\"fill: #0F0D22\"></ellipse>",
        "o1": "<ellipse cx=\"-22.42\" cy=\"-55.63\" rx=\"11.85\" ry=\"14.46\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"25.58\" cy=\"-59.58\" rx=\"17.4\" ry=\"21.23\" style=\"fill: #0F0D22\"></ellipse>"
      },
      "happy": {
        "o135": "<path d=\"M-43.18,-51.61 C-38.92,-73.99 -9.08,-73.99 -4.82,-51.61\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10.66; stroke-linecap: round\"></path><path d=\"M4.82,-51.61 C9.08,-73.99 38.92,-73.99 43.18,-51.61\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10.66; stroke-linecap: round\"></path>",
        "o118": "<path d=\"M-40.77,-52.41 C-37.04,-71.97 -10.96,-71.97 -7.23,-52.41\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.32; stroke-linecap: round\"></path><path d=\"M7.23,-52.41 C10.96,-71.97 37.04,-71.97 40.77,-52.41\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.32; stroke-linecap: round\"></path>",
        "o1": "<path d=\"M-38.21,-53.26 C-35.05,-69.84 -12.95,-69.84 -9.79,-53.26\" style=\"fill: none; stroke: #0F0D22; stroke-width: 7.89; stroke-linecap: round\"></path><path d=\"M9.79,-53.26 C12.95,-69.84 35.05,-69.84 38.21,-53.26\" style=\"fill: none; stroke: #0F0D22; stroke-width: 7.89; stroke-linecap: round\"></path>"
      },
      "wink": {
        "o135": "<ellipse cx=\"-24\" cy=\"-58\" rx=\"20.25\" ry=\"24.71\" style=\"fill: #0F0D22\"></ellipse><path d=\"M4.82,-51.61 C9.08,-73.99 38.92,-73.99 43.18,-51.61\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10.66; stroke-linecap: round\"></path>",
        "o118": "<ellipse cx=\"-24\" cy=\"-58\" rx=\"17.7\" ry=\"21.59\" style=\"fill: #0F0D22\"></ellipse><path d=\"M7.23,-52.41 C10.96,-71.97 37.04,-71.97 40.77,-52.41\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.32; stroke-linecap: round\"></path>",
        "o1": "<ellipse cx=\"-24\" cy=\"-58\" rx=\"15\" ry=\"18.3\" style=\"fill: #0F0D22\"></ellipse><path d=\"M9.79,-53.26 C12.95,-69.84 35.05,-69.84 38.21,-53.26\" style=\"fill: none; stroke: #0F0D22; stroke-width: 7.89; stroke-linecap: round\"></path>"
      },
      "serio": {
        "o135": "<path d=\"M-43.32,-65.41 L-4.68,-65.41 A20.25,24.71 0 1 1 -43.32,-65.41 Z\" style=\"fill: #0F0D22\"></path><path d=\"M4.68,-65.41 L43.32,-65.41 A20.25,24.71 0 1 1 4.68,-65.41 Z\" style=\"fill: #0F0D22\"></path>",
        "o118": "<path d=\"M-40.88,-64.48 L-7.12,-64.48 A17.7,21.59 0 1 1 -40.88,-64.48 Z\" style=\"fill: #0F0D22\"></path><path d=\"M7.12,-64.48 L40.88,-64.48 A17.7,21.59 0 1 1 7.12,-64.48 Z\" style=\"fill: #0F0D22\"></path>",
        "o1": "<path d=\"M-38.31,-63.49 L-9.69,-63.49 A15,18.3 0 1 1 -38.31,-63.49 Z\" style=\"fill: #0F0D22\"></path><path d=\"M9.69,-63.49 L38.31,-63.49 A15,18.3 0 1 1 9.69,-63.49 Z\" style=\"fill: #0F0D22\"></path>"
      },
      "sleep": {
        "o135": "<path d=\"M-42.12,-61.2 C-36.79,-45.21 -11.21,-45.21 -5.88,-61.2\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10.12; stroke-linecap: round\"></path><path d=\"M5.88,-61.2 C11.21,-45.21 36.79,-45.21 42.12,-61.2\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10.12; stroke-linecap: round\"></path>",
        "o118": "<path d=\"M-39.84,-60.79 C-35.18,-46.82 -12.82,-46.82 -8.16,-60.79\" style=\"fill: none; stroke: #0F0D22; stroke-width: 8.85; stroke-linecap: round\"></path><path d=\"M8.16,-60.79 C12.82,-46.82 35.18,-46.82 39.84,-60.79\" style=\"fill: none; stroke: #0F0D22; stroke-width: 8.85; stroke-linecap: round\"></path>",
        "o1": "<path d=\"M-37.42,-60.37 C-33.47,-48.53 -14.53,-48.53 -10.58,-60.37\" style=\"fill: none; stroke: #0F0D22; stroke-width: 7.5; stroke-linecap: round\"></path><path d=\"M10.58,-60.37 C14.53,-48.53 33.47,-48.53 37.42,-60.37\" style=\"fill: none; stroke: #0F0D22; stroke-width: 7.5; stroke-linecap: round\"></path>"
      }
    }
  },
  "square": {
    "color": "#1F5BFF",
    "shade": "#1747E0",
    "body": "<path d=\"M-76,-140 L76,-140 A64,64 0 0 1 140,-76 L140,76 A64,64 0 0 1 76,140 L-76,140 A64,64 0 0 1 -140,76 L-140,-76 A64,64 0 0 1 -76,-140 Z\" style=\"fill: #1F5BFF\"></path>",
    "ring": "<path d=\"M-76,-140 L76,-140 A64,64 0 0 1 140,-76 L140,76 A64,64 0 0 1 76,140 L-76,140 A64,64 0 0 1 -140,76 L-140,-76 A64,64 0 0 1 -76,-140 Z\" style=\"fill: #FFFFFF; stroke: #FFFFFF; stroke-width: 44; stroke-linejoin: round\"></path>",
    "inner": "",
    "eyes": {
      "oval": {
        "o135": "<ellipse cx=\"-25\" cy=\"-26\" rx=\"21.6\" ry=\"27\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"25\" cy=\"-26\" rx=\"21.6\" ry=\"27\" style=\"fill: #0F0D22\"></ellipse>",
        "o118": "<ellipse cx=\"-25\" cy=\"-26\" rx=\"18.88\" ry=\"23.6\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"25\" cy=\"-26\" rx=\"18.88\" ry=\"23.6\" style=\"fill: #0F0D22\"></ellipse>",
        "o1": "<ellipse cx=\"-25\" cy=\"-26\" rx=\"16\" ry=\"20\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"25\" cy=\"-26\" rx=\"16\" ry=\"20\" style=\"fill: #0F0D22\"></ellipse>"
      },
      "big": {
        "o135": "<ellipse cx=\"-22.73\" cy=\"-22.59\" rx=\"17.06\" ry=\"21.33\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"27.27\" cy=\"-28.27\" rx=\"25.06\" ry=\"31.32\" style=\"fill: #0F0D22\"></ellipse>",
        "o118": "<ellipse cx=\"-23.01\" cy=\"-23.02\" rx=\"14.92\" ry=\"18.64\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"26.99\" cy=\"-27.99\" rx=\"21.9\" ry=\"27.38\" style=\"fill: #0F0D22\"></ellipse>",
        "o1": "<ellipse cx=\"-23.32\" cy=\"-23.47\" rx=\"12.64\" ry=\"15.8\" style=\"fill: #0F0D22\"></ellipse><ellipse cx=\"26.68\" cy=\"-27.68\" rx=\"18.56\" ry=\"23.2\" style=\"fill: #0F0D22\"></ellipse>"
      },
      "happy": {
        "o135": "<path d=\"M-45.46,-19.18 C-40.92,-43.05 -9.08,-43.05 -4.54,-19.18\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.37; stroke-linecap: round\"></path><path d=\"M4.54,-19.18 C9.08,-43.05 40.92,-43.05 45.46,-19.18\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.37; stroke-linecap: round\"></path>",
        "o118": "<path d=\"M-42.89,-20.04 C-38.91,-40.91 -11.09,-40.91 -7.11,-20.04\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.94; stroke-linecap: round\"></path><path d=\"M7.11,-20.04 C11.09,-40.91 38.91,-40.91 42.89,-20.04\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.94; stroke-linecap: round\"></path>",
        "o1": "<path d=\"M-40.16,-20.95 C-36.79,-38.63 -13.21,-38.63 -9.84,-20.95\" style=\"fill: none; stroke: #0F0D22; stroke-width: 8.42; stroke-linecap: round\"></path><path d=\"M9.84,-20.95 C13.21,-38.63 36.79,-38.63 40.16,-20.95\" style=\"fill: none; stroke: #0F0D22; stroke-width: 8.42; stroke-linecap: round\"></path>"
      },
      "wink": {
        "o135": "<ellipse cx=\"-25\" cy=\"-26\" rx=\"21.6\" ry=\"27\" style=\"fill: #0F0D22\"></ellipse><path d=\"M4.54,-19.18 C9.08,-43.05 40.92,-43.05 45.46,-19.18\" style=\"fill: none; stroke: #0F0D22; stroke-width: 11.37; stroke-linecap: round\"></path>",
        "o118": "<ellipse cx=\"-25\" cy=\"-26\" rx=\"18.88\" ry=\"23.6\" style=\"fill: #0F0D22\"></ellipse><path d=\"M7.11,-20.04 C11.09,-40.91 38.91,-40.91 42.89,-20.04\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.94; stroke-linecap: round\"></path>",
        "o1": "<ellipse cx=\"-25\" cy=\"-26\" rx=\"16\" ry=\"20\" style=\"fill: #0F0D22\"></ellipse><path d=\"M9.84,-20.95 C13.21,-38.63 36.79,-38.63 40.16,-20.95\" style=\"fill: none; stroke: #0F0D22; stroke-width: 8.42; stroke-linecap: round\"></path>"
      },
      "serio": {
        "o135": "<path d=\"M-45.61,-34.1 L-4.39,-34.1 A21.6,27 0 1 1 -45.61,-34.1 Z\" style=\"fill: #0F0D22\"></path><path d=\"M4.39,-34.1 L45.61,-34.1 A21.6,27 0 1 1 4.39,-34.1 Z\" style=\"fill: #0F0D22\"></path>",
        "o118": "<path d=\"M-43.01,-33.08 L-6.99,-33.08 A18.88,23.6 0 1 1 -43.01,-33.08 Z\" style=\"fill: #0F0D22\"></path><path d=\"M6.99,-33.08 L43.01,-33.08 A18.88,23.6 0 1 1 6.99,-33.08 Z\" style=\"fill: #0F0D22\"></path>",
        "o1": "<path d=\"M-40.26,-32 L-9.74,-32 A16,20 0 1 1 -40.26,-32 Z\" style=\"fill: #0F0D22\"></path><path d=\"M9.74,-32 L40.26,-32 A16,20 0 1 1 9.74,-32 Z\" style=\"fill: #0F0D22\"></path>"
      },
      "sleep": {
        "o135": "<path d=\"M-44.33,-29.41 C-38.64,-12.36 -11.36,-12.36 -5.67,-29.41\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10.8; stroke-linecap: round\"></path><path d=\"M5.67,-29.41 C11.36,-12.36 38.64,-12.36 44.33,-29.41\" style=\"fill: none; stroke: #0F0D22; stroke-width: 10.8; stroke-linecap: round\"></path>",
        "o118": "<path d=\"M-41.89,-28.98 C-36.92,-14.08 -13.08,-14.08 -8.11,-28.98\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.44; stroke-linecap: round\"></path><path d=\"M8.11,-28.98 C13.08,-14.08 36.92,-14.08 41.89,-28.98\" style=\"fill: none; stroke: #0F0D22; stroke-width: 9.44; stroke-linecap: round\"></path>",
        "o1": "<path d=\"M-39.32,-28.53 C-35.11,-15.89 -14.89,-15.89 -10.68,-28.53\" style=\"fill: none; stroke: #0F0D22; stroke-width: 8; stroke-linecap: round\"></path><path d=\"M10.68,-28.53 C14.89,-15.89 35.11,-15.89 39.32,-28.53\" style=\"fill: none; stroke: #0F0D22; stroke-width: 8; stroke-linecap: round\"></path>"
      }
    }
  }
} as const;

/** O squad na ordem oficial do Design System, com a identidade de squad/<agente>/agent.yaml. */
export const SQUAD = [
  {
    "id": "nexo",
    "name": "Nexo",
    "article": "o",
    "area": "Projetos",
    "role": "Projetos e coordenação",
    "roleFull": "Coordenação de Marketing",
    "color": "#FF4D1F",
    "softTint": "rgba(255,77,31,.1)",
    "shape": "coord"
  },
  {
    "id": "bia",
    "name": "Bia",
    "article": "a",
    "area": "Estratégia",
    "role": "Estratégia e inteligência",
    "roleFull": "Estratégia e Inteligência",
    "color": "#8A3BFF",
    "softTint": "rgba(138,59,255,.1)",
    "shape": "arch"
  },
  {
    "id": "kaia",
    "name": "Kaia",
    "article": "a",
    "area": "Marca & Criação",
    "role": "Marca e criação",
    "roleFull": "Marca e Criação",
    "color": "#FF2E9A",
    "softTint": "rgba(255,46,154,.1)",
    "shape": "leaf"
  },
  {
    "id": "otto",
    "name": "Otto",
    "article": "o",
    "area": "Conteúdo",
    "role": "Conteúdo",
    "roleFull": "Conteúdo e Comunicação",
    "color": "#FFE11A",
    "softTint": "rgba(255,225,26,.22)",
    "shape": "pill"
  },
  {
    "id": "kiwi",
    "name": "Kiwi",
    "article": "a",
    "area": "Growth Marketing",
    "role": "Growth Marketing",
    "roleFull": "Growth Marketing",
    "color": "#B6FF2E",
    "softTint": "rgba(182,255,46,.24)",
    "shape": "hex"
  },
  {
    "id": "max",
    "name": "Max",
    "article": "o",
    "area": "CRM",
    "role": "CRM de marketing",
    "roleFull": "CRM e Relacionamento",
    "color": "#00E5C3",
    "softTint": "rgba(0,229,195,.14)",
    "shape": "funnel"
  },
  {
    "id": "iris",
    "name": "Íris",
    "article": "a",
    "area": "Resultados",
    "role": "Resultados",
    "roleFull": "Dados e Resultados",
    "color": "#1F5BFF",
    "softTint": "rgba(31,91,255,.1)",
    "shape": "square"
  }
] as const;

export const EXPRESSIONS = ["oval","big","happy","wink","serio","sleep"] as const;
