import { Navigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAppData();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

