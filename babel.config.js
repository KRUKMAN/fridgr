module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@stores': './src/stores',
            '@models': './src/models',
            '@lib': './src/lib',
            '@hooks': './src/hooks',
            '@types': './src/types',
            '@navigation': './src/navigation',
            '@services': './src/services',
            '@domains': './src/domains',
          },
        },
      ],
    ],
  };
};
