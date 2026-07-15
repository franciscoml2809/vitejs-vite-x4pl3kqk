import { useState } from "react";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";

export default function Login() {
  const [isRegistro, setIsRegistro] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (isRegistro) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: nombre });
        
        // Guardar usuario en Firestore
        const { doc, setDoc } = await import("firebase/firestore");
        const { db } = await import("../firebase");
        await setDoc(doc(db, "usuarios", cred.user.uid), {
          uid: cred.user.uid,
          nombre: nombre,
          email: email,
          creadoEn: new Date().toISOString()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e: any) {
      setError("Verifica tus datos e intenta de nuevo");
    }
    setLoading(false);
  };

  // NUEVA FUNCIÓN CONTROLADORA PARA RECUPERAR CONTRASEÑA
  const handleRecuperarPassword = async () => {
    if (!email.trim()) {
      setError("❌ Escribe tu correo electrónico para enviarte el enlace");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setError("📩 Enlace enviado. Revisa tu bandeja de entrada o correo no deseado (Spam)");
    } catch (e: any) {
      if (e.code === "auth/user-not-found") {
        setError("❌ Este correo electrónico no se encuentra registrado");
      } else if (e.code === "auth/invalid-email") {
        setError("❌ El formato del correo electrónico no es válido");
      } else {
        setError("❌ Error al enviar el correo de recuperación");
      }
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", backgroundColor: "#1a1a2e", padding: "20px"
    }}>
      <div style={{
        backgroundColor: "#16213e", borderRadius: "16px",
        padding: "32px", width: "100%", maxWidth: "400px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)"
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "48px" }}>⚽</div>
          <h1 style={{ color: "#e94560", margin: "8px 0 4px", fontSize: "24px" }}>
          Quiniela</h1>
          <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>
            {isRegistro ? "Crea tu cuenta" : "Inicia sesión"}
          </p>
        </div>
        
        {/* Campos */}
        {isRegistro && (
          <input
            placeholder="Tu nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={inputStyle}
          />
        )}
        <input 
          placeholder="Correo electrónico"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        
        {error && (
          <p style={{ 
            color: error.includes("✅") || error.includes("📩") ? "#4caf50" : "#e94560", 
            fontSize: "13px", 
            marginBottom: "12px",
            textAlign: "center"
          }}>
            {error}
          </p>
        )}
        
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={btnStyle}
        >
          {loading ? "Cargando..." : isRegistro ? "Registrarme" : "Entrar"}
        </button>

        {/* ENLACE VISUAL INYECTADO (Solo aparece en modo Iniciar Sesión) */}
        {!isRegistro && (
          <div style={{ textAlign: "center", marginTop: "12px" }}>
            <span
              onClick={handleRecuperarPassword}
              style={{
                backgroundColor: "transparent", border: "none",
                color: "#888", cursor: "pointer", fontSize: "13px",
                textDecoration: "underline"
              }}
            >
              ¿Olvidaste tu contraseña?
            </span>
          </div>
        )}

        <p style={{ textAlign: "center", color: "#888", fontSize: "14px", marginTop: "16px" }}>
          {isRegistro ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
          <span
            onClick={() => {
              setIsRegistro(!isRegistro);
              setError(""); // Limpiar mensajes al alternar pestañas
            }}
            style={{ color: "#e94560", cursor: "pointer" }}
          >
            {isRegistro ? "Inicia sesión" : "Regístrate"}
          </span>
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 16px", marginBottom: "12px",
  borderRadius: "8px", border: "1px solid #333",
  backgroundColor: "#0f3460", color: "#fff",
  fontSize: "15px", boxSizing: "border-box"
};

const btnStyle: React.CSSProperties = {
  width: "100%", padding: "14px", backgroundColor: "#e94560",
  color: "#fff", border: "none", borderRadius: "8px",
  fontSize: "16px", fontWeight: "bold", cursor: "pointer"
};
