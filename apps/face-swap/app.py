import os
import uuid
import asyncio
import json
import time
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
import aiofiles
import psutil

app = FastAPI(title="FaceSwap Studio")

BASE_DIR = Path(__file__).parent
UPLOADS_DIR = BASE_DIR / "uploads"
OUTPUTS_DIR = BASE_DIR / "outputs"
MODELS_DIR = BASE_DIR / "models"
STATIC_DIR = BASE_DIR / "static"

for d in [UPLOADS_DIR, OUTPUTS_DIR, MODELS_DIR]:
    d.mkdir(exist_ok=True)

# Global job tracker
jobs: dict[str, dict] = {}

# Lazy-loaded face swapper
_face_app = None
_swapper = None


def get_face_analyzer():
    global _face_app
    if _face_app is None:
        import insightface
        _face_app = insightface.app.FaceAnalysis(
            name="buffalo_l",
            root=str(MODELS_DIR),
            providers=["CPUExecutionProvider"],
        )
        _face_app.prepare(ctx_id=-1, det_size=(640, 640))
    return _face_app


def get_swapper():
    global _swapper
    if _swapper is None:
        import insightface
        model_path = MODELS_DIR / "inswapper_128.onnx"
        if not model_path.exists():
            raise FileNotFoundError(
                "Model file not found. Download inswapper_128.onnx and place it in the models/ folder."
            )
        _swapper = insightface.model_zoo.get_model(
            str(model_path),
            providers=["CPUExecutionProvider"],
        )
    return _swapper


def get_source_face(image_path: str):
    face_app = get_face_analyzer()
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Cannot read source image")
    faces = face_app.get(img)
    if not faces:
        raise ValueError("No face detected in source image")
    return sorted(faces, key=lambda x: x.bbox[2] - x.bbox[0], reverse=True)[0]


def swap_faces_in_frame(frame: np.ndarray, source_face, target_faces) -> np.ndarray:
    swapper = get_swapper()
    result = frame.copy()
    for face in target_faces:
        result = swapper.get(result, face, source_face, paste_back=True)
    return result


def process_image(job_id: str, source_path: str, target_path: str, output_path: str):
    jobs[job_id]["status"] = "processing"
    jobs[job_id]["progress"] = 10

    try:
        source_face = get_source_face(source_path)
        jobs[job_id]["progress"] = 30

        face_app = get_face_analyzer()
        target_img = cv2.imread(target_path)
        if target_img is None:
            raise ValueError("Cannot read target image")

        jobs[job_id]["progress"] = 50
        target_faces = face_app.get(target_img)
        if not target_faces:
            raise ValueError("No faces detected in target image")

        jobs[job_id]["progress"] = 70
        result = swap_faces_in_frame(target_img, source_face, target_faces)

        jobs[job_id]["progress"] = 90
        cv2.imwrite(output_path, result)
        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["output"] = os.path.basename(output_path)

    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)


def process_video(job_id: str, source_path: str, target_path: str, output_path: str):
    jobs[job_id]["status"] = "processing"
    jobs[job_id]["progress"] = 0

    try:
        source_face = get_source_face(source_path)
        face_app = get_face_analyzer()

        cap = cv2.VideoCapture(target_path)
        if not cap.isOpened():
            raise ValueError("Cannot open video file")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            target_faces = face_app.get(frame)
            if target_faces:
                frame = swap_faces_in_frame(frame, source_face, target_faces)

            out.write(frame)
            frame_idx += 1

            if total_frames > 0:
                jobs[job_id]["progress"] = int((frame_idx / total_frames) * 100)
            jobs[job_id]["frames_done"] = frame_idx
            jobs[job_id]["total_frames"] = total_frames

        cap.release()
        out.release()

        # Re-encode with ffmpeg for browser compatibility
        tmp_path = output_path.replace(".mp4", "_tmp.mp4")
        os.rename(output_path, tmp_path)
        ret_code = os.system(
            f'ffmpeg -i "{tmp_path}" -c:v libx264 -preset fast -crf 23 -c:a copy "{output_path}" -y -loglevel error'
        )
        if ret_code == 0 and os.path.exists(output_path):
            os.remove(tmp_path)
        else:
            os.rename(tmp_path, output_path)

        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["output"] = os.path.basename(output_path)

    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
    finally:
        try:
            cap.release()
        except Exception:
            pass


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", response_class=HTMLResponse)
async def root():
    html_path = STATIC_DIR / "index.html"
    async with aiofiles.open(html_path, "r") as f:
        return await f.read()


@app.post("/upload/source")
async def upload_source(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}:
        raise HTTPException(400, "Source must be an image (jpg, png, webp, bmp)")

    file_id = str(uuid.uuid4())
    save_path = UPLOADS_DIR / f"source_{file_id}{ext}"

    async with aiofiles.open(save_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    return {"file_id": file_id, "filename": file.filename, "path": str(save_path)}


@app.post("/upload/target")
async def upload_target(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    allowed = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".mp4", ".avi", ".mov", ".mkv", ".webm"}
    if ext not in allowed:
        raise HTTPException(400, "Unsupported file type")

    file_id = str(uuid.uuid4())
    save_path = UPLOADS_DIR / f"target_{file_id}{ext}"

    async with aiofiles.open(save_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            await f.write(chunk)

    is_video = ext in {".mp4", ".avi", ".mov", ".mkv", ".webm"}
    return {
        "file_id": file_id,
        "filename": file.filename,
        "path": str(save_path),
        "is_video": is_video,
    }


@app.post("/swap")
async def swap(
    background_tasks: BackgroundTasks,
    source_path: str = "",
    target_path: str = "",
    is_video: bool = False,
):
    if not source_path or not os.path.exists(source_path):
        raise HTTPException(400, "Invalid source file")
    if not target_path or not os.path.exists(target_path):
        raise HTTPException(400, "Invalid target file")

    job_id = str(uuid.uuid4())
    ext = ".mp4" if is_video else ".jpg"
    output_path = str(OUTPUTS_DIR / f"result_{job_id}{ext}")

    jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "output": None,
        "error": None,
        "is_video": is_video,
        "created_at": time.time(),
    }

    if is_video:
        background_tasks.add_task(process_video, job_id, source_path, target_path, output_path)
    else:
        background_tasks.add_task(process_image, job_id, source_path, target_path, output_path)

    return {"job_id": job_id}


@app.get("/job/{job_id}")
async def get_job(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    return jobs[job_id]


@app.get("/download/{filename}")
async def download(filename: str):
    file_path = OUTPUTS_DIR / filename
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    media_type = "video/mp4" if filename.endswith(".mp4") else "image/jpeg"
    return FileResponse(str(file_path), media_type=media_type, filename=filename)


@app.get("/system")
async def system_info():
    import shutil

    disk = shutil.disk_usage(str(BASE_DIR))
    return {
        "cpu_percent": psutil.cpu_percent(interval=0.5),
        "ram_percent": psutil.virtual_memory().percent,
        "ram_used_gb": round(psutil.virtual_memory().used / 1e9, 1),
        "ram_total_gb": round(psutil.virtual_memory().total / 1e9, 1),
        "disk_free_gb": round(disk.free / 1e9, 1),
        "gpu": "CPU mode",
        "model_ready": (MODELS_DIR / "inswapper_128.onnx").exists(),
    }


@app.delete("/cleanup")
async def cleanup_old_files():
    cutoff = time.time() - 3600
    removed = 0
    for d in [UPLOADS_DIR, OUTPUTS_DIR]:
        for f in d.iterdir():
            if f.is_file() and f.stat().st_mtime < cutoff:
                f.unlink()
                removed += 1
    return {"removed": removed}
