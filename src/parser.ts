import { addArray } from "./arrays";
import {
	readBufferHeader,
	writeBufferHeader,
	writeBufferLine,
	writeBufferProgram
} from "./buffer";
import {
	CMDS,
	ERRORS,
	HEADER, headers,
	prgCode,
	prgLines, SIZE, source, TOKENS,
	TPrgBuffer,
	TYPES
} from "./defs";
import { parseExpr } from "./expr";
import { lexer, tokenizer } from "./lexer";
import { addString } from "./strings";
import {
	addIteratorVar,
	addVar,
	declareVar, findIteratorVar,
	findVar,
	getTypeFromName,
	getVarType,
	isVarDeclared,
	setVar,
	setVarDeclared,
	setVarFunction,
	setVarType
} from "./vars";

export type TProgram = {
	headers?: Uint8Array;
	lines?: TPrgBuffer;
	code?: TPrgBuffer;
	err?: number;
	src?: string[];
	lineNum?: number;
};

let currentLineNum: number;

export function parseSource(src: string): TProgram {
	const lines = src.split("\n");

	for (let idx = 0; idx < headers.length; idx++) headers[idx] = 0xff;

	// version
	writeBufferHeader(HEADER.VERSION, 0x0001);
	// start source.buffer idx
	// writeBufferHeader(HEADER.START, 0xFFFF);

	for (let idx = 0; idx < lines.length; idx++) {
		source.idx = 0;
		source.buffer = lines[idx];
		const err = parseLine();
		if (err) {
			// console.error("ERR", hexWord(err), ` at ${currentLineNum} : <${source.buffer.slice(source.idx)}>`);
			// dump(lines);
			return {
				err,
				lineNum: currentLineNum,
				src: lines,
			};
		}
	}

	// clear screen
	// process.stdout.write('\0o33c');

	return {
		headers: headers,
		lines: prgLines,
		code: prgCode,
	};
}

function parseGoto() {
	const linenum = parseNum();
	let lineIdx = findPrgLine(linenum);
	if (lineIdx < 0) lineIdx = addPrgLine(linenum, 0xffff);
	writeBufferProgram(SIZE.word, lineIdx);
}

function parseLine() {

	const tok = lexer();
	if (tok == null) return;

	currentLineNum = parseNum(tok);
	if (isNaN(currentLineNum)) return ERRORS.SYNTAX_ERROR;

	const cmd = tokenizer();
	if (cmd === -1) return ERRORS.SYNTAX_ERROR;

	const lineIdx = addPrgLine(currentLineNum, prgCode.idx);
	writeBufferProgram(SIZE.byte, cmd);

	switch (cmd) {
		case CMDS.LET: {
			const varName = lexer();
			if(varName == null)
				return ERRORS.SYNTAX_ERROR;

			let tok = tokenizer();
			const isArray = tok === TOKENS.LEFT_PARENT;

			let varIdx = findVar(varName);
			if (varIdx < 0) {
				varIdx = isArray ? addVar(varName, 0, true) : declareVar(varName, 0);
			} else setVarDeclared(varIdx);

			if (isArray) {
				prgCode.idx--;
				writeBufferProgram(SIZE.byte, CMDS.SET);
			}

			writeBufferProgram(SIZE.word, varIdx);

			if (isArray) {
				const err = parseExpr();
				if (err) return err;

				writeBufferProgram(SIZE.byte, TYPES.END);

				if (tokenizer() !== TOKENS.RIGHT_PARENT) return ERRORS.SYNTAX_ERROR;

				tok = tokenizer();
			}

			if (tok !== TOKENS.EQUAL) return ERRORS.SYNTAX_ERROR;

			const err = parseExpr();
			if (err) return err;
			writeBufferProgram(SIZE.byte, TYPES.END);

			break;
		}

		case CMDS.DIM: {
			const varName = lexer();
			if(varName == null)
				return ERRORS.SYNTAX_ERROR;

			let varIdx = findVar(varName);
			if (varIdx < 0) {
				// varIdx= declareVar(varName, context.level, true);
				varIdx = declareVar(varName, 0, true);
			} else {
				const isArray = getVarType(varIdx) & TYPES.ARRAY;
				if (!isArray) return ERRORS.TYPE_MISMATCH;

				const isDeclared = !(getVarType(varIdx) & TYPES.UNDECLARED);
				if (isDeclared) return ERRORS.TYPE_MISMATCH;

				setVarDeclared(varIdx);
			}
			writeBufferProgram(SIZE.word, varIdx);

			if (lexer() !== "(") return ERRORS.SYNTAX_ERROR;

			const dim = parseNum();
			if (isNaN(dim)) return ERRORS.SYNTAX_ERROR;

			if (lexer() !== ")") return ERRORS.SYNTAX_ERROR;

			if (tokenizer(true) === CMDS.AS) {
				if ((getVarType(varIdx) & 0x3f) !== TYPES.int)
					return ERRORS.TYPE_MISMATCH;

				lexer();
				const size = tokenizer();
				switch (size) {
					case CMDS.BYTE: {
						setVarType(varIdx, TYPES.byte);
						break;
					}
					case CMDS.WORD: {
						break;
					}
					default:
						return ERRORS.SYNTAX_ERROR;
				}
			}

			const arrIdx = addArray(getVarType(varIdx) & 0x3f, dim);
			setVar(varIdx, arrIdx);

			break;
		}

		case CMDS.REM: {
			const str = parseString();
			const idx = addString(str);
			writeBufferProgram(SIZE.word, idx);
			break;
		}

		case CMDS.GOTO:
		case CMDS.GOSUB: {
			parseGoto();
			break;
		}

		case CMDS.FOR: {
			const varName = lexer();
			if(varName == null)
				return ERRORS.SYNTAX_ERROR;

			let varIdx = findVar(varName);
			if (varIdx < 0) {
				varIdx = declareVar(varName, 0);
			}

			if (getVarType(varIdx) !== TYPES.int) return ERRORS.TYPE_MISMATCH;

			const iteratorIdx = addIteratorVar(varIdx);
			writeBufferProgram(SIZE.word, iteratorIdx);

			if (lexer() !== "=") return ERRORS.SYNTAX_ERROR;

			let err = parseExpr();
			if (err) return err;
			writeBufferProgram(SIZE.byte, TYPES.END);

			if (tokenizer() !== CMDS.TO) return ERRORS.SYNTAX_ERROR;

			err = parseExpr();
			if (err) return err;
			writeBufferProgram(SIZE.byte, TYPES.END);

			if (tokenizer(true) === CMDS.STEP) {
				lexer();
				err = parseExpr();
				if (err) return err;
			} else {
				writeBufferProgram(SIZE.byte, TYPES.int);
				writeBufferProgram(SIZE.word, 1);
			}
			writeBufferProgram(SIZE.byte, TYPES.END);

			break;
		}

		case CMDS.NEXT: {
			const varName = lexer();
			if (!varName) return ERRORS.SYNTAX_ERROR;

			let varIdx = findVar(varName);
			if (varIdx < 0)
				// varIdx= addVar(varName, context.level);
				varIdx = addVar(varName, 0);

			if (getVarType(varIdx) !== TYPES.int) return ERRORS.TYPE_MISMATCH;

			let iteratorIdx = findIteratorVar(varIdx);
			if (iteratorIdx < 0) iteratorIdx = addIteratorVar(varIdx);
			writeBufferProgram(SIZE.word, iteratorIdx);
			break;
		}

		case CMDS.PRINT: {
			let tok;
			let hasMore = false;
			do {
				const err = parseExpr();
				if (err) return err;
				writeBufferProgram(SIZE.byte, TYPES.END);

				tok = tokenizer();
				hasMore = false;
				switch (tok) {
					case TOKENS.COMMA:
						hasMore = true;
						writeBufferProgram(SIZE.byte, 0x09);
						break;
					case TOKENS.SEMICOLON:
						hasMore = true;
						writeBufferProgram(SIZE.byte, 0x0a);
						break;
					default:
						writeBufferProgram(SIZE.byte, TYPES.END);
				}
			} while (hasMore);

			break;
		}

		case CMDS.IF: {
			const err = parseExpr();
			if (err) return err;

			if (tokenizer() !== CMDS.THEN) return ERRORS.SYNTAX_ERROR;

			writeBufferProgram(SIZE.byte, TYPES.END);

			writeBufferProgram(SIZE.byte, CMDS.GOTO);
			parseGoto();
			break;
		}

		case CMDS.END: {
			const cmd = tokenizer(true);
			switch (cmd) {
				case CMDS.FUNCTION: {
					lexer();
					prgCode.idx--;
					writeBufferProgram(SIZE.byte, CMDS.END_FUNCTION);
					break;
				}
			}
			break;
		}

		case CMDS.FUNCTION: {
			let name = lexer();
			if(name == null)
				return ERRORS.SYNTAX_ERROR;

			const varIdx = findVar(name);
			if (varIdx >= 0) {
				if (isVarDeclared(varIdx)) return ERRORS.DUPLICATE_NAME;

				setVarDeclared(varIdx);
				setVarFunction(varIdx);
				setVar(varIdx, lineIdx);

				writeBufferProgram(SIZE.word, varIdx);

				const parmCountPos = prgCode.idx;
				writeBufferProgram(SIZE.byte, 0);

				if (tokenizer(true) === TOKENS.LEFT_PARENT) {
					let done = false;
					let parmCount = 0;
					while (!done) {
						lexer();

						if (tokenizer() !== TOKENS.DOLLAR) return ERRORS.SYNTAX_ERROR;

						name = lexer();
						if(name == null)
							return ERRORS.SYNTAX_ERROR;

						const nameIdx = addString(name, true);
						writeBufferProgram(SIZE.word, nameIdx);
						parmCount++;

						let varType = getTypeFromName(name);
						let tok = tokenizer(true);
						if (tok === CMDS.AS || tok === TOKENS.COLON) {
							lexer();
							tok = tokenizer();
							switch (tok) {
								case CMDS.INT:
								case CMDS.WORD:
									varType = TYPES.int;
									break;
								case CMDS.BYTE:
									varType = TYPES.byte;
									break;
								case CMDS.STRING:
									varType = TYPES.string;
									break;
								case CMDS.FLOAT:
									varType = TYPES.float;
									break;
								default:
									return ERRORS.SYNTAX_ERROR;
							}
							tok = tokenizer(true);
						}
						writeBufferProgram(SIZE.byte, varType);

						switch (tok) {
							case TOKENS.COMMA:
							case TOKENS.RIGHT_PARENT:
								done = true;
								break;
						}
					}
					lexer();
					prgCode.buffer[parmCountPos] = parmCount;
				}
				//return ERRORS.SYNTAX_ERROR;
			} else throw new Error("NOT YET IMPLEMENTED !");

			break;
		}

		case CMDS.RETURN: {
			const err = parseExpr();
			if (err) return err;
			writeBufferProgram(SIZE.byte, TYPES.END);
			break;
		}

		default: {
			const err = parseParms();
			if (err) return err;
		}
	}

	// console.log(currentLineNum, cmd);
	return 0;
}

function parseNum(tok?: string) {
	const intStr = tok !== undefined ? tok : lexer();
	return intStr == null ? NaN : parseInt(intStr);
}

function parseString() {
	return source.buffer.slice(source.idx);
}

function addPrgLine(lineNum: number, offset: number) {
	let lineIdx = findPrgLine(lineNum);
	if (lineIdx >= 0) {
		prgLines.buffer[lineIdx + 2] = offset & 0xff;
		prgLines.buffer[lineIdx + 3] = (offset >> 8) & 0xff;
		return lineIdx;
	}

	// console.log("addPrgLine", lineNum, hexWord(offset));

	const currLineIdx = prgLines.idx;

	let min = 0;
	let minIdx = -1;
	for (let idx = 0; idx < currLineIdx; idx += 6) {
		const currLineNum = prgLines.buffer[idx] | (prgLines.buffer[idx + 1] << 8);
		if (currLineNum < lineNum && currLineNum > min) {
			min = currLineNum;
			minIdx = idx;
		}
	}

	let nextLineIdx = 0xffff;

	if (minIdx === -1) {
		nextLineIdx = readBufferHeader(HEADER.START);
		writeBufferHeader(HEADER.START, currLineIdx);
		// console.log("addPrgLine start", hexWord(nextLineIdx));
	} else {
		nextLineIdx =
			prgLines.buffer[minIdx + 4] | (prgLines.buffer[minIdx + 5] << 8);
		writeBufferLine(currLineIdx, minIdx + 4);
		// console.log("addPrgLine prev", min, hexWord(minIdx));
	}

	lineIdx = prgLines.idx;
	writeBufferLine(lineNum);
	writeBufferLine(offset);
	writeBufferLine(nextLineIdx);

	// console.log(hexdump(prgLines.buffer, 0, prgLines.idx, 6));
	return lineIdx;
}

function findPrgLine(lineNum: number) {
	for (let idx = 0; idx < prgLines.idx; idx += 6) {
		const currLineNum = prgLines.buffer[idx] | (prgLines.buffer[idx + 1] << 8);
		if (currLineNum === lineNum) return idx;
	}
	return -1;
}

function parseVar(tok: string) {
	let varIdx = findVar(tok);
	if (varIdx < 0) {
		// varIdx = addVar(tok, context.level);
		varIdx = addVar(tok, 0);
	}
	writeBufferProgram(SIZE.word, varIdx);
	return varIdx;
}

function parseParms() {
	const tok = lexer();

	if (!tok) return ERRORS.SYNTAX_ERROR;

	// string
	if (tok[0] === '"') {
		writeBufferProgram(SIZE.byte, TYPES.string);
		const idx = addString(tok.slice(1));
		writeBufferProgram(SIZE.word, idx);
		return;
	}

	// function

	// var
	writeBufferProgram(SIZE.byte, TYPES.var);
	parseVar(tok);

	return 0;
}
