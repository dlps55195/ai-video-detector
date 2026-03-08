'use client';

import { useState, useCallback, useRef } from 'react';
import { supabase, type Analysis } from '@/lib/supabase';
import {
  validateVideoFile,
  extractFrames,
  getVideoMetadata,
  formatFileSize,
  type ExtractionProgress,
} from '@/lib/video-processing';
import ResultsDisplay from './ResultsDisplay';
import LoadingSpinner from './LoadingSpinner';

type Stage =
  | 'idle'
  | 'selected'
  | 'extracting'
  | 'analyzing'
  | 'storing'
  | 'done'
  | 'error';

interface ProgressState {
  stage: Stage;
  message: string;
  framesTotal: number;
  framesDone: number;
}

export default function VideoUpload({ userId }: { userId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({
    stage: 'idle',
    message: '',
    framesTotal: 0,
    framesDone: 0,
  });
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setProgress({ stage: 'idle', message: '', framesTotal: 0, framesDone: 0 });
  };

  const handleFile = useCallback((selected: File) => {
    const validation = validateVideoFile(selected);
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid file');
      return;
    }

    setError(null);
    setResult(null);
    setFile(selected);

    const url = URL.createObjectURL(selected);
    setPreviewUrl(url);
    setProgress({ stage: 'selected', message: '', framesTotal: 0, framesDone: 0 });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const runAnalysis = async () => {
    if (!file) return;

    setError(null);
    setResult(null);
    const startTime = Date.now();

    try {
      // Step 1: Extract frames + capture video metadata in parallel
      setProgress({ stage: 'extracting', message: 'Extracting frames...', framesTotal: 8, framesDone: 0 });

      const [frames, videoMeta] = await Promise.all([
        extractFrames(
          file,
          2,
          8,
          (p: ExtractionProgress) => {
            setProgress({
              stage: 'extracting',
              message: `Extracting frame ${p.current}/${p.total} at ${p.timestamp.toFixed(1)}s`,
              framesTotal: p.total,
              framesDone: p.current,
            });
          }
        ),
        getVideoMetadata(file),
      ]);

      if (frames.length === 0) {
        throw new Error('Could not extract frames from video. Try a different format.');
      }

      // Step 2: Send to API for analysis
      setProgress({
        stage: 'analyzing',
        message: `Analyzing ${frames.length} frames...`,
        framesTotal: frames.length,
        framesDone: 0,
      });

      // Build FormData with all frames + video metadata for resolution dampening
      const formData = new FormData();
      formData.append('filename', file.name);
      formData.append('userId', userId);
      frames.forEach((frame, i) => {
        formData.append(`frame_${i}`, frame.blob, `frame_${i}.jpg`);
        formData.append(`timestamp_${i}`, frame.timestamp.toString());
      });
      formData.append('frameCount', frames.length.toString());

      // Pass video metadata so the API can apply resolution/bitrate dampening
      formData.append('videoWidth', videoMeta.width.toString());
      formData.append('videoHeight', videoMeta.height.toString());
      formData.append('videoBitrateMbps', videoMeta.bitrateMbps.toFixed(2));

      const response = await fetch('/api/analyze-video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(errData.error ?? `Server error ${response.status}`);
      }

      const analysisData = await response.json();

      // Step 3: Store in Supabase (done by API, but update UI)
      setProgress({ stage: 'storing', message: 'Saving results...', framesTotal: frames.length, framesDone: frames.length });

      const processingTime = Date.now() - startTime;
      const analysisRecord: Analysis = {
        id: analysisData.id,
        user_id: userId,
        video_filename: file.name,
        is_ai_generated: analysisData.is_ai_generated,
        confidence_score: analysisData.confidence_score,
        analysis_details: {
          ...analysisData.analysis_details,
          processing_time_ms: processingTime,
        },
        created_at: analysisData.created_at ?? new Date().toISOString(),
        video_url: null,
      };

      setResult(analysisRecord);
      setProgress({ stage: 'done', message: 'Analysis complete', framesTotal: frames.length, framesDone: frames.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed. Please try again.';
      setError(message);
      setProgress({ stage: 'error', message, framesTotal: 0, framesDone: 0 });
    }
  };

  const isProcessing = ['extracting', 'analyzing', 'storing'].includes(progress.stage);

  const progressPercent =
    progress.framesTotal > 0
      ? Math.round((progress.framesDone / progress.framesTotal) * 100)
      : 0;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Upload zone */}
      {progress.stage !== 'done' && (
        <div>
          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200
                ${dragging
                  ? 'border-amber-glow bg-amber-glow/5 scale-[1.01]'
                  : 'border-border hover:border-amber-glow/40 hover:bg-panel/30'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/avi,.mp4,.webm,.mov,.avi"
                onChange={handleInputChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full border border-border bg-panel flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5">
                    <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-display font-semibold text-slate-200 mb-1">
                    Drop your video here
                  </p>
                  <p className="text-slate-500 text-sm">
                    or click to browse · MP4, WebM, MOV, AVI · max 100MB
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-border bg-surface rounded-xl overflow-hidden">
              {/* Video preview */}
              {previewUrl && (
                <div className="relative bg-void aspect-video">
                  <video
                    src={previewUrl}
                    controls
                    className="w-full h-full object-contain"
                    preload="metadata"
                  />
                </div>
              )}

              {/* File info */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-panel border border-border flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                      <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-slate-200 truncate max-w-xs">{file.name}</p>
                    <p className="font-mono text-xs text-slate-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                {!isProcessing && (
                  <button
                    onClick={resetState}
                    className="font-mono text-xs text-slate-500 hover:text-signal-fake transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 border border-signal-fake/30 bg-signal-fake/5 rounded-xl">
          <p className="font-mono text-sm text-signal-fake">{error}</p>
        </div>
      )}

      {/* Processing state */}
      {isProcessing && (
        <div className="border border-border bg-surface rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <LoadingSpinner size="sm" />
            <span className="font-mono text-xs text-slate-400 uppercase tracking-wider">
              {progress.stage === 'extracting' && 'Extracting Frames'}
              {progress.stage === 'analyzing' && 'Running AI Detection'}
              {progress.stage === 'storing' && 'Saving Results'}
            </span>
          </div>
          <p className="font-mono text-xs text-slate-600">{progress.message}</p>

          {progress.framesTotal > 0 && (
            <div>
              <div className="flex justify-between font-mono text-xs text-slate-600 mb-1.5">
                <span>Progress</span>
                <span>{progress.framesDone}/{progress.framesTotal}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-glow rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analyze button */}
      {file && progress.stage === 'selected' && !isProcessing && (
        <button
          onClick={runAnalysis}
          className="w-full py-4 bg-amber-glow text-void font-display font-bold text-base rounded-xl hover:bg-amber-400 transition-all duration-200 glow-amber hover:scale-[1.01]"
        >
          Analyze Video →
        </button>
      )}

      {/* Results */}
      {result && progress.stage === 'done' && (
        <div className="space-y-4">
          <ResultsDisplay analysis={result} />
          <div className="flex gap-3">
            <button
              onClick={resetState}
              className="flex-1 py-3 border border-border text-slate-400 font-display text-sm rounded-lg hover:border-amber-glow hover:text-amber-glow transition-colors"
            >
              Analyze Another
            </button>
            <a
              href="/dashboard"
              className="flex-1 py-3 border border-border text-slate-400 font-display text-sm rounded-lg hover:border-amber-glow hover:text-amber-glow transition-colors text-center"
            >
              View History
            </a>
          </div>
        </div>
      )}
    </div>
  );
}