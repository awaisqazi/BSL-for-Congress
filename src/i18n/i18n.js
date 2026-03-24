/**
 * Client-side bilingual toggle for EN/ES
 * Uses data-i18n attributes to swap text content
 */

import en from './en.json';
import es from './es.json';

const translations = { en, es };

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc && acc[key], obj);
}

export function getCurrentLang() {
  return localStorage.getItem('bsl-lang') || 'en';
}

export function setLang(lang) {
  localStorage.setItem('bsl-lang', lang);
  applyTranslations(lang);
  document.documentElement.setAttribute('lang', lang);
  
  // Update toggle buttons
  document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.langToggle === lang);
  });
}

export function applyTranslations(lang) {
  const t = translations[lang] || translations.en;
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const value = getNestedValue(t, key);
    if (value) {
      if (el.tagName === 'INPUT' && el.type !== 'submit') {
        el.placeholder = value;
      } else {
        el.textContent = value;
      }
    }
  });
}

export function initI18n() {
  const lang = getCurrentLang();
  setLang(lang);
  
  // Bind toggle buttons
  document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      setLang(btn.dataset.langToggle);
    });
  });
}
