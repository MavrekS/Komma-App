const API_BASE = "/api";

const toErrorPayload = async (response) => {
  try {
    const payload = await response.json();
    return {
      status: response.status,
      message: payload?.details || payload?.error || `HTTP ${response.status}`,
    };
  } catch {
    return { status: response.status, message: `HTTP ${response.status}` };
  }
};

export const insertRadniDan = async (payload) => {
  try {
    const response = await fetch(`${API_BASE}/radni-dan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorPayload = await toErrorPayload(response);
      return {
        ok: false,
        error: errorPayload.message,
        status: errorPayload.status,
      };
    }

    const data = await response.json();
    const insertedCount = Number(data?.inserted_count || 0);
    if (insertedCount > 1) {
      return {
        ok: true,
        message: `Radni dan je uspješno unesen za ${insertedCount} radnika`,
      };
    }

    return { ok: true, message: "Radni dan je uspješno unesen" };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greška pri unosu radnog dana",
    };
  }
};

export const getAllRadniDani = async () => {
  try {
    const response = await fetch(`${API_BASE}/radni-dani`);

    if (!response.ok) {
      const errorPayload = await toErrorPayload(response);
      return {
        ok: false,
        error: errorPayload.message,
        status: errorPayload.status,
      };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greška pri učitavanju radnih dana",
    };
  }
};
