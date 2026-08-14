const HttpError = require('../utils/http-error');

function calculateDistribution(totalAmount, rules) {
  const total = Number(totalAmount);
  const percentage = rules.reduce((sum, rule) => sum + Number(rule.percentage), 0);
  if (!Number.isFinite(total) || total <= 0) throw new HttpError(400, 'La bolsa debe ser mayor que cero');
  if (Math.abs(percentage - 100) > 0.001) throw new HttpError(400, 'Los porcentajes deben sumar 100');

  let assigned = 0;
  return rules.map((rule, index) => {
    const amount = index === rules.length - 1
      ? Math.round((total - assigned) * 100) / 100
      : Math.round(total * Number(rule.percentage)) / 100;
    assigned += amount;
    return { position: rule.position, percentage: Number(rule.percentage), amount };
  });
}

module.exports = { calculateDistribution };
