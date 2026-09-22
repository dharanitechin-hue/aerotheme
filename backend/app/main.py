import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.simulator.simulation_controller import SimulationController
from app.api.routes import router as api_router
from app.api.websocket import router as ws_router
from app.api.ai_routes import router as ai_router

# Load GEMINI_API_KEY (and any other secrets) from backend/.env, if present.
load_dotenv()

# Singleton simulation controller for AeroTwin-X
controller = SimulationController(engine_id="ENG-001")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize and start simulation loop in background
    controller.start()
    yield
    # Shutdown simulation loop cleanly
    controller.is_running = False
    if controller._loop_task:
        controller._loop_task.cancel()


app = FastAPI(
    title="AeroTwin-X Live Engine Simulation & Digital Twin API",
    description="Physics-informed, AI-enabled real-time digital twin system for UAV aero piston engines.",
    version="2.0.0",
    lifespan=lifespan
)

# Allow CORS for React frontend (Vite default is 5173, standard 3000, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(api_router)
app.include_router(ws_router)
app.include_router(ai_router)


@app.get("/api/health")
async def health_check():
    return {
        "status": "HEALTHY",
        "engine_id": controller.engine_id,
        "is_running": controller.is_running,
        "is_paused": controller.is_paused,
        "speed_multiplier": controller.speed_multiplier,
        "active_fault": controller.simulator.fault_system.active_fault.value,
        "health_score": controller.simulator.health_score
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
