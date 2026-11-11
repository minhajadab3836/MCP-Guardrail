import { pipeline } from '@xenova/transformers';
import { ConfigLoader } from './configLoader.js';

export class MlSecurityFilterService {
  private static classifier: any = null;
  private static loadingPromise: Promise<void> | null = null;

  /**
   * Initializes the ONNX model pipeline lazily on startup.
   */
  public static async init(): Promise<void> {
    const config = ConfigLoader.getConfig().security.ml_guard;
    if (!config.enabled) return;

    if (!this.classifier && !this.loadingPromise) {
      console.log(`[ML Guard] Loading ONNX model '${config.model}' into memory...`);
      this.loadingPromise = (async () => {
        try {
          this.classifier = await pipeline('text-classification', config.model);
          console.log('[ML Guard] ONNX model loaded successfully.');
        } catch (err: any) {
          console.error('[ML Guard Error] Failed to load model:', err.message);
          this.classifier = null;
        }
      })();
    }
    await this.loadingPromise;
  }

  /**
   * Evaluates text fields using the local ONNX model for semantic injection score.
   */
  public static async evaluateText(text: string): Promise<{ isInjection: boolean; score: number; label: string }> {
    const config = ConfigLoader.getConfig().security.ml_guard;
    if (!config.enabled || !text || text.trim().length === 0) {
      return { isInjection: false, score: 0, label: 'SAFE' };
    }

    await this.init();
    if (!this.classifier) {
      return { isInjection: false, score: 0, label: 'SKIPPED' };
    }

    try {
      const results = await this.classifier(text.slice(0, 512)); // Truncate long strings for speed
      const topResult = results[0];

      const labelUpper = String(topResult.label).toUpperCase();
      const isInjection =
        (labelUpper.includes('INJECTION') || labelUpper === 'LABEL_1') &&
        topResult.score >= config.threshold;

      return {
        isInjection,
        score: topResult.score,
        label: topResult.label,
      };
    } catch (err: any) {
      console.warn('[ML Guard Warning] Inference failed:', err.message);
      return { isInjection: false, score: 0, label: 'ERROR' };
    }
  }
}
