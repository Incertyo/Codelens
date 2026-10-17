import { limits } from './limits';

export function isApproachLabel(value: string) {
  const text = value.trim();
  return text.length > 0 && text.length <= limits.aiPatternCharacters &&
    !/^(python|javascript|typescript|java|c\+\+|code|unknown|none|n\/a)$/i.test(text) &&
    !/[\\`{}\[\];^$]|\.\*|=>|\b(?:def|for|while|return)\b.*[(:=]/.test(text) &&
    /^[\p{L}\p{N}\p{Pd}\s,'’()/:+&.]+$/u.test(text);
}
