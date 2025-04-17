import React, { createContext, useState, useContext, useEffect } from 'react';
import config from '../config';

interface AuthTokens {
    token: string;
    refreshToken: string;
    userId: string;
    exp: string;
    expRefresh: string;
    userName?: string;
}

interface AuthContextType {
    tokens: AuthTokens | null;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
    fetchUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    tokens: null,
    login: async () => false,
    logout: () => { },
    isAuthenticated: false,
    fetchUserData: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tokens, setTokens] = useState<AuthTokens | null>(null);

    useEffect(() => {
        const storedTokens = localStorage.getItem('yload_auth_tokens');
        if (storedTokens) {
            const parsedTokens = JSON.parse(storedTokens);
            setTokens(parsedTokens);

            if (parsedTokens && !parsedTokens.userName) {
                fetchUserData();
            }
        }
    }, []);

    const fetchUserData = async () => {
        if (!tokens || !tokens.userId) return;

        try {
            const response = await fetch(config.authUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokens.token}`
                },
                body: JSON.stringify({
                    operationName: "getUserData",
                    variables: { userId: tokens.userId },
                    query: `
                        query getUserData($userId: ID) {
                            getUserData(userId: $userId) {
                                userId
                                id
                                name
                                email
                            }
                        }
                    `
                })
            });

            const result = await response.json();

            if (result.data?.getUserData) {
                const userData = result.data.getUserData;
                const updatedTokens = {
                    ...tokens,
                    userName: userData.name
                };
                setTokens(updatedTokens);
                localStorage.setItem('yload_auth_tokens', JSON.stringify(updatedTokens));
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
        }
    };

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const response = await fetch(config.authUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operationName: 'login',
                    variables: {
                        email,
                        pass: password,
                        pageType: 'network'
                    },
                    query: `
                        mutation login($email: String!, $pass: String!, $pageType: pageTypeEnumGQL) {
                            login(email: $email, pass: $pass, pageType: $pageType) {
                                token
                                exp
                                userId
                                refreshToken
                                expRefresh
                            }
                        }
                    `
                })
            });

            const result = await response.json();

            if (result.data?.login) {
                const authTokens = result.data.login;
                setTokens(authTokens);
                localStorage.setItem('yload_auth_tokens', JSON.stringify(authTokens));

                await fetchUserData();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login failed', error);
            return false;
        }
    };

    const logout = () => {
        setTokens(null);
        localStorage.removeItem('yload_auth_tokens');
    };

    return (
        <AuthContext.Provider value={{
            tokens,
            login,
            logout,
            isAuthenticated: !!tokens,
            fetchUserData
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);