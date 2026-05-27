import Config from "common/config";

interface DensityState {
  vehicles: number;
  peds: number;
  randomVehicles: number;
  parkedVehicles: number;
  scenarioPedsInternal: number;
  scenarioPedsExternal: number;
}

// Declare GlobalState to avoid compilation issues
declare const GlobalState: any;

const defaultDensity: DensityState = {
  vehicles: Config.globalDensity?.vehicles ?? 0.5,
  peds: Config.globalDensity?.peds ?? 0.5,
  randomVehicles: Config.globalDensity?.randomVehicles ?? 0.5,
  parkedVehicles: Config.globalDensity?.parkedVehicles ?? 0.5,
  scenarioPedsInternal: Config.globalDensity?.scenarioPedsInternal ?? 0.5,
  scenarioPedsExternal: Config.globalDensity?.scenarioPedsExternal ?? 0.5,
};

// Initialize the global statebag
GlobalState.ox_density = defaultDensity;

console.log(`[^2ox_density^7] Initialized global density multipliers:`);
console.log(`  - Vehicles: ${defaultDensity.vehicles}`);
console.log(`  - Peds: ${defaultDensity.peds}`);
console.log(`  - Random Vehicles: ${defaultDensity.randomVehicles}`);
console.log(`  - Parked Vehicles: ${defaultDensity.parkedVehicles}`);
console.log(`  - Scenario Peds (Internal): ${defaultDensity.scenarioPedsInternal}`);
console.log(`  - Scenario Peds (External): ${defaultDensity.scenarioPedsExternal}`);

if (Config.adminCommand?.enabled) {
  const commandName = Config.adminCommand.commandName || "density";
  const isRestricted = Config.adminCommand.restricted ? true : false;

  RegisterCommand(commandName, (source: number, args: any[]) => {
    if (args.length < 2) {
      const current = (GlobalState.ox_density || defaultDensity) as DensityState;
      const msg = `Usage: /${commandName} [vehicles|peds|randomVehicles|parkedVehicles|scenarioPedsInternal|scenarioPedsExternal|all] [0.0 - 1.0]\n` +
                  `Current: veh=${current.vehicles}, peds=${current.peds}, rndVeh=${current.randomVehicles}, prkVeh=${current.parkedVehicles}, scenInt=${current.scenarioPedsInternal}, scenExt=${current.scenarioPedsExternal}`;
      
      if (source === 0) {
        console.log(msg);
      } else {
        emitNet("chat:addMessage", source, {
          color: [255, 165, 0],
          multiline: true,
          args: ["System", msg]
        });
      }
      return;
    }

    const type = args[0] as string;
    const value = parseFloat(args[1]);

    if (isNaN(value) || value < 0.0 || value > 1.0) {
      const errorMsg = "Invalid value! Must be a float between 0.0 and 1.0.";
      if (source === 0) {
        console.log(errorMsg);
      } else {
        emitNet("chat:addMessage", source, {
          color: [255, 0, 0],
          args: ["System", errorMsg]
        });
      }
      return;
    }

    const currentState = { ...((GlobalState.ox_density || defaultDensity) as DensityState) };

    if (type === "all") {
      currentState.vehicles = value;
      currentState.peds = value;
      currentState.randomVehicles = value;
      currentState.parkedVehicles = value;
      currentState.scenarioPedsInternal = value;
      currentState.scenarioPedsExternal = value;
    } else if (type in currentState) {
      (currentState as any)[type] = value;
    } else {
      const unknownMsg = `Unknown density type: ${type}. Use vehicles, peds, randomVehicles, parkedVehicles, scenarioPedsInternal, scenarioPedsExternal, or all.`;
      if (source === 0) {
        console.log(unknownMsg);
      } else {
        emitNet("chat:addMessage", source, {
          color: [255, 0, 0],
          args: ["System", unknownMsg]
        });
      }
      return;
    }

    // Set the statebag value (automatically replicates to all clients)
    GlobalState.ox_density = currentState;

    const sender = source === 0 ? "Console" : `Player ${source}`;
    const broadcastMsg = `${sender} set '${type}' density to ${value}`;
    
    console.log(`[ox_density] ${broadcastMsg}`);
    emitNet("chat:addMessage", -1, {
      color: [50, 205, 50],
      args: ["Density", broadcastMsg]
    });
  }, isRestricted);
}
