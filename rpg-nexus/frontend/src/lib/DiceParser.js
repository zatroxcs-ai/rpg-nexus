// frontend/src/lib/DiceParser.js
// Parser de formules de dés (1d20+5, 3d6-2, etc.)

export function parseDiceFormula(formula) {
  // Nettoie la formule
  formula = formula.trim().toLowerCase().replace(/\s+/g, '');

  // Regex : NdX+Y ou NdX-Y ou juste NdX
  const regex = /^(\d+)d(\d+)([+-]\d+)?$/;
  const match = formula.match(regex);

  if (!match) {
    throw new Error('Format invalide. Utilisez : NdX+Y (ex: 1d20+5)');
  }

  const count = parseInt(match[1], 10);
  const diceType = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  // Validations
  if (count < 1 || count > 100) {
    throw new Error('Nombre de dés invalide (1-100)');
  }

  const validDiceTypes = [4, 6, 8, 10, 12, 20, 100];
  if (!validDiceTypes.includes(diceType)) {
    throw new Error('Type de dé invalide (d4, d6, d8, d10, d12, d20, d100)');
  }

  if (Math.abs(modifier) > 999) {
    throw new Error('Modificateur trop grand (-999 à +999)');
  }

  return {
    count,
    diceType,
    modifier,
    formula: `${count}d${diceType}${modifier !== 0 ? (modifier > 0 ? '+' : '') + modifier : ''}`,
  };
}

export function rollDice(count, diceType) {
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(Math.floor(Math.random() * diceType) + 1);
  }
  return results;
}

export function calculateTotal(results, modifier) {
  const sum = results.reduce((a, b) => a + b, 0);
  return sum + modifier;
}

export function rollWithAdvantage(diceType) {
  const roll1 = Math.floor(Math.random() * diceType) + 1;
  const roll2 = Math.floor(Math.random() * diceType) + 1;
  const kept = Math.max(roll1, roll2);
  const discarded = Math.min(roll1, roll2);
  
  return {
    results: [roll1, roll2],
    kept,
    discarded,
    total: kept,
  };
}

export function rollWithDisadvantage(diceType) {
  const roll1 = Math.floor(Math.random() * diceType) + 1;
  const roll2 = Math.floor(Math.random() * diceType) + 1;
  const kept = Math.min(roll1, roll2);
  const discarded = Math.max(roll1, roll2);
  
  return {
    results: [roll1, roll2],
    kept,
    discarded,
    total: kept,
  };
}
