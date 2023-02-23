import { readBufferHeader } from "./buffer";
import { HEADER } from "./defs";
import { hexWord } from "./utils";

function getHeader(name: string, offset: number) {
	return `${hexWord(offset)}: ${hexWord(readBufferHeader(offset))}\t; ${name}`;
}

export function dumpHeaders(out: (...args: string[]) => void) {
	out("\n");
	out("----------- HEADERS\n");
	out(getHeader("version", HEADER.VERSION),"\n");
	out(getHeader("start", HEADER.START),"\n");
	out(getHeader("vars", HEADER.VARS),"\n");
	out(getHeader("strings", HEADER.STRINGS),"\n");
	out(getHeader("lines", HEADER.LINES),"\n");
	out(getHeader("arrays", HEADER.ARRAYS),"\n");
	out("\n");
}
