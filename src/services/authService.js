/**
 * Supervisor authentication service
 * Uses Firebase Authentication (email/password) for supervisors.
 * Supervisor profile (fullName, department) is stored in Firestore under
 * the `supervisors/{uid}` collection.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { logAuditEvent } from './auditService';

// ─── Session flag (mirrors old behaviour so MainLayout still works) ──────────
const ADMIN_SESSION_KEY = 'admin_authenticated';

export function setAdminAuthenticated() {
  localStorage.setItem(ADMIN_SESSION_KEY, 'true');
}

export function isAdminAuthenticated() {
  return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
}

export function clearAdminAuth() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

// ─── Register a new supervisor ───────────────────────────────────────────────
/**
 * Creates a Firebase Auth user and stores profile in Firestore.
 * @param {string} fullName
 * @param {string} email
 * @param {string} department
 * @param {string} password
 */
export async function registerSupervisor(fullName, email, department, password) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    await setDoc(doc(db, 'supervisors', uid), {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      department,
      createdAt: new Date().toISOString(),
    });

    return { success: true, uid, fullName, department };
  } catch (error) {
    console.error('registerSupervisor error — code:', error.code, '| message:', error.message);
    return { success: false, error: _friendlyAuthError(error.code) };
  }
}

// ─── Login an existing supervisor ────────────────────────────────────────────
/**
 * Signs in with Firebase Auth, then loads the supervisor profile from Firestore.
 * @param {string} email
 * @param {string} password
 */
export async function loginSupervisor(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    const profileSnap = await getDoc(doc(db, 'supervisors', uid));
    if (!profileSnap.exists()) {
      // Signed in but no profile — edge case, still allow with placeholder
      return { success: true, fullName: 'Supervisor', department: '' };
    }

    const { fullName, department } = profileSnap.data();
    return { success: true, fullName, department };
  } catch (error) {
    console.error('loginSupervisor error:', error);
    return { success: false, error: _friendlyAuthError(error.code) };
  }
}

// ─── Password reset (sends email via Firebase) ───────────────────────────────
/**
 * Sends a password-reset email through Firebase Authentication.
 * @param {string} email
 */
export async function sendSupervisorPasswordReset(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('sendPasswordReset error:', error);
    return { success: false, error: _friendlyAuthError(error.code) };
  }
}

// ─── Sign out ─────────────────────────────────────────────────────────────────
export async function logoutSupervisor() {
  try {
    await signOut(auth);
    clearAdminAuth();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── Legacy stubs (kept so nothing else breaks) ──────────────────────────────
export async function getAdminData() { return null; }
export async function isSupervisorRegistered() { return false; }
export async function getAdminPassword() { return null; }
export async function getAdminName() { return null; }
export async function setAdminData() { return { success: true }; }
export async function setAdminPassword() { return { success: true }; }
export async function clearAdminData() { clearAdminAuth(); return { success: true }; }

/** @deprecated Use loginSupervisor instead */
export async function verifySupervisorCredentials(name, password) {
  return { success: false, error: 'Use the new supervisor login page.' };
}

/** @deprecated */
export async function changeAdminPassword(oldPassword, newPassword) {
  return { success: false, error: 'Use Firebase password reset instead.' };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function _friendlyAuthError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please log in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact your administrator.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled. Please enable it in the Firebase Console under Authentication → Sign-in method.';
    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not configured correctly. Check your Firebase project settings.';
    default:
      // Always include the raw code so it's diagnosable
      return `Authentication failed (${code ?? 'unknown'}). Please try again.`;
  }
}
