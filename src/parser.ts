import { writeBufferHeader, writeBufferProgram } from "./buffer";
import { CMDS, ERRORS, HEADER, headers, prgCode, prgLines, SIZE, source, TOKENS, TOKEN_TYPES, TPrgBuffer } from "./defs";
import { lexer, lexerErr } from "./lexer";
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
import { addPrgLine, addPrgStatement } from "./prglines";
import { newString } from "./strings";

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

		// console.log(idx, lines[idx]);

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

function parseLine() {
	currentLineNum = parseNum();
	if (lexerErr === ERRORS.END_OF_LINE) return ERRORS.NONE;
	if (isNaN(currentLineNum)) return ERRORS.SYNTAX_ERROR;

	let tok = lexer();
	if (tok.err) return tok.err;

	currentLineIdx = addPrgLine(currentLineNum, prgCode.idx);

	while(true) {

		writeBufferProgram(SIZE.byte, tok.value);

		if (tok.type !== TOKEN_TYPES.COMMAND) return ERRORS.SYNTAX_ERROR;

		let err: number = ERRORS.NONE;
		switch (tok.value) {
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

			case CMDS.REM: {
				const str = parseString();
				const idx = newString(str);
				writeBufferProgram(SIZE.word, idx);
				break;
			}

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
		if (tok.err === ERRORS.END_OF_LINE) break;
		if (tok.err) return tok.err;

		if(tok.type !== TOKEN_TYPES.OPERATOR || tok.value !== TOKENS.COLON) return ERRORS.SYNTAX_ERROR;

		tok = lexer();
		if (tok.err) return tok.err;

		currentLineIdx= addPrgStatement(currentLineIdx, prgCode.idx);
	}

	// console.log(currentLineNum, lexer());

	return 0;
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
