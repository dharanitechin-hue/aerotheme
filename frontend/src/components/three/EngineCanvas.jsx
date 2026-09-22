import React, { useEffect, useRef, useState } from 'react';
import { EngineScene } from './EngineScene.js';
import { Rotate3D, Box, Maximize2, Minimize2, Grid3X3, MousePointer2 } from 'lucide-react';

export default function EngineCanvas({ state, isRunning }) {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [grid, setGrid] = useState(true);
  const [cutaway, setCutaway] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!hostRef.current) return;
    const scene = new EngineScene(hostRef.current, {
      onSelectComponent: setSelected,
      onHoverComponent: setHovered,
    });
    sceneRef.current = scene;
    return () => scene.destroy();
  }, []);

  useEffect(() => {
    sceneRef.current?.update(state);
  }, [state]);

  useEffect(() => {
    sceneRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  useEffect(() => {
    sceneRef.current?.setGridVisible(grid);
  }, [grid]);

  useEffect(() => {
    sceneRef.current?.setCutawayMode(cutaway);
  }, [cutaway]);

  useEffect(() => {
    sceneRef.current?.setExplodedMode(exploded);
  }, [exploded]);

  const preset = (name) => sceneRef.current?.setCameraPreset(name);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await hostRef.current?.parentElement?.requestFullscreen?.();
      setFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  const fault = state?.fault_type && state.fault_type !== 'NONE' ? state.fault_type : null;
  const rpm = Number(state?.rpm || 0);

  return (
    <section className="engine-card">
      <div className="engine-card-head">
        <div>
          <div className="eyebrow"><span className="status-dot" /> DIGITAL TWIN / 3D ENGINE VIEW</div>
          <h2>Representative Aero Piston Engine</h2>
          <p>Prototype Digital Twin · Interactive engineering visualization</p>
        </div>
        <div className="engine-head-metrics">
          <div><span>RPM</span><strong>{rpm.toFixed(0)}</strong></div>
          <div><span>STATE</span><strong>{state?.engine_state || 'OFF'}</strong></div>
          <div><span>SYNC</span><strong className={state ? 'ok' : 'warn'}>{state ? 'SYNCED' : 'WAITING'}</strong></div>
        </div>
      </div>

      <div className={`engine-viewport ${fullscreen ? 'viewport-fullscreen' : ''}`}>
        <div ref={hostRef} className="three-host" />

        <div className="viewport-label top-left">
          <span>LIVE 3D KINEMATICS</span>
          <small>BACKEND RPM LINKED</small>
        </div>
        <div className="viewport-label top-right">
          <span className={fault ? 'fault-text' : ''}>{fault || 'SYSTEM NOMINAL'}</span>
          <small>{isRunning ? 'MECHANICAL MODEL ACTIVE' : 'ENGINE STANDBY'}</small>
        </div>
        <div className="viewport-crosshair" />

        <div className="camera-bar">
          {['FRONT','REAR','LEFT','RIGHT','TOP','BOTTOM','ISOMETRIC','RESET'].map((p) => (
            <button key={p} onClick={() => preset(p)}>{p}</button>
          ))}
        </div>

        <div className="viewport-controls">
          <button className={autoRotate ? 'active' : ''} onClick={() => setAutoRotate(v => !v)} title="Automatic camera orbit"><Rotate3D size={15}/> ORBIT</button>
          <button className={cutaway ? 'active' : ''} onClick={() => setCutaway(v => !v)} title="Cutaway mode"><Box size={15}/> CUTAWAY</button>
          <button className={exploded ? 'active' : ''} onClick={() => setExploded(v => !v)} title="Exploded engineering view"><Box size={15}/> EXPLODE</button>
          <button className={grid ? 'active' : ''} onClick={() => setGrid(v => !v)} title="Toggle engineering grid"><Grid3X3 size={15}/></button>
          <button onClick={toggleFullscreen} title="Fullscreen"><Maximize2 size={15}/></button>
        </div>

        <div className="interaction-hint"><MousePointer2 size={13}/> Drag rotate · Wheel zoom · Right-drag pan</div>

        {hovered && !selected && (
          <div className="component-hover">{hovered.name}</div>
        )}

        {selected && (
          <aside className="inspection-panel">
            <div className="inspection-kicker">COMPONENT INSPECTION</div>
            <h3>{selected.name}</h3>
            <div className="inspection-row"><span>Subsystem</span><b>{selected.system || 'ENGINE'}</b></div>
            <div className="inspection-row"><span>Condition</span><b className="ok">{state?.component_status?.[selected.system] || 'NORMAL'}</b></div>
            <div className="inspection-row"><span>RPM</span><b>{rpm.toFixed(0)}</b></div>
            <button className="inspection-close" onClick={() => setSelected(null)}>CLOSE INSPECTION</button>
          </aside>
        )}
      </div>

      <div className="engine-card-foot">
        <span>MODEL STATUS <b className={isRunning ? 'ok' : 'muted'}>{isRunning ? 'RUNNING' : 'STANDBY'}</b></span>
        <span>FAULT LINK <b className={fault ? 'fault-text' : 'ok'}>{fault || 'NONE'}</b></span>
        <span>3D FPS TARGET <b>60</b></span>
      </div>
    </section>
  );
}
