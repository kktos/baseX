import { readBufferHeader } from "./buffer";
import { HEADER } from "./defs";
import { hexWord } from "./utils";

function dumpHeader(name: string, offset: number) {
	console.log(
		hexWord(offset),
		":",
		hexWord(readBufferHeader(offset)),
		";",
		name,
	);
}

export function dumpHeaders() {
	console.log("");
	console.log("----------- HEADERS");
	dumpHeader("version", HEADER.VERSION);
	dumpHeader("start", HEADER.START);
	dumpHeader("vars", HEADER.VARS);
	dumpHeader("strings", HEADER.STRINGS);
	dumpHeader("lines", HEADER.LINES);
	dumpHeader("arrays", HEADER.ARRAYS);
	console.log("");
}
