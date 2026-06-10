const WORDS = [
  "ROBOT", "AVION", "LUNE", "SOLEIL", "ARBRE", "MAISON", "OCEAN", "FORÊT",
  "PONT", "NUAGE", "FLEUR", "ÉTOILE", "MOULIN", "PLAGE", "RIVIÈRE", "MONTAGNE",
  "JARDIN", "MOUSSE", "OISEAU", "TIGRE", "BALLON", "CRAYON", "FENÊTRE", "LAMPE",
  "TABLE", "LIVRE", "PORTE", "CLEF", "STYLO", "CAHIER",
];

const COLORS = [
  "VERT", "BLEU", "ROUGE", "JAUNE", "VIOLET", "ORANGE", "BLANC", "NOIR",
  "GRIS", "ROSE", "BEIGE", "INDIGO",
];

function rand(max: number): number {
  return Math.floor(Math.random() * max);
}

export function generateReadablePassword(): string {
  const word1 = WORDS[rand(WORDS.length)];
  const word2 = WORDS[rand(WORDS.length)];
  const num = String(rand(90) + 10); // 10–99
  const color = COLORS[rand(COLORS.length)];
  return `${word1}-${word2}-${num}-${color}`;
}
