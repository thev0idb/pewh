// Run: node --test tests/directory-import.test.cjs
// Uses existing React/TypeScript packages; no test dependencies required.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
let role = 'admin';

// Compile TSX in memory, without writing generated files or changing node_modules.
for (const extension of ['.tsx', '.ts']) {
  require.extensions[extension] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    module._compile(ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
      fileName: filename,
    }).outputText, filename);
  };
}
const originalRequire = Module.prototype.require;
Module.prototype.require = function (name) {
  if (name.endsWith('/context/AuthContext')) return {
    useAuth: () => ({ user: role ? { name: 'Pengguna Uji', role } : null, loading: false, logout() {} }),
  };
  return originalRequire.call(this, name);
};
const App = require('../src/App.tsx').default;
const ImportStudents = require('../src/pages/ImportStudents.tsx').default;
function render(Component, route = '/') {
  return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(Component)));
}

test('admin and guru can open directory and see navigation, student filter and loading state', () => {
  for (role of ['admin', 'guru']) {
    const html = render(App, '/direktori');
    assert.match(html, /href="\/direktori"/);
    assert.match(html, /Direktori Sekolah/);
    assert.match(html, /Memuat direktori/);
    assert.match(html, /value="participants"/);
    assert.match(html, /value="nonparticipants"/);
    assert.match(html, /maxlength="255"/i);
  }
});
test('students cannot open directory or see its navigation', () => {
  role = 'siswa';
  const html = render(App, '/direktori');
  assert.match(html, /Akses ditolak/);
  assert.doesNotMatch(html, /href="\/direktori"/);
  assert.doesNotMatch(html, /directory-search/);
});
test('guru cannot access admin import form', () => {
  role = 'guru';
  const html = render(App, '/import');
  assert.match(html, /Akses ditolak/);
  assert.doesNotMatch(html, /type="file"/);
});
test('import renders file restrictions, template action and accurate column guidance', () => {
  const html = render(ImportStudents);
  assert.match(html, /accept="\.csv,\.xlsx,\.xls"/);
  assert.match(html, /Unduh template CSV/);
  for (const column of ['name', 'username', 'nis', 'password', 'class_room', 'email', 'phone', 'is_bimbel']) {
    assert.ok(html.includes(`<code>${column}</code>`));
  }
  for (const text of ['5120 KiB', '8–255', 'tidak pernah mengubah password', '5000', 'worksheet pertama', 'atomik', 'nol di awal', 'true/false', 'mempertahankan nilai siswa lama']) {
    assert.ok(html.includes(text), `Missing guidance: ${text}`);
  }
});
