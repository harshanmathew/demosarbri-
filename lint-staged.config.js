module.exports = {
    '**/*.{js,ts,json,md}': [
      'biome format --stdin-filepath',
      'biome check . --write',
    ],
  };
  