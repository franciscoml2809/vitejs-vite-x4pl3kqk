import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection, addDoc, getDocs, doc, updateDoc, orderBy, query, where
} from "firebase/firestore";
import type { User } from "firebase/auth";
import Resultados from "./Resultados";

// NUEVA ARQUITECTURA MODULARIZADA: VISTAS AISLADAS INDEPENDIENTES
import PartidosView from "./PartidosView";
import ParticipantesView from "./ParticipantesView";
import LigasAdminView from "./LigasAdminView";
import TorneosAdminView from "./TorneosAdminView";
import JornadasAdminView from "./JornadasAdminView";

interface Props {
  user: User;
  onBack: () => void;
}

export default function Admin({ user, onBack }: Props) {
  const [seccion, setSeccion] = useState<"jornadas" | "ligas" | "torneos">("jornadas");
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [jornadaResultados, setJornadaResultados] = useState<any>(null);
  const [jornadaPartidos, setJornadaPartidos] = useState<any>(null);
  const [jornadaParticipantes, setJornadaParticipantes] = useState<any>(null);

  const [mensaje, setMensaje] = useState("");
  const [ligas, setLigas] = useState<any[]>([]);
  const [torneos, setTorneos] = useState<any[]>([]);

  useEffect(() => {
    cargarJornadas();
    cargarLigas();
    cargarTorneos();
  }, []);

  const cargarJornadas = async () => {
    const q = query(collection(db, "jornadas"), orderBy("numero"));
    const snap = await getDocs(q);
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setJornadas(lista);
  };

  const cargarLigas = async () => {
    try {
      const q = query(collection(db, "ligas"), orderBy("nombre"));
      const snap = await getDocs(q);
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLigas(lista);
    } catch (e) {
      console.error("Error al cargar ligas", e);
    }
  };

  const cargarTorneos = async () => {
    try {
      const q = query(collection(db, "torneos"), orderBy("nombre"));
      const snap = await getDocs(q);
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTorneos(lista);
    } catch (e) {
      console.error("Error al cargar torneos", e);
    }
  };

  // CALLBACK: Pasa la petición física de creación de jornadas al subcomponente aislado
  const crearJornadaProps = async (numero: number, inicio: string, fin: string, torneoId: string) => {
    const existe = jornadas.find((j: any) => j.numero === numero && j.torneoId === torneoId);
    if (existe) return false;
    try {
      await addDoc(collection(db, "jornadas"), {
        numero,
        fechaInicio: inicio,
        fechaFin: fin,
        torneoId,
        estado: "abierta",
        creadoPor: user.uid
      });
      cargarJornadas();
      return true;
    } catch (e) {
      return false;
    }
  };

  const cambiarEstadoJornada = async (jornadaId: string, nuevoEstado: "abierta" | "en_progreso" | "finalizada", torneoId: string) => {
    try {
      if (nuevoEstado === "abierta") {
        const jornadasRef = collection(db, "jornadas");
        const q = query(jornadasRef, where("torneoId", "==", torneoId), where("estado", "==", "abierta"));
        const snap = await getDocs(q);
        
        for (const d of snap.docs) {
          if (d.id !== jornadaId) {
            await updateDoc(doc(db, "jornadas", d.id), { estado: "en_progreso" });
          }
        }
      }

      await updateDoc(doc(db, "jornadas", jornadaId), { estado: nuevoEstado });

      setJornadas((prev: any[]) =>
        prev.map((j) => {
          if (j.id === jornadaId) return { ...j, estado: nuevoEstado };
          if (nuevoEstado === "abierta" && j.torneoId === torneoId && j.id !== jornadaId && j.estado === "abierta") {
            return { ...j, estado: "en_progreso" };
          }
          return j;
        })
      );
    } catch (error) {
      console.error("Error al mutar el estado en Firebase", error);
    }
  };

  if (jornadaResultados) return (
    <Resultados
      jornada={jornadaResultados}
      onBack={() => {
        setJornadaResultados(null);
        cargarJornadas();
      }}
    />
  );

  if (jornadaPartidos) return (
    <PartidosView
      jornada={jornadaPartidos}
      torneos={torneos}
      onBack={() => {
        setJornadaPartidos(null);
        cargarJornadas();
      }}
    />
  );

  if (jornadaParticipantes) return (
    <ParticipantesView
      jornada={jornadaParticipantes}
      onBack={() => {
        setJornadaParticipantes(null);
        cargarJornadas();
      }}
    />
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#1a1a2e", color: "#fff" }}>
      {/* Header */}
      <div style={{
        backgroundColor: "#16213e", padding: "16px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "24px" }}>⚙️</span>
          <div>
            <div style={{ fontWeight: "bold", fontSize: "15px" }}>Panel Admin</div>
            <div style={{ color: "#888", fontSize: "12px" }}>Quiniela Administrador</div>
          </div>
        </div>
        <button onClick={onBack} style={{
          backgroundColor: "transparent", border: "1px solid #888",
          color: "#888", padding: "6px 14px", borderRadius: "8px",
          cursor: "pointer", fontSize: "13px"
        }}>
          ← Volver
        </button>
      </div>

      {/* Navegación Principal */}
      <div style={{ display: "flex", backgroundColor: "#16213e", borderBottom: "1px solid #333" }}>
        {[
          { key: "jornadas", label: "🗓 Jornadas" },
          { key: "ligas", label: "🛡 Ligas Base" },
          { key: "torneos", label: "🏆 Torneos" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setSeccion(item.key as any)}
            style={{
              flex: 1, padding: "14px", border: "none",
              backgroundColor: "transparent", cursor: "pointer",
              color: seccion === item.key ? "#e94560" : "#888",
              borderBottom: seccion === item.key ? "2px solid #e94560" : "2px solid transparent",
              fontSize: "14px", fontWeight: seccion === item.key ? "bold" : "normal"
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px" }}>
        {seccion === "jornadas" && (
          <JornadasAdminView
            jornadas={jornadas}
            torneos={torneos}
            ligas={ligas}
            cambiarEstadoJornada={cambiarEstadoJornada}
            setJornadaPartidos={setJornadaPartidos}
            setJornadaResultados={setJornadaResultados}
            setJornadaParticipantes={setJornadaParticipantes}
            crearJornadaProps={crearJornadaProps}
          />
        )}

        {seccion === "ligas" && (
          <LigasAdminView
            user={user}
            ligas={ligas}
            cargarLigas={cargarLigas}
            setMensajeGeneral={setMensaje}
          />
        )}

        {seccion === "torneos" && (
          <TorneosAdminView
            user={user}
            ligas={ligas}
            torneos={torneos}
            cargarTorneos={cargarTorneos}
            setMensajeGeneral={setMensaje}
          />
        )}

        {mensaje && (seccion === "torneos" || seccion === "ligas") && (
          <p style={{ color: mensaje.includes("✅") ? "#4caf50" : "#e94560", fontSize: "14px", marginTop: "15px" }}>
            {mensaje}
          </p>
        )}
      </div>
    </div>
  );
}
