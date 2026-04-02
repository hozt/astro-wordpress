/**
 * @file postcss.config.js
 * @description PostCSS pipeline configuration: Tailwind CSS, Autoprefixer, and CSSNano minification.
 */

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    cssnano: {preset: 'default'},
  },
}
