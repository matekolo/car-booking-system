export default {
  modules: [
      '@nuxtjs/tailwindcss',
  ],

  css: [
      'bootstrap/dist/css/bootstrap.css',
  ],

  build: {
      postcss: {
          plugins: {
              tailwindcss: {},
              autoprefixer: {},
          },
      },
  },

  server: {
      port: 3001, // Zmie� port na 3001
  },

  compatibilityDate: '2024-12-12',
};