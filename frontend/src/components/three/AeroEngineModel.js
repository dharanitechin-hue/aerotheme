import * as THREE from 'three';

/**
 * Procedural Representative 3D Aero Piston Engine Model
 * Represents a 4-cylinder horizontally-opposed aero engine for MALE UAVs.
 * Supports:
 * - Real-time mechanical animation synchronized to RPM
 * - Cutaway mode (translucent casing showing internal pistons & crankshaft)
 * - Exploded view (smooth component separation)
 * - Dynamic 3D fault highlighting (subtle amber/red glow)
 * - Raycast component selection
 */
export class AeroEngineModel {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'AeroEngineRoot';

    // Sub-assemblies for animation and exploded view
    this.crankshaftAssembly = new THREE.Group();
    this.propellerAssembly = new THREE.Group();
    this.pistonAssemblies = [];
    this.connectingRods = [];
    this.cylinderLeftGroup = new THREE.Group();
    this.cylinderRightGroup = new THREE.Group();
    this.exhaustGroup = new THREE.Group();
    this.injectorGroup = new THREE.Group();
    this.oilSystemGroup = new THREE.Group();
    this.casingGroup = new THREE.Group();
    this.sensorGroup = new THREE.Group();

    // Materials library
    this.materials = this.createMaterials();

    // State tracking
    this.rotationAngle = 0;
    this.explodedFactor = 0; // 0 (assembled) to 1 (exploded)
    this.targetExploded = 0;
    this.isCutaway = false;
    this.interactiveMeshes = [];

    // Build the engine geometry
    this.buildModel();
  }

  createMaterials() {
    return {
      casingSolid: new THREE.MeshStandardMaterial({
        color: 0x1f293d,
        metalness: 0.85,
        roughness: 0.35,
      }),
      casingCutaway: new THREE.MeshPhysicalMaterial({
        color: 0x1a2436,
        metalness: 0.3,
        roughness: 0.15,
        transmission: 0.88,
        transparent: true,
        opacity: 0.32,
        ior: 1.45,
      }),
      crankshaft: new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.95,
        roughness: 0.2,
      }),
      piston: new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        metalness: 0.9,
        roughness: 0.25,
      }),
      connectingRod: new THREE.MeshStandardMaterial({
        color: 0x64748b,
        metalness: 0.85,
        roughness: 0.4,
      }),
      cylinderFin: new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.75,
        roughness: 0.45,
      }),
      cylinderHead: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.8,
        roughness: 0.3,
      }),
      exhaust: new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.7,
        roughness: 0.5,
      }),
      injector: new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.9,
        roughness: 0.25,
      }),
      oilSystem: new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.8,
        roughness: 0.35,
      }),
      propeller: new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        metalness: 0.85,
        roughness: 0.3,
      }),
      combustionGlow: new THREE.MeshBasicMaterial({
        color: 0xff4500,
        transparent: true,
        opacity: 0.0,
      }),
      sensor: new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x00f0ff,
        emissiveIntensity: 0.3,
      }),
    };
  }

  tagMesh(mesh, id, name, system) {
    mesh.userData = { id, name, system, isEnginePart: true };
    this.interactiveMeshes.push(mesh);
  }

  buildModel() {
    this.buildCrankcase();
    this.buildCrankshaft();
    this.buildCylindersAndPistons();
    this.buildPropeller();
    this.buildOilSystem();
    this.buildExhaust();
    this.buildFuelInjection();
    this.buildSensors();

    this.root.add(this.casingGroup);
    this.root.add(this.crankshaftAssembly);
    this.root.add(this.cylinderLeftGroup);
    this.root.add(this.cylinderRightGroup);
    this.root.add(this.propellerAssembly);
    this.root.add(this.oilSystemGroup);
    this.root.add(this.exhaustGroup);
    this.root.add(this.injectorGroup);
    this.root.add(this.sensorGroup);
  }

  buildCrankcase() {
    // Main crankcase central block
    const crankcaseGeo = new THREE.BoxGeometry(1.6, 1.2, 2.6);
    this.crankcaseMesh = new THREE.Mesh(crankcaseGeo, this.materials.casingSolid);
    this.crankcaseMesh.position.set(0, 0, 0);
    this.tagMesh(this.crankcaseMesh, 'engine_block', 'Engine Crankcase', 'engine_block');
    this.casingGroup.add(this.crankcaseMesh);

    // Front nose reduction gear casing
    const noseGeo = new THREE.CylinderGeometry(0.45, 0.6, 0.8, 24);
    noseGeo.rotateX(Math.PI / 2);
    const noseMesh = new THREE.Mesh(noseGeo, this.materials.casingSolid);
    noseMesh.position.set(0, 0, 1.6);
    this.tagMesh(noseMesh, 'engine_block', 'Propeller Gearbox Casing', 'engine_block');
    this.casingGroup.add(noseMesh);

    // Rear accessory gearbox
    const rearGeo = new THREE.BoxGeometry(1.4, 1.0, 0.6);
    const rearMesh = new THREE.Mesh(rearGeo, this.materials.casingSolid);
    rearMesh.position.set(0, 0, -1.5);
    this.tagMesh(rearMesh, 'engine_block', 'Accessory Drive Housing', 'engine_block');
    this.casingGroup.add(rearMesh);
  }

  buildCrankshaft() {
    // Central shaft along Z axis
    const shaftGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.8, 20);
    shaftGeo.rotateX(Math.PI / 2);
    const mainShaft = new THREE.Mesh(shaftGeo, this.materials.crankshaft);
    this.tagMesh(mainShaft, 'crankshaft', 'Crankshaft Main Journal', 'crankshaft');
    this.crankshaftAssembly.add(mainShaft);

    // 4 Counterweights and crank pins
    const zOffsets = [0.8, 0.3, -0.3, -0.8];
    const angles = [0, Math.PI, Math.PI, 0];

    this.crankPins = [];

    zOffsets.forEach((z, i) => {
      const webGroup = new THREE.Group();
      webGroup.position.set(0, 0, z);
      webGroup.rotation.z = angles[i];

      // Counterweight sector
      const weightGeo = new THREE.BoxGeometry(0.25, 0.65, 0.15);
      const weightMesh = new THREE.Mesh(weightGeo, this.materials.crankshaft);
      weightMesh.position.set(0, -0.25, 0);
      this.tagMesh(weightMesh, 'crankshaft', `Crank Counterweight ${i + 1}`, 'crankshaft');
      webGroup.add(weightMesh);

      // Crank pin offset
      const pinGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.22, 16);
      pinGeo.rotateX(Math.PI / 2);
      const pinMesh = new THREE.Mesh(pinGeo, this.materials.crankshaft);
      pinMesh.position.set(0, 0.35, 0);
      this.tagMesh(pinMesh, 'crankshaft', `Rod Journal ${i + 1}`, 'crankshaft');
      webGroup.add(pinMesh);

      this.crankshaftAssembly.add(webGroup);
      this.crankPins.push({ group: webGroup, angleOffset: angles[i], zPos: z });
    });
  }

  buildCylindersAndPistons() {
    // 4 Horizontally-opposed cylinders:
    // Cyl 1: Left Front  (X < 0, Z = 0.8)
    // Cyl 2: Right Front (X > 0, Z = 0.3)
    // Cyl 3: Left Rear   (X < 0, Z = -0.3)
    // Cyl 4: Right Rear  (X > 0, Z = -0.8)
    const cylConfigs = [
      { id: 'cylinder_1', name: 'Cylinder 1 (Left Front)', side: -1, z: 0.8, crankIdx: 0 },
      { id: 'cylinder_2', name: 'Cylinder 2 (Right Front)', side: 1, z: 0.3, crankIdx: 1 },
      { id: 'cylinder_3', name: 'Cylinder 3 (Left Rear)', side: -1, z: -0.3, crankIdx: 2 },
      { id: 'cylinder_4', name: 'Cylinder 4 (Right Rear)', side: 1, z: -0.8, crankIdx: 3 },
    ];

    cylConfigs.forEach((cfg) => {
      const parentGroup = cfg.side < 0 ? this.cylinderLeftGroup : this.cylinderRightGroup;

      // Cylinder Barrel with cooling fins
      const cylBarrelGroup = new THREE.Group();
      cylBarrelGroup.position.set(cfg.side * 1.5, 0, cfg.z);

      // Barrel tube
      const barrelGeo = new THREE.CylinderGeometry(0.48, 0.48, 1.2, 24);
      barrelGeo.rotateZ(Math.PI / 2);
      const barrelMesh = new THREE.Mesh(barrelGeo, this.materials.cylinderFin);
      this.tagMesh(barrelMesh, 'cylinder', `${cfg.name} Barrel`, 'cylinder');
      cylBarrelGroup.add(barrelMesh);

      // 6 Cooling Fins
      for (let f = -0.45; f <= 0.45; f += 0.18) {
        const finGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.04, 24);
        finGeo.rotateZ(Math.PI / 2);
        const finMesh = new THREE.Mesh(finGeo, this.materials.cylinderFin);
        finMesh.position.set(cfg.side * f, 0, 0);
        this.tagMesh(finMesh, 'cylinder', `${cfg.name} Cooling Fin`, 'cylinder');
        cylBarrelGroup.add(finMesh);
      }

      // Cylinder Head (outer end)
      const headGeo = new THREE.BoxGeometry(0.5, 0.95, 0.95);
      const headMesh = new THREE.Mesh(headGeo, this.materials.cylinderHead);
      headMesh.position.set(cfg.side * 0.7, 0, 0);
      this.tagMesh(headMesh, 'cylinder', `${cfg.name} Head`, 'cylinder');
      cylBarrelGroup.add(headMesh);

      // Internal Combustion Chamber Glow
      const glowGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const glowMesh = new THREE.Mesh(glowGeo, this.materials.combustionGlow.clone());
      glowMesh.position.set(cfg.side * 0.45, 0, 0);
      cylBarrelGroup.add(glowMesh);

      parentGroup.add(cylBarrelGroup);

      // Reciprocating Piston
      const pistonGroup = new THREE.Group();
      const pistonGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.5, 24);
      pistonGeo.rotateZ(Math.PI / 2);
      const pistonMesh = new THREE.Mesh(pistonGeo, this.materials.piston);
      this.tagMesh(pistonMesh, 'cylinder', `${cfg.name} Piston`, 'cylinder');
      pistonGroup.add(pistonMesh);

      // Connecting Rod
      const rodGeo = new THREE.BoxGeometry(1.0, 0.1, 0.08);
      const rodMesh = new THREE.Mesh(rodGeo, this.materials.connectingRod);
      this.tagMesh(rodMesh, 'crankshaft', `${cfg.name} Connecting Rod`, 'crankshaft');

      this.root.add(pistonGroup);
      this.root.add(rodMesh);

      this.pistonAssemblies.push({
        group: pistonGroup,
        rodMesh,
        glowMesh,
        side: cfg.side,
        z: cfg.z,
        angleOffset: this.crankPins[cfg.crankIdx].angleOffset,
        initialX: cfg.side * 1.3,
      });
    });
  }

  buildPropeller() {
    // Propeller Hub spinner
    const hubGeo = new THREE.ConeGeometry(0.45, 0.8, 24);
    hubGeo.rotateX(Math.PI / 2);
    const hubMesh = new THREE.Mesh(hubGeo, this.materials.propeller);
    hubMesh.position.set(0, 0, 2.3);
    this.tagMesh(hubMesh, 'propeller', 'Propeller Spinner Hub', 'crankshaft');
    this.propellerAssembly.add(hubMesh);

    // 3 Aerodynamic Carbon Propeller Blades
    const bladeGeo = new THREE.BoxGeometry(0.18, 2.4, 0.05);
    for (let b = 0; b < 3; b++) {
      const bladeGroup = new THREE.Group();
      bladeGroup.position.set(0, 0, 2.1);
      bladeGroup.rotation.z = (b * Math.PI * 2) / 3;

      const bladeMesh = new THREE.Mesh(bladeGeo, this.materials.propeller);
      bladeMesh.position.set(0, 1.2, 0);
      bladeMesh.rotation.y = 0.25; // pitch angle
      this.tagMesh(bladeMesh, 'propeller', `Propeller Blade ${b + 1}`, 'crankshaft');
      bladeGroup.add(bladeMesh);

      this.propellerAssembly.add(bladeGroup);
    }
  }

  buildOilSystem() {
    // Lower oil pan / sump
    const sumpGeo = new THREE.BoxGeometry(1.4, 0.45, 2.2);
    const sumpMesh = new THREE.Mesh(sumpGeo, this.materials.oilSystem);
    sumpMesh.position.set(0, -0.75, 0);
    this.tagMesh(sumpMesh, 'oil_system', 'Lubrication Oil Sump Reservoir', 'oil_system');
    this.oilSystemGroup.add(sumpMesh);

    // Oil Filter Canister
    const filterGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 20);
    const filterMesh = new THREE.Mesh(filterGeo, this.materials.oilSystem);
    filterMesh.position.set(0.65, -0.65, -0.9);
    filterMesh.rotation.z = Math.PI / 4;
    this.tagMesh(filterMesh, 'oil_system', 'Pressurized Oil Filter Canister', 'oil_system');
    this.oilSystemGroup.add(filterMesh);

    // High pressure external oil line
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.5, -0.7, -0.6),
      new THREE.Vector3(0.9, -0.4, 0),
      new THREE.Vector3(0.9, 0.3, 0.5),
      new THREE.Vector3(0.6, 0.6, 0.8),
    ]);
    const pipeGeo = new THREE.TubeGeometry(path, 24, 0.05, 12, false);
    const pipeMesh = new THREE.Mesh(pipeGeo, this.materials.oilSystem);
    this.tagMesh(pipeMesh, 'oil_system', 'Main Lubrication Supply Line', 'oil_system');
    this.oilSystemGroup.add(pipeMesh);
  }

  buildExhaust() {
    // 4 Exhaust header pipes converging into dual collector manifolds
    const exhaustCoords = [
      [-1.4, -0.3, 0.8],
      [1.4, -0.3, 0.3],
      [-1.4, -0.3, -0.3],
      [1.4, -0.3, -0.8],
    ];

    exhaustCoords.forEach((coord, i) => {
      const side = coord[0] > 0 ? 1 : -1;
      const pipePath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(coord[0], coord[1], coord[2]),
        new THREE.Vector3(side * 1.1, -0.6, coord[2]),
        new THREE.Vector3(side * 0.8, -0.8, -1.2),
        new THREE.Vector3(side * 0.5, -0.85, -2.0),
      ]);
      const pipeGeo = new THREE.TubeGeometry(pipePath, 20, 0.08, 12, false);
      const pipeMesh = new THREE.Mesh(pipeGeo, this.materials.exhaust);
      this.tagMesh(pipeMesh, 'exhaust', `Exhaust Header ${i + 1}`, 'exhaust');
      this.exhaustGroup.add(pipeMesh);
    });
  }

  buildFuelInjection() {
    // Fuel Rail tube along top
    const railGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 16);
    railGeo.rotateX(Math.PI / 2);
    const railMesh = new THREE.Mesh(railGeo, this.materials.injector);
    railMesh.position.set(0, 0.8, 0);
    this.tagMesh(railMesh, 'injector', 'High-Pressure Fuel Distribution Rail', 'injector');
    this.injectorGroup.add(railMesh);

    // 4 Fuel Injectors branching into intake ports
    const injZ = [0.8, 0.3, -0.3, -0.8];
    const injSides = [-1, 1, -1, 1];

    injZ.forEach((z, i) => {
      const side = injSides[i];
      const injBodyGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.35, 16);
      const injMesh = new THREE.Mesh(injBodyGeo, this.materials.injector);
      injMesh.position.set(side * 0.6, 0.7, z);
      injMesh.rotation.z = side * 0.5;
      this.tagMesh(injMesh, 'injector', `Electronic Fuel Injector ${i + 1}`, 'injector');
      this.injectorGroup.add(injMesh);
    });
  }

  buildSensors() {
    // CHT Thermocouple Probe
    const chtGeo = new THREE.SphereGeometry(0.08, 16, 16);
    this.chtSensorMesh = new THREE.Mesh(chtGeo, this.materials.sensor);
    this.chtSensorMesh.position.set(-1.8, 0.3, 0.8);
    this.tagMesh(this.chtSensorMesh, 'sensors', 'CHT Thermocouple Probe', 'sensors');
    this.sensorGroup.add(this.chtSensorMesh);

    // EGT Thermocouple Probe
    const egtGeo = new THREE.SphereGeometry(0.08, 16, 16);
    this.egtSensorMesh = new THREE.Mesh(egtGeo, this.materials.sensor);
    this.egtSensorMesh.position.set(-0.6, -0.85, -1.8);
    this.tagMesh(this.egtSensorMesh, 'sensors', 'EGT Exhaust Thermocouple', 'sensors');
    this.sensorGroup.add(this.egtSensorMesh);

    // Oil Pressure & Temp Transducer
    const oilSensorGeo = new THREE.BoxGeometry(0.14, 0.14, 0.18);
    this.oilSensorMesh = new THREE.Mesh(oilSensorGeo, this.materials.sensor);
    this.oilSensorMesh.position.set(0.7, -0.65, -0.6);
    this.tagMesh(this.oilSensorMesh, 'sensors', 'Oil Pressure / Temp Transducer', 'sensors');
    this.sensorGroup.add(this.oilSensorMesh);

    // Vibration Triaxial Accelerometer
    const vibGeo = new THREE.ConeGeometry(0.08, 0.16, 16);
    this.vibSensorMesh = new THREE.Mesh(vibGeo, this.materials.sensor);
    this.vibSensorMesh.position.set(0, 0.68, 0.2);
    this.tagMesh(this.vibSensorMesh, 'sensors', 'Engine Vibration Accelerometer', 'sensors');
    this.sensorGroup.add(this.vibSensorMesh);
  }

  setCutawayMode(enabled) {
    this.isCutaway = enabled;
    const mat = enabled ? this.materials.casingCutaway : this.materials.casingSolid;
    this.casingGroup.traverse((child) => {
      if (child.isMesh) child.material = mat;
    });
  }

  setExplodedMode(enabled) {
    this.targetExploded = enabled ? 1.0 : 0.0;
  }

  updateExplodedTransition(dt) {
    if (Math.abs(this.explodedFactor - this.targetExploded) > 0.001) {
      this.explodedFactor += (this.targetExploded - this.explodedFactor) * Math.min(1.0, dt * 4.0);

      // Separate Left Cylinders outward (-X)
      this.cylinderLeftGroup.position.x = -this.explodedFactor * 1.2;
      // Separate Right Cylinders outward (+X)
      this.cylinderRightGroup.position.x = this.explodedFactor * 1.2;
      // Separate Injectors upward (+Y)
      this.injectorGroup.position.y = this.explodedFactor * 0.9;
      // Separate Oil Sump downward (-Y)
      this.oilSystemGroup.position.y = -this.explodedFactor * 0.8;
      // Separate Exhaust backward (-Z)
      this.exhaustGroup.position.z = -this.explodedFactor * 0.9;
      // Propeller forward (+Z)
      this.propellerAssembly.position.z = this.explodedFactor * 1.0;
    }
  }

  updateFaultHighlighting(componentStatus, activeFault, faultSeverity, time) {
    const getEmissive = (status) => {
      if (status === 'CRITICAL') {
        const pulse = 0.4 + 0.4 * Math.sin(time * 8.0);
        return { color: 0xef4444, intensity: pulse };
      }
      if (status === 'WARNING') {
        return { color: 0xf59e0b, intensity: 0.45 };
      }
      return { color: 0x000000, intensity: 0.0 };
    };

    // Apply highlighting by subsystem
    const statusMap = componentStatus || {};

    const applyToGroup = (group, statusKey) => {
      const e = getEmissive(statusMap[statusKey] || 'NORMAL');
      group.traverse((child) => {
        if (child.isMesh && child.material.emissive) {
          if (child.userData.id !== 'sensors') {
            child.material.emissive.setHex(e.color);
            child.material.emissiveIntensity = e.intensity;
          }
        }
      });
    };

    applyToGroup(this.casingGroup, 'engine_block');
    applyToGroup(this.crankshaftAssembly, 'crankshaft');
    applyToGroup(this.cylinderLeftGroup, 'cylinder');
    applyToGroup(this.cylinderRightGroup, 'cylinder');
    applyToGroup(this.oilSystemGroup, 'oil_system');
    applyToGroup(this.exhaustGroup, 'exhaust');
    applyToGroup(this.injectorGroup, 'injector');

    // Specific highlight when fault is active
    if (activeFault === 'LUBRICATION_DEGRADATION' && faultSeverity > 0.2) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 6.0);
      this.oilSystemGroup.traverse((c) => {
        if (c.isMesh && c.material.emissive) {
          c.material.emissive.setHex(0xef4444);
          c.material.emissiveIntensity = pulse;
        }
      });
    }
  }

  update(dt, rpm, componentStatus, activeFault, faultSeverity, time) {
    // 1. Mechanical rotation angle advancement
    if (rpm > 20) {
      // (rpm / 60) * 2 * PI = radians per second
      const radPerSec = (rpm / 60) * Math.PI * 2;
      this.rotationAngle = (this.rotationAngle + radPerSec * dt) % (Math.PI * 2);
    }

    // 2. Rotate Crankshaft and Propeller
    this.crankshaftAssembly.rotation.z = this.rotationAngle;
    this.propellerAssembly.rotation.z = this.rotationAngle;

    // 3. Piston kinematics (harmonic reciprocating motion along X)
    const crankRadius = 0.35;
    const rodLength = 1.0;

    this.pistonAssemblies.forEach((p, idx) => {
      const theta = this.rotationAngle + p.angleOffset;
      // Slider-crank formula: x = r * cos(theta) + sqrt(l^2 - r^2 * sin^2(theta))
      const crankOffset = crankRadius * Math.cos(theta);
      const underSqrt = Math.max(0, rodLength * rodLength - Math.pow(crankRadius * Math.sin(theta), 2));
      const displacement = crankOffset + Math.sqrt(underSqrt);

      // Piston moves horizontally from center along side (-1 or +1)
      const pistonX = p.side * (displacement * 0.5 + 0.7);
      p.group.position.set(pistonX, 0, p.z);

      // Connecting rod connects crankpin to piston
      const crankPinX = crankRadius * Math.sin(theta);
      const crankPinY = crankRadius * Math.cos(theta);
      const rodMidX = (crankPinX + pistonX) / 2;
      const rodMidY = crankPinY / 2;

      p.rodMesh.position.set(rodMidX, rodMidY, p.z);
      const rodAngle = Math.atan2(crankPinY, pistonX - crankPinX);
      p.rodMesh.rotation.z = rodAngle;

      // 4-Stroke Combustion Flash on expansion stroke
      // Cycle: 720 degrees. Flash near top dead center (TDC) of power stroke
      const cycleAngle = ((this.rotationAngle * 2 + idx * Math.PI) % (Math.PI * 4));
      if (cycleAngle < 0.6 && rpm > 300) {
        p.glowMesh.material.opacity = 0.75;
      } else {
        p.glowMesh.material.opacity = Math.max(0, p.glowMesh.material.opacity - dt * 6.0);
      }
    });

    // 4. Update smooth exploded view transitions
    this.updateExplodedTransition(dt);

    // 5. Update subtle fault emission highlights
    this.updateFaultHighlighting(componentStatus, activeFault, faultSeverity, time);
  }
}
