#!/usr/bin/env python3
"""Convert raw PCM audio data to WAV format.

Azure OpenAI Realtime API outputs PCM audio (24kHz, 16-bit, mono).
This script converts it to standard WAV format for browser playback.

Usage:
    from pcm_to_wav import pcm_to_wav
    wav_bytes = pcm_to_wav(pcm_data, sample_rate=24000)
"""

import struct
import io


def pcm_to_wav(
    pcm_data: bytes,
    sample_rate: int = 24000,
    channels: int = 1,
    sample_width: int = 2
) -> bytes:
    """Convert raw PCM audio data to WAV format.

    Args:
        pcm_data: Raw PCM audio bytes
        sample_rate: Samples per second (default 24000 for gpt-realtime-mini)
        channels: Number of audio channels (default 1 for mono)
        sample_width: Bytes per sample (default 2 for 16-bit)

    Returns:
        WAV-formatted audio bytes
    """
    if not isinstance(pcm_data, bytes) or len(pcm_data) > 32 * 1024 * 1024:
        raise ValueError("PCM must be bytes up to 32 MiB")
    if not isinstance(sample_rate, int) or not 1 <= sample_rate <= 192000:
        raise ValueError("Invalid sample rate")
    if channels not in (1, 2) or sample_width != 2:
        raise ValueError("This helper supports mono/stereo signed 16-bit PCM only")
    if len(pcm_data) % (channels * sample_width):
        raise ValueError("Incomplete PCM frame")
    wav_buffer = io.BytesIO()

    # RIFF header
    wav_buffer.write(b'RIFF')
    wav_buffer.write(struct.pack('<I', 36 + len(pcm_data)))  # File size - 8
    wav_buffer.write(b'WAVE')

    # fmt subchunk
    wav_buffer.write(b'fmt ')
    wav_buffer.write(struct.pack('<I', 16))                    # Subchunk size
    wav_buffer.write(struct.pack('<H', 1))                     # Audio format (1 = PCM)
    wav_buffer.write(struct.pack('<H', channels))              # Number of channels
    wav_buffer.write(struct.pack('<I', sample_rate))           # Sample rate
    wav_buffer.write(struct.pack('<I', sample_rate * channels * sample_width))  # Byte rate
    wav_buffer.write(struct.pack('<H', channels * sample_width))  # Block align
    wav_buffer.write(struct.pack('<H', sample_width * 8))      # Bits per sample

    # data subchunk
    wav_buffer.write(b'data')
    wav_buffer.write(struct.pack('<I', len(pcm_data)))
    wav_buffer.write(pcm_data)

    return wav_buffer.getvalue()


def calculate_duration(pcm_data: bytes, sample_rate: int = 24000, sample_width: int = 2, channels: int = 1) -> float:
    """Calculate audio duration in seconds from PCM data length."""
    if sample_rate <= 0 or sample_width != 2 or channels not in (1, 2):
        raise ValueError("Invalid PCM format")
    if len(pcm_data) % (sample_width * channels):
        raise ValueError("Incomplete PCM frame")
    return len(pcm_data) / (sample_rate * sample_width * channels)


if __name__ == "__main__":
    import argparse
    from pathlib import Path
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    if args.input.resolve() == args.output.resolve():
        parser.error("Input and output must differ")
    with args.input.open('rb') as source:
        pcm_data = source.read(32 * 1024 * 1024 + 1)
    wav_data = pcm_to_wav(pcm_data)
    with args.output.open('xb') as destination:
        destination.write(wav_data)
    print(f"Converted {calculate_duration(pcm_data):.3f}s")
