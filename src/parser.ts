import { initArrays } from "./arrays";
import { writeBufferHeader, writeBufferProgram } from "./buffer";
import { CMDS, ERRORS, HEADER, SIZE, TOKENS, TOKEN_TYPES, TPrgBuffer, TToken, prgCode, prgLines, source } from "./defs";
import { initHeaders } from "./headers";
import { lexer, lexerErr } from "./lexer";
import { himem, initMemory, memAlloc } from "./memmgr";
import { parserData } from "./parsers/data.parser";
import { parserDim } from "./parsers/dim.parser";
import { parserFor, parserNext } from "./parsers/for.parser";
import { parserFunction, parserReturn } from "./parsers/function.parser";
import { parserGoto } from "./parsers/goto.parser";
import { parserEnd, parserIf } from "./parsers/if.parser";
import { parserLet } from "./parsers/let.parser";
import { parseNum } from "./parsers/number.parser";
import { parserPrint } from "./parsers/print.parser";
import { parserRead } from "./parsers/read.parser";
import { parserRestore } from "./parsers/restore.parser";
import { addPrgLine, addPrgStatement, setLineCodePtr } from "./prglines";
import { initStrings, newString } from "./strings";
import { initVars } from "./vars";

export type TProgram = {
	headers?: Uint8Array;
	lines?: TPrgBuffer;
	code?: TPrgBuffer;
	err?: number;
	src?: string[];
	lineNum?: number;
};

export let currentLineNum: number;
export let currentLineIdx: number;

export function initParser() {
	initMemory(0x800);

	initHeaders();

	let memHandle = memAlloc(255);
	if (!memHandle?.mem) throw new TypeError("OUT OF MEMORY");
	prgLines.buffer = memHandle.mem;
	writeBufferHeader(HEADER.LINES, memHandle.addr);

	memHandle = memAlloc(255);
	if (!memHandle?.mem) throw new TypeError("OUT OF MEMORY");
	prgCode.buffer = memHandle.mem;
	writeBufferHeader(HEADER.CODE, memHandle.addr);

	let addr = initVars(50);
	if (addr === null) throw new TypeError("OUT OF MEMORY");
	writeBufferHeader(HEADER.VARS, addr);

	addr = initArrays(20);
	if (addr === null) throw new TypeError("OUT OF MEMORY");
	writeBufferHeader(HEADER.ARRAYS, addr);

	initStrings(57);

	writeBufferHeader(HEADER.SIZE, himem());
}

export function parseSource(src: string): TProgram {
	const lines = src.split("\n");

	initParser();

	for (let idx = 0; idx < lines.length; idx++) {
		source.idx = 0;
		source.buffer = lines[idx];

		const err = parseLine();
		if (err) {
			return {
				err,
				lineNum: currentLineNum,
				src: lines,
			};
		}
	}

	return {
		// headers: headers,
		lines: prgLines,
		code: prgCode,
	};
}

function addLine(codeIdx: number) {
	if (currentLineIdx === -1) currentLineIdx = addPrgLine(currentLineNum, codeIdx);
	else currentLineIdx = addPrgStatement(currentLineIdx, codeIdx);
}

export function parseLine() {
	currentLineNum = parseNum();

	if (lexerErr === ERRORS.END_OF_LINE) return ERRORS.NONE;
	if (Number.isNaN(currentLineNum)) return ERRORS.SYNTAX_ERROR;

	currentLineIdx = -1;

	while (true) {
		const tok = lexer();
		if (tok.err) return tok.err;
		if (tok.type !== TOKEN_TYPES.COMMAND) return ERRORS.SYNTAX_ERROR;

		addLine(0xffff);

		const codeAddr = prgCode.idx;

		writeBufferProgram(SIZE.byte, tok.value);

		const err = parseStatement(tok);
		if (err && err !== ERRORS.END_OF_LINE) return err;

		setLineCodePtr(currentLineIdx, codeAddr);

		if (err === ERRORS.END_OF_LINE) break;
	}

	return ERRORS.NONE;
}

function parseStatement(currtok: TToken) {
	let tok = currtok;
	let err = ERRORS.NONE;
	switch (tok.value) {
		case CMDS.REM: {
			const str = parseString();
			const idx = newString(str);
			writeBufferProgram(SIZE.word, idx);
			break;
		}

		case CMDS.NEW:
			break;
		case CMDS.LET:
			err = parserLet();
			break;
		case CMDS.DIM:
			err = parserDim();
			break;
		case CMDS.READ:
			err = parserRead();
			break;
		case CMDS.DATA:
			err = parserData();
			break;
		case CMDS.RESTORE:
			err = parserRestore();
			break;
		case CMDS.GOTO:
		case CMDS.GOSUB:
			parserGoto();
			break;
		case CMDS.FOR:
			err = parserFor();
			break;
		case CMDS.NEXT:
			err = parserNext();
			break;
		case CMDS.PRINT:
			err = parserPrint();
			break;
		case CMDS.IF:
			err = parserIf();
			break;
		case CMDS.END:
			parserEnd();
			break;
		case CMDS.FUNCTION:
			err = parserFunction();
			break;
		case CMDS.RETURN:
			err = parserReturn();
			break;

		default: {
			return ERRORS.SYNTAX_ERROR;
			// const err = parseParms();
			// if (err) return err;
		}
	}
	if (err) return err;

	tok = lexer();
	if (tok.err) return tok.err;
	if (tok.type !== TOKEN_TYPES.OPERATOR || tok.value !== TOKENS.COLON) return ERRORS.SYNTAX_ERROR;

	return err;
}

function parseString() {
	return source.buffer.slice(source.idx);
}
/*
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
*/
