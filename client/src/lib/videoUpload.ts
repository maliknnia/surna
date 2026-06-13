/** Client-side video compression before Cloudinary upload */
export async function compressVideoForUpload(file: File, maxSizeMb = 50): Promise<File> {
  if (file.size <= maxSizeMb * 1024 * 1024) return file;

  // Re-encode via MediaRecorder when possible (short clips / supported browsers)
  if (!file.type.startsWith("video/")) return file;

  try {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Video load failed"));
    });

    const duration = video.duration;
    if (duration > 120) {
      URL.revokeObjectURL(url);
      return file;
    }

    const stream = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
    if (!stream) {
      URL.revokeObjectURL(url);
      return file;
    }

    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm",
      videoBitsPerSecond: 1_500_000,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.start();
      video.play();
      setTimeout(() => {
        recorder.stop();
        video.pause();
      }, Math.min(duration * 1000, 60_000));
    });

    URL.revokeObjectURL(url);
    const blob = new Blob(chunks, { type: recorder.mimeType });
    if (blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".webm"), { type: blob.type });
  } catch {
    return file;
  }
}

export async function uploadVideoPost(params: {
  file: File;
  content: string;
  sport?: string;
  location?: string;
}): Promise<{ post: unknown; videoUrl: string; thumbnailUrl: string }> {
  const compressed = await compressVideoForUpload(params.file);
  const form = new FormData();
  form.append("video", compressed);
  form.append("content", params.content);
  if (params.sport) form.append("sport", params.sport);
  if (params.location) form.append("location", params.location);

  const res = await fetch("/api/posts/video", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Video upload failed");
  }
  return res.json();
}
