const API_BASE = "/api";

const toErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    return payload?.details || payload?.error || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

export const getAllAdrese = async () => {
  try {
    const response = await fetch(`${API_BASE}/adrese`);
    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greška pri učitavanju adresa",
    };
  }
};

export const insertAdresa = async (payload) => {
  try {
    const response = await fetch(`${API_BASE}/adrese`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    return { ok: true, message: "Adresa je uspješno dodana" };
  } catch (error) {
    return { ok: false, error: error?.message || "Greška pri unosu adrese" };
  }
};

export const updateAdresa = async (idAdresa, payload) => {
  try {
    const response = await fetch(`${API_BASE}/adrese/${idAdresa}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    return { ok: true, message: "Adresa je uspješno ažurirana" };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greška pri ažuriranju adrese",
    };
  }
};

export const deleteAdresa = async (idAdresa) => {
  try {
    const response = await fetch(`${API_BASE}/adrese/${idAdresa}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    return { ok: true, message: "Adresa je uspješno obrisana" };
  } catch (error) {
    return { ok: false, error: error?.message || "Greška pri brisanju adrese" };
  }
};
