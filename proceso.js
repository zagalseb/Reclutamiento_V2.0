
/* proceso.js - CRM demo (localStorage)
   - Sin reglas de transición
   - Persistencia por jugador: proceso_{usuarioActual}_{Nombre}_{Apellido}
   Requiere que el perfil tenga los IDs:
   crm-stage, crm-priority, crm-updated,
   crm-check-contacto, crm-check-evaluado, crm-check-academico, crm-check-combine, crm-check-tryout, crm-check-decision,
   crm-notes, crm-nextstep, crm-decision-status, crm-decision-details,
   crm-save, crm-reset, crm-msg
*/

(function () {
  "use strict";

  // =========================
  // Config (demo)
  // =========================
  const STAGES = [
    "Nuevo",
    "Evaluando",
    "Contactado",
    "Interesado",
    "Tryout / Visita",
    "Oferta",
    "Admitido",
    "No interesado",
  ];

  const PRIORITIES = ["A", "B", "C"];

  const DECISION_STATUSES = [
    "pendiente",
    "oferta",
    "seguimiento",
    "admitido",
    "No interesado",
  ];

  const CHECK_KEYS = ["contacto", "evaluado", "academico", "combine", "tryout", "decision"];

  // =========================
  // Helpers
  // =========================
  function nowISO() {
    return new Date().toISOString();
  }

  function safeText(v) {
    return (v ?? "").toString();
  }

  function buildPlayerKey(username, nombre, apellido) {
    return `${safeText(username).trim()}_${safeText(nombre).trim()}_${safeText(apellido).trim()}`;
  }

  function buildProcesoStorageKey(playerKey) {
    return `proceso_${playerKey}`;
  }

  function getEl(id) {
    return document.getElementById(id);
  }

  function setMsg(text, kind = "ok") {
    const el = getEl("crm-msg");
    if (!el) return;
    el.textContent = text || "";
    el.style.display = text ? "block" : "none";
    el.style.color = kind === "error" ? "red" : "green";
  }

  function formatUpdated(iso) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "—";
      return d.toLocaleString();
    } catch {
      return "—";
    }
  }

  // =========================
  // Storage
  // =========================
  function createDefaultProceso(playerKey) {
    const t = nowISO();
    return {
      version: 1,
      playerKey,
      stage: "Nuevo",
      priority: "B",
      checklist: {
        contacto: false,
        evaluado: false,
        academico: false,
        combine: false,
        tryout: false,
        decision: false,
      },
      notes: "",
      nextStep: "",
      decision: {
        status: "pendiente",
        details: "",
      },
      createdAt: t,
      lastUpdated: t,
    };
  }

  function loadProceso(playerKey) {
    const key = buildProcesoStorageKey(playerKey);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn("proceso.js: JSON inválido en localStorage", e);
      return null;
    }
  }

  function saveProceso(playerKey, proceso) {
    const key = buildProcesoStorageKey(playerKey);
    const updated = { ...proceso, lastUpdated: nowISO() };
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  }

  function getOrCreateProceso(playerKey) {
    const existing = loadProceso(playerKey);
    if (existing) return existing;
    const created = createDefaultProceso(playerKey);
    saveProceso(playerKey, created);
    return created;
  }

  function resetProceso(playerKey) {
    const key = buildProcesoStorageKey(playerKey);
    localStorage.removeItem(key);
  }

  // Opcional: índice por usuario (para tablero futuro)
  function addToIndex(username, playerKey) {
    const k = `procesos_${username}`;
    const arr = JSON.parse(localStorage.getItem(k) || "[]");
    if (!arr.includes(playerKey)) {
      arr.push(playerKey);
      localStorage.setItem(k, JSON.stringify(arr));
    }
  }

  // =========================
  // UI sync
  // =========================
  function fillSelectOptions(selectEl, options) {
    if (!selectEl) return;
    // No re-llenar si ya tiene opciones (por si el HTML ya las trae)
    if (selectEl.options && selectEl.options.length > 0) return;

    options.forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      selectEl.appendChild(o);
    });
  }

  function paintUI(proceso) {
    // Selects
    const stageEl = getEl("crm-stage");
    const priEl = getEl("crm-priority");
    const decEl = getEl("crm-decision-status");

    if (stageEl) stageEl.value = proceso.stage || "Nuevo";
    if (priEl) priEl.value = proceso.priority || "B";
    if (decEl) decEl.value = proceso.decision?.status || "pendiente";

    // Checklist
    CHECK_KEYS.forEach((k) => {
      const box = getEl(`crm-check-${k}`);
      if (box) box.checked = !!proceso.checklist?.[k];
    });

    // Notes / next
    const notesEl = getEl("crm-notes");
    const nextEl = getEl("crm-nextstep");
    if (notesEl) notesEl.value = proceso.notes || "";
    if (nextEl) nextEl.value = proceso.nextStep || "";

    // Decision details
    const detEl = getEl("crm-decision-details");
    if (detEl) detEl.value = proceso.decision?.details || "";

    // Updated label
    const updEl = getEl("crm-updated");
    if (updEl) updEl.textContent = formatUpdated(proceso.lastUpdated);
  }

  function readUIIntoProceso(current) {
    const proceso = { ...current };

    // stage / priority
    const stageEl = getEl("crm-stage");
    const priEl = getEl("crm-priority");
    const decEl = getEl("crm-decision-status");

    const stageVal = stageEl ? stageEl.value : proceso.stage;
    const priVal = priEl ? priEl.value : proceso.priority;
    const decVal = decEl ? decEl.value : (proceso.decision?.status || "pendiente");

    proceso.stage = STAGES.includes(stageVal) ? stageVal : (proceso.stage || "Nuevo");
    proceso.priority = PRIORITIES.includes(priVal) ? priVal : (proceso.priority || "B");

    // checklist
    const checklist = { ...(proceso.checklist || {}) };
    CHECK_KEYS.forEach((k) => {
      const box = getEl(`crm-check-${k}`);
      if (box) checklist[k] = !!box.checked;
    });
    proceso.checklist = checklist;

    // notes / next
    const notesEl = getEl("crm-notes");
    const nextEl = getEl("crm-nextstep");
    if (notesEl) proceso.notes = notesEl.value || "";
    if (nextEl) proceso.nextStep = nextEl.value || "";

    // decision
    const detEl = getEl("crm-decision-details");
    proceso.decision = {
      status: DECISION_STATUSES.includes(decVal) ? decVal : (proceso.decision?.status || "pendiente"),
      details: detEl ? (detEl.value || "") : (proceso.decision?.details || ""),
    };

    return proceso;
  }

  function bindAutoSave(playerKey) {
    let proceso = getOrCreateProceso(playerKey);

    // Rellenar selects si en HTML no los pusiste
    fillSelectOptions(getEl("crm-stage"), STAGES);
    fillSelectOptions(getEl("crm-priority"), PRIORITIES);

    // Para decisión: si el HTML ya trae labels bonitos, no lo sobreescribimos.
    // Pero si viene vacío, lo llenamos.
    const decEl = getEl("crm-decision-status");
    if (decEl && decEl.options.length === 0) {
      DECISION_STATUSES.forEach((v) => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = (v === "no_interesado") ? "no interesado" : v;
        decEl.appendChild(o);
      });
    }

    paintUI(proceso);
    setMsg("", "ok");

    const updateAndMaybeSave = (silent = true) => {
      proceso = readUIIntoProceso(proceso);
      proceso = saveProceso(playerKey, proceso);
      paintUI(proceso);
      if (!silent) setMsg("Proceso guardado.", "ok");
      return proceso;
    };

    // Auto-save en cambios
    const watchIds = [
      "crm-stage",
      "crm-priority",
      "crm-check-contacto",
      "crm-check-evaluado",
      "crm-check-academico",
      "crm-check-combine",
      "crm-check-tryout",
      "crm-check-decision",
      "crm-decision-status",
    ];

    watchIds.forEach((id) => {
      const el = getEl(id);
      if (!el) return;
      el.addEventListener("change", () => updateAndMaybeSave(true));
    });

    // Textareas: guardar al salir o con pausa corta
    const notesEl = getEl("crm-notes");
    const nextEl = getEl("crm-nextstep");
    const detEl = getEl("crm-decision-details");

    let t = null;
    const debounceSave = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => updateAndMaybeSave(true), 400);
    };

    [notesEl, nextEl, detEl].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", debounceSave);
      el.addEventListener("blur", () => updateAndMaybeSave(true));
    });

    // Botones
    const saveBtn = getEl("crm-save");
    const resetBtn = getEl("crm-reset");

    saveBtn?.addEventListener("click", () => {
      updateAndMaybeSave(false);
    });

    resetBtn?.addEventListener("click", () => {
      // Reset del proceso: vuelve a defaults
      resetProceso(playerKey);
      proceso = getOrCreateProceso(playerKey);
      paintUI(proceso);
      setMsg("Proceso reseteado.", "ok");
    });

    return proceso;
  }

  // =========================
  // Boot
  // =========================
  function initProcesoCRM() {
    // Se corre desde perfil.html (donde ya hay ?nombre= &apellido=) y usuarioActual en localStorage
    const params = new URLSearchParams(window.location.search);
    const nombre = params.get("nombre");
    const apellido = params.get("apellido");
    const username = localStorage.getItem("usuarioActual");

    // Si no estamos en perfil o falta algo, salimos sin romper
    if (!nombre || !apellido || !username) {
      return;
    }

    const playerKey = buildPlayerKey(username, nombre, apellido);
    addToIndex(username, playerKey);
    bindAutoSave(playerKey);
  }

  // Exponer una mini API (por si perfil.js quiere usarla después)
  window.ProcesoCRM = {
    STAGES,
    PRIORITIES,
    DECISION_STATUSES,
    CHECK_KEYS,
    buildPlayerKey,
    buildProcesoStorageKey,
    createDefaultProceso,
    loadProceso,
    saveProceso,
    getOrCreateProceso,
    resetProceso,
    initProcesoCRM,
  };

  document.addEventListener("DOMContentLoaded", initProcesoCRM);
})();
