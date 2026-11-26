// Lapisan tipis di atas React. Halaman lama tetap memakai `element(...)`,
// tetapi yang menjalankan render, state, dan effect sekarang adalah React asli.
// Untuk kode baru, boleh langsung import dari 'react'.
import { createElement, Fragment, useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

export const element = createElement;
export const group = Fragment;
export { useState, useRef, useEffect };

export function mount(root, view) {
    createRoot(root).render(view);
}
