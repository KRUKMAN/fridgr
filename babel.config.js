module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['inline-import', { extensions: ['.sql'] }],
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': '.',
            '@db': './src/db',
            '@components': './src/components',
            '@theme': './src/theme',
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
      'react-native-reanimated/plugin',
    ],
  };
};
