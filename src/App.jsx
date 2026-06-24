import { useState, useEffect, useMemo } from "react";
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
    TDC: ["Banregio Platino", "Banregio Mas", "Banamex Costco", "Liverpool", "Palacio de Hierro", "Santander"],
    TDD: ["Banregio", "Santander"]
  },
  lugares: ["Monterrey, NL", "Orlando, FL"],
  tipos: ["G. Fijo", "G. Variable", "Préstamo", "Inversión", "Ahorro", "Otro(a)", "Pago TDC"],
  categorias: {
    "G. Fijo": ["Seguros", "Membresías", "Servicios", "Familia"],
    "G. Variable": ["Comidas", "Compras Online", "Educación", "Entretenimiento", "Gastos Personales", "Intereses TDC", "Mascotas", "Otro(a)", "Regalos y Festejos", "Ropa y Accesorios", "Salud y Bienestar", "Supermercado", "Tecnología", "Tienda de Conveniencia", "Transporte", "Viajes y Vacaciones", "Vivienda"],
    "Préstamo": ["Bancario", "Crédito", "de Tercero", "a Tercero"],
    "Inversión": ["GBM", "Interbrokers", "PC"],
    "Ahorro": ["Viaje", "Tecnología", "Entretenimiento", "Transporte", "Casa/Hogar"],
    "Otro(a)": ["Otro(a)"],
    "Pago TDC": ["Banregio Platino", "Banregio Mas", "Banamex Costco", "Liverpool", "Palacio de Hierro", "Santander"]
  },
  subcategorias: {
    "Seguros": ["GNP GMM (Antonella)", "GNP GMM (JC)", "GNP GMM (Louisi)", "GNP Trasciende", "Qualitas (Swift)", "Qualitas (CRV)"],
    "Membresías": ["1Password", "Amazon Prime EU", "Amazon Prime MX", "Apple One", "Disney+", "Huckleberry Baby (LA)", "iCloud+", "Instagram (LA)", "Kinedu Baby (LA)", "Netflix", "Norton", "PDF Expert", "PDF Expert (LA)", "PicsArt (LA)", "Scribd / Everand", "Splice (LA)", "ViX", "Super Simple (LA)", "Meta Verified (LA)"],
    "Servicios": ["ADT Security", "Agua y Drenaje", "CFE", "Contador", "Gas (Naturgy)", "Guarderia Perros", "Gym (Station24)", "Refrendo/Tenencia", "Renta (Casa)", "SAT (ISR)", "Telcel (3170)", "Telcel (5081)", "Telcel (5607)", "Telmex (Casa)"],
    "Familia": ["Familiar-1", "Familiar-2", "Familiar-3", "Familiar-4", "Familiar-5", "Pago TDC (Familiar-1)", "Pago TDC (Familiar-2)", "Pago TDC (Familiar-3)", "Pago TDC (Familiar-4)", "Pago TDC (Familiar-5)"],
    "Comidas": ["Domicilio", "Restaurante", "Otro(a)"],
    "Compras Online": ["Amazon", "Mercado Libre", "Ebay", "Otro(a)"],
    "Educación": ["Colegiatura", "Utiles", "Otro(a)"],
    "Entretenimiento": ["Cine", "Conciertos", "Juguetes", "Otro(a)"],
    "Gastos Personales": ["Donaciones", "Clases", "Otro(a)"],
    "Intereses TDC": ["1. enero", "2. febrero", "3. marzo", "4. abril", "5. mayo", "6. junio", "7. julio", "8. agosto", "9. septiembre", "11. noviembre", "12. diciembre"],
    "Mascotas": ["Alimentación", "Otro(a)", "Estancia (Hotel)"],
    "Regalos y Festejos": ["Liverpool", "Palacio de Hierro", "Costco", "Otro(a)"],
    "Ropa y Accesorios": ["Liverpool", "Palacio de Hierro", "Costco", "Otro(a)"],
    "Salud y Bienestar": ["Consulta", "Farmacia", "Otro(a)"],
    "Supermercado": ["Heb", "Soriana", "Wallmart", "Costco", "Otro(a)"],
    "Tecnología": ["Apps", "PC", "Otro(a)"],
    "Tienda de Conveniencia": ["Oxxo", "Seven", "Otro(a)"],
    "Transporte": ["Gasolina", "Taller", "Uber", "Tenencia", "Refrendo", "Estacionamiento", "Casetas", "Otro(a)"],
    "Viajes y Vacaciones": ["Hospedaje", "Transporte", "Comida", "Compras", "Otro(a)"],
    "Vivienda": ["Home Depot", "Otro(a)", "Decoración"],
    "Bancario": ["Préstamo Bancario-1", "Préstamo Bancario-2", "Préstamo Bancario-3", "Préstamo Bancario-4", "Préstamo Bancario-5"],
    "Crédito": ["Automotriz-1", "Crédito-2", "Crédito-3", "Crédito-4", "Crédito-5"],
    "de Tercero": ["Préstamo de 3°-1", "Préstamo de 3°-2", "Préstamo de 3°-3", "Préstamo de 3°-4", "Préstamo de 3°-5"],
    "a Tercero": ["Préstamo a 3°-1", "Préstamo a 3°-2", "Préstamo a 3°-3", "Préstamo a 3°-4", "Préstamo a 3°-5"],
    "GBM": ["GBM-1", "GBM-2"],
    "Interbrokers": ["Interbrokers-1", "Interbrokers-2"],
    "PC": ["PC-1", "PC-2"]
  },
  ingresoTipos: ["Sueldo", "Comisión", "Préstamo", "Reembolso", "Otro(a)"],
  ingresoSub: {
    "Sueldo": ["CG", "Sueldo-2", "Sueldo-3"],
    "Comisión": ["CG", "Comisión-2", "Comisión-3"],
    "Préstamo": ["Bancario", "de Tercero", "a Tercero"],
    "Reembolso": ["TDC", "TDD"],
    "Otro(a)": ["Otro(a)"]
  },
  presupuestos: {
    "Comidas": 5000, "Compras Online": 10000, "Educación": 10000, "Entretenimiento": 5000,
    "Gastos Personales": 5000, "Intereses TDC": 5000, "Mascotas": 8000, "Otro(a)": 0,
    "Regalos y Festejos": 5000, "Ropa y Accesorios": 5000, "Salud y Bienestar": 5000,
    "Supermercado": 15000, "Tecnología": 2500, "Tienda de Conveniencia": 2500,
    "Transporte": 5000, "Viajes y Vacaciones": 10000, "Vivienda": 50000
  },
  membresias: [],
  seguros: [],
  servicios: [],
  prestamos: [],
  familiares: ["Familiar-1", "Familiar-2", "Familiar-3", "Familiar-4", "Familiar-5"]
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

const cardBase = { background: "#fff", border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "12px 14px" };

const labelStyle = {
  display: "block", fontSize: 12, fontStyle: "italic", fontWeight: 700,
  color: SHEET.texto, marginBottom: 4, fontFamily: SHEET.fuente
};

const inputBase = {
  width: "100%", fontFamily: SHEET.fuente, border: "1px solid " + SHEET.grisBorde,
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

function TabBar({ tab, setTab, onLogout }) {
  const tabs = [
    { id: "registrar", label: "Registro", icon: "+" },
    { id: "resumen", label: "Reporte", icon: "▤" },
    { id: "historial", label: "Historial", icon: "≡" },
    { id: "catalogos", label: "Datos", icon: "⚙" }
  ];
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 14, position: "sticky", top: 0, background: SHEET.gris, zIndex: 5, padding: "6px 4px", borderRadius: 4, border: "1px solid " + SHEET.grisBorde }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          flex: 1, padding: "8px 4px", background: tab === t.id ? SHEET.amarillo : "transparent",
          border: tab === t.id ? `1px solid ${SHEET.amarilloBorde}` : "1px solid transparent", borderRadius: 3,
          color: SHEET.texto, fontSize: 12, fontWeight: 700, fontStyle: "italic", fontFamily: SHEET.fuente, cursor: "pointer"
        }}>
          {t.label}
        </button>
      ))}
      <button onClick={onLogout} title="Cerrar sesión" style={{
        padding: "8px 10px", background: "transparent", border: "1px solid transparent", borderRadius: 3,
        color: SHEET.rosaBorde, fontSize: 12, fontWeight: 700, fontStyle: "italic", fontFamily: SHEET.fuente, cursor: "pointer"
      }}>
        Salir
      </button>
    </div>
  );
}

function RegistrarTab({ catalog, addMovimiento }) {
  const [mov, setMov] = useState("Egreso");
  const [metodo, setMetodo] = useState("");
  const [cuenta, setCuenta] = useState("");
  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [ingresoTipo, setIngresoTipo] = useState("");
  const [ingresoSub, setIngresoSub] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [lugar, setLugar] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [cantidad, setCantidad] = useState("");
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});

  const cuentasDisponibles = catalog.cuentas[metodo] || [];
  const categoriasDisponibles = catalog.categorias[tipo] || [];
  const subcatsDisponibles = catalog.subcategorias[categoria] || [];
  const ingresoSubsDisponibles = catalog.ingresoSub[ingresoTipo] || [];

  useEffect(() => { setCuenta(""); }, [metodo]);
  useEffect(() => { setCategoria(""); }, [tipo]);
  useEffect(() => { setSubcategoria(""); }, [categoria]);
  useEffect(() => { setIngresoSub(""); }, [ingresoTipo]);

  function reset() {
    setMetodo(""); setCuenta(""); setTipo(""); setCategoria(""); setSubcategoria("");
    setIngresoTipo(""); setIngresoSub(""); setDescripcion(""); setLugar(""); setCantidad("");
    setFecha(todayISO()); setErrors({});
  }

  function validate() {
    const errs = {};
    if (!cantidad || parseFloat(cantidad) <= 0) errs.cantidad = true;
    if (!metodo) errs.metodo = true;
    if (!cuenta) errs.cuenta = true;
    if (!fecha) errs.fecha = true;
    if (mov === "Egreso") {
      if (!tipo) errs.tipo = true;
      if (!categoria) errs.categoria = true;
      if (subcatsDisponibles.length > 0 && !subcategoria) errs.subcategoria = true;
    } else {
      if (!ingresoTipo) errs.ingresoTipo = true;
      if (ingresoSubsDisponibles.length > 0 && !ingresoSub) errs.ingresoSub = true;
    }
    return errs;
  }

  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const amt = parseFloat(cantidad);
    const entry = {
      mov, metodo, cuenta,
      tipo: mov === "Egreso" ? tipo : ingresoTipo,
      categoria: mov === "Egreso" ? categoria : ingresoSub,
      subcategoria: mov === "Egreso" ? subcategoria : "",
      descripcion, lugar, fecha, cantidad: amt
    };
    await addMovimiento(entry);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
    reset();
  }

  const bandColor = mov === "Egreso" ? SHEET.rosa : SHEET.verde;
  const bandBorder = mov === "Egreso" ? SHEET.rosaBorde : SHEET.verdeBorde;

  function selStyle(hasError) {
    return { ...inputBase, background: "#fff", border: hasError ? `2px solid ${SHEET.rojo}` : "1px solid " + SHEET.grisBorde };
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
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
          <Field label="Cantidad" error={errors.cantidad}>
            <input type="number" inputMode="decimal" placeholder="$0.00" value={cantidad}
              onChange={(e) => { setCantidad(e.target.value); setErrors((p) => ({ ...p, cantidad: false })); }}
              style={{ ...inputBase, fontSize: 22, fontWeight: 700, textAlign: "center", border: errors.cantidad ? `2px solid ${SHEET.rojo}` : `2px solid ${bandBorder}`, background: errors.cantidad ? "#fff" : bandColor }} />
          </Field>

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

          {mov === "Egreso" ? (
            <>
              <Field label="Tipo" error={errors.tipo}>
                <select value={tipo} onChange={(e) => { setTipo(e.target.value); setErrors((p) => ({ ...p, tipo: false })); }} style={selStyle(errors.tipo)}>
                  <option value="">Selecciona...</option>
                  {catalog.tipos.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Categoría" error={errors.categoria}>
                <select value={categoria} onChange={(e) => { setCategoria(e.target.value); setErrors((p) => ({ ...p, categoria: false })); }} style={selStyle(errors.categoria)} disabled={!tipo}>
                  <option value="">{tipo ? "Selecciona..." : "Primero elige Tipo"}</option>
                  {categoriasDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              {categoria && subcatsDisponibles.length > 0 && (
                <Field label="Subcategoría" error={errors.subcategoria}>
                  <select value={subcategoria} onChange={(e) => { setSubcategoria(e.target.value); setErrors((p) => ({ ...p, subcategoria: false })); }} style={selStyle(errors.subcategoria)}>
                    <option value="">Selecciona...</option>
                    {subcatsDisponibles.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              )}
            </>
          ) : (
            <>
              <Field label="Tipo" error={errors.ingresoTipo}>
                <select value={ingresoTipo} onChange={(e) => { setIngresoTipo(e.target.value); setErrors((p) => ({ ...p, ingresoTipo: false })); }} style={selStyle(errors.ingresoTipo)}>
                  <option value="">Selecciona...</option>
                  {catalog.ingresoTipos.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              {ingresoTipo && ingresoSubsDisponibles.length > 0 && (
                <Field label="Detalle" error={errors.ingresoSub}>
                  <select value={ingresoSub} onChange={(e) => { setIngresoSub(e.target.value); setErrors((p) => ({ ...p, ingresoSub: false })); }} style={selStyle(errors.ingresoSub)}>
                    <option value="">Selecciona...</option>
                    {ingresoSubsDisponibles.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              )}
            </>
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
              <input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setErrors((p) => ({ ...p, fecha: false })); }}
                style={{ ...inputBase, background: errors.fecha ? "#fff" : bandColor, border: errors.fecha ? `2px solid ${SHEET.rojo}` : `1px solid ${bandBorder}` }} />
            </Field>
          </div>

          {Object.keys(errors).some((k) => errors[k]) && (
            <p style={{ fontSize: 12, color: SHEET.rosaBorde, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
              Completa los campos marcados en rojo antes de guardar
            </p>
          )}

          <Btn primary full onClick={handleSave} style={{ marginTop: 6 }}>
            {saved ? "✓ Guardado" : "Guardar movimiento"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function ResumenTab({ movimientos, catalog }) {
  const [mesFiltro, setMesFiltro] = useState(todayISO().slice(0, 7));
  const meses = useMemo(() => {
    const set = new Set(movimientos.map((m) => m.fecha.slice(0, 7)));
    set.add(todayISO().slice(0, 7));
    return Array.from(set).sort().reverse();
  }, [movimientos]);
  const movsMes = useMemo(() => movimientos.filter((m) => m.fecha.slice(0, 7) === mesFiltro), [movimientos, mesFiltro]);
  const totalIngresos = movsMes.filter((m) => m.mov === "Ingreso").reduce((a, m) => a + m.cantidad, 0);
  const totalEgresos = movsMes.filter((m) => m.mov === "Egreso").reduce((a, m) => a + m.cantidad, 0);
  const balance = totalIngresos - totalEgresos;
  const porCategoria = useMemo(() => {
    const map = {};
    movsMes.filter((m) => m.mov === "Egreso" && m.tipo === "G. Variable").forEach((m) => { map[m.categoria] = (map[m.categoria] || 0) + m.cantidad; });
    return map;
  }, [movsMes]);
  const presupuestoRows = Object.keys(catalog.presupuestos).map((cat) => {
    const presupuesto = catalog.presupuestos[cat] || 0;
    const usado = porCategoria[cat] || 0;
    const disponible = presupuesto - usado;
    const pct = presupuesto > 0 ? Math.min(100, (usado / presupuesto) * 100) : (usado > 0 ? 100 : 0);
    return { cat, presupuesto, usado, disponible, pct };
  }).filter((r) => r.presupuesto > 0 || r.usado > 0).sort((a, b) => b.usado - a.usado);
  const porCuenta = useMemo(() => {
    const map = {};
    movsMes.filter((m) => m.mov === "Egreso").forEach((m) => { map[m.cuenta] = (map[m.cuenta] || 0) + m.cantidad; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [movsMes]);

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <Field label="Mes">
        <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} style={{ ...inputBase, background: SHEET.azul }}>
          {meses.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </Field>

      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
        <HeaderBand color={SHEET.azul} borderColor={SHEET.azulBorde}>Flujo de Efectivo</HeaderBand>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#fff" }}>
          <div style={{ padding: "12px 14px", borderRight: "1px solid " + SHEET.grisBorde }}>
            <p style={{ fontSize: 11, fontStyle: "italic", fontWeight: 700, margin: 0, color: SHEET.verdeBorde }}>Ingresos</p>
            <p style={{ fontSize: 19, fontWeight: 700, margin: "4px 0 0" }}>{fmtShort(totalIngresos)}</p>
          </div>
          <div style={{ padding: "12px 14px" }}>
            <p style={{ fontSize: 11, fontStyle: "italic", fontWeight: 700, margin: 0, color: SHEET.rosaBorde }}>Egresos</p>
            <p style={{ fontSize: 19, fontWeight: 700, margin: "4px 0 0" }}>{fmtShort(totalEgresos)}</p>
          </div>
        </div>
        <div style={{ padding: "10px 14px", background: SHEET.gris, borderTop: "1px solid " + SHEET.grisBorde, textAlign: "center" }}>
          <span style={{ fontSize: 12, fontStyle: "italic", fontWeight: 700, marginRight: 8 }}>Balance:</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: balance >= 0 ? SHEET.verdeBorde : SHEET.rosaBorde }}>{fmt(balance)}</span>
        </div>
      </div>

      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
        <HeaderBand color={SHEET.rosa} borderColor={SHEET.rosaBorde}>Presupuesto vs. Gastado</HeaderBand>
        <div style={{ background: "#fff", padding: "12px 14px" }}>
          {presupuestoRows.length === 0 && <p style={{ fontSize: 13, color: "#666", fontStyle: "italic" }}>Sin movimientos de gasto variable este mes.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {presupuestoRows.map((r) => {
              const over = r.disponible < 0;
              const near = !over && r.pct >= 80;
              const barColor = over ? SHEET.rosaBorde : near ? SHEET.amarilloBorde : SHEET.verdeBorde;
              return (
                <div key={r.cat}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4, fontWeight: 700 }}>
                    <span>{r.cat}</span>
                    <span style={{ color: "#555", fontWeight: 400 }}>{fmtShort(r.usado)} / {fmtShort(r.presupuesto)}</span>
                  </div>
                  <div style={{ height: 9, background: SHEET.gris, border: "1px solid " + SHEET.grisBorde, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${r.pct}%`, background: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {porCuenta.length > 0 && (
        <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
          <HeaderBand color={SHEET.amarillo} borderColor={SHEET.amarilloBorde}>Gasto por Cuenta</HeaderBand>
          <div style={{ background: "#fff" }}>
            {porCuenta.map(([cuenta, monto], i) => (
              <div key={cuenta} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "10px 14px", background: i % 2 === 0 ? "#fff" : SHEET.gris, borderTop: i === 0 ? "none" : "1px solid " + SHEET.grisBorde }}>
                <span style={{ fontWeight: 700 }}>{cuenta}</span>
                <span>{fmt(monto)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <Field label="Buscar">
        <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Categoría, lugar, descripción..." style={inputBase} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} style={inputBase}>
          <option value="todos">Todos los meses</option>
          {meses.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={inputBase}>
          <option value="todos">Todos</option>
          <option value="Ingreso">Ingresos</option>
          <option value="Egreso">Egresos</option>
        </select>
      </div>

      {filtrados.length === 0 && <p style={{ fontSize: 13, color: "#666", textAlign: "center", padding: "2rem 0", fontStyle: "italic" }}>No hay movimientos que coincidan.</p>}

      <div style={{ border: filtrados.length ? "1px solid " + SHEET.grisBorde : "none", borderRadius: 4, overflow: "hidden" }}>
        {filtrados.map((m, i) => (
          <div key={m.id} style={{
            background: i % 2 === 0 ? "#fff" : SHEET.gris, borderTop: i === 0 ? "none" : "1px solid " + SHEET.grisBorde,
            borderLeft: `3px solid ${m.mov === "Ingreso" ? SHEET.verdeBorde : SHEET.rosaBorde}`, padding: "10px 12px",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{m.categoria}{m.subcategoria ? ` · ${m.subcategoria}` : ""}</p>
              <p style={{ fontSize: 11, color: "#555", margin: 0, fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {fmtDate(m.fecha)} · {m.cuenta}{m.descripcion ? ` · ${m.descripcion}` : ""}{m.lugar ? ` · ${m.lugar}` : ""}
              </p>
            </div>
            <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{m.mov === "Ingreso" ? "+" : "-"}{fmt(m.cantidad)}</span>
              <button aria-label="Eliminar" onClick={() => deleteMovimiento(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, padding: 4 }}>✕</button>
            </div>
          </div>
        ))}
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

function CatalogosTab({ catalog, setCatalog }) {
  const [section, setSection] = useState("cuentas");
  function addToList(path, value) {
    setCatalog((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      let ref = next;
      for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
      const key = path[path.length - 1];
      if (!Array.isArray(ref[key])) ref[key] = [];
      if (!ref[key].includes(value)) ref[key].push(value);
      return next;
    });
  }
  function removeFromList(path, value) {
    setCatalog((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      let ref = next;
      for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
      const key = path[path.length - 1];
      ref[key] = (ref[key] || []).filter((v) => v !== value);
      return next;
    });
  }
  const [newCuentaTipo, setNewCuentaTipo] = useState(catalog.metodos[0] || "TDC");
  const [newCatTipo, setNewCatTipo] = useState(Object.keys(catalog.categorias)[0] || "");
  const [newSubcatCategoria, setNewSubcatCategoria] = useState(Object.keys(catalog.subcategorias)[0] || "");
  const sections = [
    { id: "cuentas", label: "Cuentas" }, { id: "categorias", label: "Categorías" },
    { id: "subcategorias", label: "Subcategorías" }, { id: "lugares", label: "Lugares" },
    { id: "presupuestos", label: "Presupuesto" }, { id: "familiares", label: "Familia" }
  ];

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
          <ListEditor title={`Cuentas / tarjetas de ${newCuentaTipo}`} items={catalog.cuentas[newCuentaTipo] || []}
            onAdd={(v) => addToList(["cuentas", newCuentaTipo], v)} onRemove={(v) => removeFromList(["cuentas", newCuentaTipo], v)} />
        </div>
      )}
      {section === "categorias" && (
        <div>
          <Field label="Tipo de gasto">
            <select value={newCatTipo} onChange={(e) => setNewCatTipo(e.target.value)} style={inputBase}>
              {Object.keys(catalog.categorias).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <ListEditor title={`Categorías de ${newCatTipo}`} items={catalog.categorias[newCatTipo] || []}
            onAdd={(v) => addToList(["categorias", newCatTipo], v)} onRemove={(v) => removeFromList(["categorias", newCatTipo], v)} />
        </div>
      )}
      {section === "subcategorias" && (
        <div>
          <Field label="Categoría">
            <select value={newSubcatCategoria} onChange={(e) => setNewSubcatCategoria(e.target.value)} style={inputBase}>
              {Object.keys(catalog.subcategorias).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <ListEditor title={`Subcategorías de ${newSubcatCategoria}`} items={catalog.subcategorias[newSubcatCategoria] || []}
            onAdd={(v) => addToList(["subcategorias", newSubcatCategoria], v)} onRemove={(v) => removeFromList(["subcategorias", newSubcatCategoria], v)} />
        </div>
      )}
      {section === "lugares" && <ListEditor title="Lugares frecuentes" items={catalog.lugares} onAdd={(v) => addToList(["lugares"], v)} onRemove={(v) => removeFromList(["lugares"], v)} />}
      {section === "familiares" && <ListEditor title="Familiares" items={catalog.familiares} onAdd={(v) => addToList(["familiares"], v)} onRemove={(v) => removeFromList(["familiares"], v)} />}
      {section === "presupuestos" && (
        <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
          <HeaderBand color={SHEET.rosa} borderColor={SHEET.rosaBorde}>Presupuesto mensual por categoría</HeaderBand>
          <div style={{ background: "#fff", padding: "12px 14px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.keys(catalog.presupuestos).map((cat, i) => (
                <div key={cat} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 8px", background: i % 2 === 0 ? "#fff" : SHEET.gris }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{cat}</span>
                  <input type="number" value={catalog.presupuestos[cat]}
                    onChange={(e) => { const v = parseFloat(e.target.value) || 0; setCatalog((prev) => ({ ...prev, presupuestos: { ...prev.presupuestos, [cat]: v } })); }}
                    style={{ ...inputBase, width: 110, textAlign: "right", border: `2px solid ${SHEET.rojo}` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoaded(false);
      const { data: cat } = await supabase.from("catalogos").select("data").eq("user_id", session.user.id).maybeSingle();
      if (cat && cat.data && Object.keys(cat.data).length > 0) {
        setCatalog({ ...DEFAULT_CATALOG, ...cat.data });
      } else {
        await supabase.from("catalogos").insert({ user_id: session.user.id, data: DEFAULT_CATALOG });
        setCatalog(DEFAULT_CATALOG);
      }
      const { data: movs } = await supabase.from("movimientos").select("*").eq("user_id", session.user.id).order("fecha", { ascending: false });
      setMovimientos((movs || []).map((m) => ({ ...m, cantidad: Number(m.cantidad) })));
      setLoaded(true);
    })();
  }, [session]);

  useEffect(() => {
    if (!loaded || !session) return;
    supabase.from("catalogos").update({ data: catalog, updated_at: new Date().toISOString() }).eq("user_id", session.user.id);
  }, [catalog]);

  async function addMovimiento(entry) {
    const { data, error } = await supabase.from("movimientos").insert({ ...entry, user_id: session.user.id }).select().single();
    if (!error && data) setMovimientos((prev) => [{ ...data, cantidad: Number(data.cantidad) }, ...prev]);
  }

  async function deleteMovimiento(id) {
    await supabase.from("movimientos").delete().eq("id", id);
    setMovimientos((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (!session) return <LoginScreen />;

  if (!loaded) {
    return <p style={{ fontSize: 13, color: "#666", textAlign: "center", padding: "2rem 0", fontFamily: SHEET.fuente, fontStyle: "italic" }}>Cargando tus datos...</p>;
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", background: "#fff", padding: "12px 8px", fontFamily: SHEET.fuente, minHeight: "100vh" }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontStyle: "italic", fontSize: 19 }}>Finanzas Personales</h2>
        <p style={{ fontSize: 12, color: "#666", margin: "2px 0 0", fontStyle: "italic" }}>{session.user.email} · {movimientos.length} movimientos</p>
      </div>
      <TabBar tab={tab} setTab={setTab} onLogout={handleLogout} />
      {tab === "registrar" && <RegistrarTab catalog={catalog} addMovimiento={addMovimiento} />}
      {tab === "resumen" && <ResumenTab movimientos={movimientos} catalog={catalog} />}
      {tab === "historial" && <HistorialTab movimientos={movimientos} deleteMovimiento={deleteMovimiento} />}
      {tab === "catalogos" && <CatalogosTab catalog={catalog} setCatalog={setCatalog} />}
    </div>
  );
}