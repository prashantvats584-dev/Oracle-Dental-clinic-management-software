import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface Doctor {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Doctor';
}

interface AuthContextType {
  user: any;
  doctor: Doctor | null;
  loading: boolean;
  isAuthorized: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  doctor: null,
  loading: true,
  isAuthorized: false,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user] = useAuthState(auth);
  const [doctor, setDoctor] = useState<Doctor | null>({
    id: 'public-admin',
    name: 'Clinic Admin',
    email: 'admin@oracle.clinic',
    role: 'Admin',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If a real user logs in, we can still fetch their profile if needed,
    // but we'll default to the public admin for immediate access.
    const fetchDoctor = async () => {
      if (!user) return;

      try {
        const docRef = doc(db, 'doctors', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setDoctor({ id: docSnap.id, ...docSnap.data() } as Doctor);
        }
      } catch (error) {
        console.error("Error fetching doctor profile:", error);
      }
    };

    fetchDoctor();
  }, [user]);

  const isAuthorized = true;
  const isAdmin = true;

  return (
    <AuthContext.Provider value={{ user: user || { uid: 'public-admin', email: 'admin@oracle.clinic' }, doctor, loading, isAuthorized, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
