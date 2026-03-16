const API_BASE = "/api";

const toErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    return payload?.details || payload?.error || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

export const getAllNalozi = async (idRadnik = null) => {
  try {
    const query = idRadnik ? `?id_radnik=${encodeURIComponent(idRadnik)}` : "";
    const response = await fetch(`${API_BASE}/nalozi${query}`);

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greška pri učitavanju naloga",
    };
  }
};

export const insertNalog = async (payload) => {
  try {
    const response = await fetch(`${API_BASE}/nalozi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    return { ok: true, message: "Nalog je uspješno unesen" };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greška pri unosu naloga",
    };
  }
};

export const updateNalog = async (idNalog, payload) => {
  try {
    const response = await fetch(`${API_BASE}/nalozi/${idNalog}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    return { ok: true, message: "Nalog je uspješno ažuriran" };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greška pri ažuriranju naloga",
    };
  }
};
