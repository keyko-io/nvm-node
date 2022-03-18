module.exports = {
  NODE_ENV: 'production',
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
  server: {
    port: process.env.PORT || 3100,
  },
  src: {
    root: 'dist',
    fileExtension: 'js',
  },
  security: {
    enableHttpsRedirect: process.env.ENABLE_HTTPS_REDIRECT,
  },
  elasticsearch: {
    node: process.env.ELASTIC_NODE,
    auth: {
      username: process.env.ELASTIC_USERNAME,
      password: process.env.ELASTIC_PASSWORD,
    },
  },
};
