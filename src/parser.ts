import {
	writeBufferHeader, writeBufferProgram
} from "./buffer";
import {
	CMDS,
	ERRORS,
	HEADER, headers,
	prgCode,
	prgLines, SIZE, source, TPrgBuffer,
	TYPES
} from "./defs";
import { lexer, tokenizer } from "./lexer";
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
import { addPrgLine } from "./prglines";
import { addString } from "./strings";
import { addVar, findVar } from "./vars";

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
		case CMDS.LET:
			parserLet();
			break;
		case CMDS.DIM:
			parserDim();
			break;

		case CMDS.READ:
			const err = parserRead();
			if (err) return err;
			break;
		case CMDS.DATA:
			parserData();
			break;

		case CMDS.REM: {
			const str = parseString();
			const idx = addString(str);
			writeBufferProgram(SIZE.word, idx);
			break;
		}

		case CMDS.GOTO:
		case CMDS.GOSUB:
			parserGoto();
			break;

		case CMDS.FOR:
			parserFor();
			break;
		case CMDS.NEXT:
			parserNext();
			break;

		case CMDS.PRINT:
			parserPrint();
			break;

		case CMDS.IF:
			parserIf();
			break;
		case CMDS.END:
			parserEnd();
			break;

		case CMDS.FUNCTION:
			parserFunction(lineIdx);
			break;
		case CMDS.RETURN:
			parserReturn();
			break;

		default: {
			const err = parseParms();
			if (err) return err;
		}
	}

	// console.log(currentLineNum, cmd);
	return 0;
}

function parseString() {
	return source.buffer.slice(source.idx);
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
