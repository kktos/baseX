let memory: ArrayBuffer;
let freePtr: number;

export type THandle = {
	addr: number;
	mem: Uint8Array;
};

export function initMemory(lowMem: number) {
	memory = new ArrayBuffer(0x10000);
	freePtr = lowMem;
}

export function memAlloc(size: number) {
	if (freePtr + size > memory.byteLength) return null;
	const chunk = new Uint8Array(memory, freePtr, size);
	const handle: THandle = { addr: freePtr, mem: chunk };
	freePtr += size;
	return handle;
}

export function himem() {
	return freePtr;
}
