import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient";

const SHEET = {
  rosa: "#F4CCCC",
  rosaBorde: "#CC0000",
  verde: "#D9EAD3",
  verdeBorde: "#38761D",
  amarillo: "#FFF2CC",
  amarilloBorde: "#BF9000",
  azul: "#C9DAF8",
  azulBorde: "#3C78D8",
  gris: "#F3F3F3",
  grisBorde: "#999999",
  rojo: "#FF0000",
  texto: "#000000",
  fuente: "Calibri, 'Segoe UI', Arial, sans-serif"
};

const DEFAULT_CATALOG = {
  metodos: ["Efectivo", "TDC", "TDD"],
  cuentas: {
    Efectivo: ["Cartera"],
    TDC: [],
    TDD: []
  },
  lugares: [],
  tipos: ["G. Fijo", "G. Variable", "Préstamo", "Familia", "Inversión", "Ahorro", "Otro(a)", "Pago TDC"],
  categorias: {
    "G. Fijo": ["Seguros", "Membresías", "Servicios"],
    "G. Variable": ["Comidas", "Compras Online", "Educación", "Entretenimiento", "Gastos Personales", "Intereses TDC", "Mascotas", "Otro(a)", "Regalos y Festejos", "Ropa y Accesorios", "Salud y Bienestar", "Supermercado", "Tecnología", "Tienda de Conveniencia", "Transporte", "Viajes y Vacaciones", "Vivienda"],
    "Préstamo": ["Bancario", "Crédito", "de Tercero", "a Tercero"],
    "Familia": ["Aportación", "Pago TDC Familiar"],
    "Inversión": [],
    "Ahorro": ["Viaje", "Tecnología", "Entretenimiento", "Transporte", "Casa/Hogar"],
    "Otro(a)": ["Otro(a)"],
    "Pago TDC": []
  },
  subcategorias: {
    "Seguros": [],
    "Membresías": [],
    "Servicios": [],
    "Aportación": [],
    "Pago TDC Familiar": [],
    "Comidas": ["Domicilio", "Restaurante", "Otro(a)"],
    "Compras Online": ["Amazon", "Mercado Libre", "Ebay", "Otro(a)"],
    "Educación": ["Colegiatura", "Utiles", "Otro(a)"],
    "Entretenimiento": ["Cine", "Conciertos", "Juguetes", "Otro(a)"],
    "Gastos Personales": ["Donaciones", "Clases", "Otro(a)"],
    "Intereses TDC": ["1. enero", "2. febrero", "3. marzo", "4. abril", "5. mayo", "6. junio", "7. julio", "8. agosto", "9. septiembre", "10. octubre", "11. noviembre", "12. diciembre"],
    "Mascotas": ["Alimentación", "Otro(a)", "Estancia (Hotel)"],
    "Regalos y Festejos": ["Otro(a)"],
    "Ropa y Accesorios": ["Otro(a)"],
    "Salud y Bienestar": ["Consulta", "Farmacia", "Otro(a)"],
    "Supermercado": ["Otro(a)"],
    "Tecnología": ["Apps", "PC", "Otro(a)"],
    "Tienda de Conveniencia": ["Otro(a)"],
    "Transporte": ["Gasolina", "Taller", "Uber", "Tenencia", "Refrendo", "Estacionamiento", "Casetas", "Otro(a)"],
    "Viajes y Vacaciones": ["Hospedaje", "Transporte", "Comida", "Compras", "Otro(a)"],
    "Vivienda": ["Otro(a)"],
    "Bancario": [],
    "Crédito": [],
    "de Tercero": [],
    "a Tercero": []
  },
  ingresoTipos: ["Sueldo", "Comisión", "Préstamo", "Reembolso", "Otro(a)"],
  ingresoSub: {
    "Sueldo": [],
    "Comisión": [],
    "Préstamo": ["Bancario", "de Tercero", "a Tercero"],
    "Reembolso": ["TDC", "TDD"],
    "Otro(a)": ["Otro(a)"]
  },
  presupuestosMensuales: {},
  tarjetasTDC: [],
  ciclosTDC: {},
  membresias: [],
  seguros: [],
  servicios: [],
  prestamosBancarios: [],
  prestamosTerceros: [],
  familiares: [],
  diferidos: [],
  ahorros: [],
  inversiones: [],
  _bannerVisto: false,
  _nombre: ""
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function fmt(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function monthLabel(iso) {
  const [y, m] = iso.split("-");
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return meses[parseInt(m, 10) - 1] + " " + y;
}

function fmtDate(iso) {
  const [y, m, d] = iso.split("-");
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d}-${meses[parseInt(m, 10) - 1]}-${y}`;
}

function mismoMes(isoA, isoB) {
  if (!isoA || !isoB) return false;
  return isoA.slice(0, 7) === isoB.slice(0, 7);
}

function tocaPagarEsteMes(membresia, hoyISO = todayISO()) {
  if (!membresia.activa) return false;
  if (mismoMes(membresia.ultimoPago, hoyISO)) return false;
  if (membresia.frecuencia === "Mensual") return true;
  if (membresia.frecuencia === "Anual") {
    if (!membresia.ultimoPago) return true;
    const [y, m] = membresia.ultimoPago.split("-").map(Number);
    const ultima = new Date(y, m - 1, 1);
    const hoy = new Date(hoyISO.slice(0, 4) * 1, hoyISO.slice(5, 7) * 1 - 1, 1);
    const mesesTranscurridos = (hoy.getFullYear() - ultima.getFullYear()) * 12 + (hoy.getMonth() - ultima.getMonth());
    return mesesTranscurridos >= 11;
  }
  return false;
}

const cardBase = { background: "#fff", border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "12px 14px" };

const labelStyle = {
  display: "block", fontSize: 12, fontStyle: "italic", fontWeight: 700,
  color: SHEET.texto, marginBottom: 4, fontFamily: SHEET.fuente
};

const inputBase = {
  width: "100%", boxSizing: "border-box", fontFamily: SHEET.fuente, border: "1px solid " + SHEET.grisBorde,
  borderRadius: 2, padding: "8px 10px", fontSize: 14, background: "#fff", color: SHEET.texto
};

function HeaderBand({ children, color, borderColor }) {
  return (
    <div style={{
      background: color, border: `1px solid ${borderColor}`, borderRadius: 4, padding: "10px 14px",
      fontWeight: 700, fontStyle: "italic", fontFamily: SHEET.fuente, fontSize: 15,
      color: SHEET.texto, textAlign: "center"
    }}>
      {children}
    </div>
  );
}

function Field({ label, children, error }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ ...labelStyle, color: error ? SHEET.rosaBorde : SHEET.texto }}>
        {label}{error ? " *" : ""}
      </label>
      {children}
      {error && <p style={{ fontSize: 11, color: SHEET.rosaBorde, margin: "3px 0 0", fontStyle: "italic" }}>Falta llenar este campo</p>}
    </div>
  );
}

function Btn({ children, onClick, primary, full, style, type }) {
  const base = {
    padding: "10px 16px", borderRadius: 3, fontSize: 14, fontWeight: 700, fontStyle: "italic",
    fontFamily: SHEET.fuente, cursor: "pointer", border: "1px solid " + SHEET.grisBorde,
    background: "#fff", color: SHEET.texto, width: full ? "100%" : "auto", ...style
  };
  if (primary) { base.background = SHEET.verde; base.border = "1px solid " + SHEET.verdeBorde; }
  return <button type={type || "button"} onClick={onClick} style={base}>{children}</button>;
}

function LoginScreen() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMsg(error.message);
      else setMsg("Cuenta creada. Revisa tu correo para confirmar antes de entrar.");
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 380, margin: "60px auto", fontFamily: SHEET.fuente, padding: "0 16px" }}>
      <h2 style={{ textAlign: "center", fontStyle: "italic", fontWeight: 700 }}>Finanzas Personales</h2>
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
        <HeaderBand color={mode === "signin" ? SHEET.azul : SHEET.verde} borderColor={mode === "signin" ? SHEET.azulBorde : SHEET.verdeBorde}>
          {mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
        </HeaderBand>
        <form onSubmit={handleSubmit} style={{ background: "#fff", padding: "14px" }}>
          <Field label="Correo">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputBase} />
          </Field>
          <Field label="Contraseña">
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} style={inputBase} />
          </Field>
          {msg && <p style={{ fontSize: 12, color: SHEET.rosaBorde, fontStyle: "italic" }}>{msg}</p>}
          <Btn type="submit" primary full style={{ marginTop: 6 }}>
            {loading ? "Cargando..." : mode === "signin" ? "Entrar" : "Crear cuenta"}
          </Btn>
        </form>
      </div>
      <p style={{ textAlign: "center", fontSize: 13, marginTop: 14 }}>
        {mode === "signin" ? (
          <>¿No tienes cuenta? <a href="#" onClick={(e) => { e.preventDefault(); setMode("signup"); setMsg(""); }}>Crear una</a></>
        ) : (
          <>¿Ya tienes cuenta? <a href="#" onClick={(e) => { e.preventDefault(); setMode("signin"); setMsg(""); }}>Iniciar sesión</a></>
        )}
      </p>
    </div>
  );
}

function TabBar({ tab, setTab, onLogout, userEmail }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const tabs = [
    { id: "registrar", label: "Registro" },
    { id: "resumen", label: "Reporte" },
    { id: "historial", label: "Historial" },
    { id: "presupuesto", label: "Presup." },
    { id: "estado", label: "Estado" },
    { id: "cuenta", label: "👤" },
  ];
  const menuItems = [
    { id: "ahorro", label: "Ahorro" },
    { id: "diferidos", label: "Diferidos TDC" },
    { id: "familia", label: "Familia" },
    { id: "inversion", label: "Inversión" },
    { id: "membresias", label: "Membresías" },
    { id: "pagos-futuros", label: "Pagos Futuros" },
    { id: "prestamos", label: "Préstamos" },
    { id: "seguros", label: "Seguros" },
    { id: "servicios", label: "Servicios" },
    { id: "tdc", label: "Tarjetas de Crédito" },
    { id: "catalogos", label: "Datos" }
  ];
  const enMenu = menuItems.some((m) => m.id === tab);

  function irA(id) {
    setTab(id);
    setMenuAbierto(false);
  }

  return (
    <div style={{ position: "relative", marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 4, position: "sticky", top: 0, background: SHEET.gris, zIndex: 5, padding: "6px 4px", borderRadius: 4, border: "1px solid " + SHEET.grisBorde }}>
        <button onClick={() => setMenuAbierto((v) => !v)} aria-label="Abrir menú" title="Más opciones" style={{
          padding: "8px 10px", background: menuAbierto || enMenu ? SHEET.amarillo : "transparent",
          border: menuAbierto || enMenu ? `1px solid ${SHEET.amarilloBorde}` : "1px solid transparent", borderRadius: 3,
          color: SHEET.texto, fontSize: 15, fontWeight: 700, cursor: "pointer", lineHeight: 1
        }}>☰</button>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => irA(t.id)} style={{
            flex: t.id === "cuenta" ? "0 0 auto" : 1,
            padding: t.id === "cuenta" ? "8px 10px" : "8px 2px",
            background: tab === t.id ? SHEET.amarillo : "transparent",
            border: tab === t.id ? `1px solid ${SHEET.amarilloBorde}` : "1px solid transparent", borderRadius: 3,
            color: SHEET.texto, fontSize: t.id === "cuenta" ? 15 : 11, fontWeight: 700, fontStyle: "italic",
            fontFamily: SHEET.fuente, cursor: "pointer"
          }}>
            {t.label}
          </button>
        ))}
      </div>
      {menuAbierto && (
        <div style={{
          position: "absolute", top: "100%", left: 4, marginTop: 4, zIndex: 6, minWidth: 180,
          background: "#fff", border: "1px solid " + SHEET.grisBorde, borderRadius: 4,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)", overflow: "hidden"
        }}>
          {menuItems.map((m) => (
            <button key={m.id} onClick={() => irA(m.id)} style={{
              display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
              background: tab === m.id ? SHEET.amarillo : "#fff", border: "none",
              borderBottom: "1px solid " + SHEET.gris, color: SHEET.texto,
              fontSize: 13, fontWeight: 700, fontStyle: "italic", fontFamily: SHEET.fuente, cursor: "pointer"
            }}>
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NombreModal({ onGuardar }) {
  const [nombre, setNombre] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: 24, width: "100%", maxWidth: 360, fontFamily: SHEET.fuente, textAlign: "center" }}>
        <p style={{ fontSize: 28, margin: "0 0 8px" }}>👋</p>
        <p style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>¡Bienvenida a tu app!</p>
        <p style={{ fontSize: 13, color: "#666", margin: "0 0 18px" }}>¿Cómo te llamas? Para personalizarla.</p>
        <input
          type="text" value={nombre} onChange={e => setNombre(e.target.value)}
          onKeyDown={e => e.key === "Enter" && nombre.trim() && onGuardar(nombre.trim())}
          placeholder="Tu nombre..." autoFocus
          style={{ ...inputBase, fontSize: 16, textAlign: "center", marginBottom: 14 }}
        />
        <button
          onClick={() => nombre.trim() && onGuardar(nombre.trim())}
          disabled={!nombre.trim()}
          style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 700, fontStyle: "italic", border: "none", borderRadius: 4, background: nombre.trim() ? SHEET.amarillo : SHEET.gris, color: SHEET.texto, cursor: nombre.trim() ? "pointer" : "not-allowed", fontFamily: SHEET.fuente }}>
          Entrar →
        </button>
      </div>
    </div>
  );
}

function CuentaTab({ userEmail, movimientos, onLogout, catalog, onNombreChange }) {
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState(catalog._nombre || "");
  const totalMovimientos = movimientos.length;
  const primerMov = movimientos.length > 0 ? movimientos.reduce((min, m) => m.fecha < min ? m.fecha : min, movimientos[0].fecha) : null;
  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      {/* Avatar y datos */}
      <div style={{ textAlign: "center", padding: "24px 16px 20px", borderBottom: "1px solid " + SHEET.grisBorde, marginBottom: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: SHEET.amarillo, border: `2px solid ${SHEET.amarilloBorde}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 28 }}>
          👤
        </div>
        {editandoNombre ? (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 6 }}>
            <input type="text" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
              style={{ ...inputBase, width: "auto", flex: 1, maxWidth: 180, textAlign: "center", fontSize: 15 }} autoFocus />
            <button onClick={() => { onNombreChange(nuevoNombre.trim()); setEditandoNombre(false); }}
              style={{ padding: "8px 12px", background: SHEET.verde, border: "1px solid " + SHEET.verdeBorde, borderRadius: 4, cursor: "pointer", fontWeight: 700, fontFamily: SHEET.fuente }}>✓</button>
            <button onClick={() => setEditandoNombre(false)}
              style={{ padding: "8px 12px", background: SHEET.gris, border: "1px solid " + SHEET.grisBorde, borderRadius: 4, cursor: "pointer", fontFamily: SHEET.fuente }}>✕</button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
            <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{catalog._nombre || "Sin nombre"}</p>
            <button onClick={() => { setNuevoNombre(catalog._nombre || ""); setEditandoNombre(true); }}
              style={{ fontSize: 11, padding: "2px 8px", background: "none", border: "1px solid " + SHEET.grisBorde, borderRadius: 3, cursor: "pointer", color: "#888", fontFamily: SHEET.fuente }}>✎</button>
          </div>
        )}
        <p style={{ fontSize: 12, color: "#888", margin: 0 }}>{userEmail}</p>
      </div>

      {/* Estadísticas rápidas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "12px", textAlign: "center", background: SHEET.gris }}>
          <p style={{ fontSize: 22, fontWeight: 700, margin: "0 0 2px", color: SHEET.azulBorde }}>{totalMovimientos}</p>
          <p style={{ fontSize: 11, color: "#777", margin: 0 }}>Movimientos</p>
        </div>
        <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "12px", textAlign: "center", background: SHEET.gris }}>
          <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 2px", color: "#555" }}>{primerMov ? fmtDate(primerMov) : "—"}</p>
          <p style={{ fontSize: 11, color: "#777", margin: 0 }}>Desde</p>
        </div>
      </div>

      {/* Info app */}
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden", marginBottom: 24 }}>
        {[
          { label: "App", valor: "Finanzas Personales" },
          { label: "Versión", valor: "2026" },
          { label: "Datos", valor: "Guardados en la nube (Supabase)" },
        ].map((row, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderBottom: i < 2 ? "1px solid " + SHEET.grisBorde : "none", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#777" }}>{row.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{row.valor}</span>
          </div>
        ))}
      </div>

      {/* Botón cerrar sesión centrado */}
      <div style={{ textAlign: "center" }}>
        <button onClick={onLogout} style={{
          padding: "12px 32px", fontSize: 14, fontWeight: 700, fontStyle: "italic",
          border: `1px solid ${SHEET.rosaBorde}`, borderRadius: 4, background: SHEET.rosa,
          color: SHEET.rosaBorde, cursor: "pointer", fontFamily: SHEET.fuente
        }}>
          Cerrar sesión
        </button>
        <p style={{ fontSize: 11, color: "#aaa", marginTop: 8 }}>Se cerrará la sesión en este dispositivo</p>
      </div>
    </div>
  );
}

function RegistrarTab({ catalog, addMovimiento, addDiferido, movimientos }) {
  const [mov, setMov] = useState("Egreso");
  const [metodo, setMetodo] = useState("");
  const [cuenta, setCuenta] = useState("");
  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [ingresoTipo, setIngresoTipo] = useState("");
  const [ingresoSub, setIngresoSub] = useState("");
  const [ingresoPersonaTercero, setIngresoPersonaTercero] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [lugar, setLugar] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [cantidad, setCantidad] = useState("");
  const [esDiferido, setEsDiferido] = useState(false);
  const [plazoMeses, setPlazoMeses] = useState("");
  const [nombreDiferido, setNombreDiferido] = useState("");
  const [pagosPrevios, setPagosPrevios] = useState("");
  const [pagadoPrevio, setPagadoPrevio] = useState("");
  const [conIntereses, setConIntereses] = useState(false);
  const [mensualidadFija, setMensualidadFija] = useState("");
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});
  const [modalFijos, setModalFijos] = useState(false);
  const [mesFijos, setMesFijos] = useState(todayISO().slice(0, 7));
  const [fijosSeleccionados, setFijosSeleccionados] = useState([]);
  const [ajusteTDD, setAjusteTDD] = useState("");
  const [ajusteEfectivo, setAjusteEfectivo] = useState("");
  const [ajusteTDC, setAjusteTDC] = useState({});
  const [fijosRegistrados, setFijosRegistrados] = useState(false);

  // Para Pago TDC: la categoría es la tarjeta TDC a la que abonaste (se llena automático de las registradas)
  // El origen/cuenta es de donde sale el dinero (TDD, Efectivo, etc.) — igual que cualquier egreso
  const cuentasDisponibles = catalog.cuentas[metodo] || [];
  const categoriasDisponibles = tipo === "Pago TDC"
    ? (catalog.cuentas.TDC || [])
    : (catalog.categorias[tipo] || []);
  // Para Membresías/Servicios/Seguros, las opciones salen directo del catálogo maestro
  // (mismo array que usa el autocompletado), así nunca se desincronizan.
  const subcatsDisponibles = categoria === "Membresías" ? (catalog.membresias || []).filter(m => m.activa).map(m => m.nombre)
    : categoria === "Servicios" ? (catalog.servicios || []).filter(s => s.activa).map(s => s.nombre)
    : categoria === "Seguros" ? (catalog.seguros || []).filter(s => s.activa).map(s => s.nombre)
    : (catalog.subcategorias[categoria] || []);
  const ingresoSubsDisponibles = catalog.ingresoSub[ingresoTipo] || [];

  useEffect(() => { setCuenta(""); }, [metodo]);
  useEffect(() => { setCategoria(""); }, [tipo]);
  useEffect(() => {
    // Cuando elige Pago TDC, pre-selecciona TDD como origen (lo más común)
    if (tipo === "Pago TDC" && !metodo) setMetodo("TDD");
  }, [tipo]);
  useEffect(() => { setSubcategoria(""); }, [categoria]);
  useEffect(() => { setIngresoSub(""); }, [ingresoTipo]);
  useEffect(() => { setIngresoPersonaTercero(""); }, [ingresoSub]);
  useEffect(() => { if (metodo !== "TDC") setEsDiferido(false); }, [metodo]);
  useEffect(() => { if (mov !== "Egreso") setEsDiferido(false); }, [mov]);
  useEffect(() => { setPagosPrevios(""); setPagadoPrevio(""); setMensualidadFija(""); }, [plazoMeses]);

  function reset() {
    setMetodo(""); setCuenta(""); setTipo(""); setCategoria(""); setSubcategoria("");
    setIngresoTipo(""); setIngresoSub(""); setIngresoPersonaTercero(""); setDescripcion(""); setLugar(""); setCantidad("");
    setFecha(todayISO()); setErrors({}); setEsDiferido(false); setPlazoMeses(""); setNombreDiferido("");
    setPagosPrevios(""); setPagadoPrevio("");
  }

  function validate() {
    const errs = {};
    if (!cantidad || parseFloat(cantidad) <= 0) errs.cantidad = true;
    if (!metodo) errs.metodo = true;
    if (!cuenta) errs.cuenta = true;
    if (!fecha) errs.fecha = true;
    if (esDiferido) {
      if (!plazoMeses || parseInt(plazoMeses) <= 0) errs.plazoMeses = true;
      if (!categoria) errs.categoria = true;
    } else if (mov === "Egreso") {
      if (!tipo) errs.tipo = true;
      if (!categoria) errs.categoria = true;
      if (subcatsDisponibles.length > 0 && !subcategoria) errs.subcategoria = true;
    } else {
      if (!ingresoTipo) errs.ingresoTipo = true;
      if (ingresoSubsDisponibles.length > 0 && !ingresoSub) errs.ingresoSub = true;
      if (ingresoTipo === "Préstamo" && (ingresoSub === "de Tercero" || ingresoSub === "a Tercero") &&
        (catalog.subcategorias[ingresoSub] || []).length > 0 && !ingresoPersonaTercero) errs.ingresoPersonaTercero = true;
    }
    return errs;
  }

  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const amt = parseFloat(cantidad);
    if (esDiferido) {
      const plazo = parseInt(plazoMeses);
      // Con intereses: costoTotal = mensualidadFija × plazo, el capital (amt) es solo referencia
      // Sin intereses: costoTotal = amt (el capital), mensualidad = amt / plazo
      const mensual = conIntereses && mensualidadFija ? parseFloat(mensualidadFija) : 0;
      const costoTotal = conIntereses && mensual > 0 ? Math.round(mensual * plazo * 100) / 100 : amt;
      const prevAmt = pagadoPrevio ? parseFloat(pagadoPrevio) : 0;
      await addDiferido({
        nombre: nombreDiferido, tarjeta: cuenta, categoria, subcategoria, descripcion,
        costoTotal, capitalOriginal: amt, conIntereses, mensualidadFija: mensual || 0,
        plazoMeses: plazo, inicio: fecha,
        pagosPrevios: pagosPrevios ? parseInt(pagosPrevios) : 0,
        pagadoPrevio: prevAmt
      });
    } else {
      const entry = {
        mov, metodo, cuenta,
        tipo: mov === "Egreso" ? tipo : ingresoTipo,
        categoria: mov === "Egreso" ? categoria : ingresoSub,
        subcategoria: mov === "Egreso" ? subcategoria : (ingresoPersonaTercero || ""),
        descripcion, lugar, fecha, cantidad: amt
      };
      await addMovimiento(entry);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  }

  const bandColor = mov === "Egreso" ? SHEET.rosa : SHEET.verde;
  const bandBorder = mov === "Egreso" ? SHEET.rosaBorde : SHEET.verdeBorde;

  // Construir lista de fijos del mes actual
  const hoyMes = todayISO().slice(0, 7);
  function buildFijosList(mes) {
    const items = [];
    const [y, m] = mes.split("-").map(Number);
    const diasEnMes = new Date(y, m, 0).getDate();

    // Membresías activas
    (catalog.membresias || []).filter(m => m.activa).forEach(m => {
      items.push({ id: `mem-${m.id}`, nombre: m.nombre, categoria: "Membresías", tipo: "G. Fijo", metodo: m.metodo || "TDC", cuenta: m.cuenta || "", monto: m.costo || 0, label: "Membresía", detalle: "" });
    });
    // Servicios activos
    (catalog.servicios || []).filter(s => s.activa && !s.esVariable).forEach(s => {
      items.push({ id: `serv-${s.id}`, nombre: s.nombre, categoria: "Servicios", tipo: "G. Fijo", metodo: s.metodo || "TDC", cuenta: s.cuenta || "", monto: s.costo || 0, label: "Servicio", detalle: "" });
    });
    // Seguros activos
    (catalog.seguros || []).filter(s => s.activa).forEach(s => {
      items.push({ id: `seg-${s.id}`, nombre: s.nombre, categoria: "Seguros", tipo: "G. Fijo", metodo: s.metodo || "TDD", cuenta: s.cuenta || "", monto: s.costo || 0, label: "Seguro", detalle: "" });
    });
    // Diferidos activos
    (catalog.diferidos || []).filter(d => d.activo).forEach(d => {
      items.push({ id: `dif-${d.id}`, nombre: d.nombre || d.categoria, categoria: "Diferidos", tipo: "Diferido TDC", metodo: "TDC", cuenta: d.tarjeta || "", monto: d.aportacion || 0, label: "Diferido TDC", detalle: "" });
    });
    // Préstamos activos — quincenales/semanales aparecen múltiples veces
    (catalog.prestamosBancarios || []).filter(p => p.activa).forEach(p => {
      const freq = p.frecuencia || "Mensual";
      const diasStr = p.diasPago || "";
      const diasEsp = diasStr ? diasStr.split(",").map(d => parseInt(d.trim())).filter(d => !isNaN(d)) : [];

      if ((freq === "Quincenal" || freq === "Semanal") && diasEsp.length > 0) {
        // Agregar una entrada por cada día de pago del mes
        diasEsp.forEach((dia, i) => {
          const diaReal = dia === 31 ? diasEnMes : Math.min(dia, diasEnMes);
          const fechaStr = `${mes}-${String(diaReal).padStart(2, "0")}`;
          items.push({ id: `prest-${p.id}-${i}`, nombre: p.nombre, categoria: "Préstamos", tipo: "Préstamo", metodo: p.metodo || "TDD", cuenta: p.cuenta || "", monto: p.pagoPeriodo || 0, label: "Préstamo", detalle: `día ${diaReal}` });
        });
      } else {
        items.push({ id: `prest-${p.id}`, nombre: p.nombre, categoria: "Préstamos", tipo: "Préstamo", metodo: p.metodo || "TDD", cuenta: p.cuenta || "", monto: p.pagoPeriodo || 0, label: "Préstamo", detalle: freq === "Mensual" ? "" : freq });
      }
    });
    // Ahorro activo
    (catalog.ahorros || []).filter(a => a.activa).forEach(a => {
      items.push({ id: `ah-${a.id}`, nombre: a.nombre, categoria: "Ahorro", tipo: "Ahorro", metodo: a.metodo || "TDD", cuenta: a.cuenta || "", monto: a.aportacion || 0, label: "Ahorro", detalle: "" });
    });
    // Inversión activa
    (catalog.inversiones || []).filter(i => i.activa).forEach(i => {
      items.push({ id: `inv-${i.id}`, nombre: i.nombre, categoria: "Inversión", tipo: "Inversión", metodo: i.metodo || "TDD", cuenta: i.cuenta || "", monto: i.aportacion || 0, label: "Inversión", detalle: "" });
    });
    return items;
  }

  function abrirModalFijos() {
    const lista = buildFijosList(mesFijos);
    // Buscar movimientos ya registrados en el mes seleccionado
    const movsMesFijos = (movimientos || []).filter(m => m.fecha && m.fecha.startsWith(mesFijos) && m.mov === "Egreso");
    const conteoNombre = {};
    movsMesFijos.forEach(m => {
      const key = m.subcategoria || "";
      conteoNombre[key] = (conteoNombre[key] || 0) + 1;
    });
    const usados = {};
    const listaConEstatus = lista.map(f => {
      const yaUsados = usados[f.nombre] || 0;
      const totalRegistrados = conteoNombre[f.nombre] || 0;
      const yaPagado = yaUsados < totalRegistrados;
      usados[f.nombre] = yaUsados + 1;
      return { ...f, seleccionado: !yaPagado, yaPagado };
    });
    setFijosSeleccionados(listaConEstatus);
    setAjusteTDD(""); setAjusteEfectivo(""); setAjusteTDC({}); setFijosRegistrados(false);
    setModalFijos(true);
  }

  // Recalcular lista cuando cambia el mes en el modal
  function cambiarMesFijos(nuevoMes) {
    setMesFijos(nuevoMes);
    const lista = buildFijosList(nuevoMes);
    const movsMesFijos = (movimientos || []).filter(m => m.fecha && m.fecha.startsWith(nuevoMes) && m.mov === "Egreso");
    const conteoNombre = {};
    movsMesFijos.forEach(m => { const key = m.subcategoria || ""; conteoNombre[key] = (conteoNombre[key] || 0) + 1; });
    const usados = {};
    const listaConEstatus = lista.map(f => {
      const yaUsados = usados[f.nombre] || 0;
      const totalRegistrados = conteoNombre[f.nombre] || 0;
      const yaPagado = yaUsados < totalRegistrados;
      usados[f.nombre] = yaUsados + 1;
      return { ...f, seleccionado: !yaPagado, yaPagado };
    });
    setFijosSeleccionados(listaConEstatus);
    setFijosRegistrados(false);
  }

  async function registrarFijosSeleccionados() {
    const seleccionados = fijosSeleccionados.filter(f => f.seleccionado);
    // Usar fecha de hoy para registrar, no el último día del mes
    const fechaReg = todayISO();
    for (const f of seleccionados) {
      await addMovimiento({
        mov: "Egreso", metodo: f.metodo, cuenta: f.cuenta,
        tipo: f.tipo, categoria: f.categoria, subcategoria: f.nombre,
        descripcion: `Registro automático ${mesFijos}${f.detalle ? ` (${f.detalle})` : ""}`,
        lugar: "", fecha: fechaReg, cantidad: f.monto
      });
    }
    const totalFijosEgresados = seleccionados.reduce((s, f) => s + f.monto, 0);
    // Ajuste TDD — solo si se especificó
    if (ajusteTDD !== "" && parseFloat(ajusteTDD) >= 0) {
      const necesario = Math.round((parseFloat(ajusteTDD) + totalFijosEgresados) * 100) / 100;
      if (necesario > 0) {
        await addMovimiento({
          mov: "Ingreso", metodo: "TDD", cuenta: "", tipo: "Otro(a)", categoria: "Ajuste",
          subcategoria: "", descripcion: `⬆ Ajuste positivo TDD - ${mesFijos}`, lugar: "", fecha: fechaReg, cantidad: necesario
        });
      }
    }
    // Ajuste Efectivo
    if (ajusteEfectivo !== "" && parseFloat(ajusteEfectivo) > 0) {
      await addMovimiento({
        mov: "Ingreso", metodo: "Efectivo", cuenta: "", tipo: "Otro(a)", categoria: "Ajuste",
        subcategoria: "", descripcion: `⬆ Ajuste positivo Efectivo - ${mesFijos}`, lugar: "", fecha: fechaReg, cantidad: parseFloat(ajusteEfectivo)
      });
    }
    // Ajuste TDC — registrar cargos del corte anterior Y gastos post corte
    for (const [tarjeta, val] of Object.entries(ajusteTDC)) {
      const tarjetaData = (catalog.tarjetasTDC || []).find(t => t.nombre === tarjeta);
      const limite = tarjetaData?.limite || 0;
      const difActivos = (catalog.diferidos || []).filter(d => d.activo && d.tarjeta === tarjeta);
      const difPend = Math.round(difActivos.reduce((s, d) => {
        const base = d.conIntereses && d.capitalOriginal ? d.capitalOriginal : d.costoTotal;
        return s + Math.max(0, base - (d.pagado || 0));
      }, 0) * 100) / 100;
      const dispBanco = val.disponible !== "" ? parseFloat(val.disponible) : null;
      const cargosPostBruto = parseFloat(val.cargosPostCorte) || 0;
      // Los fijos de esta misma tarjeta que se están registrando en este lote (ej. Apple Bill)
      // ya están incluidos en el total que el usuario reportó como "gastos post corte" del banco.
      // Se restan para no duplicarlos: fijo individual + ajuste = el total real reportado.
      const fijosMismaTarjetaEnLote = Math.round(seleccionados.filter(f => f.cuenta === tarjeta).reduce((s, f) => s + f.monto, 0) * 100) / 100;
      const cargosPost = Math.max(0, Math.round((cargosPostBruto - fijosMismaTarjetaEnLote) * 100) / 100);

      if (dispBanco !== null) {
        const totalUtilizado = Math.round((limite - dispBanco) * 100) / 100;
        const cargosCorteAnterior = Math.max(0, Math.round((totalUtilizado - difPend - cargosPost) * 100) / 100);

        // Registrar cargos del corte ANTERIOR (fecha del último día del mes anterior)
        if (cargosCorteAnterior > 0) {
          const [y, m] = mesFijos.split("-").map(Number);
          const ultimoMesAnt = new Date(y, m - 1, 0);
          const fechaCorteAnt = `${ultimoMesAnt.getFullYear()}-${String(ultimoMesAnt.getMonth() + 1).padStart(2, "0")}-${String(ultimoMesAnt.getDate()).padStart(2, "0")}`;
          await addMovimiento({
            mov: "Egreso", metodo: "TDC", cuenta: tarjeta, tipo: "G. Variable", categoria: "Ajuste",
            subcategoria: "", descripcion: `⬇ Ajuste corte anterior ${tarjeta}`, lugar: "", fecha: fechaCorteAnt, cantidad: cargosCorteAnterior
          });
        }

        // Registrar gastos POST corte (del ciclo actual)
        if (cargosPost > 0) {
          await addMovimiento({
            mov: "Egreso", metodo: "TDC", cuenta: tarjeta, tipo: "G. Variable", categoria: "Ajuste",
            subcategoria: "", descripcion: `⬇ Ajuste gastos post corte ${tarjeta} - ${mesFijos}`, lugar: "", fecha: fechaReg, cantidad: cargosPost
          });
        }
      }
    }
    setFijosRegistrados(true);
  }

  const totalFijosModal = fijosSeleccionados.filter(f => f.seleccionado).reduce((s, f) => s + f.monto, 0);
  const coloresTipo = { "Membresía": SHEET.azul, "Servicio": "#E8F4F8", "Seguro": "#FFF3E0", "Diferido TDC": SHEET.rosa, "Préstamo": "#FCE4EC", "Ahorro": SHEET.verde, "Inversión": "#E8F5E9" };
  const coloresTipoBorde = { "Membresía": SHEET.azulBorde, "Servicio": "#0288D1", "Seguro": "#EF6C00", "Diferido TDC": SHEET.rosaBorde, "Préstamo": "#C62828", "Ahorro": SHEET.verdeBorde, "Inversión": "#2E7D32" };

  function selStyle(hasError) {
    return { ...inputBase, background: "#fff", border: hasError ? `2px solid ${SHEET.rojo}` : "1px solid " + SHEET.grisBorde };
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>

      {/* Botón Ponerme al corriente */}
      <button onClick={abrirModalFijos} style={{
        width: "100%", padding: "11px", marginBottom: 14, fontSize: 13, fontWeight: 700, fontStyle: "italic",
        border: `1px solid ${SHEET.amarilloBorde}`, borderRadius: 4, background: SHEET.amarillo,
        color: SHEET.texto, cursor: "pointer", fontFamily: SHEET.fuente, display: "flex", alignItems: "center", justifyContent: "center", gap: 8
      }}>⚡ Registrar fijos del mes</button>

      {/* Modal Fijos del Mes */}
      {modalFijos && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px 12px", overflowY: "auto" }}>
          <div style={{ background: "#fff", borderRadius: 6, width: "100%", maxWidth: 500, fontFamily: SHEET.fuente, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid " + SHEET.grisBorde, flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>⚡ Registrar fijos del mes</p>
                  <p style={{ fontSize: 11, color: "#888", margin: "2px 0 0" }}>Desmarca los que ya registraste</p>
                </div>
                <button onClick={() => setModalFijos(false)} style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer", color: "#666" }}>✕</button>
              </div>
              {/* Selector de mes */}
              <select value={mesFijos} onChange={(e) => cambiarMesFijos(e.target.value)}
                style={{ ...inputBase, background: SHEET.azul, fontSize: 13, fontWeight: 700 }}>
                {Array.from({ length: 12 }, (_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - i);
                  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                  return <option key={ym} value={ym}>{mesLabel(ym)}</option>;
                })}
              </select>
            </div>

            {/* Lista scrolleable */}
            <div style={{ overflowY: "auto", flex: 1, padding: "10px 14px" }}>
              {fijosSeleccionados.length === 0 ? (
                <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>No tienes gastos fijos activos configurados.</p>
              ) : (
                fijosSeleccionados.map((f, i) => (
                  <div key={f.id} onClick={() => setFijosSeleccionados(prev => prev.map((x, j) => j === i ? { ...x, seleccionado: !x.seleccionado } : x))}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", borderBottom: "1px solid " + SHEET.grisBorde, cursor: "pointer", background: f.yaPagado ? "#f0fdf4" : f.seleccionado ? "#fff" : SHEET.gris, borderRadius: 3 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 3, border: `2px solid ${f.seleccionado ? SHEET.verdeBorde : SHEET.grisBorde}`, background: f.seleccionado ? SHEET.verde : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13 }}>
                      {f.seleccionado ? "✓" : ""}
                    </div>
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: coloresTipo[f.label] || SHEET.gris, color: coloresTipoBorde[f.label] || "#333", border: `1px solid ${coloresTipoBorde[f.label] || SHEET.grisBorde}`, whiteSpace: "nowrap" }}>{f.label}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, margin: 0, color: f.seleccionado ? "#222" : "#aaa" }}>
                        {f.nombre}{f.detalle ? <span style={{ fontSize: 10, color: "#888", fontWeight: 400, marginLeft: 4 }}>({f.detalle})</span> : ""}
                      </p>
                      <p style={{ fontSize: 10, margin: 0, color: f.yaPagado ? SHEET.verdeBorde : "#aaa" }}>
                        {f.yaPagado ? "✓ Ya registrado este mes · " : ""}{f.metodo}{f.cuenta ? ` · ${f.cuenta}` : ""}
                      </p>
                    </div>
                    <b style={{ fontSize: 12, color: f.seleccionado ? SHEET.rosaBorde : "#ccc", flexShrink: 0 }}>{fmt(f.monto)}</b>
                  </div>
                ))
              )}

              {/* Total seleccionados */}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 8px", marginTop: 4, background: SHEET.gris, borderRadius: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{fijosSeleccionados.filter(f => f.seleccionado).length} seleccionados</span>
                <b style={{ fontSize: 13, color: SHEET.rosaBorde }}>{fmt(totalFijosModal)}</b>
              </div>

              {/* Ajuste de saldo */}
              <div style={{ marginTop: 14, padding: "12px", background: SHEET.azul, borderRadius: 4, border: "1px solid " + SHEET.azulBorde }}>
                <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 4px" }}>Ajuste de saldo (opcional)</p>

                {/* TDD */}
                <p style={{ fontSize: 11, fontWeight: 700, margin: "8px 0 4px", color: "#333" }}>TDD</p>
                <Field label="¿Cuánto tienes en TDD ahorita?">
                  <input type="text" inputMode="decimal" value={ajusteTDD} onChange={e => setAjusteTDD(e.target.value)} style={inputBase} placeholder="$0.00" />
                </Field>
                {ajusteTDD !== "" && parseFloat(ajusteTDD) >= 0 && (
                  <div style={{ background: "#fff", borderRadius: 4, padding: "8px 10px", marginTop: 4, marginBottom: 8, fontSize: 11 }}>
                    <p style={{ margin: "0 0 2px" }}>Fijos TDD a restar: <b style={{ color: SHEET.rosaBorde }}>−{fmt(fijosSeleccionados.filter(f => f.seleccionado && f.metodo === "TDD").reduce((s,f)=>s+f.monto,0))}</b></p>
                    <p style={{ margin: "0 0 2px" }}>Saldo deseado: <b style={{ color: SHEET.verdeBorde }}>{fmt(parseFloat(ajusteTDD))}</b></p>
                    <p style={{ margin: 0, fontWeight: 700 }}>Ingreso de ajuste TDD: <b style={{ color: SHEET.azulBorde }}>{fmt(Math.round((parseFloat(ajusteTDD) + fijosSeleccionados.filter(f=>f.seleccionado&&f.metodo==="TDD").reduce((s,f)=>s+f.monto,0))*100)/100)}</b></p>
                  </div>
                )}

                <Field label="¿Cuánto tienes en Efectivo? (opcional)">
                  <input type="text" inputMode="decimal" value={ajusteEfectivo} onChange={e => setAjusteEfectivo(e.target.value)} style={inputBase} placeholder="$0.00" />
                </Field>

                {/* TDC por tarjeta */}
                {(catalog.tarjetasTDC || []).filter(t => t.activa !== false).length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, margin: "0 0 4px", color: "#333" }}>TDC — Ajuste por ciclo</p>
                    <p style={{ fontSize: 10.5, color: "#666", margin: "0 0 8px", fontStyle: "italic" }}>
                      Para cada tarjeta, dinos el disponible actual y los cargos que hiciste después del corte del mes seleccionado. La app registra esos cargos del ciclo nuevo.
                    </p>
                    {(catalog.tarjetasTDC || []).filter(t => t.activa !== false).map(t => {
                      const val = ajusteTDC[t.nombre] || { disponible: "", cargosPostCorte: "" };
                      const limite = t.limite || 0;
                      const difActivos = (catalog.diferidos || []).filter(d => d.activo && d.tarjeta === t.nombre);
                      const difPend = Math.round(difActivos.reduce((s, d) => {
                        const base = d.conIntereses && d.capitalOriginal ? d.capitalOriginal : d.costoTotal;
                        return s + Math.max(0, base - (d.pagado || 0));
                      }, 0) * 100) / 100;
                      const dispBanco = val.disponible !== "" ? parseFloat(val.disponible) : null;
                      const cargosPostBruto = parseFloat(val.cargosPostCorte) || 0;
                      // Los fijos de esta tarjeta que ya están seleccionados para registrarse en este mismo lote
                      // (ej. Apple Bill vía TDC) ya forman parte del total que el banco reporta como post-corte.
                      const fijosMismaTarjetaEnLote = Math.round(fijosSeleccionados.filter(f => f.seleccionado && f.cuenta === t.nombre).reduce((s, f) => s + f.monto, 0) * 100) / 100;
                      const cargosPost = Math.max(0, Math.round((cargosPostBruto - fijosMismaTarjetaEnLote) * 100) / 100);
                      // Cálculo:
                      // Total utilizado = Límite - Disponible banco
                      // Cargos corte anterior = Total utilizado - Diferidos - Cargos post corte (ya neto de fijos del lote)
                      const totalUtilizado = dispBanco !== null ? Math.round((limite - dispBanco) * 100) / 100 : null;
                      const cargosCorteAnterior = totalUtilizado !== null ? Math.max(0, Math.round((totalUtilizado - difPend - cargosPost) * 100) / 100) : null;
                      return (
                        <div key={t.nombre} style={{ background: "#fff", borderRadius: 4, padding: "10px", marginBottom: 8, border: "1px solid " + SHEET.grisBorde }}>
                          <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 6px" }}>{t.nombre}</p>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 8, fontSize: 10.5 }}>
                            <span style={{ color: "#888" }}>Límite: <b>{fmt(limite)}</b></span>
                            <span style={{ color: "#888" }}>Difs pendientes: <b style={{ color: SHEET.rosaBorde }}>{fmt(difPend)}</b></span>
                          </div>
                          <Field label="Disponible actual (lo que muestra el banco)">
                            <input type="text" inputMode="decimal" value={val.disponible}
                              onChange={e => setAjusteTDC(prev => ({ ...prev, [t.nombre]: { ...val, disponible: e.target.value } }))}
                              style={{ ...inputBase, fontSize: 13 }} placeholder="$0.00" />
                          </Field>
                          <Field label="Gastos después del corte del mes seleccionado (0 si ninguno)">
                            <input type="text" inputMode="decimal" value={val.cargosPostCorte}
                              onChange={e => setAjusteTDC(prev => ({ ...prev, [t.nombre]: { ...val, cargosPostCorte: e.target.value } }))}
                              style={{ ...inputBase, fontSize: 13 }} placeholder="$0.00" />
                          </Field>
                          {fijosMismaTarjetaEnLote > 0 && (
                            <p style={{ fontSize: 10, color: "#666", fontStyle: "italic", margin: "0 0 6px" }}>
                              Ya se restaron {fmt(fijosMismaTarjetaEnLote)} de fijos de esta tarjeta que también seleccionaste arriba (para no duplicarlos).
                            </p>
                          )}
                          {dispBanco !== null && (
                            <div style={{ background: SHEET.amarillo, borderRadius: 3, padding: "8px 10px", fontSize: 11, marginTop: 6 }}>
                              <p style={{ margin: "0 0 3px" }}>Total utilizado: <b>{fmt(totalUtilizado)}</b></p>
                              <p style={{ margin: "0 0 3px" }}>− Diferidos: <b style={{ color: SHEET.rosaBorde }}>{fmt(difPend)}</b></p>
                              <p style={{ margin: "0 0 3px" }}>− Gastos post corte (neto de fijos del lote): <b style={{ color: SHEET.rosaBorde }}>{fmt(cargosPost)}</b></p>
                              <p style={{ margin: "0 0 3px", borderTop: "1px solid #e6d200", paddingTop: 3, fontWeight: 700 }}>
                                Cargos del corte anterior: <b style={{ color: SHEET.rosaBorde }}>{fmt(cargosCorteAnterior)}</b>
                              </p>
                              <p style={{ margin: "4px 0 0", fontSize: 10, color: "#666" }}>
                                Se registrarán {cargosCorteAnterior > 0 ? "los cargos del corte anterior" : ""}
                                {cargosPost > 0 ? (cargosCorteAnterior > 0 ? " y " : "") + "los gastos post corte" : ""} como egresos en tu historial.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 14px", borderTop: "1px solid " + SHEET.grisBorde, flexShrink: 0 }}>
              {fijosRegistrados ? (
                <div style={{ background: SHEET.verde, border: "1px solid " + SHEET.verdeBorde, borderRadius: 4, padding: "12px", textAlign: "center" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: SHEET.verdeBorde, margin: "0 0 4px" }}>✓ ¡Registrado!</p>
                  <p style={{ fontSize: 11, color: "#555", margin: "0 0 10px" }}>Los fijos aparecen en tu historial. Usa la 🗑 para eliminar los que no correspondan.</p>
                  <button onClick={() => setModalFijos(false)} style={{ padding: "8px 20px", fontSize: 12, fontWeight: 700, border: "1px solid " + SHEET.verdeBorde, borderRadius: 4, background: "#fff", cursor: "pointer", fontFamily: SHEET.fuente }}>Cerrar</button>
                </div>
              ) : (
                <button onClick={registrarFijosSeleccionados} disabled={fijosSeleccionados.filter(f => f.seleccionado).length === 0}
                  style={{ width: "100%", padding: "12px", fontSize: 13, fontWeight: 700, fontStyle: "italic", border: "none", borderRadius: 4, background: fijosSeleccionados.filter(f => f.seleccionado).length === 0 ? SHEET.gris : SHEET.rosaBorde, color: fijosSeleccionados.filter(f => f.seleccionado).length === 0 ? "#aaa" : "#fff", cursor: fijosSeleccionados.filter(f => f.seleccionado).length === 0 ? "not-allowed" : "pointer", fontFamily: SHEET.fuente }}>
                  ⚡ Registrar {fijosSeleccionados.filter(f => f.seleccionado).length} movimientos ({fmt(totalFijosModal)})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button onClick={() => { setMov("Egreso"); setErrors({}); }} style={{
          flex: 1, padding: "10px", borderRadius: 4, fontSize: 14, fontWeight: 700, fontStyle: "italic", cursor: "pointer", fontFamily: SHEET.fuente,
          border: mov === "Egreso" ? `2px solid ${SHEET.rosaBorde}` : "1px solid " + SHEET.grisBorde,
          background: mov === "Egreso" ? SHEET.rosa : "#fff", color: SHEET.texto
        }}>Egreso</button>
        <button onClick={() => { setMov("Ingreso"); setErrors({}); }} style={{
          flex: 1, padding: "10px", borderRadius: 4, fontSize: 14, fontWeight: 700, fontStyle: "italic", cursor: "pointer", fontFamily: SHEET.fuente,
          border: mov === "Ingreso" ? `2px solid ${SHEET.verdeBorde}` : "1px solid " + SHEET.grisBorde,
          background: mov === "Ingreso" ? SHEET.verde : "#fff", color: SHEET.texto
        }}>Ingreso</button>
      </div>

      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
        <HeaderBand color={bandColor} borderColor={bandBorder}>{mov}</HeaderBand>
        <div style={{ padding: "12px 14px", background: "#fff" }}>

          {/* EGRESO: primero Tipo → Categoría → Subcategoría, luego Origen/Cuenta */}
          {mov === "Egreso" && !esDiferido && (
            <>
              <Field label="Tipo" error={errors.tipo}>
                <select value={tipo} onChange={(e) => { setTipo(e.target.value); setErrors((p) => ({ ...p, tipo: false })); }} style={selStyle(errors.tipo)}>
                  <option value="">Selecciona...</option>
                  {catalog.tipos.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label={tipo === "Pago TDC" ? "Tarjeta TDC abonada" : "Categoría"} error={errors.categoria}>
                <select value={categoria} onChange={(e) => {
                  const v = e.target.value;
                  setCategoria(v);
                  setErrors((p) => ({ ...p, categoria: false }));
                  if (tipo === "Ahorro") {
                    const aho = (catalog.ahorros || []).find((a) => a.nombre === v);
                    if (aho) { setCantidad(String(aho.aportacion)); if (aho.metodo) setMetodo(aho.metodo); if (aho.cuenta) setCuenta(aho.cuenta); }
                  } else if (tipo === "Inversión") {
                    const inv = (catalog.inversiones || []).find((i) => i.nombre === v);
                    if (inv) { setCantidad(String(inv.aportacion)); if (inv.metodo) setMetodo(inv.metodo); if (inv.cuenta) setCuenta(inv.cuenta); }
                  }
                }} style={selStyle(errors.categoria)} disabled={!tipo}>
                  <option value="">{tipo ? (tipo === "Pago TDC" ? "¿A cuál tarjeta abonaste?" : "Selecciona...") : "Primero elige Tipo"}</option>
                  {categoriasDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {tipo === "Pago TDC" && categoria && <p style={{ fontSize: 11, color: "#555", fontStyle: "italic", margin: "4px 0 0" }}>El abono se registrará a {categoria}. Elige abajo de dónde salió el dinero.</p>}
              </Field>
              {/* Subcategoría para G.Fijo (membresías/servicios/seguros) */}
              {tipo === "G. Fijo" && categoria && (
                <Field label="Subcategoría" error={errors.subcategoria}>
                  <select value={subcategoria} onChange={(e) => {
                    const v = e.target.value;
                    setSubcategoria(v);
                    // Autocompletar desde catálogo
                    let item = null;
                    if (categoria === "Membresías") item = (catalog.membresias || []).find(m => m.nombre === v);
                    else if (categoria === "Servicios") item = (catalog.servicios || []).find(s => s.nombre === v);
                    else if (categoria === "Seguros") item = (catalog.seguros || []).find(s => s.nombre === v);
                    if (item) {
                      if (item.metodo) setMetodo(item.metodo);
                      if (item.cuenta) setCuenta(item.cuenta);
                      if (item.costo) setCantidad(String(item.costo));
                    }
                  }} style={selStyle(errors.subcategoria)} disabled={!categoria}>
                    <option value="">Selecciona...</option>
                    {(subcatsDisponibles).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {subcategoria && <p style={{ fontSize: 11, color: "#555", fontStyle: "italic", margin: "4px 0 0" }}>Origen y cantidad prellenados — puedes cambiarlos.</p>}
                </Field>
              )}
              {/* Subcategoría para otros tipos */}
              {tipo !== "G. Fijo" && tipo && categoria && subcatsDisponibles.length > 0 && (
                <Field label="Subcategoría">
                  <select value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} style={selStyle(false)}>
                    <option value="">Selecciona...</option>
                    {subcatsDisponibles.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              )}
            </>
          )}

          {/* INGRESO: Tipo primero */}
          {mov === "Ingreso" && (
            <>
              <Field label="Tipo de ingreso" error={errors.ingresoTipo}>
                <select value={ingresoTipo} onChange={(e) => { setIngresoTipo(e.target.value); setErrors((p) => ({ ...p, ingresoTipo: false })); }} style={selStyle(errors.ingresoTipo)}>
                  <option value="">Selecciona...</option>
                  {catalog.ingresoTipos.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              {ingresoSubsDisponibles.length > 0 && (
                <Field label="Subcategoría">
                  <select value={ingresoSub} onChange={(e) => setIngresoSub(e.target.value)} style={selStyle(false)}>
                    <option value="">Selecciona...</option>
                    {ingresoSubsDisponibles.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              )}
              {ingresoSub === "Préstamo de tercero" && (
                <Field label="¿De quién?">
                  <input type="text" value={ingresoPersonaTercero} onChange={(e) => setIngresoPersonaTercero(e.target.value)} style={inputBase} placeholder="Nombre" />
                </Field>
              )}
            </>
          )}

          {/* Origen / Cuenta — siempre después del tipo */}
          <Field label={mov === "Egreso" ? "Origen" : "Destino"} error={errors.metodo}>
            <select value={metodo} onChange={(e) => { setMetodo(e.target.value); setErrors((p) => ({ ...p, metodo: false })); }} style={selStyle(errors.metodo)}>
              <option value="">Selecciona...</option>
              {catalog.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Cuenta" error={errors.cuenta}>
            <select value={cuenta} onChange={(e) => { setCuenta(e.target.value); setErrors((p) => ({ ...p, cuenta: false })); }} style={selStyle(errors.cuenta)} disabled={!metodo}>
              <option value="">{metodo ? "Selecciona..." : "Primero elige Origen"}</option>
              {cuentasDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          {/* Diferido TDC toggle */}
          {mov === "Egreso" && metodo === "TDC" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10, padding: "8px 10px", background: SHEET.gris, borderRadius: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic" }}>¿Deseas agregar un diferido?</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setEsDiferido(true)} style={{ padding: "5px 12px", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente, border: esDiferido ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde, background: esDiferido ? SHEET.azul : "#fff" }}>Sí</button>
                <button onClick={() => setEsDiferido(false)} style={{ padding: "5px 12px", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente, border: !esDiferido ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde, background: !esDiferido ? SHEET.azul : "#fff" }}>No</button>
              </div>
            </div>
          )}

          {/* Diferido fields */}
          {esDiferido && (
            <>
              <Field label="Nombre del diferido (opcional)">
                <input type="text" value={nombreDiferido} onChange={(e) => setNombreDiferido(e.target.value)} style={inputBase} placeholder="Ej. iPhone nuevo, Viaje Cancún" />
              </Field>
              <Field label="Categoría" error={errors.categoria}>
                <select value={categoria} onChange={(e) => { setCategoria(e.target.value); setErrors((p) => ({ ...p, categoria: false })); }} style={selStyle(errors.categoria)}>
                  <option value="">Selecciona...</option>
                  {Object.keys(catalog.subcategorias).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              {categoria && (catalog.subcategorias[categoria] || []).length > 0 && (
                <Field label="Subcategoría" error={errors.subcategoria}>
                  <select value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} style={selStyle(false)}>
                    <option value="">Selecciona...</option>
                    {(catalog.subcategorias[categoria] || []).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Plazo (meses)" error={errors.plazoMeses}>
                <input type="text" inputMode="numeric" placeholder="Ej. 6" value={plazoMeses} onChange={(e) => { setPlazoMeses(e.target.value); setErrors((p) => ({ ...p, plazoMeses: false })); }} style={selStyle(errors.plazoMeses)} />
              </Field>
              <Field label="¿Lleva intereses?">
                <div style={{ display: "flex", gap: 6 }}>
                  {[["Sí", true], ["No (sin intereses)", false]].map(([label, val]) => (
                    <button key={label} onClick={() => { setConIntereses(val); setMensualidadFija(""); }} style={{ flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente, border: conIntereses === val ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde, background: conIntereses === val ? SHEET.azul : "#fff" }}>{label}</button>
                  ))}
                </div>
              </Field>
              {conIntereses && (
                <Field label="Mensualidad fija (lo que pagas cada mes, ya con intereses incluidos)">
                  <input type="text" inputMode="decimal" value={mensualidadFija} onChange={(e) => setMensualidadFija(e.target.value)} style={inputBase} placeholder="Ej. $1,215.69" />
                  {mensualidadFija && plazoMeses && parseFloat(mensualidadFija) > 0 && parseInt(plazoMeses) > 0 && (
                    <div style={{ background: SHEET.amarillo, border: "1px solid #e6d200", borderRadius: 4, padding: "7px 10px", marginTop: 6, fontSize: 12 }}>
                      <p style={{ margin: "0 0 2px" }}><b>Total a pagar:</b> {fmt(Math.round(parseFloat(mensualidadFija) * parseInt(plazoMeses) * 100) / 100)}</p>
                      {cantidad && parseFloat(cantidad) > 0 && (<p style={{ margin: 0, color: "#666" }}>Intereses totales implícitos: {fmt(Math.round((parseFloat(mensualidadFija) * parseInt(plazoMeses) - parseFloat(cantidad)) * 100) / 100)}</p>)}
                    </div>
                  )}
                </Field>
              )}
              {plazoMeses && parseInt(plazoMeses) > 1 && (
                <>
                  <Field label="¿Ya venías pagando este diferido? (opcional)">
                    <select value={pagosPrevios} onChange={(e) => {
                      const n = e.target.value; setPagosPrevios(n);
                      const mensual = conIntereses && mensualidadFija && parseFloat(mensualidadFija) > 0 ? parseFloat(mensualidadFija) : (cantidad && parseFloat(cantidad) > 0 && parseInt(plazoMeses) > 0 ? parseFloat(cantidad) / parseInt(plazoMeses) : 0);
                      setPagadoPrevio(n ? String(Math.round(mensual * parseInt(n) * 100) / 100) : "");
                    }} style={inputBase}>
                      <option value="">No, es nuevo — empiezo desde el pago 1</option>
                      {Array.from({ length: parseInt(plazoMeses) - 1 }, (_, i) => i + 1).map((n) => (<option key={n} value={n}>Ya pagué {n} mensualidad{n > 1 ? "es" : ""} antes de usar la app</option>))}
                    </select>
                  </Field>
                  {pagosPrevios && (
                    <Field label="Monto total ya pagado">
                      <input type="text" inputMode="decimal" value={pagadoPrevio} onChange={(e) => setPagadoPrevio(e.target.value)} style={inputBase} />
                      <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "4px 0 0" }}>Te sugerimos este monto, pero puedes ajustarlo.</p>
                    </Field>
                  )}
                </>
              )}
            </>
          )}
          <Field label={esDiferido ? "Costo Total" : "Cantidad"} error={errors.cantidad}>
            <input type="text" inputMode="decimal" placeholder="$0.00" value={cantidad}
              onChange={(e) => { setCantidad(e.target.value); setErrors((p) => ({ ...p, cantidad: false })); }}
              style={{ ...inputBase, fontSize: 22, fontWeight: 700, textAlign: "center", border: errors.cantidad ? `2px solid ${SHEET.rojo}` : `2px solid ${bandBorder}`, background: errors.cantidad ? "#fff" : bandColor }} />
          </Field>
          {esDiferido && plazoMeses && cantidad && parseFloat(cantidad) > 0 && parseInt(plazoMeses) > 0 && (
            <p style={{ fontSize: 12, color: "#555", fontStyle: "italic", margin: "-4px 0 10px" }}>
              Mensualidad aproximada: {fmt(parseFloat(cantidad) / parseInt(plazoMeses))} x {plazoMeses} meses
            </p>
          )}

          <Field label="Descripción">
            <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} style={inputBase} placeholder="Ej. Starbucks" />
          </Field>

          <Field label="Lugar">
            <input type="text" list="lugares-list" value={lugar} onChange={(e) => setLugar(e.target.value)} style={inputBase} placeholder="Ej. Monterrey, NL" />
            <datalist id="lugares-list">{catalog.lugares.map((l) => <option key={l} value={l} />)}</datalist>
          </Field>

          <div style={{ borderTop: `1px solid ${bandBorder}`, marginTop: 4, paddingTop: 10 }}>
            <Field label="Fecha" error={errors.fecha}>
              <div style={{ width: "100%", overflow: "hidden", borderRadius: 2 }}>
                <input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setErrors((p) => ({ ...p, fecha: false })); }}
                  style={{
                    display: "block", width: "100%", boxSizing: "border-box", fontFamily: SHEET.fuente,
                    borderRadius: 2, padding: "8px 6px", fontSize: 14, color: SHEET.texto,
                    background: errors.fecha ? "#fff" : bandColor, border: errors.fecha ? `2px solid ${SHEET.rojo}` : `1px solid ${bandBorder}`
                  }} />
              </div>
            </Field>
          </div>

          {Object.keys(errors).some((k) => errors[k]) && (
            <p style={{ fontSize: 12, color: SHEET.rosaBorde, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
              Completa los campos marcados en rojo antes de guardar
            </p>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <Btn primary full onClick={handleSave} style={{ flex: 2 }}>
              {saved ? "✓ Guardado" : "Guardar movimiento"}
            </Btn>
            <Btn full onClick={reset} style={{ flex: 1 }}>
              Nuevo
            </Btn>
          </div>
          {saved && (
            <p style={{ fontSize: 11.5, color: SHEET.verdeBorde, fontStyle: "italic", textAlign: "center", margin: "8px 0 0" }}>
              Guardado. Puedes seguir editando o tocar "Nuevo" para capturar otro movimiento.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ResumenTab({ movimientos, catalog }) {
  const [mesAbierto, setMesAbierto] = useState(null);

  // --- Flujo total acumulado hasta hoy ---
  // "Disponible real" = solo Efectivo + TDD (lo que tienes en cash/débito ahora mismo)
  // TDC se muestra aparte como deuda pendiente
  const totalIngresosHist = movimientos.filter((m) => m.mov === "Ingreso").reduce((s, m) => s + Number(m.cantidad), 0);
  const totalEgresosHist = movimientos.filter((m) => m.mov === "Egreso").reduce((s, m) => s + Number(m.cantidad), 0);
  const balanceTotal = totalIngresosHist - totalEgresosHist;

  // Disponible real = ingresos - egresos excluyendo TDC (solo flujo de efectivo/débito)
  const ingresosLiquidoHist = movimientos.filter((m) => m.mov === "Ingreso" && m.metodo !== "TDC").reduce((s, m) => s + Number(m.cantidad), 0);
  const egresosLiquidoHist = movimientos.filter((m) => m.mov === "Egreso" && m.metodo !== "TDC").reduce((s, m) => s + Number(m.cantidad), 0);
  const balanceLiquido = ingresosLiquidoHist - egresosLiquidoHist;

  // Deuda TDC total acumulada (gastos TDC - pagos TDC)
  const gastosTDCHist = movimientos.filter((m) => m.mov === "Egreso" && m.metodo === "TDC" && m.tipo !== "Pago TDC").reduce((s, m) => s + Number(m.cantidad), 0);
  const pagosTDCHist = movimientos.filter((m) => m.mov === "Egreso" && m.tipo === "Pago TDC").reduce((s, m) => s + Number(m.cantidad), 0);
  const deudaTDCHist = Math.max(0, gastosTDCHist - pagosTDCHist);

  // Desglose ingresos por tipo (histórico)
  const ingresosPorTipo = useMemo(() => {
    const map = {};
    movimientos.filter((m) => m.mov === "Ingreso").forEach((m) => {
      const t = m.ingresoTipo || m.tipo || "Otro(a)";
      map[t] = (map[t] || 0) + Number(m.cantidad);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [movimientos]);

  // Desglose egresos por tipo (histórico)
  const egresosPorTipo = useMemo(() => {
    const map = {};
    movimientos.filter((m) => m.mov === "Egreso").forEach((m) => {
      const t = m.tipo || "Otro(a)";
      map[t] = (map[t] || 0) + Number(m.cantidad);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [movimientos]);

  // --- Balance por mes para el historial desplegable ---
  const meses = useMemo(() => {
    const set = new Set(movimientos.map((m) => m.fecha.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [movimientos]);

  const balancePorMes = useMemo(() => {
    return meses.map((mes) => {
      const movsMes = movimientos.filter((m) => m.fecha.startsWith(mes));
      const ing = movsMes.filter((m) => m.mov === "Ingreso").reduce((s, m) => s + Number(m.cantidad), 0);
      const eg = movsMes.filter((m) => m.mov === "Egreso").reduce((s, m) => s + Number(m.cantidad), 0);
      const bal = ing - eg;
      // Desglose por tipo para el desplegable
      const ingTipos = {};
      movsMes.filter((m) => m.mov === "Ingreso").forEach((m) => { const t = m.ingresoTipo || m.tipo || "Otro(a)"; ingTipos[t] = (ingTipos[t] || 0) + Number(m.cantidad); });
      const egTipos = {};
      movsMes.filter((m) => m.mov === "Egreso").forEach((m) => { const t = m.tipo || "Otro(a)"; egTipos[t] = (egTipos[t] || 0) + Number(m.cantidad); });
      return { mes, ing, eg, bal, ingTipos, egTipos };
    });
  }, [meses, movimientos]);

  return (
    <div style={{ fontFamily: SHEET.fuente }}>

      {/* === FLUJO TOTAL ACUMULADO === */}
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden", marginBottom: 18 }}>
        <HeaderBand color={SHEET.azul} borderColor={SHEET.azulBorde}>Flujo de Efectivo Total</HeaderBand>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#fff" }}>
          <div style={{ padding: "14px", borderRight: "1px solid " + SHEET.grisBorde }}>
            <p style={{ fontSize: 11, fontWeight: 700, margin: "0 0 4px", color: SHEET.verdeBorde }}>Total Ingresos</p>
            <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: SHEET.verdeBorde }}>{fmtShort(totalIngresosHist)}</p>
          </div>
          <div style={{ padding: "14px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, margin: "0 0 4px", color: SHEET.rosaBorde }}>Total Egresos</p>
            <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: SHEET.rosaBorde }}>{fmtShort(totalEgresosHist)}</p>
          </div>
        </div>
        <div style={{ padding: "12px 14px", background: balanceLiquido >= 0 ? SHEET.verde : SHEET.rosa, borderTop: "1px solid " + SHEET.grisBorde, textAlign: "center" }}>
          <p style={{ fontSize: 11, fontWeight: 700, margin: "0 0 2px", color: balanceLiquido >= 0 ? SHEET.verdeBorde : SHEET.rosaBorde }}>Disponible en efectivo / débito</p>
          <p style={{ fontSize: 26, fontWeight: 700, margin: 0, color: balanceLiquido >= 0 ? SHEET.verdeBorde : SHEET.rosaBorde }}>{fmt(balanceLiquido)}</p>
        </div>
        {deudaTDCHist > 0 && (
          <div style={{ padding: "8px 14px", background: "#fff7f7", borderTop: "1px solid " + SHEET.grisBorde, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#888" }}>⚠ Deuda TDC pendiente (no incluida arriba)</span>
            <b style={{ fontSize: 12, color: SHEET.rosaBorde }}>{fmt(deudaTDCHist)}</b>
          </div>
        )}
      </div>

      {/* Desglose ingresos histórico */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ background: SHEET.verde, padding: "6px 10px", borderBottom: "1px solid " + SHEET.grisBorde }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: SHEET.verdeBorde }}>Ingresos por tipo</span>
          </div>
          {ingresosPorTipo.map(([t, v]) => (
            <div key={t} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", borderBottom: "1px solid " + SHEET.grisBorde, fontSize: 11 }}>
              <span style={{ color: "#555" }}>{t}</span>
              <b style={{ color: SHEET.verdeBorde }}>{fmt(v)}</b>
            </div>
          ))}
        </div>
        <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ background: SHEET.rosa, padding: "6px 10px", borderBottom: "1px solid " + SHEET.grisBorde }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: SHEET.rosaBorde }}>Egresos por tipo</span>
          </div>
          {egresosPorTipo.map(([t, v]) => (
            <div key={t} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", borderBottom: "1px solid " + SHEET.grisBorde, fontSize: 11 }}>
              <span style={{ color: "#555" }}>{t}</span>
              <b style={{ color: SHEET.rosaBorde }}>{fmt(v)}</b>
            </div>
          ))}
        </div>
      </div>

      {/* === HISTORIAL POR MES (desplegable) === */}
      <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", borderBottom: `2px solid ${SHEET.rosaBorde}`, paddingBottom: 4, marginBottom: 10 }}>
        Historial por mes
      </p>
      {balancePorMes.map(({ mes, ing, eg, bal, ingTipos, egTipos }) => {
        const abierto = mesAbierto === mes;
        const esMesActual = mes === todayISO().slice(0, 7);
        return (
          <div key={mes} style={{ border: `1px solid ${abierto ? SHEET.azulBorde : SHEET.grisBorde}`, borderRadius: 4, marginBottom: 8, overflow: "hidden" }}>
            <button onClick={() => setMesAbierto(abierto ? null : mes)} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              width: "100%", padding: "10px 12px", background: abierto ? SHEET.azul : SHEET.gris,
              border: "none", cursor: "pointer", fontFamily: SHEET.fuente
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic" }}>
                {esMesActual ? "📍 " : ""}{mesLabel(mes)}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: bal >= 0 ? SHEET.verdeBorde : SHEET.rosaBorde }}>
                  {bal >= 0 ? "+" : ""}{fmt(bal)}
                </span>
                <span style={{ fontSize: 11, color: "#888" }}>{abierto ? "▲" : "▼"}</span>
              </div>
            </button>
            {abierto && (
              <div style={{ background: "#fff", padding: "10px 12px", borderTop: "1px solid " + SHEET.grisBorde }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                  <div style={{ background: SHEET.verde, borderRadius: 4, padding: "8px 10px" }}>
                    <p style={{ fontSize: 10, color: SHEET.verdeBorde, margin: "0 0 2px", fontWeight: 700 }}>Ingresos</p>
                    <p style={{ fontSize: 16, fontWeight: 700, margin: 0, color: SHEET.verdeBorde }}>{fmt(ing)}</p>
                  </div>
                  <div style={{ background: SHEET.rosa, borderRadius: 4, padding: "8px 10px" }}>
                    <p style={{ fontSize: 10, color: SHEET.rosaBorde, margin: "0 0 2px", fontWeight: 700 }}>Egresos</p>
                    <p style={{ fontSize: 16, fontWeight: 700, margin: 0, color: SHEET.rosaBorde }}>{fmt(eg)}</p>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    {Object.entries(ingTipos).sort((a,b)=>b[1]-a[1]).map(([t,v]) => (
                      <div key={t} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0", borderBottom: "1px solid " + SHEET.grisBorde }}>
                        <span style={{ color: "#555" }}>{t}</span>
                        <b style={{ color: SHEET.verdeBorde }}>{fmt(v)}</b>
                      </div>
                    ))}
                  </div>
                  <div>
                    {Object.entries(egTipos).sort((a,b)=>b[1]-a[1]).map(([t,v]) => (
                      <div key={t} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0", borderBottom: "1px solid " + SHEET.grisBorde }}>
                        <span style={{ color: "#555" }}>{t}</span>
                        <b style={{ color: SHEET.rosaBorde }}>{fmt(v)}</b>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


function HistorialTab({ movimientos, deleteMovimiento }) {
  const [filtroMes, setFiltroMes] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const meses = useMemo(() => {
    const set = new Set(movimientos.map((m) => m.fecha.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [movimientos]);
  const filtrados = useMemo(() => {
    return movimientos
      .filter((m) => filtroMes === "todos" || m.fecha.slice(0, 7) === filtroMes)
      .filter((m) => filtroTipo === "todos" || m.mov === filtroTipo)
      .filter((m) => {
        if (!busqueda) return true;
        const q = busqueda.toLowerCase();
        return (m.descripcion || "").toLowerCase().includes(q) || (m.categoria || "").toLowerCase().includes(q) ||
          (m.subcategoria || "").toLowerCase().includes(q) || (m.cuenta || "").toLowerCase().includes(q) || (m.lugar || "").toLowerCase().includes(q);
      })
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  }, [movimientos, filtroMes, filtroTipo, busqueda]);

  function exportarPDFHistorial() {
    const totalIng = filtrados.filter(m => m.mov === "Ingreso").reduce((s, m) => s + Number(m.cantidad), 0);
    const totalEg = filtrados.filter(m => m.mov === "Egreso").reduce((s, m) => s + Number(m.cantidad), 0);
    const filas = filtrados.map((m, i) => `<tr style="background:${i%2===0?'#fff':'#f9f9f9'}">
      <td>${fmtDate(m.fecha)}</td>
      <td>${m.categoria || ""}${m.subcategoria ? ` · ${m.subcategoria}` : ""}</td>
      <td>${m.cuenta || ""}</td>
      <td>${m.descripcion || ""}</td>
      <td class="num" style="color:${m.mov==="Ingreso"?"#2e7d32":"#c62828"};font-weight:700">
        ${m.mov==="Ingreso"?"+":"-"}${fmt(m.cantidad)}
      </td>
    </tr>`).join("");
    const titulo = filtroMes !== "todos" ? `Historial ${mesLabel(filtroMes)}` : "Historial completo";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titulo}</title>
    <style>body{font-family:Calibri,Arial,sans-serif;padding:20px;font-size:10px}
    h1{font-size:16px;margin:0 0 2px}p.sub{font-size:10px;color:#777;margin:0 0 12px}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:3px 6px;text-align:left}
    th{background:#F4CCCC;font-weight:700}td.num{text-align:right}
    .resumen{display:flex;gap:20px;margin-bottom:12px;font-size:11px}
    .ing{color:#2e7d32;font-weight:700}.eg{color:#c62828;font-weight:700}.bal{font-weight:700}
    @media print{body{padding:0}}</style></head>
    <body>
    <h1>${titulo}</h1>
    <p class="sub">Generado el ${fmtDate(todayISO())} · ${filtrados.length} movimientos</p>
    <div class="resumen">
      <span>Ingresos: <span class="ing">${fmt(totalIng)}</span></span>
      <span>Egresos: <span class="eg">${fmt(totalEg)}</span></span>
      <span>Balance: <span class="bal" style="color:${totalIng-totalEg>=0?"#2e7d32":"#c62828"}">${fmt(totalIng-totalEg)}</span></span>
    </div>
    <table><thead><tr><th>Fecha</th><th>Concepto</th><th>Cuenta</th><th>Descripción</th><th class="num">Monto</th></tr></thead>
    <tbody>${filas}</tbody></table>
    <script>window.onload=()=>{window.print();}</script></body></html>`;
    const v = window.open("","_blank"); if(v){v.document.write(html);v.document.close();}
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <Field label="Buscar">
        <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Categoría, lugar, descripción..." style={inputBase} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} style={inputBase}>
          <option value="todos">Todos los meses</option>
          {meses.map((m) => <option key={m} value={m}>{mesLabel(m)}</option>)}
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={inputBase}>
          <option value="todos">Todos</option>
          <option value="Ingreso">Ingresos</option>
          <option value="Egreso">Egresos</option>
        </select>
      </div>
      <button onClick={exportarPDFHistorial} style={{
        width: "100%", padding: "9px", marginBottom: 14, fontSize: 12, fontWeight: 700, fontStyle: "italic",
        border: `1px solid ${SHEET.rosaBorde}`, borderRadius: 3, background: SHEET.rosa, cursor: "pointer", fontFamily: SHEET.fuente
      }}>📄 Descargar PDF del historial ({filtrados.length} movimientos)</button>

      {filtrados.length === 0 && <p style={{ fontSize: 13, color: "#666", textAlign: "center", padding: "2rem 0", fontStyle: "italic" }}>No hay movimientos que coincidan.</p>}

      <div style={{ border: filtrados.length ? "1px solid " + SHEET.grisBorde : "none", borderRadius: 4, overflow: "hidden" }}>
        {filtrados.map((m, i) => {
          // Label especial para ajustes
          const esAjuste = m.categoria === "Ajuste";
          const labelAjuste = esAjuste ? (m.mov === "Ingreso" ? "⬆ Ajuste positivo" : "⬇ Ajuste negativo") : null;
          return (
          <div key={m.id} style={{
            background: esAjuste ? (m.mov === "Ingreso" ? "#f0fdf4" : "#fff5f5") : i % 2 === 0 ? "#fff" : SHEET.gris,
            borderTop: i === 0 ? "none" : "1px solid " + SHEET.grisBorde,
            borderLeft: `3px solid ${m.mov === "Ingreso" ? SHEET.verdeBorde : SHEET.rosaBorde}`, padding: "10px 12px",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: esAjuste ? (m.mov === "Ingreso" ? SHEET.verdeBorde : SHEET.rosaBorde) : "#222" }}>
                {labelAjuste || `${m.categoria}${m.subcategoria ? ` · ${m.subcategoria}` : ""}`}
              </p>
              {esAjuste && m.descripcion && <p style={{ fontSize: 11, color: "#666", margin: "1px 0 0", fontStyle: "italic" }}>{m.descripcion}</p>}
              <p style={{ fontSize: 11, color: "#555", margin: 0, fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {fmtDate(m.fecha)}{m.cuenta ? ` · ${m.cuenta}` : ""}{!esAjuste && m.descripcion ? ` · ${m.descripcion}` : ""}{m.lugar && !m.lugar.startsWith("__diferido:") ? ` · ${m.lugar}` : ""}
              </p>
            </div>
            <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: m.mov === "Ingreso" ? SHEET.verdeBorde : SHEET.rosaBorde }}>{m.mov === "Ingreso" ? "+" : "-"}{fmt(m.cantidad)}</span>
              <button aria-label="Eliminar" onClick={() => deleteMovimiento(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, padding: 4 }}>✕</button>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function ListEditor({ title, items, onAdd, onRemove }) {
  const [val, setVal] = useState("");
  return (
    <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
      <HeaderBand color={SHEET.amarillo} borderColor={SHEET.amarilloBorde}>{title}</HeaderBand>
      <div style={{ background: "#fff", padding: "12px 14px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {items.map((it) => (
            <span key={it} style={{ display: "flex", alignItems: "center", gap: 4, background: SHEET.gris, border: "1px solid " + SHEET.grisBorde, borderRadius: 3, padding: "4px 8px", fontSize: 12 }}>
              {it}
              <button aria-label={`Quitar ${it}`} onClick={() => onRemove(it)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde }}>✕</button>
            </span>
          ))}
          {items.length === 0 && <span style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin elementos aún</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="text" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Agregar nuevo..."
            style={{ ...inputBase, border: `2px solid ${SHEET.rojo}` }}
            onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) { onAdd(val.trim()); setVal(""); } }} />
          <Btn onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(""); } }}>+</Btn>
        </div>
      </div>
    </div>
  );
}

const CAT_VARIABLES = ["Comidas", "Compras Online", "Educación", "Entretenimiento", "Gastos Personales",
  "Intereses TDC", "Mascotas", "Otro(a)", "Regalos y Festejos", "Ropa y Accesorios",
  "Salud y Bienestar", "Supermercado", "Tecnología", "Tienda de Conveniencia",
  "Transporte", "Viajes y Vacaciones", "Vivienda"];

const MESES_LABEL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function mesLabel(ym) {
  const [y, m] = ym.split("-");
  return `${MESES_LABEL[parseInt(m, 10) - 1]} ${y}`;
}

function mesAnterior(ym) {
  const d = new Date(ym + "-01");
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

// Convierte frecuencia a número de meses
function frecuenciaAMeses(frecuencia) {
  const map = { "Semanal": 0.25, "Quincenal": 0.5, "Mensual": 1, "Bimestral": 2, "Trimestral": 3, "Semestral": 6, "Anual": 12 };
  return map[frecuencia] || 1;
}

// Convierte aportación por periodo a equivalente mensual
// Ej: $1,609 quincenal → $3,218/mes | $700 trimestral → $233/mes
function aportacionMensual(monto, frecuencia) {
  const mesesPorPeriodo = frecuenciaAMeses(frecuencia || "Mensual");
  // mesesPorPeriodo < 1 = pago más frecuente que mensual (semanal=0.25, quincenal=0.5)
  // mesesPorPeriodo > 1 = pago menos frecuente (trimestral=3, anual=12)
  return Math.round((monto / mesesPorPeriodo) * 100) / 100;
}

// Dado el último pago y la frecuencia, calcula la próxima fecha de pago (YYYY-MM-DD)
function calcProximoPago(ultPagoISO, frecuencia) {
  if (!ultPagoISO) return null;
  const meses = frecuenciaAMeses(frecuencia);
  const d = new Date(ultPagoISO);
  if (meses < 1) {
    d.setDate(d.getDate() + Math.round(meses * 30));
  } else {
    d.setMonth(d.getMonth() + Math.round(meses));
  }
  return d.toISOString().slice(0, 10);
}

// Busca el último pago de un item en el historial por categoría + subcategoría
function ultimoPagoDeHistorial(movimientos, categoria, nombre) {
  const pagos = movimientos.filter((m) =>
    m.mov === "Egreso" && m.categoria === categoria && m.subcategoria === nombre
  );
  if (pagos.length === 0) return null;
  return pagos.reduce((max, m) => (m.fecha > max ? m.fecha : max), pagos[0].fecha);
}

// ¿Toca pagar este item en el mes mesYM (YYYY-MM)?
function tocaEsteMe(ultPago, frecuencia, mesYM) {
  if (!ultPago) return true; // sin historial → asumir que sí toca
  const proximaFecha = calcProximoPago(ultPago, frecuencia);
  if (!proximaFecha) return true;
  return proximaFecha.slice(0, 7) === mesYM;
}

function calcFijosDelMes(catalog, movimientos = [], mesYM = "") {
  const fijosCat = {};
  const mes = mesYM || todayISO().slice(0, 7);

  // Membresías activas — solo si toca este mes según frecuencia
  (catalog.membresias || []).filter((m) => m.activa).forEach((m) => {
    const ult = ultimoPagoDeHistorial(movimientos, "Membresías", m.nombre);
    if (tocaEsteMe(ult, m.frecuencia || "Mensual", mes)) {
      fijosCat["Membresías"] = (fijosCat["Membresías"] || 0) + (m.costo || 0);
    }
  });

  // Servicios activos — solo si toca este mes
  (catalog.servicios || []).filter((s) => s.activa).forEach((s) => {
    if (s.esVariable) return;
    const ult = ultimoPagoDeHistorial(movimientos, "Servicios", s.nombre);
    if (tocaEsteMe(ult, s.frecuencia || "Mensual", mes)) {
      fijosCat["Servicios"] = (fijosCat["Servicios"] || 0) + (s.costo || 0);
    }
  });

  // Seguros activos — solo si toca este mes
  (catalog.seguros || []).filter((s) => s.activa).forEach((s) => {
    const ult = ultimoPagoDeHistorial(movimientos, "Seguros", s.nombre);
    if (tocaEsteMe(ult, s.frecuencia || "Anual", mes)) {
      fijosCat["Seguros"] = (fijosCat["Seguros"] || 0) + (s.costo || 0);
    }
  });

  // Préstamos bancarios activos — convertido a equivalente mensual
  (catalog.prestamosBancarios || []).filter((p) => p.activa).forEach((p) => {
    fijosCat["Préstamos Bancario/Crédito"] = (fijosCat["Préstamos Bancario/Crédito"] || 0) + aportacionMensual(p.pagoPeriodo || 0, p.frecuencia);
  });

  // Ahorro activo — convertido a equivalente mensual
  (catalog.ahorros || []).filter((a) => a.activa).forEach((a) => {
    fijosCat["Ahorro"] = (fijosCat["Ahorro"] || 0) + aportacionMensual(a.aportacion || 0, a.frecuencia);
  });

  // Inversión activa — convertido a equivalente mensual
  (catalog.inversiones || []).filter((i) => i.activa).forEach((i) => {
    fijosCat["Inversión"] = (fijosCat["Inversión"] || 0) + aportacionMensual(i.aportacion || 0, i.frecuencia);
  });

  // Familia aportación activa — convertido a equivalente mensual
  (catalog.familiares || []).filter((f) => f.activa).forEach((f) => {
    fijosCat["Familia (Aportación)"] = (fijosCat["Familia (Aportación)"] || 0) + aportacionMensual(f.aportacion || 0, f.frecuencia);
  });

  // Diferidos activos
  (catalog.diferidos || []).filter((d) => d.activo).forEach((d) => {
    fijosCat["Diferidos TDC"] = (fijosCat["Diferidos TDC"] || 0) + (d.aportacion || 0);
  });

  return fijosCat;
}

function PagosFuturosTab({ catalog, movimientos }) {
  const hoy = todayISO();
  const hoyDate = new Date(hoy);

  // Genera meses futuros desde el mes actual hasta 12 meses adelante
  function mesesFuturos(n = 13) {
    const meses = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(hoyDate.getFullYear(), hoyDate.getMonth() + i, 1);
      meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return meses;
  }

  // Para cada item devuelve la próxima fecha de pago a partir de hoy
  function proximaFechaDespuesDeHoy(ultPagoHistorial, ultPagoCatalogo, frecuencia) {
    const ult = ultPagoHistorial || ultPagoCatalogo || null;
    if (!ult) return hoy; // sin historial = toca ahora
    let fecha = calcProximoPago(ult, frecuencia);
    if (!fecha) return null;
    // Avanzar hasta que sea >= hoy
    let intentos = 0;
    while (fecha < hoy && intentos < 60) {
      fecha = calcProximoPago(fecha, frecuencia);
      intentos++;
    }
    return fecha;
  }

  // Construye lista de todos los pagos futuros
  const pagosFuturos = useMemo(() => {
    const items = [];

    // Membresías activas
    (catalog.membresias || []).filter((m) => m.activa).forEach((m) => {
      const ult = ultimoPagoDeHistorial(movimientos, "Membresías", m.nombre);
      const fecha = proximaFechaDespuesDeHoy(ult, m.ultimoPago, m.frecuencia || "Mensual");
      if (fecha) items.push({ fecha, nombre: m.nombre, tipo: "Membresía", monto: m.costo || 0, frecuencia: m.frecuencia || "Mensual", metodo: m.metodo, recurrente: true });
    });

    // Servicios activos
    (catalog.servicios || []).filter((s) => s.activa && !s.esVariable).forEach((s) => {
      const ult = ultimoPagoDeHistorial(movimientos, "Servicios", s.nombre);
      const fecha = proximaFechaDespuesDeHoy(ult, s.ultimoPago, s.frecuencia || "Mensual");
      if (fecha) items.push({ fecha, nombre: s.nombre, tipo: "Servicio", monto: s.costo || 0, frecuencia: s.frecuencia || "Mensual", metodo: s.metodo, recurrente: true });
    });

    // Seguros activos
    (catalog.seguros || []).filter((s) => s.activa).forEach((s) => {
      const ult = ultimoPagoDeHistorial(movimientos, "Seguros", s.nombre);
      const fecha = proximaFechaDespuesDeHoy(ult, s.ultimoPago, s.frecuencia || "Anual");
      if (fecha) items.push({ fecha, nombre: s.nombre, tipo: "Seguro", monto: s.costo || 0, frecuencia: s.frecuencia || "Anual", metodo: s.metodo, recurrente: true });
    });

    // Diferidos activos — pago mensual
    (catalog.diferidos || []).filter((d) => d.activo).forEach((d) => {
      const ult = d.ultPago || null;
      const fecha = proximaFechaDespuesDeHoy(ult, null, "Mensual");
      const pagosRestantes = (d.plazoMeses || 0) - (d.pagos || 0);
      if (fecha && pagosRestantes > 0) items.push({ fecha, nombre: d.nombre || d.categoria, tipo: "Diferido TDC", monto: d.aportacion || 0, frecuencia: "Mensual", metodo: "TDC", recurrente: true, extra: `${pagosRestantes} pagos restantes` });
    });

    // Préstamos bancarios activos
    (catalog.prestamosBancarios || []).filter((p) => p.activa).forEach((p) => {
      const pagosRestantes = p.numPagos ? p.numPagos - (p.pagosPrevios || 0) - Math.floor((p.acumulado || 0) / (p.pagoPeriodo || 1)) : null;
      const ult = p.ultimoPago || null;
      const fecha = proximaFechaDespuesDeHoy(ult, null, p.frecuencia || "Mensual");
      if (fecha) items.push({ fecha, nombre: p.nombre, tipo: "Préstamo", monto: p.pagoPeriodo || 0, frecuencia: p.frecuencia || "Mensual", metodo: p.metodo, recurrente: true, extra: pagosRestantes ? `${pagosRestantes} pagos restantes` : "" });
    });

    // Ahorro activo
    (catalog.ahorros || []).filter((a) => a.activa).forEach((a) => {
      const ult = ultimoPagoDeHistorial(movimientos, "Ahorro", a.nombre);
      const fecha = proximaFechaDespuesDeHoy(ult, null, a.frecuencia || "Mensual");
      if (fecha) items.push({ fecha, nombre: a.nombre, tipo: "Ahorro", monto: a.aportacion || 0, frecuencia: a.frecuencia || "Mensual", metodo: a.metodo, recurrente: true });
    });

    // Inversión activa
    (catalog.inversiones || []).filter((i) => i.activa).forEach((i) => {
      const ult = ultimoPagoDeHistorial(movimientos, "Inversión", i.nombre);
      const fecha = proximaFechaDespuesDeHoy(ult, null, i.frecuencia || "Mensual");
      if (fecha) items.push({ fecha, nombre: i.nombre, tipo: "Inversión", monto: i.aportacion || 0, frecuencia: i.frecuencia || "Mensual", metodo: i.metodo, recurrente: true });
    });

    // Familiares activos
    (catalog.familiares || []).filter((f) => f.activa).forEach((f) => {
      const ult = ultimoPagoDeHistorial(movimientos, "Aportación", f.nombre);
      const fecha = proximaFechaDespuesDeHoy(ult, null, f.frecuencia || "Mensual");
      if (fecha) items.push({ fecha, nombre: f.nombre, tipo: "Familia", monto: f.aportacion || 0, frecuencia: f.frecuencia || "Mensual", metodo: f.metodo, recurrente: true });
    });

    return items.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [catalog, movimientos]);

  // Agrupar por mes
  const meses = mesesFuturos(13);
  const porMes = useMemo(() => {
    const map = {};
    meses.forEach((m) => { map[m] = []; });

    // Membresías — sin límite (recurrentes indefinidas)
    (catalog.membresias || []).filter((m) => m.activa).forEach((m) => {
      const ult = ultimoPagoDeHistorial(movimientos, "Membresías", m.nombre);
      let fecha = proximaFechaDespuesDeHoy(ult, m.ultimoPago, m.frecuencia || "Mensual");
      let intentos = 0;
      while (fecha && fecha.slice(0, 7) <= meses[meses.length - 1] && intentos < 50) {
        const mes = fecha.slice(0, 7);
        if (map[mes]) map[mes].push({ fecha, nombre: m.nombre, tipo: "Membresía", monto: m.costo || 0, metodo: m.metodo });
        fecha = calcProximoPago(fecha, m.frecuencia || "Mensual");
        intentos++;
      }
    });

    // Servicios — sin límite
    (catalog.servicios || []).filter((s) => s.activa && !s.esVariable).forEach((s) => {
      const ult = ultimoPagoDeHistorial(movimientos, "Servicios", s.nombre);
      let fecha = proximaFechaDespuesDeHoy(ult, s.ultimoPago, s.frecuencia || "Mensual");
      let intentos = 0;
      while (fecha && fecha.slice(0, 7) <= meses[meses.length - 1] && intentos < 50) {
        const mes = fecha.slice(0, 7);
        if (map[mes]) map[mes].push({ fecha, nombre: s.nombre, tipo: "Servicio", monto: s.costo || 0, metodo: s.metodo });
        fecha = calcProximoPago(fecha, s.frecuencia || "Mensual");
        intentos++;
      }
    });

    // Seguros — sin límite
    (catalog.seguros || []).filter((s) => s.activa).forEach((s) => {
      const ult = ultimoPagoDeHistorial(movimientos, "Seguros", s.nombre);
      let fecha = proximaFechaDespuesDeHoy(ult, s.ultimoPago, s.frecuencia || "Anual");
      let intentos = 0;
      while (fecha && fecha.slice(0, 7) <= meses[meses.length - 1] && intentos < 20) {
        const mes = fecha.slice(0, 7);
        if (map[mes]) map[mes].push({ fecha, nombre: s.nombre, tipo: "Seguro", monto: s.costo || 0, metodo: s.metodo });
        fecha = calcProximoPago(fecha, s.frecuencia || "Anual");
        intentos++;
      }
    });

    // Diferidos — parar cuando se acaben los pagos restantes
    (catalog.diferidos || []).filter((d) => d.activo).forEach((d) => {
      let fecha = proximaFechaDespuesDeHoy(d.ultPago, null, "Mensual");
      let pagosHechos = d.pagos || 0;
      const plazo = d.plazoMeses || 0;
      const pagosRestantes = Math.max(0, plazo - pagosHechos);
      let proyectados = 0;
      let intentos = 0;
      while (fecha && fecha.slice(0, 7) <= meses[meses.length - 1] && proyectados < pagosRestantes && intentos < 50) {
        const mes = fecha.slice(0, 7);
        if (map[mes]) map[mes].push({ fecha, nombre: d.nombre || d.categoria, tipo: "Diferido TDC", monto: d.aportacion || 0, metodo: "TDC" });
        fecha = calcProximoPago(fecha, "Mensual");
        proyectados++;
        intentos++;
      }
    });

    // Préstamos — parar cuando se alcance el total a pagar
    (catalog.prestamosBancarios || []).filter((p) => p.activa).forEach((p) => {
      const freq = p.frecuencia || "Mensual";
      const diasStr = p.diasPago || "";
      const diasEspecificos = diasStr ? diasStr.split(",").map((d) => parseInt(d.trim())).filter((d) => !isNaN(d)) : [];
      const totalAPagar = p.totalAPagar || 0;
      const acumulado = p.acumulado || 0;
      const pagoPeriodo = p.pagoPeriodo || 0;
      const pagosRestantes = pagoPeriodo > 0 ? Math.max(0, Math.ceil((totalAPagar - acumulado) / pagoPeriodo)) : 0;
      let proyectados = 0;

      if ((freq === "Quincenal" || freq === "Semanal") && diasEspecificos.length > 0) {
        meses.forEach((mes) => {
          if (!map[mes] || proyectados >= pagosRestantes) return;
          const [y, m] = mes.split("-").map(Number);
          const diasEnMes = new Date(y, m, 0).getDate();
          diasEspecificos.forEach((dia) => {
            if (proyectados >= pagosRestantes) return;
            const diaReal = dia === 31 ? diasEnMes : Math.min(dia, diasEnMes);
            const fecha = `${mes}-${String(diaReal).padStart(2, "0")}`;
            if (fecha >= hoy) {
              map[mes].push({ fecha, nombre: p.nombre, tipo: "Préstamo", monto: pagoPeriodo, metodo: p.metodo });
              proyectados++;
            }
          });
        });
      } else {
        let fecha = proximaFechaDespuesDeHoy(p.ultimoPago, null, freq);
        let intentos = 0;
        while (fecha && fecha.slice(0, 7) <= meses[meses.length - 1] && proyectados < pagosRestantes && intentos < 50) {
          const mes = fecha.slice(0, 7);
          if (map[mes]) map[mes].push({ fecha, nombre: p.nombre, tipo: "Préstamo", monto: pagoPeriodo, metodo: p.metodo });
          fecha = calcProximoPago(fecha, freq);
          proyectados++;
          intentos++;
        }
      }
    });

    // Ahorro — parar cuando se alcance la meta
    (catalog.ahorros || []).filter((a) => a.activa).forEach((a) => {
      const ult = ultimoPagoDeHistorial(movimientos, "Ahorro", a.nombre);
      let fecha = proximaFechaDespuesDeHoy(ult, null, a.frecuencia || "Mensual");
      const meta = a.meta || 0;
      const acumulado = a.acumulado || 0;
      const aportacion = a.aportacion || 0;
      const pagosRestantes = meta > 0 && aportacion > 0 ? Math.max(0, Math.ceil((meta - acumulado) / aportacion)) : 999;
      let proyectados = 0;
      let intentos = 0;
      while (fecha && fecha.slice(0, 7) <= meses[meses.length - 1] && proyectados < pagosRestantes && intentos < 50) {
        const mes = fecha.slice(0, 7);
        if (map[mes]) map[mes].push({ fecha, nombre: a.nombre, tipo: "Ahorro", monto: aportacion, metodo: a.metodo });
        fecha = calcProximoPago(fecha, a.frecuencia || "Mensual");
        proyectados++;
        intentos++;
      }
    });

    // Inversión — parar cuando se alcance la meta
    (catalog.inversiones || []).filter((i) => i.activa).forEach((i) => {
      const ult = ultimoPagoDeHistorial(movimientos, "Inversión", i.nombre);
      let fecha = proximaFechaDespuesDeHoy(ult, null, i.frecuencia || "Mensual");
      const meta = i.meta || 0;
      const acumulado = i.acumulado || 0;
      const aportacion = i.aportacion || 0;
      const pagosRestantes = meta > 0 && aportacion > 0 ? Math.max(0, Math.ceil((meta - acumulado) / aportacion)) : 999;
      let proyectados = 0;
      let intentos = 0;
      while (fecha && fecha.slice(0, 7) <= meses[meses.length - 1] && proyectados < pagosRestantes && intentos < 50) {
        const mes = fecha.slice(0, 7);
        if (map[mes]) map[mes].push({ fecha, nombre: i.nombre, tipo: "Inversión", monto: aportacion, metodo: i.metodo });
        fecha = calcProximoPago(fecha, i.frecuencia || "Mensual");
        proyectados++;
        intentos++;
      }
    });

    // Familia — parar cuando se alcance la meta
    (catalog.familiares || []).filter((f) => f.activa).forEach((f) => {
      const ult = ultimoPagoDeHistorial(movimientos, "Aportación", f.nombre);
      let fecha = proximaFechaDespuesDeHoy(ult, null, f.frecuencia || "Mensual");
      const meta = f.meta || 0;
      const acumulado = f.acumuladoAport || 0;
      const aportacion = f.aportacion || 0;
      const pagosRestantes = meta > 0 && aportacion > 0 ? Math.max(0, Math.ceil((meta - acumulado) / aportacion)) : 999;
      let proyectados = 0;
      let intentos = 0;
      while (fecha && fecha.slice(0, 7) <= meses[meses.length - 1] && proyectados < pagosRestantes && intentos < 50) {
        const mes = fecha.slice(0, 7);
        if (map[mes]) map[mes].push({ fecha, nombre: f.nombre, tipo: "Familia", monto: aportacion, metodo: f.metodo });
        fecha = calcProximoPago(fecha, f.frecuencia || "Mensual");
        proyectados++;
        intentos++;
      }
    });

    return map;
  }, [catalog, movimientos]);

  const colores = {
    "Membresía": SHEET.azul, "Servicio": "#E8F4F8", "Seguro": "#FFF3E0",
    "Diferido TDC": SHEET.rosa, "Préstamo": "#FCE4EC", "Ahorro": SHEET.verde,
    "Inversión": "#E8F5E9", "Familia": "#F3E5F5"
  };
  const coloresBorde = {
    "Membresía": SHEET.azulBorde, "Servicio": "#0288D1", "Seguro": "#EF6C00",
    "Diferido TDC": SHEET.rosaBorde, "Préstamo": "#C62828", "Ahorro": SHEET.verdeBorde,
    "Inversión": "#2E7D32", "Familia": "#7B1FA2"
  };

  const mesActual = hoy.slice(0, 7);
  const [mesesAbiertos, setMesesAbiertos] = useState({ [mesActual]: true });

  function toggleMes(mes) {
    setMesesAbiertos((prev) => ({ ...prev, [mes]: !prev[mes] }));
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <p style={{ fontSize: 12, color: "#666", fontStyle: "italic", marginBottom: 14 }}>
        Próximos 12 meses — pagos comprometidos calculados de tu historial y configuración.
      </p>

      {meses.map((mes) => {
        const items = (porMes[mes] || []).sort((a, b) => a.fecha.localeCompare(b.fecha));
        const totalMes = items.reduce((s, i) => s + i.monto, 0);
        const esMesActual = mes === mesActual;
        const abierto = !!mesesAbiertos[mes];

        // Resumen por tipo para mostrar en el header cuando está cerrado
        const resumenTipos = {};
        items.forEach((item) => { resumenTipos[item.tipo] = (resumenTipos[item.tipo] || 0) + item.monto; });

        return (
          <div key={mes} style={{ marginBottom: 10, border: `1px solid ${esMesActual ? SHEET.azulBorde : SHEET.grisBorde}`, borderRadius: 4, overflow: "hidden" }}>
            {/* Header — siempre visible, clickeable */}
            <button onClick={() => toggleMes(mes)} style={{
              width: "100%", background: esMesActual ? SHEET.azul : SHEET.gris,
              padding: "10px 12px", border: "none", cursor: "pointer",
              borderBottom: abierto ? "1px solid " + SHEET.grisBorde : "none",
              fontFamily: SHEET.fuente, textAlign: "left"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic" }}>
                  {esMesActual ? "📍 " : ""}{mesLabel(mes)}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: totalMes > 0 ? SHEET.rosaBorde : "#aaa" }}>
                    {totalMes > 0 ? fmt(totalMes) : "—"}
                  </span>
                  <span style={{ fontSize: 11, color: "#888" }}>{abierto ? "▲" : "▼"}</span>
                </div>
              </div>
              {/* Mini resumen por tipo cuando está cerrado */}
              {!abierto && items.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                  {Object.entries(resumenTipos).map(([tipo, monto]) => (
                    <span key={tipo} style={{
                      fontSize: 10, padding: "1px 6px", borderRadius: 10,
                      background: colores[tipo] || SHEET.gris,
                      color: coloresBorde[tipo] || "#333",
                      border: `1px solid ${coloresBorde[tipo] || SHEET.grisBorde}`
                    }}>
                      {tipo}: {fmt(monto)}
                    </span>
                  ))}
                </div>
              )}
            </button>

            {/* Detalle desplegable */}
            {abierto && (
              <div>
                {items.length === 0 ? (
                  <p style={{ fontSize: 11, color: "#aaa", fontStyle: "italic", padding: "8px 12px", margin: 0 }}>Sin pagos programados este mes.</p>
                ) : (
                  <>
                    {items.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderBottom: "1px solid " + SHEET.grisBorde, background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10, background: colores[item.tipo] || SHEET.gris, color: coloresBorde[item.tipo] || "#333", whiteSpace: "nowrap", border: `1px solid ${coloresBorde[item.tipo] || SHEET.grisBorde}` }}>
                          {item.tipo}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{item.nombre}</span>
                          {item.metodo && <span style={{ fontSize: 10, color: "#aaa", marginLeft: 6 }}>{item.metodo}</span>}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, margin: 0, color: SHEET.rosaBorde }}>{fmt(item.monto)}</p>
                          <p style={{ fontSize: 10, color: "#aaa", margin: 0 }}>{fmtDate(item.fecha)}</p>
                        </div>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: SHEET.gris, borderTop: "1px solid " + SHEET.grisBorde }}>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{items.length} pago{items.length !== 1 ? "s" : ""}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: SHEET.rosaBorde }}>{fmt(totalMes)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EstadoMesTab({ catalog, movimientos, userEmail }) {
  const today = todayISO().slice(0, 7);
  const mesesDisponibles = useMemo(() => {
    const set = new Set(movimientos.map((m) => m.fecha.slice(0, 7)));
    set.add(today);
    return Array.from(set).sort().reverse();
  }, [movimientos, today]);
  const [mesFiltro, setMesFiltro] = useState(today);

  const movsMes = useMemo(() => movimientos.filter((m) => m.fecha.startsWith(mesFiltro)), [movimientos, mesFiltro]);

  // --- Ingresos ---
  const ingresosPorTipo = useMemo(() => {
    const map = {};
    movsMes.filter((m) => m.mov === "Ingreso").forEach((m) => {
      const t = m.ingresoTipo || m.tipo || "Otro(a)";
      map[t] = (map[t] || 0) + Number(m.cantidad);
    });
    return map;
  }, [movsMes]);
  const totalIngresos = Object.values(ingresosPorTipo).reduce((s, v) => s + v, 0);

  // Promedio ingresos histórico
  const promedioIngresosPorTipo = useMemo(() => {
    const map = {}; const meses = new Set();
    movimientos.filter((m) => m.mov === "Ingreso").forEach((m) => {
      const t = m.ingresoTipo || m.tipo || "Otro(a)";
      const mes = m.fecha.slice(0, 7);
      map[t] = (map[t] || {}); map[t][mes] = (map[t][mes] || 0) + Number(m.cantidad);
      meses.add(mes);
    });
    const n = meses.size || 1;
    const result = {};
    Object.keys(map).forEach((t) => { result[t] = Math.round((Object.values(map[t]).reduce((s, v) => s + v, 0) / n) * 100) / 100; });
    return result;
  }, [movimientos]);

  // --- Egresos por tipo ---
  const egresosPorTipo = useMemo(() => {
    const map = {};
    movsMes.filter((m) => m.mov === "Egreso").forEach((m) => {
      const t = m.tipo || "Otro(a)";
      map[t] = (map[t] || 0) + Number(m.cantidad);
    });
    return map;
  }, [movsMes]);

  // Promedios egresos histórico
  const promedioEgresosPorTipo = useMemo(() => {
    const map = {}; const meses = new Set();
    movimientos.filter((m) => m.mov === "Egreso").forEach((m) => {
      const t = m.tipo || "Otro(a)";
      const mes = m.fecha.slice(0, 7);
      if (!map[t]) map[t] = {}; map[t][mes] = (map[t][mes] || 0) + Number(m.cantidad);
      meses.add(mes);
    });
    const n = meses.size || 1;
    const result = {};
    Object.keys(map).forEach((t) => { result[t] = Math.round((Object.values(map[t]).reduce((s, v) => s + v, 0) / n) * 100) / 100; });
    return result;
  }, [movimientos]);

  // --- G. Variable por categoría ---
  const gastoVariableMes = useMemo(() => {
    const map = {};
    movsMes.filter((m) => m.mov === "Egreso" && m.tipo === "G. Variable").forEach((m) => { map[m.categoria] = (map[m.categoria] || 0) + Number(m.cantidad); });
    return map;
  }, [movsMes]);
  const presupuestoCats = (catalog.presupuestosMensuales || {})[mesFiltro]?.categorias || {};

  // --- Liquidez por método ---
  const liquidezPorMetodo = useMemo(() => {
    const metodos = ["Efectivo", "TDD", "TDC"];
    return metodos.map((met) => {
      const ingresos = movsMes.filter((m) => m.mov === "Ingreso" && m.metodo === met).reduce((s, m) => s + Number(m.cantidad), 0);
      // Para TDD: excluir Pago TDC (son abonos a tarjeta, se muestran aparte)
      const egresos = movsMes.filter((m) => m.mov === "Egreso" && m.metodo === met && !(met === "TDD" && m.tipo === "Pago TDC")).reduce((s, m) => s + Number(m.cantidad), 0);
      const pagoTDC = met === "TDD" ? movsMes.filter((m) => m.mov === "Egreso" && m.metodo === "TDD" && m.tipo === "Pago TDC").reduce((s, m) => s + Number(m.cantidad), 0) : 0;
      return { met, ingresos, egresos, pagoTDC, restante: ingresos - egresos - pagoTDC };
    });
  }, [movsMes]);

  // --- TDC del mes ---
  const nombresTDC = catalog.cuentas.TDC || [];
  const detallesTDC = catalog.tarjetasTDC || [];
  const tarjetas = nombresTDC.map((n) => { const d = detallesTDC.find((t) => t.nombre === n); return d && d.activa !== false ? { nombre: n, limite: 0, diaCiclo: 1, ...d } : null; }).filter(Boolean);
  const ciclosMes = (catalog.ciclosTDC || {})[mesFiltro] || {};

  function fechasCicloTDC(tdc) {
    const [y, m] = mesFiltro.split("-").map(Number);
    const finDate = new Date(y, m - 1, tdc.diaCiclo);
    const finCiclo = finDate.toISOString().slice(0, 10);
    const inicioDate = new Date(y, m - 2, tdc.diaCiclo + 1);
    const inicioCiclo = inicioDate.toISOString().slice(0, 10);
    const ciclo = ciclosMes[tdc.nombre] || {};
    let fechaPago = "";
    if (finCiclo && ciclo.diasPago > 0) { const d = new Date(finCiclo); d.setDate(d.getDate() + ciclo.diasPago); fechaPago = d.toISOString().slice(0, 10); }
    return { inicioCiclo, finCiclo, fechaPago };
  }

  function gastoCicloTDC(nombre, inicio, fin) {
    if (!inicio || !fin) return 0;
    return movimientos.filter((m) => m.mov === "Egreso" && m.cuenta === nombre && m.fecha >= inicio && m.fecha <= fin && m.tipo !== "Pago TDC").reduce((s, m) => s + Number(m.cantidad), 0);
  }

  function pagadoCicloTDC(nombre, fin, fechaPago) {
    if (!fin) return 0;
    const d = new Date(fin); d.setDate(d.getDate() + 1);
    const desde = d.toISOString().slice(0, 10);
    const hasta = fechaPago || "9999-12-31";
    return movimientos.filter((m) => m.mov === "Egreso" && m.tipo === "Pago TDC" &&
      (m.cuenta === nombre || m.categoria === nombre) &&
      m.fecha >= desde && m.fecha <= hasta).reduce((s, m) => s + Number(m.cantidad), 0);
  }

  function difPendienteTDC(nombre) {
    return (catalog.diferidos || []).filter((d) => d.activo && d.tarjeta === nombre).reduce((s, d) => {
      const base = d.conIntereses && d.capitalOriginal ? d.capitalOriginal : d.costoTotal;
      return s + Math.max(0, base - (d.pagado || 0));
    }, 0);
  }

  // --- Gastos fijos con estatus ---
  const gastosFijosEstatus = useMemo(() => {
    const items = [];
    const agregar = (lista, categoria) => (lista || []).filter((i) => i.activa !== false).forEach((i) => {
      const ultPago = ultimoPagoDeHistorial(movsMes, categoria, i.nombre);
      const gastado = movsMes.filter((m) => m.mov === "Egreso" && m.categoria === categoria && m.subcategoria === i.nombre).reduce((s, m) => s + Number(m.cantidad), 0);
      const pagado = gastado > 0;
      const toca = tocaEsteMe(ultimoPagoDeHistorial(movimientos, categoria, i.nombre), i.frecuencia || "Mensual", mesFiltro);
      if (toca || pagado) items.push({ nombre: i.nombre, costo: i.costo || 0, frecuencia: i.frecuencia || "Mensual", gastado, pagado, ultPago, metodo: i.metodo, categoria });
    });
    agregar(catalog.membresias, "Membresías");
    agregar(catalog.servicios, "Servicios");
    agregar(catalog.seguros, "Seguros");
    (catalog.diferidos || []).filter((d) => d.activo).forEach((d) => {
      const gastado = movsMes.filter((m) => m.lugar === `__diferido:${d.id}`).reduce((s, m) => s + Number(m.cantidad), 0);
      items.push({ nombre: d.nombre || d.categoria, costo: d.aportacion || 0, frecuencia: "Mensual", gastado, pagado: gastado > 0, ultPago: null, metodo: "TDC", categoria: "Diferido TDC" });
    });
    (catalog.prestamosBancarios || []).filter((p) => p.activa).forEach((p) => {
      const gastado = movsMes.filter((m) => m.mov === "Egreso" && m.tipo === "Préstamo" && m.subcategoria === p.nombre).reduce((s, m) => s + Number(m.cantidad), 0);
      const costoMensual = aportacionMensual(p.pagoPeriodo || 0, p.frecuencia);
      items.push({ nombre: p.nombre, costo: costoMensual, frecuencia: p.frecuencia || "Mensual", gastado, pagado: gastado >= costoMensual * 0.9, ultPago: null, metodo: p.metodo, categoria: "Préstamo" });
    });
    return items;
  }, [movsMes, catalog, mesFiltro, movimientos]);

  // --- Préstamos ---
  const prestamosBancarios = catalog.prestamosBancarios || [];
  const prestamosTerceros = catalog.prestamosTerceros || [];

  // --- Fijosc del mes ---
  const fijosMes = useMemo(() => calcFijosDelMes(catalog, movimientos, mesFiltro), [catalog, movimientos, mesFiltro]);
  const totalFijos = Object.values(fijosMes).reduce((s, v) => s + v, 0);
  const ingresoEsperado = (catalog.presupuestosMensuales || {})[mesFiltro]?.ingresoEsperado || 0;
  const totalVariablePresup = CAT_VARIABLES.reduce((s, cat) => s + (presupuestoCats[cat] || 0), 0);

  // Deuda TDC: para cada tarjeta, todos los egresos TDC de esa cuenta
  // que no han sido cubiertos por un Pago TDC. Esto incluye ajustes de cortes anteriores
  // que pueden tener fechas fuera del ciclo del mes actual.
  // Pagos TDC: compatibilidad hacia atrás (cuenta=tarjeta) y nuevo flujo (categoria=tarjeta)
  function esPagoParaTarjeta(m, tarjetaNombre) {
    return m.mov === "Egreso" && m.tipo === "Pago TDC" &&
      (m.cuenta === tarjetaNombre || m.categoria === tarjetaNombre);
  }
  function deudaRealTarjeta(tarjetaNombre) {
    const totalGasto = movimientos.filter(m => m.mov === "Egreso" && m.metodo === "TDC" && m.cuenta === tarjetaNombre && m.tipo !== "Pago TDC").reduce((s, m) => s + Number(m.cantidad), 0);
    const totalPagado = movimientos.filter(m => esPagoParaTarjeta(m, tarjetaNombre)).reduce((s, m) => s + Number(m.cantidad), 0);
    return Math.max(0, Math.round((totalGasto - totalPagado) * 100) / 100);
  }

  const deudaTDCTotal = tarjetas.reduce((s, t) => s + deudaRealTarjeta(t.nombre), 0);

  // --- Alerta Flujo de Efectivo ---
  const flujoMinimo = totalFijos;
  // Deuda TDC = saldo pendiente real por tarjeta (gastos históricos - pagos históricos)
  const deudaTDCMes = Math.round(tarjetas.reduce((s, t) => s + deudaRealTarjeta(t.nombre), 0) * 100) / 100;
  const aportacionPrestamos = (catalog.prestamosBancarios || []).filter(p => p.activa).reduce((s, p) => s + aportacionMensual(p.pagoPeriodo || 0, p.frecuencia), 0);
  const aportacionAhorro = (catalog.ahorros || []).filter(a => a.activa).reduce((s, a) => s + aportacionMensual(a.aportacion || 0, a.frecuencia), 0);
  const aportacionInversion = (catalog.inversiones || []).filter(i => i.activa).reduce((s, i) => s + aportacionMensual(i.aportacion || 0, i.frecuencia), 0);
  const aportacionFamilia = (catalog.familiares || []).filter(f => f.activa).reduce((s, f) => s + aportacionMensual(f.aportacion || 0, f.frecuencia), 0);

  // Restante este mes = aportación del mes - lo ya pagado este mes (no el total de la vida)
  const pagadoPrestaMes = movsMes.filter(m => m.mov === "Egreso" && m.tipo === "Préstamo").reduce((s, m) => s + Number(m.cantidad), 0);
  const pagadoAhorroMes = movsMes.filter(m => m.mov === "Egreso" && m.tipo === "Ahorro").reduce((s, m) => s + Number(m.cantidad), 0);
  const pagadoInversionMes = movsMes.filter(m => m.mov === "Egreso" && m.tipo === "Inversión").reduce((s, m) => s + Number(m.cantidad), 0);
  const pagadoFamiliaMes = movsMes.filter(m => m.mov === "Egreso" && (m.tipo === "Familia (Aportación)" || m.categoria === "Familia")).reduce((s, m) => s + Number(m.cantidad), 0);
  const pagadoFijosMes = movsMes.filter(m => m.mov === "Egreso" && m.tipo === "G. Fijo").reduce((s, m) => s + Number(m.cantidad), 0);
  // Pagos a TDC realizados este mes (abonos a tarjeta)
  const pagadoTDCMes = movsMes.filter(m => m.mov === "Egreso" && m.tipo === "Pago TDC").reduce((s, m) => s + Number(m.cantidad), 0);

  const restantePrestaMes = Math.max(0, aportacionPrestamos - pagadoPrestaMes);
  const restanteAhorroMes = Math.max(0, aportacionAhorro - pagadoAhorroMes);
  const restanteInversionMes = Math.max(0, aportacionInversion - pagadoInversionMes);
  const restanteFamiliaMes = Math.max(0, aportacionFamilia - pagadoFamiliaMes);
  const restanteFijosMes = Math.max(0, flujoMinimo - pagadoFijosMes);
  // Deuda TDC restante = total deuda real - lo que ya abonaste este mes
  const restanteTDCMes = Math.max(0, deudaTDCMes - pagadoTDCMes);

  // Promedio histórico mensual de pago TDC
  const promedioTDCMensual = useMemo(() => {
    const meses = new Set(movimientos.filter(m => m.mov === "Egreso" && m.tipo === "Pago TDC").map(m => m.fecha.slice(0, 7)));
    const total = movimientos.filter(m => m.mov === "Egreso" && m.tipo === "Pago TDC").reduce((s, m) => s + Number(m.cantidad), 0);
    return meses.size > 0 ? Math.round((total / meses.size) * 100) / 100 : 0;
  }, [movimientos]);

  // --- Liquidez por método ---
  // Liquidez Inmediata = solo Efectivo y TDD (dinero real disponible en cash/débito)
  const liquidezDetalle = useMemo(() => {
    const metodos = ["Efectivo", "TDD"];
    return metodos.map((met) => {
      const ingMes = movsMes.filter((m) => m.mov === "Ingreso" && m.metodo === met).reduce((s, m) => s + Number(m.cantidad), 0);
      // Excluir Pagos TDC del egreso de TDD (son abonos a tarjeta, se muestran en Tarjetas)
      const egMes = movsMes.filter((m) => m.mov === "Egreso" && m.metodo === met && m.tipo !== "Pago TDC").reduce((s, m) => s + Number(m.cantidad), 0);
      return { met, ingMes: Math.round(ingMes * 100) / 100, egMes: Math.round(egMes * 100) / 100, restante: Math.round((ingMes - egMes) * 100) / 100 };
    });
  }, [movsMes]);

  const totLiquidez = liquidezDetalle.reduce((acc, l) => ({
    ing: acc.ing + l.ingMes, eg: acc.eg + l.egMes, rest: acc.rest + l.restante
  }), { ing: 0, eg: 0, rest: 0 });

  // --- Movimientos por origen/destino (con desglose TDC) ---
  const movsPorMetodoIng = useMemo(() => {
    const map = {};
    movsMes.filter(m => m.mov === "Ingreso").forEach(m => {
      const key = m.metodo === "TDC" ? `TDC (${m.tipo || "Gasto"})` : m.metodo;
      map[key] = (map[key] || 0) + Number(m.cantidad);
    });
    return map;
  }, [movsMes]);

  const movsPorMetodoEg = useMemo(() => {
    const map = {};
    movsMes.filter(m => m.mov === "Egreso").forEach(m => {
      let key = m.metodo;
      if (m.tipo === "Pago TDC") key = "Pago TDC";
      else if (m.metodo === "TDC") key = "TDC (Gasto)";
      map[key] = (map[key] || 0) + Number(m.cantidad);
    });
    return map;
  }, [movsMes]);

  const promedioIngMetodo = useMemo(() => {
    const map = {}; const mesesSet = new Set();
    movimientos.filter(m => m.mov === "Ingreso").forEach(m => {
      const key = m.metodo === "TDC" ? `TDC (${m.tipo || "Gasto"})` : m.metodo;
      map[key] = (map[key] || 0) + Number(m.cantidad);
      mesesSet.add(m.fecha.slice(0, 7));
    });
    const n = mesesSet.size || 1;
    Object.keys(map).forEach(k => { map[k] = Math.round((map[k] / n) * 100) / 100; });
    return map;
  }, [movimientos]);

  const promedioEgMetodo = useMemo(() => {
    const map = {}; const mesesSet = new Set();
    movimientos.filter(m => m.mov === "Egreso").forEach(m => {
      let key = m.metodo;
      if (m.metodo === "TDC") key = m.tipo === "Pago TDC" ? "TDC (Pago TDC)" : "TDC (Gasto)";
      map[key] = (map[key] || 0) + Number(m.cantidad);
      mesesSet.add(m.fecha.slice(0, 7));
    });
    const n = mesesSet.size || 1;
    Object.keys(map).forEach(k => { map[k] = Math.round((map[k] / n) * 100) / 100; });
    return map;
  }, [movimientos]);

  // Margen de liquidez
  const totalPresupuestado = totalFijos + totalVariablePresup;
  const saldoActualTotal = Math.round(totLiquidez.rest * 100) / 100;
  // Pendiente presupuesto = lo que falta gastar según presupuesto este mes
  const pendientePresupuesto = Math.round((totalPresupuestado - (Object.values(egresosPorTipo).reduce((s,v)=>s+v,0))) * 100) / 100;
  // Pendiente alerta = deuda TDC restante + prestamos restantes este mes
  const pendienteAlerta = Math.round((deudaTDCMes + restantePrestaMes) * 100) / 100;
  // Diferencia = saldo actual - lo que aún falta pagar
  const margenPresupuesto = Math.round((saldoActualTotal - Math.max(0, pendientePresupuesto)) * 100) / 100;
  const margenAlerta = Math.round((saldoActualTotal - pendienteAlerta) * 100) / 100;

  const seccionStyle = { marginBottom: 18 };
  const tituloStyle = { fontSize: 13, fontWeight: 700, fontStyle: "italic", borderBottom: `2px solid ${SHEET.rosaBorde}`, paddingBottom: 4, marginBottom: 8 };
  const thStyle = { fontSize: 10, fontWeight: 700, color: "#555", textAlign: "right", padding: "2px 6px", background: SHEET.gris };
  const tdStyle = { fontSize: 11, textAlign: "right", padding: "3px 6px", borderBottom: "1px solid " + SHEET.grisBorde };
  const tdLabelStyle = { fontSize: 11, padding: "3px 6px", borderBottom: "1px solid " + SHEET.grisBorde };

  function exportarPDF() {
    // TDC tabla
    const tdcFilas = tarjetas.map((t) => {
      const { inicioCiclo, finCiclo, fechaPago } = fechasCicloTDC(t);
      const gasto = Math.round(gastoCicloTDC(t.nombre, inicioCiclo, finCiclo) * 100) / 100;
      const pagado = Math.round(pagadoCicloTDC(t.nombre, finCiclo, fechaPago) * 100) / 100;
      const restante = Math.max(0, gasto - pagado);
      const difPend = Math.round(difPendienteTDC(t.nombre) * 100) / 100;
      const disponible = Math.max(0, (t.limite || 0) - difPend - restante);
      return `<tr><td>${t.nombre}</td><td>${inicioCiclo||"—"}</td><td>${finCiclo||"—"}</td><td>${fechaPago||"—"}</td>
        <td class="num">${fmt(gasto)}</td><td class="num">${fmt(pagado)}</td>
        <td class="num" style="color:${restante>0?"#c62828":"#2e7d32"}">${fmt(restante)}</td>
        <td class="num" style="color:${disponible<=0?"#c62828":"#2e7d32"}">${fmt(disponible)}</td></tr>`;
    }).join("");

    // Gastos fijos tabla
    const fijosFilas = gastosFijosEstatus.map((g) => `<tr>
      <td>${g.nombre}</td><td>${g.categoria}</td><td class="num">${fmt(g.costo)}</td><td>${g.frecuencia}</td>
      <td class="num">${g.gastado > 0 ? fmt(g.gastado) : "—"}</td>
      <td style="color:${g.pagado?"#2e7d32":"#c62828"};font-weight:700">${g.pagado?"✓ Pagado":"⏳ Pendiente"}</td>
      <td>${g.metodo||""}</td></tr>`).join("");

    // Ingresos
    const ingTipos = ["Sueldo", "Comisión", "Préstamo", "Reembolso", "Otro(a)"];
    const ingFilas = ingTipos.map((t) => `<tr><td>${t}</td>
      <td class="num">${promedioIngresosPorTipo[t] ? fmt(promedioIngresosPorTipo[t]) : "—"}</td>
      <td class="num" style="font-weight:700">${ingresosPorTipo[t] ? fmt(ingresosPorTipo[t]) : "—"}</td></tr>`).join("");
    const ingTotal = `<tr class="total"><td>Total</td><td class="num">${fmt(Object.values(promedioIngresosPorTipo).reduce((s,v)=>s+v,0))}</td><td class="num">${fmt(totalIngresos)}</td></tr>`;

    // Egresos
    const egTipos = ["G. Fijo", "G. Variable", "Préstamo", "Inversión", "Ahorro", "Pago TDC", "Otro(a)"];
    const egFilas = egTipos.map((t) => {
      const presup = t === "G. Fijo" ? totalFijos : t === "G. Variable" ? totalVariablePresup : 0;
      return `<tr><td>${t}</td>
        <td class="num">${presup > 0 ? fmt(presup) : "—"}</td>
        <td class="num">${promedioEgresosPorTipo[t] ? fmt(promedioEgresosPorTipo[t]) : "—"}</td>
        <td class="num" style="font-weight:700">${egresosPorTipo[t] ? fmt(egresosPorTipo[t]) : "—"}</td></tr>`;
    }).join("");
    const totalEgresos = Object.values(egresosPorTipo).reduce((s,v)=>s+v,0);
    const egTotal = `<tr class="total"><td>Total</td><td></td><td class="num">${fmt(Object.values(promedioEgresosPorTipo).reduce((s,v)=>s+v,0))}</td><td class="num">${fmt(totalEgresos)}</td></tr>`;

    // G. Variable por categoría
    const catFilas = CAT_VARIABLES.map((cat) => {
      const presup = presupuestoCats[cat] || 0;
      const usado = gastoVariableMes[cat] || 0;
      if (presup === 0 && usado === 0) return "";
      const dif = presup - usado;
      return `<tr><td>${cat}</td><td class="num">${presup>0?fmt(presup):"—"}</td>
        <td class="num" style="color:${dif<0?"#c62828":"#2e7d32"}">${fmt(dif)}</td>
        <td class="num" style="font-weight:700">${fmt(usado)}</td></tr>`;
    }).filter(Boolean).join("");

    // Préstamos
    const prestFilas = [
      ...prestamosBancarios.filter(p=>p.activa).map(p=>`<tr><td>${p.nombre}</td><td>Bancario/Crédito</td>
        <td class="num">${fmt(Math.max(0,(p.totalAPagar||0)-(p.acumulado||0)))}</td>
        <td class="num">${fmt(p.pagoPeriodo||0)}</td>
        <td class="num">${fmt(egresosPorTipo["Préstamo"]||0)}</td></tr>`),
      ...prestamosTerceros.filter(p=>p.direccion==="de Tercero").map(p=>`<tr><td>${p.nombre}</td><td>Tercero</td>
        <td class="num">—</td><td class="num">—</td><td class="num">—</td></tr>`)
    ].join("");

    // Liquidez
    const liqFilas = liquidezPorMetodo.map(l=>`<tr><td>${l.met}</td>
      <td class="num">${fmt(l.ingresos)}</td><td class="num">${fmt(l.egresos)}</td>
      <td class="num" style="color:${l.restante<0?"#c62828":"#2e7d32"};font-weight:700">${fmt(l.restante)}</td></tr>`).join("");
    const totLiq = liquidezPorMetodo.reduce((acc,l)=>({ing:acc.ing+l.ingresos,eg:acc.eg+l.egresos,rest:acc.rest+l.restante}),{ing:0,eg:0,rest:0});

    const balance = totalIngresos - totalEgresos;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Estado ${mesLabel(mesFiltro)}</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:Calibri,Arial,sans-serif;padding:20px;font-size:10px;color:#222}
      h1{font-size:18px;margin:0 0 2px;font-style:italic}
      p.sub{font-size:10px;color:#777;margin:0 0 14px}
      h2{font-size:11px;font-weight:700;font-style:italic;border-bottom:2px solid #c0392b;padding-bottom:2px;margin:14px 0 5px;color:#c0392b}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:9px}
      th{background:#F4CCCC;font-weight:700;padding:3px 5px;text-align:left;border:1px solid #ddd}
      th.num{text-align:right}
      td{padding:2px 5px;border-bottom:1px solid #eee}
      td.num{text-align:right}
      tr.total td{font-weight:700;background:#FFF2CC;border-top:1px solid #ccc}
      .badge-ok{color:#2e7d32;font-weight:700}
      .badge-err{color:#c62828;font-weight:700}
      .resumen-box{background:#FFF9C4;border:1px solid #e6d200;border-radius:4px;padding:8px 10px;margin-bottom:10px;font-size:9px}
      .resumen-row{display:flex;justify-content:space-between;margin-bottom:3px}
      .balance{font-size:13px;font-weight:700;text-align:center;padding:8px;border-radius:4px;margin-bottom:14px}
      @media print{body{padding:8px}}
    </style></head>
    <body>
    <h1>Estado del Mes — ${mesLabel(mesFiltro)}</h1>
    <p class="sub">Usuario: ${userEmail||""} · Generado el ${fmtDate(todayISO())}</p>

    <div class="balance" style="background:${balance>=0?"#E8F5E9":"#FFEBEE"};color:${balance>=0?"#2e7d32":"#c62828"}">
      Balance del mes: ${fmt(Math.abs(balance))} ${balance>=0?"✓ superávit":"✕ déficit"}
    </div>

    <div class="grid">
      <div>
        <h2>Tarjetas de Crédito</h2>
        <table><thead><tr><th>Tarjeta</th><th>Inicio</th><th>Corte</th><th>F.Pago</th>
          <th class="num">Gasto</th><th class="num">Pagado</th><th class="num">Restante</th><th class="num">Disponible</th>
        </tr></thead><tbody>${tdcFilas||"<tr><td colspan='8'>Sin tarjetas configuradas</td></tr>"}</tbody></table>

        <h2>Gastos Fijos del Mes</h2>
        <table><thead><tr><th>Concepto</th><th>Categoría</th><th class="num">Costo</th><th>Frec.</th>
          <th class="num">Gastado</th><th>Estatus</th><th>Método</th>
        </tr></thead><tbody>${fijosFilas||"<tr><td colspan='7'>Sin gastos fijos</td></tr>"}</tbody></table>

        <h2>Préstamos</h2>
        <table><thead><tr><th>Nombre</th><th>Tipo</th><th class="num">Pendiente</th><th class="num">Aportación</th><th class="num">Pagado mes</th>
        </tr></thead><tbody>${prestFilas||"<tr><td colspan='5'>Sin préstamos activos</td></tr>"}</tbody></table>
      </div>

      <div>
        <h2>Resumen Presupuesto</h2>
        <div class="resumen-box">
          <div class="resumen-row"><span>Ingreso esperado</span><b>${fmt(ingresoEsperado)}</b></div>
          <div class="resumen-row"><span>Comprometido (fijo)</span><b>− ${fmt(totalFijos)}</b></div>
          <div class="resumen-row"><span>Variable presupuestado</span><b>− ${fmt(totalVariablePresup)}</b></div>
          <div class="resumen-row" style="border-top:1px solid #ccc;padding-top:4px;margin-top:4px">
            <b>Disponible estimado</b>
            <b style="color:${(ingresoEsperado-totalFijos-totalVariablePresup)>=0?"#2e7d32":"#c62828"}">${fmt(ingresoEsperado-totalFijos-totalVariablePresup)}</b>
          </div>
        </div>

        <h2>Liquidez por Método</h2>
        <table><thead><tr><th>Método</th><th class="num">Ingresos</th><th class="num">Egresos</th><th class="num">Restante</th>
        </tr></thead><tbody>${liqFilas}
        <tr class="total"><td>Total</td><td class="num">${fmt(totLiq.ing)}</td><td class="num">${fmt(totLiq.eg)}</td>
          <td class="num" style="color:${totLiq.rest>=0?"#2e7d32":"#c62828"}">${fmt(totLiq.rest)}</td></tr>
        </tbody></table>

        <h2>Ingresos</h2>
        <table><thead><tr><th>Tipo</th><th class="num">Promedio</th><th class="num">Este mes</th>
        </tr></thead><tbody>${ingFilas}${ingTotal}</tbody></table>

        <h2>Egresos</h2>
        <table><thead><tr><th>Tipo</th><th class="num">Presup.</th><th class="num">Promedio</th><th class="num">Este mes</th>
        </tr></thead><tbody>${egFilas}${egTotal}</tbody></table>

        <h2>Gasto Variable por Categoría</h2>
        <table><thead><tr><th>Categoría</th><th class="num">Presup.</th><th class="num">Disponible</th><th class="num">Utilizado</th>
        </tr></thead><tbody>${catFilas||"<tr><td colspan='4'>Sin presupuesto configurado</td></tr>"}</tbody></table>
      </div>
    </div>
    <script>window.onload=()=>{window.print();}</script>
    </body></html>`;
    const v = window.open("","_blank"); if(v){v.document.write(html);v.document.close();}
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
        <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} style={{ ...inputBase, background: SHEET.azul, flex: 1 }}>
          {mesesDisponibles.map((m) => <option key={m} value={m}>{mesLabel(m)}</option>)}
        </select>
        <button onClick={exportarPDF} style={{
          padding: "9px 14px", fontSize: 12, fontWeight: 700, fontStyle: "italic", whiteSpace: "nowrap",
          border: `1px solid ${SHEET.rosaBorde}`, borderRadius: 3, background: SHEET.rosa, cursor: "pointer", fontFamily: SHEET.fuente
        }}>📄 PDF</button>
      </div>

      {/* Balance banner */}
      {(() => {
        const balance = totalIngresos - Object.values(egresosPorTipo).reduce((s,v)=>s+v,0);
        return (
          <div style={{ background: balance >= 0 ? SHEET.verde : SHEET.rosa, border: `1px solid ${balance >= 0 ? SHEET.verdeBorde : SHEET.rosaBorde}`, borderRadius: 4, padding: "10px 14px", marginBottom: 14, textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: balance >= 0 ? SHEET.verdeBorde : SHEET.rosaBorde }}>
              Balance {mesLabel(mesFiltro)}: {fmt(Math.abs(balance))} {balance >= 0 ? "✓ superávit" : "✕ déficit"}
            </p>
            <p style={{ fontSize: 11, color: "#555", margin: "3px 0 0" }}>
              Ingresos {fmt(totalIngresos)} − Egresos {fmt(Object.values(egresosPorTipo).reduce((s,v)=>s+v,0))}
            </p>
          </div>
        );
      })()}

      <div style={seccionStyle}>
        <p style={tituloStyle}>Liquidez Inmediata</p>
        <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr", background: SHEET.gris, padding: "4px 8px", borderBottom: "1px solid " + SHEET.grisBorde, gap: 4 }}>
            {["Método", "Ingreso", "Egreso", "Restante"].map((h, i) => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#555", textAlign: i === 0 ? "left" : "right" }}>{h}</span>
            ))}
          </div>
          {liquidezDetalle.map((l) => (
            <div key={l.met} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr", padding: "5px 8px", borderBottom: "1px solid " + SHEET.grisBorde, gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{l.met}</span>
              <span style={{ fontSize: 11, textAlign: "right", color: SHEET.verdeBorde }}>{l.ingMes > 0 ? fmt(l.ingMes) : "—"}</span>
              <span style={{ fontSize: 11, textAlign: "right", color: SHEET.rosaBorde }}>{l.egMes > 0 ? fmt(l.egMes) : "—"}</span>
              <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700, color: l.restante < 0 ? SHEET.rosaBorde : SHEET.verdeBorde }}>{fmt(l.restante)}</span>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr", padding: "5px 8px", background: SHEET.gris, gap: 4, borderTop: "1px solid " + SHEET.grisBorde }}>
            <span style={{ fontSize: 11, fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700, color: SHEET.verdeBorde }}>{fmt(totLiquidez.ing)}</span>
            <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700, color: SHEET.rosaBorde }}>{fmt(totLiquidez.eg)}</span>
            <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700, color: totLiquidez.rest < 0 ? SHEET.rosaBorde : SHEET.verdeBorde }}>{fmt(totLiquidez.rest)}</span>
          </div>
        </div>
      </div>

      {/* Alerta Flujo de Efectivo */}
      <div style={seccionStyle}>
        <p style={tituloStyle}>Alerta (Flujo de Efectivo)</p>
        <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", background: SHEET.gris, padding: "4px 8px", borderBottom: "1px solid " + SHEET.grisBorde }}>
            {["Concepto", "Promedio", "Este mes", "Restante"].map((h, i) => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#555", textAlign: i === 0 ? "left" : "right" }}>{h}</span>
            ))}
          </div>
          {[
            { label: "Flujo Mínimo", prom: totalFijos, mes: flujoMinimo, rest: restanteFijosMes },
            { label: "Deuda TDC", prom: promedioTDCMensual, mes: deudaTDCMes, rest: restanteTDCMes },
            { label: "Familia", prom: aportacionFamilia, mes: aportacionFamilia, rest: restanteFamiliaMes },
            { label: "Préstamos", prom: aportacionPrestamos, mes: aportacionPrestamos, rest: restantePrestaMes },
            { label: "Ahorro", prom: aportacionAhorro, mes: aportacionAhorro, rest: restanteAhorroMes },
            { label: "Inversión", prom: aportacionInversion, mes: aportacionInversion, rest: restanteInversionMes },
          ].map((row) => (
            <div key={row.label} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", padding: "5px 8px", borderBottom: "1px solid " + SHEET.grisBorde }}>
              <span style={{ fontSize: 11 }}>{row.label}</span>
              <span style={{ fontSize: 11, textAlign: "right", color: "#aaa", display: "block", minWidth: 0 }}>{row.prom > 0 ? fmt(row.prom) : "—"}</span>
              <span style={{ fontSize: 11, textAlign: "right", display: "block", minWidth: 0 }}>{row.mes > 0 ? fmt(row.mes) : "—"}</span>
              <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700, display: "block", minWidth: 0, color: row.rest > 0 ? SHEET.rosaBorde : SHEET.verdeBorde }}>{row.rest > 0 ? fmt(row.rest) : "—"}</span>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", padding: "5px 8px", background: SHEET.gris, borderTop: "1px solid " + SHEET.grisBorde }}>
            <span style={{ fontSize: 11, fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700, color: "#aaa" }}>{fmt(totalFijos + promedioTDCMensual + aportacionFamilia + aportacionPrestamos + aportacionAhorro + aportacionInversion)}</span>
            <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700 }}>{fmt(flujoMinimo + deudaTDCMes + aportacionFamilia + aportacionPrestamos + aportacionAhorro + aportacionInversion)}</span>
            <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700, color: SHEET.rosaBorde }}>{fmt(restanteFijosMes + restanteTDCMes + restanteFamiliaMes + restantePrestaMes + restanteAhorroMes + restanteInversionMes)}</span>
          </div>
        </div>
      </div>

      {/* Margen de Liquidez */}
      <div style={seccionStyle}>
        <p style={tituloStyle}>Margen de Liquidez</p>
        <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", background: SHEET.gris, padding: "4px 8px", borderBottom: "1px solid " + SHEET.grisBorde }}>
            {["", "Pendiente", "Actual", "Diferencia"].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: "#555", textAlign: i === 0 ? "left" : "right" }}>{h}</span>
            ))}
          </div>
          {[
            { label: "Presupuesto", pendiente: Math.max(0, pendientePresupuesto), actual: totalPresupuestado, dif: margenPresupuesto },
            { label: "Alerta Flujo", pendiente: pendienteAlerta, actual: totalPresupuestado, dif: margenAlerta },
          ].map((row) => (
            <div key={row.label} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", padding: "6px 8px", borderBottom: "1px solid " + SHEET.grisBorde }}>
              <span style={{ fontSize: 11 }}>{row.label}</span>
              <span style={{ fontSize: 11, textAlign: "right", color: row.pendiente > 0 ? SHEET.rosaBorde : SHEET.verdeBorde }}>{fmt(row.pendiente)}</span>
              <span style={{ fontSize: 11, textAlign: "right" }}>{fmt(row.actual)}</span>
              <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700, color: row.dif >= 0 ? SHEET.verdeBorde : SHEET.rosaBorde }}>{fmt(row.dif)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Movimientos por origen/destino */}
      <div style={seccionStyle}>
        <p style={tituloStyle}>Movimientos (origen/destino)</p>
        <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ background: SHEET.verde, padding: "5px 8px", borderBottom: "1px solid " + SHEET.grisBorde, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: SHEET.verdeBorde }}>Ingresos</span>
            <span style={{ fontSize: 10, color: "#aaa" }}>Promedio / Actual</span>
          </div>
          {Object.keys({ ...promedioIngMetodo, ...movsPorMetodoIng }).sort().map((met) => (
            <div key={met} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", padding: "5px 8px", borderBottom: "1px solid " + SHEET.grisBorde }}>
              <span style={{ fontSize: 11 }}>{met}</span>
              <span style={{ fontSize: 11, textAlign: "right", color: "#aaa", display: "block", minWidth: 0 }}>{promedioIngMetodo[met] ? fmt(promedioIngMetodo[met]) : "—"}</span>
              <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700, color: SHEET.verdeBorde }}>{movsPorMetodoIng[met] ? fmt(movsPorMetodoIng[met]) : "—"}</span>
            </div>
          ))}
          <div style={{ background: SHEET.rosa, padding: "5px 8px", borderBottom: "1px solid " + SHEET.grisBorde, borderTop: "1px solid " + SHEET.grisBorde, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: SHEET.rosaBorde }}>Egresos</span>
            <span style={{ fontSize: 10, color: "#aaa" }}>Promedio / Actual</span>
          </div>
          {Object.keys({ ...promedioEgMetodo, ...movsPorMetodoEg }).sort().map((met) => (
            <div key={met} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", padding: "5px 8px", borderBottom: "1px solid " + SHEET.grisBorde }}>
              <span style={{ fontSize: 11 }}>{met}</span>
              <span style={{ fontSize: 11, textAlign: "right", color: "#aaa", display: "block", minWidth: 0 }}>{promedioEgMetodo[met] ? fmt(promedioEgMetodo[met]) : "—"}</span>
              <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700, color: SHEET.rosaBorde }}>{movsPorMetodoEg[met] ? fmt(movsPorMetodoEg[met]) : "—"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* TDC */}
      <div style={seccionStyle}>
        <p style={tituloStyle}>Tarjetas de Crédito</p>
        {tarjetas.length === 0 ? <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin tarjetas configuradas.</p> : (
          <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 68px 68px 72px 78px", background: SHEET.gris, padding: "4px 8px", borderBottom: "1px solid " + SHEET.grisBorde, gap: 3 }}>
              {["Tarjeta", "Gasto", "Pagado", "Restante", "Disponible"].map((h, i) => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#555", textAlign: i === 0 ? "left" : "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h}</span>
              ))}
            </div>
            {tarjetas.map((t) => {
              const deudaReal = deudaRealTarjeta(t.nombre);
              const difPend = Math.round(difPendienteTDC(t.nombre) * 100) / 100;
              const disponible = Math.max(0, (t.limite || 0) - difPend - deudaReal);
              const { inicioCiclo, finCiclo } = fechasCicloTDC(t);
              // Gasto = todos los cargos TDC de esta tarjeta en el historial completo
              const gastoTotal = Math.round(movimientos.filter(m => m.mov === "Egreso" && m.metodo === "TDC" && m.cuenta === t.nombre && m.tipo !== "Pago TDC").reduce((s, m) => s + Number(m.cantidad), 0) * 100) / 100;
              // Pagado = todos los pagos a esta tarjeta (adelantos + post-corte, flujo viejo y nuevo)
              const pagadoTotal = Math.round(movimientos.filter(m => esPagoParaTarjeta(m, t.nombre)).reduce((s, m) => s + Number(m.cantidad), 0) * 100) / 100;
              return (
                <div key={t.nombre} style={{ display: "grid", gridTemplateColumns: "1fr 68px 68px 72px 78px", padding: "8px 8px", borderBottom: "1px solid " + SHEET.grisBorde, gap: 3, alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{t.nombre}</span>
                    <p style={{ fontSize: 10, color: "#aaa", margin: "1px 0 0" }}>{inicioCiclo ? inicioCiclo.slice(5) : "—"} → {finCiclo ? finCiclo.slice(5) : "—"}</p>
                  </div>
                  <span style={{ fontSize: 11, textAlign: "right" }}>{gastoTotal > 0 ? fmt(gastoTotal) : "—"}</span>
                  <span style={{ fontSize: 11, textAlign: "right", color: SHEET.verdeBorde }}>{pagadoTotal > 0 ? fmt(pagadoTotal) : "—"}</span>
                  <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700, color: deudaReal > 0 ? SHEET.rosaBorde : SHEET.verdeBorde }}>{deudaReal > 0 ? fmt(deudaReal) : "$0.00"}</span>
                  <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700, color: disponible <= 0 ? SHEET.rosaBorde : SHEET.verdeBorde }}>{fmt(disponible)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ingresos y Egresos en grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
        {/* Ingresos */}
        <div>
          <p style={tituloStyle}>Ingresos</p>
          <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
            {["Sueldo","Comisión","Préstamo","Reembolso","Otro(a)"].map((t) => (ingresosPorTipo[t] || promedioIngresosPorTipo[t]) ? (
              <div key={t} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", padding: "5px 8px", borderBottom: "1px solid " + SHEET.grisBorde, gap: 4 }}>
                <span style={{ color: "#555", fontSize: 11 }}>{t}</span>
                <span style={{ fontSize: 11, textAlign: "right", color: "#aaa" }}>{promedioIngresosPorTipo[t] ? fmt(promedioIngresosPorTipo[t]) : "—"}</span>
                <b style={{ fontSize: 11, textAlign: "right", color: SHEET.verdeBorde }}>{ingresosPorTipo[t] ? fmt(ingresosPorTipo[t]) : "—"}</b>
              </div>
            ) : null)}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 8px", background: SHEET.gris, fontSize: 11, fontWeight: 700 }}>
              <span>Total</span><span style={{ color: SHEET.verdeBorde }}>{fmt(totalIngresos)}</span>
            </div>
          </div>
        </div>

        {/* Egresos */}
        <div>
          <p style={tituloStyle}>Egresos por Tipo</p>
          <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
            {["G. Fijo","G. Variable","Préstamo","Inversión","Ahorro","Pago TDC","Otro(a)"].map((t) => (egresosPorTipo[t] || promedioEgresosPorTipo[t]) ? (
              <div key={t} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", padding: "5px 8px", borderBottom: "1px solid " + SHEET.grisBorde, gap: 4 }}>
                <span style={{ color: "#555", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t}</span>
                <span style={{ fontSize: 11, textAlign: "right", color: "#aaa", display: "block", minWidth: 0 }}>{promedioEgresosPorTipo[t] ? fmt(promedioEgresosPorTipo[t]) : "—"}</span>
                <b style={{ fontSize: 11, textAlign: "right", color: SHEET.rosaBorde, display: "block", minWidth: 0 }}>{egresosPorTipo[t] ? fmt(egresosPorTipo[t]) : "—"}</b>
              </div>
            ) : null)}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 8px", background: SHEET.gris, fontSize: 11, fontWeight: 700 }}>
              <span>Total</span><span style={{ color: SHEET.rosaBorde }}>{fmt(Object.values(egresosPorTipo).reduce((s,v)=>s+v,0))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gastos fijos */}
      <div style={seccionStyle}>
        <p style={tituloStyle}>Gastos Fijos del Mes</p>
        {gastosFijosEstatus.length === 0 ? <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin gastos fijos este mes.</p> : (
          <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 55px 70px 75px", background: SHEET.gris, padding: "4px 8px", borderBottom: "1px solid " + SHEET.grisBorde }}>
              {["Concepto", "Costo", "Frec.", "Gastado", "Restante"].map((h, i) => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#555", textAlign: i === 0 ? "left" : "right" }}>{h}</span>
              ))}
            </div>
            {gastosFijosEstatus.map((g, i) => {
              const restante = Math.max(0, g.costo - g.gastado);
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px 55px 70px 75px", padding: "5px 8px", borderBottom: "1px solid " + SHEET.grisBorde, background: i % 2 === 0 ? "#fff" : SHEET.gris, alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>{g.nombre}</p>
                    <p style={{ fontSize: 10, color: "#aaa", margin: "1px 0 0" }}>{g.categoria}</p>
                  </div>
                  <span style={{ fontSize: 11, textAlign: "right" }}>{fmt(g.costo)}</span>
                  <span style={{ fontSize: 10, textAlign: "right", color: "#777" }}>{g.frecuencia}</span>
                  <span style={{ fontSize: 11, textAlign: "right", color: g.gastado > 0 ? "#333" : "#ccc" }}>{g.gastado > 0 ? fmt(g.gastado) : "—"}</span>
                  <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700, color: restante > 0 ? SHEET.rosaBorde : SHEET.verdeBorde }}>{restante > 0 ? fmt(restante) : "✓"}</span>
                </div>
              );
            })}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 55px 70px 75px", padding: "5px 8px", background: SHEET.gris, borderTop: "1px solid " + SHEET.grisBorde }}>
              <span style={{ fontSize: 11, fontWeight: 700 }}>Total</span>
              <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700 }}>{fmt(gastosFijosEstatus.reduce((s, g) => s + g.costo, 0))}</span>
              <span></span>
              <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700 }}>{fmt(gastosFijosEstatus.reduce((s, g) => s + g.gastado, 0))}</span>
              <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700, color: SHEET.rosaBorde }}>{fmt(gastosFijosEstatus.reduce((s, g) => s + Math.max(0, g.costo - g.gastado), 0))}</span>
            </div>
          </div>
        )}
      </div>

      {/* G. Variable */}
      <div style={seccionStyle}>
        <p style={tituloStyle}>Gasto Variable por Categoría</p>
        {CAT_VARIABLES.every((c) => !(presupuestoCats[c] || gastoVariableMes[c])) ? (
          <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin presupuesto ni gastos variables. Configúralo en Datos → Presupuesto.</p>
        ) : (
          <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", background: SHEET.gris, padding: "4px 8px", borderBottom: "1px solid " + SHEET.grisBorde }}>
              {["Categoría", "Presup.", "Disponible", "Utilizado"].map((h, i) => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#555", textAlign: i === 0 ? "left" : "right", display: "block", minWidth: 0 }}>{h}</span>
              ))}
            </div>
            {CAT_VARIABLES.map((cat) => {
              const presup = presupuestoCats[cat] || 0;
              const usado = gastoVariableMes[cat] || 0;
              if (presup === 0 && usado === 0) return null;
              const dif = presup - usado;
              return (
                <div key={cat} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", padding: "5px 8px", borderBottom: "1px solid " + SHEET.grisBorde }}>
                  <span style={{ fontSize: 11 }}>{cat}</span>
                  <span style={{ fontSize: 11, textAlign: "right", color: "#555", display: "block", minWidth: 0 }}>{presup > 0 ? fmt(presup) : <span style={{ color: "#ccc" }}>—</span>}</span>
                  <span style={{ fontSize: 11, textAlign: "right", color: presup > 0 ? (dif < 0 ? SHEET.rosaBorde : SHEET.verdeBorde) : "#ccc", display: "block", minWidth: 0 }}>{presup > 0 ? fmt(dif) : "—"}</span>
                  <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700, display: "block", minWidth: 0 }}>{usado > 0 ? fmt(usado) : <span style={{ color: "#ccc" }}>—</span>}</span>
                </div>
              );
            }).filter(Boolean)}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", padding: "5px 8px", background: SHEET.gris, borderTop: "1px solid " + SHEET.grisBorde }}>
              <span style={{ fontSize: 11, fontWeight: 700 }}>Total</span>
              <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700 }}>{fmt(totalVariablePresup)}</span>
              <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700, color: (totalVariablePresup - Object.values(gastoVariableMes).reduce((s,v)=>s+v,0)) < 0 ? SHEET.rosaBorde : SHEET.verdeBorde }}>
                {fmt(totalVariablePresup - Object.values(gastoVariableMes).reduce((s,v)=>s+v,0))}
              </span>
              <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700 }}>{fmt(Object.values(gastoVariableMes).reduce((s,v)=>s+v,0))}</span>
            </div>
          </div>
        )}
      </div>

      {/* Préstamos */}
      {prestamosBancarios.filter(p=>p.activa).length > 0 && (
        <div style={seccionStyle}>
          <p style={tituloStyle}>Préstamos</p>
          <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px", background: SHEET.gris, padding: "4px 8px", borderBottom: "1px solid " + SHEET.grisBorde }}>
              {["Préstamo", "Aportación mes", "Pagado mes"].map((h, i) => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#555", textAlign: i === 0 ? "left" : "right" }}>{h}</span>
              ))}
            </div>
            {prestamosBancarios.filter(p=>p.activa).map((p) => {
              const pagadoMes = movsMes.filter((m) => m.mov === "Egreso" && m.tipo === "Préstamo" && m.subcategoria === p.nombre).reduce((s,m)=>s+Number(m.cantidad),0);
              const aportMes = aportacionMensual(p.pagoPeriodo || 0, p.frecuencia);
              const faltaMes = Math.max(0, aportMes - pagadoMes);
              return (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px", padding: "5px 8px", borderBottom: "1px solid " + SHEET.grisBorde, alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>{p.nombre}</p>
                    <p style={{ fontSize: 10, color: "#aaa", margin: "1px 0 0" }}>{p.frecuencia || "Mensual"} · {fmt(p.pagoPeriodo||0)}/periodo · {fmt(aportMes)}/mes</p>
                  </div>
                  <span style={{ fontSize: 11, textAlign: "right", color: faltaMes > 0 ? SHEET.rosaBorde : SHEET.verdeBorde, fontWeight: 700 }}>
                    {faltaMes > 0 ? fmt(faltaMes) : "$0.00"}
                  </span>
                  <span style={{ fontSize: 11, textAlign: "right", color: pagadoMes > 0 ? SHEET.verdeBorde : "#ccc", fontWeight: pagadoMes > 0 ? 700 : 400 }}>
                    {pagadoMes > 0 ? fmt(pagadoMes) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Liquidez */}
      <div style={seccionStyle}>
        <p style={tituloStyle}>Liquidez por Método</p>
        <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", background: SHEET.gris, padding: "4px 8px", borderBottom: "1px solid " + SHEET.grisBorde }}>
            {["Método", "Ingresos", "Egresos", "Restante"].map((h, i) => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#555", textAlign: i === 0 ? "left" : "right" }}>{h}</span>
            ))}
          </div>
          {liquidezPorMetodo.map((l) => (
            <React.Fragment key={l.met}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", padding: "5px 8px", borderBottom: "1px solid " + SHEET.grisBorde }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{l.met}</span>
                <span style={{ fontSize: 11, textAlign: "right", color: SHEET.verdeBorde }}>{l.ingresos > 0 ? fmt(l.ingresos) : "—"}</span>
                <span style={{ fontSize: 11, textAlign: "right", color: SHEET.rosaBorde }}>{l.egresos > 0 ? fmt(l.egresos) : "—"}</span>
                <span style={{ fontSize: 11, textAlign: "right", fontWeight: 700, color: l.restante < 0 ? SHEET.rosaBorde : SHEET.verdeBorde }}>{fmt(l.restante)}</span>
              </div>
              {l.pagoTDC > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", padding: "3px 8px 3px 18px", borderBottom: "1px solid " + SHEET.grisBorde, background: "#fafafa" }}>
                  <span style={{ fontSize: 10, color: "#888", fontStyle: "italic" }}>↳ Pago TDC</span>
                  <span></span>
                  <span style={{ fontSize: 10, textAlign: "right", color: SHEET.rosaBorde }}>{fmt(l.pagoTDC)}</span>
                  <span></span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function PresupuestoEditor({ catalog, setCatalog, guardarAhora, movimientos }) {
  const today = todayISO().slice(0, 7);
  const mesesDisponibles = useMemo(() => {
    const set = new Set(movimientos.map((m) => m.fecha.slice(0, 7)));
    set.add(today);
    return Array.from(set).sort();
  }, [movimientos, today]);

  const ultimoConDatos = useMemo(() => {
    const conMov = mesesDisponibles.filter((m) => movimientos.some((mv) => mv.fecha.startsWith(m)));
    return conMov.length > 0 ? conMov[conMov.length - 1] : today;
  }, [mesesDisponibles, movimientos, today]);

  const [mesActual, setMesActual] = useState(ultimoConDatos);
  const [mostrarReal, setMostrarReal] = useState(false);

  const todosMeses = useMemo(() => {
    const year = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  }, []);

  const presupuestosMens = catalog.presupuestosMensuales || {};
  const datosMes = presupuestosMens[mesActual] || {};
  const catsMes = datosMes.categorias || {};
  const ingresoMes = datosMes.ingresoEsperado || 0;

  const mesAnt = mesAnterior(mesActual);
  const datosAnt = presupuestosMens[mesAnt] || {};
  const catsAnt = datosAnt.categorias || {};

  // Promedio histórico por categoría (de movimientos reales)
  const promedios = useMemo(() => {
    const sumas = {}; const conteos = {};
    movimientos.filter((m) => m.mov === "Egreso" && m.tipo === "G. Variable").forEach((m) => {
      const mes = m.fecha.slice(0, 7);
      if (!sumas[m.categoria]) { sumas[m.categoria] = {}; conteos[m.categoria] = new Set(); }
      sumas[m.categoria][mes] = (sumas[m.categoria][mes] || 0) + Number(m.cantidad);
      conteos[m.categoria].add(mes);
    });
    const result = {};
    Object.keys(sumas).forEach((cat) => {
      const total = Object.values(sumas[cat]).reduce((s, v) => s + v, 0);
      result[cat] = conteos[cat].size > 0 ? Math.round((total / conteos[cat].size) * 100) / 100 : 0;
    });
    return result;
  }, [movimientos]);

  // Real del mes anterior (lo que gastó)
  const realAnt = useMemo(() => {
    const map = {};
    movimientos.filter((m) => m.mov === "Egreso" && m.tipo === "G. Variable" && m.fecha.startsWith(mesAnt))
      .forEach((m) => { map[m.categoria] = (map[m.categoria] || 0) + Number(m.cantidad); });
    return map;
  }, [movimientos, mesAnt]);

  const fijosMes = useMemo(() => calcFijosDelMes(catalog, movimientos, mesActual), [catalog, movimientos, mesActual]);
  const totalFijos = Object.values(fijosMes).reduce((s, v) => s + v, 0);
  const totalVariablePresup = CAT_VARIABLES.reduce((s, cat) => s + (catsMes[cat] || 0), 0);
  const totalPresupuestado = totalFijos + totalVariablePresup;
  const diferencia = ingresoMes - totalPresupuestado;

  function actualizarCat(cat, valor) {
    const nuevo = {
      ...presupuestosMens,
      [mesActual]: {
        ...datosMes,
        categorias: { ...catsMes, [cat]: parseFloat(valor) || 0 }
      }
    };
    const actualizado = { ...catalog, presupuestosMensuales: nuevo };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function actualizarIngreso(valor) {
    const nuevo = {
      ...presupuestosMens,
      [mesActual]: { ...datosMes, ingresoEsperado: parseFloat(valor) || 0 }
    };
    const actualizado = { ...catalog, presupuestosMensuales: nuevo };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function copiarDelAnterior() {
    if (!datosAnt || !datosAnt.categorias) return;
    const nuevo = {
      ...presupuestosMens,
      [mesActual]: {
        ingresoEsperado: datosAnt.ingresoEsperado || 0,
        categorias: { ...datosAnt.categorias }
      }
    };
    const actualizado = { ...catalog, presupuestosMensuales: nuevo };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  const colHeaderStyle = { fontSize: 10.5, fontWeight: 700, fontStyle: "italic", color: "#555", textAlign: "right", padding: "0 4px" };
  const cellStyle = { fontSize: 11.5, textAlign: "right", padding: "4px 4px", color: "#444" };
  const labelStyle = { fontSize: 12.5, fontWeight: 700, padding: "4px 0" };

  function FilaFija({ label, monto }) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px 70px 90px", gap: 4, alignItems: "center", padding: "5px 8px", borderBottom: "1px solid " + SHEET.grisBorde }}>
        <span style={{ fontSize: 12, color: "#555" }}>{label}</span>
        <span style={cellStyle}>—</span>
        <span style={cellStyle}>—</span>
        {mostrarReal ? <span style={cellStyle}>—</span> : null}
        <span style={{ ...cellStyle, fontWeight: 700, color: SHEET.rosaBorde }}>{fmt(monto)}</span>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      {/* Selector de mes */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <Field label="Mes a editar">
            <select value={mesActual} onChange={(e) => setMesActual(e.target.value)} style={{ ...inputBase, fontWeight: 700 }}>
              {todosMeses.map((m) => <option key={m} value={m}>{mesLabel(m)}</option>)}
            </select>
          </Field>
        </div>
        {datosAnt.categorias && (
          <button onClick={copiarDelAnterior} style={{
            marginTop: 18, padding: "8px 10px", fontSize: 11, fontWeight: 700, fontStyle: "italic",
            border: `1px solid ${SHEET.azulBorde}`, borderRadius: 3, background: SHEET.azul, cursor: "pointer", fontFamily: SHEET.fuente
          }}>↩ Copiar mes ant.</button>
        )}
      </div>

      {/* Toggle real anterior */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button onClick={() => setMostrarReal((v) => !v)} style={{
          fontSize: 11, fontWeight: 700, fontStyle: "italic", padding: "5px 10px", borderRadius: 3,
          border: `1px solid ${SHEET.grisBorde}`, background: mostrarReal ? SHEET.amarillo : "#fff", cursor: "pointer", fontFamily: SHEET.fuente
        }}>{mostrarReal ? "▲ Ocultar real anterior" : "▼ Ver real anterior"}</button>
      </div>

      {/* Encabezados */}
      <div style={{ display: "grid", gridTemplateColumns: `1fr 70px 70px ${mostrarReal ? "70px " : ""}90px`, gap: 4, padding: "4px 8px", borderBottom: `2px solid ${SHEET.grisBorde}` }}>
        <span style={{ fontSize: 11, fontWeight: 700, fontStyle: "italic" }}>Categoría</span>
        <span style={colHeaderStyle}>A Prom.</span>
        <span style={colHeaderStyle}>B Base</span>
        {mostrarReal && <span style={colHeaderStyle}>C Real ant.</span>}
        <span style={{ ...colHeaderStyle, color: SHEET.rosaBorde }}>D Este mes</span>
      </div>

      {/* Ingreso esperado */}
      <div style={{ background: SHEET.verde, padding: "6px 8px", borderBottom: "1px solid " + SHEET.grisBorde }}>
        <div style={{ display: "grid", gridTemplateColumns: `1fr 70px 70px ${mostrarReal ? "70px " : ""}90px`, gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Ingreso esperado</span>
          <span style={cellStyle}>{promedios["_ingreso"] ? fmt(promedios["_ingreso"]) : "—"}</span>
          <span style={cellStyle}>{datosAnt.ingresoEsperado ? fmt(datosAnt.ingresoEsperado) : "—"}</span>
          {mostrarReal && <span style={cellStyle}>—</span>}
          <input type="text" inputMode="decimal" value={ingresoMes || ""} onChange={(e) => actualizarIngreso(e.target.value)}
            placeholder="$0" style={{ ...inputBase, textAlign: "right", border: `2px solid ${SHEET.verdeBorde}`, fontSize: 12, padding: "4px 6px" }} />
        </div>
      </div>

      {/* G. Variable (editable) */}
      <div style={{ background: SHEET.rosa, padding: "5px 8px", borderBottom: "1px solid " + SHEET.rosaBorde }}>
        <span style={labelStyle}>Gasto Variable</span>
      </div>
      {CAT_VARIABLES.map((cat) => (
        <div key={cat} style={{ display: "grid", gridTemplateColumns: `1fr 70px 70px ${mostrarReal ? "70px " : ""}90px`, gap: 4, alignItems: "center", padding: "5px 8px", borderBottom: "1px solid " + SHEET.grisBorde }}>
          <span style={{ fontSize: 12 }}>{cat}</span>
          <span style={cellStyle}>{promedios[cat] ? fmt(promedios[cat]) : "—"}</span>
          <span style={cellStyle}>{catsAnt[cat] ? fmt(catsAnt[cat]) : "—"}</span>
          {mostrarReal && <span style={{ ...cellStyle, color: realAnt[cat] > (catsAnt[cat] || 0) ? SHEET.rosaBorde : "#444" }}>{realAnt[cat] ? fmt(realAnt[cat]) : "—"}</span>}
          <input type="text" inputMode="decimal" value={catsMes[cat] || ""} onChange={(e) => actualizarCat(cat, e.target.value)}
            placeholder="$0" style={{ ...inputBase, textAlign: "right", border: `2px solid ${SHEET.rojo}`, fontSize: 12, padding: "4px 6px" }} />
        </div>
      ))}

      {/* G. Fijo (no editable) */}
      <div style={{ background: SHEET.azul, padding: "5px 8px", borderBottom: "1px solid " + SHEET.azulBorde, marginTop: 8 }}>
        <span style={labelStyle}>Comprometido (no editable)</span>
      </div>
      {Object.entries(fijosMes).map(([label, monto]) => (
        <FilaFija key={label} label={label} monto={monto} />
      ))}
      {Object.keys(fijosMes).length === 0 && (
        <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", padding: "8px" }}>Sin compromisos fijos activos.</p>
      )}

      {/* Resumen */}
      <div style={{ marginTop: 14, border: `1px solid ${SHEET.grisBorde}`, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ background: SHEET.amarillo, padding: "8px 12px", borderBottom: `1px solid ${SHEET.grisBorde}` }}>
          <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: 0 }}>Resumen {mesLabel(mesActual)}</p>
        </div>
        <div style={{ padding: "10px 12px", background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
            <span>Ingreso esperado</span><b style={{ color: SHEET.verdeBorde }}>{fmt(ingresoMes)}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
            <span>Comprometido (fijo)</span><b style={{ color: SHEET.rosaBorde }}>− {fmt(totalFijos)}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
            <span>Variable presupuestado</span><b style={{ color: SHEET.rosaBorde }}>− {fmt(totalVariablePresup)}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderTop: `1px solid ${SHEET.grisBorde}`, paddingTop: 8, marginTop: 4 }}>
            <b>Disponible estimado</b>
            <b style={{ color: diferencia >= 0 ? SHEET.verdeBorde : SHEET.rosaBorde }}>{fmt(diferencia)}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

function PresupuestoTab({ catalog, movimientos, userEmail }) {
  const today = todayISO().slice(0, 7);
  const [mesFiltro, setMesFiltro] = useState(today);

  const meses = useMemo(() => {
    const set = new Set(movimientos.map((m) => m.fecha.slice(0, 7)));
    set.add(today);
    return Array.from(set).sort().reverse();
  }, [movimientos, today]);

  const presupuestosMens = catalog.presupuestosMensuales || {};
  const datosMes = presupuestosMens[mesFiltro] || {};
  const catsMes = datosMes.categorias || {};
  const ingresoEsperado = datosMes.ingresoEsperado || 0;

  const movsMes = useMemo(() => movimientos.filter((m) => m.fecha.startsWith(mesFiltro)), [movimientos, mesFiltro]);
  const ingresoReal = movsMes.filter((m) => m.mov === "Ingreso").reduce((s, m) => s + Number(m.cantidad), 0);
  const egresoReal = movsMes.filter((m) => m.mov === "Egreso").reduce((s, m) => s + Number(m.cantidad), 0);

  const gastoVariableReal = useMemo(() => {
    const map = {};
    movsMes.filter((m) => m.mov === "Egreso" && m.tipo === "G. Variable").forEach((m) => { map[m.categoria] = (map[m.categoria] || 0) + Number(m.cantidad); });
    return map;
  }, [movsMes]);

  const fijosMes = useMemo(() => calcFijosDelMes(catalog, movimientos, mesFiltro), [catalog, movimientos, mesFiltro]);
  const totalFijos = Object.values(fijosMes).reduce((s, v) => s + v, 0);
  const totalVariablePresup = CAT_VARIABLES.reduce((s, cat) => s + (catsMes[cat] || 0), 0);
  const totalVariableReal = CAT_VARIABLES.reduce((s, cat) => s + (gastoVariableReal[cat] || 0), 0);
  const totalPresupuestado = totalFijos + totalVariablePresup;
  const balance = ingresoEsperado - totalPresupuestado;

  const semaforo = balance >= 0 ? { color: SHEET.verdeBorde, label: "✓ En orden", bg: SHEET.verde } :
    balance >= -2000 ? { color: SHEET.amarilloBorde, label: "⚠ Ajustado", bg: SHEET.amarillo } :
    { color: SHEET.rosaBorde, label: "✕ Déficit", bg: SHEET.rosa };

  function exportarCSV() {
    const escape = (v) => { const s = String(v ?? ""); return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
    const filas = [
      ["Presupuesto", mesLabel(mesFiltro)],
      [`Usuario: ${userEmail || ""}`],
      [`Generado: ${fmtDate(todayISO())}`],
      [],
      ["Categoría", "Presupuestado", "Real", "Diferencia"],
      ["Ingreso esperado", ingresoEsperado, ingresoReal, ingresoReal - ingresoEsperado],
      [],
      ["── G. Variable ──"],
      ...CAT_VARIABLES.map((cat) => [cat, catsMes[cat] || 0, gastoVariableReal[cat] || 0, (catsMes[cat] || 0) - (gastoVariableReal[cat] || 0)]),
      ["Total Variable", totalVariablePresup, totalVariableReal, totalVariablePresup - totalVariableReal],
      [],
      ["── Comprometido (Fijo) ──"],
      ...Object.entries(fijosMes).map(([label, monto]) => [label, monto, "", ""]),
      ["Total Fijo", totalFijos, "", ""],
      [],
      ["TOTAL PRESUPUESTADO", totalPresupuestado, egresoReal, totalPresupuestado - egresoReal],
      ["DISPONIBLE ESTIMADO", balance, "", ""],
    ];
    const csv = filas.map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `Presupuesto_${mesFiltro}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const variableFilas = CAT_VARIABLES.map((cat) => {
      const presup = catsMes[cat] || 0;
      const real = gastoVariableReal[cat] || 0;
      const dif = presup - real;
      if (presup === 0 && real === 0) return "";
      return `<tr>
        <td>${cat}</td><td class="num">${fmt(presup)}</td><td class="num">${fmt(real)}</td>
        <td class="num" style="color:${dif >= 0 ? "#2e7d32" : "#c62828"}">${fmt(dif)}</td>
      </tr>`;
    }).filter(Boolean).join("");
    const fijoFilas = Object.entries(fijosMes).map(([l, m]) =>
      `<tr><td>${l}</td><td class="num">${fmt(m)}</td><td>—</td><td>—</td></tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Presupuesto ${mesLabel(mesFiltro)}</title>
      <style>body{font-family:Calibri,Arial,sans-serif;padding:24px}h1{font-size:20px;margin:0 0 4px}h2{font-size:13px;margin:16px 0 6px}
      p.sub{font-size:12px;color:#555;margin:0 0 4px}
      table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:14px}th,td{border:1px solid #999;padding:5px 6px}
      th{background:#F4CCCC;font-weight:700}td.num{text-align:right}
      .semaforo{display:inline-block;padding:6px 14px;border-radius:4px;font-weight:700;font-size:13px;margin:10px 0}
      .resumen{background:#FFF9C4;border:1px solid #e6d200;border-radius:4px;padding:10px 14px;font-size:12px}
      .resumen div{display:flex;justify-content:space-between;margin-bottom:4px}
      @media print{body{padding:0}}</style></head>
      <body>
        <h1>Presupuesto — ${mesLabel(mesFiltro)}</h1>
        <p class="sub">Usuario: ${userEmail || ""} · Generado el ${fmtDate(todayISO())}</p>
        <div class="semaforo" style="background:${semaforo.bg};color:${semaforo.color}">${semaforo.label}</div>
        <div class="resumen">
          <div><span>Ingreso esperado</span><b>${fmt(ingresoEsperado)}</b></div>
          <div><span>Comprometido (fijo)</span><b>− ${fmt(totalFijos)}</b></div>
          <div><span>Variable presupuestado</span><b>− ${fmt(totalVariablePresup)}</b></div>
          <div style="border-top:1px solid #ccc;padding-top:6px;margin-top:4px"><span><b>Disponible estimado</b></span><b style="color:${semaforo.color}">${fmt(balance)}</b></div>
        </div>
        <h2>Gasto Variable</h2>
        <table><thead><tr><th>Categoría</th><th>Presupuestado</th><th>Real</th><th>Diferencia</th></tr></thead>
        <tbody>${variableFilas}</tbody></table>
        <h2>Comprometido (Fijo)</h2>
        <table><thead><tr><th>Concepto</th><th>Monto</th><th colspan="2"></th></tr></thead>
        <tbody>${fijoFilas}</tbody></table>
        <script>window.onload=()=>{window.print();}</script>
      </body></html>`;
    const v = window.open("", "_blank"); if (v) { v.document.write(html); v.document.close(); }
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <Field label="Mes">
        <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} style={{ ...inputBase, background: SHEET.azul }}>
          {meses.map((m) => <option key={m} value={m}>{mesLabel(m)}</option>)}
        </select>
      </Field>

      {/* Semáforo */}
      <div style={{ background: semaforo.bg, border: `1px solid ${semaforo.color}`, borderRadius: 4, padding: "10px 14px", marginBottom: 14, textAlign: "center" }}>
        <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: semaforo.color }}>{semaforo.label}</p>
        <p style={{ fontSize: 12, color: "#555", margin: "4px 0 0" }}>
          Ingreso {fmt(ingresoEsperado)} − Comprometido {fmt(totalFijos)} − Variable {fmt(totalVariablePresup)} = <b style={{ color: semaforo.color }}>{fmt(balance)}</b>
        </p>
      </div>

      {/* Botones export */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn full onClick={exportarPDF} style={{ flex: 1 }}>📄 PDF</Btn>
        <Btn full onClick={exportarCSV} style={{ flex: 1 }}>📊 Excel</Btn>
      </div>

      {/* G. Variable */}
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ background: SHEET.rosa, padding: "7px 12px", borderBottom: "1px solid " + SHEET.rosaBorde }}>
          <span style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic" }}>Gasto Variable</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: 0, background: SHEET.gris, borderBottom: "1px solid " + SHEET.grisBorde, padding: "4px 10px" }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, fontStyle: "italic", color: "#555" }}>Categoría</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, fontStyle: "italic", color: "#555", textAlign: "right" }}>Presup.</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, fontStyle: "italic", color: "#555", textAlign: "right" }}>Real</span>
        </div>
        {CAT_VARIABLES.map((cat) => {
          const presup = catsMes[cat] || 0;
          const real = gastoVariableReal[cat] || 0;
          if (presup === 0 && real === 0) return null;
          const over = real > presup && presup > 0;
          const pct = presup > 0 ? Math.min(100, (real / presup) * 100) : (real > 0 ? 100 : 0);
          return (
            <div key={cat} style={{ padding: "7px 10px", borderBottom: "1px solid " + SHEET.grisBorde }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: 0, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{cat}</span>
                <span style={{ fontSize: 12, textAlign: "right", color: "#555" }}>{fmt(presup)}</span>
                <span style={{ fontSize: 12, textAlign: "right", fontWeight: 700, color: over ? SHEET.rosaBorde : "#333" }}>{fmt(real)}</span>
              </div>
              {presup > 0 && (
                <div style={{ height: 7, background: SHEET.gris, border: "1px solid " + SHEET.grisBorde, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: over ? SHEET.rosaBorde : pct >= 80 ? SHEET.amarilloBorde : SHEET.verdeBorde }} />
                </div>
              )}
            </div>
          );
        }).filter(Boolean)}
        {CAT_VARIABLES.every((cat) => !(catsMes[cat] || 0) && !gastoVariableReal[cat]) && (
          <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", padding: "10px" }}>Sin presupuesto ni gastos en este mes. Configúralo en Datos → Presupuesto.</p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", padding: "6px 10px", background: SHEET.gris, borderTop: "1px solid " + SHEET.grisBorde }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Total Variable</span>
          <span style={{ fontSize: 12, fontWeight: 700, textAlign: "right" }}>{fmt(totalVariablePresup)}</span>
          <span style={{ fontSize: 12, fontWeight: 700, textAlign: "right", color: totalVariableReal > totalVariablePresup ? SHEET.rosaBorde : "#333" }}>{fmt(totalVariableReal)}</span>
        </div>
      </div>

      {/* Comprometido */}
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ background: SHEET.azul, padding: "7px 12px", borderBottom: "1px solid " + SHEET.azulBorde }}>
          <span style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic" }}>Comprometido (Fijo)</span>
        </div>
        {Object.entries(fijosMes).map(([label, monto]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 10px", borderBottom: "1px solid " + SHEET.grisBorde, fontSize: 12 }}>
            <span>{label}</span><b>{fmt(monto)}</b>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: SHEET.gris, fontSize: 12, fontWeight: 700 }}>
          <span>Total Fijo</span><span>{fmt(totalFijos)}</span>
        </div>
      </div>
    </div>
  );
}

function TDCConfigEditor({ catalog, setCatalog, guardarAhora }) {
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({});
  const [nuevoNombre, setNuevoNombre] = useState("");

  const nombresTDC = catalog.cuentas.TDC || [];
  const detalles = catalog.tarjetasTDC || [];
  function detalleDe(nombre) { return detalles.find((t) => t.nombre === nombre) || null; }

  function abrirEdicion(nombre) {
    const d = detalleDe(nombre);
    setEditandoId(nombre);
    setForm({
      limite: d ? String(d.limite || "") : "",
      diaCiclo: d ? String(d.diaCiclo || "") : "",
      anualidad: d ? (d.anualidad || false) : false,
      activa: d ? d.activa !== false : true,
    });
  }

  function guardarDetalle() {
    const nombre = editandoId;
    const existente = detalleDe(nombre);
    const tdc = {
      id: existente ? existente.id : uid(),
      nombre, activa: form.activa !== false,
      limite: parseFloat(form.limite) || 0,
      diaCiclo: parseInt(form.diaCiclo) || 1,
      anualidad: form.anualidad || false,
    };
    const nuevas = existente
      ? detalles.map((t) => (t.nombre === nombre ? { ...t, ...tdc } : t))
      : [...detalles, tdc];
    const actualizado = { ...catalog, tarjetasTDC: nuevas };
    setCatalog(actualizado); guardarAhora(actualizado); setEditandoId(null);
  }

  function agregarNueva() {
    const nombre = nuevoNombre.trim();
    if (!nombre || nombresTDC.includes(nombre)) return;
    const nuevasCuentas = [...nombresTDC, nombre];
    const actualizado = { ...catalog, cuentas: { ...catalog.cuentas, TDC: nuevasCuentas } };
    setCatalog(actualizado); guardarAhora(actualizado);
    setNuevoNombre("");
    setEditandoId(nombre);
    setForm({ limite: "", diaCiclo: "", anualidad: false, activa: true });
  }

  function eliminarTarjeta(nombre) {
    const nuevasCuentas = nombresTDC.filter((n) => n !== nombre);
    const nuevasDetalles = detalles.filter((t) => t.nombre !== nombre);
    const actualizado = { ...catalog, cuentas: { ...catalog.cuentas, TDC: nuevasCuentas }, tarjetasTDC: nuevasDetalles };
    setCatalog(actualizado); guardarAhora(actualizado);
    if (editandoId === nombre) setEditandoId(null);
  }

  function toggleActiva(nombre) {
    const d = detalleDe(nombre);
    if (!d) return;
    const nuevas = detalles.map((t) => (t.nombre === nombre ? { ...t, activa: !t.activa } : t));
    const actualizado = { ...catalog, tarjetasTDC: nuevas };
    setCatalog(actualizado); guardarAhora(actualizado);
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <p style={{ fontSize: 11.5, color: "#666", fontStyle: "italic", marginBottom: 12 }}>
        Configura cada tarjeta una vez — las fechas de ciclo se calculan automático cada mes.
      </p>
      {nombresTDC.length === 0 && (
        <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 12 }}>Sin tarjetas. Agrega una abajo.</p>
      )}
      {nombresTDC.map((nombre) => {
        const d = detalleDe(nombre);
        const editando = editandoId === nombre;
        const tieneDetalle = d && d.limite > 0 && d.diaCiclo;
        return (
          <div key={nombre} style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, marginBottom: 10, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: d && !d.activa ? SHEET.gris : "#fff" }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{nombre}</p>
                {tieneDetalle ? (
                  <p style={{ fontSize: 11, color: "#555", margin: "2px 0 0" }}>
                    Límite {fmt(d.limite)} · Corte día {d.diaCiclo} · Anualidad: {d.anualidad ? "Sí" : "No"}
                  </p>
                ) : (
                  <p style={{ fontSize: 11, color: SHEET.amarilloBorde, fontStyle: "italic", margin: "2px 0 0" }}>⚠ Sin datos — toca ✎ para completar</p>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                {d && (
                  <button onClick={() => toggleActiva(nombre)} style={{
                    fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                    border: "1px solid " + SHEET.grisBorde, background: d.activa !== false ? SHEET.verde : "#fff", color: SHEET.texto
                  }}>{d.activa !== false ? "Activa" : "Inactiva"}</button>
                )}
                <button onClick={() => editando ? setEditandoId(null) : abrirEdicion(nombre)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: SHEET.azulBorde }}>{editando ? "✕" : "✎"}</button>
                <button onClick={() => eliminarTarjeta(nombre)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: SHEET.rosaBorde }}>🗑</button>
              </div>
            </div>
            {editando && (
              <div style={{ padding: "10px 12px", background: SHEET.gris, borderTop: "1px solid " + SHEET.grisBorde }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="Límite de crédito">
                    <input type="text" inputMode="decimal" value={form.limite || ""} onChange={(e) => setForm((p) => ({ ...p, limite: e.target.value }))}
                      style={{ ...inputBase, border: `2px solid ${SHEET.rojo}` }} placeholder="$0.00" />
                  </Field>
                  <Field label="Día de corte (del mes)">
                    <input type="text" inputMode="numeric" value={form.diaCiclo || ""} onChange={(e) => setForm((p) => ({ ...p, diaCiclo: e.target.value }))}
                      style={{ ...inputBase, border: `2px solid ${SHEET.rojo}` }} placeholder="Ej. 5, 8, 14" />
                  </Field>
                </div>
                <Field label="¿Tiene anualidad?">
                  <div style={{ display: "flex", gap: 8 }}>
                    {[["Sí", true], ["No", false]].map(([label, val]) => (
                      <button key={label} onClick={() => setForm((p) => ({ ...p, anualidad: val }))} style={{
                        flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                        border: form.anualidad === val ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                        background: form.anualidad === val ? SHEET.azul : "#fff"
                      }}>{label}</button>
                    ))}
                  </div>
                </Field>
                <p style={{ fontSize: 11, color: "#666", fontStyle: "italic", margin: "4px 0 8px" }}>
                  Los días para pagar se capturan cada mes en Tarjetas de Crédito, ya que pueden variar.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn primary full onClick={guardarDetalle}>Guardar</Btn>
                  <Btn full onClick={() => setEditandoId(null)}>Cancelar</Btn>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && agregarNueva()}
          placeholder="Nombre de nueva tarjeta..." style={{ ...inputBase, flex: 1 }} />
        <Btn primary onClick={agregarNueva}>+ Agregar</Btn>
      </div>
    </div>
  );
}

function calcFechasCiclo(diaCiclo, mesYM) {
  if (!diaCiclo || !mesYM) return { inicioCiclo: "", finCiclo: "" };
  const [y, m] = mesYM.split("-").map(Number);
  const finDate = new Date(y, m - 1, diaCiclo);
  const finCiclo = finDate.toISOString().slice(0, 10);
  const inicioDate = new Date(y, m - 2, diaCiclo + 1);
  const inicioCiclo = inicioDate.toISOString().slice(0, 10);
  return { inicioCiclo, finCiclo };
}

function TDCTab({ catalog, setCatalog, guardarAhora, movimientos, userEmail }) {
  const today = todayISO().slice(0, 7);
  const nombresTDC = catalog.cuentas.TDC || [];
  const detallesTDC = catalog.tarjetasTDC || [];
  const tarjetas = nombresTDC.map((nombre) => {
    const d = detallesTDC.find((t) => t.nombre === nombre);
    return d && d.activa !== false ? { nombre, limite: 0, diaCiclo: 1, anualidad: false, ...d } : null;
  }).filter(Boolean);

  const mesesDisponibles = useMemo(() => {
    const set = new Set(movimientos.map((m) => m.fecha.slice(0, 7)));
    set.add(today);
    return Array.from(set).sort().reverse();
  }, [movimientos, today]);

  const [mesActual, setMesActual] = useState(today);
  const [editandoCicloId, setEditandoCicloId] = useState(null);
  const [formCiclo, setFormCiclo] = useState({});
  const [verDiferidosId, setVerDiferidosId] = useState(null);

  const ciclosTDC = catalog.ciclosTDC || {};
  const ciclosMes = ciclosTDC[mesActual] || {};

  function fechasCiclo(tdc) {
    const { inicioCiclo, finCiclo } = calcFechasCiclo(tdc.diaCiclo, mesActual);
    const ciclo = ciclosMes[tdc.nombre] || {};
    let fechaPago = "";
    if (finCiclo && ciclo.diasPago > 0) {
      const d = new Date(finCiclo);
      d.setDate(d.getDate() + ciclo.diasPago);
      fechaPago = d.toISOString().slice(0, 10);
    }
    return { inicioCiclo, finCiclo, fechaPago };
  }

  const r2 = (n) => Math.round(n * 100) / 100;

  function calcularGastoCiclo(tarjetaNombre, inicioCiclo, finCiclo) {
    if (!inicioCiclo || !finCiclo) return { gasto: 0, diferidos: 0, regulares: 0 };
    const movsCiclo = movimientos.filter((m) =>
      m.mov === "Egreso" && m.cuenta === tarjetaNombre &&
      m.fecha >= inicioCiclo && m.fecha <= finCiclo &&
      m.tipo !== "Pago TDC"
    );
    const diferidos = r2(movsCiclo.filter((m) => m.lugar && m.lugar.startsWith("__diferido:")).reduce((s, m) => s + Number(m.cantidad), 0));
    const gasto = r2(movsCiclo.reduce((s, m) => s + Number(m.cantidad), 0));
    return { gasto, diferidos, regulares: r2(gasto - diferidos) };
  }

  function calcularAdelanto(tarjetaNombre, inicioCiclo, finCiclo) {
    if (!inicioCiclo || !finCiclo) return 0;
    return r2(movimientos.filter((m) =>
      m.mov === "Egreso" && m.tipo === "Pago TDC" &&
      (m.cuenta === tarjetaNombre || m.categoria === tarjetaNombre) &&
      m.fecha >= inicioCiclo && m.fecha <= finCiclo
    ).reduce((s, m) => s + Number(m.cantidad), 0));
  }

  function calcularPagado(tarjetaNombre, finCiclo, fechaPago) {
    if (!finCiclo) return 0;
    const d = new Date(finCiclo); d.setDate(d.getDate() + 1);
    const desde = d.toISOString().slice(0, 10);
    const hasta = fechaPago || "9999-12-31";
    return r2(movimientos.filter((m) =>
      m.mov === "Egreso" && m.tipo === "Pago TDC" &&
      (m.cuenta === tarjetaNombre || m.categoria === tarjetaNombre) &&
      m.fecha >= desde && m.fecha <= hasta
    ).reduce((s, m) => s + Number(m.cantidad), 0));
  }

  function calcularReembolso(tarjetaNombre, inicioCiclo, finCiclo) {
    if (!inicioCiclo || !finCiclo) return 0;
    return r2(movimientos.filter((m) =>
      m.mov === "Ingreso" && m.ingresoTipo === "Reembolso" && m.cuenta === tarjetaNombre &&
      m.fecha >= inicioCiclo && m.fecha <= finCiclo
    ).reduce((s, m) => s + Number(m.cantidad), 0));
  }

  // Diferidos activos de una tarjeta: saldo pendiente total
  function diferidosActivosDe(tarjetaNombre) {
    return (catalog.diferidos || []).filter((d) => d.activo && d.tarjeta === tarjetaNombre);
  }

  function saldoPendienteDiferido(dif) {
    // Si lleva intereses, el banco descuenta del límite solo el capital pendiente (no los intereses futuros)
    const base = dif.conIntereses && dif.capitalOriginal ? dif.capitalOriginal : dif.costoTotal;
    const pagadoCapital = dif.pagado || 0;
    return r2(Math.max(0, base - pagadoCapital));
  }

  function abrirFormCiclo(tdc) {
    const ciclo = ciclosMes[tdc.nombre] || {};
    setFormCiclo({
      diasPago: ciclo.diasPago ? String(ciclo.diasPago) : "",
      pagoMinimo: ciclo.pagoMinimo ? String(ciclo.pagoMinimo) : "",
      intereses: ciclo.intereses ? String(ciclo.intereses) : "",
    });
    setEditandoCicloId(tdc.nombre);
  }

  function guardarCiclo(nombreTdc) {
    const nuevos = {
      ...ciclosTDC,
      [mesActual]: {
        ...ciclosMes,
        [nombreTdc]: {
          diasPago: parseInt(formCiclo.diasPago) || 0,
          pagoMinimo: parseFloat(formCiclo.pagoMinimo) || 0,
          intereses: parseFloat(formCiclo.intereses) || 0,
        }
      }
    };
    const actualizado = { ...catalog, ciclosTDC: nuevos };
    setCatalog(actualizado); guardarAhora(actualizado); setEditandoCicloId(null);
  }

  function exportarCSV() {
    const escape = (v) => { const s = String(v ?? ""); return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
    const headers = ["Tarjeta", "Límite", "Difs. Pendiente Total", "Disponible Real", "Inicio Ciclo", "Fin Ciclo", "F.Pago", "Intereses", "Pago Mín.", "Gasto Ciclo", "Difs. Ciclo", "Regulares", "Adelanto", "Pago Sin Int.", "Reembolso", "Pagado", "Restante"];
    const filas = tarjetas.map((t) => {
      const { inicioCiclo, finCiclo, fechaPago } = fechasCiclo(t);
      const { gasto, diferidos, regulares } = calcularGastoCiclo(t.nombre, inicioCiclo, finCiclo);
      const ciclo = ciclosMes[t.nombre] || {};
      const adelanto = calcularAdelanto(t.nombre, inicioCiclo, finCiclo);
      const reembolso = calcularReembolso(t.nombre, inicioCiclo, finCiclo);
      const pagado = calcularPagado(t.nombre, finCiclo, fechaPago);
      const pagoSinInt = r2(Math.max(0, gasto + (ciclo.intereses || 0) + adelanto - reembolso));
      const restante = r2(pagoSinInt - pagado);
      const difActivos = diferidosActivosDe(t.nombre);
      const totalDifPendiente = r2(difActivos.reduce((s, d) => s + saldoPendienteDiferido(d), 0));
      const disponible = r2(Math.max(0, (t.limite || 0) - totalDifPendiente - restante));
      return [t.nombre, t.limite || 0, totalDifPendiente, disponible,
        inicioCiclo, finCiclo, fechaPago, ciclo.intereses || 0, ciclo.pagoMinimo || 0,
        gasto, diferidos, regulares, adelanto, pagoSinInt, reembolso, pagado, restante];
    });
    const enc = [["Tarjetas de Crédito"], [`Mes: ${mesLabel(mesActual)}`], [`Usuario: ${userEmail || ""}`], [`Generado: ${fmtDate(todayISO())}`], []];
    const csv = [...enc, headers, ...filas].map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `TDC_${mesActual}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const filasCiclo = tarjetas.map((t) => {
      const { inicioCiclo, finCiclo, fechaPago } = fechasCiclo(t);
      const { gasto, diferidos, regulares } = calcularGastoCiclo(t.nombre, inicioCiclo, finCiclo);
      const ciclo = ciclosMes[t.nombre] || {};
      const adelanto = calcularAdelanto(t.nombre, inicioCiclo, finCiclo);
      const reembolso = calcularReembolso(t.nombre, inicioCiclo, finCiclo);
      const pagado = calcularPagado(t.nombre, finCiclo, fechaPago);
      const pagoSinInt = r2(Math.max(0, gasto + (ciclo.intereses || 0) + adelanto - reembolso));
      const restante = r2(pagoSinInt - pagado);
      const difActivos = diferidosActivosDe(t.nombre);
      const totalDifPendiente = r2(difActivos.reduce((s, d) => s + saldoPendienteDiferido(d), 0));
      const disponible = r2(Math.max(0, (t.limite || 0) - totalDifPendiente - restante));
      return `<tr>
        <td>${t.nombre}</td><td>${inicioCiclo||"—"}</td><td>${finCiclo||"—"}</td><td>${fechaPago||"—"}</td>
        <td class="num">${fmt(ciclo.intereses||0)}</td><td class="num">${fmt(ciclo.pagoMinimo||0)}</td>
        <td class="num">${fmt(gasto)}</td><td class="num">${fmt(diferidos)}</td><td class="num">${fmt(regulares)}</td>
        <td class="num">${fmt(adelanto)}</td><td class="num">${fmt(pagoSinInt)}</td>
        <td class="num">${fmt(reembolso)}</td><td class="num">${fmt(pagado)}</td>
        <td class="num" style="color:${restante>0?"#c62828":"#2e7d32"}">${fmt(restante)}</td>
      </tr>`;
    }).join("");

    // Tabla resumen de límites y disponible
    const filasResumen = tarjetas.map((t) => {
      const { finCiclo, fechaPago } = fechasCiclo(t);
      const { gasto } = calcularGastoCiclo(t.nombre, fechasCiclo(t).inicioCiclo, finCiclo);
      const ciclo = ciclosMes[t.nombre] || {};
      const adelanto = calcularAdelanto(t.nombre, fechasCiclo(t).inicioCiclo, finCiclo);
      const reembolso = calcularReembolso(t.nombre, fechasCiclo(t).inicioCiclo, finCiclo);
      const pagado = calcularPagado(t.nombre, finCiclo, fechaPago);
      const pagoSinInt = r2(Math.max(0, gasto + (ciclo.intereses || 0) + adelanto - reembolso));
      const restante = r2(pagoSinInt - pagado);
      const difActivos = diferidosActivosDe(t.nombre);
      const totalDifPendiente = r2(difActivos.reduce((s, d) => s + saldoPendienteDiferido(d), 0));
      const disponible = r2(Math.max(0, (t.limite || 0) - totalDifPendiente - restante));
      const pctUsado = t.limite > 0 ? Math.round(((t.limite - disponible) / t.limite) * 100) : 0;
      return `<tr>
        <td>${t.nombre}</td>
        <td class="num">${fmt(t.limite || 0)}</td>
        <td class="num" style="color:#c62828">${fmt(totalDifPendiente)}</td>
        <td class="num" style="color:${restante>0?"#c62828":"#555"}">${fmt(restante)}</td>
        <td class="num" style="color:${disponible<=0?"#c62828":"#2e7d32"};font-weight:700">${fmt(disponible)}</td>
        <td class="num">${pctUsado}% usado</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>TDC ${mesLabel(mesActual)}</title>
      <style>body{font-family:Calibri,Arial,sans-serif;padding:24px}h1{font-size:18px;margin:0 0 4px}h2{font-size:13px;margin:18px 0 6px;color:#333}
      p.sub{font-size:11px;color:#555;margin:0 0 4px}
      table{width:100%;border-collapse:collapse;font-size:8px;margin-bottom:6px}th,td{border:1px solid #999;padding:3px 4px}
      th{background:#F4CCCC;font-weight:700;text-align:left}td.num{text-align:right}
      .resumen th{background:#FFF2CC}
      @media print{body{padding:0}}</style></head>
      <body><h1>Tarjetas de Crédito — ${mesLabel(mesActual)}</h1>
      <p class="sub">Usuario: ${userEmail||""} · Generado el ${fmtDate(todayISO())}</p>

      <h2>Límites y Disponible</h2>
      <table class="resumen"><thead><tr>
        <th>Tarjeta</th><th class="num">Límite</th><th class="num">Difs. Pendiente</th>
        <th class="num">Restante ciclo</th><th class="num">Disponible Real</th><th class="num">Uso</th>
      </tr></thead><tbody>${filasResumen}</tbody></table>

      <h2>Detalle del Ciclo</h2>
      <table><thead><tr><th>Tarjeta</th><th>Inicio</th><th>Corte</th><th>F.Pago</th>
        <th class="num">Intereses</th><th class="num">Pago Mín.</th><th class="num">Gasto</th>
        <th class="num">Difs.</th><th class="num">Regulares</th><th class="num">Adelanto</th>
        <th class="num">Pago S/Int.</th><th class="num">Reembolso</th><th class="num">Pagado</th><th class="num">Restante</th>
      </tr></thead><tbody>${filasCiclo}</tbody></table>
      <script>window.onload=()=>{window.print();}</script></body></html>`;
    const v = window.open("","_blank"); if(v){v.document.write(html);v.document.close();}
  }

  const inputSmall = { ...inputBase, fontSize: 12, padding: "5px 6px" };

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <Field label="Mes">
        <select value={mesActual} onChange={(e) => { setMesActual(e.target.value); setEditandoCicloId(null); }} style={{ ...inputBase, background: SHEET.azul }}>
          {mesesDisponibles.map((m) => <option key={m} value={m}>{mesLabel(m)}</option>)}
        </select>
      </Field>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn full onClick={exportarPDF} style={{ flex: 1 }}>📄 PDF</Btn>
        <Btn full onClick={exportarCSV} style={{ flex: 1 }}>📊 Excel</Btn>
      </div>
      {tarjetas.length === 0 && (
        <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin tarjetas activas. Configúralas en Datos → Cuentas → TDC.</p>
      )}
      {tarjetas.map((t) => {
        const { inicioCiclo, finCiclo, fechaPago } = fechasCiclo(t);
        const ciclo = ciclosMes[t.nombre] || {};
        const editando = editandoCicloId === t.nombre;
        const difActivos = diferidosActivosDe(t.nombre);
        const totalDifPendiente = r2(difActivos.reduce((s, d) => s + saldoPendienteDiferido(d), 0));
        const verDifs = verDiferidosId === t.nombre;
        const hoyStr = todayISO();

        // ¿El corte del ciclo seleccionado ya pasó hoy?
        const corteYaPaso = finCiclo && finCiclo <= hoyStr;

        // Si el corte ya pasó: finCiclo es el corte anterior, y el ciclo actual empieza al día siguiente
        // Si el corte NO ha pasado: todo es el ciclo actual (aún abierto), no hay "corte anterior"
        const cargosEnCiclo = r2(movimientos.filter(m =>
          m.mov === "Egreso" && m.cuenta === t.nombre &&
          m.fecha >= inicioCiclo && m.fecha <= finCiclo &&
          (m.tipo !== "Pago TDC" || (m.descripcion || "").includes("Ajuste"))
        ).reduce((s, m) => s + Number(m.cantidad), 0));

        // Pagado después del corte (solo aplica si el corte ya pasó)
        const pagadoCorteAnt = corteYaPaso ? calcularPagado(t.nombre, finCiclo, fechaPago) : 0;
        const pendienteCorteAnt = corteYaPaso ? r2(Math.max(0, cargosEnCiclo - pagadoCorteAnt)) : 0;

        // Ciclo actual = gastos después del finCiclo hasta hoy (solo si el corte ya pasó)
        const inicioCicloActual = finCiclo ? (() => {
          const d = new Date(finCiclo); d.setDate(d.getDate() + 1);
          return d.toISOString().slice(0, 10);
        })() : null;
        const cargosActual = (corteYaPaso && inicioCicloActual) ? r2(movimientos.filter(m =>
          m.mov === "Egreso" && m.cuenta === t.nombre &&
          m.fecha >= inicioCicloActual && m.fecha <= hoyStr &&
          m.tipo !== "Pago TDC"
        ).reduce((s, m) => s + Number(m.cantidad), 0)) : 0;

        // Si el ciclo está abierto: cargos del ciclo en curso (desde inicio hasta hoy)
        const cargosEnCurso = !corteYaPaso ? r2(movimientos.filter(m =>
          m.mov === "Egreso" && m.cuenta === t.nombre &&
          m.fecha >= inicioCiclo && m.fecha <= hoyStr &&
          (m.tipo !== "Pago TDC" || (m.descripcion || "").includes("Ajuste"))
        ).reduce((s, m) => s + Number(m.cantidad), 0)) : 0;

        // Adelantos dentro del ciclo en curso (pagos TDC hechos antes del corte)
        const adelantosCicloAbierto = !corteYaPaso ? r2(movimientos.filter(m =>
          m.mov === "Egreso" && m.tipo === "Pago TDC" &&
          (m.cuenta === t.nombre || m.categoria === t.nombre) &&
          m.fecha >= inicioCiclo && m.fecha <= hoyStr
        ).reduce((s, m) => s + Number(m.cantidad), 0)) : 0;

        // Disponible = Límite - Diferidos - Pendiente corte ant - Cargos ciclo actual (o en curso) + Adelantos del ciclo abierto
        const disponible = r2(Math.max(0, (t.limite || 0) - totalDifPendiente - pendienteCorteAnt - cargosActual - Math.max(0, cargosEnCurso - adelantosCicloAbierto)));

        return (
          <div key={t.nombre} style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, marginBottom: 14, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ background: SHEET.rosa, padding: "8px 12px", borderBottom: "1px solid " + SHEET.rosaBorde, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, fontStyle: "italic", margin: 0 }}>{t.nombre}</p>
                <p style={{ fontSize: 11, color: "#555", margin: "2px 0 0" }}>
                  Límite {fmt(t.limite)} · Corte día {t.diaCiclo}{t.anualidad ? " · Con anualidad" : ""}
                </p>
              </div>
              <button onClick={() => editando ? setEditandoCicloId(null) : abrirFormCiclo(t)} style={{
                fontSize: 11, fontWeight: 700, fontStyle: "italic", padding: "5px 10px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                border: `1px solid ${SHEET.rosaBorde}`, background: editando ? SHEET.rosa : "#fff"
              }}>{editando ? "Cancelar" : "✎ Este mes"}</button>
            </div>

            {/* Disponible real */}
            <div style={{ background: disponible > 0 ? SHEET.verde : SHEET.rosa, padding: "8px 12px", borderBottom: "1px solid " + SHEET.grisBorde }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>
                    Disponible: <span style={{ color: disponible > 0 ? SHEET.verdeBorde : SHEET.rosaBorde, fontSize: 15 }}>{fmt(disponible)}</span>
                  </p>
                  <p style={{ fontSize: 10, color: "#666", margin: "2px 0 0" }}>
                    {fmt(t.limite)} − {fmt(totalDifPendiente)} difs − {fmt(pendienteCorteAnt)} corte ant − {fmt(corteYaPaso ? cargosActual : Math.max(0, cargosEnCurso - adelantosCicloAbierto))} {corteYaPaso ? "ciclo actual" : "neto ciclo"}
                  </p>
                </div>
                {difActivos.length > 0 && (
                  <button onClick={() => setVerDiferidosId(verDifs ? null : t.nombre)} style={{
                    fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "3px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                    border: "1px solid " + SHEET.grisBorde, background: verDifs ? SHEET.amarillo : "#fff"
                  }}>{verDifs ? "▲" : `▼ Difs (${difActivos.length})`}</button>
                )}
              </div>
              {verDifs && (
                <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid " + SHEET.grisBorde }}>
                  {difActivos.map((dif) => (
                    <div key={dif.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: "#444" }}>{dif.nombre} · {(dif.plazoMeses || 0) - (dif.pagos || 0)} pagos restantes</span>
                      <b style={{ color: SHEET.rosaBorde }}>{fmt(saldoPendienteDiferido(dif))}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumen fijo — Límite y Diferidos */}
            <div style={{ padding: "10px 12px", background: "#fff", borderBottom: "1px solid " + SHEET.grisBorde }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11.5 }}>
                <div><span style={{ color: "#777", fontSize: 10 }}>Límite total</span><br /><b>{fmt(t.limite || 0)}</b></div>
                <div><span style={{ color: "#777", fontSize: 10 }}>Diferidos pendientes</span><br /><b style={{ color: SHEET.rosaBorde }}>{fmt(totalDifPendiente)}</b></div>
              </div>
            </div>

            {/* Corte anterior (solo si ya cerró) o Ciclo en curso */}
            {corteYaPaso ? (
              <div style={{ padding: "10px 12px", background: SHEET.gris, borderBottom: "1px solid " + SHEET.grisBorde }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#555", margin: "0 0 6px", fontStyle: "italic" }}>
                  🗓 Corte anterior: {fmtDate(inicioCiclo)} → {fmtDate(finCiclo)}
                  {fechaPago ? <span style={{ color: SHEET.rosaBorde }}> · Pagar antes: {fmtDate(fechaPago)}</span> : " · Configura días de pago ↑"}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 11.5 }}>
                  <div><span style={{ color: "#777", fontSize: 10 }}>Cargos del corte</span><br /><b>{fmt(cargosEnCiclo)}</b></div>
                  <div><span style={{ color: "#777", fontSize: 10 }}>Pagado</span><br /><b style={{ color: SHEET.verdeBorde }}>{fmt(pagadoCorteAnt)}</b></div>
                  <div><span style={{ color: "#777", fontSize: 10 }}>Pendiente</span><br />
                    <b style={{ color: pendienteCorteAnt > 0 ? SHEET.rosaBorde : SHEET.verdeBorde, fontSize: 13 }}>
                      {pendienteCorteAnt > 0 ? fmt(pendienteCorteAnt) : "✓ Al día"}
                    </b>
                  </div>
                </div>
                {(ciclo.intereses || 0) > 0 && <p style={{ fontSize: 11, color: SHEET.rosaBorde, fontStyle: "italic", margin: "6px 0 0" }}>⚠ Intereses: {fmt(ciclo.intereses)}</p>}
              </div>
            ) : (
              <div style={{ padding: "10px 12px", background: SHEET.gris, borderBottom: "1px solid " + SHEET.grisBorde }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#555", margin: "0 0 6px", fontStyle: "italic" }}>
                  🔄 Ciclo en curso: {fmtDate(inicioCiclo)} → {fmtDate(finCiclo)}
                  <span style={{ color: "#888", fontWeight: 400 }}> · Corta el {fmtDate(finCiclo)}</span>
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11.5 }}>
                  <div><span style={{ color: "#777", fontSize: 10 }}>Cargos a la fecha</span><br /><b>{fmt(cargosEnCurso)}</b></div>
                  <div><span style={{ color: "#777", fontSize: 10 }}>Disponible</span><br /><b style={{ color: disponible > 0 ? SHEET.verdeBorde : SHEET.rosaBorde }}>{fmt(disponible)}</b></div>
                </div>
              </div>
            )}

            {/* Ciclo actual (solo si el corte ya cerró) */}
            {corteYaPaso && (
              <div style={{ padding: "10px 12px", background: "#fff" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#555", margin: "0 0 6px", fontStyle: "italic" }}>
                  🔄 Ciclo actual (desde {inicioCicloActual ? fmtDate(inicioCicloActual) : "—"})
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11.5 }}>
                  <div><span style={{ color: "#777", fontSize: 10 }}>Cargos a la fecha</span><br /><b>{fmt(cargosActual)}</b></div>
                  <div><span style={{ color: "#777", fontSize: 10 }}>Disponible restante</span><br /><b style={{ color: disponible > 0 ? SHEET.verdeBorde : SHEET.rosaBorde }}>{fmt(disponible)}</b></div>
                </div>
              </div>
            )}

            {/* Formulario mensual */}
            {editando && (
              <div style={{ background: SHEET.gris, padding: "10px 12px", borderTop: "1px solid " + SHEET.grisBorde }}>
                <p style={{ fontSize: 12, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>Datos variables de este ciclo</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <Field label="Días para pagar">
                    <input type="text" inputMode="numeric" value={formCiclo.diasPago || ""} onChange={(e) => setFormCiclo((p) => ({ ...p, diasPago: e.target.value }))} style={inputSmall} placeholder="Ej. 20" />
                  </Field>
                  <Field label="Pago mínimo">
                    <input type="text" inputMode="decimal" value={formCiclo.pagoMinimo || ""} onChange={(e) => setFormCiclo((p) => ({ ...p, pagoMinimo: e.target.value }))} style={inputSmall} placeholder="$0" />
                  </Field>
                  <Field label="Intereses cobrados">
                    <input type="text" inputMode="decimal" value={formCiclo.intereses || ""} onChange={(e) => setFormCiclo((p) => ({ ...p, intereses: e.target.value }))} style={inputSmall} placeholder="$0" />
                  </Field>
                </div>
                <Btn primary full onClick={() => guardarCiclo(t.nombre)} style={{ marginTop: 8 }}>Guardar</Btn>
              </div>
            )}
          </div>
        );
      })}
      {tarjetas.length > 0 && (
        <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ background: SHEET.amarillo, padding: "7px 12px", borderBottom: "1px solid #e6d200" }}>
            <span style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic" }}>Resumen {mesLabel(mesActual)}</span>
          </div>
          <div style={{ padding: "10px 12px", background: "#fff" }}>
            {(() => {
              let totGasto=0,totDif=0,totReg=0,totAd=0,totReem=0,totPagado=0,totRest=0,totInt=0;
              tarjetas.forEach((t) => {
                const {inicioCiclo,finCiclo,fechaPago} = fechasCiclo(t);
                const {gasto,diferidos,regulares} = calcularGastoCiclo(t.nombre,inicioCiclo,finCiclo);
                const ciclo = ciclosMes[t.nombre]||{};
                const adelanto = calcularAdelanto(t.nombre,inicioCiclo,finCiclo);
                const reembolso = calcularReembolso(t.nombre,inicioCiclo,finCiclo);
                const pagado = calcularPagado(t.nombre,finCiclo,fechaPago);
                const pagoSinInt = r2(Math.max(0,gasto+(ciclo.intereses||0)+adelanto-reembolso));
                totGasto+=gasto;totDif+=diferidos;totReg+=regulares;
                totAd+=adelanto;totReem+=reembolso;totPagado+=pagado;
                totRest+=pagoSinInt-pagado;totInt+=ciclo.intereses||0;
              });
              return [["Gasto total",totGasto,false],["Total diferidos",totDif,false],["Total regulares",totReg,false],
                ["Total intereses",totInt,true],["Total adelantos",totAd,false],["Total pagado",totPagado,false],
                ["Total restante",totRest,totRest>0]
              ].map(([label,val,isRed]) => (
                <div key={label} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                  <span style={{color:"#555"}}>{label}</span>
                  <b style={{color:isRed?SHEET.rosaBorde:"#333"}}>{fmt(val)}</b>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}


function CatalogosTab({ catalog, setCatalog, guardarAhora, movimientos }) {
  const [section, setSection] = useState("cuentas");
  function addToList(path, value) {
    const next = JSON.parse(JSON.stringify(catalog));
    let ref = next;
    for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
    const key = path[path.length - 1];
    if (!Array.isArray(ref[key])) ref[key] = [];
    if (!ref[key].includes(value)) ref[key].push(value);
    setCatalog(next);
    guardarAhora(next);
  }
  function removeFromList(path, value) {
    const next = JSON.parse(JSON.stringify(catalog));
    let ref = next;
    for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
    const key = path[path.length - 1];
    ref[key] = (ref[key] || []).filter((v) => v !== value);
    setCatalog(next);
    guardarAhora(next);
  }
  const [newCuentaTipo, setNewCuentaTipo] = useState(catalog.metodos[0] || "TDC");
  const [newCatTipo, setNewCatTipo] = useState(Object.keys(catalog.categorias)[0] || "");
  const [newSubcatCategoria, setNewSubcatCategoria] = useState("");
  const [newIngresoTipo, setNewIngresoTipo] = useState(catalog.ingresoTipos[0] || "");
  const [memNombre, setMemNombre] = useState("");
  const [memCategoria, setMemCategoria] = useState("");
  const [memMetodo, setMemMetodo] = useState(catalog.metodos[0] || "TDC");
  const [memCuenta, setMemCuenta] = useState("");
  const [memCosto, setMemCosto] = useState("");
  const [memFrecuencia, setMemFrecuencia] = useState("Mensual");
  const [memTipo, setMemTipo] = useState("Automático");
  const [memDia, setMemDia] = useState("1");
  const [editandoMemId, setEditandoMemId] = useState(null);
  const [servNombre, setServNombre] = useState("");
  const [servCategoria, setServCategoria] = useState("");
  const [servMetodo, setServMetodo] = useState(catalog.metodos[0] || "TDC");
  const [servCuenta, setServCuenta] = useState("");
  const [servCosto, setServCosto] = useState("");
  const [servFrecuencia, setServFrecuencia] = useState("Mensual");
  const [servTipo, setServTipo] = useState("Automático");
  const [servDia, setServDia] = useState("1");
  const [servVariable, setServVariable] = useState(false);
  const [editandoServId, setEditandoServId] = useState(null);
  const [segNombre, setSegNombre] = useState("");
  const [segCategoria, setSegCategoria] = useState("");
  const [segPoliza, setSegPoliza] = useState("");
  const [segMetodo, setSegMetodo] = useState(catalog.metodos[0] || "TDC");
  const [segCuenta, setSegCuenta] = useState("");
  const [segCosto, setSegCosto] = useState("");
  const [segFrecuencia, setSegFrecuencia] = useState("Anual");
  const [segTipo, setSegTipo] = useState("Manual");
  const [segDia, setSegDia] = useState("1");
  const [editandoSegId, setEditandoSegId] = useState(null);
  const [ahoNombre, setAhoNombre] = useState("");
  const [ahoCategoria, setAhoCategoria] = useState("");
  const [ahoDescripcion, setAhoDescripcion] = useState("");
  const [ahoMetodo, setAhoMetodo] = useState(catalog.metodos[0] || "Efectivo");
  const [ahoCuenta, setAhoCuenta] = useState("");
  const [ahoMeta, setAhoMeta] = useState("");
  const [ahoPlazo, setAhoPlazo] = useState("");
  const [ahoAportacion, setAhoAportacion] = useState("");
  const [ahoFrecuencia, setAhoFrecuencia] = useState("Mensual");
  const [editandoAhoId, setEditandoAhoId] = useState(null);
  const [invNombre, setInvNombre] = useState("");
  const [invCategoria, setInvCategoria] = useState("");
  const [invDescripcion, setInvDescripcion] = useState("");
  const [invObjetivo, setInvObjetivo] = useState("");
  const [invMetodo, setInvMetodo] = useState(catalog.metodos[0] || "Efectivo");
  const [invCuenta, setInvCuenta] = useState("");
  const [invMeta, setInvMeta] = useState("");
  const [invPlazo, setInvPlazo] = useState("");
  const [invAportacion, setInvAportacion] = useState("");
  const [invFrecuencia, setInvFrecuencia] = useState("Mensual");
  const [editandoInvId, setEditandoInvId] = useState(null);
  const [prbVista, setPrbVista] = useState("bancario");
  const [prbNombre, setPrbNombre] = useState("");
  const [prbCategoria, setPrbCategoria] = useState("Bancario");
  const [prbMetodo, setPrbMetodo] = useState(catalog.metodos[0] || "Efectivo");
  const [prbCuenta, setPrbCuenta] = useState("");
  const [prbMontoFinanciado, setPrbMontoFinanciado] = useState("");
  const [prbPagoPeriodo, setPrbPagoPeriodo] = useState("");
  const [prbNumPagos, setPrbNumPagos] = useState("");
  const [prbFrecuencia, setPrbFrecuencia] = useState("Mensual");
  const [prbDiasPago, setPrbDiasPago] = useState(""); // ej "15,31" para quincenales
  const [prbPagosPrevios, setPrbPagosPrevios] = useState("");
  const [editandoPrbId, setEditandoPrbId] = useState(null);
  const [prtNombre, setPrtNombre] = useState("");
  const [prtDireccion, setPrtDireccion] = useState("a Tercero");
  const [prtNota, setPrtNota] = useState("");
  const [editandoPrtId, setEditandoPrtId] = useState(null);
  const [famNombre, setFamNombre] = useState("");
  const [famParentesco, setFamParentesco] = useState("");
  const [famCategoria, setFamCategoria] = useState("");
  const [famMetodo, setFamMetodo] = useState(catalog.metodos[0] || "Efectivo");
  const [famCuenta, setFamCuenta] = useState("");
  const [famMeta, setFamMeta] = useState("");
  const [famPlazo, setFamPlazo] = useState("");
  const [famAportacion, setFamAportacion] = useState("");
  const [famFrecuencia, setFamFrecuencia] = useState("Mensual");
  const [editandoFamId, setEditandoFamId] = useState(null);

  function limpiarFormMembresia() {
    setMemNombre(""); setMemCategoria(""); setMemMetodo(catalog.metodos[0] || "TDC"); setMemCuenta("");
    setMemCosto(""); setMemFrecuencia("Mensual"); setMemTipo("Automático"); setMemDia("1"); setEditandoMemId(null);
  }

  function guardarMembresia() {
    if (!memNombre || !memCosto || parseFloat(memCosto) <= 0) return;
    const mem = {
      id: editandoMemId || uid(), activa: true, nombre: memNombre, categoria: memCategoria,
      metodo: memMetodo, cuenta: memCuenta, costo: parseFloat(memCosto),
      frecuencia: memFrecuencia, tipoPago: memTipo, diaPago: parseInt(memDia) || 1,
      ultimoPago: ""
    };
    const lista = catalog.membresias || [];
    const yaExiste = lista.some((m) => m.id === mem.id);
    const nuevasMembresias = yaExiste ? lista.map((m) => (m.id === mem.id ? { ...m, ...mem } : m)) : [mem, ...lista];
    const subcatsActuales = catalog.subcategorias["Membresías"] || [];
    const nuevasSubcats = subcatsActuales.includes(memNombre) ? subcatsActuales : [...subcatsActuales, memNombre];
    const actualizado = {
      ...catalog,
      membresias: nuevasMembresias,
      subcategorias: { ...catalog.subcategorias, "Membresías": nuevasSubcats }
    };
    setCatalog(actualizado);
    guardarAhora(actualizado);
    limpiarFormMembresia();
  }

  function editarMembresia(m) {
    setEditandoMemId(m.id); setMemNombre(m.nombre); setMemCategoria(m.categoria); setMemMetodo(m.metodo);
    setMemCuenta(m.cuenta); setMemCosto(String(m.costo)); setMemFrecuencia(m.frecuencia); setMemTipo(m.tipoPago); setMemDia(String(m.diaPago));
  }

  function toggleActivaMembresia(id) {
    const actualizado = { ...catalog, membresias: (catalog.membresias || []).map((m) => (m.id === id ? { ...m, activa: !m.activa } : m)) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function eliminarMembresia(id) {
    const actualizado = { ...catalog, membresias: (catalog.membresias || []).filter((m) => m.id !== id) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function limpiarFormServicio() {
    setServNombre(""); setServCategoria(""); setServMetodo(catalog.metodos[0] || "TDC"); setServCuenta("");
    setServCosto(""); setServFrecuencia("Mensual"); setServTipo("Automático"); setServDia("1"); setServVariable(false); setEditandoServId(null);
  }

  function guardarServicio() {
    if (!servNombre) return;
    if (!servVariable && (!servCosto || parseFloat(servCosto) <= 0)) return;
    const serv = {
      id: editandoServId || uid(), activa: true, nombre: servNombre, categoria: servCategoria,
      metodo: servMetodo, cuenta: servCuenta, costo: servVariable ? 0 : parseFloat(servCosto), esVariable: servVariable,
      frecuencia: servFrecuencia, tipoPago: servTipo, diaPago: parseInt(servDia) || 1,
      ultimoPago: ""
    };
    const lista = catalog.servicios || [];
    const yaExiste = lista.some((s) => s.id === serv.id);
    const nuevosServicios = yaExiste ? lista.map((s) => (s.id === serv.id ? { ...s, ...serv } : s)) : [serv, ...lista];
    const subcatsActuales = catalog.subcategorias["Servicios"] || [];
    const nuevasSubcats = subcatsActuales.includes(servNombre) ? subcatsActuales : [...subcatsActuales, servNombre];
    const actualizado = {
      ...catalog,
      servicios: nuevosServicios,
      subcategorias: { ...catalog.subcategorias, "Servicios": nuevasSubcats }
    };
    setCatalog(actualizado);
    guardarAhora(actualizado);
    limpiarFormServicio();
  }

  function editarServicio(s) {
    setEditandoServId(s.id); setServNombre(s.nombre); setServCategoria(s.categoria); setServMetodo(s.metodo);
    setServCuenta(s.cuenta); setServCosto(s.esVariable ? "" : String(s.costo)); setServFrecuencia(s.frecuencia); setServTipo(s.tipoPago); setServDia(String(s.diaPago)); setServVariable(!!s.esVariable);
  }

  function toggleActivaServicio(id) {
    const actualizado = { ...catalog, servicios: (catalog.servicios || []).map((s) => (s.id === id ? { ...s, activa: !s.activa } : s)) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function eliminarServicio(id) {
    const actualizado = { ...catalog, servicios: (catalog.servicios || []).filter((s) => s.id !== id) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function limpiarFormSeguro() {
    setSegNombre(""); setSegCategoria(""); setSegPoliza(""); setSegMetodo(catalog.metodos[0] || "TDC"); setSegCuenta("");
    setSegCosto(""); setSegFrecuencia("Anual"); setSegTipo("Manual"); setSegDia("1"); setEditandoSegId(null);
  }

  function guardarSeguro() {
    if (!segNombre || !segCosto || parseFloat(segCosto) <= 0) return;
    const seg = {
      id: editandoSegId || uid(), activa: true, nombre: segNombre, categoria: segCategoria, poliza: segPoliza,
      metodo: segMetodo, cuenta: segCuenta, costo: parseFloat(segCosto),
      frecuencia: segFrecuencia, tipoPago: segTipo, diaPago: parseInt(segDia) || 1,
      ultimoPago: ""
    };
    const lista = catalog.seguros || [];
    const yaExiste = lista.some((s) => s.id === seg.id);
    const nuevosSeguros = yaExiste ? lista.map((s) => (s.id === seg.id ? { ...s, ...seg } : s)) : [seg, ...lista];
    const subcatsActuales = catalog.subcategorias["Seguros"] || [];
    const nuevasSubcats = subcatsActuales.includes(segNombre) ? subcatsActuales : [...subcatsActuales, segNombre];
    const actualizado = {
      ...catalog,
      seguros: nuevosSeguros,
      subcategorias: { ...catalog.subcategorias, "Seguros": nuevasSubcats }
    };
    setCatalog(actualizado);
    guardarAhora(actualizado);
    limpiarFormSeguro();
  }

  function editarSeguro(s) {
    setEditandoSegId(s.id); setSegNombre(s.nombre); setSegCategoria(s.categoria); setSegPoliza(s.poliza || ""); setSegMetodo(s.metodo);
    setSegCuenta(s.cuenta); setSegCosto(String(s.costo)); setSegFrecuencia(s.frecuencia); setSegTipo(s.tipoPago); setSegDia(String(s.diaPago));
  }

  function toggleActivaSeguro(id) {
    const actualizado = { ...catalog, seguros: (catalog.seguros || []).map((s) => (s.id === id ? { ...s, activa: !s.activa } : s)) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function eliminarSeguro(id) {
    const actualizado = { ...catalog, seguros: (catalog.seguros || []).filter((s) => s.id !== id) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function limpiarFormAhorro() {
    setAhoNombre(""); setAhoCategoria(""); setAhoDescripcion(""); setAhoMetodo(catalog.metodos[0] || "Efectivo"); setAhoCuenta("");
    setAhoMeta(""); setAhoPlazo(""); setAhoAportacion(""); setAhoFrecuencia("Mensual"); setEditandoAhoId(null);
  }

  function guardarAhorro() {
    const meta = parseFloat(ahoMeta) || 0;
    const plazo = parseInt(ahoPlazo) || 0;
    const aportacion = parseFloat(ahoAportacion) || 0;
    if (!ahoNombre || (meta <= 0 && plazo <= 0 && aportacion <= 0)) return;
    const metaFinal = meta > 0 ? meta : Math.round(aportacion * plazo * 100) / 100;
    const plazoFinal = plazo > 0 ? plazo : (aportacion > 0 && meta > 0 ? Math.ceil(meta / aportacion) : 0);
    const aportacionFinal = aportacion > 0 ? aportacion : (plazoFinal > 0 && metaFinal > 0 ? Math.round((metaFinal / plazoFinal) * 100) / 100 : 0);
    const aho = {
      id: editandoAhoId || uid(), activa: true, nombre: ahoNombre, categoria: ahoCategoria, descripcion: ahoDescripcion,
      metodo: ahoMetodo, cuenta: ahoCuenta, meta: metaFinal, plazoMeses: plazoFinal,
      aportacion: aportacionFinal, frecuencia: ahoFrecuencia, acumulado: 0, ultimoPago: ""
    };
    const lista = catalog.ahorros || [];
    const yaExiste = lista.some((a) => a.id === aho.id);
    const nuevosAhorros = yaExiste ? lista.map((a) => (a.id === aho.id ? { ...a, ...aho } : a)) : [aho, ...lista];
    const subcatsActuales = catalog.subcategorias["Ahorro"] || [];
    const nuevasSubcats = subcatsActuales.includes(ahoNombre) ? subcatsActuales : [...subcatsActuales, ahoNombre];
    const actualizado = {
      ...catalog,
      ahorros: nuevosAhorros,
      categorias: { ...catalog.categorias, "Ahorro": (catalog.categorias["Ahorro"] || []).includes(ahoNombre) ? catalog.categorias["Ahorro"] : [...(catalog.categorias["Ahorro"] || []), ahoNombre] },
      subcategorias: { ...catalog.subcategorias, "Ahorro": nuevasSubcats }
    };
    setCatalog(actualizado);
    guardarAhora(actualizado);
    limpiarFormAhorro();
  }

  function editarAhorro(a) {
    setEditandoAhoId(a.id); setAhoNombre(a.nombre); setAhoCategoria(a.categoria); setAhoDescripcion(a.descripcion || ""); setAhoMetodo(a.metodo);
    setAhoCuenta(a.cuenta); setAhoMeta(String(a.meta)); setAhoPlazo(String(a.plazoMeses)); setAhoAportacion(String(a.aportacion));
    setAhoFrecuencia(a.frecuencia || "Mensual");
  }

  function toggleActivaAhorro(id) {
    const actualizado = { ...catalog, ahorros: (catalog.ahorros || []).map((a) => (a.id === id ? { ...a, activa: !a.activa } : a)) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function eliminarAhorro(id) {
    const actualizado = { ...catalog, ahorros: (catalog.ahorros || []).filter((a) => a.id !== id) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function limpiarFormInversion() {
    setInvNombre(""); setInvCategoria(""); setInvDescripcion(""); setInvObjetivo(""); setInvMetodo(catalog.metodos[0] || "Efectivo"); setInvCuenta("");
    setInvMeta(""); setInvPlazo(""); setInvAportacion(""); setEditandoInvId(null);
  }

  function limpiarFormInversion() {
    setInvNombre(""); setInvCategoria(""); setInvDescripcion(""); setInvObjetivo(""); setInvMetodo(catalog.metodos[0] || "Efectivo"); setInvCuenta("");
    setInvMeta(""); setInvPlazo(""); setInvAportacion(""); setInvFrecuencia("Mensual"); setEditandoInvId(null);
  }

  function guardarInversion() {
    const meta = parseFloat(invMeta) || 0;
    const plazo = parseInt(invPlazo) || 0;
    const aportacion = parseFloat(invAportacion) || 0;
    if (!invNombre || (meta <= 0 && plazo <= 0 && aportacion <= 0)) return;
    const metaFinal = meta > 0 ? meta : Math.round(aportacion * plazo * 100) / 100;
    const plazoFinal = plazo > 0 ? plazo : (aportacion > 0 && meta > 0 ? Math.ceil(meta / aportacion) : 0);
    const aportacionFinal = aportacion > 0 ? aportacion : (plazoFinal > 0 && metaFinal > 0 ? Math.round((metaFinal / plazoFinal) * 100) / 100 : 0);
    const inv = {
      id: editandoInvId || uid(), activa: true, nombre: invNombre, categoria: invCategoria, descripcion: invDescripcion, objetivo: invObjetivo,
      metodo: invMetodo, cuenta: invCuenta, meta: metaFinal, plazoMeses: plazoFinal,
      aportacion: aportacionFinal, frecuencia: invFrecuencia, acumulado: 0, ultimoPago: ""
    };
    const lista = catalog.inversiones || [];
    const yaExiste = lista.some((i) => i.id === inv.id);
    const nuevasInversiones = yaExiste ? lista.map((i) => (i.id === inv.id ? { ...i, ...inv } : i)) : [inv, ...lista];
    const subcatsActuales = catalog.subcategorias["Inversión"] || [];
    const nuevasSubcats = subcatsActuales.includes(invNombre) ? subcatsActuales : [...subcatsActuales, invNombre];
    const actualizado = {
      ...catalog,
      inversiones: nuevasInversiones,
      categorias: { ...catalog.categorias, "Inversión": (catalog.categorias["Inversión"] || []).includes(invNombre) ? catalog.categorias["Inversión"] : [...(catalog.categorias["Inversión"] || []), invNombre] },
      subcategorias: { ...catalog.subcategorias, "Inversión": nuevasSubcats }
    };
    setCatalog(actualizado);
    guardarAhora(actualizado);
    limpiarFormInversion();
  }

  function editarInversion(i) {
    setEditandoInvId(i.id); setInvNombre(i.nombre); setInvCategoria(i.categoria); setInvDescripcion(i.descripcion || ""); setInvObjetivo(i.objetivo || ""); setInvMetodo(i.metodo);
    setInvCuenta(i.cuenta); setInvMeta(String(i.meta)); setInvPlazo(String(i.plazoMeses)); setInvAportacion(String(i.aportacion));
    setInvFrecuencia(i.frecuencia || "Mensual");
  }

  function toggleActivaInversion(id) {
    const actualizado = { ...catalog, inversiones: (catalog.inversiones || []).map((i) => (i.id === id ? { ...i, activa: !i.activa } : i)) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function eliminarInversion(id) {
    const actualizado = { ...catalog, inversiones: (catalog.inversiones || []).filter((i) => i.id !== id) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function limpiarFormPrestamoBancario() {
    setPrbNombre(""); setPrbCategoria("Bancario"); setPrbMetodo(catalog.metodos[0] || "Efectivo"); setPrbCuenta("");
    setPrbMontoFinanciado(""); setPrbPagoPeriodo(""); setPrbNumPagos(""); setPrbFrecuencia("Mensual");
    setPrbDiasPago(""); setPrbPagosPrevios(""); setEditandoPrbId(null);
  }

  function guardarPrestamoBancario() {
    if (!prbNombre || !prbPagoPeriodo || parseFloat(prbPagoPeriodo) <= 0 || !prbNumPagos || parseInt(prbNumPagos) <= 0) return;
    const pagoPeriodo = parseFloat(prbPagoPeriodo);
    const numPagos = parseInt(prbNumPagos);
    const pagosPrevios = Math.min(Math.max(0, parseInt(prbPagosPrevios) || 0), numPagos - 1);
    const totalAPagar = Math.round(pagoPeriodo * numPagos * 100) / 100;
    const acumuladoInicial = Math.round(pagosPrevios * pagoPeriodo * 100) / 100;
    const existente = (catalog.prestamosBancarios || []).find((p) => p.id === editandoPrbId);
    const pb = {
      id: editandoPrbId || uid(), activa: true, nombre: prbNombre, categoria: prbCategoria,
      metodo: prbMetodo, cuenta: prbCuenta,
      montoFinanciado: parseFloat(prbMontoFinanciado) || 0,
      pagoPeriodo, numPagos, frecuencia: prbFrecuencia, diasPago: prbDiasPago, totalAPagar, pagosPrevios,
      acumulado: existente ? existente.acumulado : acumuladoInicial,
      ultimoPago: existente ? existente.ultimoPago : ""
    };
    const lista = catalog.prestamosBancarios || [];
    const yaExiste = lista.some((p) => p.id === pb.id);
    const nuevosPrestamos = yaExiste ? lista.map((p) => (p.id === pb.id ? { ...p, ...pb } : p)) : [pb, ...lista];
    const subcatsActuales = catalog.subcategorias[prbCategoria] || [];
    const nuevasSubcats = subcatsActuales.includes(prbNombre) ? subcatsActuales : [...subcatsActuales, prbNombre];
    const actualizado = {
      ...catalog,
      prestamosBancarios: nuevosPrestamos,
      subcategorias: { ...catalog.subcategorias, [prbCategoria]: nuevasSubcats }
    };
    setCatalog(actualizado);
    guardarAhora(actualizado);
    limpiarFormPrestamoBancario();
  }

  function editarPrestamoBancario(p) {
    setEditandoPrbId(p.id); setPrbNombre(p.nombre); setPrbCategoria(p.categoria); setPrbMetodo(p.metodo);
    setPrbCuenta(p.cuenta); setPrbMontoFinanciado(String(p.montoFinanciado || ""));
    setPrbPagoPeriodo(String(p.pagoPeriodo || "")); setPrbNumPagos(String(p.numPagos || ""));
    setPrbFrecuencia(p.frecuencia || "Mensual"); setPrbDiasPago(p.diasPago || ""); setPrbPagosPrevios(String(p.pagosPrevios || 0));
  }

  function toggleActivaPrestamoBancario(id) {
    const actualizado = { ...catalog, prestamosBancarios: (catalog.prestamosBancarios || []).map((p) => (p.id === id ? { ...p, activa: !p.activa } : p)) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function eliminarPrestamoBancario(id) {
    const actualizado = { ...catalog, prestamosBancarios: (catalog.prestamosBancarios || []).filter((p) => p.id !== id) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function limpiarFormPrestamoTercero() {
    setPrtNombre(""); setPrtDireccion("a Tercero"); setPrtNota(""); setEditandoPrtId(null);
  }

  function guardarPrestamoTercero() {
    if (!prtNombre) return;
    const pt = {
      id: editandoPrtId || uid(), activa: true, nombre: prtNombre, direccion: prtDireccion, nota: prtNota
    };
    const lista = catalog.prestamosTerceros || [];
    const yaExiste = lista.some((p) => p.id === pt.id);
    const nuevosPrestamos = yaExiste ? lista.map((p) => (p.id === pt.id ? { ...p, ...pt } : p)) : [pt, ...lista];
    const subcatsActuales = catalog.subcategorias[prtDireccion] || [];
    const nuevasSubcats = subcatsActuales.includes(prtNombre) ? subcatsActuales : [...subcatsActuales, prtNombre];
    const actualizado = {
      ...catalog,
      prestamosTerceros: nuevosPrestamos,
      subcategorias: { ...catalog.subcategorias, [prtDireccion]: nuevasSubcats }
    };
    setCatalog(actualizado);
    guardarAhora(actualizado);
    limpiarFormPrestamoTercero();
  }

  function editarPrestamoTercero(p) {
    setEditandoPrtId(p.id); setPrtNombre(p.nombre); setPrtDireccion(p.direccion); setPrtNota(p.nota || "");
  }

  function toggleActivaPrestamoTercero(id) {
    const actualizado = { ...catalog, prestamosTerceros: (catalog.prestamosTerceros || []).map((p) => (p.id === id ? { ...p, activa: !p.activa } : p)) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function eliminarPrestamoTercero(id) {
    const actualizado = { ...catalog, prestamosTerceros: (catalog.prestamosTerceros || []).filter((p) => p.id !== id) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function limpiarFormFamiliar() {
    setFamNombre(""); setFamParentesco(""); setFamCategoria(""); setFamMetodo(catalog.metodos[0] || "Efectivo");
    setFamCuenta(""); setFamMeta(""); setFamPlazo(""); setFamAportacion(""); setFamFrecuencia("Mensual"); setEditandoFamId(null);
  }

  function guardarFamiliar() {
    const meta = parseFloat(famMeta) || 0;
    const plazo = parseInt(famPlazo) || 0;
    const aportacion = parseFloat(famAportacion) || 0;
    if (!famNombre || (meta <= 0 && plazo <= 0 && aportacion <= 0)) return;
    const metaFinal = meta > 0 ? meta : Math.round(aportacion * plazo * 100) / 100;
    const plazoFinal = plazo > 0 ? plazo : (aportacion > 0 && meta > 0 ? Math.ceil(meta / aportacion) : 0);
    const aportacionFinal = aportacion > 0 ? aportacion : (plazoFinal > 0 && metaFinal > 0 ? Math.round((metaFinal / plazoFinal) * 100) / 100 : 0);
    const existente = (catalog.familiares || []).find((f) => f.id === editandoFamId);
    const fam = {
      id: editandoFamId || uid(), activa: true, nombre: famNombre, parentesco: famParentesco,
      categoria: famCategoria, metodo: famMetodo, cuenta: famCuenta,
      meta: metaFinal, plazoMeses: plazoFinal, aportacion: aportacionFinal, frecuencia: famFrecuencia,
      acumuladoAport: existente ? existente.acumuladoAport : 0,
      acumuladoTDC: existente ? existente.acumuladoTDC : 0,
      ultimoPago: existente ? existente.ultimoPago : ""
    };
    const lista = catalog.familiares || [];
    const yaExiste = lista.some((f) => f.id === fam.id);
    const nuevosFamiliares = yaExiste ? lista.map((f) => (f.id === fam.id ? { ...f, ...fam } : f)) : [fam, ...lista];
    const subcatsAport = catalog.subcategorias["Aportación"] || [];
    const nuevasSubcatsAport = subcatsAport.includes(famNombre) ? subcatsAport : [...subcatsAport, famNombre];
    const subcatsTDC = catalog.subcategorias["Pago TDC Familiar"] || [];
    const nuevasSubcatsTDC = subcatsTDC.includes(famNombre) ? subcatsTDC : [...subcatsTDC, famNombre];
    const actualizado = {
      ...catalog,
      familiares: nuevosFamiliares,
      subcategorias: { ...catalog.subcategorias, "Aportación": nuevasSubcatsAport, "Pago TDC Familiar": nuevasSubcatsTDC }
    };
    setCatalog(actualizado);
    guardarAhora(actualizado);
    limpiarFormFamiliar();
  }

  function editarFamiliar(f) {
    setEditandoFamId(f.id); setFamNombre(f.nombre); setFamParentesco(f.parentesco || "");
    setFamCategoria(f.categoria || ""); setFamMetodo(f.metodo || catalog.metodos[0] || "Efectivo");
    setFamCuenta(f.cuenta || ""); setFamMeta(String(f.meta || "")); setFamPlazo(String(f.plazoMeses || ""));
    setFamAportacion(String(f.aportacion || "")); setFamFrecuencia(f.frecuencia || "Mensual");
  }

  function toggleActivaFamiliar(id) {
    const actualizado = { ...catalog, familiares: (catalog.familiares || []).map((f) => (f.id === id ? { ...f, activa: !f.activa } : f)) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function eliminarFamiliar(id) {
    const actualizado = { ...catalog, familiares: (catalog.familiares || []).filter((f) => f.id !== id) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  const cuentasMemDisponibles = catalog.cuentas[memMetodo] || [];
  const cuentasServDisponibles = catalog.cuentas[servMetodo] || [];
  const cuentasSegDisponibles = catalog.cuentas[segMetodo] || [];
  const cuentasPrbDisponibles = catalog.cuentas[prbMetodo] || [];
  const cuentasFamDisponibles = catalog.cuentas[famMetodo] || [];
  const sections = [
    { id: "cuentas", label: "Cuentas" }, { id: "egresos", label: "Egresos" },
    { id: "ingresos", label: "Ingresos" },
    { id: "lugares", label: "Lugares" }, { id: "presupuestos", label: "Presupuesto" }
  ];
  const categoriasDelTipo = catalog.categorias[newCatTipo] || [];
  const subcatActual = newSubcatCategoria && categoriasDelTipo.includes(newSubcatCategoria) ? newSubcatCategoria : (categoriasDelTipo[0] || "");

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {sections.map((s) => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            padding: "6px 10px", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
            border: section === s.id ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
            background: section === s.id ? SHEET.azul : "#fff"
          }}>{s.label}</button>
        ))}
      </div>

      {section === "cuentas" && (
        <div>
          <Field label="Método">
            <select value={newCuentaTipo} onChange={(e) => setNewCuentaTipo(e.target.value)} style={inputBase}>
              {catalog.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          {newCuentaTipo === "TDC" ? (
            <TDCConfigEditor catalog={catalog} setCatalog={setCatalog} guardarAhora={guardarAhora} />
          ) : (
            <ListEditor title={`Cuentas / tarjetas de ${newCuentaTipo}`} items={catalog.cuentas[newCuentaTipo] || []}
              onAdd={(v) => addToList(["cuentas", newCuentaTipo], v)} onRemove={(v) => removeFromList(["cuentas", newCuentaTipo], v)} />
          )}
        </div>
      )}
      {section === "egresos" && (
        <div>
          <Field label="Tipo de gasto">
            <select value={newCatTipo} onChange={(e) => { setNewCatTipo(e.target.value); setNewSubcatCategoria(""); }} style={inputBase}>
              {Object.keys(catalog.categorias).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          {newCatTipo === "Ahorro" ? (
            <div>
              <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>
                  {editandoAhoId ? "Editar ahorro" : "Agregar ahorro"}
                </p>
                <Field label="Nombre">
                  <input type="text" value={ahoNombre} onChange={(e) => setAhoNombre(e.target.value)} style={inputBase} placeholder="Ej. Laptop, Viaje" />
                </Field>
                <Field label="Categoría">
                  <input type="text" value={ahoCategoria} onChange={(e) => setAhoCategoria(e.target.value)} style={inputBase} placeholder="Ej. Tecnología, Viajes" />
                </Field>
                <Field label="Descripción (opcional)">
                  <input type="text" value={ahoDescripcion} onChange={(e) => setAhoDescripcion(e.target.value)} style={inputBase} />
                </Field>
                <Field label="Método">
                  <select value={ahoMetodo} onChange={(e) => { setAhoMetodo(e.target.value); setAhoCuenta(""); }} style={inputBase}>
                    {catalog.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                {(catalog.cuentas[ahoMetodo] || []).length > 0 && (
                  <Field label="Cuenta">
                    <select value={ahoCuenta} onChange={(e) => setAhoCuenta(e.target.value)} style={inputBase}>
                      <option value="">Selecciona...</option>
                      {(catalog.cuentas[ahoMetodo] || []).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                )}
                <Field label="Frecuencia de aportación">
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {["Semanal", "Quincenal", "Mensual", "Trimestral"].map((f) => (
                      <button key={f} onClick={() => setAhoFrecuencia(f)} style={{
                        padding: "6px 10px", fontSize: 11, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                        border: ahoFrecuencia === f ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                        background: ahoFrecuencia === f ? SHEET.azul : "#fff"
                      }}>{f}</button>
                    ))}
                  </div>
                </Field>
                <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "0 0 8px" }}>Llena dos campos — el tercero se calcula solo.</p>
                <Field label="Meta (total a ahorrar)">
                  <input type="text" inputMode="decimal" value={ahoMeta} onChange={(e) => setAhoMeta(e.target.value)} style={inputBase} placeholder="$0.00" />
                </Field>
                <Field label="Número de parcialidades">
                  <input type="text" inputMode="numeric" value={ahoPlazo} onChange={(e) => setAhoPlazo(e.target.value)} style={inputBase} placeholder="Ej. 12" />
                </Field>
                <Field label="Aportación por parcialidad">
                  <input type="text" inputMode="decimal" value={ahoAportacion} onChange={(e) => setAhoAportacion(e.target.value)} style={inputBase} placeholder="$0.00" />
                </Field>
                {(() => {
                  const m = parseFloat(ahoMeta) || 0, p = parseInt(ahoPlazo) || 0, a = parseFloat(ahoAportacion) || 0;
                  const filled = (m > 0 ? 1 : 0) + (p > 0 ? 1 : 0) + (a > 0 ? 1 : 0);
                  if (filled < 2) return null;
                  const metaC = m > 0 ? m : Math.round(a * p * 100) / 100;
                  const plazoC = p > 0 ? p : (a > 0 && m > 0 ? Math.ceil(m / a) : 0);
                  const aportC = a > 0 ? a : (plazoC > 0 && metaC > 0 ? Math.round((metaC / plazoC) * 100) / 100 : 0);
                  return (
                    <div style={{ background: SHEET.amarillo, border: "1px solid #e6d200", borderRadius: 4, padding: "8px 10px", marginBottom: 10, fontSize: 12 }}>
                      {m <= 0 && <p style={{ margin: "0 0 2px" }}><b>Meta calculada:</b> {fmt(metaC)}</p>}
                      {p <= 0 && <p style={{ margin: "0 0 2px" }}><b>Parcialidades calculadas:</b> {plazoC}</p>}
                      {a <= 0 && <p style={{ margin: "0 0 2px" }}><b>Aportación calculada:</b> {fmt(aportC)}</p>}
                      <p style={{ margin: 0, color: "#555" }}>{ahoFrecuencia} · {plazoC} parcialidades de {fmt(aportC)} = {fmt(metaC)}</p>
                    </div>
                  );
                })()}
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <Btn primary full onClick={guardarAhorro}>{editandoAhoId ? "Guardar cambios" : "Agregar ahorro"}</Btn>
                  {editandoAhoId && <Btn full onClick={limpiarFormAhorro}>Cancelar</Btn>}
                </div>
              </div>

              <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>Tus ahorros</p>
              {(catalog.ahorros || []).length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin ahorros aún.</p>}
              {(catalog.ahorros || []).map((a) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "8px 10px", marginBottom: 6, background: a.activa ? "#fff" : SHEET.gris }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{a.nombre}</p>
                    <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>
                      Meta {fmt(a.meta)} · {fmt(a.aportacion)}/{a.frecuencia || "Mensual"} · {a.plazoMeses} parcialidades
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    <button onClick={() => toggleActivaAhorro(a.id)} style={{
                      fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                      border: "1px solid " + SHEET.grisBorde, background: a.activa ? SHEET.verde : "#fff", color: SHEET.texto
                    }}>{a.activa ? "Activa" : "Inactiva"}</button>
                    <button onClick={() => editarAhorro(a)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✎</button>
                    <button onClick={() => eliminarAhorro(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, fontSize: 13 }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          ) : newCatTipo === "Inversión" ? (
            <div>
              <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>
                  {editandoInvId ? "Editar inversión" : "Agregar inversión"}
                </p>
                <Field label="Nombre">
                  <input type="text" value={invNombre} onChange={(e) => setInvNombre(e.target.value)} style={inputBase} placeholder="Ej. GBM-1" />
                </Field>
                <Field label="Categoría">
                  <input type="text" value={invCategoria} onChange={(e) => setInvCategoria(e.target.value)} style={inputBase} placeholder="Ej. GBM, Interbrokers" />
                </Field>
                <Field label="Descripción (opcional)">
                  <input type="text" value={invDescripcion} onChange={(e) => setInvDescripcion(e.target.value)} style={inputBase} />
                </Field>
                <Field label="Objetivo (opcional)">
                  <input type="text" value={invObjetivo} onChange={(e) => setInvObjetivo(e.target.value)} style={inputBase} placeholder="Ej. Retiro, Fondo de emergencia" />
                </Field>
                <Field label="Método">
                  <select value={invMetodo} onChange={(e) => { setInvMetodo(e.target.value); setInvCuenta(""); }} style={inputBase}>
                    {catalog.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                {(catalog.cuentas[invMetodo] || []).length > 0 && (
                  <Field label="Cuenta">
                    <select value={invCuenta} onChange={(e) => setInvCuenta(e.target.value)} style={inputBase}>
                      <option value="">Selecciona...</option>
                      {(catalog.cuentas[invMetodo] || []).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                )}
                <Field label="Frecuencia de aportación">
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {["Semanal", "Quincenal", "Mensual", "Trimestral"].map((f) => (
                      <button key={f} onClick={() => setInvFrecuencia(f)} style={{
                        padding: "6px 10px", fontSize: 11, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                        border: invFrecuencia === f ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                        background: invFrecuencia === f ? SHEET.azul : "#fff"
                      }}>{f}</button>
                    ))}
                  </div>
                </Field>
                <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "0 0 8px" }}>Llena dos campos — el tercero se calcula solo.</p>
                <Field label="Meta (total a invertir)">
                  <input type="text" inputMode="decimal" value={invMeta} onChange={(e) => setInvMeta(e.target.value)} style={inputBase} placeholder="$0.00" />
                </Field>
                <Field label="Número de parcialidades">
                  <input type="text" inputMode="numeric" value={invPlazo} onChange={(e) => setInvPlazo(e.target.value)} style={inputBase} placeholder="Ej. 24" />
                </Field>
                <Field label="Aportación por parcialidad">
                  <input type="text" inputMode="decimal" value={invAportacion} onChange={(e) => setInvAportacion(e.target.value)} style={inputBase} placeholder="$0.00" />
                </Field>
                {(() => {
                  const m = parseFloat(invMeta) || 0, p = parseInt(invPlazo) || 0, a = parseFloat(invAportacion) || 0;
                  const filled = (m > 0 ? 1 : 0) + (p > 0 ? 1 : 0) + (a > 0 ? 1 : 0);
                  if (filled < 2) return null;
                  const metaC = m > 0 ? m : Math.round(a * p * 100) / 100;
                  const plazoC = p > 0 ? p : (a > 0 && m > 0 ? Math.ceil(m / a) : 0);
                  const aportC = a > 0 ? a : (plazoC > 0 && metaC > 0 ? Math.round((metaC / plazoC) * 100) / 100 : 0);
                  return (
                    <div style={{ background: SHEET.amarillo, border: "1px solid #e6d200", borderRadius: 4, padding: "8px 10px", marginBottom: 10, fontSize: 12 }}>
                      {m <= 0 && <p style={{ margin: "0 0 2px" }}><b>Meta calculada:</b> {fmt(metaC)}</p>}
                      {p <= 0 && <p style={{ margin: "0 0 2px" }}><b>Parcialidades calculadas:</b> {plazoC}</p>}
                      {a <= 0 && <p style={{ margin: "0 0 2px" }}><b>Aportación calculada:</b> {fmt(aportC)}</p>}
                      <p style={{ margin: 0, color: "#555" }}>{invFrecuencia} · {plazoC} parcialidades de {fmt(aportC)} = {fmt(metaC)}</p>
                    </div>
                  );
                })()}
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <Btn primary full onClick={guardarInversion}>{editandoInvId ? "Guardar cambios" : "Agregar inversión"}</Btn>
                  {editandoInvId && <Btn full onClick={limpiarFormInversion}>Cancelar</Btn>}
                </div>
              </div>

              <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>Tus inversiones</p>
              {(catalog.inversiones || []).length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin inversiones aún.</p>}
              {(catalog.inversiones || []).map((i) => (
                <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "8px 10px", marginBottom: 6, background: i.activa ? "#fff" : SHEET.gris }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{i.nombre}</p>
                    <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>
                      Meta {fmt(i.meta)} · {fmt(i.aportacion)}/{i.frecuencia || "Mensual"} · {i.plazoMeses} parcialidades
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    <button onClick={() => toggleActivaInversion(i.id)} style={{
                      fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                      border: "1px solid " + SHEET.grisBorde, background: i.activa ? SHEET.verde : "#fff", color: SHEET.texto
                    }}>{i.activa ? "Activa" : "Inactiva"}</button>
                    <button onClick={() => editarInversion(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✎</button>
                    <button onClick={() => eliminarInversion(i.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, fontSize: 13 }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          ) : newCatTipo === "Préstamo" ? (
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <button onClick={() => setPrbVista("bancario")} style={{
                  flex: 1, padding: "7px 0", fontSize: 12.5, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                  border: prbVista === "bancario" ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                  background: prbVista === "bancario" ? SHEET.azul : "#fff"
                }}>Debo (Bancario/Crédito)</button>
                <button onClick={() => setPrbVista("terceros")} style={{
                  flex: 1, padding: "7px 0", fontSize: 12.5, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                  border: prbVista === "terceros" ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                  background: prbVista === "terceros" ? SHEET.azul : "#fff"
                }}>De/A Terceros</button>
              </div>

              {prbVista === "bancario" ? (
                <div>
                  <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>
                      {editandoPrbId ? "Editar préstamo" : "Agregar préstamo"}
                    </p>
                    <Field label="Nombre">
                      <input type="text" value={prbNombre} onChange={(e) => setPrbNombre(e.target.value)} style={inputBase} placeholder="Ej. Crédito auto BBVA" />
                    </Field>
                    <Field label="Categoría">
                      <div style={{ display: "flex", gap: 6 }}>
                        {["Bancario", "Crédito"].map((c) => (
                          <button key={c} onClick={() => setPrbCategoria(c)} style={{
                            flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                            border: prbCategoria === c ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                            background: prbCategoria === c ? SHEET.azul : "#fff"
                          }}>{c}</button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Frecuencia de pago">
                      <div style={{ display: "flex", gap: 6 }}>
                        {["Mensual", "Quincenal", "Semanal"].map((f) => (
                          <button key={f} onClick={() => { setPrbFrecuencia(f); setPrbDiasPago(""); }} style={{
                            flex: 1, padding: "7px 0", fontSize: 11, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                            border: prbFrecuencia === f ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                            background: prbFrecuencia === f ? SHEET.azul : "#fff"
                          }}>{f}</button>
                        ))}
                      </div>
                    </Field>
                    {(prbFrecuencia === "Quincenal" || prbFrecuencia === "Semanal") && (
                      <Field label={prbFrecuencia === "Quincenal" ? "Días de pago del mes (ej. 15, 31)" : "Días de pago del mes (ej. 7, 14, 21, 28)"}>
                        <input type="text" value={prbDiasPago} onChange={(e) => setPrbDiasPago(e.target.value)}
                          style={inputBase} placeholder={prbFrecuencia === "Quincenal" ? "Ej. 15, 31" : "Ej. 7, 14, 21, 28"} />
                        <p style={{ fontSize: 10.5, color: "#777", fontStyle: "italic", margin: "4px 0 0" }}>
                          Separa los días con coma. Usa 31 para "último día del mes".
                        </p>
                      </Field>
                    )}
                    <Field label="Monto financiado (lo que te prestaron, sin intereses)">
                      <input type="text" inputMode="decimal" value={prbMontoFinanciado} onChange={(e) => setPrbMontoFinanciado(e.target.value)} style={inputBase} placeholder="$0.00 — solo referencia" />
                    </Field>
                    <Field label="Pago por periodo (lo que pagas cada vez)">
                      <input type="text" inputMode="decimal" value={prbPagoPeriodo} onChange={(e) => setPrbPagoPeriodo(e.target.value)} style={inputBase} placeholder="$0.00" />
                    </Field>
                    <Field label="Número de pagos (plazo total)">
                      <input type="text" inputMode="numeric" value={prbNumPagos} onChange={(e) => setPrbNumPagos(e.target.value)} style={inputBase} placeholder="Ej. 24" />
                    </Field>
                    {prbPagoPeriodo && prbNumPagos && parseFloat(prbPagoPeriodo) > 0 && parseInt(prbNumPagos) > 0 && (
                      <div style={{ background: SHEET.amarillo, border: "1px solid #e6d200", borderRadius: 4, padding: "8px 10px", marginBottom: 10, fontSize: 12 }}>
                        <b>Total a pagar:</b> {fmt(Math.round(parseFloat(prbPagoPeriodo) * parseInt(prbNumPagos) * 100) / 100)}
                        {prbMontoFinanciado && parseFloat(prbMontoFinanciado) > 0 && (
                          <span style={{ color: "#666", marginLeft: 8 }}>
                            · Intereses implícitos: {fmt(Math.round((parseFloat(prbPagoPeriodo) * parseInt(prbNumPagos) - parseFloat(prbMontoFinanciado)) * 100) / 100)}
                          </span>
                        )}
                      </div>
                    )}
                    <Field label="Pagos ya realizados (si ya traes el crédito avanzado)">
                      <input type="text" inputMode="numeric" value={prbPagosPrevios} onChange={(e) => setPrbPagosPrevios(e.target.value)} style={inputBase} placeholder="0" />
                    </Field>
                    {prbPagosPrevios && parseInt(prbPagosPrevios) > 0 && prbPagoPeriodo && parseFloat(prbPagoPeriodo) > 0 && (
                      <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "-4px 0 10px" }}>
                        Acumulado inicial: {fmt(Math.round(parseInt(prbPagosPrevios) * parseFloat(prbPagoPeriodo) * 100) / 100)}
                      </p>
                    )}
                    <Field label="Método de pago">
                      <select value={prbMetodo} onChange={(e) => { setPrbMetodo(e.target.value); setPrbCuenta(""); }} style={inputBase}>
                        {catalog.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </Field>
                    {cuentasPrbDisponibles.length > 0 && (
                      <Field label="Cuenta / tarjeta">
                        <select value={prbCuenta} onChange={(e) => setPrbCuenta(e.target.value)} style={inputBase}>
                          <option value="">Selecciona...</option>
                          {cuentasPrbDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </Field>
                    )}
                    <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "0 0 10px" }}>
                      Se liquida automáticamente cuando los pagos registrados alcancen el total a pagar.
                    </p>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <Btn primary full onClick={guardarPrestamoBancario}>{editandoPrbId ? "Guardar cambios" : "Agregar préstamo"}</Btn>
                      {editandoPrbId && <Btn full onClick={limpiarFormPrestamoBancario}>Cancelar</Btn>}
                    </div>
                  </div>

                  <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>Tus préstamos</p>
                  {(catalog.prestamosBancarios || []).length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin préstamos aún.</p>}
                  {(catalog.prestamosBancarios || []).map((p) => {
                    const pendiente = Math.max(0, (p.totalAPagar || 0) - (p.acumulado || 0));
                    return (
                    <div key={p.id} style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "8px 10px", marginBottom: 8, background: p.activa ? "#fff" : SHEET.gris }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{p.nombre} <span style={{ fontWeight: 400, fontSize: 11, color: "#777" }}>({p.categoria})</span></p>
                          <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>
                            {fmt(p.pagoPeriodo || 0)}/{p.frecuencia || "Mensual"} · {p.numPagos || 0} pagos · Total {fmt(p.totalAPagar || 0)}
                          </p>
                          <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>
                            Pagado {fmt(p.acumulado || 0)} · Pendiente {fmt(pendiente)}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                          <button onClick={() => toggleActivaPrestamoBancario(p.id)} style={{
                            fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                            border: "1px solid " + SHEET.grisBorde, background: p.activa ? SHEET.verde : "#fff", color: SHEET.texto
                          }}>{p.activa ? "Activo" : "Liquidado"}</button>
                        <button onClick={() => editarPrestamoBancario(p)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✎</button>
                        <button onClick={() => eliminarPrestamoBancario(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>
                      {editandoPrtId ? "Editar persona" : "Agregar persona"}
                    </p>
                    <Field label="Nombre de la persona">
                      <input type="text" value={prtNombre} onChange={(e) => setPrtNombre(e.target.value)} style={inputBase} placeholder="Ej. Mi hermano, Lupita" />
                    </Field>
                    <Field label="¿Quién debe?">
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setPrtDireccion("a Tercero")} style={{
                          flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                          border: prtDireccion === "a Tercero" ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                          background: prtDireccion === "a Tercero" ? SHEET.azul : "#fff"
                        }}>Me debe a mí</button>
                        <button onClick={() => setPrtDireccion("de Tercero")} style={{
                          flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                          border: prtDireccion === "de Tercero" ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                          background: prtDireccion === "de Tercero" ? SHEET.azul : "#fff"
                        }}>Yo le debo</button>
                      </div>
                    </Field>
                    <Field label="Nota (opcional)">
                      <input type="text" value={prtNota} onChange={(e) => setPrtNota(e.target.value)} style={inputBase} placeholder="Ej. Para el coche" />
                    </Field>
                    <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "-4px 0 10px" }}>
                      No hay monto fijo — puedes registrar varios préstamos o abonos sueltos a la misma persona y el saldo se calcula solo.
                    </p>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <Btn primary full onClick={guardarPrestamoTercero}>{editandoPrtId ? "Guardar cambios" : "Agregar persona"}</Btn>
                      {editandoPrtId && <Btn full onClick={limpiarFormPrestamoTercero}>Cancelar</Btn>}
                    </div>
                  </div>

                  <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>Personas registradas</p>
                  {(catalog.prestamosTerceros || []).length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin personas aún.</p>}
                  {(catalog.prestamosTerceros || []).map((p) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "8px 10px", marginBottom: 6, background: "#fff" }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{p.nombre}</p>
                        <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>
                          {p.direccion === "a Tercero" ? "Me debe a mí" : "Yo le debo"}{p.nota ? ` · ${p.nota}` : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        <button onClick={() => editarPrestamoTercero(p)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✎</button>
                        <button onClick={() => eliminarPrestamoTercero(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : newCatTipo === "Familia" ? (
            <div>
              <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>
                  {editandoFamId ? "Editar familiar" : "Agregar familiar"}
                </p>
                <Field label="Nombre">
                  <input type="text" value={famNombre} onChange={(e) => setFamNombre(e.target.value)} style={inputBase} placeholder="Ej. Mamá, Papá" />
                </Field>
                <Field label="Parentesco">
                  <input type="text" value={famParentesco} onChange={(e) => setFamParentesco(e.target.value)} style={inputBase} placeholder="Ej. Madre, Padre, Hermano" />
                </Field>
                <Field label="Categoría (opcional)">
                  <input type="text" value={famCategoria} onChange={(e) => setFamCategoria(e.target.value)} style={inputBase} placeholder="Ej. Nuclear, Papás" />
                </Field>
                <Field label="Método de pago (Aportación)">
                  <select value={famMetodo} onChange={(e) => { setFamMetodo(e.target.value); setFamCuenta(""); }} style={inputBase}>
                    {catalog.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                {cuentasFamDisponibles.length > 0 && (
                  <Field label="Cuenta / tarjeta">
                    <select value={famCuenta} onChange={(e) => setFamCuenta(e.target.value)} style={inputBase}>
                      <option value="">Selecciona...</option>
                      {cuentasFamDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                )}
                <Field label="Frecuencia de aportación">
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {["Semanal", "Quincenal", "Mensual", "Trimestral"].map((f) => (
                      <button key={f} onClick={() => setFamFrecuencia(f)} style={{
                        padding: "6px 10px", fontSize: 11, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                        border: famFrecuencia === f ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                        background: famFrecuencia === f ? SHEET.azul : "#fff"
                      }}>{f}</button>
                    ))}
                  </div>
                </Field>
                <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "0 0 8px" }}>Llena dos campos — el tercero se calcula solo.</p>
                <Field label="Meta de aportación (total a dar)">
                  <input type="text" inputMode="decimal" value={famMeta} onChange={(e) => setFamMeta(e.target.value)} style={inputBase} placeholder="$0.00" />
                </Field>
                <Field label="Número de parcialidades">
                  <input type="text" inputMode="numeric" value={famPlazo} onChange={(e) => setFamPlazo(e.target.value)} style={inputBase} placeholder="Ej. 12" />
                </Field>
                <Field label="Aportación por parcialidad">
                  <input type="text" inputMode="decimal" value={famAportacion} onChange={(e) => setFamAportacion(e.target.value)} style={inputBase} placeholder="$0.00" />
                </Field>
                {(() => {
                  const m = parseFloat(famMeta) || 0, p = parseInt(famPlazo) || 0, a = parseFloat(famAportacion) || 0;
                  const filled = (m > 0 ? 1 : 0) + (p > 0 ? 1 : 0) + (a > 0 ? 1 : 0);
                  if (filled < 2) return null;
                  const metaC = m > 0 ? m : Math.round(a * p * 100) / 100;
                  const plazoC = p > 0 ? p : (a > 0 && m > 0 ? Math.ceil(m / a) : 0);
                  const aportC = a > 0 ? a : (plazoC > 0 && metaC > 0 ? Math.round((metaC / plazoC) * 100) / 100 : 0);
                  return (
                    <div style={{ background: SHEET.amarillo, border: "1px solid #e6d200", borderRadius: 4, padding: "8px 10px", marginBottom: 10, fontSize: 12 }}>
                      {m <= 0 && <p style={{ margin: "0 0 2px" }}><b>Meta calculada:</b> {fmt(metaC)}</p>}
                      {p <= 0 && <p style={{ margin: "0 0 2px" }}><b>Parcialidades calculadas:</b> {plazoC}</p>}
                      {a <= 0 && <p style={{ margin: "0 0 2px" }}><b>Aportación calculada:</b> {fmt(aportC)}</p>}
                      <p style={{ margin: 0, color: "#555" }}>{famFrecuencia} · {plazoC} parcialidades de {fmt(aportC)} = {fmt(metaC)}</p>
                    </div>
                  );
                })()}
                <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "0 0 10px" }}>
                  Pagos a TDC se registran aparte con monto libre cada vez — no necesitan meta fija.
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <Btn primary full onClick={guardarFamiliar}>{editandoFamId ? "Guardar cambios" : "Agregar familiar"}</Btn>
                  {editandoFamId && <Btn full onClick={limpiarFormFamiliar}>Cancelar</Btn>}
                </div>
              </div>

              <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>Tus familiares</p>
              {(catalog.familiares || []).length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin familiares aún.</p>}
              {(catalog.familiares || []).map((f) => (
                <div key={f.id} style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "8px 10px", marginBottom: 8, background: f.activa ? "#fff" : SHEET.gris }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{f.nombre}
                        {f.parentesco && <span style={{ fontWeight: 400, fontSize: 11, color: "#777" }}> · {f.parentesco}</span>}
                      </p>
                      <p style={{ fontSize: 11, color: "#555", margin: "2px 0 0" }}>
                        Meta {fmt(f.meta || 0)} · {f.plazoMeses || 0} meses · Aport. {fmt(f.aportacion || 0)}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                      <button onClick={() => toggleActivaFamiliar(f.id)} style={{
                        fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3,
                        cursor: "pointer", fontFamily: SHEET.fuente, border: "1px solid " + SHEET.grisBorde,
                        background: f.activa ? SHEET.verde : "#fff", color: SHEET.texto
                      }}>{f.activa ? "Activo" : "Inactivo"}</button>
                      <button onClick={() => editarFamiliar(f)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✎</button>
                      <button onClick={() => eliminarFamiliar(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, fontSize: 13 }}>✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <ListEditor title={`Categorías de ${newCatTipo}`} items={categoriasDelTipo}
                onAdd={(v) => {
                  const next = JSON.parse(JSON.stringify(catalog));
                  if (!Array.isArray(next.categorias[newCatTipo])) next.categorias[newCatTipo] = [];
                  if (!next.categorias[newCatTipo].includes(v)) next.categorias[newCatTipo].push(v);
                  if (!next.subcategorias[v]) next.subcategorias[v] = [];
                  setCatalog(next);
                  guardarAhora(next);
                  setNewSubcatCategoria(v);
                }}
                onRemove={(v) => removeFromList(["categorias", newCatTipo], v)} />
              {categoriasDelTipo.length > 0 && (
                <>
                  <Field label="Categoría">
                <select value={subcatActual} onChange={(e) => setNewSubcatCategoria(e.target.value)} style={inputBase}>
                  {categoriasDelTipo.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              {subcatActual === "Seguros" ? (
                <div>
                  <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>
                      {editandoSegId ? "Editar seguro" : "Agregar seguro"}
                    </p>
                    <Field label="Nombre">
                      <input type="text" value={segNombre} onChange={(e) => setSegNombre(e.target.value)} style={inputBase} placeholder="Ej. GNP GMM" />
                    </Field>
                    <Field label="Categoría">
                      <input type="text" value={segCategoria} onChange={(e) => setSegCategoria(e.target.value)} style={inputBase} placeholder="Ej. GMM, Vida, Automotriz" />
                    </Field>
                    <Field label="# de Póliza">
                      <input type="text" value={segPoliza} onChange={(e) => setSegPoliza(e.target.value)} style={inputBase} placeholder="Ej. 00000705567188" />
                    </Field>
                    <Field label="Método de pago">
                      <select value={segMetodo} onChange={(e) => { setSegMetodo(e.target.value); setSegCuenta(""); }} style={inputBase}>
                        {catalog.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </Field>
                    {cuentasSegDisponibles.length > 0 && (
                      <Field label="Cuenta / tarjeta">
                        <select value={segCuenta} onChange={(e) => setSegCuenta(e.target.value)} style={inputBase}>
                          <option value="">Selecciona...</option>
                          {cuentasSegDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </Field>
                    )}
                    <Field label="Costo">
                      <input type="text" inputMode="decimal" value={segCosto} onChange={(e) => setSegCosto(e.target.value)} style={inputBase} placeholder="$0.00" />
                    </Field>
                    <Field label="Frecuencia">
                      <select value={segFrecuencia} onChange={(e) => setSegFrecuencia(e.target.value)} style={inputBase}>
                        {["Semanal", "Quincenal", "Mensual", "Bimestral", "Trimestral", "Semestral", "Anual"].map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="¿Cómo se paga?">
                      <div style={{ display: "flex", gap: 6 }}>
                        {["Automático", "Manual"].map((t) => (
                          <button key={t} onClick={() => setSegTipo(t)} style={{
                            flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                            border: segTipo === t ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                            background: segTipo === t ? SHEET.azul : "#fff"
                          }}>{t}</button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Día de pago (1-30)">
                      <input type="text" inputMode="numeric" min="1" max="30" value={segDia} onChange={(e) => setSegDia(e.target.value)} style={inputBase} />
                    </Field>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <Btn primary full onClick={guardarSeguro}>{editandoSegId ? "Guardar cambios" : "Agregar seguro"}</Btn>
                      {editandoSegId && <Btn full onClick={limpiarFormSeguro}>Cancelar</Btn>}
                    </div>
                  </div>

                  <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>Tus seguros</p>
                  {(catalog.seguros || []).length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin seguros aún.</p>}
                  {(catalog.seguros || []).map((s) => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "8px 10px", marginBottom: 6, background: s.activa ? "#fff" : SHEET.gris }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{s.nombre}</p>
                        <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>
                          {fmt(s.costo)} · {s.frecuencia} · {s.tipoPago} · día {s.diaPago}{s.poliza ? ` · Póliza ${s.poliza}` : ""}{s.cuenta ? ` · ${s.cuenta}` : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        <button onClick={() => toggleActivaSeguro(s.id)} style={{
                          fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                          border: "1px solid " + SHEET.grisBorde, background: s.activa ? SHEET.verde : "#fff", color: SHEET.texto
                        }}>{s.activa ? "Activa" : "Inactiva"}</button>
                        <button onClick={() => editarSeguro(s)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✎</button>
                        <button onClick={() => eliminarSeguro(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : subcatActual === "Servicios" ? (
                <div>
                  <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>
                      {editandoServId ? "Editar servicio" : "Agregar servicio"}
                    </p>
                    <Field label="Nombre">
                      <input type="text" value={servNombre} onChange={(e) => setServNombre(e.target.value)} style={inputBase} placeholder="Ej. CFE, Telmex" />
                    </Field>
                    <Field label="Categoría">
                      <input type="text" value={servCategoria} onChange={(e) => setServCategoria(e.target.value)} style={inputBase} placeholder="Ej. Casa/Hogar" />
                    </Field>
                    <Field label="Método de pago">
                      <select value={servMetodo} onChange={(e) => { setServMetodo(e.target.value); setServCuenta(""); }} style={inputBase}>
                        {catalog.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </Field>
                    {cuentasServDisponibles.length > 0 && (
                      <Field label="Cuenta / tarjeta">
                        <select value={servCuenta} onChange={(e) => setServCuenta(e.target.value)} style={inputBase}>
                          <option value="">Selecciona...</option>
                          {cuentasServDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </Field>
                    )}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10, padding: "8px 10px", background: SHEET.gris, borderRadius: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic" }}>¿Es de monto variable? (ej. luz, agua, gas)</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { setServVariable(true); setServCosto(""); }} style={{
                          padding: "5px 12px", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                          border: servVariable ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                          background: servVariable ? SHEET.azul : "#fff"
                        }}>Sí</button>
                        <button onClick={() => setServVariable(false)} style={{
                          padding: "5px 12px", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                          border: !servVariable ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                          background: !servVariable ? SHEET.azul : "#fff"
                        }}>No</button>
                      </div>
                    </div>
                    {!servVariable && (
                      <Field label="Costo">
                        <input type="text" inputMode="decimal" value={servCosto} onChange={(e) => setServCosto(e.target.value)} style={inputBase} placeholder="$0.00" />
                      </Field>
                    )}
                    <Field label="Frecuencia">
                      <select value={servFrecuencia} onChange={(e) => setServFrecuencia(e.target.value)} style={inputBase}>
                        {["Semanal", "Quincenal", "Mensual", "Bimestral", "Trimestral", "Semestral", "Anual"].map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </Field>
                    {servVariable && (
                      <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "-4px 0 10px" }}>
                        No pasa nada, registra el monto real cada vez que pagues desde Registro.
                      </p>
                    )}
                    <Field label="¿Cómo se paga?">
                      <div style={{ display: "flex", gap: 6 }}>
                        {["Automático", "Manual"].map((t) => (
                          <button key={t} onClick={() => setServTipo(t)} style={{
                            flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                            border: servTipo === t ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                            background: servTipo === t ? SHEET.azul : "#fff"
                          }}>{t}</button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Día de pago (1-30)">
                      <input type="text" inputMode="numeric" min="1" max="30" value={servDia} onChange={(e) => setServDia(e.target.value)} style={inputBase} />
                    </Field>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <Btn primary full onClick={guardarServicio}>{editandoServId ? "Guardar cambios" : "Agregar servicio"}</Btn>
                      {editandoServId && <Btn full onClick={limpiarFormServicio}>Cancelar</Btn>}
                    </div>
                  </div>

                  <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>Tus servicios</p>
                  {(catalog.servicios || []).length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin servicios aún.</p>}
                  {(catalog.servicios || []).map((s) => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "8px 10px", marginBottom: 6, background: s.activa ? "#fff" : SHEET.gris }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{s.nombre}</p>
                        <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>
                          {s.esVariable ? "Variable" : fmt(s.costo)} · {s.frecuencia} · {s.tipoPago} · día {s.diaPago}{s.cuenta ? ` · ${s.cuenta}` : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        <button onClick={() => toggleActivaServicio(s.id)} style={{
                          fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                          border: "1px solid " + SHEET.grisBorde, background: s.activa ? SHEET.verde : "#fff", color: SHEET.texto
                        }}>{s.activa ? "Activa" : "Inactiva"}</button>
                        <button onClick={() => editarServicio(s)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✎</button>
                        <button onClick={() => eliminarServicio(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : subcatActual === "Membresías" ? (
                <div>
                  <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>
                      {editandoMemId ? "Editar membresía" : "Agregar membresía"}
                    </p>
                    <Field label="Nombre">
                      <input type="text" value={memNombre} onChange={(e) => setMemNombre(e.target.value)} style={inputBase} placeholder="Ej. Netflix" />
                    </Field>
                    <Field label="Categoría">
                      <input type="text" value={memCategoria} onChange={(e) => setMemCategoria(e.target.value)} style={inputBase} placeholder="Ej. Entretenimiento" />
                    </Field>
                    <Field label="Método de pago">
                      <select value={memMetodo} onChange={(e) => { setMemMetodo(e.target.value); setMemCuenta(""); }} style={inputBase}>
                        {catalog.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </Field>
                    {cuentasMemDisponibles.length > 0 && (
                      <Field label="Cuenta / tarjeta">
                        <select value={memCuenta} onChange={(e) => setMemCuenta(e.target.value)} style={inputBase}>
                          <option value="">Selecciona...</option>
                          {cuentasMemDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </Field>
                    )}
                    <Field label="Costo">
                      <input type="text" inputMode="decimal" value={memCosto} onChange={(e) => setMemCosto(e.target.value)} style={inputBase} placeholder="$0.00" />
                    </Field>
                    <Field label="Frecuencia">
                      <select value={memFrecuencia} onChange={(e) => setMemFrecuencia(e.target.value)} style={inputBase}>
                        {["Semanal", "Quincenal", "Mensual", "Bimestral", "Trimestral", "Semestral", "Anual"].map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="¿Cómo se paga?">
                      <div style={{ display: "flex", gap: 6 }}>
                        {["Automático", "Manual"].map((t) => (
                          <button key={t} onClick={() => setMemTipo(t)} style={{
                            flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                            border: memTipo === t ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                            background: memTipo === t ? SHEET.azul : "#fff"
                          }}>{t}</button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Día de pago (1-30)">
                      <input type="text" inputMode="numeric" min="1" max="30" value={memDia} onChange={(e) => setMemDia(e.target.value)} style={inputBase} />
                    </Field>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <Btn primary full onClick={guardarMembresia}>{editandoMemId ? "Guardar cambios" : "Agregar membresía"}</Btn>
                      {editandoMemId && <Btn full onClick={limpiarFormMembresia}>Cancelar</Btn>}
                    </div>
                  </div>

                  <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>Tus membresías</p>
                  {(catalog.membresias || []).length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin membresías aún.</p>}
                  {(catalog.membresias || []).map((m) => (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "8px 10px", marginBottom: 6, background: m.activa ? "#fff" : SHEET.gris }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{m.nombre}</p>
                        <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>
                          {fmt(m.costo)} · {m.frecuencia} · {m.tipoPago} · día {m.diaPago}{m.cuenta ? ` · ${m.cuenta}` : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        <button onClick={() => toggleActivaMembresia(m.id)} style={{
                          fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                          border: "1px solid " + SHEET.grisBorde, background: m.activa ? SHEET.verde : "#fff", color: SHEET.texto
                        }}>{m.activa ? "Activa" : "Inactiva"}</button>
                        <button onClick={() => editarMembresia(m)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✎</button>
                        <button onClick={() => eliminarMembresia(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ListEditor title={`Subcategorías de ${subcatActual}`} items={catalog.subcategorias[subcatActual] || []}
                  onAdd={(v) => addToList(["subcategorias", subcatActual], v)} onRemove={(v) => removeFromList(["subcategorias", subcatActual], v)} />
              )}
            </>
          )}
            </>
          )}
        </div>
      )}
      {section === "ingresos" && (
        <div>
          <ListEditor title="Tipos de ingreso" items={catalog.ingresoTipos}
            onAdd={(v) => {
              const next = JSON.parse(JSON.stringify(catalog));
              if (!next.ingresoTipos.includes(v)) next.ingresoTipos.push(v);
              if (!next.ingresoSub[v]) next.ingresoSub[v] = [];
              setCatalog(next);
              guardarAhora(next);
              setNewIngresoTipo(v);
            }}
            onRemove={(v) => removeFromList(["ingresoTipos"], v)} />
          {catalog.ingresoTipos.length > 0 && (
            <>
              <Field label="Tipo de ingreso">
                <select value={newIngresoTipo} onChange={(e) => setNewIngresoTipo(e.target.value)} style={inputBase}>
                  {catalog.ingresoTipos.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <ListEditor title={`Detalle / subcategoría de ${newIngresoTipo}`} items={catalog.ingresoSub[newIngresoTipo] || []}
                onAdd={(v) => addToList(["ingresoSub", newIngresoTipo], v)} onRemove={(v) => removeFromList(["ingresoSub", newIngresoTipo], v)} />
            </>
          )}
        </div>
      )}
      {section === "lugares" && <ListEditor title="Lugares frecuentes" items={catalog.lugares} onAdd={(v) => addToList(["lugares"], v)} onRemove={(v) => removeFromList(["lugares"], v)} />}

      {section === "presupuestos" && (
        <PresupuestoEditor catalog={catalog} setCatalog={setCatalog} guardarAhora={guardarAhora} movimientos={movimientos} />
      )}
    </div>
  );
}

function DiferidosTab({ diferidos, registrarPago, editarDiferido, eliminarDiferido, userEmail }) {
  const [pagandoId, setPagandoId] = useState(null);
  const [montoPago, setMontoPago] = useState("");
  const [interesesPago, setInteresesPago] = useState("");
  const [fechaPago, setFechaPago] = useState(todayISO());
  const [editandoId, setEditandoId] = useState(null);
  const [formEdit, setFormEdit] = useState({});

  const activos = diferidos.filter((d) => d.activo);
  const inactivos = diferidos.filter((d) => !d.activo);

  function abrirPago(d) {
    setPagandoId(d.id);
    setMontoPago(String(d.aportacion));
    setInteresesPago("");
    setFechaPago(todayISO());
  }

  async function confirmarPago() {
    const monto = parseFloat(montoPago);
    const intereses = parseFloat(interesesPago) || 0;
    if (!monto || monto <= 0 || !fechaPago) return;
    await registrarPago(pagandoId, monto, fechaPago, intereses);
    setPagandoId(null);
  }

  function abrirEdicion(d) {
    setEditandoId(d.id);
    setPagandoId(null);
    setFormEdit({
      nombre: d.nombre || "",
      costoTotal: String(d.costoTotal),
      plazoMeses: String(d.plazoMeses),
      pagos: String(d.pagos),
      pagado: String(d.pagado),
      interesesPagados: String(d.interesesPagados || 0),
      descripcion: d.descripcion || "",
    });
  }

  function confirmarEdicion(id) {
    editarDiferido(id, {
      nombre: formEdit.nombre,
      costoTotal: parseFloat(formEdit.costoTotal) || 0,
      plazoMeses: parseInt(formEdit.plazoMeses) || 1,
      pagos: parseInt(formEdit.pagos) || 0,
      pagado: parseFloat(formEdit.pagado) || 0,
      interesesPagados: parseFloat(formEdit.interesesPagados) || 0,
      descripcion: formEdit.descripcion,
    });
    setEditandoId(null);
  }

  function Tarjeta({ d }) {
    const baseCapital = d.conIntereses && d.capitalOriginal ? d.capitalOriginal : d.costoTotal;
    const capitalPendiente = Math.round((baseCapital - d.pagado) * 100) / 100;
    const interesesPagados = d.interesesPagados || 0;
    const totalRealPagado = Math.round((d.pagado + interesesPagados) * 100) / 100;
    const interesesTotalesImplicitos = d.conIntereses && d.capitalOriginal ? Math.round((d.costoTotal - d.capitalOriginal) * 100) / 100 : 0;
    return (
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "7px 10px", marginBottom: 6, background: d.activo ? "#fff" : SHEET.gris }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>
              {d.nombre ? d.nombre : `${d.categoria}${d.subcategoria ? ` · ${d.subcategoria}` : ""}`}
            </p>
            {d.nombre && <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>{d.categoria}{d.subcategoria ? ` · ${d.subcategoria}` : ""}</p>}
            {d.descripcion && <p style={{ fontSize: 11, color: "#555", fontStyle: "italic", margin: "1px 0 0" }}>{d.descripcion}</p>}
            <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>{d.tarjeta} · desde {fmtDate(d.inicio)}</p>
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button aria-label="Editar" onClick={() => editandoId === d.id ? setEditandoId(null) : abrirEdicion(d)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.azulBorde, padding: 2, fontSize: 14 }}>✎</button>
            <button aria-label="Eliminar" onClick={() => eliminarDiferido(d.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, padding: 2 }}>✕</button>
          </div>
        </div>

        {/* Capital */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, marginTop: 6, fontSize: 11 }}>
          {d.conIntereses && d.capitalOriginal ? (
            <div><span style={{ color: "#777" }}>Capital</span><br /><b>{fmt(d.capitalOriginal)}</b></div>
          ) : (
            <div><span style={{ color: "#777" }}>Capital</span><br /><b>{fmt(d.costoTotal)}</b></div>
          )}
          {d.conIntereses ? (
            <div><span style={{ color: "#777" }}>Total c/int.</span><br /><b>{fmt(d.costoTotal)}</b></div>
          ) : (
            <div><span style={{ color: "#777" }}>Pagado</span><br /><b>{fmt(d.pagado)}</b></div>
          )}
          <div><span style={{ color: "#777" }}>Pendiente</span><br /><b style={{ color: capitalPendiente > 0 ? SHEET.rosaBorde : SHEET.verdeBorde }}>{fmt(capitalPendiente)}</b></div>
          <div><span style={{ color: "#777" }}>Intereses</span><br /><b style={{ color: interesesPagados > 0 ? SHEET.rosaBorde : "#555" }}>{fmt(interesesPagados)}</b></div>
          <div><span style={{ color: "#777" }}>Total real</span><br /><b>{fmt(totalRealPagado)}</b></div>
        </div>
        {d.conIntereses && interesesTotalesImplicitos > 0 && (
          <p style={{ fontSize: 10.5, color: "#888", fontStyle: "italic", margin: "3px 0 0" }}>
            Intereses totales del crédito: {fmt(interesesTotalesImplicitos)} · Mensualidad: {fmt(d.mensualidadFija || d.aportacion)}
          </p>
        )}

        <p style={{ fontSize: 11, margin: "4px 0 0", fontStyle: "italic", color: "#555" }}>
          Pago {d.pagos}/{d.plazoMeses} · {fmt(d.aportacion)}/mes{d.ultPago ? ` · Últ. ${fmtDate(d.ultPago)}` : ""}
        </p>

        {editandoId === d.id && (
          <div style={{ marginTop: 8, padding: "10px", background: SHEET.azul, borderRadius: 3, border: `1px solid ${SHEET.azulBorde}` }}>
            <p style={{ fontSize: 12, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>Editar diferido</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Nombre">
                <input type="text" value={formEdit.nombre || ""} onChange={(e) => setFormEdit((p) => ({ ...p, nombre: e.target.value }))} style={{ ...inputBase, fontSize: 12 }} />
              </Field>
              <Field label="Capital total">
                <input type="text" inputMode="decimal" value={formEdit.costoTotal || ""} onChange={(e) => setFormEdit((p) => ({ ...p, costoTotal: e.target.value }))} style={{ ...inputBase, fontSize: 12 }} />
              </Field>
              <Field label="Plazo (meses)">
                <input type="text" inputMode="numeric" value={formEdit.plazoMeses || ""} onChange={(e) => setFormEdit((p) => ({ ...p, plazoMeses: e.target.value }))} style={{ ...inputBase, fontSize: 12 }} />
              </Field>
              <Field label="Pagos realizados">
                <input type="text" inputMode="numeric" value={formEdit.pagos || ""} onChange={(e) => setFormEdit((p) => ({ ...p, pagos: e.target.value }))} style={{ ...inputBase, fontSize: 12 }} />
              </Field>
              <Field label="Capital pagado ($)">
                <input type="text" inputMode="decimal" value={formEdit.pagado || ""} onChange={(e) => setFormEdit((p) => ({ ...p, pagado: e.target.value }))} style={{ ...inputBase, fontSize: 12 }} />
              </Field>
              <Field label="Intereses pagados acum. ($)">
                <input type="text" inputMode="decimal" value={formEdit.interesesPagados || ""} onChange={(e) => setFormEdit((p) => ({ ...p, interesesPagados: e.target.value }))} style={{ ...inputBase, fontSize: 12 }} placeholder="0" />
              </Field>
            </div>
            <Field label="Descripción">
              <input type="text" value={formEdit.descripcion || ""} onChange={(e) => setFormEdit((p) => ({ ...p, descripcion: e.target.value }))} style={{ ...inputBase, fontSize: 12 }} />
            </Field>
            {formEdit.costoTotal && formEdit.plazoMeses && (
              <p style={{ fontSize: 11, color: "#555", fontStyle: "italic", margin: "4px 0 8px" }}>
                Nueva mensualidad: {fmt(Math.round((parseFloat(formEdit.costoTotal) / parseInt(formEdit.plazoMeses)) * 100) / 100)}
              </p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <Btn primary full onClick={() => confirmarEdicion(d.id)}>Guardar cambios</Btn>
              <Btn full onClick={() => setEditandoId(null)}>Cancelar</Btn>
            </div>
          </div>
        )}

        {d.activo && (
          pagandoId === d.id ? (
            <div style={{ marginTop: 8, padding: "8px", background: SHEET.gris, borderRadius: 3 }}>
              <Field label="Monto del pago (capital)">
                <input type="text" inputMode="decimal" value={montoPago} onChange={(e) => setMontoPago(e.target.value)} style={inputBase} />
              </Field>
              <Field label="Intereses cobrados este periodo (opcional)">
                <input type="text" inputMode="decimal" value={interesesPago} onChange={(e) => setInteresesPago(e.target.value)} style={inputBase} placeholder="$0.00 — ver estado de cuenta" />
              </Field>
              {interesesPago && parseFloat(interesesPago) > 0 && (
                <p style={{ fontSize: 11, color: "#555", fontStyle: "italic", margin: "-6px 0 8px" }}>
                  Se registrarán como "Intereses TDC" en tu historial. Total este periodo: {fmt(Math.round(((parseFloat(montoPago) || 0) + parseFloat(interesesPago)) * 100) / 100)}
                </p>
              )}
              <Field label="Fecha de pago">
                <div style={{ width: "100%", overflow: "hidden", borderRadius: 2 }}>
                  <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)}
                    style={{ display: "block", width: "100%", boxSizing: "border-box", fontFamily: SHEET.fuente, borderRadius: 2, padding: "8px 6px", fontSize: 14, border: "1px solid " + SHEET.grisBorde }} />
                </div>
              </Field>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn primary full onClick={confirmarPago}>Confirmar pago</Btn>
                <Btn full onClick={() => setPagandoId(null)}>Cancelar</Btn>
              </div>
            </div>
          ) : (
            <Btn primary full onClick={() => abrirPago(d)} style={{ marginTop: 6, fontSize: 12, padding: "7px 0" }}>Registrar pago de este mes</Btn>
          )
        )}
      </div>
    );
  }

  function exportarCSV() {
    const headers = ["Activo/Inactivo", "Nombre", "Categoría", "Subcategoría", "Tarjeta", "Capital Total", "Plazo (meses)", "Mensualidad", "#Pago", "Capital Pagado", "Capital Pendiente", "Intereses Pagados", "Total Real Pagado", "Últ. Pago", "Inicio", "Notas"];
    const filas = diferidos.map((d) => {
      const capitalPendiente = Math.round((d.costoTotal - d.pagado) * 100) / 100;
      const interesesPagados = d.interesesPagados || 0;
      const totalRealPagado = Math.round((d.pagado + interesesPagados) * 100) / 100;
      return [
        d.activo ? "Activo" : "Inactivo", d.nombre || "", d.categoria || "", d.subcategoria || "", d.tarjeta || "",
        d.costoTotal, d.plazoMeses, d.aportacion, `${d.pagos}/${d.plazoMeses}`,
        d.pagado, capitalPendiente, interesesPagados, totalRealPagado,
        d.ultPago ? fmtDate(d.ultPago) : "", d.inicio ? fmtDate(d.inicio) : "", d.descripcion || ""
      ];
    });
    const totalCosto = diferidos.reduce((s, d) => s + d.costoTotal, 0);
    const totalPagado = diferidos.reduce((s, d) => s + d.pagado, 0);
    const totalPendiente = diferidos.reduce((s, d) => s + Math.round((d.costoTotal - d.pagado) * 100) / 100, 0);
    const totalIntereses = diferidos.reduce((s, d) => s + (d.interesesPagados || 0), 0);
    const totalReal = Math.round((totalPagado + totalIntereses) * 100) / 100;
    const filaTotal = ["", "Total", "", "", "", totalCosto, "", "", "", totalPagado, totalPendiente, totalIntereses, totalReal, "", "", ""];
    const escape = (v) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const encabezado = [[`Estado de cuenta de Diferidos TDC`], [`Usuario: ${userEmail || ""}`], [`Generado el: ${fmtDate(todayISO())}`], []];
    const csv = [...encabezado, headers, ...filas, filaTotal].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Diferidos_TDC_${todayISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const filas = diferidos.map((d) => {
      const capitalPendiente = Math.round((d.costoTotal - d.pagado) * 100) / 100;
      const interesesPagados = d.interesesPagados || 0;
      const totalRealPagado = Math.round((d.pagado + interesesPagados) * 100) / 100;
      return `<tr>
        <td>${d.activo ? "Activo" : "Inactivo"}</td>
        <td>${d.nombre || "-"}</td>
        <td>${d.categoria || ""}${d.subcategoria ? " · " + d.subcategoria : ""}</td>
        <td>${d.tarjeta || ""}</td>
        <td class="num">${fmt(d.costoTotal)}</td>
        <td class="num">${d.plazoMeses}</td>
        <td class="num">${fmt(d.aportacion)}</td>
        <td class="num">${d.pagos}/${d.plazoMeses}</td>
        <td class="num">${fmt(d.pagado)}</td>
        <td class="num">${fmt(capitalPendiente)}</td>
        <td class="num" style="color:#c62828">${fmt(interesesPagados)}</td>
        <td class="num">${fmt(totalRealPagado)}</td>
        <td>${d.ultPago ? fmtDate(d.ultPago) : "-"}</td>
      </tr>`;
    }).join("");
    const totalCosto = diferidos.reduce((s, d) => s + d.costoTotal, 0);
    const totalPagado = diferidos.reduce((s, d) => s + d.pagado, 0);
    const totalPendiente = diferidos.reduce((s, d) => s + Math.round((d.costoTotal - d.pagado) * 100) / 100, 0);
    const totalIntereses = diferidos.reduce((s, d) => s + (d.interesesPagados || 0), 0);
    const totalReal = Math.round((totalPagado + totalIntereses) * 100) / 100;
    const filaTotal = `<tr class="total">
        <td colspan="4">Total</td>
        <td class="num">${fmt(totalCosto)}</td>
        <td></td><td></td><td></td>
        <td class="num">${fmt(totalPagado)}</td>
        <td class="num">${fmt(totalPendiente)}</td>
        <td class="num" style="color:#c62828">${fmt(totalIntereses)}</td>
        <td class="num">${fmt(totalReal)}</td>
        <td></td>
      </tr>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pagos Diferidos TDC</title>
      <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; padding: 24px; color: #000; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        p.sub { font-size: 12px; color: #555; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 14px; }
        th, td { border: 1px solid #999; padding: 5px 6px; text-align: left; }
        th { background: #F4CCCC; font-weight: 700; }
        td.num, th.num { text-align: right; }
        tr.total td { font-weight: 700; background: #FFF2CC; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>Pagos Diferidos TDC</h1>
        <p class="sub">Usuario: ${userEmail || ""}</p>
        <p class="sub">Generado el ${fmtDate(todayISO())}</p>
        <table>
          <thead><tr>
            <th>Estatus</th><th>Nombre</th><th>Categoría</th><th>Tarjeta</th>
            <th class="num">Capital</th><th class="num">Plazo</th><th class="num">Mensualidad</th><th class="num">Pagos</th>
            <th class="num">Cap. Pagado</th><th class="num">Cap. Pendiente</th>
            <th class="num">Intereses</th><th class="num">Total Real</th><th>Últ. Pago</th>
          </tr></thead>
          <tbody>${filas}${filaTotal}</tbody>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) { ventana.document.write(html); ventana.document.close(); }
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn full onClick={exportarPDF} style={{ flex: 1 }}>📄 Descargar PDF</Btn>
        <Btn full onClick={exportarCSV} style={{ flex: 1 }}>📊 Descargar Excel</Btn>
      </div>
      <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "0 0 10px" }}>Activos</h3>
      {activos.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>No tienes diferidos activos. Regístralos desde la pestaña Registro al elegir TDC.</p>}
      {activos.map((d) => <Tarjeta key={d.id} d={d} />)}

      {inactivos.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "16px 0 10px" }}>Liquidados</h3>
          {inactivos.map((d) => <Tarjeta key={d.id} d={d} />)}
        </>
      )}
    </div>
  );
}

function MembresiasTab({ membresias, toggleActiva, movimientos, userEmail }) {
  const activas = membresias.filter((m) => m.activa);
  const inactivas = membresias.filter((m) => !m.activa);
  const mesesLabel = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  function pagosPorMes(nombreMembresia) {
    const totales = new Array(12).fill(0);
    movimientos.forEach((mv) => {
      if (mv.mov === "Egreso" && mv.categoria === "Membresías" && mv.subcategoria === nombreMembresia) {
        const mesIdx = parseInt(mv.fecha.slice(5, 7), 10) - 1;
        if (mesIdx >= 0 && mesIdx < 12) totales[mesIdx] += Number(mv.cantidad);
      }
    });
    return totales;
  }

  function ultimoPagoDe(nombreMembresia) {
    const pagos = movimientos.filter((mv) => mv.mov === "Egreso" && mv.categoria === "Membresías" && mv.subcategoria === nombreMembresia);
    if (pagos.length === 0) return null;
    return pagos.reduce((max, mv) => (mv.fecha > max ? mv.fecha : max), pagos[0].fecha);
  }

  function exportarCSV() {
    const headers = ["Activa/Inactiva", "Nombre", "Categoría", "Método", "Costo", "Frecuencia", "Tipo de pago", "Últ. Pago", "Pagado", ...mesesLabel, "Total año"];
    const filas = membresias.map((m) => {
      const porMes = pagosPorMes(m.nombre);
      const totalAnio = porMes.reduce((s, v) => s + v, 0);
      const ultPago = ultimoPagoDe(m.nombre);
      return [
        m.activa ? "Activa" : "Inactiva", m.nombre, m.categoria || "", m.metodo || "", m.costo, m.frecuencia, m.tipoPago,
        ultPago ? fmtDate(ultPago) : "", totalAnio,
        ...porMes.map((v) => (v > 0 ? v : "")), totalAnio
      ];
    });
    const totalesPorMes = mesesLabel.map((_, i) => membresias.reduce((s, m) => s + pagosPorMes(m.nombre)[i], 0));
    const totalGeneral = totalesPorMes.reduce((s, v) => s + v, 0);
    const filaTotal = ["", "Total", "", "", "", "", "", "", totalGeneral, ...totalesPorMes, totalGeneral];
    const escape = (v) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const encabezado = [["Estado de cuenta de Membresías"], [`Usuario: ${userEmail || ""}`], [`Generado el: ${fmtDate(todayISO())}`], []];
    const csv = [...encabezado, headers, ...filas, filaTotal].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Membresias_${todayISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const filas = membresias.map((m) => {
      const porMes = pagosPorMes(m.nombre);
      const totalAnio = porMes.reduce((s, v) => s + v, 0);
      const ultPago = ultimoPagoDe(m.nombre);
      return `<tr>
        <td>${m.activa ? "Activa" : "Inactiva"}</td>
        <td>${m.nombre}</td>
        <td>${m.categoria || "-"}</td>
        <td>${m.metodo || "-"}</td>
        <td class="num">${fmt(m.costo)}</td>
        <td>${m.frecuencia}</td>
        <td>${m.tipoPago}</td>
        <td>${ultPago ? fmtDate(ultPago) : "-"}</td>
        <td class="num">${fmt(totalAnio)}</td>
        ${porMes.map((v) => `<td class="num">${v > 0 ? fmt(v) : "-"}</td>`).join("")}
        <td class="num">${fmt(totalAnio)}</td>
      </tr>`;
    }).join("");
    const totalesPorMes = mesesLabel.map((_, i) => membresias.reduce((s, m) => s + pagosPorMes(m.nombre)[i], 0));
    const totalGeneral = totalesPorMes.reduce((s, v) => s + v, 0);
    const filaTotal = `<tr class="total">
        <td colspan="8">Total</td>
        <td class="num">${fmt(totalGeneral)}</td>
        ${totalesPorMes.map((v) => `<td class="num">${fmt(v)}</td>`).join("")}
        <td class="num">${fmt(totalGeneral)}</td>
      </tr>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Membresías</title>
      <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; padding: 24px; color: #000; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        p.sub { font-size: 12px; color: #555; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 14px; }
        th, td { border: 1px solid #999; padding: 4px 5px; text-align: left; }
        th { background: #F4CCCC; font-weight: 700; }
        td.num, th.num { text-align: right; }
        tr.total td { font-weight: 700; background: #FFF2CC; }
        @media print { body { padding: 0; } table { font-size: 8px; } }
      </style></head>
      <body>
        <h1>Estado de cuenta de Membresías</h1>
        <p class="sub">Usuario: ${userEmail || ""}</p>
        <p class="sub">Generado el ${fmtDate(todayISO())}</p>
        <table>
          <thead><tr>
            <th>Estatus</th><th>Nombre</th><th>Categoría</th><th>Método</th>
            <th class="num">Costo</th><th>Frecuencia</th><th>Tipo</th><th>Últ. Pago</th>
            <th class="num">Pagado</th>
            ${mesesLabel.map((m) => `<th class="num">${m}</th>`).join("")}
            <th class="num">Total año</th>
          </tr></thead>
          <tbody>${filas}${filaTotal}</tbody>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) { ventana.document.write(html); ventana.document.close(); }
  }

  function Tarjeta({ m }) {
    const ultPagoHist = ultimoPagoDe(m.nombre);
    const ultPago = ultPagoHist || m.ultimoPago || null;
    const proxPago = ultPago ? calcProximoPago(ultPago, m.frecuencia || "Mensual") : null;
    return (
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 10, background: m.activa ? "#fff" : SHEET.gris }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{m.nombre}</p>
            {m.categoria && <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>{m.categoria}</p>}
          </div>
          <button onClick={() => toggleActiva(m.id)} style={{
            fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
            border: "1px solid " + SHEET.grisBorde, background: m.activa ? SHEET.verde : "#fff", color: SHEET.texto, flexShrink: 0
          }}>{m.activa ? "Activa" : "Inactiva"}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Costo</span><br /><b>{fmt(m.costo)}</b></div>
          <div><span style={{ color: "#777" }}>Frecuencia</span><br /><b>{m.frecuencia}</b></div>
          <div><span style={{ color: "#777" }}>Pago</span><br /><b>{m.tipoPago}</b></div>
          <div><span style={{ color: "#777" }}>Día de pago</span><br /><b>{m.diaPago}</b></div>
        </div>
        <p style={{ fontSize: 11, color: "#555", margin: "8px 0 0" }}>
          {m.metodo}{m.cuenta ? ` · ${m.cuenta}` : ""}{ultPago ? ` · Últ. pago ${fmtDate(ultPago)}` : ""}
        </p>
        {proxPago && (
          <p style={{ fontSize: 11, fontWeight: 700, color: proxPago <= todayISO() ? SHEET.rosaBorde : SHEET.verdeBorde, margin: "2px 0 0" }}>
            📅 Próx. pago: {fmtDate(proxPago)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn full onClick={exportarPDF} style={{ flex: 1 }}>📄 Descargar PDF</Btn>
        <Btn full onClick={exportarCSV} style={{ flex: 1 }}>📊 Descargar Excel</Btn>
      </div>
      <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 14 }}>
        Para registrar un pago, ve a Registro → Egreso → Tipo "G. Fijo" → Categoría "Membresías" → elige la membresía.
      </p>
      <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "0 0 10px" }}>Activas</h3>
      {activas.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>No tienes membresías activas. Agrégalas desde Datos → Egresos → G. Fijo → Membresías.</p>}
      {activas.map((m) => <Tarjeta key={m.id} m={m} />)}

      {inactivas.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "16px 0 10px" }}>Inactivas</h3>
          {inactivas.map((m) => <Tarjeta key={m.id} m={m} />)}
        </>
      )}
    </div>
  );
}

function ServiciosTab({ servicios, toggleActiva, movimientos, userEmail }) {
  const activos = servicios.filter((s) => s.activa);
  const inactivos = servicios.filter((s) => !s.activa);
  const mesesLabel = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  function pagosPorMes(nombreServicio) {
    const totales = new Array(12).fill(0);
    movimientos.forEach((mv) => {
      if (mv.mov === "Egreso" && mv.categoria === "Servicios" && mv.subcategoria === nombreServicio) {
        const mesIdx = parseInt(mv.fecha.slice(5, 7), 10) - 1;
        if (mesIdx >= 0 && mesIdx < 12) totales[mesIdx] += Number(mv.cantidad);
      }
    });
    return totales;
  }

  function ultimoPagoDe(nombreServicio) {
    const pagos = movimientos.filter((mv) => mv.mov === "Egreso" && mv.categoria === "Servicios" && mv.subcategoria === nombreServicio);
    if (pagos.length === 0) return null;
    return pagos.reduce((max, mv) => (mv.fecha > max ? mv.fecha : max), pagos[0].fecha);
  }

  function exportarCSV() {
    const headers = ["Activo/Inactivo", "Nombre", "Categoría", "Método", "Costo", "Frecuencia", "Tipo de pago", "Últ. Pago", "Pagado", ...mesesLabel, "Total año"];
    const filas = servicios.map((s) => {
      const porMes = pagosPorMes(s.nombre);
      const totalAnio = porMes.reduce((sum, v) => sum + v, 0);
      const ultPago = ultimoPagoDe(s.nombre);
      return [
        s.activa ? "Activo" : "Inactivo", s.nombre, s.categoria || "", s.metodo || "", s.costo, s.frecuencia, s.tipoPago,
        ultPago ? fmtDate(ultPago) : "", totalAnio,
        ...porMes.map((v) => (v > 0 ? v : "")), totalAnio
      ];
    });
    const totalesPorMes = mesesLabel.map((_, i) => servicios.reduce((sum, s) => sum + pagosPorMes(s.nombre)[i], 0));
    const totalGeneral = totalesPorMes.reduce((sum, v) => sum + v, 0);
    const filaTotal = ["", "Total", "", "", "", "", "", "", totalGeneral, ...totalesPorMes, totalGeneral];
    const escape = (v) => {
      const str = String(v ?? "");
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const encabezado = [["Estado de cuenta de Servicios"], [`Usuario: ${userEmail || ""}`], [`Generado el: ${fmtDate(todayISO())}`], []];
    const csv = [...encabezado, headers, ...filas, filaTotal].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Servicios_${todayISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const filas = servicios.map((s) => {
      const porMes = pagosPorMes(s.nombre);
      const totalAnio = porMes.reduce((sum, v) => sum + v, 0);
      const ultPago = ultimoPagoDe(s.nombre);
      return `<tr>
        <td>${s.activa ? "Activo" : "Inactivo"}</td>
        <td>${s.nombre}</td>
        <td>${s.categoria || "-"}</td>
        <td>${s.metodo || "-"}</td>
        <td class="num">${s.esVariable ? "Variable" : fmt(s.costo)}</td>
        <td>${s.frecuencia}</td>
        <td>${s.tipoPago}</td>
        <td>${ultPago ? fmtDate(ultPago) : "-"}</td>
        <td class="num">${fmt(totalAnio)}</td>
        ${porMes.map((v) => `<td class="num">${v > 0 ? fmt(v) : "-"}</td>`).join("")}
        <td class="num">${fmt(totalAnio)}</td>
      </tr>`;
    }).join("");
    const totalesPorMes = mesesLabel.map((_, i) => servicios.reduce((sum, s) => sum + pagosPorMes(s.nombre)[i], 0));
    const totalGeneral = totalesPorMes.reduce((sum, v) => sum + v, 0);
    const filaTotal = `<tr class="total">
        <td colspan="8">Total</td>
        <td class="num">${fmt(totalGeneral)}</td>
        ${totalesPorMes.map((v) => `<td class="num">${fmt(v)}</td>`).join("")}
        <td class="num">${fmt(totalGeneral)}</td>
      </tr>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Servicios</title>
      <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; padding: 24px; color: #000; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        p.sub { font-size: 12px; color: #555; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 14px; }
        th, td { border: 1px solid #999; padding: 4px 5px; text-align: left; }
        th { background: #F4CCCC; font-weight: 700; }
        td.num, th.num { text-align: right; }
        tr.total td { font-weight: 700; background: #FFF2CC; }
        @media print { body { padding: 0; } table { font-size: 8px; } }
      </style></head>
      <body>
        <h1>Estado de cuenta de Servicios</h1>
        <p class="sub">Usuario: ${userEmail || ""}</p>
        <p class="sub">Generado el ${fmtDate(todayISO())}</p>
        <table>
          <thead><tr>
            <th>Estatus</th><th>Nombre</th><th>Categoría</th><th>Método</th>
            <th class="num">Costo</th><th>Frecuencia</th><th>Tipo</th><th>Últ. Pago</th>
            <th class="num">Pagado</th>
            ${mesesLabel.map((m) => `<th class="num">${m}</th>`).join("")}
            <th class="num">Total año</th>
          </tr></thead>
          <tbody>${filas}${filaTotal}</tbody>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) { ventana.document.write(html); ventana.document.close(); }
  }

  function Tarjeta({ s }) {
    const ultPagoHist = ultimoPagoDe(s.nombre);
    const ultPago = ultPagoHist || s.ultimoPago || null;
    const proxPago = ultPago ? calcProximoPago(ultPago, s.frecuencia || "Mensual") : null;
    return (
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 10, background: s.activa ? "#fff" : SHEET.gris }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{s.nombre}</p>
            {s.categoria && <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>{s.categoria}</p>}
          </div>
          <button onClick={() => toggleActiva(s.id)} style={{
            fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
            border: "1px solid " + SHEET.grisBorde, background: s.activa ? SHEET.verde : "#fff", color: SHEET.texto, flexShrink: 0
          }}>{s.activa ? "Activo" : "Inactivo"}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Costo</span><br /><b>{s.esVariable ? "Variable" : fmt(s.costo)}</b></div>
          <div><span style={{ color: "#777" }}>Frecuencia</span><br /><b>{s.frecuencia}</b></div>
          <div><span style={{ color: "#777" }}>Pago</span><br /><b>{s.tipoPago}</b></div>
          <div><span style={{ color: "#777" }}>Día de pago</span><br /><b>{s.diaPago}</b></div>
        </div>
        <p style={{ fontSize: 11, color: "#555", margin: "8px 0 0" }}>
          {s.metodo}{s.cuenta ? ` · ${s.cuenta}` : ""}{ultPago ? ` · Últ. pago ${fmtDate(ultPago)}` : ""}
        </p>
        {proxPago && (
          <p style={{ fontSize: 11, fontWeight: 700, color: proxPago <= todayISO() ? SHEET.rosaBorde : SHEET.verdeBorde, margin: "2px 0 0" }}>
            📅 Próx. pago: {fmtDate(proxPago)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn full onClick={exportarPDF} style={{ flex: 1 }}>📄 Descargar PDF</Btn>
        <Btn full onClick={exportarCSV} style={{ flex: 1 }}>📊 Descargar Excel</Btn>
      </div>
      <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 14 }}>
        Para registrar un pago, ve a Registro → Egreso → Tipo "G. Fijo" → Categoría "Servicios" → elige el servicio.
      </p>
      <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "0 0 10px" }}>Activos</h3>
      {activos.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>No tienes servicios activos. Agrégalos desde Datos → Egresos → G. Fijo → Servicios.</p>}
      {activos.map((s) => <Tarjeta key={s.id} s={s} />)}

      {inactivos.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "16px 0 10px" }}>Inactivos</h3>
          {inactivos.map((s) => <Tarjeta key={s.id} s={s} />)}
        </>
      )}
    </div>
  );
}

function SegurosTab({ seguros, toggleActiva, movimientos, userEmail }) {
  const activos = seguros.filter((s) => s.activa);
  const inactivos = seguros.filter((s) => !s.activa);
  const mesesLabel = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  function pagosPorMes(nombreSeguro) {
    const totales = new Array(12).fill(0);
    movimientos.forEach((mv) => {
      if (mv.mov === "Egreso" && mv.categoria === "Seguros" && mv.subcategoria === nombreSeguro) {
        const mesIdx = parseInt(mv.fecha.slice(5, 7), 10) - 1;
        if (mesIdx >= 0 && mesIdx < 12) totales[mesIdx] += Number(mv.cantidad);
      }
    });
    return totales;
  }

  function ultimoPagoDe(nombreSeguro) {
    const pagos = movimientos.filter((mv) => mv.mov === "Egreso" && mv.categoria === "Seguros" && mv.subcategoria === nombreSeguro);
    if (pagos.length === 0) return null;
    return pagos.reduce((max, mv) => (mv.fecha > max ? mv.fecha : max), pagos[0].fecha);
  }

  function exportarCSV() {
    const headers = ["Activa/Inactiva", "Nombre", "Categoría", "# de Póliza", "Método", "Costo", "Frecuencia", "Tipo de pago", "Últ. Pago", "Pagado", ...mesesLabel, "Total año"];
    const filas = seguros.map((s) => {
      const porMes = pagosPorMes(s.nombre);
      const totalAnio = porMes.reduce((sum, v) => sum + v, 0);
      const ultPago = ultimoPagoDe(s.nombre);
      return [
        s.activa ? "Activa" : "Inactiva", s.nombre, s.categoria || "", s.poliza || "", s.metodo || "", s.costo, s.frecuencia, s.tipoPago,
        ultPago ? fmtDate(ultPago) : "", totalAnio,
        ...porMes.map((v) => (v > 0 ? v : "")), totalAnio
      ];
    });
    const totalesPorMes = mesesLabel.map((_, i) => seguros.reduce((sum, s) => sum + pagosPorMes(s.nombre)[i], 0));
    const totalGeneral = totalesPorMes.reduce((sum, v) => sum + v, 0);
    const filaTotal = ["", "Total", "", "", "", "", "", "", "", totalGeneral, ...totalesPorMes, totalGeneral];
    const escape = (v) => {
      const str = String(v ?? "");
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const encabezado = [["Estado de cuenta de Seguros"], [`Usuario: ${userEmail || ""}`], [`Generado el: ${fmtDate(todayISO())}`], []];
    const csv = [...encabezado, headers, ...filas, filaTotal].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Seguros_${todayISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const filas = seguros.map((s) => {
      const porMes = pagosPorMes(s.nombre);
      const totalAnio = porMes.reduce((sum, v) => sum + v, 0);
      const ultPago = ultimoPagoDe(s.nombre);
      return `<tr>
        <td>${s.activa ? "Activa" : "Inactiva"}</td>
        <td>${s.nombre}</td>
        <td>${s.categoria || "-"}</td>
        <td>${s.poliza || "-"}</td>
        <td>${s.metodo || "-"}</td>
        <td class="num">${fmt(s.costo)}</td>
        <td>${s.frecuencia}</td>
        <td>${s.tipoPago}</td>
        <td>${ultPago ? fmtDate(ultPago) : "-"}</td>
        <td class="num">${fmt(totalAnio)}</td>
        ${porMes.map((v) => `<td class="num">${v > 0 ? fmt(v) : "-"}</td>`).join("")}
        <td class="num">${fmt(totalAnio)}</td>
      </tr>`;
    }).join("");
    const totalesPorMes = mesesLabel.map((_, i) => seguros.reduce((sum, s) => sum + pagosPorMes(s.nombre)[i], 0));
    const totalGeneral = totalesPorMes.reduce((sum, v) => sum + v, 0);
    const filaTotal = `<tr class="total">
        <td colspan="9">Total</td>
        <td class="num">${fmt(totalGeneral)}</td>
        ${totalesPorMes.map((v) => `<td class="num">${fmt(v)}</td>`).join("")}
        <td class="num">${fmt(totalGeneral)}</td>
      </tr>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Seguros</title>
      <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; padding: 24px; color: #000; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        p.sub { font-size: 12px; color: #555; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 14px; }
        th, td { border: 1px solid #999; padding: 4px 5px; text-align: left; }
        th { background: #F4CCCC; font-weight: 700; }
        td.num, th.num { text-align: right; }
        tr.total td { font-weight: 700; background: #FFF2CC; }
        @media print { body { padding: 0; } table { font-size: 8px; } }
      </style></head>
      <body>
        <h1>Estado de cuenta de Seguros</h1>
        <p class="sub">Usuario: ${userEmail || ""}</p>
        <p class="sub">Generado el ${fmtDate(todayISO())}</p>
        <table>
          <thead><tr>
            <th>Estatus</th><th>Nombre</th><th>Categoría</th><th># Póliza</th><th>Método</th>
            <th class="num">Costo</th><th>Frecuencia</th><th>Tipo</th><th>Últ. Pago</th>
            <th class="num">Pagado</th>
            ${mesesLabel.map((m) => `<th class="num">${m}</th>`).join("")}
            <th class="num">Total año</th>
          </tr></thead>
          <tbody>${filas}${filaTotal}</tbody>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) { ventana.document.write(html); ventana.document.close(); }
  }

  function Tarjeta({ s }) {
    return (
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 10, background: s.activa ? "#fff" : SHEET.gris }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{s.nombre}</p>
            {s.categoria && <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>{s.categoria}{s.poliza ? ` · Póliza ${s.poliza}` : ""}</p>}
          </div>
          <button onClick={() => toggleActiva(s.id)} style={{
            fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
            border: "1px solid " + SHEET.grisBorde, background: s.activa ? SHEET.verde : "#fff", color: SHEET.texto, flexShrink: 0
          }}>{s.activa ? "Activa" : "Inactiva"}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Costo</span><br /><b>{fmt(s.costo)}</b></div>
          <div><span style={{ color: "#777" }}>Frecuencia</span><br /><b>{s.frecuencia}</b></div>
          <div><span style={{ color: "#777" }}>Pago</span><br /><b>{s.tipoPago}</b></div>
          <div><span style={{ color: "#777" }}>Día de pago</span><br /><b>{s.diaPago}</b></div>
        </div>
        <p style={{ fontSize: 11, color: "#555", margin: "8px 0 0" }}>
          {s.metodo}{s.cuenta ? ` · ${s.cuenta}` : ""}{s.ultimoPago ? ` · Últ. pago ${fmtDate(s.ultimoPago)}` : ""}
        </p>
        {(() => {
          const ultPagoHist = ultimoPagoDe(s.nombre);
          const ultPago = ultPagoHist || s.ultimoPago || null;
          const proxPago = ultPago ? calcProximoPago(ultPago, s.frecuencia || "Anual") : null;
          return proxPago ? (
            <p style={{ fontSize: 11, fontWeight: 700, color: proxPago <= todayISO() ? SHEET.rosaBorde : SHEET.verdeBorde, margin: "2px 0 0" }}>
              📅 Próx. pago: {fmtDate(proxPago)}
            </p>
          ) : null;
        })()}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn full onClick={exportarPDF} style={{ flex: 1 }}>📄 Descargar PDF</Btn>
        <Btn full onClick={exportarCSV} style={{ flex: 1 }}>📊 Descargar Excel</Btn>
      </div>
      <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 14 }}>
        Para registrar un pago, ve a Registro → Egreso → Tipo "G. Fijo" → Categoría "Seguros" → elige el seguro.
      </p>
      <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "0 0 10px" }}>Activas</h3>
      {activos.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>No tienes seguros activos. Agrégalos desde Datos → Egresos → G. Fijo → Seguros.</p>}
      {activos.map((s) => <Tarjeta key={s.id} s={s} />)}

      {inactivos.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "16px 0 10px" }}>Inactivas</h3>
          {inactivos.map((s) => <Tarjeta key={s.id} s={s} />)}
        </>
      )}
    </div>
  );
}

function PrestamosTab({ prestamosBancarios, prestamosTerceros, toggleActivaBancario, movimientos, userEmail }) {
  const [vista, setVista] = useState("debo");
  const mesesLabel = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  function saldoTerceroDe(nombre, direccion) {
    const prestado = movimientos
      .filter((mv) => mv.subcategoria === nombre && mv.categoria === direccion && mv.tipo === "Préstamo" &&
        ((direccion === "a Tercero" && mv.mov === "Egreso") || (direccion === "de Tercero" && mv.mov === "Ingreso")))
      .reduce((sum, mv) => sum + Number(mv.cantidad), 0);
    const abonado = movimientos
      .filter((mv) => mv.subcategoria === nombre && mv.categoria === direccion && mv.tipo === "Préstamo" &&
        ((direccion === "a Tercero" && mv.mov === "Ingreso") || (direccion === "de Tercero" && mv.mov === "Egreso")))
      .reduce((sum, mv) => sum + Number(mv.cantidad), 0);
    return { prestado, abonado, saldo: prestado - abonado };
  }

  const bancariosActivos = prestamosBancarios.filter((p) => p.activa);
  const bancariosLiquidados = prestamosBancarios.filter((p) => !p.activa);
  const tercerosMeDeben = prestamosTerceros.filter((p) => p.direccion === "a Tercero");
  const tercerosYoDebo = prestamosTerceros.filter((p) => p.direccion === "de Tercero");

  function exportarCSVBancarios() {
    const escape = (v) => { const str = String(v ?? ""); return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str; };
    const encabezado = [["Lo que YO debo"], [`Usuario: ${userEmail || ""}`], [`Generado el: ${fmtDate(todayISO())}`], []];

    // Sección 1: Bancario / Crédito
    const headersBanc = ["Estatus", "Nombre", "Categoría", "Frecuencia", "Método", "Monto financiado", "Pago/periodo", "Núm. pagos", "Total a pagar", "Acumulado", "Pendiente", "Últ. Pago"];
    const filasBanc = prestamosBancarios.map((p) => {
      const acumulado = p.acumulado || 0;
      const totalAPagar = p.totalAPagar || 0;
      return [p.activa ? "Activo" : "Liquidado", p.nombre, p.categoria, p.frecuencia || "Mensual", p.metodo || "",
        p.montoFinanciado || 0, p.pagoPeriodo || 0, p.numPagos || 0, totalAPagar, acumulado,
        Math.max(0, totalAPagar - acumulado), p.ultimoPago ? fmtDate(p.ultimoPago) : ""];
    });
    const totalBancTotal = prestamosBancarios.reduce((s, p) => s + (p.totalAPagar || 0), 0);
    const totalBancAcum = prestamosBancarios.reduce((s, p) => s + (p.acumulado || 0), 0);
    const filaTotalBanc = ["", "TOTAL BANCARIO/CRÉDITO", "", "", "", "", "", "", totalBancTotal, totalBancAcum, Math.max(0, totalBancTotal - totalBancAcum), ""];

    // Sección 2: Yo le debo a terceros
    const tercYoDebo = prestamosTerceros.filter((p) => p.direccion === "de Tercero");
    const headersTer = ["Persona", "Nota", "Prestado (me dieron)", "Abonado (pagué)", "Saldo pendiente"];
    const filasTer = tercYoDebo.map((p) => {
      const { prestado, abonado, saldo } = saldoTerceroDe(p.nombre, p.direccion);
      return [p.nombre, p.nota || "", prestado, abonado, saldo];
    });
    const totalTerSaldo = tercYoDebo.reduce((s, p) => s + saldoTerceroDe(p.nombre, p.direccion).saldo, 0);
    const filaTotalTer = ["TOTAL TERCEROS", "", "", "", totalTerSaldo];

    const totalDeudaGeneral = Math.max(0, totalBancTotal - totalBancAcum) + totalTerSaldo;
    const filaResumen = [[], ["DEUDA TOTAL", fmt(totalDeudaGeneral)]];

    const csv = [
      ...encabezado,
      ["── BANCARIO / CRÉDITO ──"],
      headersBanc, ...filasBanc, filaTotalBanc,
      [],
      ["── YO LE DEBO A TERCEROS ──"],
      headersTer, ...filasTer, filaTotalTer,
      ...filaResumen
    ].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `Lo_que_debo_${todayISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function exportarPDFBancarios() {
    const tercYoDebo = prestamosTerceros.filter((p) => p.direccion === "de Tercero");

    const filasBanc = prestamosBancarios.map((p) => {
      const acumulado = p.acumulado || 0;
      const totalAPagar = p.totalAPagar || 0;
      const pendiente = Math.max(0, totalAPagar - acumulado);
      const pagosRestantes = p.pagoPeriodo > 0 ? Math.ceil(pendiente / p.pagoPeriodo) : 0;
      return `<tr>
        <td>${p.activa ? "Activo" : "Liquidado"}</td><td>${p.nombre}</td><td>${p.categoria}</td>
        <td>${p.frecuencia || "Mensual"}</td><td>${p.metodo || "-"}</td>
        <td class="num">${fmt(p.montoFinanciado || 0)}</td><td class="num">${fmt(p.pagoPeriodo || 0)}</td>
        <td class="num">${p.numPagos || 0}</td><td class="num">${fmt(totalAPagar)}</td>
        <td class="num">${fmt(acumulado)}</td><td class="num">${fmt(pendiente)}</td>
        <td class="num">${pagosRestantes}</td><td>${p.ultimoPago ? fmtDate(p.ultimoPago) : "-"}</td>
      </tr>`;
    }).join("");
    const totalBancTotal = prestamosBancarios.reduce((s, p) => s + (p.totalAPagar || 0), 0);
    const totalBancAcum = prestamosBancarios.reduce((s, p) => s + (p.acumulado || 0), 0);
    const totalBancPend = Math.max(0, totalBancTotal - totalBancAcum);
    const filaTotalBanc = `<tr class="total"><td colspan="8">Total Bancario/Crédito</td>
      <td class="num">${fmt(totalBancTotal)}</td><td class="num">${fmt(totalBancAcum)}</td>
      <td class="num">${fmt(totalBancPend)}</td><td></td><td></td></tr>`;

    const filasTer = tercYoDebo.map((p) => {
      const { prestado, abonado, saldo } = saldoTerceroDe(p.nombre, p.direccion);
      return `<tr><td>${p.nombre}</td><td>${p.nota || "-"}</td>
        <td class="num">${fmt(prestado)}</td><td class="num">${fmt(abonado)}</td><td class="num">${fmt(saldo)}</td></tr>`;
    }).join("");
    const totalTerSaldo = tercYoDebo.reduce((s, p) => s + saldoTerceroDe(p.nombre, p.direccion).saldo, 0);
    const filaTotalTer = `<tr class="total"><td colspan="4">Total Terceros</td><td class="num">${fmt(totalTerSaldo)}</td></tr>`;

    const totalDeudaGeneral = totalBancPend + totalTerSaldo;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lo que debo</title>
      <style>body{font-family:Calibri,Arial,sans-serif;padding:24px}h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;margin:20px 0 6px;color:#333}
      p.sub{font-size:12px;color:#555;margin:0 0 4px}
      table{width:100%;border-collapse:collapse;font-size:9px;margin-top:6px;margin-bottom:14px}th,td{border:1px solid #999;padding:4px 5px;text-align:left}
      th{background:#F4CCCC;font-weight:700}td.num,th.num{text-align:right}tr.total td{font-weight:700;background:#FFF2CC}
      .resumen{margin-top:16px;padding:10px 14px;background:#F4CCCC;border-radius:4px;font-size:13px;font-weight:700}
      @media print{body{padding:0}}</style></head>
      <body>
        <h1>Lo que YO debo</h1>
        <p class="sub">Usuario: ${userEmail || ""}</p>
        <p class="sub">Generado el ${fmtDate(todayISO())}</p>

        <h2>Bancario / Crédito</h2>
        <table><thead><tr><th>Estatus</th><th>Nombre</th><th>Cat.</th><th>Frec.</th><th>Método</th>
          <th class="num">Financiado</th><th class="num">Pago/periodo</th><th class="num">Pagos</th>
          <th class="num">Total</th><th class="num">Acumulado</th><th class="num">Pendiente</th><th class="num">Pagos rest.</th><th>Últ. Pago</th>
        </tr></thead><tbody>${filasBanc}${filaTotalBanc}</tbody></table>

        ${tercYoDebo.length > 0 ? `
        <h2>Yo le debo a terceros</h2>
        <table><thead><tr><th>Persona</th><th>Nota</th>
          <th class="num">Me prestaron</th><th class="num">He pagado</th><th class="num">Saldo</th>
        </tr></thead><tbody>${filasTer}${filaTotalTer}</tbody></table>` : ""}

        <div class="resumen">DEUDA TOTAL: ${fmt(totalDeudaGeneral)}</div>
        <script>window.onload=()=>{window.print();}</script>
      </body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) { ventana.document.write(html); ventana.document.close(); }
  }

  function exportarCSVTerceros() {
    const headers = ["Persona", "Quién debe", "Nota", "Prestado", "Abonado", "Saldo pendiente"];
    const filas = prestamosTerceros.map((p) => {
      const { prestado, abonado, saldo } = saldoTerceroDe(p.nombre, p.direccion);
      return [p.nombre, p.direccion === "a Tercero" ? "Me debe a mí" : "Yo le debo", p.nota || "", prestado, abonado, saldo];
    });
    const escape = (v) => {
      const str = String(v ?? "");
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const encabezado = [["Estado de cuenta de Préstamos de/a Terceros"], [`Usuario: ${userEmail || ""}`], [`Generado el: ${fmtDate(todayISO())}`], []];
    const csv = [...encabezado, headers, ...filas].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Prestamos_Terceros_${todayISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarPDFTerceros() {
    const filas = prestamosTerceros.map((p) => {
      const { prestado, abonado, saldo } = saldoTerceroDe(p.nombre, p.direccion);
      return `<tr>
        <td>${p.nombre}</td>
        <td>${p.direccion === "a Tercero" ? "Me debe a mí" : "Yo le debo"}</td>
        <td>${p.nota || "-"}</td>
        <td class="num">${fmt(prestado)}</td>
        <td class="num">${fmt(abonado)}</td>
        <td class="num">${fmt(saldo)}</td>
      </tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Préstamos de/a Terceros</title>
      <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; padding: 24px; color: #000; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        p.sub { font-size: 12px; color: #555; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 14px; }
        th, td { border: 1px solid #999; padding: 5px 6px; text-align: left; }
        th { background: #F4CCCC; font-weight: 700; }
        td.num, th.num { text-align: right; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>Estado de cuenta de Préstamos de/a Terceros</h1>
        <p class="sub">Usuario: ${userEmail || ""}</p>
        <p class="sub">Generado el ${fmtDate(todayISO())}</p>
        <table>
          <thead><tr><th>Persona</th><th>Quién debe</th><th>Nota</th><th class="num">Prestado</th><th class="num">Abonado</th><th class="num">Saldo</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) { ventana.document.write(html); ventana.document.close(); }
  }

  function TarjetaBancario({ p }) {
    const acumulado = p.acumulado || 0;
    const totalAPagar = p.totalAPagar || 0;
    const pendiente = Math.max(0, totalAPagar - acumulado);
    const pagosRestantes = p.pagoPeriodo > 0 ? Math.ceil(pendiente / p.pagoPeriodo) : 0;
    return (
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 10, background: p.activa ? "#fff" : SHEET.gris }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{p.nombre} <span style={{ fontWeight: 400, fontSize: 11, color: "#777" }}>({p.categoria})</span></p>
            <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>{p.frecuencia || "Mensual"} · {p.metodo}{p.cuenta ? ` · ${p.cuenta}` : ""}</p>
          </div>
          <span style={{
            fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, fontFamily: SHEET.fuente,
            border: "1px solid " + SHEET.grisBorde, background: p.activa ? SHEET.verde : SHEET.amarillo, color: SHEET.texto, flexShrink: 0
          }}>{p.activa ? "Activo" : "Liquidado"}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Pago/periodo</span><br /><b>{fmt(p.pagoPeriodo || 0)}</b></div>
          <div><span style={{ color: "#777" }}>Total a pagar</span><br /><b>{fmt(totalAPagar)}</b></div>
          <div><span style={{ color: "#777" }}>Pagos rest.</span><br /><b>{pagosRestantes}</b></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 6, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Acumulado</span><br /><b>{fmt(acumulado)}</b></div>
          <div><span style={{ color: "#777" }}>Pendiente</span><br /><b>{fmt(pendiente)}</b></div>
          {(p.montoFinanciado || 0) > 0 && <div><span style={{ color: "#777" }}>Financiado</span><br /><b>{fmt(p.montoFinanciado)}</b></div>}
        </div>
        {p.ultimoPago && <p style={{ fontSize: 11, color: "#888", margin: "6px 0 0", fontStyle: "italic" }}>Último pago: {fmtDate(p.ultimoPago)}</p>}
      </div>
    );
  }

  function TarjetaTercero({ p }) {
    const { prestado, abonado, saldo } = saldoTerceroDe(p.nombre, p.direccion);
    return (
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 10, background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{p.nombre}</p>
            {p.nota && <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>{p.nota}</p>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Prestado</span><br /><b>{fmt(prestado)}</b></div>
          <div><span style={{ color: "#777" }}>Abonado</span><br /><b>{fmt(abonado)}</b></div>
          <div><span style={{ color: "#777" }}>Saldo</span><br /><b>{fmt(saldo)}</b></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={() => setVista("debo")} style={{
          flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
          border: vista === "debo" ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
          background: vista === "debo" ? SHEET.azul : "#fff"
        }}>Debo</button>
        <button onClick={() => setVista("meDeben")} style={{
          flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
          border: vista === "meDeben" ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
          background: vista === "meDeben" ? SHEET.azul : "#fff"
        }}>Me deben</button>
      </div>

      {vista === "debo" ? (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <Btn full onClick={exportarPDFBancarios} style={{ flex: 1 }}>📄 Descargar PDF</Btn>
            <Btn full onClick={exportarCSVBancarios} style={{ flex: 1 }}>📊 Descargar Excel</Btn>
          </div>
          <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 14 }}>
            Para registrar un pago, ve a Registro → Egreso → Tipo "Préstamo" → Bancario o Crédito → elige el préstamo.
          </p>
          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "0 0 10px" }}>Bancario / Crédito</h3>
          {bancariosActivos.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>No tienes préstamos activos. Agrégalos desde Datos → Egresos → Tipo "Préstamo".</p>}
          {bancariosActivos.map((p) => <TarjetaBancario key={p.id} p={p} />)}

          {bancariosLiquidados.length > 0 && (
            <>
              <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "16px 0 10px" }}>Liquidados</h3>
              {bancariosLiquidados.map((p) => <TarjetaBancario key={p.id} p={p} />)}
            </>
          )}

          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "20px 0 10px" }}>Yo le debo a un tercero</h3>
          {tercerosYoDebo.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>No tienes deudas con terceros registradas.</p>}
          {tercerosYoDebo.map((p) => <TarjetaTercero key={p.id} p={p} />)}
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <Btn full onClick={exportarPDFTerceros} style={{ flex: 1 }}>📄 Descargar PDF</Btn>
            <Btn full onClick={exportarCSVTerceros} style={{ flex: 1 }}>📊 Descargar Excel</Btn>
          </div>
          <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 14 }}>
            Para registrar un préstamo o abono, ve a Registro → Egreso o Ingreso → Tipo "Préstamo" → a Tercero / de Tercero → elige la persona.
          </p>
          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "0 0 10px" }}>Me deben a mí</h3>
          {tercerosMeDeben.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Nadie te debe dinero registrado. Agrégalos desde Datos → Egresos → Tipo "Préstamo" → De/A Terceros.</p>}
          {tercerosMeDeben.map((p) => <TarjetaTercero key={p.id} p={p} />)}
        </>
      )}
    </div>
  );
}

function AhorroTab({ ahorros, toggleActiva, movimientos, userEmail }) {
  const activas = ahorros.filter((a) => a.activa);
  const inactivas = ahorros.filter((a) => !a.activa);

  function acumuladoDe(nombreAhorro) {
    return movimientos
      .filter((mv) => mv.mov === "Egreso" && mv.categoria === nombreAhorro)
      .reduce((sum, mv) => sum + Number(mv.cantidad), 0);
  }

  function ultimoPagoDe(nombreAhorro) {
    const pagos = movimientos.filter((mv) => mv.mov === "Egreso" && mv.categoria === nombreAhorro);
    if (pagos.length === 0) return null;
    return pagos.reduce((max, mv) => (mv.fecha > max ? mv.fecha : max), pagos[0].fecha);
  }

  function exportarCSV() {
    const headers = ["Activa/Inactiva", "Nombre", "Categoría", "Descripción", "Método", "Meta", "Plazo (meses)", "Aportación", "Acumulado", "Pendiente", "Últ. Pago"];
    const filas = ahorros.map((a) => {
      const acumulado = acumuladoDe(a.nombre);
      const ultPago = ultimoPagoDe(a.nombre);
      return [a.activa ? "Activa" : "Inactiva", a.nombre, a.categoria || "", a.descripcion || "", a.metodo || "", a.meta, a.plazoMeses, a.aportacion, acumulado, Math.max(0, a.meta - acumulado), ultPago ? fmtDate(ultPago) : ""];
    });
    const totalMeta = ahorros.reduce((s, a) => s + a.meta, 0);
    const totalAcumulado = ahorros.reduce((s, a) => s + acumuladoDe(a.nombre), 0);
    const filaTotal = ["", "Total", "", "", "", totalMeta, "", "", totalAcumulado, Math.max(0, totalMeta - totalAcumulado), ""];
    const escape = (v) => {
      const str = String(v ?? "");
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const encabezado = [["Estado de cuenta de Ahorro"], [`Usuario: ${userEmail || ""}`], [`Generado el: ${fmtDate(todayISO())}`], []];
    const csv = [...encabezado, headers, ...filas, filaTotal].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a2 = document.createElement("a");
    a2.href = url; a2.download = `Ahorro_${todayISO()}.csv`;
    document.body.appendChild(a2); a2.click(); document.body.removeChild(a2);
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const filas = ahorros.map((a) => {
      const acumulado = acumuladoDe(a.nombre);
      const ultPago = ultimoPagoDe(a.nombre);
      return `<tr>
        <td>${a.activa ? "Activa" : "Inactiva"}</td>
        <td>${a.nombre}</td>
        <td>${a.categoria || "-"}</td>
        <td>${a.metodo || "-"}</td>
        <td class="num">${fmt(a.meta)}</td>
        <td class="num">${a.plazoMeses}</td>
        <td class="num">${fmt(a.aportacion)}</td>
        <td class="num">${fmt(acumulado)}</td>
        <td class="num">${fmt(Math.max(0, a.meta - acumulado))}</td>
        <td>${ultPago ? fmtDate(ultPago) : "-"}</td>
      </tr>`;
    }).join("");
    const totalMeta = ahorros.reduce((s, a) => s + a.meta, 0);
    const totalAcumulado = ahorros.reduce((s, a) => s + acumuladoDe(a.nombre), 0);
    const filaTotal = `<tr class="total">
        <td colspan="4">Total</td>
        <td class="num">${fmt(totalMeta)}</td>
        <td></td>
        <td></td>
        <td class="num">${fmt(totalAcumulado)}</td>
        <td class="num">${fmt(Math.max(0, totalMeta - totalAcumulado))}</td>
        <td></td>
      </tr>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ahorro</title>
      <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; padding: 24px; color: #000; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        p.sub { font-size: 12px; color: #555; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 14px; }
        th, td { border: 1px solid #999; padding: 5px 6px; text-align: left; }
        th { background: #F4CCCC; font-weight: 700; }
        td.num, th.num { text-align: right; }
        tr.total td { font-weight: 700; background: #FFF2CC; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>Estado de cuenta de Ahorro</h1>
        <p class="sub">Usuario: ${userEmail || ""}</p>
        <p class="sub">Generado el ${fmtDate(todayISO())}</p>
        <table>
          <thead><tr>
            <th>Estatus</th><th>Nombre</th><th>Categoría</th><th>Método</th>
            <th class="num">Meta</th><th class="num">Plazo</th><th class="num">Aportación</th>
            <th class="num">Acumulado</th><th class="num">Pendiente</th><th>Últ. Pago</th>
          </tr></thead>
          <tbody>${filas}${filaTotal}</tbody>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) { ventana.document.write(html); ventana.document.close(); }
  }

  function Tarjeta({ a }) {
    const acumulado = acumuladoDe(a.nombre);
    const pendiente = Math.max(0, a.meta - acumulado);
    return (
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 10, background: a.activa ? "#fff" : SHEET.gris }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{a.nombre}</p>
            {a.categoria && <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>{a.categoria}{a.descripcion ? ` · ${a.descripcion}` : ""}</p>}
          </div>
          <button onClick={() => toggleActiva(a.id)} style={{
            fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
            border: "1px solid " + SHEET.grisBorde, background: a.activa ? SHEET.verde : "#fff", color: SHEET.texto, flexShrink: 0
          }}>{a.activa ? "Activa" : "Inactiva"}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Meta</span><br /><b>{fmt(a.meta)}</b></div>
          <div><span style={{ color: "#777" }}>Acumulado</span><br /><b>{fmt(acumulado)}</b></div>
          <div><span style={{ color: "#777" }}>Pendiente</span><br /><b>{fmt(pendiente)}</b></div>
        </div>
        <p style={{ fontSize: 11.5, margin: "8px 0 0", fontStyle: "italic" }}>
          Aportación {fmt(a.aportacion)} · {a.plazoMeses} meses · {a.metodo}{a.cuenta ? ` · ${a.cuenta}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn full onClick={exportarPDF} style={{ flex: 1 }}>📄 Descargar PDF</Btn>
        <Btn full onClick={exportarCSV} style={{ flex: 1 }}>📊 Descargar Excel</Btn>
      </div>
      <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 14 }}>
        Para registrar una aportación, ve a Registro → Egreso → Tipo "Ahorro" → elige el ahorro.
      </p>
      <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "0 0 10px" }}>Activas</h3>
      {activas.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>No tienes ahorros activos. Agrégalos desde Datos → Egresos → Tipo "Ahorro".</p>}
      {activas.map((a) => <Tarjeta key={a.id} a={a} />)}

      {inactivas.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "16px 0 10px" }}>Inactivas</h3>
          {inactivas.map((a) => <Tarjeta key={a.id} a={a} />)}
        </>
      )}
    </div>
  );
}

function InversionTab({ inversiones, toggleActiva, movimientos, userEmail }) {
  const activas = inversiones.filter((i) => i.activa);
  const inactivas = inversiones.filter((i) => !i.activa);

  function acumuladoDe(nombreInversion) {
    return movimientos
      .filter((mv) => mv.mov === "Egreso" && mv.categoria === nombreInversion)
      .reduce((sum, mv) => sum + Number(mv.cantidad), 0);
  }

  function ultimoPagoDe(nombreInversion) {
    const pagos = movimientos.filter((mv) => mv.mov === "Egreso" && mv.categoria === nombreInversion);
    if (pagos.length === 0) return null;
    return pagos.reduce((max, mv) => (mv.fecha > max ? mv.fecha : max), pagos[0].fecha);
  }

  function exportarCSV() {
    const headers = ["Activa/Inactiva", "Nombre", "Categoría", "Descripción", "Objetivo", "Método", "Meta", "Plazo (meses)", "Aportación", "Acumulado", "Pendiente", "Últ. Pago"];
    const filas = inversiones.map((i) => {
      const acumulado = acumuladoDe(i.nombre);
      const ultPago = ultimoPagoDe(i.nombre);
      return [i.activa ? "Activa" : "Inactiva", i.nombre, i.categoria || "", i.descripcion || "", i.objetivo || "", i.metodo || "", i.meta, i.plazoMeses, i.aportacion, acumulado, Math.max(0, i.meta - acumulado), ultPago ? fmtDate(ultPago) : ""];
    });
    const totalMeta = inversiones.reduce((s, i) => s + i.meta, 0);
    const totalAcumulado = inversiones.reduce((s, i) => s + acumuladoDe(i.nombre), 0);
    const filaTotal = ["", "Total", "", "", "", "", totalMeta, "", "", totalAcumulado, Math.max(0, totalMeta - totalAcumulado), ""];
    const escape = (v) => {
      const str = String(v ?? "");
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const encabezado = [["Estado de cuenta de Inversión"], [`Usuario: ${userEmail || ""}`], [`Generado el: ${fmtDate(todayISO())}`], []];
    const csv = [...encabezado, headers, ...filas, filaTotal].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Inversion_${todayISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const filas = inversiones.map((i) => {
      const acumulado = acumuladoDe(i.nombre);
      const ultPago = ultimoPagoDe(i.nombre);
      return `<tr>
        <td>${i.activa ? "Activa" : "Inactiva"}</td>
        <td>${i.nombre}</td>
        <td>${i.categoria || "-"}</td>
        <td>${i.objetivo || "-"}</td>
        <td>${i.metodo || "-"}</td>
        <td class="num">${fmt(i.meta)}</td>
        <td class="num">${i.plazoMeses}</td>
        <td class="num">${fmt(i.aportacion)}</td>
        <td class="num">${fmt(acumulado)}</td>
        <td class="num">${fmt(Math.max(0, i.meta - acumulado))}</td>
        <td>${ultPago ? fmtDate(ultPago) : "-"}</td>
      </tr>`;
    }).join("");
    const totalMeta = inversiones.reduce((s, i) => s + i.meta, 0);
    const totalAcumulado = inversiones.reduce((s, i) => s + acumuladoDe(i.nombre), 0);
    const filaTotal = `<tr class="total">
        <td colspan="5">Total</td>
        <td class="num">${fmt(totalMeta)}</td>
        <td></td>
        <td></td>
        <td class="num">${fmt(totalAcumulado)}</td>
        <td class="num">${fmt(Math.max(0, totalMeta - totalAcumulado))}</td>
        <td></td>
      </tr>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Inversión</title>
      <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; padding: 24px; color: #000; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        p.sub { font-size: 12px; color: #555; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 14px; }
        th, td { border: 1px solid #999; padding: 5px 6px; text-align: left; }
        th { background: #F4CCCC; font-weight: 700; }
        td.num, th.num { text-align: right; }
        tr.total td { font-weight: 700; background: #FFF2CC; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>Estado de cuenta de Inversión</h1>
        <p class="sub">Usuario: ${userEmail || ""}</p>
        <p class="sub">Generado el ${fmtDate(todayISO())}</p>
        <table>
          <thead><tr>
            <th>Estatus</th><th>Nombre</th><th>Categoría</th><th>Objetivo</th><th>Método</th>
            <th class="num">Meta</th><th class="num">Plazo</th><th class="num">Aportación</th>
            <th class="num">Acumulado</th><th class="num">Pendiente</th><th>Últ. Pago</th>
          </tr></thead>
          <tbody>${filas}${filaTotal}</tbody>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) { ventana.document.write(html); ventana.document.close(); }
  }

  function Tarjeta({ i }) {
    const acumulado = acumuladoDe(i.nombre);
    const pendiente = Math.max(0, i.meta - acumulado);
    return (
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 10, background: i.activa ? "#fff" : SHEET.gris }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{i.nombre}</p>
            {i.categoria && <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>{i.categoria}{i.objetivo ? ` · ${i.objetivo}` : ""}</p>}
          </div>
          <button onClick={() => toggleActiva(i.id)} style={{
            fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
            border: "1px solid " + SHEET.grisBorde, background: i.activa ? SHEET.verde : "#fff", color: SHEET.texto, flexShrink: 0
          }}>{i.activa ? "Activa" : "Inactiva"}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Meta</span><br /><b>{fmt(i.meta)}</b></div>
          <div><span style={{ color: "#777" }}>Acumulado</span><br /><b>{fmt(acumulado)}</b></div>
          <div><span style={{ color: "#777" }}>Pendiente</span><br /><b>{fmt(pendiente)}</b></div>
        </div>
        <p style={{ fontSize: 11.5, margin: "8px 0 0", fontStyle: "italic" }}>
          Aportación {fmt(i.aportacion)} · {i.plazoMeses} meses · {i.metodo}{i.cuenta ? ` · ${i.cuenta}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn full onClick={exportarPDF} style={{ flex: 1 }}>📄 Descargar PDF</Btn>
        <Btn full onClick={exportarCSV} style={{ flex: 1 }}>📊 Descargar Excel</Btn>
      </div>
      <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 14 }}>
        Para registrar una aportación, ve a Registro → Egreso → Tipo "Inversión" → elige la inversión.
      </p>
      <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "0 0 10px" }}>Activas</h3>
      {activas.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>No tienes inversiones activas. Agrégalas desde Datos → Egresos → Tipo "Inversión".</p>}
      {activas.map((i) => <Tarjeta key={i.id} i={i} />)}

      {inactivas.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "16px 0 10px" }}>Inactivas</h3>
          {inactivas.map((i) => <Tarjeta key={i.id} i={i} />)}
        </>
      )}
    </div>
  );
}

function FamiliaTab({ familiares, toggleActiva, movimientos, userEmail }) {
  const mesesLabel = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const activos = familiares.filter((f) => f.activa);
  const inactivos = familiares.filter((f) => !f.activa);

  function aportPorMes(nombreFamiliar) {
    const totales = new Array(12).fill(0);
    movimientos.forEach((mv) => {
      if (mv.mov === "Egreso" && mv.categoria === "Aportación" && mv.subcategoria === nombreFamiliar) {
        const i = parseInt(mv.fecha.slice(5, 7), 10) - 1;
        if (i >= 0 && i < 12) totales[i] += Number(mv.cantidad);
      }
    });
    return totales;
  }

  function tdcPorMes(nombreFamiliar) {
    const totales = new Array(12).fill(0);
    movimientos.forEach((mv) => {
      if (mv.mov === "Egreso" && mv.categoria === "Pago TDC Familiar" && mv.subcategoria === nombreFamiliar) {
        const i = parseInt(mv.fecha.slice(5, 7), 10) - 1;
        if (i >= 0 && i < 12) totales[i] += Number(mv.cantidad);
      }
    });
    return totales;
  }

  function exportarCSV() {
    const headers = ["Familiar", "Parentesco", "Estatus", "Meta", "Plazo", "Aport. mensual", "Acum. Aport.", "Pendiente", "Acum. TDC", "Prom. TDC/mes",
      ...mesesLabel.flatMap((m) => [`${m} Aport.`, `${m} TDC`]), "Total Aport. año", "Total TDC año"];
    const filas = familiares.map((f) => {
      const ap = aportPorMes(f.nombre);
      const td = tdcPorMes(f.nombre);
      const totalAp = ap.reduce((s, v) => s + v, 0);
      const totalTDC = td.reduce((s, v) => s + v, 0);
      const mesesConTDC = td.filter((v) => v > 0).length || 1;
      return [
        f.nombre, f.parentesco || "", f.activa ? "Activo" : "Inactivo",
        f.meta || 0, f.plazoMeses || 0, f.aportacion || 0,
        f.acumuladoAport || 0, Math.max(0, (f.meta || 0) - (f.acumuladoAport || 0)),
        f.acumuladoTDC || 0, Math.round(((f.acumuladoTDC || 0) / mesesConTDC) * 100) / 100,
        ...mesesLabel.flatMap((_, i) => [ap[i] > 0 ? ap[i] : "", td[i] > 0 ? td[i] : ""]),
        totalAp, totalTDC
      ];
    });
    const escape = (v) => { const s = String(v ?? ""); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; };
    const encabezado = [["Estado de cuenta de Familia"], [`Usuario: ${userEmail || ""}`], [`Generado el: ${fmtDate(todayISO())}`], []];
    const csv = [...encabezado, headers, ...filas].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Familia_${todayISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const filas = familiares.map((f) => {
      const ap = aportPorMes(f.nombre);
      const td = tdcPorMes(f.nombre);
      const totalAp = ap.reduce((s, v) => s + v, 0);
      const totalTDC = td.reduce((s, v) => s + v, 0);
      const pendiente = Math.max(0, (f.meta || 0) - (f.acumuladoAport || 0));
      const mesesConTDC = td.filter((v) => v > 0).length || 1;
      const promTDC = Math.round(((f.acumuladoTDC || 0) / mesesConTDC) * 100) / 100;
      return `<tr>
        <td>${f.nombre}</td><td>${f.parentesco || "-"}</td><td>${f.activa ? "Activo" : "Inactivo"}</td>
        <td class="num">${fmt(f.meta || 0)}</td><td class="num">${f.plazoMeses || 0}</td><td class="num">${fmt(f.aportacion || 0)}</td>
        <td class="num">${fmt(f.acumuladoAport || 0)}</td><td class="num">${fmt(pendiente)}</td>
        <td class="num">${fmt(f.acumuladoTDC || 0)}</td><td class="num">${fmt(promTDC)}</td>
        ${mesesLabel.map((_, i) => `<td class="num">${ap[i] > 0 ? fmt(ap[i]) : "-"}</td><td class="num">${td[i] > 0 ? fmt(td[i]) : "-"}</td>`).join("")}
        <td class="num">${fmt(totalAp)}</td><td class="num">${fmt(totalTDC)}</td>
      </tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Familia</title>
      <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; padding: 24px; color: #000; }
        h1 { font-size: 20px; margin: 0 0 4px; } p.sub { font-size: 12px; color: #555; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 8px; margin-top: 14px; }
        th, td { border: 1px solid #999; padding: 3px 4px; text-align: left; }
        th { background: #F4CCCC; font-weight: 700; }
        td.num, th.num { text-align: right; }
        @media print { body { padding: 0; } }
      </style></head><body>
        <h1>Estado de cuenta de Familia</h1>
        <p class="sub">Usuario: ${userEmail || ""}</p>
        <p class="sub">Generado el ${fmtDate(todayISO())}</p>
        <table><thead><tr>
          <th>Familiar</th><th>Parentesco</th><th>Estatus</th>
          <th class="num">Meta</th><th class="num">Plazo</th><th class="num">Aport. men.</th>
          <th class="num">Acum. Aport.</th><th class="num">Pendiente</th>
          <th class="num">Acum. TDC</th><th class="num">Prom. TDC</th>
          ${mesesLabel.map((m) => `<th class="num">${m} Ap.</th><th class="num">${m} TDC</th>`).join("")}
          <th class="num">Tot. Aport.</th><th class="num">Tot. TDC</th>
        </tr></thead><tbody>${filas}</tbody></table>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) { ventana.document.write(html); ventana.document.close(); }
  }

  function Tarjeta({ f }) {
    const pendiente = Math.max(0, (f.meta || 0) - (f.acumuladoAport || 0));
    const mesesConTDC = movimientos.filter((mv) => mv.mov === "Egreso" && mv.categoria === "Pago TDC Familiar" && mv.subcategoria === f.nombre).length;
    const promTDC = mesesConTDC > 0 ? Math.round(((f.acumuladoTDC || 0) / mesesConTDC) * 100) / 100 : 0;
    return (
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 10, background: f.activa ? "#fff" : SHEET.gris }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{f.nombre}
              {f.parentesco && <span style={{ fontWeight: 400, fontSize: 11, color: "#777" }}> · {f.parentesco}</span>}
            </p>
            {f.categoria && <p style={{ fontSize: 11, color: "#888", margin: "1px 0 0" }}>{f.categoria}</p>}
          </div>
          <button onClick={() => toggleActiva(f.id)} style={{
            fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3,
            cursor: "pointer", fontFamily: SHEET.fuente, border: "1px solid " + SHEET.grisBorde,
            background: f.activa ? SHEET.verde : "#fff", color: SHEET.texto, flexShrink: 0
          }}>{f.activa ? "Activo" : "Inactivo"}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Meta aport.</span><br /><b>{fmt(f.meta || 0)}</b></div>
          <div><span style={{ color: "#777" }}>Acumulado</span><br /><b>{fmt(f.acumuladoAport || 0)}</b></div>
          <div><span style={{ color: "#777" }}>Pendiente</span><br /><b>{fmt(pendiente)}</b></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 6, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Acum. TDC</span><br /><b>{fmt(f.acumuladoTDC || 0)}</b></div>
          <div><span style={{ color: "#777" }}>Prom. TDC/mes</span><br /><b>{fmt(promTDC)}</b></div>
          <div><span style={{ color: "#777" }}>Aport. mensual</span><br /><b>{fmt(f.aportacion || 0)}</b></div>
        </div>
        <p style={{ fontSize: 11.5, margin: "8px 0 0", fontStyle: "italic", color: "#555" }}>
          {f.plazoMeses || 0} meses · {f.metodo}{f.cuenta ? ` · ${f.cuenta}` : ""}
          {f.ultimoPago ? ` · Últ. pago ${fmtDate(f.ultimoPago)}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn full onClick={exportarPDF} style={{ flex: 1 }}>📄 Descargar PDF</Btn>
        <Btn full onClick={exportarCSV} style={{ flex: 1 }}>📊 Descargar Excel</Btn>
      </div>
      <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 14 }}>
        Registro → Egreso → Tipo "Familia" → "Aportación" o "Pago TDC Familiar" → elige el familiar.
      </p>
      <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "0 0 10px" }}>Activos</h3>
      {activos.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin familiares activos. Agrégalos desde Datos → Egresos → Tipo "Familia".</p>}
      {activos.map((f) => <Tarjeta key={f.id} f={f} />)}
      {inactivos.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "16px 0 10px" }}>Inactivos</h3>
          {inactivos.map((f) => <Tarjeta key={f.id} f={f} />)}
        </>
      )}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("registrar");
  const [catalog, setCatalog] = useState(DEFAULT_CATALOG);
  const [movimientos, setMovimientos] = useState([]);
  const catalogRef = useRef(catalog);
  useEffect(() => { catalogRef.current = catalog; }, [catalog]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id || null;

  async function guardarCatalogoAhora(catalogoAGuardar) {
    if (!userId) return;
    await supabase.from("catalogos").update({ data: catalogoAGuardar, updated_at: new Date().toISOString() }).eq("user_id", userId);
  }

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoaded(false);
      const { data: cat } = await supabase.from("catalogos").select("data").eq("user_id", userId).maybeSingle();
      if (cat && cat.data && Object.keys(cat.data).length > 0) {
        const datosCargados = { ...cat.data };
        if (Array.isArray(datosCargados.familiares) && datosCargados.familiares.some((f) => typeof f === "string")) {
          datosCargados.familiares = datosCargados.familiares.map((f) =>
            typeof f === "string" ? { id: uid(), nombre: f, parentesco: "" } : f
          );
        }
        const tiposFusionados = Array.from(new Set([...(DEFAULT_CATALOG.tipos), ...(datosCargados.tipos || [])]));
        const categoriasFusionadas = { ...DEFAULT_CATALOG.categorias };
        Object.keys(datosCargados.categorias || {}).forEach((k) => {
          categoriasFusionadas[k] = datosCargados.categorias[k];
        });
        const subcategoriasFusionadas = { ...DEFAULT_CATALOG.subcategorias };
        Object.keys(datosCargados.subcategorias || {}).forEach((k) => {
          subcategoriasFusionadas[k] = datosCargados.subcategorias[k];
        });
        const ingresoSubFusionado = { ...DEFAULT_CATALOG.ingresoSub };
        Object.keys(datosCargados.ingresoSub || {}).forEach((k) => {
          ingresoSubFusionado[k] = datosCargados.ingresoSub[k];
        });
        setCatalog({
          ...DEFAULT_CATALOG, ...datosCargados,
          tipos: tiposFusionados, categorias: categoriasFusionadas,
          subcategorias: subcategoriasFusionadas, ingresoSub: ingresoSubFusionado
        });
      } else {
        await supabase.from("catalogos").insert({ user_id: userId, data: DEFAULT_CATALOG });
        setCatalog(DEFAULT_CATALOG);
      }
      const { data: movs } = await supabase.from("movimientos").select("*").eq("user_id", userId).order("fecha", { ascending: false });
      setMovimientos((movs || []).map((m) => ({ ...m, cantidad: Number(m.cantidad) })));
      setLoaded(true);
    })();
  }, [userId]);

  useEffect(() => {
    if (!loaded || !userId) return;
    const timer = setTimeout(() => {
      supabase.from("catalogos").update({ data: catalog, updated_at: new Date().toISOString() }).eq("user_id", userId);
    }, 600);
    return () => clearTimeout(timer);
  }, [catalog, loaded, userId]);

  async function addMovimiento(entry) {
    const { data, error } = await supabase.from("movimientos").insert({ ...entry, user_id: session.user.id }).select().single();
    if (!error && data) {
      setMovimientos((prev) => [{ ...data, cantidad: Number(data.cantidad) }, ...prev]);
      if (entry.mov === "Egreso" && (entry.categoria === "Bancario" || entry.categoria === "Crédito") && entry.subcategoria) {
        const lista = catalogRef.current.prestamosBancarios || [];
        const prestamo = lista.find((p) => p.nombre === entry.subcategoria && p.categoria === entry.categoria);
        if (prestamo) {
          const nuevoAcumulado = Math.round((Number(prestamo.acumulado || 0) + Number(entry.cantidad)) * 100) / 100;
          const liquidado = nuevoAcumulado >= (prestamo.totalAPagar || 0);
          const actualizado = {
            ...catalogRef.current,
            prestamosBancarios: lista.map((p) => (p.id === prestamo.id ? { ...p, acumulado: nuevoAcumulado, ultimoPago: entry.fecha, activa: !liquidado } : p))
          };
          setCatalog(actualizado);
          guardarCatalogoAhora(actualizado);
        }
      }
      if (entry.mov === "Egreso" && (entry.categoria === "Aportación" || entry.categoria === "Pago TDC Familiar") && entry.subcategoria) {
        const lista = catalogRef.current.familiares || [];
        const fam = lista.find((f) => f.nombre === entry.subcategoria);
        if (fam) {
          const campo = entry.categoria === "Aportación" ? "acumuladoAport" : "acumuladoTDC";
          const nuevo = Math.round((Number(fam[campo] || 0) + Number(entry.cantidad)) * 100) / 100;
          const actualizado = {
            ...catalogRef.current,
            familiares: lista.map((f) => (f.id === fam.id ? { ...f, [campo]: nuevo, ultimoPago: entry.fecha } : f))
          };
          setCatalog(actualizado);
          guardarCatalogoAhora(actualizado);
        }
      }
    }
  }

  async function deleteMovimiento(id) {
    const mov = movimientos.find((m) => m.id === id);
    await supabase.from("movimientos").delete().eq("id", id);
    setMovimientos((prev) => prev.filter((m) => m.id !== id));
    if (mov && mov.lugar && mov.lugar.startsWith("__diferido:")) {
      const diferidoId = mov.lugar.slice("__diferido:".length);
      const monto = Number(mov.cantidad);
      const actualizado = {
        ...catalogRef.current,
        diferidos: (catalogRef.current.diferidos || []).map((d) => {
          if (d.id !== diferidoId) return d;
          const pagosNuevos = Math.max(0, d.pagos - 1);
          const pagadoNuevo = Math.max(0, Math.round((d.pagado - monto) * 100) / 100);
          return { ...d, pagos: pagosNuevos, pagado: pagadoNuevo, activo: true };
        })
      };
      setCatalog(actualizado);
      guardarCatalogoAhora(actualizado);
    } else if (mov && mov.mov === "Egreso" && (mov.categoria === "Bancario" || mov.categoria === "Crédito") && mov.subcategoria) {
      const lista = catalogRef.current.prestamosBancarios || [];
      const prestamo = lista.find((p) => p.nombre === mov.subcategoria && p.categoria === mov.categoria);
      if (prestamo) {
        const nuevoAcumulado = Math.max(0, Math.round((Number(prestamo.acumulado || 0) - Number(mov.cantidad)) * 100) / 100);
        const actualizado = {
          ...catalogRef.current,
          prestamosBancarios: lista.map((p) => (p.id === prestamo.id ? { ...p, acumulado: nuevoAcumulado, activa: true } : p))
        };
        setCatalog(actualizado);
        guardarCatalogoAhora(actualizado);
      }
    } else if (mov && mov.mov === "Egreso" && (mov.categoria === "Aportación" || mov.categoria === "Pago TDC Familiar") && mov.subcategoria) {
      const lista = catalogRef.current.familiares || [];
      const fam = lista.find((f) => f.nombre === mov.subcategoria);
      if (fam) {
        const campo = mov.categoria === "Aportación" ? "acumuladoAport" : "acumuladoTDC";
        const nuevo = Math.max(0, Math.round((Number(fam[campo] || 0) - Number(mov.cantidad)) * 100) / 100);
        const actualizado = {
          ...catalogRef.current,
          familiares: lista.map((f) => (f.id === fam.id ? { ...f, [campo]: nuevo } : f))
        };
        setCatalog(actualizado);
        guardarCatalogoAhora(actualizado);
      }
    }
  }

  function addDiferido({ nombre, tarjeta, categoria, subcategoria, descripcion, costoTotal, capitalOriginal, conIntereses, mensualidadFija, plazoMeses, inicio, pagosPrevios = 0, pagadoPrevio = 0 }) {
    const pagosIniciales = Math.min(Math.max(0, pagosPrevios), plazoMeses - 1);
    const pagadoInicial = Math.max(0, pagadoPrevio);
    // Si lleva intereses, la aportación ES la mensualidad fija; costoTotal ya viene calculado (mensual × plazo)
    // Si no lleva intereses, aportación = costoTotal / plazo
    const aportacion = conIntereses && mensualidadFija > 0
      ? Math.round(mensualidadFija * 100) / 100
      : Math.round((costoTotal / plazoMeses) * 100) / 100;
    const nuevo = {
      id: uid(), activo: pagosIniciales < plazoMeses, nombre: nombre || "", tarjeta,
      categoria, subcategoria: subcategoria || "", descripcion: descripcion || "",
      costoTotal, capitalOriginal: capitalOriginal || costoTotal,
      conIntereses: conIntereses || false, mensualidadFija: mensualidadFija || 0,
      plazoMeses, aportacion,
      pagos: pagosIniciales, pagado: pagadoInicial,
      interesesPagados: 0, ultPago: "", inicio
    };
    const actualizado = { ...catalogRef.current, diferidos: [nuevo, ...(catalogRef.current.diferidos || [])] };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  function editarDiferido(id, campos) {
    const actualizado = {
      ...catalogRef.current,
      diferidos: (catalogRef.current.diferidos || []).map((d) => {
        if (d.id !== id) return d;
        const costoTotal = campos.costoTotal !== undefined ? campos.costoTotal : d.costoTotal;
        const plazoMeses = campos.plazoMeses !== undefined ? campos.plazoMeses : d.plazoMeses;
        const pagos = campos.pagos !== undefined ? campos.pagos : d.pagos;
        const pagado = campos.pagado !== undefined ? campos.pagado : d.pagado;
        const interesesPagados = campos.interesesPagados !== undefined ? campos.interesesPagados : (d.interesesPagados || 0);
        return {
          ...d, ...campos,
          costoTotal, plazoMeses, pagos, pagado, interesesPagados,
          aportacion: Math.round((costoTotal / plazoMeses) * 100) / 100,
          activo: pagos < plazoMeses
        };
      })
    };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  async function registrarPagoDiferido(diferidoId, monto, fecha, intereses = 0) {
    const dif = (catalogRef.current.diferidos || []).find((d) => d.id === diferidoId);
    if (!dif) return;
    const etiqueta = dif.nombre || `${dif.categoria}${dif.subcategoria ? " · " + dif.subcategoria : ""}`;
    await addMovimiento({
      mov: "Egreso", metodo: "TDC", cuenta: dif.tarjeta,
      tipo: "Pago TDC", categoria: "Pago TDC", subcategoria: dif.tarjeta,
      descripcion: `Diferido: ${etiqueta}${dif.descripcion ? " · " + dif.descripcion : ""}`,
      lugar: `__diferido:${diferidoId}`, fecha, cantidad: monto
    });
    // Si hay intereses, registrarlos también como movimiento separado
    if (intereses > 0) {
      await addMovimiento({
        mov: "Egreso", metodo: "TDC", cuenta: dif.tarjeta,
        tipo: "G. Variable", categoria: "Intereses TDC", subcategoria: etiqueta,
        descripcion: `Intereses diferido: ${etiqueta}`,
        lugar: "", fecha, cantidad: intereses
      });
    }
    const actualizado = {
      ...catalogRef.current,
      diferidos: (catalogRef.current.diferidos || []).map((d) => {
        if (d.id !== diferidoId) return d;
        const pagosNuevos = d.pagos + 1;
        const pagadoNuevo = Math.round((d.pagado + monto) * 100) / 100;
        const interesesPagados = Math.round(((d.interesesPagados || 0) + intereses) * 100) / 100;
        return { ...d, pagos: pagosNuevos, pagado: pagadoNuevo, interesesPagados, ultPago: fecha, activo: pagosNuevos < d.plazoMeses };
      })
    };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  function eliminarDiferido(diferidoId) {
    const actualizado = { ...catalogRef.current, diferidos: (catalogRef.current.diferidos || []).filter((d) => d.id !== diferidoId) };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  function toggleActivaMembresiaApp(id) {
    const actualizado = {
      ...catalogRef.current,
      membresias: (catalogRef.current.membresias || []).map((m) => (m.id === id ? { ...m, activa: !m.activa } : m))
    };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  function toggleActivaServicioApp(id) {
    const actualizado = {
      ...catalogRef.current,
      servicios: (catalogRef.current.servicios || []).map((s) => (s.id === id ? { ...s, activa: !s.activa } : s))
    };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  function toggleActivaSeguroApp(id) {
    const actualizado = {
      ...catalogRef.current,
      seguros: (catalogRef.current.seguros || []).map((s) => (s.id === id ? { ...s, activa: !s.activa } : s))
    };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  function toggleActivaAhorroApp(id) {
    const actualizado = {
      ...catalogRef.current,
      ahorros: (catalogRef.current.ahorros || []).map((a) => (a.id === id ? { ...a, activa: !a.activa } : a))
    };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  function toggleActivaInversionApp(id) {
    const actualizado = {
      ...catalogRef.current,
      inversiones: (catalogRef.current.inversiones || []).map((i) => (i.id === id ? { ...i, activa: !i.activa } : i))
    };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  function toggleActivaPrestamoBancarioApp(id) {
    const actualizado = {
      ...catalogRef.current,
      prestamosBancarios: (catalogRef.current.prestamosBancarios || []).map((p) => (p.id === id ? { ...p, activa: !p.activa } : p))
    };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  function toggleActivaFamiliarApp(id) {
    const actualizado = {
      ...catalogRef.current,
      familiares: (catalogRef.current.familiares || []).map((f) => (f.id === id ? { ...f, activa: !f.activa } : f))
    };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (!session) return <LoginScreen />;

  if (!loaded) {
    return <p style={{ fontSize: 13, color: "#666", textAlign: "center", padding: "2rem 0", fontFamily: SHEET.fuente, fontStyle: "italic" }}>Cargando tus datos...</p>;
  }

  const sinDatosPropios = !catalog._bannerVisto && (catalog.cuentas.TDC || []).length === 0 &&
    (catalog.cuentas.TDD || []).length === 0 &&
    (catalog.lugares || []).length === 0;

  function cerrarBanner() {
    const actualizado = { ...catalogRef.current, _bannerVisto: true };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", background: "#fff", padding: "12px 8px", fontFamily: SHEET.fuente, minHeight: "100vh" }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontStyle: "italic", fontSize: 19 }}>
          {catalog._nombre ? `Hola, ${catalog._nombre} 👋` : "Finanzas Personales"}
        </h2>
        <p style={{ fontSize: 12, color: "#666", margin: "2px 0 0", fontStyle: "italic" }}>{session.user.email} · {movimientos.length} movimientos</p>
      </div>
      <TabBar tab={tab} setTab={setTab} onLogout={handleLogout} userEmail={session.user.email} />

      {/* Modal de bienvenida — pide nombre la primera vez */}
      {!catalog._nombre && loaded && (
        <NombreModal onGuardar={(nombre) => {
          const actualizado = { ...catalogRef.current, _nombre: nombre };
          setCatalog(actualizado);
          guardarCatalogoAhora(actualizado);
        }} />
      )}
      {sinDatosPropios && tab !== "catalogos" && (
        <div style={{
          position: "relative", background: SHEET.amarillo, border: `1px solid ${SHEET.amarilloBorde}`, borderRadius: 4,
          padding: "10px 30px 10px 12px", marginBottom: 12, fontSize: 12.5, fontStyle: "italic", lineHeight: 1.4
        }}>
          <button aria-label="Cerrar aviso" onClick={cerrarBanner} style={{
            position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer",
            color: SHEET.amarilloBorde, fontSize: 14, fontWeight: 700, lineHeight: 1, padding: 4
          }}>✕</button>
          👋 Antes de registrar movimientos, ve a la pestaña <b>Datos</b> y agrega tus tarjetas, cuentas y lugares frecuentes. Así los catálogos estarán listos a la hora de capturar.{" "}
          <button onClick={() => setTab("catalogos")} style={{
            background: "none", border: "none", textDecoration: "underline", cursor: "pointer",
            fontStyle: "italic", fontWeight: 700, fontFamily: SHEET.fuente, fontSize: 12.5, padding: 0
          }}>Ir a Datos →</button>
        </div>
      )}
      {tab === "registrar" && <RegistrarTab catalog={catalog} addMovimiento={addMovimiento} addDiferido={addDiferido} movimientos={movimientos} />}
      {tab === "resumen" && <ResumenTab movimientos={movimientos} catalog={catalog} />}
      {tab === "historial" && <HistorialTab movimientos={movimientos} deleteMovimiento={deleteMovimiento} />}
      {tab === "presupuesto" && <PresupuestoTab catalog={catalog} movimientos={movimientos} userEmail={session.user.email} />}
      {tab === "cuenta" && <CuentaTab userEmail={session.user.email} movimientos={movimientos} onLogout={handleLogout} catalog={catalog} onNombreChange={(nombre) => { const actualizado = { ...catalogRef.current, _nombre: nombre }; setCatalog(actualizado); guardarCatalogoAhora(actualizado); }} />}
      {tab === "estado" && <EstadoMesTab catalog={catalog} movimientos={movimientos} userEmail={session.user.email} />}
      {tab === "pagos-futuros" && <PagosFuturosTab catalog={catalog} movimientos={movimientos} />}
      {tab === "catalogos" && <CatalogosTab catalog={catalog} setCatalog={setCatalog} guardarAhora={guardarCatalogoAhora} movimientos={movimientos} />}
      {tab === "diferidos" && <DiferidosTab diferidos={catalog.diferidos || []} registrarPago={registrarPagoDiferido} editarDiferido={editarDiferido} eliminarDiferido={eliminarDiferido} userEmail={session.user.email} />}
      {tab === "tdc" && <TDCTab catalog={catalog} setCatalog={setCatalog} guardarAhora={guardarCatalogoAhora} movimientos={movimientos} userEmail={session.user.email} />}
      {tab === "membresias" && <MembresiasTab membresias={catalog.membresias || []} toggleActiva={toggleActivaMembresiaApp} movimientos={movimientos} userEmail={session.user.email} />}
      {tab === "servicios" && <ServiciosTab servicios={catalog.servicios || []} toggleActiva={toggleActivaServicioApp} movimientos={movimientos} userEmail={session.user.email} />}
      {tab === "seguros" && <SegurosTab seguros={catalog.seguros || []} toggleActiva={toggleActivaSeguroApp} movimientos={movimientos} userEmail={session.user.email} />}
      {tab === "prestamos" && <PrestamosTab prestamosBancarios={catalog.prestamosBancarios || []} prestamosTerceros={catalog.prestamosTerceros || []} toggleActivaBancario={toggleActivaPrestamoBancarioApp} movimientos={movimientos} userEmail={session.user.email} />}
      {tab === "familia" && <FamiliaTab familiares={catalog.familiares || []} toggleActiva={toggleActivaFamiliarApp} movimientos={movimientos} userEmail={session.user.email} />}
      {tab === "ahorro" && <AhorroTab ahorros={catalog.ahorros || []} toggleActiva={toggleActivaAhorroApp} movimientos={movimientos} userEmail={session.user.email} />}
      {tab === "inversion" && <InversionTab inversiones={catalog.inversiones || []} toggleActiva={toggleActivaInversionApp} movimientos={movimientos} userEmail={session.user.email} />}
    </div>
  );
}