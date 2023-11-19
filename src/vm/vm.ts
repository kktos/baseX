import { readBufferHeader, readBufferLine, readBufferProgram } from "../buffer";
import { CMDS, ERRORS, HEADER, SIZE, prgCode } from "../defs";
import { TProgram } from "../parser";
import { resetTempStrings, setTempStrings } from "../strings";
import { forStatement } from "./statements/for.statement";
import { functionStatement } from "./statements/function.statement";
import { ifStatement } from "./statements/if.statement";
import { assignArrayItem, assignVar } from "./statements/let.statement";
import { newStatement } from "./statements/new.statement";
import { nextStatement } from "./statements/next.statement";
import { printStatement } from "./statements/print.statement";
import { readStatement } from "./statements/read.statement";
import { restoreStatement } from "./statements/restore.statement";
import { returnStatement } from "./statements/return.statement";
import { context, program } from "./vm.def";

/*
	headers: headers,
	lines: prgLines,
	code: prgCode,
	strings: strings,
	vars: vars,
*/
export function run(prg: TProgram) {
	context.level = 0;
	context.returnExpr = null;
	context.exprStack = [];

	context.code = prg.code;
	context.headers = prg.headers;
	context.lineNum = prg.lineNum;
	context.lines = prg.lines;
	context.src = prg.src;
	context.err = prg.err;

	context.lineIdx = readBufferHeader(HEADER.START);

	program.buffer = prgCode.buffer;
	program.idx = 0;

	// setTempStrings(context.lineIdx);
	setTempStrings();

	const err = execStatements();
	prg.lineNum = context.lineNum;
	return err;
}

// const CMDS_JUMP_TABLE= {
// 	[CMDS.FUNCTION]: functionStatement
// };

export function execStatements(): ERRORS {
	let lineNum;
	let err = ERRORS.NONE;

	while (context.lineIdx !== 0xffff) {
		lineNum = readBufferLine(context.lineIdx);
		program.idx = readBufferLine(context.lineIdx + 2);
		context.lineIdx = readBufferLine(context.lineIdx + 4);

		context.lineNum = lineNum;

		// console.info("*** line", lineNum, hexWord(program.idx));

		if (program.idx === 0xffff) return ERRORS.LINE_MISSING;

		const cmd = readBufferProgram(SIZE.byte);

		// console.info("*** prg", Object.keys(CMDS)[Object.values(CMDS).indexOf(cmd)]);
		// console.info("*** prg", hexWord(program.idx)," : ", hexByte(cmd));

		switch (cmd) {
			case CMDS.LET:
				err = assignVar();
				break;
			case CMDS.SET:
				err = assignArrayItem();
				break;
			case CMDS.DATA:
				break;
			case CMDS.READ:
				err = readStatement();
				break;
			case CMDS.RESTORE:
				err = restoreStatement();
				break;
			case CMDS.PRINT:
				err = printStatement();
				break;
			case CMDS.FOR:
				err = forStatement();
				break;
			case CMDS.NEXT:
				err = nextStatement();
				break;
			case CMDS.DIM:
			case CMDS.REM:
				readBufferProgram(SIZE.word);
				break;
			case CMDS.FUNCTION:
				err = functionStatement();
				break;
			case CMDS.IF:
				err = ifStatement();
				break;
			case CMDS.GOTO:
				context.lineIdx = readBufferProgram(SIZE.word);
				break;
			case CMDS.NEW:
				err = newStatement();
				break;

			case CMDS.RETURN: {
				err = returnStatement();
				if (err) break;
				return ERRORS.NONE;
			}

			case CMDS.END_FUNCTION: {
				// return only from a function (level>0)
				if (!context.level) {
					err = ERRORS.ILLEGAL_STATEMENT;
					break;
				}

				context.returnExpr = { type: 0, value: 0 };
				return ERRORS.NONE;
			}

			case CMDS.END: {
				// allowed only on main prg, not in functions
				if (context.level) {
					err = ERRORS.ILLEGAL_STATEMENT;
					break;
				}
				return ERRORS.NONE;
			}

			default:
				console.error("UNKNOWN_STATEMENT", cmd, lineNum, program.idx, context.lineIdx);
				err = ERRORS.UNKNOWN_STATEMENT;
		}

		if (err) return err;

		resetTempStrings();
	}

	return ERRORS.NONE;
}

export function addInt16(a: number, b: number) {
	return a + b;
}

export function cmpInt16(a: number, b: number, op: string) {
	switch (op) {
		case "<=":
			return a <= b;
		case "<":
			return a < b;
		case "<>":
			return a !== b;
	}
	return false;
}
