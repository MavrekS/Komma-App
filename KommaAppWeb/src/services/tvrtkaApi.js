const API_BASE = "/api";

const toErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    return payload?.details || payload?.error || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

export const getTvrtka = async () => {
  try {
    const response = await fetch(`${API_BASE}/tvrtka`);
    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greška pri učitavanju podataka o tvrtki",
    };
  }
};

export const saveTvrtka = async (payload) => {
  try {
    const response = await fetch(`${API_BASE}/tvrtka`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    return { ok: true, message: "Podaci o tvrtki su uspješno spremljeni" };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greška pri spremanju podataka o tvrtki",
    };
  }
};
