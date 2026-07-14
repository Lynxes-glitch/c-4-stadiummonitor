import fs from 'fs';
import { minify } from 'terser';

async function minifyJS(src) {
  const result = await minify(src, {
    compress: {
      dead_code: true,
      drop_console: false,
      drop_debugger: true,
      pure_funcs: []
    },
    mangle: false, // Don't mangle names - safer
    format: {
      comments: false
    }
  });
  return result.code;
}

function minifyCSS(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1');
}

console.log('🔧 Minifying assets...');

const js = fs.readFileSync('public/js/app.js', 'utf8');
const css = fs.readFileSync('public/css/styles.css', 'utf8');

const minJS = await minifyJS(js);
const minCSS = minifyCSS(css);

fs.writeFileSync('public/js/app.min.js', minJS);
fs.writeFileSync('public/css/styles.min.css', minCSS);

console.log(`✅ JS: ${(minJS.length/1024).toFixed(1)}KB (was ${(js.length/1024).toFixed(1)}KB)`);
console.log(`✅ CSS: ${(minCSS.length/1024).toFixed(1)}KB (was ${(css.length/1024).toFixed(1)}KB)`);
