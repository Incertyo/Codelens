import { limits } from '@/shared/limits';
import { ModelOperations } from '@vscode/vscode-languagedetection';
import assets from '../generated/runtime-assets.json';
import { modelDetection } from '../lib/language-detection';

let model: ModelOperations | undefined;
self.onmessage = async ({ data }: MessageEvent<{ id: number; code: string }>) => {
  try {
    model ??= new ModelOperations({
      modelJsonLoaderFunc: async () => {
        const response = await fetch(`${assets.languageDetection}/model.json`);
        if (!response.ok) throw new Error('Detection model unavailable');
        return response.json();
      },
      weightsLoaderFunc: async () => {
        const response = await fetch(`${assets.languageDetection}/group1-shard1of1.bin`);
        if (!response.ok) throw new Error('Detection weights unavailable');
        return response.arrayBuffer();
      },
      minContentSize: 32,
      maxContentSize: limits.code,
    });
    self.postMessage({
      id: data.id,
      detection: modelDetection(await model.runModel(data.code.slice(0, limits.code))),
    });
  } catch {
    self.postMessage({
      id: data.id,
      error: 'Automatic language detection is unavailable. Choose a language manually.',
    });
  }
};
