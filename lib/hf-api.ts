// Hugging Face API wrapper for deepfake/AI detection
// Multi-model approach: runs each frame through two complementary models
// and uses a smart aggregation that doesn't let near-zero frames drown out high scores

// Model 1: Face deepfake / face-swap detection
const DEEPFAKE_MODEL = 'https://router.huggingface.co/hf-inference/models/dima806/deepfake_vs_real_image_detection';

// Model 2: General AI-generated image detection (catches Sora, Midjourney, DALL-E style videos)
const AI_IMAGE_MODEL = 'https://router.huggingface.co/hf-inference/models/Organika/sdxl-detector';

export interface HFPrediction {
  label: string;
  score: number;
}

export interface FrameAnalysisResult {
  isAI: boolean;
  confidenceScore: number; // 0-100
  rawPredictions: HFPrediction[];
  error?: string;
}

/**
 * Analyzes a single image frame against both models and returns the higher score.
 * Using two models catches both face-swap deepfakes AND fully AI-generated content.
 */
export async function analyzeFrame(imageBlob: Blob): Promise<FrameAnalysisResult> {
  const token = process.env.HUGGINGFACE_API_TOKEN;

  if (!token) {
    throw new Error('HUGGINGFACE_API_TOKEN is not set in environment variables.');
  }

  const arrayBuffer = await imageBlob.arrayBuffer();

  // Run both models and take the higher AI score (more sensitive = better for detection)
  const [deepfakeResult, aiImageResult] = await Promise.allSettled([
    queryModel(DEEPFAKE_MODEL, arrayBuffer, token),
    queryModel(AI_IMAGE_MODEL, arrayBuffer, token),
  ]);

  const scores: number[] = [];
  const allPredictions: HFPrediction[] = [];
  const errors: string[] = [];

  if (deepfakeResult.status === 'fulfilled' && !deepfakeResult.value.error) {
    scores.push(deepfakeResult.value.confidenceScore);
    allPredictions.push(...deepfakeResult.value.rawPredictions);
  } else if (deepfakeResult.status === 'rejected') {
    errors.push('deepfake model failed');
  } else if (deepfakeResult.value.error) {
    errors.push(deepfakeResult.value.error);
  }

  if (aiImageResult.status === 'fulfilled' && !aiImageResult.value.error) {
    scores.push(aiImageResult.value.confidenceScore);
    allPredictions.push(...aiImageResult.value.rawPredictions);
  } else if (aiImageResult.status === 'rejected') {
    errors.push('ai-image model failed');
  } else if (aiImageResult.value.error) {
    errors.push(aiImageResult.value.error);
  }

  if (scores.length === 0) {
    return {
      isAI: false,
      confidenceScore: 50,
      rawPredictions: [],
      error: errors.join('; ') || 'All models failed',
    };
  }

  // Take the MAX score across models — if either model is confident it's AI, trust it
  const confidenceScore = Math.max(...scores);

  return {
    isAI: confidenceScore > 50,
    confidenceScore,
    rawPredictions: allPredictions,
    error: errors.length > 0 ? errors.join('; ') : undefined,
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
      await new Promise((res) => setTimeout(res, 6000));
      const retry = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: arrayBuffer,
      });
      if (!retry.ok) {
        return { isAI: false, confidenceScore: 50, rawPredictions: [], error: `Model unavailable (503)` };
      }
      const retryData: HFPrediction[] = await retry.json();
      return parseHFResponse(retryData);
    }

    if (response.status === 429) {
      return {
        isAI: false,
        confidenceScore: 50,
        rawPredictions: [],
        error: 'Rate limited by Hugging Face.',
      };
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

function parseHFResponse(predictions: HFPrediction[]): FrameAnalysisResult {
  if (!Array.isArray(predictions) || predictions.length === 0) {
    return { isAI: false, confidenceScore: 50, rawPredictions: [] };
  }

  const fakeLabels = ['fake', 'deepfake', 'ai', 'artificial', 'generated', 'FAKE', 'Fake', 'aigenerated', 'AI-generated'];
  const realLabels = ['real', 'authentic', 'genuine', 'REAL', 'Real', 'human', 'notai'];

  let fakeScore = 0;
  let realScore = 0;

  for (const pred of predictions) {
    const labelLower = pred.label.toLowerCase().replace(/[^a-z]/g, '');
    if (fakeLabels.some((l) => labelLower.includes(l.toLowerCase().replace(/[^a-z]/g, '')))) {
      fakeScore = Math.max(fakeScore, pred.score);
    } else if (realLabels.some((l) => labelLower.includes(l.toLowerCase().replace(/[^a-z]/g, '')))) {
      realScore = Math.max(realScore, pred.score);
    }
  }

  // Fallback: if labels unrecognized, infer from structure
  if (fakeScore === 0 && realScore === 0) {
    if (predictions.length >= 2) {
      const sorted = [...predictions].sort((a, b) => b.score - a.score);
      // Assume highest score label is the prediction; if it looks "real", invert
      const topLabel = sorted[0].label.toLowerCase();
      if (topLabel.includes('real') || topLabel.includes('human') || topLabel.includes('0')) {
        realScore = sorted[0].score;
        fakeScore = 1 - sorted[0].score;
      } else {
        fakeScore = sorted[0].score;
      }
    } else if (predictions.length === 1) {
      fakeScore = predictions[0].score;
    }
  }

  const confidenceScore = Math.round(fakeScore * 100);

  return {
    isAI: fakeScore > 0.5,
    confidenceScore,
    rawPredictions: predictions,
  };
}

/**
 * Consensus-based aggregation.
 *
 * Key insight: a real AI-generated video will have CONSISTENTLY high scores across
 * most frames. A real human video might have 1-2 uncertain frames but the rest
 * will be clearly real. We exploit this by requiring multiple frames to agree.
 *
 * Rules:
 * 1. Count how many frames scored >= 65% ("high confidence AI frames")
 * 2. If 3+ frames agree → strong AI signal, use weighted score
 * 3. If exactly 2 frames agree → moderate signal, use blended score
 * 4. If only 1 frame is high (even if 99%) → probably a false positive, use average
 * 5. If 0 frames are high → definitely real, use average
 */
export function aggregateResults(frameResults: FrameAnalysisResult[]): {
  isAI: boolean;
  confidenceScore: number;
} {
  const validResults = frameResults.filter((r) => !r.error || r.confidenceScore !== 50);

  if (validResults.length === 0) {
    return { isAI: false, confidenceScore: 50 };
  }

  const scores = validResults.map((r) => r.confidenceScore);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const sortedDesc = [...scores].sort((a, b) => b - a);
  const top3Avg = sortedDesc.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, scores.length);

  // Count frames with strong AI signal
  const HIGH_THRESHOLD = 65;
  const highFrames = scores.filter((s) => s >= HIGH_THRESHOLD).length;

  let finalScore: number;

  if (highFrames >= 3) {
    // Strong consensus: multiple frames agree it's AI
    finalScore = top3Avg * 0.6 + avgScore * 0.4;
  } else if (highFrames === 2) {
    // Moderate consensus: two frames agree, blend with average
    finalScore = top3Avg * 0.4 + avgScore * 0.6;
  } else {
    // No consensus (0 or 1 high frame): trust the average
    // Single outlier frames are likely model noise or a non-face frame
    finalScore = avgScore;
  }

  finalScore = Math.round(finalScore);

  return {
    isAI: finalScore > 55,
    confidenceScore: finalScore,
  };
}