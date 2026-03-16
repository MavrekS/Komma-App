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

export const createPutniNalozi = async (payload) => {
  try {
    const response = await fetch(`${API_BASE}/putni-nalozi`, {
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
    return {
      ok: true,
      insertedCount: Number(data?.inserted_count || 0),
      message: "Putni nalog je uspjesno kreiran",
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greska pri kreiranju putnog naloga",
    };
  }
};

export const getPutniNaloziForNalogAndRadnik = async ({
  idNalog,
  idRadnik,
  status,
}) => {
  try {
    const params = new URLSearchParams({
      id_nalog: String(idNalog),
      id_radnik: String(idRadnik),
    });

    if (status) {
      params.set("status", String(status));
    }

    const query = `?${params.toString()}`;
    const response = await fetch(`${API_BASE}/putni-nalozi${query}`);

    if (!response.ok) {
      const errorPayload = await toErrorPayload(response);
      return {
        ok: false,
        error: errorPayload.message,
        status: errorPayload.status,
      };
    }

    const data = await response.json();
    return { ok: true, data: Array.isArray(data) ? data : [] };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greska pri ucitavanju putnih naloga",
    };
  }
};

export const finishPutniNalog = async (idPutniNalog, payload) => {
  try {
    const response = await fetch(
      `${API_BASE}/putni-nalozi/${idPutniNalog}/zavrsi`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorPayload = await toErrorPayload(response);
      return {
        ok: false,
        error: errorPayload.message,
        status: errorPayload.status,
      };
    }

    return { ok: true, message: "Putni nalog je uspjesno zavrsen" };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greska pri zavrsetku putnog naloga",
    };
  }
};

export const getAllPutniNalozi = async ({ idNalog, idRadnik, status } = {}) => {
  try {
    const params = new URLSearchParams();

    if (idNalog) {
      params.set("id_nalog", String(idNalog));
    }

    if (idRadnik) {
      params.set("id_radnik", String(idRadnik));
    }

    if (status) {
      params.set("status", String(status));
    }

    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(`${API_BASE}/putni-nalozi${query}`);

    if (!response.ok) {
      const errorPayload = await toErrorPayload(response);
      return {
        ok: false,
        error: errorPayload.message,
        status: errorPayload.status,
      };
    }

    const data = await response.json();
    return { ok: true, data: Array.isArray(data) ? data : [] };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Greska pri ucitavanju putnih naloga",
    };
  }
};
