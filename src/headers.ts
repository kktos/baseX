import { readBufferHeader } from "./buffer";
import { HEADER } from "./defs";
import { hexWord } from "./utils";

function getHeader(name: string, offset: number) {
	return hexWord(offset), ":", hexWord(readBufferHeader(offset)), ";", name;
}

export function dumpHeaders(out: (...args: string[]) => void) {
	out("");
	out("----------- HEADERS");
	out(getHeader("version", HEADER.VERSION));
	out(getHeader("start", HEADER.START));
	out(getHeader("vars", HEADER.VARS));
	out(getHeader("strings", HEADER.STRINGS));
	out(getHeader("lines", HEADER.LINES));
	out(getHeader("arrays", HEADER.ARRAYS));
	out("");
}
