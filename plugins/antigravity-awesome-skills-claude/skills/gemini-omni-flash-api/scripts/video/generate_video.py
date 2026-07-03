#!/usr/bin/env python3
"""
Generates and edits videos using the Gemini Omni Flash model via the google-genai Interactions API.
Can automatically upload local media references using the Files API.
Supports parallel execution of multiple generations using Python standard library.
Uses the official google-genai SDK.
"""

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
import urllib.parse
import uuid
from google import genai

# Load local upload helper logic inline to prevent dependency issues
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from upload_file import upload_file, wait_for_active
from pathlib import Path


def safe_user_path(path_value, base_dir="."):
    """Resolve a CLI path under the current workspace."""
    if base_dir != ".":
        raise ValueError("Custom base directories are not supported for CLI paths")
    base_path = Path.cwd().resolve()
    resolved_path = Path(path_value).expanduser().resolve()
    try:
        resolved_path.relative_to(base_path)
    except ValueError as exc:
        raise ValueError(f"Path escapes allowed directory: {path_value}") from exc
    return resolved_path

def get_api_key(args):
    """Retrieves API key from command args or environment."""
    if args.api_key:
        return args.api_key
    return os.environ.get("GEMINI_API_KEY")

FILE_ID_RE = re.compile(r'^[A-Za-z0-9_-]+$')


def extract_file_id(uri):
    """Returns a Gemini File API id from a local reference or trusted API URL."""
    if not uri:
        return None
    if uri.startswith("files/"):
        file_id = uri.removeprefix("files/")
        return file_id if FILE_ID_RE.fullmatch(file_id) else None

    parsed = urllib.parse.urlparse(uri)
    if parsed.scheme != "https" or parsed.netloc != "generativelanguage.googleapis.com":
        return None
    path_match = re.fullmatch(r'/files/([A-Za-z0-9_-]+)', parsed.path)
    return path_match.group(1) if path_match else None


def is_file_uri(uri):
    """Returns True if the string is a standard Gemini File URI."""
    return extract_file_id(uri) is not None

def normalize_file_uri(uri):
    """Normalizes any File API URI/reference to the standard https://generativelanguage.googleapis.com/files/{id} format."""
    file_id = extract_file_id(uri)
    if file_id:
        return f"https://generativelanguage.googleapis.com/files/{file_id}"
    return uri


def media_download_url(file_uri):
    """Build a media URL only for validated Gemini File API references."""
    file_id = extract_file_id(file_uri)
    if not file_id:
        raise ValueError("Generated video URI must be a Gemini File API reference.")
    return f"https://generativelanguage.googleapis.com/files/{file_id}?alt=media"

def slugify(text):
    """Converts a text prompt into a safe, descriptive filename slug."""
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '_', text)
    return text.strip('_')[:50]

def parse_and_validate_duration(value):
    """Parses and formats a duration integer between 3 and 10 with optional 's' suffix."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        val = float(value)
    else:
        clean_value = str(value).strip().lower()
        if clean_value in ('none', ''):
            return None
        if clean_value.endswith('s'):
            clean_value = clean_value[:-1]
        try:
            val = float(clean_value)
        except ValueError:
            raise ValueError(f"Invalid duration value: '{value}'. Must be an integer (e.g., 5, 10).")

    if not val.is_integer():
        raise ValueError(f"Duration must be an integer, not a float (e.g., got {value}).")

    val_int = int(val)
    if val_int < 3 or val_int > 10:
        raise ValueError(f"Duration must be between 3 (inclusive) and 10 (inclusive) seconds. Got {val_int}.")

    return f"{val_int}s"

def argparse_duration_type(value):
    """argparse type converter for validating duration."""
    if value is None or str(value).strip().lower() in ('none', ''):
        return None
    try:
        return parse_and_validate_duration(value)
    except ValueError as e:
        raise argparse.ArgumentTypeError(str(e))

def resolve_or_upload_asset(asset_path, mime_type, api_key, strip_audio=False):
    """
    If asset_path is a File API URI, returns it directly (normalized).
    If it is a local file path, uploads it and returns its File API URI (normalized).
    """
    if not asset_path:
        return None, None

    if is_file_uri(asset_path):
        normalized = normalize_file_uri(asset_path)
        print(f"Using existing File URI: {normalized}")
        if strip_audio:
            print("Warning: --strip-audio was specified but the video input is an existing remote File URI. "
                  "Audio cannot be stripped from remote files automatically.")
        return normalized, mime_type

    if os.path.exists(asset_path):
        upload_path = asset_path
        temp_stripped_path = None

        if strip_audio:
            print(f"Detected local asset path '{asset_path}'. Stripping audio before upload...")

            # Check if ffmpeg is available
            import subprocess
            try:
                subprocess.run(["ffmpeg", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            except (subprocess.SubprocessError, FileNotFoundError):
                raise RuntimeError(
                    "Error: ffmpeg is not installed or not found in system PATH. "
                    "ffmpeg is required to strip audio from local videos."
                )

            try:
                os.makedirs("media", exist_ok=True)
                base_name = os.path.basename(asset_path)
                name, ext = os.path.splitext(base_name)
                temp_stripped_path = os.path.join("media", f"temp_stripped_{name}_{uuid.uuid4().hex}{ext}")

                # Fast stream-copy audio stripping
                cmd = ["ffmpeg", "-y", "-i", asset_path, "-c:v", "copy", "-an", temp_stripped_path]
                subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

                print(f"Successfully stripped audio. Temporary video file created at: {temp_stripped_path}")
                upload_path = temp_stripped_path
            except Exception as e:
                print(f"Error stripping audio using ffmpeg: {e}", file=sys.stderr)
                print("Falling back to uploading the original video with audio.", file=sys.stderr)

        print(f"Uploading asset '{upload_path}'...")
        file_meta = upload_file(upload_path, api_key=api_key)
        file_name = file_meta.get("name")
        # Wait for file to become active
        file_meta = wait_for_active(file_name, api_key)
        normalized = normalize_file_uri(file_meta.get("uri"))

        # Clean up temporary stripped file if we created one
        if temp_stripped_path and os.path.exists(temp_stripped_path):
            try:
                safe_user_path(temp_stripped_path).unlink()
                print(f"Cleaned up temporary video file: {temp_stripped_path}")
            except Exception as e:
                print(f"Warning: Failed to remove temporary file {temp_stripped_path}: {e}", file=sys.stderr)

        # Handle both mimeType and mime_type key formats returned from upload_file
        returned_mime = file_meta.get("mimeType") or file_meta.get("mime_type")
        return normalized, returned_mime
    else:
        raise FileNotFoundError(f"Asset path '{asset_path}' is neither a valid File API URI nor a local file path.")

def download_video_file(file_uri, output_path, api_key):
    """Downloads generated video file from URI using alt=media standard in a memory-safe, chunked manner."""
    download_url = media_download_url(file_uri)

    print(f"Downloading video from {file_uri} to {output_path} in chunked mode...")
    req = urllib.request.Request(download_url)
    req.add_header("x-goog-api-key", api_key)

    try:
        with urllib.request.urlopen(req, timeout=480) as resp:
            parent_dir = os.path.dirname(output_path)
            if parent_dir:
                os.makedirs(parent_dir, exist_ok=True)

            with safe_user_path(output_path).open("wb") as f:
                while True:
                    chunk = resp.read(8192)
                    if not chunk:
                        break
                    f.write(chunk)
        print(f"Video successfully saved to: {output_path}")
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Error downloading video file: {e.code} - {e.read().decode()}")

def generate_video(prompt, api_key, model="gemini-omni-flash-preview", aspect_ratio="16:9", duration=None, image_path=None, video_path=None, output_path="output.mp4", strip_audio=False, previous_interaction_id=None):
    """Creates an interaction with the video model and downloads the resulting video using the official google-genai SDK."""
    duration = parse_and_validate_duration(duration)
    input_parts = []

    # 1. Resolve and add image inputs (reference/start/end frames)
    if image_path:
        if isinstance(image_path, list):
            for path in image_path:
                img_uri, img_mime = resolve_or_upload_asset(path, "image/png", api_key)
                input_parts.append({
                    "type": "image",
                    "uri": img_uri,
                    "mime_type": img_mime
                })
        else:
            img_uri, img_mime = resolve_or_upload_asset(image_path, "image/png", api_key)
            input_parts.append({
                "type": "image",
                "uri": img_uri,
                "mime_type": img_mime
            })

    # 2. Resolve and add video inputs (for edits or extensions)
    if video_path:
        if isinstance(video_path, list):
            for path in video_path:
                vid_uri, vid_mime = resolve_or_upload_asset(path, "video/mp4", api_key, strip_audio=strip_audio)
                input_parts.append({
                    "type": "video",
                    "uri": vid_uri,
                    "mime_type": vid_mime
                })
        else:
            vid_uri, vid_mime = resolve_or_upload_asset(video_path, "video/mp4", api_key, strip_audio=strip_audio)
            input_parts.append({
                "type": "video",
                "uri": vid_uri,
                "mime_type": vid_mime
            })

    # 3. Add text prompt
    input_parts.append({
        "type": "text",
        "text": prompt
    })

    # Construct the config
    video_config = {
        "type": "video",
        "aspect_ratio": aspect_ratio,
        "delivery": "uri"
    }
    if duration:
        video_config["duration"] = duration

    print(f"\nSending generation request using official google-genai SDK and model '{model}'...")
    print(f"Prompt: '{prompt}' | Aspect Ratio: {aspect_ratio} | Duration: {duration}")

    # Initialize the client and call interactions.create
    client = genai.Client(api_key=api_key)
    try:
        interaction = client.interactions.create(
            model=model,
            input=input_parts,
            response_format=video_config,
            previous_interaction_id=previous_interaction_id
        )
    except Exception as e:
        raise RuntimeError(f"Error generating video via SDK: {e}")

    print(f"Generation complete for '{prompt}'! Processing response...")

    interaction_id = interaction.id
    if interaction_id:
        print(f"Interaction ID: {interaction_id}")

    output_video = interaction.output_video
    if not output_video or not output_video.uri:
        err_msg = f"No video content found in response for '{prompt}'."
        if video_path:
            err_msg += (
                "\nWARNING: IMPORTANT REGIONAL RESTRICTION: Uploading videos to use for video edits is "
                "not available in the EEA, Switzerland, United Kingdom, and some US states."
            )
        raise RuntimeError(f"{err_msg}\nResponse output_video field: {output_video}")

    video_uri = output_video.uri
    print(f"Generated video URI for '{prompt}': {video_uri}")

    # Download the final video
    download_video_file(video_uri, output_path, api_key)

def run_job(job, api_key):
    """Runs a single generation job inside a thread pool, catching exceptions."""
    prompt = job.get("prompt")
    if not prompt:
        print("Warning: Skipping job with empty prompt.", file=sys.stderr)
        return {"job": job, "status": "SKIPPED", "error": "Empty prompt"}

    aspect_ratio = job.get("aspect_ratio", "16:9")
    duration = job.get("duration")
    image_path = job.get("image")
    video_path = job.get("video")
    output_path = job.get("output")
    model = job.get("model", "gemini-omni-flash-preview")
    strip_audio = job.get("strip_audio", False)
    previous_interaction_id = job.get("previous_interaction_id")

    if not output_path:
        output_path = f"media/output_{slugify(prompt)}.mp4"

    print(f"[Parallel] Dispatching: '{prompt}' (Output: {output_path})")

    try:
        generate_video(
            prompt=prompt,
            api_key=api_key,
            model=model,
            aspect_ratio=aspect_ratio,
            duration=duration,
            image_path=image_path,
            video_path=video_path,
            output_path=output_path,
            strip_audio=strip_audio,
            previous_interaction_id=previous_interaction_id
        )
        return {"job": job, "status": "SUCCESS", "output_path": output_path}
    except Exception as e:
        print(f"[Parallel] Failed: '{prompt}' - Error: {e}", file=sys.stderr)
        return {"job": job, "status": "FAILED", "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="Generate and edit videos using Gemini Omni Flash model via google-genai SDK (supports parallel batch execution).")
    parser.add_argument("prompt", nargs="?", help="Text prompt / instruction for a single video generation")
    parser.add_argument("--image", action="append", help="Optional local image path or File API URI for referencing / image-to-video (can be specified multiple times)")
    parser.add_argument("--video", action="append", help="Optional local video path or File API URI for editing / extending (can be specified multiple times)")
    parser.add_argument("--aspect-ratio", default="16:9", choices=["16:9", "9:16"], help="Aspect ratio (default: 16:9)")
    parser.add_argument("--duration", type=argparse_duration_type, default=None, help="Video duration as an integer between 3 and 10 seconds (e.g., 5, 10). Default: None (API/Model decides, typically 10s or matches source)")
    parser.add_argument("--model", default="gemini-omni-flash-preview", help="Gemini Omni Flash video model ID (default: gemini-omni-flash-preview)")
    parser.add_argument("--output", help="Local output file path for single generation (default: media/output.mp4)")
    parser.add_argument("--strip-audio", "-a", action="store_true", help="Completely strip/disable audio stream from the input video(s) before uploading so Gemini Omni Flash can regenerate new audio from scratch")
    parser.add_argument("--previous-interaction-id", help="Optional Interaction ID of a previous generation for turn-by-turn editing")
    parser.add_argument("--api-key", help="Gemini API Key (overrides env)")

    # Parallel batch configuration options
    parser.add_argument("--batch", help="Path to a JSON file containing an array of generation jobs")
    parser.add_argument("--prompts-file", help="Path to a text file containing one prompt per line to run in parallel")
    parser.add_argument("--concurrency", type=int, default=3, help="Maximum number of concurrent executions (default: 3)")

    args = parser.parse_args()

    api_key = get_api_key(args)
    if not api_key:
        print("Error: API key is not set. Use --api-key or set GEMINI_API_KEY environment variable.", file=sys.stderr)
        sys.exit(1)

    # 1. Handle Batch JSON execution
    if args.batch:
        if not os.path.exists(args.batch):
            print(f"Error: Batch JSON file '{args.batch}' not found.", file=sys.stderr)
            sys.exit(1)
        try:
            with safe_user_path(args.batch).open("r", encoding="utf-8") as f:
                jobs = json.load(f)
            if not isinstance(jobs, list):
                print("Error: Batch JSON file must contain a list/array of job objects.", file=sys.stderr)
                sys.exit(1)
        except Exception as e:
            print(f"Error parsing Batch JSON: {e}", file=sys.stderr)
            sys.exit(1)

        print(f"Loaded {len(jobs)} jobs from batch JSON. Running with concurrency={args.concurrency}...")

    # 2. Handle Prompts File execution
    elif args.prompts_file:
        if not os.path.exists(args.prompts_file):
            print(f"Error: Prompts file '{args.prompts_file}' not found.", file=sys.stderr)
            sys.exit(1)

        jobs = []
        with safe_user_path(args.prompts_file).open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    jobs.append({
                        "prompt": line,
                        "aspect_ratio": args.aspect_ratio,
                        "duration": args.duration,
                        "image": args.image,
                        "video": args.video,
                        "model": args.model,
                        "strip_audio": args.strip_audio,
                        "previous_interaction_id": args.previous_interaction_id
                    })
        print(f"Loaded {len(jobs)} prompts from text file. Running with concurrency={args.concurrency}...")

    # 3. Handle standard single prompt execution
    else:
        if not args.prompt:
            parser.print_help()
            sys.exit(1)

        output_path = args.output if args.output else "media/output.mp4"
        try:
            generate_video(
                prompt=args.prompt,
                api_key=api_key,
                model=args.model,
                aspect_ratio=args.aspect_ratio,
                duration=args.duration,
                image_path=args.image,
                video_path=args.video,
                output_path=output_path,
                strip_audio=args.strip_audio,
                previous_interaction_id=args.previous_interaction_id
            )
            sys.exit(0)
        except Exception as e:
            print(f"Error: Generation failed: {e}", file=sys.stderr)
            sys.exit(1)

    # Parallel Execution Loop
    if not jobs:
        print("Warning: No valid jobs found to execute.")
        sys.exit(0)

    results = []
    with ThreadPoolExecutor(max_workers=args.concurrency) as executor:
        futures = {executor.submit(run_job, job, api_key): job for job in jobs}
        for future in as_completed(futures):
            results.append(future.result())

    # Print Batch Results Summary
    print("\n" + "="*50)
    print("BATCH PARALLEL EXECUTION SUMMARY")
    print("="*50)
    success_count = sum(1 for r in results if r["status"] == "SUCCESS")
    failed_count = sum(1 for r in results if r["status"] == "FAILED")
    skipped_count = sum(1 for r in results if r["status"] == "SKIPPED")

    print(f"Total: {len(results)} | Success: {success_count} | Failed: {failed_count} | Skipped: {skipped_count}\n")
    for r in results:
        status_str = r["status"]
        prompt = r["job"].get("prompt")
        if r["status"] == "SUCCESS":
            print(f"  [{status_str}] '{prompt}' -> {r['output_path']}")
        else:
            print(f"  [{status_str}] '{prompt}' -> Error: {r.get('error')}")
    print("="*50)

    if failed_count > 0:
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()
