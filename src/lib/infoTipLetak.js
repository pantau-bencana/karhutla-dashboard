export const INFO_TIP_LEBAR = 360;
export const INFO_TIP_SHEET_DI_BAWAH = 640;

export function letakInfoTip({ rect, lebar, tinggi, align = "start", sheetDiBawah = INFO_TIP_SHEET_DI_BAWAH } = {}) {
  if (!rect || !Number.isFinite(lebar) || !Number.isFinite(tinggi) || lebar < sheetDiBawah) {
    return { sheet: true };
  }
  const width = Math.min(INFO_TIP_LEBAR, Math.max(160, lebar - 16));
  let left = align === "end" ? rect.right - width : rect.left;
  left = Math.max(8, Math.min(left, lebar - width - 8));
  const ruangBawah = tinggi - rect.bottom - 12;
  const ruangAtas = rect.top - 12;
  const maxHeight = Math.min(420, Math.max(140, Math.max(ruangBawah, ruangAtas)));
  let top = rect.bottom + 8;
  if (ruangBawah < 160 && ruangAtas > ruangBawah) {
    top = Math.max(8, rect.top - 8 - Math.min(maxHeight, ruangAtas));
  }
  if (top < 8 || top + 80 > tinggi) return { sheet: true };
  return { sheet: false, top, left, width, maxHeight };
}
