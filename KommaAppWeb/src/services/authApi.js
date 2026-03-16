const API_BASE = "/api";

const toErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    return payload?.details || payload?.error || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

export const loginUser = async ({ username, password }) => {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    const data = await response.json();
    return { ok: true, user: data?.user || null };
  } catch (error) {
    return { ok: false, error: error?.message || "Prijava nije uspjela" };
  }
};

export const changePasswordUser = async ({
  id_radnik,
  old_password,
  new_password,
  confirm_new_password,
}) => {
  try {
    const response = await fetch(`${API_BASE}/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_radnik,
        old_password,
        new_password,
        confirm_new_password,
      }),
    });

    if (!response.ok) {
      return { ok: false, error: await toErrorMessage(response) };
    }

    const data = await response.json();
    return {
      ok: true,
      message: data?.message || "Lozinka je uspješno promijenjena",
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Promjena lozinke nije uspjela",
    };
  }
};
