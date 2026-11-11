import type { StorageItem } from "../types";

type ArchiveFile = { name: string; bytes: Uint8Array };

export function getStorageDescendantIds(items: StorageItem[], rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let updated = true;
  while (updated) {
    updated = false;
    for (const item of items) {
      if (item.parentId && ids.has(item.parentId) && !ids.has(item.id)) {
        ids.add(item.id);
        updated = true;
      }
    }
  }
  return ids;
}

export function hasSiblingName(items: StorageItem[], parentId: string | null, name: string, exceptId?: string): boolean {
  const candidate = name.trim().toLocaleLowerCase();
  return items.some((item) => item.id !== exceptId && item.parentId === parentId && item.name.toLocaleLowerCase() === candidate);
}

export function formatStorageSize(size = 0): string {
  return size > 1_000_000 ? `${(size / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1000))} KB`;
}

export async function makeFolderArchive(folder: StorageItem, items: StorageItem[]): Promise<Blob> {
  const descendants = getStorageDescendantIds(items, folder.id);
  const folders = new Map(items.filter((item) => descendants.has(item.id) && item.type === "folder").map((item) => [item.id, item]));
  const files = await Promise.all(items.filter((item) => descendants.has(item.id) && item.type === "file").map(async (item) => {
    const filename = item.content?.startsWith("data:") ? item.name : item.name.replace(/\.[^.]+$/, ".wav");
    const segments = [filename];
    let parentId = item.parentId;
    while (parentId && parentId !== folder.id) {
      const parent = folders.get(parentId);
      if (!parent) break;
      segments.unshift(parent.name);
      parentId = parent.parentId;
    }
    return { name: segments.join("/"), bytes: await getItemBytes(item) };
  }));
  return createZip(files.length ? files : [{ name: "README.txt", bytes: new TextEncoder().encode(`Empty folder: ${folder.name}`) }]);
}

export async function getItemBytes(item: StorageItem): Promise<Uint8Array> {
  if (item.content?.startsWith("data:")) {
    const response = await fetch(item.content);
    return new Uint8Array(await response.arrayBuffer());
  }
  return demoWaveBytes();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function demoWaveBytes(): Uint8Array {
  const sampleRate = 22050;
  const sampleCount = sampleRate;
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => Array.from(text).forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  writeText(0, "RIFF"); view.setUint32(4, 36 + sampleCount * 2, true); writeText(8, "WAVE");
  writeText(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  writeText(36, "data"); view.setUint32(40, sampleCount * 2, true);
  for (let index = 0; index < sampleCount; index += 1) {
    const envelope = Math.min(1, index / 1100, (sampleCount - index) / 1800);
    view.setInt16(44 + index * 2, Math.sin((2 * Math.PI * 220 * index) / sampleRate) * envelope * 5000, true);
  }
  return new Uint8Array(buffer);
}

function createZip(files: ArchiveFile[]): Blob {
  const localRecords: Uint8Array[] = [];
  const centralRecords: Uint8Array[] = [];
  const encoder = new TextEncoder();
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const checksum = crc32(file.bytes);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true); localView.setUint16(4, 20, true); localView.setUint16(6, 0x0800, true);
    localView.setUint32(14, checksum, true); localView.setUint32(18, file.bytes.length, true); localView.setUint32(22, file.bytes.length, true);
    localView.setUint16(26, name.length, true); local.set(name, 30);
    localRecords.push(local, file.bytes);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true); centralView.setUint16(4, 20, true); centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true); centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, file.bytes.length, true); centralView.setUint32(24, file.bytes.length, true);
    centralView.setUint16(28, name.length, true); centralView.setUint32(42, offset, true); central.set(name, 46);
    centralRecords.push(central);
    offset += local.length + file.bytes.length;
  }
  const centralSize = centralRecords.reduce((total, record) => total + record.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true); endView.setUint16(8, files.length, true); endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true); endView.setUint32(16, offset, true);
  return new Blob([...localRecords, ...centralRecords, end], { type: "application/zip" });
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
