const API_BASE = "/api";

const toErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    return payload?.details || payload?.error || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

export const getAllKlijenti = async () => {
  try {
    const response = await fetch(`${API_BASE}/klijenti`);
    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greška pri učitavanju klijenata",
    };
  }
};

export const insertKlijent = async (payload) => {
  try {
    const response = await fetch(`${API_BASE}/klijenti`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    return { ok: true, message: "Klijent je uspješno dodan" };
  } catch (error) {
    return { ok: false, error: error?.message || "Greška pri unosu klijenta" };
  }
};

export const updateKlijent = async (idKlijent, payload) => {
  try {
    const response = await fetch(`${API_BASE}/klijenti/${idKlijent}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    return { ok: true, message: "Klijent je uspješno ažuriran" };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greška pri ažuriranju klijenta",
    };
  }
};

export const deleteKlijent = async (idKlijent) => {
  try {
    const response = await fetch(`${API_BASE}/klijenti/${idKlijent}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    return { ok: true, message: "Klijent je uspješno obrisan" };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greška pri brisanju klijenta",
    };
  }
};
