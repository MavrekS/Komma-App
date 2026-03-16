const API_BASE = "/api";

const normalizeRadnik = (radnik) => ({
  ...radnik,
  oib: String(radnik?.oib ?? radnik?.OIB ?? "").trim(),
});

const toErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    return payload?.details || payload?.error || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

export const getAllRadnici = async () => {
  try {
    const response = await fetch(`${API_BASE}/radnici`);
    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    const data = await response.json();
    const normalizedData = Array.isArray(data) ? data.map(normalizeRadnik) : [];
    return { ok: true, data: normalizedData };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greška pri učitavanju radnika",
    };
  }
};

export const insertRadnik = async (payload) => {
  try {
    const response = await fetch(`${API_BASE}/radnici`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    return { ok: true, message: "Radnik je uspješno dodan" };
  } catch (error) {
    return { ok: false, error: error?.message || "Greška pri unosu radnika" };
  }
};

export const updateRadnik = async (idRadnik, payload) => {
  try {
    const response = await fetch(`${API_BASE}/radnici/${idRadnik}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    return { ok: true, message: "Radnik je uspješno ažuriran" };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greška pri ažuriranju radnika",
    };
  }
};

export const deleteRadnik = async (idRadnik) => {
  try {
    const response = await fetch(`${API_BASE}/radnici/${idRadnik}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    return { ok: true, message: "Radnik je uspješno obrisan" };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greška pri brisanju radnika",
    };
  }
};
