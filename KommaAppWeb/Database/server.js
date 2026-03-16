const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { sql, poolPromise } = require("./databaseConn");

const app = express();
app.use(express.json({ limit: "20mb" }));

const NALOZI_DIRECTORY = "C:\\Nalozi";

const isSha256Hash = (value) => /^[a-fA-F0-9]{64}$/.test(String(value || ""));
const parsePositiveInt = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const parseDateOnlyInput = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const normalized = String(value).trim();
  const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);

    const parsed = new Date(year, month - 1, day);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }

    return parsed;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const parseDateOnlySqlInput = (value) => {
  const parsed = parseDateOnlyInput(value);
  if (!parsed) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateTimeInput = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value;
  }

  const normalized = String(value).trim();
  if (!normalized) return null;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const parseTimeToSeconds = (value) => {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return (
      value.getHours() * 3600 + value.getMinutes() * 60 + value.getSeconds()
    );
  }

  const normalized = String(value).trim();
  const match = normalized.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || "0");

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    !Number.isInteger(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }

  return hours * 3600 + minutes * 60 + seconds;
};

const isValidTelefon = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return true;
  if (normalized.length > 20) return false;
  return /^\+?[0-9][0-9\s-]*$/.test(normalized);
};

const isValidOib = (value) => /^\d{1,20}$/.test(String(value || "").trim());
const isValidPostanskiBroj = (value) =>
  String(value || "").trim().length > 0 &&
  String(value || "").trim().length <= 20;

const toText = (value, fallback = "N/A") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const parseBooleanFlag = (value, fallback = true) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "da"].includes(normalized)) return true;
  if (["0", "false", "no", "ne"].includes(normalized)) return false;
  return fallback;
};

const POSLODAVAC_DEFAULT = {
  naziv: toText(process.env.POSLODAVAC_NAZIV, "Komma d.o.o."),
  adresa: toText(process.env.POSLODAVAC_ADRESA, "N/A"),
  postanskiBroj: toText(process.env.POSLODAVAC_POSTANSKI_BROJ, "N/A"),
  jeHrvatska: parseBooleanFlag(process.env.POSLODAVAC_JE_HR, true),
  oib: "N/A",
};

POSLODAVAC_DEFAULT.oib = POSLODAVAC_DEFAULT.jeHrvatska
  ? toText(process.env.POSLODAVAC_OIB, "N/A")
  : "N/A";

const normalizePoslodavacSettings = (input) => {
  const naziv = toText(input?.naziv, POSLODAVAC_DEFAULT.naziv);
  const adresa = toText(input?.adresa, POSLODAVAC_DEFAULT.adresa);
  const postanskiBroj = toText(
    input?.postanskiBroj || input?.postanski_broj,
    POSLODAVAC_DEFAULT.postanskiBroj,
  );

  const jeHrvatskaNormalized =
    typeof input?.jeHrvatska === "boolean"
      ? input.jeHrvatska
      : parseBooleanFlag(
          input?.jeHrvatska,
          String(input?.oib || "")
            .trim()
            .toUpperCase() !== "N/A",
        );

  const oib = jeHrvatskaNormalized
    ? toText(input?.oib, POSLODAVAC_DEFAULT.oib)
    : "N/A";

  return {
    naziv,
    adresa,
    postanskiBroj,
    jeHrvatska: jeHrvatskaNormalized,
    oib,
  };
};

const ensureCanManageNalog = async (pool, actorIdRadnik) => {
  const parsedActorId = parsePositiveInt(actorIdRadnik);
  if (!parsedActorId) {
    return { ok: false, status: 403, error: "Nedozvoljeno" };
  }

  const request = pool.request();
  request.input("id_radnik", sql.Int, parsedActorId);

  const roleResult = await request.query(
    `SELECT TOP 1 role
     FROM radnici
     WHERE id_radnik = @id_radnik;`,
  );

  const role = String(roleResult.recordset?.[0]?.role || "user").toLowerCase();
  if (role === "user") {
    return {
      ok: false,
      status: 403,
      error: "Nemate pravo kreirati ili uređivati radni nalog",
    };
  }

  return { ok: true, actorIdRadnik: parsedActorId, role };
};

const hashPasswordForStorage = (value) => {
  const stringValue = String(value || "");
  if (isSha256Hash(stringValue)) return stringValue.toLowerCase();
  return crypto.createHash("sha256").update(stringValue).digest("hex");
};

const sanitizeFilename = (value) => {
  const normalized = String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_");

  const safe = normalized.slice(0, 180);
  return safe || `nalog_${Date.now()}.pdf`;
};

const ensurePdfExtension = (value) =>
  String(value || "")
    .toLowerCase()
    .endsWith(".pdf")
    ? String(value)
    : `${String(value)}.pdf`;

const toUniqueFilePath = async (directory, baseFileName) => {
  const parsed = path.parse(baseFileName);
  const ext = parsed.ext || ".pdf";
  const baseName = parsed.name || "nalog";

  let candidatePath = path.join(directory, `${baseName}${ext}`);
  let index = 1;

  while (fs.existsSync(candidatePath)) {
    candidatePath = path.join(directory, `${baseName}_${index}${ext}`);
    index += 1;
  }

  return candidatePath;
};

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "username i password su obavezni" });
  }

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input("username", sql.NVarChar(100), username);

    const result = await request.query(
      `SELECT TOP 1 id_radnik, username, ime, prezime, email, hash_password, role
       FROM radnici
       WHERE username COLLATE Latin1_General_CS_AS = @username COLLATE Latin1_General_CS_AS;`,
    );

    const radnik = result.recordset[0];
    if (!radnik) {
      return res
        .status(401)
        .json({ error: "Neispravno korisničko ime ili lozinka" });
    }

    const providedHash = hashPasswordForStorage(password);
    const storedPassword = String(radnik.hash_password || "");
    const isValidPassword =
      storedPassword.toLowerCase() === providedHash ||
      storedPassword === String(password);

    if (!isValidPassword) {
      return res
        .status(401)
        .json({ error: "Neispravno korisničko ime ili lozinka" });
    }

    return res.json({
      ok: true,
      user: {
        id_radnik: radnik.id_radnik,
        username: radnik.username,
        ime: radnik.ime,
        prezime: radnik.prezime,
        email: radnik.email,
        role: radnik.role || "user",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.post("/auth/change-password", async (req, res) => {
  const { id_radnik, old_password, new_password, confirm_new_password } =
    req.body || {};

  const parsedIdRadnik = parsePositiveInt(id_radnik);
  if (!parsedIdRadnik) {
    return res.status(400).json({ error: "id_radnik nije ispravan" });
  }

  if (!old_password || !new_password || !confirm_new_password) {
    return res.status(400).json({
      error: "Stara lozinka, nova lozinka i potvrda nove lozinke su obavezni",
    });
  }

  if (String(new_password) !== String(confirm_new_password)) {
    return res
      .status(400)
      .json({ error: "Nova lozinka i potvrda lozinke se ne podudaraju" });
  }

  if (String(new_password) === String(old_password)) {
    return res
      .status(400)
      .json({ error: "Nova lozinka mora biti različita od stare" });
  }

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input("id_radnik", sql.Int, parsedIdRadnik);

    const userResult = await request.query(
      `SELECT TOP 1 id_radnik, hash_password
       FROM radnici
       WHERE id_radnik = @id_radnik;`,
    );

    const radnik = userResult.recordset?.[0];
    if (!radnik) {
      return res.status(404).json({ error: "Korisnik nije pronađen" });
    }

    const providedOldHash = hashPasswordForStorage(old_password);
    const storedPassword = String(radnik.hash_password || "");
    const isValidOldPassword =
      storedPassword.toLowerCase() === providedOldHash ||
      storedPassword === String(old_password);

    if (!isValidOldPassword) {
      return res.status(401).json({ error: "Stara lozinka nije ispravna" });
    }

    const nextPasswordHash = hashPasswordForStorage(new_password);

    const updateRequest = pool.request();
    updateRequest.input("id_radnik", sql.Int, parsedIdRadnik);
    updateRequest.input("hash_password", sql.NVarChar(64), nextPasswordHash);

    await updateRequest.query(
      `UPDATE radnici
       SET hash_password = @hash_password
       WHERE id_radnik = @id_radnik;`,
    );

    return res.json({ ok: true, message: "Lozinka je uspješno promijenjena" });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.post("/dokumenti/nalozi", async (req, res) => {
  const { fileName, contentBase64 } = req.body || {};
  const trimmedContent = String(contentBase64 || "").trim();

  if (!trimmedContent) {
    return res.status(400).json({ error: "contentBase64 required" });
  }

  const safeFileName = ensurePdfExtension(sanitizeFilename(fileName));

  try {
    const buffer = Buffer.from(trimmedContent, "base64");
    if (!buffer.length) {
      return res.status(400).json({ error: "Prazan PDF sadržaj" });
    }

    await fs.promises.mkdir(NALOZI_DIRECTORY, { recursive: true });
    const targetPath = await toUniqueFilePath(NALOZI_DIRECTORY, safeFileName);
    await fs.promises.writeFile(targetPath, buffer);

    return res.status(201).json({ success: true, filePath: targetPath });
  } catch (err) {
    console.error("Spremanje PDF naloga nije uspjelo:", err);
    return res
      .status(500)
      .json({ error: "file_save_error", details: err.message });
  }
});

app.post("/nalozi", async (req, res) => {
  const {
    naziv_naloga,
    klijent,
    materijal,
    id_kontakt,
    status_naloga,
    kreiran_na_datum,
    pocetak_naloga,
    Izvrsiti_do,
    adresa,
    opis_posla,
    oprema,
    id_radnici,
    voditelj_naloga,
    actor_id_radnik,
  } = req.body;
  if (!naziv_naloga)
    return res.status(400).json({ error: "naziv_naloga required" });

  const allowedStatuses = ["aktivan", "neaktivan", "izvrseni", "ponisteni"];
  const normalizedStatus = String(status_naloga || "aktivan").toLowerCase();
  if (!allowedStatuses.includes(normalizedStatus)) {
    return res.status(400).json({ error: "status_naloga invalid" });
  }

  const parsedKlijent = parsePositiveInt(klijent);
  if (!parsedKlijent) {
    return res.status(400).json({ error: "Klijent je obavezan" });
  }

  const parsedAdresa = parsePositiveInt(adresa);
  if (!parsedAdresa) {
    return res.status(400).json({ error: "Adresa je obavezna" });
  }

  const parsedKontakt = parsePositiveInt(id_kontakt);
  if (!parsedKontakt) {
    return res.status(400).json({ error: "Kontakt je obavezan" });
  }

  const parsedRadnici = Array.isArray(id_radnici)
    ? [...new Set(id_radnici.map(parsePositiveInt).filter(Boolean))]
    : [];

  if (parsedRadnici.length === 0) {
    return res
      .status(400)
      .json({ error: "Najmanje jedan radnik mora biti odabran" });
  }

  const parsedVoditeljNalog = parsePositiveInt(voditelj_naloga);
  if (!parsedVoditeljNalog) {
    return res.status(400).json({ error: "Voditelj naloga je obavezan" });
  }

  if (!parsedRadnici.includes(parsedVoditeljNalog)) {
    parsedRadnici.push(parsedVoditeljNalog);
  }

  try {
    const pool = await poolPromise;

    const permissionCheck = await ensureCanManageNalog(pool, actor_id_radnik);
    if (!permissionCheck.ok) {
      return res
        .status(permissionCheck.status)
        .json({ error: permissionCheck.error });
    }

    const kontaktCheckRequest = pool.request();
    kontaktCheckRequest.input("id_kontakt", sql.Int, parsedKontakt);
    kontaktCheckRequest.input("id_klijent", sql.Int, parsedKlijent);
    const kontaktCheck = await kontaktCheckRequest.query(
      `SELECT TOP 1 id_kontakt
       FROM kontakti
       WHERE id_kontakt = @id_kontakt
         AND id_klijent = @id_klijent;`,
    );

    if (!kontaktCheck.recordset?.length) {
      return res.status(400).json({
        error: "Odabrani kontakt ne pripada odabranom klijentu",
      });
    }

    const request = pool.request();
    request.input("naziv_naloga", sql.NVarChar(50), naziv_naloga);
    request.input("id_klijent", sql.Int, parsedKlijent);
    request.input("materijal", sql.NVarChar(sql.MAX), materijal || null);
    request.input("id_kontakt", sql.Int, parsedKontakt);
    request.input(
      "kreiran_na_datum",
      sql.DateTime,
      kreiran_na_datum ? new Date(kreiran_na_datum) : null,
    );
    request.input(
      "pocetak_naloga",
      sql.Date,
      parseDateOnlySqlInput(pocetak_naloga),
    );
    request.input("Izvrsiti_do", sql.Date, parseDateOnlySqlInput(Izvrsiti_do));
    request.input("id_adresa", sql.Int, parsedAdresa);
    request.input("opis_posla", sql.NVarChar(sql.MAX), opis_posla || null);
    request.input("status_naloga", sql.NVarChar(20), normalizedStatus);
    request.input(
      "oprema",
      sql.NVarChar(100),
      String(oprema || "").trim() || "N/A",
    );
    request.input("id_voditelj_naloga", sql.Int, parsedVoditeljNalog);

    const nalogInsertResult = await request.query(
      `INSERT INTO nalozi (naziv_naloga, id_klijent, materijal, id_kontakt, kreiran_na_datum, pocetak_naloga, izvrsiti_do, id_adresa, opis_posla, status_naloga, oprema, id_voditelj_naloga)
       OUTPUT INSERTED.id_nalog
       VALUES (@naziv_naloga,@id_klijent,@materijal,@id_kontakt,@kreiran_na_datum,@pocetak_naloga,@Izvrsiti_do,@id_adresa,@opis_posla,@status_naloga,@oprema,@id_voditelj_naloga);`,
    );

    const createdNalogId = nalogInsertResult.recordset?.[0]?.id_nalog;
    if (!createdNalogId) {
      return res
        .status(500)
        .json({ error: "db_error", details: "Nalog insert failed" });
    }

    const relationRequest = pool.request();
    relationRequest.input("id_nalog", sql.Int, createdNalogId);

    const valuesSql = parsedRadnici
      .map((idRadnik, index) => {
        const paramName = `id_radnik_${index}`;
        relationRequest.input(paramName, sql.Int, idRadnik);
        return `(@id_nalog, @${paramName})`;
      })
      .join(",");

    await relationRequest.query(
      `INSERT INTO nalog_radnik (id_nalog, id_radnik)
       VALUES ${valuesSql};`,
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("DB insert error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.get("/nalozi", async (req, res) => {
  const idRadnikFilter = parsePositiveInt(req.query.id_radnik);

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input("id_radnik", sql.Int, idRadnikFilter);

    const result = await request.query(
      `SELECT n.*, n.id_klijent AS klijent, n.id_adresa AS adresa, n.id_voditelj_naloga AS voditelj_naloga, v.username AS voditelj_username, k.naziv AS kontakt_naziv, k.telefonski_broj AS kontakt_telefon, rel.id_radnici_csv, rel.radnici_usernames
       FROM nalozi n
       LEFT JOIN radnici v ON v.id_radnik = n.id_voditelj_naloga
       LEFT JOIN kontakti k ON k.id_kontakt = n.id_kontakt
       OUTER APPLY (
         SELECT STRING_AGG(CAST(src.id_radnik AS NVARCHAR(20)), ',') AS id_radnici_csv,
                STRING_AGG(src.username, ', ') AS radnici_usernames
         FROM (
           SELECT DISTINCT nr.id_radnik, r.username
           FROM nalog_radnik nr
           LEFT JOIN radnici r ON r.id_radnik = nr.id_radnik
           WHERE nr.id_nalog = n.id_nalog
         ) src
       ) rel
       WHERE @id_radnik IS NULL
          OR EXISTS (
            SELECT 1
            FROM nalog_radnik nr
            WHERE nr.id_nalog = n.id_nalog
              AND nr.id_radnik = @id_radnik
          );`,
    );

    res.json(result.recordset);
  } catch (err) {
    console.error("DB fetch error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.put("/nalozi/:id", async (req, res) => {
  const { id } = req.params;
  const parsedNalogId = parsePositiveInt(id);
  const {
    naziv_naloga,
    klijent,
    materijal,
    id_kontakt,
    pocetak_naloga,
    Izvrsiti_do,
    adresa,
    opis_posla,
    status_naloga,
    oprema,
    voditelj_naloga,
    id_radnici,
    actor_id_radnik,
  } = req.body;
  const allowedStatuses = ["aktivan", "neaktivan", "izvrseni", "ponisteni"];
  if (!parsedNalogId) {
    return res.status(400).json({ error: "id naloga nije ispravan" });
  }

  try {
    const pool = await poolPromise;

    const parsedActorId = parsePositiveInt(actor_id_radnik);
    if (!parsedActorId) {
      return res.status(403).json({ error: "Nedozvoljeno" });
    }

    const roleRequest = pool.request();
    roleRequest.input("id_radnik", sql.Int, parsedActorId);
    const roleResult = await roleRequest.query(
      `SELECT TOP 1 role
       FROM radnici
       WHERE id_radnik = @id_radnik;`,
    );

    const actorRole = String(
      roleResult.recordset?.[0]?.role || "user",
    ).toLowerCase();

    if (actorRole === "user") {
      const allowedUserFields = new Set([
        "opis_posla",
        "materijal",
        "status_naloga",
        "actor_id_radnik",
      ]);
      const hasForbiddenFields = Object.keys(req.body).some(
        (fieldName) => !allowedUserFields.has(fieldName),
      );

      if (hasForbiddenFields) {
        return res.status(403).json({
          error:
            "Kao voditelj naloga možete mijenjati samo opis i materijal naloga",
        });
      }

      const hasOpisInBody = Object.prototype.hasOwnProperty.call(
        req.body,
        "opis_posla",
      );
      const hasMaterijalInBody = Object.prototype.hasOwnProperty.call(
        req.body,
        "materijal",
      );
      const hasStatusInBody = Object.prototype.hasOwnProperty.call(
        req.body,
        "status_naloga",
      );

      if (!hasOpisInBody && !hasMaterijalInBody && !hasStatusInBody) {
        return res.status(400).json({ error: "Nema podataka za ažuriranje" });
      }

      if (
        hasStatusInBody &&
        String(status_naloga || "").toLowerCase() !== "izvrseni"
      ) {
        return res
          .status(400)
          .json({ error: "Korisnik može postaviti samo status izvrseni" });
      }

      const trimmedOpis = hasOpisInBody
        ? String(opis_posla || "").trim()
        : null;
      const normalizedMaterijal = hasMaterijalInBody
        ? String(materijal || "").trim() || null
        : null;

      if (hasOpisInBody && !trimmedOpis) {
        return res.status(400).json({ error: "opis_posla required" });
      }

      const nalogCheckRequest = pool.request();
      nalogCheckRequest.input("id_nalog", sql.Int, parsedNalogId);
      const nalogCheckResult = await nalogCheckRequest.query(
        `SELECT TOP 1 id_voditelj_naloga AS voditelj_naloga
         FROM nalozi
         WHERE id_nalog = @id_nalog;`,
      );

      const nalogRow = nalogCheckResult.recordset?.[0];
      if (!nalogRow) {
        return res.status(404).json({ error: "Nalog nije pronađen" });
      }

      if (Number(nalogRow.voditelj_naloga) !== parsedActorId) {
        return res.status(403).json({
          error: "Nemate pravo mijenjati opis ovog naloga",
        });
      }

      const updateOpisRequest = pool.request();
      updateOpisRequest.input("id_nalog", sql.Int, parsedNalogId);

      const setClauses = [];
      if (hasOpisInBody) {
        updateOpisRequest.input(
          "opis_posla",
          sql.NVarChar(sql.MAX),
          trimmedOpis,
        );
        setClauses.push("opis_posla = @opis_posla");
      }

      if (hasMaterijalInBody) {
        updateOpisRequest.input(
          "materijal",
          sql.NVarChar(sql.MAX),
          normalizedMaterijal,
        );
        setClauses.push("materijal = @materijal");
      }

      if (hasStatusInBody) {
        updateOpisRequest.input("status_naloga", sql.NVarChar(20), "izvrseni");
        setClauses.push("status_naloga = @status_naloga");
      }

      await updateOpisRequest.query(
        `UPDATE nalozi
        SET ${setClauses.join(", ")}
         WHERE id_nalog = @id_nalog;`,
      );

      return res.json({ success: true });
    }

    const hasOpremaInBody = Object.prototype.hasOwnProperty.call(
      req.body,
      "oprema",
    );

    const hasNazivNalogaInBody = Object.prototype.hasOwnProperty.call(
      req.body,
      "naziv_naloga",
    );
    const hasIzvrsitiDoInBody = Object.prototype.hasOwnProperty.call(
      req.body,
      "Izvrsiti_do",
    );
    const hasOpisPoslaInBody = Object.prototype.hasOwnProperty.call(
      req.body,
      "opis_posla",
    );
    const hasStatusNalogaInBody = Object.prototype.hasOwnProperty.call(
      req.body,
      "status_naloga",
    );

    if (hasNazivNalogaInBody && !String(naziv_naloga || "").trim()) {
      return res.status(400).json({ error: "naziv_naloga required" });
    }

    if (status_naloga && !allowedStatuses.includes(status_naloga)) {
      return res.status(400).json({ error: "status_naloga invalid" });
    }

    const hasPocetakNalogaInBody = Object.prototype.hasOwnProperty.call(
      req.body,
      "pocetak_naloga",
    );
    const hasKlijentInBody = Object.prototype.hasOwnProperty.call(
      req.body,
      "klijent",
    );
    const hasAdresaInBody = Object.prototype.hasOwnProperty.call(
      req.body,
      "adresa",
    );
    const hasIdKontaktInBody = Object.prototype.hasOwnProperty.call(
      req.body,
      "id_kontakt",
    );
    const hasMaterijalInBody = Object.prototype.hasOwnProperty.call(
      req.body,
      "materijal",
    );
    const hasVoditeljNalogaInBody = Object.prototype.hasOwnProperty.call(
      req.body,
      "voditelj_naloga",
    );
    const hasIdRadniciInBody = Object.prototype.hasOwnProperty.call(
      req.body,
      "id_radnici",
    );
    const parsedVoditeljNalog = parsePositiveInt(voditelj_naloga);
    const parsedRadnici = hasIdRadniciInBody
      ? [
          ...new Set(
            (Array.isArray(id_radnici) ? id_radnici : [])
              .map(parsePositiveInt)
              .filter(Boolean),
          ),
        ]
      : [];
    const parsedKlijent = hasKlijentInBody ? parsePositiveInt(klijent) : null;
    const parsedAdresa = hasAdresaInBody ? parsePositiveInt(adresa) : null;
    const parsedKontakt = hasIdKontaktInBody
      ? parsePositiveInt(id_kontakt)
      : null;

    if (hasKlijentInBody && !parsedKlijent) {
      return res.status(400).json({ error: "klijent invalid" });
    }

    if (hasAdresaInBody && !parsedAdresa) {
      return res.status(400).json({ error: "adresa invalid" });
    }

    if (hasIdKontaktInBody && !parsedKontakt) {
      return res.status(400).json({ error: "id_kontakt invalid" });
    }

    if (hasVoditeljNalogaInBody && !parsedVoditeljNalog) {
      return res.status(400).json({ error: "voditelj_naloga invalid" });
    }

    if (hasIdRadniciInBody && parsedRadnici.length === 0) {
      return res
        .status(400)
        .json({ error: "Najmanje jedan radnik mora biti odabran" });
    }

    if (hasVoditeljNalogaInBody && hasIdRadniciInBody) {
      if (!parsedRadnici.includes(parsedVoditeljNalog)) {
        parsedRadnici.push(parsedVoditeljNalog);
      }
    }

    if (hasIdKontaktInBody) {
      const klijentSourceRequest = pool.request();
      klijentSourceRequest.input("id_nalog", sql.Int, parsedNalogId);
      const klijentSourceResult = await klijentSourceRequest.query(
        `SELECT TOP 1 id_klijent
         FROM nalozi
         WHERE id_nalog = @id_nalog;`,
      );

      const existingKlijent = parsePositiveInt(
        klijentSourceResult.recordset?.[0]?.id_klijent,
      );
      const effectiveKlijent = hasKlijentInBody
        ? parsedKlijent
        : existingKlijent;

      if (!effectiveKlijent) {
        return res
          .status(400)
          .json({ error: "Nije moguće odrediti klijenta za kontakt" });
      }

      const kontaktCheckRequest = pool.request();
      kontaktCheckRequest.input("id_kontakt", sql.Int, parsedKontakt);
      kontaktCheckRequest.input("id_klijent", sql.Int, effectiveKlijent);
      const kontaktCheck = await kontaktCheckRequest.query(
        `SELECT TOP 1 id_kontakt
         FROM kontakti
         WHERE id_kontakt = @id_kontakt
           AND id_klijent = @id_klijent;`,
      );

      if (!kontaktCheck.recordset?.length) {
        return res.status(400).json({
          error: "Odabrani kontakt ne pripada odabranom klijentu",
        });
      }
    }

    const request = pool.request();
    request.input("id_nalog", sql.Int, parsedNalogId);
    request.input(
      "naziv_naloga",
      sql.NVarChar(50),
      hasNazivNalogaInBody ? String(naziv_naloga || "").trim() : null,
    );
    request.input(
      "id_klijent",
      sql.Int,
      hasKlijentInBody ? parsedKlijent : null,
    );
    request.input(
      "Izvrsiti_do",
      sql.Date,
      hasIzvrsitiDoInBody ? parseDateOnlySqlInput(Izvrsiti_do) : null,
    );
    request.input(
      "pocetak_naloga",
      sql.Date,
      hasPocetakNalogaInBody && pocetak_naloga
        ? parseDateOnlySqlInput(pocetak_naloga)
        : null,
    );
    request.input("id_adresa", sql.Int, hasAdresaInBody ? parsedAdresa : null);
    request.input(
      "materijal",
      sql.NVarChar(sql.MAX),
      hasMaterijalInBody ? String(materijal || "").trim() || null : null,
    );
    request.input(
      "id_kontakt",
      sql.Int,
      hasIdKontaktInBody ? parsedKontakt : null,
    );
    request.input(
      "opis_posla",
      sql.NVarChar(sql.MAX),
      hasOpisPoslaInBody ? opis_posla || null : null,
    );
    request.input(
      "status_naloga",
      sql.NVarChar(20),
      hasStatusNalogaInBody ? status_naloga : null,
    );
    request.input(
      "oprema",
      sql.NVarChar(100),
      hasOpremaInBody ? String(oprema || "").trim() || "N/A" : null,
    );
    request.input(
      "id_voditelj_naloga",
      sql.Int,
      hasVoditeljNalogaInBody ? parsedVoditeljNalog : null,
    );

    await request.query(
      `UPDATE nalozi
         SET naziv_naloga = COALESCE(@naziv_naloga, naziv_naloga),
           id_klijent = COALESCE(@id_klijent, id_klijent),
           pocetak_naloga = COALESCE(@pocetak_naloga, pocetak_naloga),
           izvrsiti_do = COALESCE(@Izvrsiti_do, izvrsiti_do),
           id_adresa = COALESCE(@id_adresa, id_adresa),
           materijal = COALESCE(@materijal, materijal),
           id_kontakt = COALESCE(@id_kontakt, id_kontakt),
           opis_posla = COALESCE(@opis_posla, opis_posla),
           status_naloga = COALESCE(@status_naloga, status_naloga),
           oprema = COALESCE(@oprema, oprema),
             id_voditelj_naloga = COALESCE(@id_voditelj_naloga, id_voditelj_naloga)
       WHERE id_nalog = @id_nalog;`,
    );

    if (hasIdRadniciInBody) {
      const deleteRequest = pool.request();
      deleteRequest.input("id_nalog", sql.Int, parsedNalogId);
      await deleteRequest.query(
        `DELETE FROM nalog_radnik
         WHERE id_nalog = @id_nalog;`,
      );

      const insertRequest = pool.request();
      insertRequest.input("id_nalog", sql.Int, parsedNalogId);

      const valuesSql = parsedRadnici
        .map((idRadnik, index) => {
          const paramName = `id_radnik_${index}`;
          insertRequest.input(paramName, sql.Int, idRadnik);
          return `(@id_nalog, @${paramName})`;
        })
        .join(",");

      await insertRequest.query(
        `INSERT INTO nalog_radnik (id_nalog, id_radnik)
         VALUES ${valuesSql};`,
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DB update error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.post("/putni-nalozi", async (req, res) => {
  const {
    id_nalog,
    pocetak_naloga,
    kraj_naloga,
    svrha_putovanja,
    id_radnici,
    actor_id_radnik,
  } = req.body;

  const parsedNalogId = parsePositiveInt(id_nalog);
  if (!parsedNalogId) {
    return res.status(400).json({ error: "id_nalog invalid" });
  }

  const parsedPocetakNaloga = parseDateOnlySqlInput(pocetak_naloga);
  const parsedKrajNaloga = parseDateOnlySqlInput(kraj_naloga);
  if (!parsedPocetakNaloga || !parsedKrajNaloga) {
    return res.status(400).json({ error: "Neispravan datum putovanja" });
  }

  const startDate = new Date(`${parsedPocetakNaloga}T00:00:00`);
  const endDate = new Date(`${parsedKrajNaloga}T00:00:00`);
  if (endDate < startDate) {
    return res
      .status(400)
      .json({ error: "Datum kraja mora biti nakon datuma početka" });
  }

  const parsedRadnici = Array.isArray(id_radnici)
    ? [...new Set(id_radnici.map(parsePositiveInt).filter(Boolean))]
    : [];

  if (!parsedRadnici.length) {
    return res.status(400).json({ error: "Odaberite najmanje jednog radnika" });
  }

  const trimmedSvrha = String(svrha_putovanja || "").trim();
  if (!trimmedSvrha) {
    return res.status(400).json({ error: "svrha_putovanja required" });
  }

  try {
    const pool = await poolPromise;

    const permissionCheck = await ensureCanManageNalog(pool, actor_id_radnik);
    if (!permissionCheck.ok) {
      return res
        .status(permissionCheck.status)
        .json({ error: permissionCheck.error });
    }

    const nalogRequest = pool.request();
    nalogRequest.input("id_nalog", sql.Int, parsedNalogId);
    const nalogResult = await nalogRequest.query(
      `SELECT TOP 1 id_nalog, naziv_naloga
       FROM nalozi
       WHERE id_nalog = @id_nalog;`,
    );

    if (!nalogResult.recordset?.length) {
      return res.status(404).json({ error: "Nalog nije pronađen" });
    }

    const restrictionRequest = pool.request();
    restrictionRequest.input("id_nalog", sql.Int, parsedNalogId);

    const radniciInClause = parsedRadnici
      .map((idValue, index) => {
        const paramName = `id_radnik_${index}`;
        restrictionRequest.input(paramName, sql.Int, idValue);
        return `@${paramName}`;
      })
      .join(",");

    const restrictionResult = await restrictionRequest.query(
      `SELECT
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM nalog_radnik nr
             WHERE nr.id_nalog = @id_nalog
           ) THEN 1 ELSE 0
         END AS has_restrictions,
         (
           SELECT COUNT(DISTINCT nr.id_radnik)
           FROM nalog_radnik nr
           WHERE nr.id_nalog = @id_nalog
             AND nr.id_radnik IN (${radniciInClause})
         ) AS matched_count;`,
    );

    const restrictionRow = restrictionResult.recordset?.[0] || {
      has_restrictions: 0,
      matched_count: 0,
    };

    if (
      Number(restrictionRow.has_restrictions) === 1 &&
      Number(restrictionRow.matched_count) !== parsedRadnici.length
    ) {
      return res.status(400).json({
        error: "Svi odabrani radnici moraju biti dodijeljeni na radni nalog",
      });
    }

    const usernamesRequest = pool.request();
    const usernamesInClause = parsedRadnici
      .map((idValue, index) => {
        const paramName = `id_radnik_username_${index}`;
        usernamesRequest.input(paramName, sql.Int, idValue);
        return `@${paramName}`;
      })
      .join(",");

    const usernamesResult = await usernamesRequest.query(
      `SELECT id_radnik, username
       FROM radnici
       WHERE id_radnik IN (${usernamesInClause});`,
    );

    const usernamesById = (usernamesResult.recordset || []).reduce(
      (acc, row) => {
        acc[String(row.id_radnik)] = String(row.username || "").trim();
        return acc;
      },
      {},
    );

    const createdDate = new Date();
    const createdDateTimePart = `${createdDate.getFullYear()}${String(
      createdDate.getMonth() + 1,
    ).padStart(
      2,
      "0",
    )}${String(createdDate.getDate()).padStart(2, "0")}${String(
      createdDate.getHours(),
    ).padStart(
      2,
      "0",
    )}${String(createdDate.getMinutes()).padStart(2, "0")}${String(
      createdDate.getSeconds(),
    ).padStart(2, "0")}`;

    const insertRequest = pool.request();
    insertRequest.input("id_nalog", sql.Int, parsedNalogId);
    insertRequest.input("pocetak_naloga", sql.Date, parsedPocetakNaloga);
    insertRequest.input("kraj_naloga", sql.Date, parsedKrajNaloga);
    insertRequest.input("svrha_putovanja", sql.NVarChar(sql.MAX), trimmedSvrha);
    insertRequest.input("kreiran_na_datum", sql.DateTime, createdDate);
    insertRequest.input("status", sql.NVarChar(20), "aktivan");

    const valuesSql = parsedRadnici
      .map((idRadnik, index) => {
        const idParamName = `id_radnik_insert_${index}`;
        const nazivParamName = `naziv_putnog_naloga_${index}`;
        const usernameRaw =
          usernamesById[String(idRadnik)] || `RADNIK_${idRadnik}`;
        const usernamePart = String(usernameRaw)
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9_]/g, "")
          .trim();
        const generatedNaziv =
          `${usernamePart || `RADNIK_${idRadnik}`}_${createdDateTimePart}`
            .slice(0, 50)
            .trim();

        insertRequest.input(idParamName, sql.Int, idRadnik);
        insertRequest.input(
          nazivParamName,
          sql.NVarChar(50),
          generatedNaziv || `RADNIK_${idRadnik}_${createdDateTimePart}`,
        );

        return `(@${nazivParamName}, @kreiran_na_datum, @pocetak_naloga, @kraj_naloga, @${idParamName}, @svrha_putovanja, @status, @id_nalog)`;
      })
      .join(",");

    await insertRequest.query(
      `INSERT INTO putni_nalozi (
         naziv_putnog_naloga,
         kreiran_na_datum,
         pocetak_naloga,
         kraj_naloga,
         id_radnika,
         svrha_putovanja,
         status,
         id_nalog
       )
       VALUES ${valuesSql};`,
    );

    return res
      .status(201)
      .json({ success: true, inserted_count: parsedRadnici.length });
  } catch (err) {
    console.error("Putni nalog insert error:", err);
    return res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.get("/putni-nalozi", async (req, res) => {
  const hasNalogFilter = Object.prototype.hasOwnProperty.call(
    req.query,
    "id_nalog",
  );
  const hasRadnikFilter = Object.prototype.hasOwnProperty.call(
    req.query,
    "id_radnik",
  );
  const parsedNalogId = hasNalogFilter
    ? parsePositiveInt(req.query.id_nalog)
    : null;
  const parsedRadnikId = hasRadnikFilter
    ? parsePositiveInt(req.query.id_radnik)
    : null;
  const parsedStatus = String(req.query.status || "")
    .trim()
    .toLowerCase();
  const statusFilter = parsedStatus || null;

  if (hasNalogFilter && !parsedNalogId) {
    return res.status(400).json({ error: "id_nalog invalid" });
  }

  if (hasRadnikFilter && !parsedRadnikId) {
    return res.status(400).json({ error: "id_radnik invalid" });
  }

  if (hasNalogFilter && hasRadnikFilter && !parsedNalogId && !parsedRadnikId) {
    return res.status(400).json({
      error: "id_nalog i id_radnik su obavezni",
    });
  }

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input("id_nalog", sql.Int, parsedNalogId);
    request.input("id_radnik", sql.Int, parsedRadnikId);
    request.input("status", sql.NVarChar(20), statusFilter);

    const result = await request.query(
      `SELECT pn.*, r.username AS radnik_username, r.ime, r.prezime
      FROM putni_nalozi pn
       LEFT JOIN radnici r ON r.id_radnik = pn.id_radnika
       WHERE (@id_nalog IS NULL OR pn.id_nalog = @id_nalog)
         AND (@id_radnik IS NULL OR pn.id_radnika = @id_radnik)
         AND (@status IS NULL OR LOWER(LTRIM(RTRIM(pn.status))) = @status)
       ORDER BY pn.pocetak_naloga DESC, pn.kraj_naloga DESC, pn.id_putnog_nalog DESC;`,
    );

    return res.json(result.recordset || []);
  } catch (err) {
    console.error("Putni nalozi fetch error:", err);
    return res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.put("/putni-nalozi/:id/zavrsi", async (req, res) => {
  const parsedPutniNalogId = parsePositiveInt(req.params.id);
  const {
    vrijeme_polaska,
    vrijeme_dolaska,
    trosak_spavanja,
    trosak_goriva,
    trosak_materijala,
    cestarina_trajekt,
    ostalo,
    actor_id_radnik,
  } = req.body;
  const parsedActorId = parsePositiveInt(actor_id_radnik);

  const parseCostAmount = (value) => {
    const normalized = String(value ?? "")
      .trim()
      .replace(",", ".");
    if (!normalized) return 0;

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return null;
    }

    return parsed;
  };

  if (!parsedPutniNalogId) {
    return res.status(400).json({ error: "id_putnog_nalog invalid" });
  }

  if (!parsedActorId) {
    return res.status(403).json({ error: "Nedozvoljeno" });
  }

  const polazakDateTime = parseDateTimeInput(vrijeme_polaska);
  const dolazakDateTime = parseDateTimeInput(vrijeme_dolaska);
  if (!polazakDateTime || !dolazakDateTime) {
    return res
      .status(400)
      .json({ error: "vrijeme_polaska i vrijeme_dolaska su obavezni" });
  }

  if (dolazakDateTime <= polazakDateTime) {
    return res
      .status(400)
      .json({ error: "Vrijeme dolaska mora biti nakon vremena polaska" });
  }

  const trosakSpavanjaValue = parseCostAmount(trosak_spavanja);
  const trosakGorivaValue = parseCostAmount(trosak_goriva);
  const trosakMaterijalaValue = parseCostAmount(trosak_materijala);
  const cestarinaTrajektValue = parseCostAmount(cestarina_trajekt);
  const ostaloValue = parseCostAmount(ostalo);

  if (
    [
      trosakSpavanjaValue,
      trosakGorivaValue,
      trosakMaterijalaValue,
      cestarinaTrajektValue,
      ostaloValue,
    ].some((value) => value === null)
  ) {
    return res
      .status(400)
      .json({ error: "Troškovi moraju biti brojevi veći ili jednaki 0" });
  }

  try {
    const pool = await poolPromise;
    const ownershipRequest = pool.request();
    ownershipRequest.input("id_putnog_nalog", sql.Int, parsedPutniNalogId);
    const ownershipResult = await ownershipRequest.query(
      `SELECT TOP 1 id_putnog_nalog, id_radnika, status
      FROM putni_nalozi
       WHERE id_putnog_nalog = @id_putnog_nalog;`,
    );

    const putniNalogRow = ownershipResult.recordset?.[0];
    if (!putniNalogRow) {
      return res.status(404).json({ error: "Putni nalog nije pronađen" });
    }

    if (Number(putniNalogRow.id_radnika) !== parsedActorId) {
      return res.status(403).json({
        error: "Možete završiti samo vlastiti putni nalog",
      });
    }

    const updateRequest = pool.request();
    updateRequest.input("id_putnog_nalog", sql.Int, parsedPutniNalogId);
    updateRequest.input("vrijeme_polaska", sql.DateTime, polazakDateTime);
    updateRequest.input("vrijeme_dolaska", sql.DateTime, dolazakDateTime);
    updateRequest.input("trosak_spavanja", sql.Float, trosakSpavanjaValue);
    updateRequest.input("trosak_goriva", sql.Float, trosakGorivaValue);
    updateRequest.input("trosak_materijala", sql.Float, trosakMaterijalaValue);
    updateRequest.input("cestarina_trajekt", sql.Float, cestarinaTrajektValue);
    updateRequest.input("ostalo", sql.Float, ostaloValue);
    updateRequest.input("status", sql.NVarChar(20), "izvršen");

    await updateRequest.query(
      `UPDATE putni_nalozi
       SET vrijeme_polaska = @vrijeme_polaska,
           vrijeme_dolaska = @vrijeme_dolaska,
           trosak_spavanja = @trosak_spavanja,
           trosak_goriva = @trosak_goriva,
           trosak_materijala = @trosak_materijala,
           cestarina_trajekt = @cestarina_trajekt,
           ostalo = @ostalo,
           status = @status
       WHERE id_putnog_nalog = @id_putnog_nalog;`,
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Putni nalog finish error:", err);
    return res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.get("/radni-dani", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(
      `SELECT rd.*, r.username AS radnik_username, r.ime, r.prezime,
              n.naziv_naloga AS nalog_naziv,
          COALESCE(a.adresa, CAST(n.id_adresa AS NVARCHAR(100))) AS lokacija_naziv
       FROM radni_dani rd
       LEFT JOIN radnici r ON r.id_radnik = rd.id_radnik
       LEFT JOIN nalozi n ON n.id_nalog = rd.id_nalog
        LEFT JOIN adrese a ON a.id_adresa = n.id_adresa`,
    );
    res.json(result.recordset);
  } catch (err) {
    console.error("DB fetch error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.post("/radni-dan", async (req, res) => {
  const {
    id_radnik,
    pocetak_rada,
    kraj_rada,
    polazak,
    dolazak,
    datum_rada,
    status_radnog_dana,
    dodatni_radovi,
    id_nalog,
    id_radnici_dodatni,
  } = req.body;

  const parsedIdRadnik = parsePositiveInt(id_radnik);
  const parsedIdNalog = parsePositiveInt(id_nalog);
  const normalizedStatusRadnogDana =
    String(status_radnog_dana || "")
      .trim()
      .toLowerCase() || "radni_dan";
  const isGodisnjiStatus =
    normalizedStatusRadnogDana === "godisnji" ||
    normalizedStatusRadnogDana === "godišnji";
  const isBolovanjeStatus = normalizedStatusRadnogDana === "bolovanje";
  const isOdsustvoStatus = isGodisnjiStatus || isBolovanjeStatus;

  const parsedDodatniRadnici = Array.isArray(id_radnici_dodatni)
    ? [
        ...new Set(
          id_radnici_dodatni
            .map(parsePositiveInt)
            .filter((id) => id && id !== parsedIdRadnik),
        ),
      ]
    : [];

  if (!parsedIdRadnik || !datum_rada)
    return res.status(400).json({ error: "Missing required fields" });

  if (
    !isOdsustvoStatus &&
    (!pocetak_rada || !kraj_rada || !polazak || !dolazak || !parsedIdNalog)
  )
    return res.status(400).json({ error: "Missing required fields" });

  const pocetakRadaSeconds = parseTimeToSeconds(pocetak_rada);
  const krajRadaSeconds = parseTimeToSeconds(kraj_rada);
  const polazakSeconds = parseTimeToSeconds(polazak);
  const dolazakSeconds = parseTimeToSeconds(dolazak);

  if (!isOdsustvoStatus) {
    if (
      pocetakRadaSeconds === null ||
      krajRadaSeconds === null ||
      polazakSeconds === null ||
      dolazakSeconds === null
    ) {
      return res.status(400).json({ error: "Neispravan format vremena" });
    }

    if (pocetakRadaSeconds >= krajRadaSeconds) {
      return res.status(400).json({
        error: "Početak rada mora biti prije kraja rada",
      });
    }

    if (polazakSeconds >= dolazakSeconds) {
      return res.status(400).json({
        error: "Polazak mora biti prije dolaska",
      });
    }
  }

  try {
    const pool = await poolPromise;
    const datumRadaSql = parseDateOnlySqlInput(datum_rada);
    if (!datumRadaSql) {
      return res.status(400).json({ error: "datum_rada invalid" });
    }

    if (isOdsustvoStatus) {
      const odsustvoConflictRequest = pool.request();
      odsustvoConflictRequest.input("id_radnik", sql.Int, parsedIdRadnik);
      odsustvoConflictRequest.input("datum_rada", sql.Date, datumRadaSql);

      const odsustvoConflictResult = await odsustvoConflictRequest.query(
        `SELECT TOP 1 id_radni_dan
         FROM radni_dani
         WHERE id_radnik = @id_radnik
           AND CAST(datum_rada AS DATE) = @datum_rada
           AND LOWER(LTRIM(RTRIM(status_radnog_dana))) = 'radni_dan';`,
      );

      if (odsustvoConflictResult.recordset?.length) {
        return res.status(409).json({
          error:
            "Za odabrani datum već postoji radni dan, nije moguće unijeti godišnji ili bolovanje",
        });
      }

      const odsustvoTekst = isBolovanjeStatus ? "bolovanje" : "godišnji";
      const odsustvoStatus = isBolovanjeStatus ? "bolovanje" : "godišnji";

      const odsustvoInsertRequest = pool.request();
      odsustvoInsertRequest.input("id_radnik", sql.Int, parsedIdRadnik);
      odsustvoInsertRequest.input("pocetak_rada", sql.Time(7), "00:00:00");
      odsustvoInsertRequest.input("kraj_rada", sql.Time(7), "00:00:00");
      odsustvoInsertRequest.input("polazak", sql.Time(7), "00:00:00");
      odsustvoInsertRequest.input("dolazak", sql.Time(7), "00:00:00");
      odsustvoInsertRequest.input("datum_rada", sql.Date, datumRadaSql);
      odsustvoInsertRequest.input(
        "status_radnog_dana",
        sql.NVarChar(20),
        odsustvoStatus,
      );
      odsustvoInsertRequest.input(
        "dodatni_radovi",
        sql.NVarChar(sql.MAX),
        odsustvoTekst,
      );
      odsustvoInsertRequest.input("id_nalog", sql.Int, -1);

      await odsustvoInsertRequest.query(
        `INSERT INTO radni_dani (id_radnik, pocetak_rada, kraj_rada, polazak, dolazak, datum_rada, status_radnog_dana, dodatni_radovi, id_nalog)
         VALUES (@id_radnik, @pocetak_rada, @kraj_rada, @polazak, @dolazak, @datum_rada, @status_radnog_dana, @dodatni_radovi, @id_nalog);`,
      );

      return res.status(201).json({ success: true, inserted_count: 1 });
    }

    const permissionCheckRequest = pool.request();
    permissionCheckRequest.input("id_nalog", sql.Int, parsedIdNalog);
    permissionCheckRequest.input("id_radnik", sql.Int, parsedIdRadnik);

    const permissionResult = await permissionCheckRequest.query(
      `SELECT
         n.id_voditelj_naloga AS voditelj_naloga,
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM nalog_radnik nr
             WHERE nr.id_nalog = @id_nalog
           ) THEN 1 ELSE 0
         END AS has_restrictions,
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM nalog_radnik nr
             WHERE nr.id_nalog = @id_nalog
               AND nr.id_radnik = @id_radnik
           ) THEN 1 ELSE 0
         END AS is_allowed
       FROM nalozi n
       WHERE n.id_nalog = @id_nalog;`,
    );

    const permissionRow = permissionResult.recordset?.[0] || {
      voditelj_naloga: null,
      has_restrictions: 0,
      is_allowed: 0,
    };

    if (!permissionResult.recordset?.[0]) {
      return res.status(404).json({ error: "Nalog nije pronađen" });
    }

    if (permissionRow.has_restrictions && !permissionRow.is_allowed) {
      return res.status(403).json({
        error: "Niste dodijeljeni na ovaj nalog",
      });
    }

    const isVoditelj =
      String(permissionRow.voditelj_naloga || "") === String(parsedIdRadnik);

    if (parsedDodatniRadnici.length > 0 && !isVoditelj) {
      return res.status(403).json({
        error: "Samo voditelj naloga može dodati dodatne radnike",
      });
    }

    if (parsedDodatniRadnici.length > 0 && permissionRow.has_restrictions) {
      const additionalCheckRequest = pool.request();
      additionalCheckRequest.input("id_nalog", sql.Int, parsedIdNalog);

      const inClause = parsedDodatniRadnici
        .map((idValue, index) => {
          const paramName = `id_radnik_${index}`;
          additionalCheckRequest.input(paramName, sql.Int, idValue);
          return `@${paramName}`;
        })
        .join(",");

      const additionalCheckResult = await additionalCheckRequest.query(
        `SELECT COUNT(DISTINCT nr.id_radnik) AS matched_count
         FROM nalog_radnik nr
         WHERE nr.id_nalog = @id_nalog
           AND nr.id_radnik IN (${inClause});`,
      );

      const matchedCount =
        Number(additionalCheckResult.recordset?.[0]?.matched_count) || 0;
      if (matchedCount !== parsedDodatniRadnici.length) {
        return res.status(400).json({
          error: "Svi dodatni radnici moraju biti dodijeljeni na ovaj nalog",
        });
      }
    }

    const targetRadnici = [parsedIdRadnik, ...parsedDodatniRadnici];

    const radniDanConflictRequest = pool.request();
    radniDanConflictRequest.input("datum_rada", sql.Date, datumRadaSql);

    const targetRadniciInClause = targetRadnici
      .map((radnikId, index) => {
        const paramName = `id_radnik_conflict_${index}`;
        radniDanConflictRequest.input(paramName, sql.Int, radnikId);
        return `@${paramName}`;
      })
      .join(",");

    const radniDanConflictResult = await radniDanConflictRequest.query(
      `SELECT TOP 1
         rd.id_radnik,
         rd.status_radnog_dana,
         COALESCE(
           NULLIF(LTRIM(RTRIM(CONCAT(r.ime, ' ', r.prezime))), ''),
           NULLIF(LTRIM(RTRIM(r.username)), ''),
           CONCAT('Radnik #', CAST(rd.id_radnik AS NVARCHAR(20)))
         ) AS radnik_label
       FROM radni_dani rd
       LEFT JOIN radnici r ON r.id_radnik = rd.id_radnik
       WHERE CAST(rd.datum_rada AS DATE) = @datum_rada
         AND rd.id_radnik IN (${targetRadniciInClause})
         AND LOWER(LTRIM(RTRIM(rd.status_radnog_dana))) IN ('godisnji', N'godišnji', 'bolovanje');`,
    );

    if (radniDanConflictResult.recordset?.length) {
      const conflictRow = radniDanConflictResult.recordset[0];
      const normalizedConflictStatus = String(
        conflictRow?.status_radnog_dana || "",
      )
        .trim()
        .toLowerCase();
      const conflictStatusLabel =
        normalizedConflictStatus === "bolovanje" ? "bolovanje" : "godišnji";
      return res.status(409).json({
        error: `Radnik ${conflictRow?.radnik_label || conflictRow?.id_radnik} je već evidentiran kao ${conflictStatusLabel} na odabrani datum i ne može imati radni dan`,
      });
    }

    const overlapCheckRequest = pool.request();
    overlapCheckRequest.input("datum_rada", sql.Date, datumRadaSql);

    const targetRadniciOverlapInClause = targetRadnici
      .map((radnikId, index) => {
        const paramName = `id_radnik_overlap_${index}`;
        overlapCheckRequest.input(paramName, sql.Int, radnikId);
        return `@${paramName}`;
      })
      .join(",");

    const overlapRowsResult = await overlapCheckRequest.query(
      `SELECT rd.id_radnik,
              rd.pocetak_rada,
              rd.kraj_rada,
              COALESCE(
                NULLIF(LTRIM(RTRIM(CONCAT(r.ime, ' ', r.prezime))), ''),
                NULLIF(LTRIM(RTRIM(r.username)), ''),
                CONCAT('Radnik #', CAST(rd.id_radnik AS NVARCHAR(20)))
              ) AS radnik_label
       FROM radni_dani rd
       LEFT JOIN radnici r ON r.id_radnik = rd.id_radnik
       WHERE CAST(rd.datum_rada AS DATE) = @datum_rada
         AND rd.id_radnik IN (${targetRadniciOverlapInClause})
         AND LOWER(LTRIM(RTRIM(rd.status_radnog_dana))) = 'radni_dan';`,
    );

    const overlapRow = (overlapRowsResult.recordset || []).find((row) => {
      const existingStart = parseTimeToSeconds(row.pocetak_rada);
      const existingEnd = parseTimeToSeconds(row.kraj_rada);
      if (existingStart === null || existingEnd === null) return false;
      if (existingStart >= existingEnd) return false;

      return (
        pocetakRadaSeconds < existingEnd && krajRadaSeconds > existingStart
      );
    });

    if (overlapRow) {
      return res.status(409).json({
        error: `Radnik ${overlapRow?.radnik_label || overlapRow?.id_radnik} već ima unos za isti datum u preklapajućem vremenskom intervalu`,
      });
    }

    const insertRequest = pool.request();
    insertRequest.input("pocetak_rada", sql.Time(7), pocetak_rada);
    insertRequest.input("kraj_rada", sql.Time(7), kraj_rada);
    insertRequest.input("polazak", sql.Time(7), polazak);
    insertRequest.input("dolazak", sql.Time(7), dolazak);
    insertRequest.input("datum_rada", sql.Date, datumRadaSql);
    insertRequest.input(
      "dodatni_radovi",
      sql.NVarChar(sql.MAX),
      dodatni_radovi || null,
    );
    insertRequest.input(
      "status_radnog_dana",
      sql.NVarChar(20),
      normalizedStatusRadnogDana,
    );
    insertRequest.input("id_nalog", sql.Int, parsedIdNalog);

    const valuesSql = targetRadnici
      .map((radnikId, index) => {
        const paramName = `id_radnik_insert_${index}`;
        insertRequest.input(paramName, sql.Int, radnikId);
        return `(@${paramName},@pocetak_rada,@kraj_rada,@polazak,@dolazak,@datum_rada,@status_radnog_dana,@dodatni_radovi,@id_nalog)`;
      })
      .join(",");

    await insertRequest.query(
      `INSERT INTO radni_dani (id_radnik, pocetak_rada, kraj_rada, polazak, dolazak, datum_rada, status_radnog_dana, dodatni_radovi, id_nalog)
       VALUES ${valuesSql};`,
    );

    res
      .status(201)
      .json({ success: true, inserted_count: targetRadnici.length });
  } catch (err) {
    console.error("DB insert error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.get("/klijenti", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM klijenti");
    res.json(result.recordset);
  } catch (err) {
    console.error("DB fetch error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.post("/klijenti", async (req, res) => {
  const { naziv_klijenta, sjedište, sjediste } = req.body;
  if (!naziv_klijenta)
    return res.status(400).json({ error: "naziv_klijenta required" });
  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input("naziv_klijenta", sql.NVarChar(100), naziv_klijenta);
    request.input("sjediste", sql.NVarChar(64), sjedište || sjediste || null);

    await request.query(
      `INSERT INTO klijenti (naziv_klijenta, [sjedište]) VALUES (@naziv_klijenta, @sjediste);`,
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("DB insert error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.put("/klijenti/:id", async (req, res) => {
  const { id } = req.params;
  const { naziv_klijenta, sjedište, sjediste } = req.body;
  if (!naziv_klijenta)
    return res.status(400).json({ error: "naziv_klijenta required" });
  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input("id_klijent", sql.Int, parseInt(id));
    request.input("naziv_klijenta", sql.NVarChar(100), naziv_klijenta);
    request.input("sjediste", sql.NVarChar(64), sjedište || sjediste || null);

    await request.query(
      `UPDATE klijenti SET naziv_klijenta = @naziv_klijenta, [sjedište] = @sjediste WHERE id_klijent = @id_klijent;`,
    );

    res.json({ success: true });
  } catch (err) {
    console.error("DB update error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.delete("/klijenti/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input("id_klijent", sql.Int, parseInt(id));

    await request.query(`DELETE FROM klijenti WHERE id_klijent = @id_klijent;`);

    res.json({ success: true });
  } catch (err) {
    console.error("DB delete error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.get("/kontakti", async (req, res) => {
  const idKlijentFilter = parsePositiveInt(req.query.id_klijent);

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input("id_klijent", sql.Int, idKlijentFilter);

    const result = await request.query(
      `SELECT *
       FROM kontakti
       WHERE @id_klijent IS NULL OR id_klijent = @id_klijent
       ORDER BY naziv;`,
    );

    res.json(result.recordset);
  } catch (err) {
    console.error("DB fetch error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.post("/kontakti", async (req, res) => {
  const { naziv, id_klijent, telefonski_broj } = req.body;
  const parsedKlijent = parsePositiveInt(id_klijent);
  const normalizedTelefon = String(telefonski_broj || "").trim();

  if (!String(naziv || "").trim() || !parsedKlijent) {
    return res.status(400).json({ error: "naziv i id_klijent su obavezni" });
  }

  if (!isValidTelefon(normalizedTelefon)) {
    return res.status(400).json({
      error:
        "telefonski_broj je neispravan (dozvoljeni su +, brojevi, razmak i -; max 20)",
    });
  }

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input("naziv", sql.NVarChar(64), String(naziv).trim());
    request.input("id_klijent", sql.Int, parsedKlijent);
    request.input(
      "telefonski_broj",
      sql.NVarChar(20),
      normalizedTelefon || null,
    );

    await request.query(
      `INSERT INTO kontakti (naziv, id_klijent, telefonski_broj)
       VALUES (@naziv, @id_klijent, @telefonski_broj);`,
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("DB insert error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.put("/kontakti/:id", async (req, res) => {
  const { id } = req.params;
  const parsedKontaktId = parsePositiveInt(id);
  const { naziv, id_klijent, telefonski_broj } = req.body;
  const parsedKlijent = parsePositiveInt(id_klijent);
  const normalizedTelefon = String(telefonski_broj || "").trim();

  if (!parsedKontaktId) {
    return res.status(400).json({ error: "id_kontakt invalid" });
  }

  if (!String(naziv || "").trim() || !parsedKlijent) {
    return res.status(400).json({ error: "naziv i id_klijent su obavezni" });
  }

  if (!isValidTelefon(normalizedTelefon)) {
    return res.status(400).json({
      error:
        "telefonski_broj je neispravan (dozvoljeni su +, brojevi, razmak i -; max 20)",
    });
  }

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input("id_kontakt", sql.Int, parsedKontaktId);
    request.input("naziv", sql.NVarChar(64), String(naziv).trim());
    request.input("id_klijent", sql.Int, parsedKlijent);
    request.input(
      "telefonski_broj",
      sql.NVarChar(20),
      normalizedTelefon || null,
    );

    await request.query(
      `UPDATE kontakti
       SET naziv = @naziv,
           id_klijent = @id_klijent,
           telefonski_broj = @telefonski_broj
       WHERE id_kontakt = @id_kontakt;`,
    );

    res.json({ success: true });
  } catch (err) {
    console.error("DB update error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.delete("/kontakti/:id", async (req, res) => {
  const { id } = req.params;
  const parsedKontaktId = parsePositiveInt(id);

  if (!parsedKontaktId) {
    return res.status(400).json({ error: "id_kontakt invalid" });
  }

  try {
    const pool = await poolPromise;
    const checkRequest = pool.request();
    checkRequest.input("id_kontakt", sql.Int, parsedKontaktId);

    const usageResult = await checkRequest.query(
      `SELECT COUNT(1) AS usage_count
       FROM nalozi
       WHERE id_kontakt = @id_kontakt;`,
    );

    const usageCount = Number(usageResult.recordset?.[0]?.usage_count) || 0;
    if (usageCount > 0) {
      return res.status(400).json({
        error:
          "Kontakt nije moguće obrisati jer je povezan sa postojećim nalozima",
      });
    }

    const deleteRequest = pool.request();
    deleteRequest.input("id_kontakt", sql.Int, parsedKontaktId);

    await deleteRequest.query(
      `DELETE FROM kontakti
       WHERE id_kontakt = @id_kontakt;`,
    );

    res.json({ success: true });
  } catch (err) {
    console.error("DB delete error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.get("/adrese", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM adrese");
    res.json(result.recordset);
  } catch (err) {
    console.error("DB fetch error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.post("/adrese", async (req, res) => {
  const { adresa, id_klijent, dnevnica } = req.body;
  const normalizedDnevnicaRaw = String(dnevnica || "")
    .trim()
    .toLowerCase();
  const normalizedDnevnica =
    normalizedDnevnicaRaw === "2" ||
    normalizedDnevnicaRaw === "van_drzave" ||
    normalizedDnevnicaRaw === "van države"
      ? "van_drzave"
      : normalizedDnevnicaRaw === "1" ||
          normalizedDnevnicaRaw === "van_zupanije"
        ? "van_zupanije"
        : normalizedDnevnicaRaw === "0" ||
            normalizedDnevnicaRaw === "unutar_zupanije"
          ? "unutar_zupanije"
          : "";
  if (!adresa || !id_klijent)
    return res.status(400).json({ error: "adresa and id_klijent required" });
  if (!normalizedDnevnica)
    return res.status(400).json({
      error: "dnevnica mora biti unutar_zupanije, van_zupanije ili van_drzave",
    });
  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input("adresa", sql.NVarChar(100), adresa);
    request.input("id_klijent", sql.Int, id_klijent);
    request.input("dnevnica", sql.NVarChar(20), normalizedDnevnica);

    await request.query(
      `INSERT INTO adrese (adresa, id_klijent, dnevnica) VALUES (@adresa, @id_klijent, @dnevnica);`,
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("DB insert error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.put("/adrese/:id", async (req, res) => {
  const { id } = req.params;
  const { adresa, id_klijent, dnevnica } = req.body;
  const normalizedDnevnicaRaw = String(dnevnica || "")
    .trim()
    .toLowerCase();
  const normalizedDnevnica =
    normalizedDnevnicaRaw === "2" ||
    normalizedDnevnicaRaw === "van_drzave" ||
    normalizedDnevnicaRaw === "van države"
      ? "van_drzave"
      : normalizedDnevnicaRaw === "1" ||
          normalizedDnevnicaRaw === "van_zupanije"
        ? "van_zupanije"
        : normalizedDnevnicaRaw === "0" ||
            normalizedDnevnicaRaw === "unutar_zupanije"
          ? "unutar_zupanije"
          : "";
  if (!adresa || !id_klijent)
    return res.status(400).json({ error: "adresa and id_klijent required" });
  if (!normalizedDnevnica)
    return res.status(400).json({
      error: "dnevnica mora biti unutar_zupanije, van_zupanije ili van_drzave",
    });
  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input("id_adresa", sql.Int, parseInt(id));
    request.input("adresa", sql.NVarChar(100), adresa);
    request.input("id_klijent", sql.Int, id_klijent);
    request.input("dnevnica", sql.NVarChar(20), normalizedDnevnica);

    await request.query(
      `UPDATE adrese SET adresa = @adresa, id_klijent = @id_klijent, dnevnica = @dnevnica WHERE id_adresa = @id_adresa;`,
    );

    res.json({ success: true });
  } catch (err) {
    console.error("DB update error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.delete("/adrese/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input("id_adresa", sql.Int, parseInt(id));

    await request.query(`DELETE FROM adrese WHERE id_adresa = @id_adresa;`);

    res.json({ success: true });
  } catch (err) {
    console.error("DB delete error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.get("/radnici", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM radnici");
    res.json(result.recordset);
  } catch (err) {
    console.error("DB fetch error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.post("/radnici", async (req, res) => {
  const { username, ime, prezime, zanimanje, oib, email, hash_password, role } =
    req.body;
  if (
    !username ||
    !ime ||
    !prezime ||
    !zanimanje ||
    !oib ||
    !email ||
    !hash_password ||
    !role
  )
    return res.status(400).json({ error: "All fields required" });
  if (!isValidOib(oib)) {
    return res
      .status(400)
      .json({ error: "OIB mora imati između 1 i 20 znamenki" });
  }
  try {
    const pool = await poolPromise;
    const request = pool.request();
    const hashedPassword = hashPasswordForStorage(hash_password);

    request.input("username", sql.NVarChar(50), username);
    request.input("ime", sql.NVarChar(50), ime);
    request.input("prezime", sql.NVarChar(50), prezime);
    request.input("zanimanje", sql.NVarChar(100), zanimanje);
    request.input("oib", sql.NVarChar(20), oib);
    request.input("email", sql.NVarChar(100), email);
    request.input("hash_password", sql.NVarChar(64), hashedPassword);
    request.input("role", sql.NVarChar(50), role);

    await request.query(
      `INSERT INTO radnici (username, ime, prezime, zanimanje, oib, email, hash_password, role) 
       VALUES (@username, @ime, @prezime, @zanimanje, @oib, @email, @hash_password, @role);`,
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("DB insert error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.put("/radnici/:id", async (req, res) => {
  const { id } = req.params;
  const { username, ime, prezime, zanimanje, oib, email, role } = req.body;
  if (!username || !ime || !prezime || !zanimanje || !oib || !email || !role)
    return res.status(400).json({ error: "All fields required" });
  if (!isValidOib(oib)) {
    return res
      .status(400)
      .json({ error: "OIB mora imati između 1 i 20 znamenki" });
  }
  try {
    const pool = await poolPromise;
    const request = pool.request();

    request.input("id_radnik", sql.Int, parseInt(id));
    request.input("username", sql.NVarChar(50), username);
    request.input("ime", sql.NVarChar(50), ime);
    request.input("prezime", sql.NVarChar(50), prezime);
    request.input("zanimanje", sql.NVarChar(100), zanimanje);
    request.input("oib", sql.NVarChar(20), oib);
    request.input("email", sql.NVarChar(100), email);
    request.input("role", sql.NVarChar(50), role);

    await request.query(
      `UPDATE radnici SET username = @username, ime = @ime, prezime = @prezime, zanimanje = @zanimanje, oib = @oib, email = @email, role = @role 
       WHERE id_radnik = @id_radnik;`,
    );

    res.json({ success: true });
  } catch (err) {
    console.error("DB update error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.delete("/radnici/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input("id_radnik", sql.Int, parseInt(id));

    await request.query(`DELETE FROM radnici WHERE id_radnik = @id_radnik;`);

    res.json({ success: true });
  } catch (err) {
    console.error("DB delete error:", err);
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.get("/tvrtka", async (req, res) => {
  try {
    const pool = await poolPromise;
    const request = pool.request();
    const result = await request.query(
      `SELECT TOP 1 ID_tvrtke, naziv_tvrtke, adresa, postanski_broj, OIB
       FROM tvrtke
       ORDER BY ID_tvrtke ASC;`,
    );

    const row = result.recordset?.[0];
    if (!row) {
      const normalizedDefault = normalizePoslodavacSettings(POSLODAVAC_DEFAULT);
      return res.json({
        id_tvrtke: null,
        naziv: normalizedDefault.naziv,
        adresa: normalizedDefault.adresa,
        postanski_broj: normalizedDefault.postanskiBroj,
        jeHrvatska: normalizedDefault.jeHrvatska,
        oib: normalizedDefault.oib,
      });
    }

    const normalized = normalizePoslodavacSettings({
      naziv: row.naziv_tvrtke,
      adresa: row.adresa,
      postanski_broj: row.postanski_broj,
      oib: row.OIB,
    });

    return res.json({
      id_tvrtke: row.ID_tvrtke,
      naziv: normalized.naziv,
      adresa: normalized.adresa,
      postanski_broj: normalized.postanskiBroj,
      jeHrvatska: normalized.jeHrvatska,
      oib: normalized.oib,
    });
  } catch (err) {
    console.error("DB fetch tvrtka error:", err);
    return res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.put("/tvrtka", async (req, res) => {
  const { naziv, adresa, postanski_broj, jeHrvatska, oib } = req.body;

  if (!naziv || !adresa || !postanski_broj) {
    return res
      .status(400)
      .json({ error: "Naziv, adresa i poštanski broj su obavezni" });
  }

  if (!isValidPostanskiBroj(postanski_broj)) {
    return res.status(400).json({ error: "Poštanski broj nije ispravan" });
  }

  const normalizedJeHrvatska = parseBooleanFlag(jeHrvatska, true);
  const normalizedOib = normalizedJeHrvatska ? String(oib || "").trim() : "N/A";
  if (normalizedJeHrvatska && !isValidOib(normalizedOib)) {
    return res
      .status(400)
      .json({ error: "OIB mora imati između 1 i 20 znamenki" });
  }

  try {
    const pool = await poolPromise;
    const findRequest = pool.request();
    const findResult = await findRequest.query(
      `SELECT TOP 1 ID_tvrtke
       FROM tvrtke
       ORDER BY ID_tvrtke ASC;`,
    );

    const existingId = findResult.recordset?.[0]?.ID_tvrtke;

    if (existingId) {
      const updateRequest = pool.request();
      updateRequest.input("ID_tvrtke", sql.Int, existingId);
      updateRequest.input(
        "naziv_tvrtke",
        sql.NVarChar(50),
        String(naziv).trim(),
      );
      updateRequest.input("adresa", sql.NVarChar(50), String(adresa).trim());
      updateRequest.input(
        "postanski_broj",
        sql.NVarChar(20),
        String(postanski_broj).trim(),
      );
      updateRequest.input("OIB", sql.NVarChar(20), normalizedOib || "N/A");

      await updateRequest.query(
        `UPDATE tvrtke
         SET naziv_tvrtke = @naziv_tvrtke,
             adresa = @adresa,
             postanski_broj = @postanski_broj,
             OIB = @OIB
         WHERE ID_tvrtke = @ID_tvrtke;`,
      );
    } else {
      const insertRequest = pool.request();
      insertRequest.input(
        "naziv_tvrtke",
        sql.NVarChar(50),
        String(naziv).trim(),
      );
      insertRequest.input("adresa", sql.NVarChar(50), String(adresa).trim());
      insertRequest.input(
        "postanski_broj",
        sql.NVarChar(20),
        String(postanski_broj).trim(),
      );
      insertRequest.input("OIB", sql.NVarChar(20), normalizedOib || "N/A");

      await insertRequest.query(
        `INSERT INTO tvrtke (naziv_tvrtke, adresa, postanski_broj, OIB)
         VALUES (@naziv_tvrtke, @adresa, @postanski_broj, @OIB);`,
      );
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("DB upsert tvrtka error:", err);
    return res.status(500).json({ error: "db_error", details: err.message });
  }
});

poolPromise
  .then(() => {
    app.listen(3000, () => {
      console.log("🚀 Server running on port 3000");
    });
  })
  .catch((err) => {
    console.error("Server failed to start due to DB error", err);
    process.exit(1);
  });
