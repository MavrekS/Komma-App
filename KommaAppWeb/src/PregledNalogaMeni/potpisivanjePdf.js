import jsPDF from "jspdf";
import { saveNalogPdfToFolder } from "../services/dokumentiApi";

const PDF_FONT_FAMILY = "NotoSans";
const PDF_FONT_REGULAR_FILE = "NotoSans-Regular.ttf";
const PDF_FONT_BOLD_FILE = "NotoSans-Bold.ttf";
const PDF_FONT_REGULAR_URL = "/fonts/NotoSans-Regular.ttf";
const PDF_FONT_BOLD_URL = "/fonts/NotoSans-Bold.ttf";

let pdfFontRegularBase64 = null;
let pdfFontBoldBase64 = null;

const arrayBufferToBase64 = (arrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
};

const loadFontBase64 = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Neuspjesno ucitavanje fonta: ${url}`);
  }

  const buffer = await response.arrayBuffer();
  return arrayBufferToBase64(buffer);
};

const ensureUnicodePdfFont = async (doc) => {
  if (!pdfFontRegularBase64) {
    pdfFontRegularBase64 = await loadFontBase64(PDF_FONT_REGULAR_URL);
  }

  if (!pdfFontBoldBase64) {
    pdfFontBoldBase64 = await loadFontBase64(PDF_FONT_BOLD_URL);
  }

  doc.addFileToVFS(PDF_FONT_REGULAR_FILE, pdfFontRegularBase64);
  doc.addFont(PDF_FONT_REGULAR_FILE, PDF_FONT_FAMILY, "normal");
  doc.addFileToVFS(PDF_FONT_BOLD_FILE, pdfFontBoldBase64);
  doc.addFont(PDF_FONT_BOLD_FILE, PDF_FONT_FAMILY, "bold");
  doc.setFont(PDF_FONT_FAMILY, "normal");
};

const savePdfToNaloziFolder = async (doc, fileName) => {
  const arrayBuffer = doc.output("arraybuffer");
  const contentBase64 = arrayBufferToBase64(arrayBuffer);

  return saveNalogPdfToFolder({
    fileName,
    contentBase64,
  });
};

const toPdfText = (value) =>
  String(value ?? "")
    .replace(/đ/g, "dj")
    .replace(/Đ/g, "Dj")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const formatDateTimeForPdf = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString("hr-HR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCostForPdf = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return "0";
  return parsed.toLocaleString("hr-HR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const createPdfText = (supportsUnicodePdf) => (value) =>
  supportsUnicodePdf ? String(value ?? "") : toPdfText(value);

export const createRadniNalogPdf = async ({
  nalog,
  options = {},
  poslodavac,
  resolveKlijentDetails,
  getNalogSummaryForPdf,
  resolveKontaktNaziv,
  resolveKontaktTelefon,
  resolveAdresaNaziv,
  formatDate,
}) => {
  const { customerSignatureDataUrl = null } = options;
  const doc = new jsPDF();
  let supportsUnicodePdf = true;
  try {
    await ensureUnicodePdfFont(doc);
  } catch {
    supportsUnicodePdf = false;
  }
  const pdfText = createPdfText(supportsUnicodePdf);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 16;

  const klijentDetails = resolveKlijentDetails(nalog);
  const summary = getNalogSummaryForPdf(nalog);
  const createdDate = new Date(nalog?.kreiran_na_datum);
  const validCreatedDate = Number.isNaN(createdDate.getTime())
    ? new Date()
    : createdDate;
  const radniNalogBroj = `RN-${validCreatedDate.getFullYear()}-${String(Number(nalog?.id_nalog) || 0).padStart(4, "0")}`;

  const drawPageFrame = () => {
    doc.setDrawColor(120);
    doc.rect(margin - 4, 10, contentWidth + 8, pageHeight - 20);
  };

  const ensureSpace = (minSpace = 26) => {
    if (cursorY <= pageHeight - minSpace) return;
    doc.addPage();
    drawPageFrame();
    cursorY = 20;
  };

  const drawSectionTitle = (title) => {
    ensureSpace(20);
    doc.setFont(supportsUnicodePdf ? PDF_FONT_FAMILY : "helvetica", "bold");
    doc.setFontSize(11);
    doc.text(pdfText(title), margin + 2, cursorY);
    cursorY += 4;
  };

  const drawField = (label, value) => {
    ensureSpace(16);
    doc.setFont(supportsUnicodePdf ? PDF_FONT_FAMILY : "helvetica", "bold");
    doc.setFontSize(10);
    doc.text(pdfText(`${label}:`), margin + 2, cursorY);
    doc.setFont(supportsUnicodePdf ? PDF_FONT_FAMILY : "helvetica", "normal");
    const wrapped = doc.splitTextToSize(
      pdfText(value || "N/A"),
      contentWidth - 54,
    );
    doc.text(wrapped, margin + 50, cursorY);
    cursorY += Math.max(5, wrapped.length * 4.6);
  };

  drawPageFrame();
  doc.setFont(supportsUnicodePdf ? PDF_FONT_FAMILY : "helvetica", "bold");
  doc.setFontSize(17);
  doc.text(pdfText("RADNI NALOG"), pageWidth / 2, cursorY, { align: "center" });
  cursorY += 8;

  doc.setFont(supportsUnicodePdf ? PDF_FONT_FAMILY : "helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    pdfText(`Naziv naloga: ${nalog.naziv_naloga || "N/A"}`),
    margin,
    cursorY,
  );
  doc.text(
    pdfText(`Broj radnog naloga: ${radniNalogBroj}`),
    pageWidth - margin,
    cursorY,
    {
      align: "right",
    },
  );
  cursorY += 5;
  doc.text(
    pdfText(`Datum kreiranja: ${formatDate(nalog.kreiran_na_datum)}`),
    pageWidth - margin,
    cursorY,
    {
      align: "right",
    },
  );
  cursorY += 5;
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 7;

  drawSectionTitle("1. Podaci o poslodavcu");
  drawField("Naziv firme", poslodavac.naziv);
  drawField("Adresa", poslodavac.adresa);
  if (poslodavac.jeHrvatska) {
    drawField("OIB", poslodavac.oib);
  }
  cursorY += 2;

  drawSectionTitle("2. Podaci o narucitelju");
  drawField("Naziv firme", klijentDetails.naziv || "N/A");
  drawField("Adresa firme", klijentDetails.adresa || "N/A");
  drawField("OIB narucitelja", klijentDetails.oib || "N/A");
  drawField("Kontakt osoba", resolveKontaktNaziv(nalog));
  drawField("Telefon kontakta", resolveKontaktTelefon(nalog));
  cursorY += 2;

  drawSectionTitle("3. Podaci o radovima");
  drawField("Lokacija rada", resolveAdresaNaziv(nalog));
  drawField("Popis radnika", summary.workerList);
  drawField("Utroseni sati", summary.totalHoursLabel);
  drawField("Materijal", nalog.materijal || "N/A");
  drawField("Oprema", nalog.oprema || "N/A");
  drawField("Opis rada", nalog.opis_posla || "N/A");
  drawField("Status naloga", nalog.status_naloga || "aktivan");
  if (summary.isSingleDay) {
    drawField("Pocetak rada", summary.pocetakRada);
    drawField("Kraj rada", summary.krajRada);
  } else {
    drawField("Broj dolazaka", summary.arrivalCount);
  }

  const signatureTopY = pageHeight - 44;
  if (cursorY > signatureTopY - 6) {
    doc.addPage();
    drawPageFrame();
    doc.setFont(supportsUnicodePdf ? PDF_FONT_FAMILY : "helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(pdfText("Nastavak radnog naloga"), margin, 20);
  }

  doc.setFont(supportsUnicodePdf ? PDF_FONT_FAMILY : "helvetica", "normal");
  doc.setFontSize(10);
  const signatureLineWidth = 92;
  const signatureLineX = pageWidth - margin - signatureLineWidth;
  doc.line(
    signatureLineX,
    signatureTopY + 10,
    signatureLineX + signatureLineWidth,
    signatureTopY + 10,
  );

  if (customerSignatureDataUrl) {
    try {
      doc.addImage(
        customerSignatureDataUrl,
        "PNG",
        signatureLineX + 4,
        signatureTopY - 5,
        signatureLineWidth - 8,
        13,
      );
    } catch {}
  }

  doc.setFontSize(8.5);
  doc.text(
    pdfText("(potpis narucitelja)"),
    signatureLineX + signatureLineWidth / 2,
    signatureTopY + 14,
    {
      align: "center",
    },
  );

  const safeName = String(nalog.naziv_naloga || `nalog-${nalog.id_nalog}`)
    .replace(/[^a-z0-9-_]/gi, "_")
    .toLowerCase();

  const fileName = `radni_nalog_${safeName}.pdf`;
  const saveResult = await savePdfToNaloziFolder(doc, fileName);
  if (!saveResult?.ok) {
    window.alert(
      `Upozorenje: PDF nije spremljen u C:\\Nalozi (${saveResult?.error || "nepoznata greska"})`,
    );
  }

  doc.save(pdfText(fileName));
};

export const createPutniNalogPdf = async ({
  nalog,
  putniNalogRow,
  radniciItems,
  poslodavac,
  resolveAdresaNaziv,
  getPutniNalogBroj,
  formatDateOnly,
  toDateOnlyString,
}) => {
  if (!nalog || !putniNalogRow) return;

  const putniRadnik = radniciItems.find(
    (item) => Number(item.id_radnik) === Number(putniNalogRow.id_radnika),
  );
  const imePrezime = [putniRadnik?.ime, putniRadnik?.prezime]
    .filter(Boolean)
    .join(" ")
    .trim();
  const zaposlenikNaziv =
    imePrezime || putniRadnik?.username || `ID ${putniNalogRow.id_radnika}`;
  const zaposlenikOib = putniRadnik?.oib ? String(putniRadnik.oib) : "N/A";
  const odrediste = resolveAdresaNaziv(nalog);
  const putniNalogBroj = String(
    putniNalogRow.naziv_putnog_naloga || getPutniNalogBroj(putniRadnik || {}),
  );

  const doc = new jsPDF();
  let supportsUnicodePdf = true;
  try {
    await ensureUnicodePdfFont(doc);
  } catch {
    supportsUnicodePdf = false;
  }
  const pdfText = createPdfText(supportsUnicodePdf);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 16;

  const drawSectionTitle = (title) => {
    doc.setFont(supportsUnicodePdf ? PDF_FONT_FAMILY : "helvetica", "bold");
    doc.setFontSize(11);
    doc.text(pdfText(title), margin + 2, cursorY);
    cursorY += 4;
  };

  const drawField = (label, value) => {
    doc.setFont(supportsUnicodePdf ? PDF_FONT_FAMILY : "helvetica", "bold");
    doc.setFontSize(10);
    doc.text(pdfText(`${label}:`), margin + 2, cursorY);
    doc.setFont(supportsUnicodePdf ? PDF_FONT_FAMILY : "helvetica", "normal");
    const text = pdfText(value || "N/A");
    const wrapped = doc.splitTextToSize(text, contentWidth - 50);
    doc.text(wrapped, margin + 44, cursorY);
    cursorY += Math.max(5, wrapped.length * 4.6);
  };

  doc.setDrawColor(120);
  doc.rect(margin - 4, 10, contentWidth + 8, pageHeight - 20);

  doc.setFont(supportsUnicodePdf ? PDF_FONT_FAMILY : "helvetica", "bold");
  doc.setFontSize(17);
  doc.text(pdfText("PUTNI NALOG"), pageWidth / 2, cursorY, { align: "center" });
  cursorY += 8;

  doc.setFont(supportsUnicodePdf ? PDF_FONT_FAMILY : "helvetica", "normal");
  doc.setFontSize(10);
  doc.text(pdfText(`Naziv: ${putniNalogBroj}`), margin, cursorY);
  doc.text(
    pdfText(
      `Datum izdavanja: ${formatDateOnly(toDateOnlyString(putniNalogRow.pocetak_naloga))}`,
    ),
    pageWidth - margin,
    cursorY,
    { align: "right" },
  );
  cursorY += 5;
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 7;

  drawSectionTitle("1. Podaci o poslodavcu");
  drawField("Naziv firme", poslodavac.naziv);
  drawField("Adresa sjedista", poslodavac.adresa);
  if (poslodavac.jeHrvatska) {
    drawField("OIB", poslodavac.oib);
  }
  cursorY += 2;

  drawSectionTitle("2. Podaci o zaposleniku");
  drawField("Ime i prezime", zaposlenikNaziv);
  drawField("Radno mjesto", putniRadnik?.zanimanje || "N/A");
  drawField("OIB zaposlenika", zaposlenikOib);
  cursorY += 2;

  drawSectionTitle("3. Podaci o putovanju");
  drawField("Mjesto polaska", poslodavac.adresa || "N/A");
  drawField("Odrediste", odrediste || "N/A");
  drawField("Svrha putovanja", putniNalogRow.svrha_putovanja || "N/A");
  drawField(
    "Datum polaska",
    formatDateOnly(toDateOnlyString(putniNalogRow.pocetak_naloga)),
  );
  drawField(
    "Datum povratka",
    formatDateOnly(toDateOnlyString(putniNalogRow.kraj_naloga)),
  );
  drawField(
    "Vrijeme polaska",
    formatDateTimeForPdf(putniNalogRow.vrijeme_polaska),
  );
  drawField(
    "Vrijeme dolaska",
    formatDateTimeForPdf(putniNalogRow.vrijeme_dolaska),
  );
  drawField("Trosak spavanja", formatCostForPdf(putniNalogRow.trosak_spavanja));
  drawField("Trosak goriva", formatCostForPdf(putniNalogRow.trosak_goriva));
  drawField(
    "Trosak materijala",
    formatCostForPdf(putniNalogRow.trosak_materijala),
  );
  drawField(
    "Cestarina / trajekt",
    formatCostForPdf(putniNalogRow.cestarina_trajekt),
  );
  drawField("Ostalo", formatCostForPdf(putniNalogRow.ostalo));

  cursorY += 3;
  doc.setFont(supportsUnicodePdf ? PDF_FONT_FAMILY : "helvetica", "normal");
  doc.setFontSize(9.5);
  const izjava =
    "Ovim nalogom zaposlenik se upucuje na sluzbeni put sukladno navedenim podacima. Troskovi puta obracunavaju se prema vazecim internim aktima i propisima.";
  const izjavaWrapped = doc.splitTextToSize(izjava, contentWidth);
  doc.text(
    izjavaWrapped.map((line) => pdfText(line)),
    margin,
    cursorY,
  );
  cursorY += izjavaWrapped.length * 4.5 + 10;

  const signatureTopY = pageHeight - 44;
  if (cursorY > signatureTopY - 6) {
    doc.addPage();
    doc.setDrawColor(120);
    doc.rect(margin - 4, 10, contentWidth + 8, pageHeight - 20);
    cursorY = 20;
    doc.setFont(supportsUnicodePdf ? PDF_FONT_FAMILY : "helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(pdfText("Nastavak putnog naloga"), margin, cursorY);
  }

  doc.setFontSize(10);
  const signatureLineWidth = 92;
  const signatureLineX = pageWidth - margin - signatureLineWidth;
  doc.line(
    signatureLineX,
    signatureTopY + 10,
    signatureLineX + signatureLineWidth,
    signatureTopY + 10,
  );
  doc.setFontSize(8.5);
  doc.text(
    pdfText("(potpis narucitelja)"),
    signatureLineX + signatureLineWidth / 2,
    signatureTopY + 14,
    {
      align: "center",
    },
  );

  const safeName = String(nalog.naziv_naloga || `putni-nalog-${nalog.id_nalog}`)
    .replace(/[^a-z0-9-_]/gi, "_")
    .toLowerCase();

  const fileName = `putni_nalog_${safeName}.pdf`;
  const saveResult = await savePdfToNaloziFolder(doc, fileName);
  if (!saveResult?.ok) {
    window.alert(
      `Upozorenje: PDF nije spremljen u C:\\Nalozi (${saveResult?.error || "nepoznata greska"})`,
    );
  }

  doc.save(pdfText(fileName));
};
