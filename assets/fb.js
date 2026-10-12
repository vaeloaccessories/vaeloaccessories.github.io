/* VAELO · Firebase bağlantısı (üyelik + istatistik + admin paneli ortak ayarı).
 * Bu bilgiler gizli değildir; güvenliği Firestore kuralları (firestore.rules) sağlar. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';

export const ADMIN_EMAIL = 'vaeloaccessories@gmail.com';

const app = initializeApp({
  apiKey: 'AIzaSyAX_6qzkUytZDPAvvAbPmWQJ2utij_E25k',
  authDomain: 'vaelo-8c726.firebaseapp.com',
  projectId: 'vaelo-8c726',
  storageBucket: 'vaelo-8c726.firebasestorage.app',
  messagingSenderId: '709324832573',
  appId: '1:709324832573:web:eff6382e01cfda858a0f54'
});

export const auth = getAuth(app);
auth.languageCode = 'tr';
export const db = getFirestore(app);

/** Türkiye saatine göre bugünün tarihi: 2026-10-12 */
export function gun(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d || new Date());
}

const HATALAR = {
  'auth/invalid-email': 'E-posta adresi geçerli görünmüyor.',
  'auth/missing-email': 'Lütfen e-posta adresinizi yazın.',
  'auth/missing-password': 'Lütfen şifrenizi yazın.',
  'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
  'auth/email-already-in-use': 'Bu e-posta ile zaten bir üyelik var. Giriş yapmayı deneyin.',
  'auth/invalid-credential': 'E-posta veya şifre hatalı.',
  'auth/wrong-password': 'E-posta veya şifre hatalı.',
  'auth/user-not-found': 'Bu e-posta ile kayıtlı üye bulunamadı.',
  'auth/too-many-requests': 'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.',
  'auth/network-request-failed': 'İnternet bağlantısı kurulamadı. Lütfen tekrar deneyin.',
  'auth/user-disabled': 'Bu üyelik askıya alınmış. Lütfen bizimle iletişime geçin.'
};
export function hataMetni(e) {
  return HATALAR[e && e.code] || 'Bir sorun oluştu. Lütfen tekrar deneyin.';
}
