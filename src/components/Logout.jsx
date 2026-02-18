import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../utils/auth';

const Logout = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const doLogout = async () => {
            await logout();
            navigate('/', { replace: true });
        };
        doLogout();
    }, [navigate]);

    return null;
};

export default Logout;
