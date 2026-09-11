// ─── Local text embedder ──────────────────────────────────────────────────────
// Turns text into a 384-number vector with all-MiniLM-L6-v2, run fully local
// through onnxruntime. The model files live in the repo under models/, so the
// runtime never needs the network. The build step may download the model once
// with allowRemoteModels set to true.

import { pipeline, env, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const HERE = dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = join(HERE, "..", "..", "models");
const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

export const EMBEDDING_DIM = 384;
export const EMBEDDING_MODEL = MODEL_ID;

export type Embedder = (text: string) => Promise<number[]>;

export interface EmbedderOptions {
  allowRemoteModels?: boolean;
}

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function extractor(options: EmbedderOptions): Promise<FeatureExtractionPipeline> {
  if (extractorPromise) {
    return extractorPromise;
  } else {
    env.cacheDir = MODELS_DIR;
    env.allowRemoteModels = options.allowRemoteModels ?? false;
    extractorPromise = pipeline("feature-extraction", MODEL_ID, { dtype: "q8" });
    return extractorPromise;
  }
}

export async function embed(text: string, options: EmbedderOptions = {}): Promise<number[]> {
  const run = await extractor(options);
  const output = await run(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}
