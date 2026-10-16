import { heuristicDetection, type Detection } from "./language-detection";
import type { ShareLanguage } from "../share/public/codec";

export const editorLanguage = 'python' as const;
export type UnsupportedEditorLanguage = Exclude<ShareLanguage, typeof editorLanguage>;

export function editorDetection(detection: Detection): Detection {
  return detection.kind === 'supported' && detection.language !== editorLanguage
    ? { kind: 'unsupported', languageId: 'js', confidence: detection.confidence }
    : detection;
}

export function editorSourceIssue(code: string): string | null {
  return editorDetection(heuristicDetection(code)).kind === 'unsupported'
    ? 'Only Python can run in this editor.'
    : null;
}

export function unsupportedShareLanguage(language: ShareLanguage): UnsupportedEditorLanguage | null {
  return language === editorLanguage ? null : language;
}
