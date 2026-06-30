import { normalizePhone, looksLikePhone } from '../utils/phoneUtils';
import { logAuditEvent } from './auditService';
import { handleError } from '../utils/errorHandler';
import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, query, where, setDoc, addDoc, updateDoc } from 'firebase/firestore';

const EMPLOYEES_COLLECTION = 'employees';

export async function findEmployeeByPhone(phone) {
  try {
    const normalized = normalizePhone(phone);
    const q = query(collection(db, EMPLOYEES_COLLECTION), where('phone', '==', normalized));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    throw handleError(error);
  }
}

export async function findEmployeeByIdentifier(identifier) {
  try {
    const trimmed = identifier.trim();
    if (!trimmed) return null;

    if (looksLikePhone(trimmed)) {
      const phone = normalizePhone(trimmed);
      return await findEmployeeByPhone(phone);
    }

    // Search by name
    const q = query(collection(db, EMPLOYEES_COLLECTION));
    const querySnapshot = await getDocs(q);
    
    const lower = trimmed.toLowerCase();
    const employees = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return (
      employees.find((emp) => emp.fullName.toLowerCase() === lower) ||
      employees.find((emp) => emp.fullName.toLowerCase().includes(lower)) ||
      null
    );
  } catch (error) {
    throw handleError(error);
  }
}

export async function registerEmployee(employeeData) {
  try {
    const phone = normalizePhone(employeeData.phone);
    
    // Check if phone already exists
    const existing = await findEmployeeByPhone(phone);
    if (existing) {
      return { success: false, error: 'This phone number is already registered' };
    }

    const employee = {
      phone,
      fullName: employeeData.fullName.trim(),
      department: employeeData.department.trim(),
      email: employeeData.email.trim().toLowerCase(),
      registeredAt: new Date().toISOString(),
      approvalStatus: 'pending',
    };

    // Use phone as document ID for easy lookup
    const docRef = doc(db, EMPLOYEES_COLLECTION, phone);
    await setDoc(docRef, employee);
    // Log audit event
    await logAuditEvent('employee_registered', 'employee', phone, { 
      fullName: employee.fullName, 
      department: employee.department, 
      email: employee.email 
    }, phone);
    return { success: true, employee: { id: phone, ...employee } };
  } catch (error) {
    return handleError(error);
  }
}

export async function getAllEmployees() {
  try {
    const querySnapshot = await getDocs(collection(db, EMPLOYEES_COLLECTION));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw handleError(error);
  }
}

export async function getEmployeeName(phone) {
  const emp = await findEmployeeByPhone(phone);
  return emp?.fullName || 'Unknown';
}

// ─── Approval workflow functions ─────────────────────────────────────────────

/**
 * Get all employees with pending approval status
 */
export async function getPendingEmployees() {
  try {
    const q = query(collection(db, EMPLOYEES_COLLECTION), where('approvalStatus', '==', 'pending'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw handleError(error);
  }
}

/**
 * Approve an employee registration
 * @param {string} phone - Employee phone number (document ID)
 * @param {string} supervisorName - Name of supervisor approving
 */
export async function approveEmployee(phone, supervisorName) {
  try {
    const docRef = doc(db, EMPLOYEES_COLLECTION, phone);
    await updateDoc(docRef, {
      approvalStatus: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: supervisorName,
    });
    
    await logAuditEvent('employee_approved', 'employee', phone, {
      approvedBy: supervisorName,
    }, phone);
    
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Reject an employee registration
 * @param {string} phone - Employee phone number (document ID)
 * @param {string} supervisorName - Name of supervisor rejecting
 * @param {string} reason - Optional rejection reason
 */
export async function rejectEmployee(phone, supervisorName, reason = '') {
  try {
    const docRef = doc(db, EMPLOYEES_COLLECTION, phone);
    await updateDoc(docRef, {
      approvalStatus: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectedBy: supervisorName,
      rejectionReason: reason,
    });
    
    await logAuditEvent('employee_rejected', 'employee', phone, {
      rejectedBy: supervisorName,
      reason,
    }, phone);
    
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Check if an employee is approved (treats missing approvalStatus as approved for grandfathering)
 * @param {string} phone - Employee phone number
 */
export async function isEmployeeApproved(phone) {
  try {
    const emp = await findEmployeeByPhone(phone);
    if (!emp) return false;
    
    // If approvalStatus doesn't exist, treat as approved (grandfathering)
    if (!emp.approvalStatus) return true;
    
    return emp.approvalStatus === 'approved';
  } catch (error) {
    throw handleError(error);
  }
}
