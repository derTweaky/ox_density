import Config from "common/config";
import { Zone } from "@overextended/ox_lib/client";
import { Vector3 } from "@overextended/core/vector";

interface DensityState {
  vehicles: number;
  peds: number;
  randomVehicles: number;
  parkedVehicles: number;
  scenarioPedsInternal: number;
  scenarioPedsExternal: number;
}

// Declare global variables to avoid compilation errors
declare const GlobalState: any;

let globalDensity: DensityState = {
  vehicles: Config.globalDensity?.vehicles ?? 0.5,
  peds: Config.globalDensity?.peds ?? 0.5,
  randomVehicles: Config.globalDensity?.randomVehicles ?? 0.5,
  parkedVehicles: Config.globalDensity?.parkedVehicles ?? 0.5,
  scenarioPedsInternal: Config.globalDensity?.scenarioPedsInternal ?? 0.5,
  scenarioPedsExternal: Config.globalDensity?.scenarioPedsExternal ?? 0.5,
};

let activeZoneDensity: DensityState | null = null;
const enteredZonesStack: DensityState[] = [];
let activeTickId: number | null = null;

// Function to apply one-off configuration limits
function applyGeneralSettings() {
  // Apply population budgets
  if (Config.budgets) {
    const pedBudget = Config.budgets.pedPopulation ?? 2;
    const vehBudget = Config.budgets.vehiclePopulation ?? 2;
    SetPedPopulationBudget(pedBudget);
    SetVehiclePopulationBudget(vehBudget);
  }

  // Disable dispatch services if configured
  if (Config.disableDispatch) {
    for (let i = 1; i <= 15; i++) {
      EnableDispatchService(i, false);
    }
  }

  // Apply other vehicle/ped constraints
  if (Config.disableCops) {
    SetCreateRandomCops(false);
    SetCreateRandomCopsOnScenarios(false);
    SetCreateRandomCopsNotOnScenarios(false);
  }

  if (Config.disableBoats) {
    SetRandomBoats(false);
  }

  if (Config.disableTrains) {
    SetRandomTrains(false);
  }

  if (Config.disableGarbageTrucks) {
    SetGarbageTrucks(false);
  }
}

// Optimized frame-tick management
function updateTickState() {
  const active = activeZoneDensity || globalDensity;

  // We only need a tick loop running every frame if at least one density multiplier is not default (1.0)
  const needsTick =
    active.vehicles !== 1.0 ||
    active.peds !== 1.0 ||
    active.randomVehicles !== 1.0 ||
    active.parkedVehicles !== 1.0 ||
    active.scenarioPedsInternal !== 1.0 ||
    active.scenarioPedsExternal !== 1.0;

  if (needsTick) {
    if (activeTickId === null) {
      activeTickId = setTick(() => {
        const current = activeZoneDensity || globalDensity;
        SetVehicleDensityMultiplierThisFrame(current.vehicles);
        SetPedDensityMultiplierThisFrame(current.peds);
        SetRandomVehicleDensityMultiplierThisFrame(current.randomVehicles);
        SetParkedVehicleDensityMultiplierThisFrame(current.parkedVehicles);
        SetScenarioPedDensityMultiplierThisFrame(current.scenarioPedsInternal, current.scenarioPedsExternal);
      });
    }
  } else {
    if (activeTickId !== null) {
      clearTick(activeTickId);
      activeTickId = null;
    }
  }
}

// Initialization
applyGeneralSettings();

// Regularly re-apply dispatch/ambient settings every 5 seconds to ensure game doesn't reset them
setInterval(() => {
  applyGeneralSettings();
}, 5000);

// Load initial state bag value if already synced
const initialServerDensity = GlobalState.ox_density;
if (initialServerDensity) {
  globalDensity = initialServerDensity;
  updateTickState();
}

// Watch for density changes from the server (State Bag sync)
AddStateBagChangeHandler("ox_density", "global", (bagName: string, key: string, value: DensityState) => {
  if (value) {
    globalDensity = value;
    updateTickState();
  }
});

// Setup ox_lib zones for local density overrides
if (Config.enableZones && Config.zones) {
  for (const zone of Config.zones) {
    const zoneDensity: DensityState = {
      vehicles: zone.density?.vehicles ?? globalDensity.vehicles,
      peds: zone.density?.peds ?? globalDensity.peds,
      randomVehicles: zone.density?.randomVehicles ?? globalDensity.randomVehicles,
      parkedVehicles: zone.density?.parkedVehicles ?? globalDensity.parkedVehicles,
      scenarioPedsInternal: zone.density?.scenarioPedsInternal ?? globalDensity.scenarioPedsInternal,
      scenarioPedsExternal: zone.density?.scenarioPedsExternal ?? globalDensity.scenarioPedsExternal,
    };

    const enterHandler = () => {
      enteredZonesStack.push(zoneDensity);
      activeZoneDensity = zoneDensity;
      updateTickState();
    };

    const exitHandler = () => {
      const idx = enteredZonesStack.indexOf(zoneDensity);
      if (idx > -1) {
        enteredZonesStack.splice(idx, 1);
      }
      activeZoneDensity = enteredZonesStack.length > 0 ? enteredZonesStack[enteredZonesStack.length - 1]! : null;
      updateTickState();
    };

    if (zone.type === "box" && zone.size) {
      const createdZone = Zone.Cuboid(
        new Vector3(zone.coords[0] as number, zone.coords[1] as number, zone.coords[2] as number) as any,
        zone.size[0] as number,
        zone.size[1] as number,
        zone.size[2] as number,
        zone.rotation ?? 0
      );
      createdZone.onEnter = enterHandler;
      createdZone.onExit = exitHandler;
    } else if (zone.type === "sphere") {
      const createdZone = Zone.Sphere(
        new Vector3(zone.coords[0] as number, zone.coords[1] as number, zone.coords[2] as number) as any,
        zone.radius ?? 10.0
      );
      createdZone.onEnter = enterHandler;
      createdZone.onExit = exitHandler;
    }
  }
}

// Initial state tick update
updateTickState();
