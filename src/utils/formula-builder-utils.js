/** Sentinel option used when Y-axis measure is a formula from the builder. */
export const FORMULA_SENTINEL = {
  value: 'formula',
  label: 'Formula',
  is_formula: true,
  doctype: null,
  fieldname: null,
};

export function isFormulaSentinel(option) {
  return Boolean(option?.is_formula);
}

const OPERATOR_DISPLAY = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

export function formatFormulaTermLabel(term) {
  if (!term) return '';
  const field = term.field_label || term.fieldname || '?';
  const doctype = term.doctype ? `${term.doctype}.` : '';
  return `${term.aggregation}(${doctype}${field})`;
}

export function formatFormulaExpression(formulaJson) {
  const terms = Array.isArray(formulaJson?.terms) ? formulaJson.terms : [];
  if (terms.length === 0) return '';

  return terms
    .map((term, index) => {
      const label = formatFormulaTermLabel(term);
      if (index === 0) return label;
      const op = OPERATOR_DISPLAY[term.operator] || term.operator || '+';
      return `${op} ${label}`;
    })
    .join(' ');
}

export function getFormulaDoctypes(formulaJson) {
  const terms = Array.isArray(formulaJson?.terms) ? formulaJson.terms : [];
  return [...new Set(terms.map((term) => term.doctype).filter(Boolean))];
}

/**
 * Validate formula JSON for preview/save.
 *
 * @param {object|null|undefined} formulaJson
 * @param {{ pendingTerm?: object|null }} [options]
 */
export function validateFormulaJson(formulaJson, options = {}) {
  const terms = Array.isArray(formulaJson?.terms) ? formulaJson.terms : [];
  const { pendingTerm = null } = options;
  const errors = [];

  if (terms.length === 0 && !pendingTerm) {
    return { valid: false, errors: [], isEmpty: true };
  }

  terms.forEach((term, index) => {
    if (!term?.aggregation) {
      errors.push(`Term ${index + 1} is missing an aggregation function.`);
    }
    if (!term?.doctype || !term?.fieldname) {
      errors.push(`Term ${index + 1} is missing a doctype or field.`);
    }
  });

  if (pendingTerm) {
    if (!pendingTerm.aggregation) {
      errors.push('Complete the current term by choosing an aggregation function.');
    } else if (!pendingTerm.doctype || !pendingTerm.fieldname) {
      errors.push('Complete the current term by choosing a doctype and field.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    isEmpty: terms.length === 0 && !pendingTerm,
  };
}

export function formulaHasCompleteTerms(formulaJson) {
  const terms = Array.isArray(formulaJson?.terms) ? formulaJson.terms : [];
  return (
    terms.length > 0 && terms.every((term) => term?.aggregation && term?.doctype && term?.fieldname)
  );
}

export function getFormulaCompatibility(formulaJson, xAxisOption) {
  if (!formulaHasCompleteTerms(formulaJson) || !xAxisOption?.doctype) {
    return null;
  }

  const formulaDoctypes = getFormulaDoctypes(formulaJson);
  if (formulaDoctypes.length === 0) return null;

  const xDoctype = xAxisOption.doctype;
  const sharesSource = formulaDoctypes.includes(xDoctype);

  return {
    sharesSource,
    formulaDoctypes,
    xDoctype,
  };
}
