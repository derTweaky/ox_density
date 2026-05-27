# ox_density

A high-performance vehicle and pedestrian density controller for FiveM. Written in TypeScript and powered by `ox_lib` and server-authoritative State Bags (`GlobalState`).

---

## Features

- **⚡ Maximum Performance:** 
  - Dynamic tick management: The client-side thread loop only runs at `0ms` (every frame) when custom density settings are active. If density multipliers are at default (`1.0`), the frame tick is automatically cleared, saving CPU resources.
  - Periodic asynchonous checks for ambient constraints (dispatch, cop spawning, trains, boats) running on a slow 5-second interval instead of every frame.
- **🌐 Server-Authoritative Sync:**
  - Uses `GlobalState.ox_density` (State Bags) to instantly sync multipliers from the server to all clients.
- **📍 Localized Density Zones:**
  - Define custom box/sphere zones using `ox_lib` zone classes.
  - Automatically overrides density multipliers when entering a zone, and restores global density upon exiting.
  - Uses a stack-based tracker to handle overlapping zones bug-free.
- **👑 Admin Commands:**
  - Command `/density [type] [value]` to dynamically change traffic/pedestrian levels server-wide on the fly (requires administrator permissions).

---

## Installation

### Prerequisites
- FiveM Server with **OneSync** enabled.
- **[ox_lib](https://github.com/overextended/ox_lib)** resource.
- **[Bun](https://bun.sh)** installed on your machine.

### Build Instructions
1. Clone or copy this resource into your server's `resources` directory.
2. Open your terminal in the `ox_density` folder and install dependencies:
   ```bash
   bun install
   ```
3. Compile the resource:
   ```bash
   bun run build
   ```

### server.cfg Configuration
Add the following to your server configuration file:
```cfg
ensure ox_lib
ensure ox_density

# Optional: Grant permissions for the admin density command
add_ace group.admin command.density allow
```

---

## Configuration (`public/config.json`)

Configure your server-wide settings in `public/config.json`. After modification, make sure to compile the resource again (`npm run build`) to update the active configuration in the build directory.

```json
{
  "globalDensity": {
    "vehicles": 0.5,
    "peds": 0.5,
    "randomVehicles": 0.5,
    "parkedVehicles": 0.5,
    "scenarioPedsInternal": 0.5,
    "scenarioPedsExternal": 0.5
  },
  "disableDispatch": true,
  "disableCops": true,
  "disableBoats": true,
  "disableTrains": true,
  "disableGarbageTrucks": true,
  "budgets": {
    "pedPopulation": 2,
    "vehiclePopulation": 2
  },
  "enableZones": true,
  "zones": [
    {
      "name": "legion_square_high_density",
      "type": "box",
      "coords": [150.0, -1000.0, 30.0],
      "size": [150.0, 150.0, 50.0],
      "rotation": 0.0,
      "density": {
        "vehicles": 0.8,
        "peds": 0.9,
        "randomVehicles": 0.8,
        "parkedVehicles": 0.7,
        "scenarioPedsInternal": 0.9,
        "scenarioPedsExternal": 0.9
      }
    }
  ],
  "adminCommand": {
    "enabled": true,
    "commandName": "density",
    "restricted": "group.admin"
  }
}
```

### Configuration Options:
- **`globalDensity`**: Multipliers applied globally when not inside any zone. Range: `0.0` (disabled) to `1.0` (GTA V default).
- **`disableDispatch`**: Disables the ambient police, SWAT, EMS, and fire department dispatch services.
- **`disableCops`**: Stops random cops/cop cars from spawning.
- **`disableBoats` / `disableTrains` / `disableGarbageTrucks`**: Stops ambient boats, trains/trams, and garbage trucks from spawning.
- **`budgets`**: Controls FiveM budgets (`0` to `3`) for pedestrian and vehicle population.
- **`zones`**: Overrides multipliers within defined boundaries.
  - Supports `box` (requires `size` and `rotation`) and `sphere` (requires `radius`) shapes.
- **`adminCommand`**:
  - `enabled`: Toggle command registration.
  - `commandName`: Command name (default: `density`).
  - `restricted`: Restricts command to the specified ACE group.

---

## Commands

### `/density [type] [value]`
Allows administrators to adjust multipliers dynamically.
- **`type`**: `vehicles` | `peds` | `randomVehicles` | `parkedVehicles` | `scenarioPedsInternal` | `scenarioPedsExternal` | `all`
- **`value`**: A float number between `0.0` and `1.0`.

*Example:* `/density all 0.0` (removes all peds and traffic server-wide)
