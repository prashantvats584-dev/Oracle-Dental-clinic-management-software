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
  const [user, userLoading] = useAuthState(auth);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctor = async () => {
      if (userLoading) return;
      
      if (!user) {
        setDoctor(null);
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'doctors', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setDoctor({ id: docSnap.id, ...docSnap.data() } as Doctor);
        } else if (user.email === 'prashantvats584@gmail.com') {
          // Auto-create the first admin
          const newAdmin: Doctor = {
            id: user.uid,
            name: user.displayName || 'Admin Doctor',
            email: user.email,
            role: 'Admin',
          };
          await setDoc(docRef, { ...newAdmin, createdAt: serverTimestamp() });
          setDoctor(newAdmin);
        } else {
          setDoctor(null);
        }
      } catch (error) {
        console.error("Error fetching doctor profile:", error);
        setDoctor(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctor();
  }, [user, userLoading]);

  const isAuthorized = !!doctor;
  const isAdmin = doctor?.role === 'Admin';

  return (
    <AuthContext.Provider value={{ user, doctor, loading: userLoading || loading, isAuthorized, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
