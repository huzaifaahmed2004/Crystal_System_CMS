import React, { useState } from 'react';
import Login from './Login';
import Signup from './Signup';

const AuthContainer = () => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleAuth = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div>
      {isLogin ? (
        <Login onToggleAuth={toggleAuth} />
      ) : (
        <Signup onToggleAuth={toggleAuth} />
      )}
    </div>
  );
};

export default AuthContainer;
