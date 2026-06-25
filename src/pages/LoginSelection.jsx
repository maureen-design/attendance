import { useNavigate } from 'react-router-dom';
import { ROLES } from '../data/constants';
import {
  setSessionRole,
  clearSessionPhone,
  clearSessionSupervisorName,
  clearSessionSupervisorDepartment,
} from '../services/storageService';

export default function LoginSelection() {
  const navigate = useNavigate();

  const selectRole = (role) => {
    clearSessionPhone();
    clearSessionSupervisorName();
    clearSessionSupervisorDepartment();
    setSessionRole(role);

    if (role === ROLES.EMPLOYEE) {
      navigate('/attachee/attendance');
    } else {
      // Navigate to dedicated supervisor auth page (register / login)
      navigate('/supervisor/login');
    }
  };

  return (
    <div className="role-cards">
      <button type="button" className="role-card" onClick={() => selectRole(ROLES.EMPLOYEE)}>
        <div className="role-card__icon" aria-hidden="true">👤</div>
        <div className="role-card__content">
          <h3>Attachee</h3>
          <p>Register, check in, and check out</p>
        </div>
      </button>

      <button type="button" className="role-card" onClick={() => selectRole(ROLES.SUPERVISOR)}>
        <div className="role-card__icon" aria-hidden="true">🔒</div>
        <div className="role-card__content">
          <h3>Supervisor</h3>
          <p>View attendance dashboard and reports</p>
        </div>
      </button>
    </div>
  );
}
