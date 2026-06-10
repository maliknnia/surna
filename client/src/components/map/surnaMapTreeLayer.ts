import maplibregl from "maplibre-gl";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { CustomLayerInterface, Map as MapLibreMap } from "maplibre-gl";

export const SURNA_TREE_LAYER_ID = "surna-3d-trees";

type TreePreset = "off" | "lite" | "full";

type TreePresetConfig = {
  maxTrees: number;
  minZoom: number;
  gridStep: number;
  refreshMs: number;
  queryLayers: string[];
  pickThreshold: number;
  modelScale: number;
};

const TREE_PRESETS: Record<Exclude<TreePreset, "off">, TreePresetConfig> = {
  lite: {
    maxTrees: 25,
    minZoom: 17,
    gridStep: 0.0009,
    refreshMs: 900,
    queryLayers: ["Forest", "Wood", "Grass", "Meadow", "Scrub"],
    pickThreshold: 0.68,
    modelScale: 28,
  },
  full: {
    maxTrees: 45,
    minZoom: 16,
    gridStep: 0.00065,
    refreshMs: 700,
    queryLayers: ["Grass", "Residential", "Forest", "Wood"],
    pickThreshold: 0.62,
    modelScale: 28,
  },
};

function resolveTreePreset(): TreePreset {
  const value = import.meta.env.VITE_MAP_3D_TREES?.trim().toLowerCase();
  if (value === "0" || value === "off") return "off";
  if (value === "1" || value === "full") return "full";
  return "lite";
}

function cellHash(lat: number, lng: number): number {
  const s = Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function sampleTreeCoords(map: MapLibreMap, config: TreePresetConfig): Array<[number, number]> {
  if (map.getZoom() < config.minZoom) return [];

  const bounds = map.getBounds();
  const coords: Array<[number, number]> = [];

  for (
    let lat = bounds.getSouth();
    lat < bounds.getNorth() && coords.length < config.maxTrees;
    lat += config.gridStep
  ) {
    for (
      let lng = bounds.getWest();
      lng < bounds.getEast() && coords.length < config.maxTrees;
      lng += config.gridStep
    ) {
      if (cellHash(lat, lng) < config.pickThreshold) continue;

      const point = map.project([lng, lat]);
      const hits = map.queryRenderedFeatures([point.x, point.y], {
        layers: config.queryLayers,
      });
      if (hits.length === 0) continue;

      coords.push([lng, lat]);
    }
  }

  return coords;
}

function createSnapTreeMesh(isDark: boolean, capacity: number): THREE.InstancedMesh {
  const trunk = new THREE.CylinderGeometry(0.04, 0.06, 0.22, 5);
  trunk.translate(0, 0.11, 0);
  const canopy = new THREE.SphereGeometry(0.32, 7, 7);
  canopy.scale(1, 1.35, 1);
  canopy.translate(0, 0.52, 0);

  const geometry = mergeGeometries([trunk, canopy]);
  if (!geometry) throw new Error("snap tree geometry failed");

  const material = new THREE.MeshStandardMaterial({
    color: isDark ? 0x8aab72 : 0x7a9f62,
    flatShading: true,
  });

  return new THREE.InstancedMesh(geometry, material, capacity);
}

type TreeLayerState = {
  map: MapLibreMap;
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  instanced?: THREE.InstancedMesh;
  config: TreePresetConfig;
  refreshTrees: () => void;
  debouncedRefresh: () => void;
  refreshTimer?: ReturnType<typeof setTimeout>;
};

const TREE_ROTATION_X = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);

function mercatorMatrix(lng: number, lat: number, modelScale: number): THREE.Matrix4 {
  const mc = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
  const meterScale = mc.meterInMercatorCoordinateUnits() * modelScale;

  return new THREE.Matrix4()
    .makeTranslation(mc.x, mc.y, mc.z)
    .scale(new THREE.Vector3(meterScale, -meterScale, meterScale))
    .multiply(TREE_ROTATION_X);
}

function createTreeCustomLayer(config: TreePresetConfig): CustomLayerInterface {
  const state = {} as TreeLayerState;

  return {
    id: SURNA_TREE_LAYER_ID,
    type: "custom",
    renderingMode: "3d",

    onAdd(map, gl) {
      state.map = map;
      state.config = config;
      state.camera = new THREE.Camera();
      state.scene = new THREE.Scene();
      const isDark = !!map.getCanvas().closest(".surna-map-dark");
      state.scene.add(new THREE.AmbientLight(0xffffff, isDark ? 0.72 : 0.88));
      const sun = new THREE.DirectionalLight(0xffffff, 1);
      sun.position.set(40, 100, 50);
      state.scene.add(sun);

      state.renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: false,
      });
      state.renderer.autoClear = false;

      state.refreshTrees = () => {
        if (!state.instanced) return;

        const coords = sampleTreeCoords(map, state.config);
        const matrix = new THREE.Matrix4();

        coords.forEach(([lng, lat], index) => {
          matrix.copy(mercatorMatrix(lng, lat, state.config.modelScale));
          state.instanced!.setMatrixAt(index, matrix);
        });

        state.instanced.count = coords.length;
        state.instanced.instanceMatrix.needsUpdate = true;

        if (coords.length > 0) {
          map.triggerRepaint();
        }
      };

      state.debouncedRefresh = () => {
        if (state.refreshTimer) clearTimeout(state.refreshTimer);
        state.refreshTimer = setTimeout(() => {
          state.refreshTimer = undefined;
          state.refreshTrees();
        }, state.config.refreshMs);
      };

      state.instanced = createSnapTreeMesh(isDark, config.maxTrees);
      state.instanced.count = 0;
      state.instanced.frustumCulled = false;
      state.scene.add(state.instanced);

      map.once("idle", state.refreshTrees);
      map.on("moveend", state.debouncedRefresh);
      map.on("zoomend", state.debouncedRefresh);
    },

    render(_gl, options) {
      if (!state.instanced || state.instanced.count === 0) return;

      const m = new THREE.Matrix4().fromArray(options.modelViewProjectionMatrix);
      state.camera.projectionMatrix = m;
      state.renderer.resetState();
      state.renderer.render(state.scene, state.camera);
    },

    onRemove() {
      if (state.refreshTimer) clearTimeout(state.refreshTimer);
      if (state.debouncedRefresh) {
        state.map.off("moveend", state.debouncedRefresh);
        state.map.off("zoomend", state.debouncedRefresh);
      }
      state.instanced?.dispose();
      state.scene.clear();
    },
  };
}

/**
 * 3D trees — `lite` by default (parks only, zoom 17+, max 25).
 * VITE_MAP_3D_TREES: `off` | `lite` | `full` (or `0` / `1`)
 */
export function applySurnaMapTrees(map: MapLibreMap) {
  const preset = resolveTreePreset();
  if (preset === "off") return;

  if (map.getLayer(SURNA_TREE_LAYER_ID)) {
    map.removeLayer(SURNA_TREE_LAYER_ID);
  }

  try {
    map.addLayer(createTreeCustomLayer(TREE_PRESETS[preset]));
  } catch (error) {
    console.warn("[surnaMapTreeLayer] addLayer failed:", error);
  }
}
