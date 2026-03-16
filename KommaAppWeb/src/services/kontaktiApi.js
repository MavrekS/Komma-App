const API_BASE = "/api";

const toErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    return payload?.details || payload?.error || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

export const getAllKontakti = async (idKlijent = null) => {
  try {
    const query = idKlijent
      ? `?id_klijent=${encodeURIComponent(idKlijent)}`
      : "";
    const response = await fetch(`${API_BASE}/kontakti${query}`);

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greška pri učitavanju kontakata",
    };
  }
};

export const insertKontakt = async (payload) => {
  try {
    const response = await fetch(`${API_BASE}/kontakti`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    return { ok: true, message: "Kontakt je uspješno dodan" };
  } catch (error) {
    return { ok: false, error: error?.message || "Greška pri unosu kontakta" };
  }
};

export const updateKontakt = async (idKontakt, payload) => {
  try {
    const response = await fetch(`${API_BASE}/kontakti/${idKontakt}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    return { ok: true, message: "Kontakt je uspješno ažuriran" };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greška pri ažuriranju kontakta",
    };
  }
};

export const deleteKontakt = async (idKontakt) => {
  try {
    const response = await fetch(`${API_BASE}/kontakti/${idKontakt}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    return { ok: true, message: "Kontakt je uspješno obrisan" };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greška pri brisanju kontakta",
    };
  }
};
