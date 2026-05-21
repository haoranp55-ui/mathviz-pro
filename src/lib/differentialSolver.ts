// src/lib/differentialSolver.ts
// 线性常系数微分方程符号求解器

// 接近零判断阈值
const EPS = 1e-10;

/** 判断数值是否接近零 */
function isNearZero(x: number): boolean {
  return Math.abs(x) < EPS;
}

/** 智能格式化数字
 * - 如果小数部分全为0，省略小数部分（1.0000 → 1）
 * - 如果小数部分不全为0，保留有效小数位（1.0001 → 1.0001）
 * - 特殊处理：-1.0000 → -1, 1.0000 → 空字符串（用于系数）
 */
function formatNum(num: number, forCoeff: boolean = false): string {
  const rounded = Math.round(num * 10000) / 10000;
  const absRounded = Math.abs(rounded);

  // 检查是否接近整数
  if (isNearZero(absRounded - Math.round(absRounded))) {
    const intVal = Math.round(rounded);
    if (forCoeff) {
      if (intVal === 1) return '';
      if (intVal === -1) return '-';
    }
    return intVal.toString();
  }

  // 保留4位小数，移除尾随0
  return rounded.toFixed(4).replace(/\.?0+$/, '');
}

/**
 * 格式化 t 的幂次
 * - t^0 → 空字符串
 * - t^1 → t
 * - t^n → t^n
 */
function formatTPower(power: number): string {
  if (power === 0) return '';
  if (power === 1) return 't';
  return `t^${power}`;
}

/**
 * 特征方程的根
 */
interface CharacteristicRoot {
  value: number;       // 根的值（实根或复根的实部）
  imaginary?: number;  // 复根的虚部（undefined 表示实根）
  multiplicity: number; // 重数
}

/**
 * 初始条件
 */
export interface InitialCondition {
  t: number;      // t 值
  order: number;  // 导数阶数（0=y, 1=y', 2=y''）
  value: number;  // y^(order)(t) 的值
  type?: '0-' | '0+' | 'default';  // 初始条件类型
}

/**
 * 零输入响应（仅由初始条件引起）
 */
export interface ZeroInputResponse {
  expression: string;     // 表达式
  coefficients: number[]; // 系数
}

/**
 * 零状态响应（仅由输入引起，初始条件为0）
 */
export interface ZeroStateResponse {
  expression: string;     // 表达式
  homogeneousPart: string; // 齐次部分
  particularPart: string;  // 特解部分
  coefficients: number[]; // 系数
}

/**
 * 单位冲激响应 h(t)
 */
export interface ImpulseResponse {
  expression: string;     // h(t) 表达式
  coefficients: number[]; // 系数
}

/**
 * 微分方程的解
 */
export interface DifferentialSolution {
  characteristicEquation: string;  // 特征方程
  roots: CharacteristicRoot[];     // 特征根
  rootsDisplay: string;            // 特征根显示
  homogeneous: string;             // 齐次解
  particular: string;              // 特解（已求解待定系数）
  particularForm: string;          // 特解形式（带待定系数）
  expandedExcitation: string;      // 展开后的激励函数
  generalSolution: string;         // 通解 = 齐次解 + 特解
  finalSolution: string;           // 最终解（代入初始条件后）
  coefficients: number[];          // 齐次解的系数 C1, C2, ...
  particularCoeffs: number[];      // 特解的系数 A, B, ...
  isValid: boolean;
  error?: string;
  // 新增：零输入响应和零状态响应
  zeroInputResponse?: ZeroInputResponse;
  zeroStateResponse?: ZeroStateResponse;
  completeResponse?: string;       // 完全响应 = 零输入 + 零状态
  // 新增：初始条件类型
  conditionType?: '0-' | '0+' | 'default';
  // 新增：0+ 条件（从 0- 跳变后）
  initialConditionsPlus?: InitialCondition[];
  // 新增：单位冲激响应 h(t)
  impulseResponse?: ImpulseResponse;
}

/**
 * 求解一元二次方程 ax² + bx + c = 0
 */
function solveQuadratic(a: number, b: number, c: number): CharacteristicRoot[] {
  if (a === 0) {
    if (b === 0) return [];
    return [{ value: -c / b, multiplicity: 1 }];
  }

  const discriminant = b * b - 4 * a * c;

  if (discriminant > 0) {
    const sqrtD = Math.sqrt(discriminant);
    return [
      { value: (-b + sqrtD) / (2 * a), multiplicity: 1 },
      { value: (-b - sqrtD) / (2 * a), multiplicity: 1 },
    ];
  } else if (discriminant === 0) {
    return [{ value: -b / (2 * a), multiplicity: 2 }];
  } else {
    const realPart = -b / (2 * a);
    const imagPart = Math.sqrt(-discriminant) / (2 * a);
    return [
      { value: realPart, imaginary: imagPart, multiplicity: 1 },
      { value: realPart, imaginary: -imagPart, multiplicity: 1 },
    ];
  }
}

/**
 * 求解一元三次方程 ax³ + bx² + cx + d = 0
 */
function solveCubic(a: number, b: number, c: number, d: number): CharacteristicRoot[] {
  if (a === 0) return solveQuadratic(b, c, d);

  const p = b / a;
  const q = c / a;
  const r = d / a;

  const A = q - p * p / 3;
  const B = r - p * q / 2 + p * p * p / 27;
  const discriminant = B * B / 4 + A * A * A / 27;

  const roots: CharacteristicRoot[] = [];
  const shift = p / 3;

  if (discriminant > 0) {
    const sqrtD = Math.sqrt(discriminant);
    const C = Math.cbrt(-B / 2 + sqrtD);
    const D = Math.cbrt(-B / 2 - sqrtD);
    roots.push({ value: C + D - shift, multiplicity: 1 });
    const realPart = -(C + D) / 2 - shift;
    const imagPart = Math.abs(C - D) * Math.sqrt(3) / 2;
    roots.push({ value: realPart, imaginary: imagPart, multiplicity: 1 });
    roots.push({ value: realPart, imaginary: -imagPart, multiplicity: 1 });
  } else if (discriminant === 0) {
    if (A === 0 && B === 0) {
      roots.push({ value: -shift, multiplicity: 3 });
    } else {
      const C = Math.cbrt(-B / 2);
      roots.push({ value: 2 * C - shift, multiplicity: 1 });
      roots.push({ value: -C - shift, multiplicity: 2 });
    }
  } else {
    const sqrtA3 = Math.sqrt(-A * A * A / 27);
    const cosTheta = -B / (2 * sqrtA3);
    const theta = Math.acos(Math.max(-1, Math.min(1, cosTheta)));
    for (let k = 0; k < 3; k++) {
      const angle = (theta + 2 * k * Math.PI) / 3;
      const y = 2 * Math.cbrt(sqrtA3) * Math.cos(angle);
      roots.push({ value: y - shift, multiplicity: 1 });
    }
  }

  return roots;
}

/**
 * 求解特征方程
 */
export function solveCharacteristicEquation(coeffs: number[]): CharacteristicRoot[] {
  const n = coeffs.length - 1;
  if (n === 1) {
    if (coeffs[0] === 0) return [];
    return [{ value: -coeffs[1] / coeffs[0], multiplicity: 1 }];
  } else if (n === 2) {
    return solveQuadratic(coeffs[0], coeffs[1], coeffs[2]);
  } else if (n === 3) {
    return solveCubic(coeffs[0], coeffs[1], coeffs[2], coeffs[3]);
  }
  return [];
}

/**
 * 构造齐次解表达式（带待定系数）
 */
function buildHomogeneousSolution(roots: CharacteristicRoot[]): { expression: string; numConstants: number } {
  const terms: string[] = [];
  let cIndex = 1;

  // 处理复根：共轭复根 α±βi 应合并为一个项
  const processedRoots: CharacteristicRoot[] = [];
  const seenImaginary: Set<string> = new Set();

  for (const root of roots) {
    if (root.imaginary !== undefined) {
      const key = `${formatNum(root.value)}_${formatNum(Math.abs(root.imaginary))}`;
      if (!seenImaginary.has(key)) {
        seenImaginary.add(key);
        processedRoots.push(root);
      }
    } else {
      processedRoots.push(root);
    }
  }

  for (const root of processedRoots) {
    if (root.imaginary !== undefined) {
      const alpha = root.value;
      const beta = Math.abs(root.imaginary);
      // beta 为 1 时省略
      const betaStr = Math.abs(beta - 1) < 1e-10 ? '' : formatNum(beta);

      for (let m = 0; m < root.multiplicity; m++) {
        const tPart = formatTPower(m);
        const tCoeff = tPart ? `${tPart}*` : '';

        if (Math.abs(alpha) < 1e-10) {
          terms.push(`${tCoeff}(C${cIndex}*cos(${betaStr}t) + C${cIndex + 1}*sin(${betaStr}t))`);
        } else {
          terms.push(`${tCoeff}e^(${formatNum(alpha)}t)*(C${cIndex}*cos(${betaStr}t) + C${cIndex + 1}*sin(${betaStr}t))`);
        }
        cIndex += 2;
      }
    } else {
      const r = root.value;
      // r 为 ±1 时省略 1
      const rStr = Math.abs(Math.abs(r) - 1) < 1e-10 ? (r < 0 ? '-' : '') : formatNum(r);

      for (let m = 0; m < root.multiplicity; m++) {
        const tPart = formatTPower(m);
        if (Math.abs(r) < 1e-10) {
          terms.push(m === 0 ? `C${cIndex}` : `C${cIndex}*${tPart}`);
        } else {
          const tCoeff = tPart ? `${tPart}*` : '';
          terms.push(`C${cIndex}*${tCoeff}e^(${rStr}t)`);
        }
        cIndex++;
      }
    }
  }

  return { expression: terms.join(' + '), numConstants: cIndex - 1 };
}

/**
 * 特解类型
 */
interface ParticularSolution {
  form: string;           // 形式，如 "A*cos(t) + B*sin(t)"
  coeffs: number[];       // 求解后的系数值 [A, B]
  expression: string;     // 代入系数后的表达式
}

/**
 * 展开微分算子 (b_n D^n + ... + b_1 D + b_0) * x(t)
 */
interface ExpandedExcitation {
  expression: string;
  type: 'zero' | 'constant' | 'exp' | 'sin_cos' | 'polynomial' | 'mixed';
  expCoeff?: number;
  sinFreq?: number;
  polyDegree?: number;
  coeffs: number[];
  hasImpulse?: boolean;
}

function expandDifferentialOperator(
  xCoeffs: number[],
  xFunc: string
): ExpandedExcitation {
  const order = xCoeffs.length - 1;

  const expMatch = xFunc.match(/e\^\(?(-?[\d.]*)\)?t/i) || xFunc.match(/exp\((-?[\d.]*)\*?t\)/i);
  const sinMatch = xFunc.match(/sin\(([\\d.]*)\*?t\)/i);
  const cosMatch = xFunc.match(/cos\(([\\d.]*)\*?t\)/i);
  const isU_t = xFunc.includes('u(t)');

  let alpha = 0;
  if (expMatch) {
    const alphaStr = expMatch[1];
    if (alphaStr === '' || alphaStr === '-') {
      alpha = alphaStr === '-' ? -1 : 1;
    } else {
      alpha = parseFloat(alphaStr) || 0;
    }
  }

  let beta = 1;
  if (sinMatch) beta = parseFloat(sinMatch[1]) || 1;
  if (cosMatch) beta = parseFloat(cosMatch[1]) || 1;

  // 情况 1: x(t) = 0
  if (xFunc === '0' || xFunc.trim() === '') {
    return { expression: '0', type: 'zero', coeffs: [] };
  }

  // 情况 2: x(t) = 常数
  if (xFunc === '1' || /^[\d.]+$/.test(xFunc.trim())) {
    const c = parseFloat(xFunc) || 1;
    const result = xCoeffs[xCoeffs.length - 1] * c;
    return {
      expression: formatNum(result),
      type: 'constant',
      coeffs: [result]
    };
  }

  // 情况 2.5: x(t) = u(t) 单位阶跃
  if (isU_t && !expMatch && !sinMatch && !cosMatch) {
    const b0 = xCoeffs[xCoeffs.length - 1] || 0;
    const b1 = xCoeffs.length >= 2 ? xCoeffs[xCoeffs.length - 2] : 0;
    const b2 = xCoeffs.length >= 3 ? xCoeffs[xCoeffs.length - 3] : 0;

    const terms: string[] = [];
    if (Math.abs(b0) > 1e-10) {
      terms.push(`${formatNum(b0)}*u(t)`);
    }
    if (Math.abs(b1) > 1e-10) {
      terms.push(`${formatNum(b1)}*δ(t)`);
    }
    if (Math.abs(b2) > 1e-10) {
      terms.push(`${formatNum(b2)}*δ'(t)`);
    }

    return {
      expression: terms.length > 0 ? terms.join(' + ') : '0',
      type: 'constant',
      coeffs: [b0, b1, b2],
      hasImpulse: Math.abs(b1) > 1e-10 || Math.abs(b2) > 1e-10
    };
  }

  // 情况 3: x(t) = e^(αt) 或 e^(αt)*u(t)
  if (expMatch && !sinMatch && !cosMatch) {
    if (isU_t) {
      let totalCoeff = 0;
      for (let i = 0; i < xCoeffs.length; i++) {
        const derivOrder = order - i;
        totalCoeff += xCoeffs[i] * Math.pow(alpha, derivOrder);
      }

      const impulseTerms: string[] = [];
      for (let impulseOrder = 0; impulseOrder < order; impulseOrder++) {
        let impulseCoeff = 0;
        for (let i = 0; i < xCoeffs.length; i++) {
          const derivOrder = order - i;
          if (derivOrder > impulseOrder) {
            const power = derivOrder - 1 - impulseOrder;
            impulseCoeff += xCoeffs[i] * Math.pow(alpha, power);
          }
        }

        if (Math.abs(impulseCoeff) > 1e-10) {
          if (impulseOrder === 0) {
            impulseTerms.push(`${formatNum(impulseCoeff)}*δ(t)`);
          } else if (impulseOrder === 1) {
            impulseTerms.push(`${formatNum(impulseCoeff)}*δ'(t)`);
          } else {
            impulseTerms.push(`${formatNum(impulseCoeff)}*δ^(${impulseOrder})(t)`);
          }
        }
      }

      const terms: string[] = [];
      if (Math.abs(totalCoeff) > 1e-10) {
        const coeff = formatNum(totalCoeff, true);
        terms.push(`${coeff ? coeff + '*' : ''}e^(${formatNum(alpha)}t)*u(t)`);
      }
      terms.push(...impulseTerms);

      return {
        expression: terms.length > 0 ? terms.join(' + ') : '0',
        type: 'exp',
        expCoeff: alpha,
        coeffs: [totalCoeff],
        hasImpulse: impulseTerms.length > 0
      };
    }

    let totalCoeff = 0;
    for (let i = 0; i < xCoeffs.length; i++) {
      const derivOrder = order - i;
      totalCoeff += xCoeffs[i] * Math.pow(alpha, derivOrder);
    }

    if (Math.abs(totalCoeff) < 1e-10) {
      return {
        expression: `t*e^(${formatNum(alpha)}t)`,
        type: 'exp',
        expCoeff: alpha,
        coeffs: [totalCoeff]
      };
    }

    const coeff = formatNum(totalCoeff, true);
    const expr = `${coeff ? coeff + '*' : ''}e^(${formatNum(alpha)}t)`;

    return {
      expression: expr,
      type: 'exp',
      expCoeff: alpha,
      coeffs: [totalCoeff]
    };
  }

  // 情况 4: x(t) = sin(βt) 或 cos(βt)
  if (sinMatch || cosMatch) {
    const isSin = xFunc.includes('sin');
    let sinCoeff = 0;
    let cosCoeff = 0;

    for (let i = 0; i < xCoeffs.length; i++) {
      const b = xCoeffs[i];
      const derivOrder = order - i;

      if (derivOrder % 2 === 0) {
        const factor = Math.pow(-1, derivOrder / 2) * Math.pow(beta, derivOrder);
        if (isSin) {
          sinCoeff += b * factor;
        } else {
          cosCoeff += b * factor;
        }
      } else {
        const factor = Math.pow(-1, (derivOrder - 1) / 2) * Math.pow(beta, derivOrder);
        if (isSin) {
          cosCoeff += b * factor;
        } else {
          sinCoeff -= b * factor;
        }
      }
    }

    const terms: string[] = [];
    if (Math.abs(sinCoeff) > 1e-10) {
      terms.push(`${formatNum(sinCoeff)}*sin(${formatNum(beta)}t)`);
    }
    if (Math.abs(cosCoeff) > 1e-10) {
      terms.push(`${formatNum(cosCoeff)}*cos(${formatNum(beta)}t)`);
    }

    return {
      expression: terms.length > 0 ? terms.join(' + ') : '0',
      type: 'sin_cos',
      sinFreq: beta,
      coeffs: [sinCoeff, cosCoeff]
    };
  }

  // 情况 5: x(t) = t
  if (xFunc === 't') {
    const tCoeff = xCoeffs[xCoeffs.length - 1] || 0;
    const constCoeff = xCoeffs.length >= 2 ? xCoeffs[xCoeffs.length - 2] : 0;

    const terms: string[] = [];
    if (Math.abs(tCoeff) > 1e-10) {
      terms.push(`${formatNum(tCoeff)}*t`);
    }
    if (Math.abs(constCoeff) > 1e-10) {
      terms.push(formatNum(constCoeff));
    }

    return {
      expression: terms.length > 0 ? terms.join(' + ') : '0',
      type: 'polynomial',
      polyDegree: 1,
      coeffs: [tCoeff, constCoeff]
    };
  }

  // 情况 6: x(t) = δ(t) 冲激函数
  if (xFunc.includes('δ(t)') && !xFunc.includes('u(t)') && !xFunc.includes('e^')) {
    const terms: string[] = [];
    for (let i = 0; i < xCoeffs.length; i++) {
      const b = xCoeffs[i];
      const derivOrder = order - i;

      if (Math.abs(b) > 1e-10) {
        if (derivOrder === 0) {
          terms.push(`${formatNum(b)}*δ(t)`);
        } else if (derivOrder === 1) {
          terms.push(`${formatNum(b)}*δ'(t)`);
        } else {
          terms.push(`${formatNum(b)}*δ^${derivOrder}(t)`);
        }
      }
    }

    return {
      expression: terms.length > 0 ? terms.join(' + ') : '0',
      type: 'mixed',
      coeffs: xCoeffs,
      hasImpulse: true
    };
  }

  return {
    expression: xFunc,
    type: 'mixed',
    coeffs: xCoeffs
  };
}

/**
 * 根据激励函数求解特解（待定系数法）
 */
function solveParticularSolution(
  yCoeffs: number[],
  expandedExcitation: ExpandedExcitation
): ParticularSolution {
  const a0 = yCoeffs[yCoeffs.length - 1];
  const a1 = yCoeffs.length >= 2 ? yCoeffs[yCoeffs.length - 2] : 0;
  const a2 = yCoeffs.length >= 3 ? yCoeffs[yCoeffs.length - 3] : 0;

  const xFunc = expandedExcitation.expression;
  const excType = expandedExcitation.type;
  const excCoeffs = expandedExcitation.coeffs;

  if (excType === 'zero' || xFunc === '0' || xFunc.trim() === '') {
    return { form: '0', coeffs: [], expression: '0' };
  }

  if (xFunc.includes('δ(t)') || xFunc.includes('δ\'(t)')) {
    const hasContinuousPart = xFunc.includes('u(t)') || xFunc.includes('e^') ||
                               xFunc.includes('sin') || xFunc.includes('cos') ||
                               /^[\d.]+$/.test(xFunc.split('+')[0].trim());

    if (!hasContinuousPart) {
      return { form: '0', coeffs: [], expression: '0' };
    }
  }

  if (excType === 'constant') {
    if (xFunc.includes('u(t)')) {
      const uMatch = xFunc.match(/(-?[\d.]+)\*?u\(t\)/);
      const c = uMatch ? parseFloat(uMatch[1]) : (excCoeffs[0] || 0);

      if (Math.abs(c) < 1e-10) {
        return { form: '0', coeffs: [], expression: '0' };
      }

      if (Math.abs(a0) > 1e-10) {
        const A = c / a0;
        return { form: 'A*u(t)', coeffs: [A], expression: `${formatNum(A)}*u(t)` };
      } else if (Math.abs(a1) > 1e-10) {
        const A = c / a1;
        return { form: 'A*t*u(t)', coeffs: [A], expression: `${formatNum(A)}*t*u(t)` };
      } else {
        const A = c / (2 * a2);
        return { form: 'A*t²*u(t)', coeffs: [A], expression: `${formatNum(A)}*t²*u(t)` };
      }
    }

    const c = excCoeffs[0] || 0;
    if (Math.abs(c) < 1e-10) {
      return { form: '0', coeffs: [], expression: '0' };
    }
    if (Math.abs(a0) > 1e-10) {
      const A = c / a0;
      return { form: 'A', coeffs: [A], expression: formatNum(A) };
    } else if (Math.abs(a1) > 1e-10) {
      const A = c / a1;
      return { form: 'A*t', coeffs: [A], expression: `${formatNum(A)}*t` };
    } else {
      const A = c / (2 * a2);
      return { form: 'A*t²', coeffs: [A], expression: `${formatNum(A)}*t²` };
    }
  }

  if (excType === 'exp' && expandedExcitation.expCoeff !== undefined) {
    const alpha = expandedExcitation.expCoeff;
    let coeff = excCoeffs[0] || 1;
    const hasU_t = xFunc.includes('u(t)');

    // 从表达式中提取 e^(αt)*u(t) 的系数
    const expPattern = new RegExp(`(-?[\\d.]+)\\*?e\\^\\(${alpha}[\\d.]*\\)t\\*?u\\(t\\)`);
    const expMatch = xFunc.match(expPattern);
    if (expMatch) {
      coeff = parseFloat(expMatch[1]);
    } else {
      const simplePattern = new RegExp(`e\\^\\(${alpha}[\\d.]*\\)t\\*?u\\(t\\)`);
      if (simplePattern.test(xFunc)) {
        coeff = 1;
      }
    }

    const charValue = yCoeffs.reduce((sum, c, i) => {
      const power = yCoeffs.length - 1 - i;
      return sum + c * Math.pow(alpha, power);
    }, 0);

    if (Math.abs(charValue) > 1e-10) {
      const A = coeff / charValue;
      const expr = hasU_t ? `${formatNum(A)}*e^(${formatNum(alpha)}t)*u(t)` : `${formatNum(A)}*e^(${formatNum(alpha)}t)`;
      return { form: hasU_t ? `A*e^(${formatNum(alpha)}t)*u(t)` : `A*e^(${formatNum(alpha)}t)`, coeffs: [A], expression: expr };
    } else {
      const charDerivValue = yCoeffs.reduce((sum, c, i) => {
        const power = yCoeffs.length - 1 - i;
        return sum + power * c * Math.pow(alpha, power - 1);
      }, 0);

      if (Math.abs(charDerivValue) > 1e-10) {
        const A = coeff / charDerivValue;
        const expr = hasU_t ? `${formatNum(A)}*t*e^(${formatNum(alpha)}t)*u(t)` : `${formatNum(A)}*t*e^(${formatNum(alpha)}t)`;
        return { form: hasU_t ? `A*t*e^(${formatNum(alpha)}t)*u(t)` : `A*t*e^(${formatNum(alpha)}t)`, coeffs: [A], expression: expr };
      } else {
        const charSecondDerivValue = yCoeffs.reduce((sum, c, i) => {
          const power = yCoeffs.length - 1 - i;
          return sum + power * (power - 1) * c * Math.pow(alpha, power - 2);
        }, 0);

        if (Math.abs(charSecondDerivValue) > 1e-10) {
          const A = 2 * coeff / charSecondDerivValue;
          const expr = hasU_t ? `${formatNum(A)}*t²*e^(${formatNum(alpha)}t)*u(t)` : `${formatNum(A)}*t²*e^(${formatNum(alpha)}t)`;
          return { form: hasU_t ? `A*t²*e^(${formatNum(alpha)}t)*u(t)` : `A*t²*e^(${formatNum(alpha)}t)`, coeffs: [A], expression: expr };
        }
      }

      return { form: `A*t^k*e^(${formatNum(alpha)}t)`, coeffs: [coeff], expression: `（高阶共振，需手动求解）` };
    }
  }

  if (excType === 'sin_cos' && expandedExcitation.sinFreq !== undefined) {
    const beta = expandedExcitation.sinFreq;
    const sinCoeff = excCoeffs[0] || 0;
    const cosCoeff = excCoeffs[1] || 0;

    const c = a0 - a2 * beta * beta;
    const d = a1 * beta;
    const det = c * c + d * d;

    if (Math.abs(det) > 1e-10) {
      const A = (c * cosCoeff - d * sinCoeff) / det;
      const B = (d * cosCoeff + c * sinCoeff) / det;

      const terms: string[] = [];
      if (Math.abs(A) > 1e-10) terms.push(`${formatNum(A)}*cos(${formatNum(beta)}t)`);
      if (Math.abs(B) > 1e-10) terms.push(`${formatNum(B)}*sin(${formatNum(beta)}t)`);

      return {
        form: `A*cos(${formatNum(beta)}t) + B*sin(${formatNum(beta)}t)`,
        coeffs: [A, B],
        expression: terms.length > 0 ? terms.join(' + ') : '0'
      };
    }
  }

  if (excType === 'polynomial') {
    const tCoeff = excCoeffs[0] || 0;
    const constCoeff = excCoeffs[1] || 0;

    if (Math.abs(a0) > 1e-10) {
      const A = tCoeff / a0;
      const B = (constCoeff - a1 * A) / a0;

      const terms: string[] = [];
      if (Math.abs(A) > 1e-10) terms.push(`${formatNum(A)}*t`);
      if (Math.abs(B) > 1e-10) terms.push(formatNum(B));

      return {
        form: 'A*t + B',
        coeffs: [A, B],
        expression: terms.length > 0 ? terms.join(' + ') : '0'
      };
    }
  }

  return { form: '待定', coeffs: [], expression: `（复杂激励: ${xFunc}，需手动求解）` };
}

/**
 * 计算齐次解及其导数在 t 处的值
 */
function computeHomogeneousBasis(roots: CharacteristicRoot[], t: number, maxOrder: number): number[][] {
  const basis: number[][] = [];
  let _cIndex = 0;

  const processedRoots: CharacteristicRoot[] = [];
  const seenImaginary: Set<string> = new Set();

  for (const root of roots) {
    if (root.imaginary !== undefined) {
      const key = `${formatNum(root.value)}_${formatNum(Math.abs(root.imaginary))}`;
      if (!seenImaginary.has(key)) {
        seenImaginary.add(key);
        processedRoots.push(root);
      }
    } else {
      processedRoots.push(root);
    }
  }

  for (const root of processedRoots) {
    if (root.imaginary !== undefined) {
      const alpha = root.value;
      const beta = Math.abs(root.imaginary);

      for (let m = 0; m < root.multiplicity; m++) {
        const cosTerm: number[] = [];
        const sinTerm: number[] = [];

        for (let order = 0; order <= maxOrder; order++) {
          if (Math.abs(t) < 1e-10) {
            if (order === 0) {
              cosTerm.push(m === 0 ? 1 : 0);
              sinTerm.push(0);
            } else if (order === 1) {
              cosTerm.push(alpha * (m === 0 ? 1 : 0));
              sinTerm.push(beta * (m === 0 ? 1 : 0));
            } else {
              cosTerm.push(0);
              sinTerm.push(0);
            }
          } else {
            cosTerm.push(0);
            sinTerm.push(0);
          }
        }

        basis.push(cosTerm);
        basis.push(sinTerm);
        _cIndex += 2;
      }
    } else {
      const r = root.value;
      for (let m = 0; m < root.multiplicity; m++) {
        const term: number[] = [];
        const expRt = Math.exp(r * t);

        for (let order = 0; order <= maxOrder; order++) {
          if (Math.abs(t) < 1e-10) {
            if (order === 0) {
              term.push(m === 0 ? 1 : 0);
            } else if (order === 1) {
              term.push(m === 1 ? 1 : (m === 0 ? r : 0));
            } else if (order === 2) {
              term.push(m === 2 ? 2 : (m === 1 ? 2 * r : (m === 0 ? r * r : 0)));
            } else {
              term.push(0);
            }
          } else {
            term.push(expRt * Math.pow(t, m));
          }
        }
        basis.push(term);
        _cIndex++;
      }
    }
  }

  return basis;
}

/**
 * 求解线性方程组 Ax = b
 */
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  if (n === 0) return null;

  const aug: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }

    if (maxVal < 1e-12) return null;

    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  const x: number[] = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= aug[i][j] * x[j];
    }
    x[i] = sum / aug[i][i];
  }

  return x;
}

/**
 * 代入初始条件求解待定系数
 */
function solveCoefficients(
  roots: CharacteristicRoot[],
  initialConditions: InitialCondition[],
  numConstants: number
): number[] | null {
  if (initialConditions.length !== numConstants) {
    return null;
  }

  const t = initialConditions[0].t;
  const basis = computeHomogeneousBasis(roots, t, Math.max(...initialConditions.map(ic => ic.order)));

  const A: number[][] = [];
  const b: number[] = [];

  for (const ic of initialConditions) {
    const row: number[] = [];
    for (let i = 0; i < numConstants; i++) {
      row.push(basis[i][ic.order] || 0);
    }
    A.push(row);
    b.push(ic.value);
  }

  return solveLinearSystem(A, b);
}

/**
 * 构造代入系数后的齐次解表达式
 */
function buildHomogeneousWithCoeffs(roots: CharacteristicRoot[], coefficients: number[]): string {
  const terms: string[] = [];
  let cIndex = 0;

  const processedRoots: CharacteristicRoot[] = [];
  const seenImaginary: Set<string> = new Set();

  for (const root of roots) {
    if (root.imaginary !== undefined) {
      const key = `${formatNum(root.value)}_${formatNum(Math.abs(root.imaginary))}`;
      if (!seenImaginary.has(key)) {
        seenImaginary.add(key);
        processedRoots.push(root);
      }
    } else {
      processedRoots.push(root);
    }
  }

  for (const root of processedRoots) {
    if (root.imaginary !== undefined) {
      const alpha = root.value;
      const beta = Math.abs(root.imaginary);
      const C1 = coefficients[cIndex];
      const C2 = coefficients[cIndex + 1];

      for (let m = 0; m < root.multiplicity; m++) {
        const tPart = formatTPower(m);
        const tCoeff = tPart ? `${tPart}*` : '';
        // beta 为 1 时省略
        const betaStr = Math.abs(beta - 1) < 1e-10 ? '' : formatNum(beta);

        // 构建三角函数部分，省略系数为 0 的项
        const trigTerms: string[] = [];
        if (Math.abs(C1) > 1e-10) {
          const c1Str = formatNum(C1, true);
          trigTerms.push(`${c1Str === '' ? '' : c1Str + '*'}cos(${betaStr}t)`);
        }
        if (Math.abs(C2) > 1e-10) {
          const c2Str = formatNum(C2, true);
          trigTerms.push(`${c2Str === '' ? '' : c2Str + '*'}sin(${betaStr}t)`);
        }

        const trigPart = trigTerms.length > 0 ? trigTerms.join(' + ') : '0';

        if (Math.abs(alpha) < 1e-10) {
          terms.push(`${tCoeff}${trigPart}`);
        } else {
          terms.push(`${tCoeff}e^(${formatNum(alpha)}t)*(${trigPart})`);
        }
        cIndex += 2;
      }
    } else {
      const r = root.value;
      const multiplicity = root.multiplicity;

      // 对于重根，合并为 (C1 + C2*t + ...)*e^(rt) 的形式
      if (multiplicity > 1) {
        const innerTerms: string[] = [];
        for (let m = 0; m < multiplicity; m++) {
          const C = coefficients[cIndex];
          const tPart = formatTPower(m);
          const cStr = formatNum(C, true);

          if (m === 0) {
            // 第一项没有 t
            innerTerms.push(formatNum(C));
          } else {
            // 后续项有 t^m
            if (cStr === '-') {
              innerTerms.push(`-${tPart}`);
            } else if (cStr === '') {
              innerTerms.push(tPart);
            } else {
              innerTerms.push(`${cStr}*${tPart}`);
            }
          }
          cIndex++;
        }

        // r 为 ±1 时省略 1
        const rStr = Math.abs(Math.abs(r) - 1) < 1e-10 ? (r < 0 ? '-' : '') : formatNum(r);
        const innerExpr = innerTerms.join(' + ').replace(/\+ -/g, '- ');

        if (Math.abs(r) < 1e-10) {
          terms.push(innerExpr);
        } else {
          terms.push(`(${innerExpr})*e^(${rStr}t)`);
        }
      } else {
        // 单根情况
        const C = coefficients[cIndex];
        const cStr = formatNum(C, true);
        const rStr = Math.abs(Math.abs(r) - 1) < 1e-10 ? (r < 0 ? '-' : '') : formatNum(r);

        if (Math.abs(r) < 1e-10) {
          terms.push(formatNum(C));
        } else {
          if (cStr === '-') {
            terms.push(`-e^(${rStr}t)`);
          } else if (cStr === '') {
            terms.push(`e^(${rStr}t)`);
          } else {
            terms.push(`${cStr}*e^(${rStr}t)`);
          }
        }
        cIndex++;
      }
    }
  }

  return terms.join(' + ');
}

/**
 * 调整初始条件（减去特解贡献）
 * 用于求解齐次解的待定系数
 */
function adjustInitialConditions(
  conditions: InitialCondition[],
  particular: ParticularSolution,
  _yCoeffs: number[]
): InitialCondition[] {
  const adjusted: InitialCondition[] = [];

  for (const cond of conditions) {
    let adjustment = 0;

    if (Math.abs(cond.t) < 1e-10) {
      const form = particular.form;
      const coeffs = particular.coeffs;

      // 特解为 0 或没有系数，不需要调整
      if (form === '0' || coeffs.length === 0) {
        adjusted.push({ ...cond });
        continue;
      }

      // 根据特解形式计算在 t=0 处的值和导数值
      if (form.includes('cos') && form.includes('sin')) {
        // 形式: A*cos(βt) + B*sin(βt)
        const betaMatch = form.match(/cos\(([\d.]*)\*?t\)/);
        const beta = betaMatch && betaMatch[1] ? parseFloat(betaMatch[1]) : 1;

        if (cond.order === 0 && coeffs.length >= 1) {
          adjustment = coeffs[0];  // y_p(0) = A
        } else if (cond.order === 1 && coeffs.length >= 2) {
          adjustment = coeffs[1] * beta;  // y_p'(0) = B*β
        } else if (cond.order === 2 && coeffs.length >= 2) {
          adjustment = -coeffs[0] * beta * beta;  // y_p''(0) = -A*β²
        }
      } else if (form.includes('e^')) {
        // 形式: A*e^(αt) 或 A*t*e^(αt)
        const alphaMatch = form.match(/e\^\(?(-?[\d.]*)\)?\*?t/);
        let alpha = 1;
        if (alphaMatch) {
          const alphaStr = alphaMatch[1];
          if (alphaStr === '' || alphaStr === '-') {
            alpha = alphaStr === '-' ? -1 : 1;
          } else {
            alpha = parseFloat(alphaStr) || 1;
          }
        }

        const hasT = form.includes('t*') || form.includes('t*e');

        if (cond.order === 0 && coeffs.length >= 1) {
          adjustment = coeffs[0];  // y_p(0) = A
        } else if (cond.order === 1 && coeffs.length >= 1) {
          if (hasT && coeffs.length >= 2) {
            // A*t*e^(αt): y_p'(0) = A + B*α
            adjustment = coeffs[0] + (coeffs[1] || 0) * alpha;
          } else {
            adjustment = coeffs[0] * alpha;  // y_p'(0) = A*α
          }
        } else if (cond.order === 2 && coeffs.length >= 1) {
          if (hasT && coeffs.length >= 2) {
            // A*t*e^(αt): y_p''(0) = 2*A*α + B*α²
            adjustment = 2 * coeffs[0] * alpha + (coeffs[1] || 0) * alpha * alpha;
          } else {
            adjustment = coeffs[0] * alpha * alpha;  // y_p''(0) = A*α²
          }
        }
      } else if (form.includes('t') && !form.includes('e^')) {
        // 形式: A*t + B（多项式）
        if (cond.order === 0 && coeffs.length >= 2) {
          adjustment = coeffs[1];  // y_p(0) = B
        } else if (cond.order === 1 && coeffs.length >= 2) {
          adjustment = coeffs[0];  // y_p'(0) = A
        } else if (cond.order === 2) {
          adjustment = 0;  // y_p''(0) = 0
        }
      } else if (coeffs.length >= 1) {
        // 常数或其他形式
        if (cond.order === 0) {
          adjustment = coeffs[0];
        }
      }
    }

    adjusted.push({
      t: cond.t,
      order: cond.order,
      value: cond.value - adjustment
    });
  }

  return adjusted;
}

/**
 * 格式化特征根显示
 */
function formatRoots(roots: CharacteristicRoot[]): string {
  return roots.map(r => {
    if (r.imaginary !== undefined) {
      const sign = r.imaginary >= 0 ? '+' : '-';
      return `${formatNum(r.value)} ${sign} ${formatNum(Math.abs(r.imaginary))}i`;
    }
    return formatNum(r.value);
  }).join(', ');
}

/**
 * 格式化特征方程
 */
function formatCharacteristicEquation(coeffs: number[]): string {
  const order = coeffs.length - 1;
  const terms: string[] = [];

  for (let i = 0; i < coeffs.length; i++) {
    const coeff = coeffs[i];
    if (Math.abs(coeff) < 1e-10) continue;

    const power = order - i;
    let term: string;

    if (Math.abs(coeff - 1) < 1e-10) {
      term = '';
    } else if (Math.abs(coeff + 1) < 1e-10) {
      term = '-';
    } else {
      term = `${formatNum(coeff)}`;
    }

    if (power === 0) {
      term += '1';
    } else if (power === 1) {
      term += 'r';
    } else {
      term += `r^${power}`;
    }

    terms.push(term);
  }

  return terms.join(' + ') + ' = 0';
}

/**
 * 冲激函数匹配法：计算 0- 到 0+ 的跳变
 */
function computeImpulseJump(
  yCoeffs: number[],
  expandedExcitation: ExpandedExcitation,
  initialConditionsMinus: InitialCondition[]
): InitialCondition[] {
  const order = yCoeffs.length - 1;
  const excExpr = expandedExcitation.expression;

  const hasDelta = excExpr.includes('δ(t)') || excExpr.includes('delta(t)');
  const hasDeltaPrime = excExpr.includes('δ\'(t)') || excExpr.includes('delta\'(t)') || excExpr.includes('δ(t)\'');

  if (!hasDelta && !hasDeltaPrime) {
    return initialConditionsMinus.map(ic => ({ ...ic, type: '0+' as const }));
  }

  const conditionsPlus: InitialCondition[] = initialConditionsMinus.map(ic => ({
    t: ic.t,
    order: ic.order,
    value: ic.value,
    type: '0+' as const
  }));

  let deltaCoeff = 0;
  let deltaPrimeCoeff = 0;

  if (hasDelta) {
    const deltaMatch = excExpr.match(/(-?[\d.]+)\*?δ\(t\)(?!')/);
    if (deltaMatch) {
      deltaCoeff = parseFloat(deltaMatch[1]);
    } else {
      const simpleDelta = excExpr.match(/(?<![\d*])δ\(t\)(?!')/);
      if (simpleDelta) {
        deltaCoeff = 1;
      }
    }
  }

  if (hasDeltaPrime) {
    const deltaPrimeMatch = excExpr.match(/(-?[\d.]+)\*?δ'\(t\)/);
    if (deltaPrimeMatch) {
      deltaPrimeCoeff = parseFloat(deltaPrimeMatch[1]);
    } else if (excExpr.includes("δ'(t)")) {
      deltaPrimeCoeff = 1;
    }
  }

  const a_n = yCoeffs[0];

  if (Math.abs(a_n) < 1e-10) {
    return conditionsPlus;
  }

  const A = deltaPrimeCoeff / a_n;
  const a_n1 = yCoeffs[1] || 0;
  const B = (deltaCoeff - a_n1 * A) / a_n;

  if (order >= 2) {
    const targetOrder = order - 2;
    for (const ic of conditionsPlus) {
      if (ic.order === targetOrder) {
        ic.value += A;
      }
    }
  }

  if (order >= 1) {
    const targetOrder = order - 1;
    for (const ic of conditionsPlus) {
      if (ic.order === targetOrder) {
        ic.value += B;
      }
    }
  }

  return conditionsPlus;
}

/**
 * 计算零输入响应
 */
function computeZeroInputResponse(
  _yCoeffs: number[],
  roots: CharacteristicRoot[],
  initialConditionsMinus: InitialCondition[]
): ZeroInputResponse {
  const { numConstants } = buildHomogeneousSolution(roots);

  const coefficients = solveCoefficients(roots, initialConditionsMinus, numConstants);

  if (coefficients) {
    const expression = buildHomogeneousWithCoeffs(roots, coefficients);
    return { expression, coefficients };
  }

  return { expression: '无法计算', coefficients: [] };
}

/**
 * 合并同类项
 */
function mergeResponses(
  zeroInput: ZeroInputResponse,
  zeroState: ZeroStateResponse,
  roots: CharacteristicRoot[]
): string {
  const ziCoeffs = zeroInput.coefficients;
  const zsCoeffs = zeroState.coefficients;

  if (ziCoeffs.length === 0 && zsCoeffs.length === 0) {
    if (zeroInput.expression === '无法计算' || zeroState.expression === '无法计算') {
      return '无法计算';
    }
    return `${zeroInput.expression} + ${zeroState.expression}`;
  }

  const mergedCoeffs: number[] = [];
  for (let i = 0; i < Math.max(ziCoeffs.length, zsCoeffs.length); i++) {
    const ziVal = ziCoeffs[i] || 0;
    const zsVal = zsCoeffs[i] || 0;
    mergedCoeffs.push(ziVal + zsVal);
  }

  const homogeneousPart = buildHomogeneousWithCoeffs(roots, mergedCoeffs);

  const particularPart = zeroState.particularPart;
  if (particularPart === '0' || particularPart === '' || particularPart === '无法计算') {
    return homogeneousPart;
  }

  return `${homogeneousPart} + ${particularPart}`;
}

/**
 * 计算单位冲激响应 h(t)
 *
 * 方法：拉普拉斯变换 + 多项式除法
 *
 * H(s) = Q(s)/P(s)，其中 P(s) 是特征多项式，Q(s) 是激励多项式
 * 当 deg(Q) >= deg(P) 时，需要多项式除法：
 *   H(s) = C(s) + R(s)/P(s)
 * 其中 C(s) 对应冲激项（δ(t) 及其导数），R(s)/P(s) 对应指数响应
 */
function computeImpulseResponse(
  yCoeffs: number[],
  roots: CharacteristicRoot[],
  xCoeffs: number[]
): ImpulseResponse {
  const { numConstants } = buildHomogeneousSolution(roots);

  // 步骤1：计算多项式除法
  // P(s) = a_n*s^n + ... + a_1*s + a_0 (特征多项式)
  // Q(s) = b_m*s^m + ... + b_1*s + b_0 (激励多项式)

  const pCoeffs = yCoeffs.slice(); // 从高阶到低阶
  const qCoeffs = xCoeffs.slice();

  // 多项式除法：Q(s) / P(s)
  // quotient 对应冲激项的系数，remainder 对应指数响应部分
  const impulseTerms: string[] = [];
  let remainder = [...qCoeffs];

  while (remainder.length >= pCoeffs.length) {
    // 计算商的最高次项
    const leadCoeff = remainder[0] / pCoeffs[0];
    const leadDegree = remainder.length - pCoeffs.length;

    // 添加对应的冲激项（formatNum 第二个参数 true 表示系数为1时返回空字符串）
    if (Math.abs(leadCoeff) > 1e-10) {
      const coeffStr = formatNum(leadCoeff, true);
      const coeffPrefix = coeffStr === '' ? '' : coeffStr + '*';
      if (leadDegree === 0) {
        impulseTerms.push(`${coeffPrefix}δ(t)`);
      } else if (leadDegree === 1) {
        impulseTerms.push(`${coeffPrefix}δ'(t)`);
      } else {
        impulseTerms.push(`${coeffPrefix}δ^(${leadDegree})(t)`);
      }
    }

    // 更新余式：remainder = remainder - leadCoeff * s^leadDegree * P(s)
    const newRemainder: number[] = [];
    for (let i = 0; i < remainder.length; i++) {
      const subVal = i < leadDegree ? 0 : leadCoeff * pCoeffs[i - leadDegree];
      const newVal = remainder[i] - subVal;
      if (newRemainder.length > 0 || Math.abs(newVal) > 1e-10 || i >= pCoeffs.length - 1) {
        newRemainder.push(newVal);
      }
    }

    // 移除前导零
    while (newRemainder.length > 0 && Math.abs(newRemainder[0]) < 1e-10) {
      newRemainder.shift();
    }

    remainder = newRemainder.length > 0 ? newRemainder : [0];
  }

  // 步骤2：计算余式部分对应的指数响应（用冲激匹配法）
  // 如果余式不为零，需要用原有的冲激匹配法计算
  let exponentialPart = '';
  let coefficients: number[] = [];

  const hasRemainder = remainder.length > 0 && (remainder.length > 1 || Math.abs(remainder[0]) > 1e-10);

  if (hasRemainder) {
    // 构造新的 x 系数（从余式）
    const remainderXCoeffs: number[] = [];
    const remainderOrder = remainder.length - 1;
    for (let i = 0; i <= remainderOrder; i++) {
      remainderXCoeffs.push(remainder[i]);
    }

    // 用冲激匹配法计算指数响应
    const zeroInitialConditions: InitialCondition[] = [];
    for (let i = 0; i < numConstants; i++) {
      zeroInitialConditions.push({ t: 0, order: i, value: 0, type: '0-' });
    }

    const remainderExcitation = expandDifferentialOperator(remainderXCoeffs, 'δ(t)');
    const conditionsPlus = computeImpulseJump(yCoeffs, remainderExcitation, zeroInitialConditions);
    coefficients = solveCoefficients(roots, conditionsPlus, numConstants) || [];

    if (coefficients.length > 0) {
      exponentialPart = buildHomogeneousWithCoeffs(roots, coefficients);
    }
  }

  // 步骤3：组合结果
  const parts: string[] = [];

  // 冲激项在前
  parts.push(...impulseTerms);

  // 指数响应在后：需要给表达式加上 *u(t)
  if (exponentialPart && exponentialPart !== '0') {
    // 如果已经有 u(t)，不要再加
    if (exponentialPart.includes('u(t)')) {
      parts.push(exponentialPart);
    } else {
      // 智能分割：只分割不在括号内的 '+'
      const expTerms: string[] = [];
      let depth = 0;
      let currentTerm = '';

      for (const char of exponentialPart) {
        if (char === '(') {
          depth++;
          currentTerm += char;
        } else if (char === ')') {
          depth--;
          currentTerm += char;
        } else if (char === '+' && depth === 0) {
          if (currentTerm.trim()) {
            expTerms.push(currentTerm.trim());
          }
          currentTerm = '';
        } else {
          currentTerm += char;
        }
      }
      if (currentTerm.trim()) {
        expTerms.push(currentTerm.trim());
      }

      // 给每项加上 *u(t)
      for (const term of expTerms) {
        parts.push(`${term}*u(t)`);
      }
    }
  }

  // 组合并格式化：处理 "+ -" → "- "
  let expression = parts.length > 0 ? parts.join(' + ') : '0';
  expression = expression.replace(/\+ -/g, '- ');

  return { expression, coefficients };
}

/**
 * 计算零状态响应
 */
function computeZeroStateResponse(
  yCoeffs: number[],
  roots: CharacteristicRoot[],
  particularSolution: ParticularSolution,
  initialConditionsPlus: InitialCondition[]
): ZeroStateResponse {
  const { numConstants } = buildHomogeneousSolution(roots);

  const adjustedConditions = adjustInitialConditions(initialConditionsPlus, particularSolution, yCoeffs);

  const coefficients = solveCoefficients(roots, adjustedConditions, numConstants);

  if (coefficients) {
    const homogeneousPart = buildHomogeneousWithCoeffs(roots, coefficients);
    const particularPart = particularSolution.expression;

    const expression = particularPart === '0' || particularPart === ''
      ? homogeneousPart
      : `${homogeneousPart} + ${particularPart}`;

    return {
      expression,
      homogeneousPart,
      particularPart,
      coefficients
    };
  }

  return {
    expression: '无法计算',
    homogeneousPart: '',
    particularPart: particularSolution.expression,
    coefficients: []
  };
}

/**
 * 主求解函数
 */
export function solveDifferentialEquation(
  yCoeffs: number[],
  _xCoeffs: number[],
  xFunc: string,
  initialConditions: InitialCondition[],
  conditionType: '0-' | '0+' | 'default' = 'default'
): DifferentialSolution {
  const createErrorResult = (error: string): DifferentialSolution => ({
    characteristicEquation: '',
    roots: [],
    rootsDisplay: '',
    homogeneous: '',
    particular: '',
    particularForm: '',
    expandedExcitation: '',
    generalSolution: '',
    finalSolution: '',
    coefficients: [],
    particularCoeffs: [],
    isValid: false,
    error,
  });

  try {
    if (yCoeffs.length < 2 || yCoeffs.length > 4) {
      return createErrorResult('方程阶数必须在 1-3 之间');
    }

    if (Math.abs(yCoeffs[0]) < 1e-10) {
      return createErrorResult('最高阶系数不能为 0');
    }

    const roots = solveCharacteristicEquation(yCoeffs);
    if (roots.length === 0) {
      return createErrorResult('特征方程求解失败');
    }

    const { expression: homogeneous, numConstants } = buildHomogeneousSolution(roots);

    const expandedExcitation = expandDifferentialOperator(_xCoeffs, xFunc);
    const expandedExcitationExpr = expandedExcitation.expression;

    const particularSolution = solveParticularSolution(yCoeffs, expandedExcitation);
    const particularForm = particularSolution.form;
    const particular = particularSolution.expression;
    const particularCoeffs = particularSolution.coeffs;

    const generalSolution = particular === '0' || particular === ''
      ? homogeneous
      : `${homogeneous} + ${particular}`;

    const initialConditionsMinus = initialConditions;
    let initialConditionsPlus = initialConditions;
    let zeroInputResponse: ZeroInputResponse | undefined;
    let zeroStateResponse: ZeroStateResponse | undefined;
    let completeResponse: string | undefined;
    const impulseResponse = computeImpulseResponse(yCoeffs, roots, _xCoeffs);

    const hasInitialConditions = initialConditions.length > 0;

    if (!hasInitialConditions) {
      return {
        characteristicEquation: formatCharacteristicEquation(yCoeffs),
        roots,
        rootsDisplay: formatRoots(roots),
        homogeneous,
        particular: '',
        particularForm: '',
        expandedExcitation: expandedExcitationExpr,
        generalSolution,
        finalSolution: '',
        coefficients: [],
        particularCoeffs: [],
        isValid: true,
        impulseResponse,
        conditionType: 'default',
      };
    }

    const hasImpulse = expandedExcitationExpr.includes('δ(t)') || expandedExcitationExpr.includes('δ\'(t)');

    if (conditionType === '0-' || hasImpulse) {
      initialConditionsPlus = computeImpulseJump(yCoeffs, expandedExcitation, initialConditions);

      zeroInputResponse = computeZeroInputResponse(yCoeffs, roots, initialConditionsMinus);

      // 零状态响应：初始条件为0，仅由输入引起
      // 需要计算在零初始条件下，冲激跳变后的值
      const zeroInitialConditionsForZS: InitialCondition[] = initialConditions.map(ic => ({
        ...ic,
        value: 0,
        type: '0-' as const
      }));
      const zeroStateConditionsPlus = computeImpulseJump(yCoeffs, expandedExcitation, zeroInitialConditionsForZS);

      // 零状态响应的初始条件就是跳变后的值
      zeroStateResponse = computeZeroStateResponse(yCoeffs, roots, particularSolution, zeroStateConditionsPlus);

      if (zeroInputResponse && zeroStateResponse) {
        completeResponse = mergeResponses(zeroInputResponse, zeroStateResponse, roots);
      }
    }

    const conditionsToUse = conditionType === '0-' ? initialConditionsPlus : initialConditions;
    const adjustedConditions = adjustInitialConditions(conditionsToUse, particularSolution, yCoeffs);
    const coefficients = solveCoefficients(roots, adjustedConditions, numConstants);

    let finalSolution = '';
    if (coefficients) {
      const homogeneousPart = buildHomogeneousWithCoeffs(roots, coefficients);
      if (particular === '0' || particular === '') {
        finalSolution = homogeneousPart;
      } else {
        finalSolution = `${homogeneousPart} + ${particular}`;
      }
    } else {
      finalSolution = generalSolution + '\n（初始条件不足或矛盾，无法确定待定系数）';
    }

    return {
      characteristicEquation: formatCharacteristicEquation(yCoeffs),
      roots,
      rootsDisplay: formatRoots(roots),
      homogeneous,
      particular,
      particularForm,
      expandedExcitation: expandedExcitationExpr,
      generalSolution,
      finalSolution,
      coefficients: coefficients || [],
      particularCoeffs,
      isValid: true,
      zeroInputResponse,
      zeroStateResponse,
      completeResponse,
      conditionType,
      initialConditionsPlus: conditionType === '0-' ? initialConditionsPlus : undefined,
      impulseResponse,
    };

  } catch (e) {
    return createErrorResult(`求解错误: ${(e as Error).message}`);
  }
}

/**
 * 格式化方程显示
 */
export function formatEquation(yCoeffs: number[], xCoeffs: number[], xFunc: string): string {
  const order = yCoeffs.length - 1;
  const yTerms: string[] = [];

  for (let i = 0; i <= order; i++) {
    const coeff = yCoeffs[i];
    if (Math.abs(coeff) < 1e-10) continue;

    const deriv = order - i;
    let term: string;
    if (Math.abs(coeff - 1) < 1e-10) {
      term = '';
    } else if (Math.abs(coeff + 1) < 1e-10) {
      term = '-';
    } else {
      term = `${formatNum(coeff)}`;
    }

    if (deriv === 0) {
      term += 'y';
    } else if (deriv === 1) {
      term += "y'";
    } else if (deriv === 2) {
      term += "y''";
    } else {
      term += `y^(${deriv})`;
    }

    yTerms.push(term);
  }

  const xExpr = Math.abs(xCoeffs[0] - 1) < 1e-10 && xCoeffs.slice(1).every(c => Math.abs(c) < 1e-10)
    ? xFunc
    : `${formatNum(xCoeffs[0])}*${xFunc}`;

  return `${yTerms.join(' + ')} = ${xExpr}`;
}
