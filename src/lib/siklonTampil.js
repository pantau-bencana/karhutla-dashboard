export function agensiSistem(item) {
  const nilai = String(item?.agensi || "").toUpperCase();
  if (nilai === "JMA" || nilai === "JTWC") return nilai;
  return "BMKG";
}

export function daftarSistemSiklon(data) {
  const bmkg = Array.isArray(data?.sistem_halaman) ? data.sistem_halaman : [];
  const jma = Array.isArray(data?.pemantau?.jma?.sistem) ? data.pemantau.jma.sistem : [];
  const jtwc = Array.isArray(data?.pemantau?.jtwc?.sistem) ? data.pemantau.jtwc.sistem : [];
  return [...bmkg, ...jma, ...jtwc].map((item) => ({ ...item, agensi: agensiSistem(item) }));
}

export function kunciNamaSiklon(nama) {
  return String(nama || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function agensiLain(item, semua) {
  const kunci = kunciNamaSiklon(item?.nama);
  if (!kunci) return [];
  const lain = new Set();
  for (const kandidat of semua) {
    if (agensiSistem(kandidat) === agensiSistem(item)) continue;
    if (kunciNamaSiklon(kandidat?.nama) !== kunci) continue;
    lain.add(agensiSistem(kandidat));
  }
  return [...lain];
}

export function kalimatAgensiLain(item, semua) {
  const lain = agensiLain(item, semua);
  if (!lain.length) return "";
  const nama = lain.join(" dan ");
  return `Nama yang sama juga tercatat pada ${nama}.`;
}
