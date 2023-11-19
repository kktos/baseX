import { readBufferHeader, writeBufferHeader } from "./buffer";
import { HEADER, HEADERS_SIZE } from "./defs";
import { memAlloc } from "./memmgr";
import { hexWord } from "./utils";

export let headers: Uint8Array;

export function initHeaders() {
	const memHandle = memAlloc(HEADERS_SIZE);
	if (!memHandle?.mem) return null;

	headers = memHandle.mem;

	for (let idx = 0; idx < headers.length; idx++) headers[idx] = 0xff;

	// version
	writeBufferHeader(HEADER.VERSION, 0x0100);

	return memHandle.addr;
}

function getHeader(name: string, offset: number) {
	return `${hexWord(offset)}: ${hexWord(readBufferHeader(offset))}\t; ${name}`;
}

export function dumpHeaders(out: (...args: string[]) => void) {
	out("\n");
	out("----------- HEADERS\n");
	out(getHeader("version", HEADER.VERSION), "\n");
	out(getHeader("lines", HEADER.LINES), "\n");
	out(getHeader("code", HEADER.CODE), "\n");
	out(getHeader("vars", HEADER.VARS), "\n");
	out(getHeader("arrays", HEADER.ARRAYS), "\n");
	out(getHeader("start", HEADER.START), "\n");
	out(getHeader("size", HEADER.SIZE), "\n");
	out("\n");
}
