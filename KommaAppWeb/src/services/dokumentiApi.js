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

export const saveNalogPdfToFolder = async ({ fileName, contentBase64 }) => {
  try {
    const response = await fetch(`${API_BASE}/dokumenti/nalozi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, contentBase64 }),
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
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greska pri spremanju dokumenta",
    };
  }
};
