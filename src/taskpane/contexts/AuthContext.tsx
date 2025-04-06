import React, { createContext, useState, useContext, useEffect } from 'react';

interface AuthTokens {
    token: string;
    refreshToken: string;
    userId: string;
    exp: string;
    expRefresh: string;
}

interface AuthContextType {
    tokens: AuthTokens | null;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
    tokens: null,
    login: async () => false,
    logout: () => { },
    isAuthenticated: false
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tokens, setTokens] = useState<AuthTokens | null>(null);

    useEffect(() => {
        const storedTokens = localStorage.getItem('yload_auth_tokens');
        if (storedTokens) {
            setTokens(JSON.parse(storedTokens));
        }
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const response = await fetch('https://dev.api.yload.eu/graphql', {
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
            isAuthenticated: !!tokens
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);