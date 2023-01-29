import { readBufferHeader } from "./buffer";
import { CMDS, FIELDS, FNS, HEADER, OPERATORS, prgCode, prgLines, TYPES } from "./defs";
import { getString } from "./strings";
import { EnumToName, hexByte, hexWord } from "./utils";
import { getVar, getVarName, readVarWord } from "./vars";

let prgCursor = 0;
let lineCursor = 0;
let addr = 0;

function readProgramByte(lookahead = false) {
	addr = prgCursor;
	return prgCode.buffer[lookahead ? prgCursor : prgCursor++];
}

function readProgramWord() {
	addr = prgCursor;
	return prgCode.buffer[prgCursor++] | (prgCode.buffer[prgCursor++] << 8);
}

function readLineWord() {
	return prgLines.buffer[lineCursor++] | (prgLines.buffer[lineCursor++] << 8);
}

function disasmVar() {
	const varType = readProgramByte();
	console.log(hexWord(addr), ":", hexByte(varType), "  ;");
	switch (varType & TYPES.SCALAR) {
		case TYPES.string: {
			const strIdx = readProgramWord();
			console.log(hexWord(addr), ":", hexWord(strIdx), "  ;", getString(strIdx));
			break;
		}
		case TYPES.var: {
			const strIdx = readProgramWord();
			console.log(hexWord(addr), ":", hexWord(strIdx), "  ;", getVar(strIdx));
			break;
		}
	}
}

function disasLine() {
	const cmd = readProgramByte();
	const cmdIdx = Object.values(CMDS).findIndex((id) => id === cmd);
	const cmdName = Object.keys(CMDS)[cmdIdx];

	console.log(hexWord(addr), ":", hexByte(cmd), "       ;", cmdName);

	switch (cmd) {
		case CMDS.FUNCTION: {
			const varIdx = readProgramWord();
			const parmCount = readProgramByte();
			dumpWord(varIdx, `${getVarName(varIdx)}()`);
			dumpByte(parmCount, "parm count");
			for (let idx = 1; idx <= parmCount; idx++) {
				const parm = readProgramWord();
				const type = readProgramByte();
				dumpWordByte(
					parm,
					type,
					`${idx}= ${getString(parm)}: ${EnumToName(TYPES, type)}`,
				);
			}
			break;
		}
		case CMDS.END: {
			break;
		}
		case CMDS.END_FUNCTION: {
			break;
		}

		case CMDS.RETURN: {
			disasmExpr();
			break;
		}

		case CMDS.GOTO: {
			const lineIdx = readProgramWord();
			const line =
				prgLines.buffer[lineIdx] | (prgLines.buffer[lineIdx + 1] << 8);
			console.log(hexWord(addr), ":", hexWord(lineIdx), "  ;", line);
			break;
		}
		case CMDS.IF: {
			disasmExpr();
			disasLine();
			break;
		}
		case CMDS.FOR: {
			const varIdx = readProgramWord();
			const nameIdx = readVarWord(varIdx, FIELDS.NAME);
			console.log(
				hexWord(addr),
				":",
				hexWord(varIdx),
				"     ; iterator",
				getVarName(nameIdx),
			);
			disasmExpr();
			disasmExpr();
			disasmExpr();
			break;
		}
		case CMDS.NEXT: {
			const varIdx = readProgramWord();
			const nameIdx = readVarWord(varIdx, FIELDS.NAME);
			console.log(
				hexWord(addr),
				":",
				hexWord(varIdx),
				"     ; iterator",
				getVarName(nameIdx),
			);
			break;
		}
		case CMDS.PRINT: {
			let sep;
			while (sep !== TYPES.END) {
				disasmExpr();
				sep = readProgramByte();
				switch (sep) {
					case 0x09:
						dumpByte(sep, "tab");
						break;
					case 0x0a:
						dumpByte(sep, "no CR");
						break;
					case 0x00:
						dumpByte(sep, "END OF PRINT");
						break;
				}
				//dumpByte(readProgramByte(), "END");
			}
			break;
		}
		case CMDS.LET: {
			const varIdx = readProgramWord();
			console.log(
				hexWord(addr),
				":",
				hexWord(varIdx),
				"     ;",
				`${getVarName(varIdx)} =`,
			);
			disasmExpr();
			break;
		}
		case CMDS.SET: {
			const varIdx = readProgramWord();
			console.log(
				hexWord(addr),
				":",
				hexWord(varIdx),
				"     ;",
				`${getVarName(varIdx)}[] =`,
			);
			disasmExpr();
			disasmExpr();
			break;
		}
		case CMDS.DIM: {
			const varIdx = readProgramWord();
			console.log(
				hexWord(addr),
				":",
				hexWord(varIdx),
				"     ;",
				`${getVarName(varIdx)}[]`,
			);
			// disasmExpr();
			break;
		}
		case CMDS.REM: {
			const strIdx = readProgramWord();
			console.log(
				hexWord(addr),
				":",
				hexWord(strIdx),
				"  ;",
				getString(strIdx),
			);
			break;
		}
		default: {
			disasmVar();
		}
	}
}

function dumpByte(b1: number, cmt: string) {
	console.log(hexWord(addr), ":", hexByte(b1), cmt ? `       ;${cmt}` : "");
}

function dump2Bytes(b1: number, b2: number, cmt: string) {
	console.log(
		hexWord(addr),
		":",
		hexByte(b1),
		hexByte(b2),
		cmt ? `    ;${cmt}` : "",
	);
}

function dumpWord(word: number, cmt: string) {
	console.log(hexWord(addr), ":", hexWord(word), cmt ? `     ;${cmt}` : "");
}

function dumpLong(long: number, cmt: string) {
	console.log(
		hexWord(addr),
		":",
		hexWord(long >> 16) + hexWord(long & 0xffff),
		cmt ? ` ;${cmt}` : "",
	);
}

function dumpByteWord(byte: number, word: number, cmt: string) {
	console.log(
		hexWord(addr),
		":",
		hexByte(byte),
		hexWord(word),
		cmt ? `  ;${cmt}` : "",
	);
}

function dumpWordByte(word: number, byte: number, cmt: string) {
	console.log(
		hexWord(addr),
		":",
		hexWord(word),
		hexByte(byte),
		cmt ? `  ;${cmt}` : "",
	);
}

function disasmExpr() {
	while (true) {
		const memaddr = prgCursor;
		const itemType = readProgramByte();
		switch (itemType) {
			case TYPES.fn: {
				const fn = readProgramByte();
				// dumpByte(itemType, " function");
				let name;
				let nameIdx = Object.values(FNS).indexOf(fn);
				if (nameIdx >= 0) name = `${Object.keys(FNS)[nameIdx]}()`;
				else {
					nameIdx = Object.values(OPERATORS).indexOf(fn);
					name = Object.keys(OPERATORS)[nameIdx];
				}
				addr = memaddr;
				dump2Bytes(itemType, fn, name);
				if (fn === FNS.USER_DEF) {
					const varIdx = readProgramWord();
					dumpWord(varIdx, `fn: ${getVarName(varIdx)}`);
				}
				break;
			}
			case TYPES.string: {
				const strIdx = readProgramWord();
				addr = memaddr;
				dumpByteWord(itemType, strIdx, `str: "${getString(strIdx)}"`);
				break;
			}
			case TYPES.int: {
				const num = readProgramWord();
				addr = memaddr;
				dumpByteWord(itemType, num, `int: ${num}`);
				break;
			}
			case TYPES.float: {
				const buffer = new Uint8Array(4);
				const view = new DataView(buffer.buffer);
				for (let idx = 0; idx < 4; idx++) {
					view.setInt8(idx, readProgramByte());
				}
				addr = memaddr;
				dumpByte(itemType, "float: ");
				dumpLong(view.getUint32(0), `${view.getFloat32(0)}`);
				break;
			}
			case TYPES.var: {
				const v = readProgramWord();
				addr = memaddr;
				dumpByteWord(itemType, v, `var: ${getVarName(v)}`);
				break;
			}
			case TYPES.local: {
				const strIdx = readProgramWord();
				addr = memaddr;
				dumpByteWord(itemType, strIdx, `var: $${getString(strIdx)}`);
				break;
			}
			case TYPES.CLOSE: {
				addr = memaddr;
				dumpByte(itemType, " )");
				break;
			}
			case TYPES.END: {
				addr = memaddr;
				dumpByte(itemType, " END OF EXPR");
				return;
			}
		}
	}
}

export function disasmPrg() {
	lineCursor = readBufferHeader(HEADER.START);
	while (lineCursor !== 0xffff) {
		const lineNum = readLineWord();
		prgCursor = readLineWord();
		lineCursor = readLineWord();

		console.log("----  ", lineNum, hexWord(prgCursor), hexWord(lineCursor));

		if (prgCursor !== 0xffff) disasLine();

		console.log("");
	}
}

export function dumpLines() {
	lineCursor = 0;
	while (lineCursor < prgLines.idx) {
		console.log(
			hexWord(lineCursor),
			":",
			"lineNum=",
			readLineWord(),
			"codePtr=",
			hexWord(readLineWord()),
			"nextPtr=",
			hexWord(readLineWord()),
		);
	}
	console.log("");
}
