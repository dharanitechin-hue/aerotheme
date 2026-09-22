import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AeroEngineModel } from './AeroEngineModel.js';

/**
 * EngineScene manages the Three.js canvas, rendering loop,
 * lighting, OrbitControls, camera tweening, and raycasting.
 */
export class EngineScene {
  constructor(container, options = {}) {
    this.container = container;
    this.onSelectComponent = options.onSelectComponent || (() => {});
    this.onHoverComponent = options.onHoverComponent || (() => {});

// Scene setup
this.scene = new THREE.Scene();

// Simulator background
this.scene.background = new THREE.Color(0xdff4f4);

// Keep fog subtle and compatible with the light simulator
this.scene.fog = new THREE.FogExp2(0xdff4f4, 0.018);
    // Camera setup
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.defaultCamPos = new THREE.Vector3(3.8, 3.0, 4.4);
    this.camera.position.copy(this.defaultCamPos);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2.0;
    this.controls.maxDistance = 15.0;
    this.controls.maxPolarAngle = Math.PI - 0.1;
    this.controls.minPolarAngle = 0.1;
    this.controls.target.set(0, 0, 0);

// Coordinate Grid Helper
this.gridHelper = new THREE.GridHelper(
  12,
  24,
  0x8fcaca, // Major grid
  0xb9dddd  // Minor grid
);

this.gridHelper.position.y = -1.6;
this.scene.add(this.gridHelper);

    // Studio 3-point lighting
    this.setupLighting();

    // Instantiate 3D Aero Engine Model
    this.engineModel = new AeroEngineModel();
    this.scene.add(this.engineModel.root);

    // Raycaster for interactive component clicking
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Camera tweening state
    this.isCameraTweening = false;
    this.targetCameraPos = new THREE.Vector3();
    this.targetControlsTarget = new THREE.Vector3();
    this.tweenProgress = 0;

    // Bind listeners
    this.handleResize = this.handleResize.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handleWheelCapture = this.handleWheelCapture.bind(this);

    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    // Keep normal wheel scrolling available over the simulator. Ctrl+wheel is reserved for 3D zoom.
    this.renderer.domElement.addEventListener('wheel', this.handleWheelCapture, { capture: true, passive: true });

    // Animation loop
    this.clock = new THREE.Clock();
    this.isRunning = true;
    this.animate = this.animate.bind(this);
    this.animFrameId = requestAnimationFrame(this.animate);
  }

  setupLighting() {
    // Ambient fill
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    // Key Light (Cool cyan accent from top-front-right)
    const keyLight = new THREE.DirectionalLight(0xe0f2fe, 2.2);
    keyLight.position.set(5, 7, 6);
    this.scene.add(keyLight);

    // Fill Light (Warm engineering fill from opposite side)
    const fillLight = new THREE.DirectionalLight(0x94a3b8, 1.4);
    fillLight.position.set(-6, 3, -4);
    this.scene.add(fillLight);

    // Rim Light (Sharp blue accent edge highlighter)
    const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.8);
    rimLight.position.set(0, -5, -6);
    this.scene.add(rimLight);
  }

  setCameraPreset(presetName) {
    const dist = 5.6;
    const presets = {
      FRONT: new THREE.Vector3(0, 0.2, dist),
      REAR: new THREE.Vector3(0, 0.2, -dist),
      LEFT: new THREE.Vector3(-dist, 0.2, 0),
      RIGHT: new THREE.Vector3(dist, 0.2, 0),
      TOP: new THREE.Vector3(0, dist + 1.0, 0.1),
      BOTTOM: new THREE.Vector3(0, -dist - 1.0, 0.1),
      ISOMETRIC: new THREE.Vector3(3.8, 3.0, 4.4),
      RESET: new THREE.Vector3(3.8, 3.0, 4.4),
    };

    const targetPos = presets[presetName] || presets.ISOMETRIC;
    this.startCameraTween(targetPos, new THREE.Vector3(0, 0, 0));
  }

  startCameraTween(targetPos, targetLookAt) {
    this.targetCameraPos.copy(targetPos);
    this.targetControlsTarget.copy(targetLookAt);
    this.isCameraTweening = true;
    this.tweenProgress = 0;
  }

  setAutoRotate(enabled) {
    this.controls.autoRotate = enabled;
    this.controls.autoRotateSpeed = 1.4;
  }

  setGridVisible(visible) {
    this.gridHelper.visible = visible;
  }

  setCutawayMode(enabled) {
    this.engineModel.setCutawayMode(enabled);
  }

  setExplodedMode(enabled) {
    this.engineModel.setExplodedMode(enabled);
  }

  handleWheelCapture(event) {
    if (!event.ctrlKey) {
      // OrbitControls listens during bubbling; stopping propagation here lets the page scroll normally.
      event.stopImmediatePropagation();
    }
  }

  handlePointerDown(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.engineModel.interactiveMeshes, false);

    if (intersects.length > 0) {
      const selected = intersects[0].object;
      if (selected.userData && selected.userData.isEnginePart) {
        this.onSelectComponent(selected.userData);
      }
    }
  }

  handlePointerMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.engineModel.interactiveMeshes, false);

    if (intersects.length > 0) {
      this.renderer.domElement.style.cursor = 'pointer';
      this.onHoverComponent(intersects[0].object.userData);
    } else {
      this.renderer.domElement.style.cursor = 'grab';
      this.onHoverComponent(null);
    }
  }

  handleResize() {
    if (!this.container) return;
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 500;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  update(telemetryState) {
    this.latestState = telemetryState;
  }

  animate() {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const dt = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Smooth camera tweening (lerp)
    if (this.isCameraTweening) {
      this.tweenProgress += dt * 3.0;
      const t = Math.min(1.0, this.tweenProgress);
      // Smooth step
      const smoothT = t * t * (3 - 2 * t);
      this.camera.position.lerp(this.targetCameraPos, 0.12);
      this.controls.target.lerp(this.targetControlsTarget, 0.12);

      if (this.camera.position.distanceTo(this.targetCameraPos) < 0.05) {
        this.camera.position.copy(this.targetCameraPos);
        this.controls.target.copy(this.targetControlsTarget);
        this.isCameraTweening = false;
      }
    }

    // Update OrbitControls
    this.controls.update();

    // Extract real simulated parameters
    const rpm = this.latestState?.rpm || 0;
    const compStatus = this.latestState?.component_status || {};
    const activeFault = this.latestState?.fault_type || 'NONE';
    const faultSeverity = this.latestState?.fault_severity || 0;

    // Update engine mechanical kinematic animation and fault glows
    this.engineModel.update(dt, rpm, compStatus, activeFault, faultSeverity, elapsedTime);

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.isRunning = false;
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.handleResize);

    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
      this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
      this.renderer.domElement.removeEventListener('wheel', this.handleWheelCapture, { capture: true });
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
    }
  }
}
