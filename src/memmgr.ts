// const memory = new Uint8Array(0x10000);

export function memAlloc(size: number) {
	return new Uint8Array(size);
}
