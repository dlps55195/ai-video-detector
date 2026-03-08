// Hugging Face API wrapper — multi-model deepfake/AI detection
//
// Primary:  prithivMLmods/AI-vs-Deepfake-vs-Real-v2.0
//           3-class SigLIP2 model (AI / Deepfake / Real) — 99.15% eval accuracy
//           Catches fully AI-generated content (HeyGen, Sora, Runway etc.)
//           AND traditional face-swap deepfakes separately.
//
// Fallback: prithivMLmods/deepfake-detector-model-v1
//           Binary SigLIP model — 94.4% accuracy, 97% precision on fakes.
//           Used if primary is unavailable.

const PRIMARY_MODEL = 'https://router.huggingface.co/hf-inference/models/prithivMLmods/AI-vs-Deepfake-vs-Real-v2.0';
const FALLBACK_MODEL = 'https://router.huggingface.co/hf-inference/models/prithivMLmods/deepfake-detector-model-v1';

export interface HFPrediction {
  label: string;
  score: number;
}

export interface FrameAnalysisResult {
  isAI: boolean;
  confidenceScore: number; // 0-100, pre-dampening
  rawPredictions: HFPrediction[];
  error?: string;
}

/**
 * Analyzes a single frame. Tries primary model first, falls back on failure.
 * Returns raw confidence score — dampening is applied in route.ts after
 * all frames are collected, so it can be applied uniformly.
 */
export async function analyzeFrame(imageBlob: Blob): Promise<FrameAnalysisResult> {
  const token = process.env.HUGGINGFACE_API_TOKEN;

  if (!token) {
    throw new Error('HUGGINGFACE_API_TOKEN is not set in environment variables.');
  }

  const arrayBuffer = await imageBlob.arrayBuffer();

  for (const apiUrl of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    const result = await queryModel(apiUrl, arrayBuffer, token);

    if (!result.error) {
      return result;
    }

    // Rate limit — stop immediately, no point trying fallback
    if (result.error.includes('Rate limited')) {
      return result;
    }

    console.warn(`Model ${apiUrl} failed: ${result.error}. Trying fallback...`);
  }

  return {
    isAI: false,
    confidenceScore: 50,
    rawPredictions: [],
    error: 'All models failed',
  };
}

async function queryModel(
  apiUrl: string,
  arrayBuffer: ArrayBuffer,
  token: string
): Promise<FrameAnalysisResult> {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: arrayBuffer,
    });

    if (response.status === 503) {
      // Model loading — wait and retry once
      await new Promise((res) => setTimeout(res, 7000));
      const retry = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: arrayBuffer,
      });
      if (!retry.ok) {
        return { isAI: false, confidenceScore: 50, rawPredictions: [], error: `Model unavailable after retry (503)` };
      }
      const retryData: HFPrediction[] = await retry.json();
      return parseHFResponse(retryData);
    }

    if (response.status === 429) {
      return { isAI: false, confidenceScore: 50, rawPredictions: [], error: 'Rate limited by Hugging Face.' };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        isAI: false,
        confidenceScore: 50,
        rawPredictions: [],
        error: `API error ${response.status}: ${errorText.slice(0, 150)}`,
      };
    }

    const data: HFPrediction[] = await response.json();
    return parseHFResponse(data);
  } catch (err) {
    return {
      isAI: false,
      confidenceScore: 50,
      rawPredictions: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Parses HF response — handles the 3-class model (AI / Deepfake / Real)
 * and any binary real/fake model.
 *
 * For the 3-class model:
 *   "AI"       → fully synthetic (HeyGen, Sora, DALL-E video etc.)
 *   "Deepfake" → real person's face swapped/manipulated
 *   "Real"     → authentic footage
 *
 * Both "AI" and "Deepfake" count as positive detections.
 * Returns raw score — dampening is applied in route.ts.
 */
function parseHFResponse(predictions: HFPrediction[]): FrameAnalysisResult {
  if (!Array.isArray(predictions) || predictions.length === 0) {
    return { isAI: false, confidenceScore: 50, rawPredictions: [] };
  }

  const fakeLabels = [
    'fake', 'deepfake', 'ai', 'artificial', 'generated',
    'FAKE', 'Fake', 'aigenerated', 'AI', 'Deepfake',
  ];
  const realLabels = [
    'real', 'authentic', 'genuine', 'REAL', 'Real', 'human',
  ];

  let fakeScore = 0;
  let realScore = 0;

  for (const pred of predictions) {
    const labelClean = pred.label.toLowerCase().replace(/[^a-z]/g, '');
    if (fakeLabels.some((l) => labelClean.includes(l.toLowerCase().replace(/[^a-z]/g, '')))) {
      fakeScore = Math.max(fakeScore, pred.score);
    } else if (realLabels.some((l) => labelClean.includes(l.toLowerCase().replace(/[^a-z]/g, '')))) {
      realScore = Math.max(realScore, pred.score);
    }
  }

  // Fallback: if no label matched, infer from structure
  if (fakeScore === 0 && realScore === 0) {
    const sorted = [...predictions].sort((a, b) => b.score - a.score);
    const topLabel = sorted[0].label.toLowerCase();
    if (topLabel.includes('real') || topLabel.includes('human') || topLabel.includes('0')) {
      realScore = sorted[0].score;
      fakeScore = 1 - sorted[0].score;
    } else {
      fakeScore = sorted[0].score;
    }
  }

  return {
    isAI: fakeScore > 0.5,
    confidenceScore: Math.round(fakeScore * 100),
    rawPredictions: predictions,
  };
}

/**
 * Weighted-max aggregation with a configurable threshold.
 *
 * threshold is passed in from route.ts based on the resolution tier —
 * 4K content needs a much higher bar (80%) than SD content (55%).
 *
 * MAX >= 70%: 50% max + 30% top3avg + 20% overall avg  (strong single-frame signal)
 * MAX >= 50%: 35% max + 35% top3avg + 30% overall avg  (moderate signal)
 * MAX <  50%: trust the average                         (no clear signal)
 */
export function aggregateResults(
  frameResults: FrameAnalysisResult[],
  threshold: number = 55
): {
  isAI: boolean;
  confidenceScore: number;
} {
  const validResults = frameResults.filter((r) => !r.error || r.confidenceScore !== 50);

  if (validResults.length === 0) {
    return { isAI: false, confidenceScore: 50 };
  }

  const scores = validResults.map((r) => r.confidenceScore);
  const maxScore = Math.max(...scores);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const top3Avg =
    [...scores]
      .sort((a, b) => b - a)
      .slice(0, 3)
      .reduce((a, b) => a + b, 0) / Math.min(3, scores.length);

  let finalScore: number;

  if (maxScore >= 70) {
    finalScore = maxScore * 0.5 + top3Avg * 0.3 + avgScore * 0.2;
  } else if (maxScore >= 50) {
    finalScore = maxScore * 0.35 + top3Avg * 0.35 + avgScore * 0.3;
  } else {
    finalScore = avgScore;
  }

  return {
    isAI: Math.round(finalScore) > threshold,
    confidenceScore: Math.round(finalScore),
  };
}