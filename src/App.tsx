import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

function App() {
  const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

      useEffect(() => {
          const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
                setUser(currentUser);
                      setLoading(false);
                          });
                              return unsubscribe;
                                }, []);

                                  if (loading) return (
                                      <div style={{ display:"flex", justifyContent:"center",
                                            alignItems:"center", height:"100vh", fontSize:"18px" }}>
                                                  Cargando...
                                                      </div>
                                                        );

                                                          return user ? <Dashboard user={user} /> : <Login />;
                                                          }

                                                          export default App;