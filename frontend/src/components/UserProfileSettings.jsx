import { useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

/* ─── SVG icons ──────────────────────────────────────────────────────────────── */
const IconMail = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const IconPhone = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);
const IconLock = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);
const IconShield = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const IconPencil = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);
const IconEye = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const IconEyeOff = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);
const IconX = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const IconCheck = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);
const IconSun = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 3v1m0 16v1m8.66-13H20m-16 0H2.34M18.36 5.64l-.7.7M6.34 17.66l-.7.7M18.36 18.36l-.7-.7M6.34 6.34l-.7-.7M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconMoon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const PASSWORD_RULES = [
  { label: "Almeno 8 caratteri",        test: (p) => p.length >= 8 },
  { label: "Almeno una maiuscola",       test: (p) => /[A-Z]/.test(p) },
  { label: "Almeno un numero",           test: (p) => /[0-9]/.test(p) },
  { label: "Almeno un carattere speciale", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function calcStrength(pwd) {
  if (!pwd) return 0;
  return PASSWORD_RULES.filter(r => r.test(pwd)).length;
}
const STRENGTH_LABEL = ["", "Molto debole", "Debole", "Media", "Forte"];
const STRENGTH_COLOR = ["", "bg-red-500", "bg-red-400", "bg-yellow-400", "bg-green-500"];
const STRENGTH_TEXT  = ["", "text-red-600", "text-red-500", "text-yellow-600", "text-green-600"];

const inputCls = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-800 placeholder-gray-400";
const labelCls = "block text-xs text-gray-500 mb-1 font-medium";

/* ─── QR placeholder ─────────────────────────────────────────────────────────── */
function QRPlaceholder() {
  const P = [1,1,1,1,1,1,1, 1,0,0,0,0,0,1, 1,0,1,0,1,0,1, 1,0,0,1,0,0,1, 1,0,1,0,1,0,1, 1,0,0,0,0,0,1, 1,1,1,1,1,1,1];
  return (
    <div className="grid gap-0.5 p-2 border border-gray-200 rounded-lg bg-white w-28 h-28"
      style={{ gridTemplateColumns: "repeat(7, 1fr)" }} aria-hidden="true">
      {P.map((on, i) => <div key={i} className={`rounded-sm ${on ? "bg-blue-600" : "bg-transparent"}`} />)}
    </div>
  );
}

/* ─── OTP input ──────────────────────────────────────────────────────────────── */
function OtpInput({ value, onChange }) {
  const refs = useRef([]);
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);
  function handleKey(e, idx) {
    if (e.key === "Backspace") {
      const n = [...digits];
      if (n[idx]) { n[idx] = ""; } else if (idx > 0) { n[idx-1] = ""; refs.current[idx-1]?.focus(); }
      onChange(n.join(""));
    }
  }
  function handleChange(e, idx) {
    const ch = e.target.value.replace(/\D/, "").slice(-1);
    const n = [...digits]; n[idx] = ch; onChange(n.join(""));
    if (ch && idx < 5) refs.current[idx+1]?.focus();
  }
  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input key={i} ref={el => refs.current[i] = el}
          className="w-10 h-12 border border-gray-300 rounded text-center text-lg font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          type="text" inputMode="numeric" maxLength={1} value={d}
          onChange={e => handleChange(e, i)} onKeyDown={e => handleKey(e, i)}
          aria-label={`Cifra ${i+1}`} />
      ))}
    </div>
  );
}

/* ─── Modal wrapper ──────────────────────────────────────────────────────────── */
function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={e => e.target === e.currentTarget && onClose()}
      role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-panel bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 id="modal-title" className="text-sm font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Chiudi">
            <IconX />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">{footer}</div>
        )}
      </div>
    </div>
  );
}

/* ─── Modal Email ─────────────────────────────────────────────────────────────── */
function EmailModal({ userId, currentEmail, onClose, onSave }) {
  const [form, setForm] = useState({ newEmail: "", confirmEmail: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mismatch = form.confirmEmail && form.confirmEmail !== form.newEmail;
  const valid = form.newEmail && !mismatch && form.confirmEmail;

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      await axios.put(`/api/auth/users/${userId}`, { email: form.newEmail });
      onSave(form.newEmail);
    } catch (err) {
      setError(err.response?.data?.detail || "Errore durante il salvataggio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Modifica email" onClose={onClose} footer={
      <>
        <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
        <button onClick={handleSave} disabled={!valid || loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Salvataggio…" : <><IconCheck /> Salva</>}
        </button>
      </>
    }>
      <div>
        <label className={labelCls}>Email attuale</label>
        <input className={`${inputCls} opacity-60 cursor-not-allowed`} type="email" value={currentEmail} disabled />
      </div>
      <div>
        <label className={labelCls}>Nuova email</label>
        <input className={inputCls} type="email" placeholder="nuova@email.com"
          value={form.newEmail} onChange={e => setForm(f => ({ ...f, newEmail: e.target.value }))} />
      </div>
      <div>
        <label className={labelCls}>Conferma nuova email</label>
        <input className={`${inputCls} ${mismatch ? "border-red-400 focus:ring-red-300" : ""}`}
          type="email" placeholder="nuova@email.com"
          value={form.confirmEmail} onChange={e => setForm(f => ({ ...f, confirmEmail: e.target.value }))} />
        {mismatch && <p className="text-xs text-red-500 mt-1">Le email non coincidono</p>}
      </div>
      {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded">{error}</p>}
    </Modal>
  );
}

/* ─── Modal Dati personali ───────────────────────────────────────────────────── */
function PersonalDataModal({ userId, currentNome, currentCognome, onClose, onSave }) {
  const [nome, setNome] = useState(currentNome || "");
  const [cognome, setCognome] = useState(currentCognome || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const valid = nome.trim().length > 0;

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      await axios.put(`/api/auth/users/${userId}`, { nome: nome.trim(), cognome: cognome.trim() });
      onSave(nome.trim(), cognome.trim());
    } catch (err) {
      setError(err.response?.data?.detail || "Errore durante il salvataggio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Modifica dati personali" onClose={onClose} footer={
      <>
        <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
        <button onClick={handleSave} disabled={!valid || loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Salvataggio…" : <><IconCheck /> Salva</>}
        </button>
      </>
    }>
      <div>
        <label className={labelCls}>Nome <span className="text-red-400">*</span></label>
        <input className={inputCls} type="text" placeholder="Nome"
          value={nome} onChange={e => setNome(e.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Cognome</label>
        <input className={inputCls} type="text" placeholder="Cognome"
          value={cognome} onChange={e => setCognome(e.target.value)} />
      </div>
      {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded">{error}</p>}
    </Modal>
  );
}

/* ─── Modal Telefono ─────────────────────────────────────────────────────────── */
function PhoneModal({ userId, currentPhone, onClose, onSave }) {
  const [phone, setPhone] = useState(currentPhone || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      await axios.put(`/api/auth/users/${userId}`, { telefono: phone || null });
      onSave(phone);
    } catch (err) {
      setError(err.response?.data?.detail || "Errore durante il salvataggio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Modifica numero di telefono" onClose={onClose} footer={
      <>
        <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
        <button onClick={handleSave} disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Salvataggio…" : <><IconCheck /> Salva</>}
        </button>
      </>
    }>
      <div>
        <label className={labelCls}>Numero di telefono</label>
        <input className={inputCls} type="tel" placeholder="+39 333 1234567"
          value={phone} onChange={e => setPhone(e.target.value)} />
      </div>
      {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded">{error}</p>}
    </Modal>
  );
}

/* ─── Modal Password ─────────────────────────────────────────────────────────── */
function PasswordModal({ userId, onClose, onSave }) {
  const [form, setForm] = useState({ current: "", new: "", confirm: "" });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const strength = calcStrength(form.new);
  const mismatch = form.confirm && form.confirm !== form.new;
  const allRulesMet = form.new && PASSWORD_RULES.every(r => r.test(form.new));
  const valid = form.current && allRulesMet && !mismatch && form.confirm;

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      await axios.put(`/api/auth/users/${userId}`, { password: form.new });
      onSave();
    } catch (err) {
      setError(err.response?.data?.detail || "Errore durante il salvataggio");
    } finally {
      setLoading(false);
    }
  }

  function EyeToggle({ field }) {
    return (
      <button type="button" onClick={() => setShow(s => ({ ...s, [field]: !s[field] }))}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        aria-label={show[field] ? "Nascondi" : "Mostra"}>
        {show[field] ? <IconEyeOff /> : <IconEye />}
      </button>
    );
  }

  return (
    <Modal title="Cambia password" onClose={onClose} footer={
      <>
        <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
        <button onClick={handleSave} disabled={!valid || loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Salvataggio…" : <><IconCheck /> Salva</>}
        </button>
      </>
    }>
      <div>
        <label className={labelCls}>Password attuale</label>
        <div className="relative">
          <input className={`${inputCls} pr-10`} type={show.current ? "text" : "password"} placeholder="••••••••"
            value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} />
          <EyeToggle field="current" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Nuova password</label>
        <div className="relative">
          <input className={`${inputCls} pr-10`} type={show.new ? "text" : "password"} placeholder="Minimo 8 caratteri"
            value={form.new} onChange={e => setForm(f => ({ ...f, new: e.target.value }))} />
          <EyeToggle field="new" />
        </div>
        {form.new && (
          <div className="mt-1.5 space-y-1.5">
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-300 ${STRENGTH_COLOR[strength]}`}
                style={{ width: `${(strength / 4) * 100}%` }} />
            </div>
            <p className={`text-xs font-medium ${STRENGTH_TEXT[strength]}`}>{STRENGTH_LABEL[strength]}</p>
            <ul className="space-y-0.5">
              {PASSWORD_RULES.map(r => (
                <li key={r.label} className={`flex items-center gap-1.5 text-xs ${r.test(form.new) ? "text-green-600" : "text-gray-400"}`}>
                  <span>{r.test(form.new) ? "✓" : "○"}</span>
                  {r.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div>
        <label className={labelCls}>Conferma nuova password</label>
        <div className="relative">
          <input className={`${inputCls} pr-10 ${mismatch ? "border-red-400 focus:ring-red-300" : ""}`}
            type={show.confirm ? "text" : "password"} placeholder="Ripeti la nuova password"
            value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
          <EyeToggle field="confirm" />
        </div>
        {mismatch && <p className="text-xs text-red-500 mt-1">Le password non coincidono</p>}
      </div>
      {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded">{error}</p>}
    </Modal>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */
export default function UserProfileSettings() {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [showEmailModal, setShowEmailModal]         = useState(false);
  const [showPhoneModal, setShowPhoneModal]         = useState(false);
  const [showPasswordModal, setShowPasswordModal]   = useState(false);
  const [showPersonalModal, setShowPersonalModal]   = useState(false);

  const [mfaEnabled, setMfaEnabled]       = useState(false);
  const [showMfaSetup, setShowMfaSetup]   = useState(false);
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [mfaVerifyLoading, setMfaVerifyLoading] = useState(false);
  const [mfaDisableConfirm, setMfaDisableConfirm] = useState(false);

  const [flashRow, setFlashRow] = useState(null);
  function flash(row) { setFlashRow(row); setTimeout(() => setFlashRow(null), 1500); }

  function handleEmailSave() {
    refreshUser();
    setShowEmailModal(false);
    flash("email");
  }

  function handlePhoneSave() {
    refreshUser();
    setShowPhoneModal(false);
    flash("phone");
  }

  function handlePasswordSave() {
    setShowPasswordModal(false);
    flash("password");
  }

  function handlePersonalSave() {
    refreshUser();
    setShowPersonalModal(false);
    flash("personal");
  }

  function handleMfaToggle(checked) {
    if (checked) { setShowMfaSetup(true); setMfaDisableConfirm(false); }
    else { setMfaDisableConfirm(true); }
  }

  function handleMfaVerify() {
    if (mfaVerifyCode.length < 6) return;
    setMfaVerifyLoading(true);
    setTimeout(() => {
      setMfaVerifyLoading(false);
      setMfaEnabled(true);
      setShowMfaSetup(false);
      setMfaVerifyCode("");
    }, 800);
  }

  const rowBase = "flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 last:border-0 transition-colors";

  return (
    <div className="max-w-xl space-y-6">

      {/* ── Dati personali ── */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">Dati personali</h2>
        </div>
        <div className={`${rowBase} ${flashRow === "personal" ? "bg-green-50" : ""}`}>
          <span className="text-gray-400 shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </span>
          <span className="text-xs text-gray-500 w-32 shrink-0">Nome e cognome</span>
          <span className="flex-1 text-sm text-gray-800 truncate">
            {user?.nome_completo || <span className="text-gray-400 italic">Non impostato</span>}
          </span>
          <button onClick={() => setShowPersonalModal(true)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium shrink-0">
            <IconPencil /> Modifica
          </button>
        </div>
      </div>

      {/* ── Sicurezza account ── */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">Sicurezza account</h2>
        </div>

        {/* Email */}
        <div className={`${rowBase} ${flashRow === "email" ? "bg-green-50" : ""}`}>
          <span className="text-gray-400 shrink-0"><IconMail /></span>
          <span className="text-xs text-gray-500 w-32 shrink-0">Email</span>
          <span className="flex-1 text-sm text-gray-800 truncate">{user?.email || "—"}</span>
          <button onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium shrink-0">
            <IconPencil /> Modifica
          </button>
        </div>

        {/* Telefono */}
        <div className={`${rowBase} ${flashRow === "phone" ? "bg-green-50" : ""}`}>
          <span className="text-gray-400 shrink-0"><IconPhone /></span>
          <span className="text-xs text-gray-500 w-32 shrink-0">Telefono</span>
          <span className="flex-1 text-sm text-gray-800 truncate">
            {user?.telefono || <span className="text-gray-400 italic">Non impostato</span>}
          </span>
          <button onClick={() => setShowPhoneModal(true)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium shrink-0">
            <IconPencil /> {user?.telefono ? "Modifica" : "Aggiungi"}
          </button>
        </div>

        {/* Password */}
        <div className={`${rowBase} ${flashRow === "password" ? "bg-green-50" : ""}`}>
          <span className="text-gray-400 shrink-0"><IconLock /></span>
          <span className="text-xs text-gray-500 w-32 shrink-0">Password</span>
          <span className="flex-1 text-sm text-gray-400 tracking-widest">••••••••••</span>
          <button onClick={() => setShowPasswordModal(true)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium shrink-0">
            <IconPencil /> Cambia
          </button>
        </div>

        {/* MFA */}
        <div className={rowBase}>
          <span className={`shrink-0 ${mfaEnabled ? "text-green-500" : "text-gray-400"}`}><IconShield /></span>
          <span className="text-xs text-gray-500 w-32 shrink-0">Autenticazione MFA</span>
          <span className="flex-1">
            {mfaEnabled
              ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Attiva
                </span>
              : <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" /> Non attiva
                </span>
            }
          </span>
          <label className="relative inline-flex items-center cursor-pointer shrink-0" aria-label="Attiva/disattiva MFA">
            <input type="checkbox" className="sr-only"
              checked={mfaEnabled || showMfaSetup}
              onChange={e => handleMfaToggle(e.target.checked)} />
            <div className={`w-9 h-5 rounded-full transition-colors ${(mfaEnabled || showMfaSetup) ? "bg-blue-600" : "bg-gray-300"}`} />
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(mfaEnabled || showMfaSetup) ? "translate-x-4" : ""}`} />
          </label>
        </div>

        {/* MFA setup inline */}
        {showMfaSetup && !mfaEnabled && (
          <div className="mx-5 mb-4 border border-blue-100 bg-blue-50 rounded-lg p-4 space-y-4">
            <p className="text-xs text-gray-600 text-center">
              Scansiona il QR code con la tua app authenticator (es. Google Authenticator, Authy).
            </p>
            <div className="flex justify-center"><QRPlaceholder /></div>
            <p className="text-xs text-gray-400 text-center">
              Codice manuale: <span className="font-mono font-medium text-gray-600 tracking-wider">UPSA BCDE FGHI JKLM</span>
            </p>
            <OtpInput value={mfaVerifyCode} onChange={setMfaVerifyCode} />
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => { setShowMfaSetup(false); setMfaVerifyCode(""); }}
                className="px-3 py-1.5 border border-gray-300 rounded text-xs text-gray-600 hover:bg-white">
                Annulla
              </button>
              <button onClick={handleMfaVerify}
                disabled={mfaVerifyCode.length < 6 || mfaVerifyLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                {mfaVerifyLoading ? "Verifica…" : <><IconCheck /> Verifica e attiva</>}
              </button>
            </div>
          </div>
        )}

        {/* MFA disable confirm */}
        {mfaEnabled && mfaDisableConfirm && (
          <div className="mx-5 mb-4 border border-red-100 bg-red-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-600">
              <IconShield className="w-4 h-4" />
              <span className="text-sm font-medium">Disattivare MFA?</span>
            </div>
            <p className="text-xs text-gray-600">Il tuo account sarà meno protetto. Sei sicuro?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setMfaDisableConfirm(false)}
                className="px-3 py-1.5 border border-gray-300 rounded text-xs text-gray-600 hover:bg-white">Annulla</button>
              <button onClick={() => { setMfaEnabled(false); setMfaDisableConfirm(false); }}
                className="px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600">
                Sì, disattiva
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Preferenze tema ── */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">Preferenze tema</h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-gray-500 mb-4">Scegli l'aspetto dell'interfaccia.</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Chiaro */}
            <button
              onClick={() => setTheme("light")}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                theme === "light"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className={theme === "light" ? "text-blue-600" : "text-gray-400"}><IconSun /></span>
              <span className={`text-xs font-medium ${theme === "light" ? "text-blue-700" : "text-gray-600"}`}>
                Chiaro
              </span>
              {theme === "light" && (
                <span className="text-xs text-blue-500 flex items-center gap-0.5"><IconCheck /> Attivo</span>
              )}
            </button>
            {/* Scuro */}
            <button
              onClick={() => setTheme("dark")}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                theme === "dark"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className={theme === "dark" ? "text-blue-600" : "text-gray-400"}><IconMoon /></span>
              <span className={`text-xs font-medium ${theme === "dark" ? "text-blue-700" : "text-gray-600"}`}>
                Scuro
              </span>
              {theme === "dark" && (
                <span className="text-xs text-blue-500 flex items-center gap-0.5"><IconCheck /> Attivo</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPersonalModal && (
        <PersonalDataModal
          userId={user?.id}
          currentNome={user?.nome}
          currentCognome={user?.cognome}
          onClose={() => setShowPersonalModal(false)}
          onSave={handlePersonalSave}
        />
      )}
      {showEmailModal && (
        <EmailModal
          userId={user?.id}
          currentEmail={user?.email}
          onClose={() => setShowEmailModal(false)}
          onSave={handleEmailSave}
        />
      )}
      {showPhoneModal && (
        <PhoneModal
          userId={user?.id}
          currentPhone={user?.telefono}
          onClose={() => setShowPhoneModal(false)}
          onSave={handlePhoneSave}
        />
      )}
      {showPasswordModal && (
        <PasswordModal
          userId={user?.id}
          onClose={() => setShowPasswordModal(false)}
          onSave={handlePasswordSave}
        />
      )}
    </div>
  );
}
