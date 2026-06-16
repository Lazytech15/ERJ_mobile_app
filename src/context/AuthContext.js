import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null);       // accounts row (camelCase)
  const [subscription, setSubscription] = useState(null); // subscriptions row

  const login = (accountData, subscriptionData) => {
    setAccount(accountData);
    setSubscription(subscriptionData);
  };

  const logout = () => {
    setAccount(null);
    setSubscription(null);
  };

  return (
    <AuthContext.Provider value={{ account, subscription, login, logout, setSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}