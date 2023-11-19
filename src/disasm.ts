import { readBuffer, readBufferHeader } from "./buffer";
import { CMDS, FIELDS, FNS, HEADER, OPERATORS, SIZE, TPrgBuffer, TYPES, VAR_FLAGS, prgCode, prgLines } from "./defs";
import { getString } from "./strings";
import { EnumToName, hexByte, hexLong, hexWord } from "./utils";
import { getVar, getVarName, readVarWord } from "./vars";

let prgCursor = 0;
let addr = 0;
let pLines: TPrgBuffer;

function readProgramByte(lookahead = false) {
	addr = prgCursor;
	return prgCode.buffer[lookahead ? prgCursor : prgCursor++];
}

function readProgramWord(lookahead = false) {
	addr = prgCursor;
	return prgCode.buffer[lookahead ? prgCursor : prgCursor++] | (prgCode.buffer[lookahead ? prgCursor + 1 : prgCursor++] << 8);
}

function disasmVar(out: (...args: string[]) => void) {
	const varType = readProgramByte();

	out("disasmVar", hexWord(addr), ":", hexByte(varType), "  ;");

	switch (varType & VAR_FLAGS.TYPE) {
		case TYPES.string: {
			const strIdx = readProgramWord();
			out(hexWord(addr), ":", hexWord(strIdx), "  ;", getString(strIdx));
			break;
		}
		case TYPES.var: {
			const strIdx = readProgramWord();
			out(hexWord(addr), ":", hexWord(strIdx), "  ;", String(getVar(strIdx)));
			break;
		}
	}
}

function disasLine(out: (...args: string[]) => void) {
	const cmd = readProgramByte();
	const cmdIdx = Object.values(CMDS).findIndex((id) => id === cmd);
	const cmdName = Object.keys(CMDS)[cmdIdx];

	out(`${hexWord(addr)} : ${hexByte(cmd)}        ; ${cmdName}\n`);

	switch (cmd) {
		case CMDS.FUNCTION: {
			const varIdx = readProgramWord();
			const parmCount = readProgramByte();
			dumpWord(out, varIdx, `${getVarName(varIdx)}()`);
			dumpByte(out, parmCount, "parm count");
			for (let idx = 1; idx <= parmCount; idx++) {
				const parm = readProgramWord();
				const type = readProgramByte();
				dumpWordByte(out, parm, type, `${idx}= ${getString(parm)}: ${EnumToName(TYPES, type)}`);
			}
			break;
		}

		case CMDS.END_FUNCTION:
		case CMDS.END:
		case CMDS.NEW:
			break;

		case CMDS.RETURN: {
			disasmExpr(out);
			break;
		}

		case CMDS.GOTO: {
			const lineIdx = readProgramWord();
			const line = prgLines.buffer[lineIdx] | (prgLines.buffer[lineIdx + 1] << 8);
			out(hexWord(addr), ":", hexWord(lineIdx), "  ;", String(line), "\n");
			break;
		}
		case CMDS.IF: {
			disasmExpr(out);
			disasLine(out);
			break;
		}
		case CMDS.FOR: {
			const varIdx = readProgramWord();
			const nameIdx = readVarWord(varIdx, FIELDS.NAME);
			out(hexWord(addr), ":", hexWord(varIdx), "     ; iterator", getVarName(nameIdx), "\n");
			disasmExpr(out);
			disasmExpr(out);
			disasmExpr(out);
			break;
		}
		case CMDS.NEXT: {
			const varIdx = readProgramWord();
			const nameIdx = readVarWord(varIdx, FIELDS.NAME);
			out(hexWord(addr), ":", hexWord(varIdx), "     ; iterator", getVarName(nameIdx), "\n");
			break;
		}
		case CMDS.PRINT: {
			let sep;
			while (sep !== TYPES.END) {
				disasmExpr(out);
				sep = readProgramByte();
				switch (sep) {
					case 0x09:
						dumpByte(out, sep, "tab");
						break;
					case 0x0a:
						dumpByte(out, sep, "no CR");
						break;
					case 0x00:
						dumpByte(out, sep, "END OF PRINT");
						break;
				}
				//dumpByte(out, readProgramByte(), "END");
			}
			break;
		}
		case CMDS.RESTORE: {
			const lineNum = readProgramWord();
			out(hexWord(addr), ":", hexWord(lineNum), "     ;", `from ${lineNum === 0xffff ? "start" : lineNum}\n`);
			break;
		}
		case CMDS.READ: {
			let byte;
			while (byte !== TYPES.END) {
				byte = readProgramByte();
				out(`${hexWord(addr)} : `);

				const isArray = byte === (TYPES.var | VAR_FLAGS.ARRAY);
				const varIdx = readProgramWord();
				out(`${hexByte(byte)} ${hexWord(varIdx)}   ; ${getVarName(varIdx)}${isArray ? "[]" : ""}`, "\n");

				if (isArray) disasmExpr(out);
				//else readProgramByte();

				byte = readProgramByte(true);
				if (byte === TYPES.END) {
					readProgramByte();
					dumpByte(out, byte, "END OF READ");
				}
			}
			break;
		}
		case CMDS.DATA: {
			disasmExpr(out);
			// let sep;
			// while (sep !== TYPES.END) {
			// 	sep = readProgramByte(true);
			// 	if (sep === TYPES.END) {
			// 		readProgramByte();
			// 		dumpByte(out, sep, "END OF DATA");
			// 	}
			// }
			break;
		}
		case CMDS.LET: {
			const varIdx = readProgramWord();
			out(hexWord(addr), ":", hexWord(varIdx), "     ;", `${getVarName(varIdx)} =`, "\n");
			disasmExpr(out);
			break;
		}
		case CMDS.SET: {
			const varIdx = readProgramWord();
			const dimsCount = readProgramByte();
			out(hexWord(addr), ":", hexWord(varIdx), "     ;", `${getVarName(varIdx)}[] =`, "\n");
			dumpByte(out, dimsCount, "DIMS");
			for (let idx = 0; idx < dimsCount; idx++) disasmExpr(out);
			disasmExpr(out);
			break;
		}
		case CMDS.DIM: {
			const varIdx = readProgramWord();
			out(hexWord(addr), ":", hexWord(varIdx), "     ;", `${getVarName(varIdx)}[]`, "\n");
			// disasmExpr();
			break;
		}
		case CMDS.REM: {
			const strIdx = readProgramWord();
			out(hexWord(addr), ":", hexWord(strIdx), "     ;", getString(strIdx), "\n");
			break;
		}
		default: {
			disasmVar(out);
		}
	}
}

function dumpByte(out: (...args: string[]) => void, b1: number, cmt: string) {
	out(hexWord(addr), ":", hexByte(b1), cmt ? `       ; ${cmt}` : "", "\n");
}

function dump2Bytes(out: (...args: string[]) => void, b1: number, b2: number, cmt: string) {
	out(hexWord(addr), ":", hexByte(b1), hexByte(b2), cmt ? `    ;${cmt}` : "", "\n");
}

function dumpWord(out: (...args: string[]) => void, word: number, cmt: string) {
	out(hexWord(addr), ":", hexWord(word), cmt ? `     ; ${cmt}` : "", "\n");
}

function dumpLong(out: (...args: string[]) => void, long: number, cmt: string) {
	out(hexWord(addr), ":", hexLong(long), cmt ? ` ; ${cmt}` : "", "\n");
}

function dumpByteWord(out: (...args: string[]) => void, byte: number, word: number, cmt: string) {
	out(hexWord(addr), ":", hexByte(byte), hexWord(word), cmt ? `  ; ${cmt}` : "", "\n");
}

function dumpWordByte(out: (...args: string[]) => void, word: number, byte: number, cmt: string) {
	out(hexWord(addr), ":", hexWord(word), hexByte(byte), cmt ? `  ;${cmt}` : "", "\n");
}

function disasmExpr(out: (...args: string[]) => void) {
	while (true) {
		const memaddr = prgCursor;
		const itemType = readProgramByte();
		switch (itemType) {
			case TYPES.fn: {
				const fn = readProgramByte();
				// dumpByte(out, itemType, " function");
				let name;
				let nameIdx = Object.values(FNS).indexOf(fn);
				if (nameIdx >= 0) name = `${Object.keys(FNS)[nameIdx]}()`;
				else {
					nameIdx = Object.values(OPERATORS).indexOf(fn);
					name = Object.keys(OPERATORS)[nameIdx];
				}
				addr = memaddr;
				dump2Bytes(out, itemType, fn, name);
				if (fn === FNS.USER_DEF) {
					const varIdx = readProgramWord();
					dumpWord(out, varIdx, `fn: ${getVarName(varIdx)}`);
				}
				break;
			}
			case TYPES.string: {
				const strIdx = readProgramWord();
				addr = memaddr;
				dumpByteWord(out, itemType, strIdx, `str: "${getString(strIdx)}"`);
				break;
			}
			case TYPES.int: {
				const num = readProgramWord();
				addr = memaddr;
				dumpByteWord(out, itemType, num, `int: ${num}`);
				break;
			}
			case TYPES.float: {
				const buffer = new Uint8Array(4);
				const view = new DataView(buffer.buffer);
				for (let idx = 0; idx < 4; idx++) {
					view.setInt8(idx, readProgramByte());
				}
				addr = memaddr;
				dumpByte(out, itemType, "float: ");
				addr++;
				dumpLong(out, view.getUint32(0), `${view.getFloat32(0)}`);
				break;
			}
			case TYPES.var: {
				const v = readProgramWord();
				addr = memaddr;
				dumpByteWord(out, itemType, v, `var: ${getVarName(v)}`);
				break;
			}
			case TYPES.local: {
				const strIdx = readProgramWord();
				addr = memaddr;
				dumpByteWord(out, itemType, strIdx, `var: $${getString(strIdx)}`);
				break;
			}
			case TYPES.CLOSE: {
				addr = memaddr;
				dumpByte(out, itemType, " )");
				break;
			}
			case TYPES.END: {
				addr = memaddr;
				dumpByte(out, itemType, " END OF EXPR");
				return;
			}
			default:
				dumpByte(out, itemType, " ???");
		}
	}
}

export function disasmPrg(out: (...args: string[]) => void) {
	pLines = {
		buffer: prgLines.buffer,
		idx: readBufferHeader(HEADER.START),
	};

	let counter = 100;

	while (pLines.idx !== 0xffff) {
		counter--;
		if (!counter) break;

		const lineNum = readBuffer(pLines, SIZE.word);
		prgCursor = readBuffer(pLines, SIZE.word);
		pLines.idx = readBuffer(pLines, SIZE.word);

		out("----  ", String(lineNum), hexWord(prgCursor), hexWord(pLines.idx), "\n");

		if (prgCursor !== 0xffff) disasLine(out);

		out("\n");
	}
}
