import { getArrayDims } from "./arrays";
import { readBufferHeader } from "./buffer";
import { CMDS, FIELDS, FNS, HEADER, OPERATORS, TYPES, VAR_FLAGS, prgCode, prgLines } from "./defs";
import { getString } from "./strings";
import { EnumToName } from "./utils";
import { getVar, getVarName, readVarWord } from "./vars";

let prgCursor = 0;
let lineCursor = 0;
let indentStr = "";

function readProgramByte(lookahead = false) {
	return prgCode.buffer[lookahead ? prgCursor : prgCursor++];
}

function readProgramWord() {
	return prgCode.buffer[prgCursor++] | (prgCode.buffer[prgCursor++] << 8);
}

function readLineWord() {
	return prgLines.buffer[lineCursor++] | (prgLines.buffer[lineCursor++] << 8);
}

function printVar() {
	// const varType= readProgramByte();
	// console.log(hexWord(addr),":", hexByte(varType), "  ;");
	// switch(varType & TYPES.SCALAR) {
	// 	case TYPES.string: {
	// 		const strIdx= readProgramWord();
	// 		console.log(hexWord(addr),":", hexWord(strIdx), "  ;", strings[strIdx]);
	// 		break;
	// 	}
	// 	case TYPES.var: {
	// 		const strIdx= readProgramWord();
	// 		console.log(hexWord(addr),":", hexWord(strIdx), "  ;", getVar(strIdx));
	// 		break;
	// 	}
	// }
}

function printExpr(sep = " ") {
	let out: string[] = [];

	while (true) {
		const itemType = readProgramByte();
		switch (itemType) {
			case TYPES.fn: {
				const fn = readProgramByte();
				let name;
				let sep = ",";
				let nameIdx = Object.values(FNS).indexOf(fn);
				// if (nameIdx >= 0) name = `${Object.keys(FNS)[nameIdx]}()`;
				if (nameIdx >= 0) name = `${Object.keys(FNS)[nameIdx]}`;
				else {
					nameIdx = Object.values(OPERATORS).indexOf(fn);
					name = Object.keys(OPERATORS)[nameIdx];
					const op: Record<string, string> = {
						MULT: "*",
						DIV: "/",
						ADD: "+",
						SUB: "-",
						LT: "<",
						GT: ">",
						EQ: "=",
						NE: "!=",
						LTE: "<=",
						GTE: ">=",
					};
					sep = op[name];
					name = null;
				}
				if (fn === FNS.USER_DEF) {
					const varIdx = readProgramWord();
					// name = `${getVarName(varIdx)}()`;
					name = `${getVarName(varIdx)}`;
				}

				let statement = name ? `${name}(` : "";
				statement += out.reverse().join(sep);
				statement += name ? ")" : "";
				out = [statement];
				// out.push(name);

				break;
			}
			case TYPES.string: {
				const strIdx = readProgramWord();
				out.push(`"${getString(strIdx)}"`);
				break;
			}
			case TYPES.int: {
				const num = readProgramWord();
				out.push(String(num));
				break;
			}
			case TYPES.float: {
				const buffer = new Uint8Array(4);
				const view = new DataView(buffer.buffer);
				for (let idx = 0; idx < 4; idx++) {
					view.setInt8(idx, readProgramByte());
				}
				out.push(view.getFloat32(0).toString());
				break;
			}
			case TYPES.var: {
				const v = readProgramWord();
				out.push(getVarName(v));
				break;
			}
			case TYPES.local: {
				const strIdx = readProgramWord();
				out.push(`$${getString(strIdx)}`);
				break;
			}
			case TYPES.CLOSE: {
				out.push(")");
				break;
			}
			case TYPES.END: {
				return out.join(sep);
			}
		}
		// out += " ";
	}
}

function printLine(print: (...args: string[]) => void, lineNum: number) {
	const cmd = readProgramByte();
	const cmdIdx = Object.values(CMDS).findIndex((id) => id === cmd);
	const cmdName = Object.keys(CMDS)[cmdIdx];
	let out = "";
	let wannaIndent = false;

	switch (cmd) {
		case CMDS.FUNCTION: {
			const varIdx = readProgramWord();
			const parmCount = readProgramByte();
			out += `${getVarName(varIdx)}(`;
			for (let idx = 1; idx <= parmCount; idx++) {
				const parm = readProgramWord();
				const type = readProgramByte();
				out += `$${getString(parm)}: ${EnumToName(TYPES, type)}`;
			}
			out += ")";

			wannaIndent = true;
			break;
		}
		case CMDS.END: {
			out += "\n";
			break;
		}
		case CMDS.END_FUNCTION: {
			indentStr = " ";
			break;
		}

		case CMDS.RETURN: {
			out += printExpr();
			break;
		}

		case CMDS.GOTO: {
			const lineIdx = readProgramWord();
			const line = prgLines.buffer[lineIdx] | (prgLines.buffer[lineIdx + 1] << 8);
			out += line;
			break;
		}
		case CMDS.IF: {
			out += printExpr();
			printLine(print, lineNum);
			break;
		}
		case CMDS.FOR: {
			const varIdx = readProgramWord();
			const nameIdx = readVarWord(varIdx, FIELDS.NAME);
			out += `${getVarName(nameIdx)}= `;
			out += printExpr();
			out += " TO ";
			out += printExpr();
			out += " STEP ";
			out += printExpr();
			wannaIndent = true;
			break;
		}
		case CMDS.NEXT: {
			const varIdx = readProgramWord();
			const nameIdx = readVarWord(varIdx, FIELDS.NAME);
			out += getVarName(nameIdx);
			indentStr = " ";
			break;
		}
		case CMDS.PRINT: {
			let sep;
			while (sep !== TYPES.END) {
				out += printExpr();
				sep = readProgramByte();
				switch (sep) {
					case 0x09:
						out += ",";
						break;
					case 0x0a:
						out += ";";
						break;
				}
			}
			break;
		}
		case CMDS.LET: {
			const varIdx = readProgramWord();
			out += `${getVarName(varIdx)}= `;
			out += printExpr();
			break;
		}
		case CMDS.SET: {
			const varIdx = readProgramWord();
			out += `${getVarName(varIdx)}[`;
			out += printExpr();
			out += "]=  ";
			out += printExpr();
			break;
		}
		case CMDS.DIM: {
			const varIdx = readProgramWord();
			const arrayIdx = getVar(varIdx);
			// const arraySize = getArraySize(arrayIdx);
			const dims = getArrayDims(arrayIdx);
			out += `${getVarName(varIdx)}(${dims.join(",")})`;
			break;
		}
		case CMDS.REM: {
			const strIdx = readProgramWord();
			out += getString(strIdx);
			break;
		}

		case CMDS.READ: {
			let isFirst = true;
			while (true) {
				const varType = readProgramByte();
				if (varType === TYPES.END) break;

				const varIdx = readProgramWord();
				if ((varType & VAR_FLAGS.TYPE) === TYPES.var) {
					out += `${isFirst ? "" : ","}${getVarName(varIdx)}`;
					isFirst = false;
				}
				if (varType & VAR_FLAGS.ARRAY) {
					out += "(";
					out += printExpr();
					out += ")";
				}
			}
			break;
		}
		case CMDS.DATA: {
			out += printExpr(",");
			break;
		}
		case CMDS.RESTORE: {
			const lineNum = readProgramWord();
			if (lineNum !== 0xffff) out += lineNum;
			break;
		}
		default: {
			printVar();
		}
	}

	print(`${indentStr}${cmdName} ${out}`);

	if (wannaIndent) indentStr = "    ";
	// return out;
}

// export function list(fromLine = 0, toLine = 0) {
export function list(out: (...args: string[]) => void) {
	lineCursor = readBufferHeader(HEADER.START);
	let prevLineNum = -1;
	while (lineCursor !== 0xffff) {
		const lineNum = readLineWord();
		prgCursor = readLineWord();
		lineCursor = readLineWord();

		if (prevLineNum === lineNum) {
			out(" : ");
		} else {
			out("\n");
			out(`${String(lineNum).padStart(3, " ")} `);
		}

		printLine(out, lineNum);
		prevLineNum = lineNum;

		if (prgCursor === 0xffff) continue;
	}
	out("\n");
}
