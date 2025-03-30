export function getLabelTokens(name: string, maxTokenLength = 17) {
  const nameParts = name.split(/\s+/g);
  const tokens: Array<string> = [];
  if (nameParts.length <= 2) {
    return nameParts;
  } else if (nameParts.length === 3) {
    return nameParts[0].length > nameParts[2].length
      ? [nameParts[0], `${nameParts[1]} ${nameParts[2]}`]
      : [`${nameParts[0]} ${nameParts[1]}`, nameParts[2]];
  }
  while (nameParts.length) {
    const part = nameParts.shift();
    if (part && part.length) {
      if (tokens.length > 0 && tokens[tokens.length - 1].length + 1 + part.length <= maxTokenLength) {
        tokens[tokens.length - 1] += ` ${part}`;
      } else {
        tokens.push(part);
      }
    }
  }
  return tokens;
}
