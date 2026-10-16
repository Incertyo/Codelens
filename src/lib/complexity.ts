import type { Sample } from './analysis';

export const growthModels = [
  {
    id: 'constant',
    label: 'O(1)',
    name: 'Constant',
    example: 'Array access by index',
    dash: '1 3',
  },
  {
    id: 'logarithmic',
    label: 'O(log n)',
    name: 'Logarithmic',
    example: 'Binary search in a sorted array',
    dash: '4 3',
  },
  {
    id: 'linear',
    label: 'O(n)',
    name: 'Linear',
    example: 'Linear search, worst case',
    dash: '8 3',
  },
  {
    id: 'linearithmic',
    label: 'O(n log n)',
    name: 'Linearithmic',
    example: 'Merge sort',
    dash: '8 3 1 3',
  },
  {
    id: 'quadratic',
    label: 'O(n²)',
    name: 'Quadratic',
    example: 'Bubble sort, worst case',
    dash: '12 4',
  },
  {
    id: 'cubic',
    label: 'O(n³)',
    name: 'Cubic',
    example: 'Floyd–Warshall on n vertices',
    dash: '12 3 3 3',
  },
  {
    id: 'exponential',
    label: 'O(2ⁿ)',
    name: 'Exponential',
    example: 'Visiting every subset of n items',
    dash: '2 3 2 3 8 3',
  },
] as const;
export type GrowthId = (typeof growthModels)[number]['id'];
export type GrowthFit = {
  id: GrowthId;
  label: string;
  scale: number;
  intercept: number;
  anchor: number;
  error: number;
};

function logGrowth(id: GrowthId, n: number): number {
  if (!Number.isFinite(n) || n < 1 || n > Number.MAX_SAFE_INTEGER)
    throw new Error('Reference sizes must be finite and at least one.');
  switch (id) {
    case 'constant':
      return 0;
    case 'logarithmic':
      return Math.log2(Math.log2(n));
    case 'linear':
      return Math.log2(n);
    case 'linearithmic':
      return Math.log2(n) + Math.log2(Math.log2(n));
    case 'quadratic':
      return 2 * Math.log2(n);
    case 'cubic':
      return 3 * Math.log2(n);
    case 'exponential':
      return n;
    default:
      throw new Error('Unknown reference model.');
  }
}

export function growthValue(id: GrowthId, n: number): number {
  return Math.min(1e100, 2 ** Math.min(Math.log2(1e100), logGrowth(id, n)));
}

function relativeGrowth(id: GrowthId, n: number, anchor: number) {
  const value = logGrowth(id, n),
    base = logGrowth(id, anchor);
  return base === -Infinity ? 0 : 2 ** Math.min(Math.log2(1e100), value - base);
}

export function fitGrowthModel(id: GrowthId, samples: Sample[], affine: boolean): GrowthFit {
  if (
    !samples.length ||
    samples.some((sample) => !Number.isFinite(sample.steps) || sample.steps < 1)
  )
    throw new Error('Complete positive step counts are required.');
  const anchor = Math.max(...samples.map((sample) => sample.n));
  const xs = samples.map((sample) => relativeGrowth(id, sample.n, anchor));
  const ys = samples.map((sample) => sample.steps);
  const meanX = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const meanY = ys.reduce((sum, y) => sum + y, 0) / ys.length;
  const norm = xs.reduce((sum, x) => sum + x * x, 0);
  let scale = norm ? xs.reduce((sum, x, i) => sum + x * ys[i], 0) / norm : 0;
  let intercept = 0;
  if (affine) {
    const variance = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
    const centeredScale = variance
      ? Math.max(0, xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0) / variance)
      : 0;
    const centeredIntercept = meanY - centeredScale * meanX;
    if (centeredIntercept >= 0) {
      scale = centeredScale;
      intercept = centeredIntercept;
    }
  }
  const error =
    Math.sqrt(xs.reduce((sum, x, i) => sum + (ys[i] - intercept - scale * x) ** 2, 0) / xs.length) /
    meanY;
  return {
    id,
    label: growthModels.find((model) => model.id === id)!.label,
    scale,
    intercept,
    anchor,
    error,
  };
}

export function predictGrowth(fit: GrowthFit, n: number): number {
  return Math.min(1e100, fit.intercept + fit.scale * relativeGrowth(fit.id, n, fit.anchor));
}

export function neighboringModels(id: GrowthId) {
  const index = growthModels.findIndex((model) => model.id === id);
  if (index < 0) throw new Error('Unknown reference model.');
  return growthModels.slice(Math.max(0, index - 1), index + 2);
}

function scientific(mantissa: number, exponent: number) {
  let rounded = Number(mantissa.toPrecision(3));
  if (rounded >= 10) {
    rounded /= 10;
    exponent++;
  }
  return `${rounded} × 10^${exponent}`;
}

function integerNotation(value: bigint) {
  if (value < 1_000_000n) return value.toLocaleString('en-US');
  const digits = value.toString();
  return scientific(
    Number(digits.slice(0, 4)) / 10 ** (Math.min(4, digits.length) - 1),
    digits.length - 1,
  );
}

export function operationCount(id: GrowthId, n: number) {
  if (!Number.isSafeInteger(n) || n < 1)
    throw new Error('Scale sizes must be positive safe integers.');
  const log = logGrowth(id, n) * Math.log10(2);
  let notation: string;
  const size = BigInt(n);
  if (id === 'constant') notation = '1';
  else if (id === 'linear') notation = integerNotation(size);
  else if (id === 'quadratic') notation = integerNotation(size * size);
  else if (id === 'cubic') notation = integerNotation(size * size * size);
  else if (id === 'exponential' && n <= 100) notation = integerNotation(2n ** size);
  else if (log < 6) notation = Math.round(10 ** log).toLocaleString('en-US');
  else notation = scientific(10 ** (log - Math.floor(log)), Math.floor(log));
  let plainEnglish: string;
  if (log >= 25) plainEnglish = 'effectively never finishes at ordinary computing speeds';
  else if (log >= 18) plainEnglish = 'quintillions of steps or more';
  else {
    const unit =
      log >= 12 - 1e-12
        ? ([12, 'trillion'] as const)
        : log >= 9 - 1e-12
          ? ([9, 'billion'] as const)
          : log >= 6 - 1e-12
            ? ([6, 'million'] as const)
            : log >= 3 - 1e-12
              ? ([3, 'thousand'] as const)
              : null;
    if (unit) {
      const count = Number((10 ** (log - unit[0])).toPrecision(2));
      plainEnglish = `about ${count === 1 ? 'a' : count} ${unit[1]} steps`;
    } else {
      const count = Math.round(10 ** log);
      plainEnglish =
        count === 1 ? 'about one step' : `about ${count.toLocaleString('en-US')} steps`;
    }
  }
  return { notation, plainEnglish };
}

export function staticComparison(candidate: string, measured: GrowthId): string {
  const normalized = candidate.replace(' candidate', '').replace('^2', '²').replace('^3', '³');
  const model = growthModels.find((item) => item.label === normalized);
  const fit = growthModels.find((item) => item.id === measured)!;
  if (!model)
    return `Static analysis: ${candidate}; measured data fits ${fit.label} best at the tested sizes.`;
  if (model.id === measured)
    return `Both suggest ${fit.label} at the tested sizes; agreement is not proof of asymptotic complexity.`;
  return `Static analysis suggests ${model.label}; measured data fits ${fit.label} best at the tested sizes.`;
}
