import { readBufferHeader, readBufferLine, readBufferProgram } from "../buffer";
import { CMDS, ERRORS, HEADER, SIZE, TYPES } from "../defs";
import { TProgram } from "../parser";
import { resetTempStrings, setTempStrings } from "../strings";
import {
	addVarNameIdx, getIteratorVar,
	getVar, ITERATOR, removeVarsForLevel,
	setIteratorVar,
	setVar
} from "../vars";
import { evalExpr, expr } from "./expr.vm";
import { assignArrayItem, assignVar } from "./statements/let.statement";
import { printStatement } from "./statements/print.statement";
import { readStatement } from "./statements/read.statement";
import { program, TContext } from "./vm.def";

export let context: TContext;

/*
	headers: headers,
	lines: prgLines,
	code: prgCode,
	strings: strings,
	vars: vars,
*/
export function run(prg: TProgram) {
	context = {
		...prg,
		lineIdx: readBufferHeader(HEADER.START),
		level: 0,
		returnExpr: null,
		exprStack: [],
	};

	// setTempStrings(context.lineIdx);
	setTempStrings();

	const err = execStatements();
	prg.lineNum = context.lineNum;
	return err;
}

export function execStatements() {
	let lineNum;
	let err;

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
			case CMDS.FUNCTION: {
				// function could be run only on call (level>0)
				if (!context.level) {
					err= ERRORS.ILLEGAL_STATEMENT;
					break;
				}

				// console.log("FUNCTION", context.exprStack);

				// skip function var
				readBufferProgram(SIZE.word);

				let parmCount = readBufferProgram(SIZE.byte);

				// console.log("FUNCTION parmCount", parmCount);

				if (context.exprStack.length < parmCount) {
					err= ERRORS.NOT_ENOUGH_PARMS;
					break;
				}

				while (parmCount--) {
					const nameIdx = readBufferProgram(SIZE.word);
					const varType = readBufferProgram(SIZE.byte);
					const expr = context.exprStack.pop();
					if (expr?.type !== varType) return ERRORS.TYPE_MISMATCH;
					const varIdx = addVarNameIdx(nameIdx, context.level, varType, false, true);
					setVar(varIdx, expr.value);
				}

				break;
			}

			case CMDS.RETURN: {
				// return only from a function (level>0)
				if (!context.level) {
					err= ERRORS.ILLEGAL_STATEMENT;
					break;
				}

				err = evalExpr();
				if (err) break;

				context.returnExpr = expr;

				removeVarsForLevel(context.level);

				return;
			}

			case CMDS.END_FUNCTION: {
				// return only from a function (level>0)
				if (!context.level) {
					err= ERRORS.ILLEGAL_STATEMENT;
					break;
				}

				context.returnExpr = { type: 0, value: 0 };
				return;
			}

			case CMDS.DIM:
			case CMDS.REM: {
				readBufferProgram(SIZE.word);
				break;
			}

			case CMDS.END: {
				// allowed only on main prg, not in functions
				if (context.level) {
					err= ERRORS.ILLEGAL_STATEMENT;
					break;
				}
				return;
			}

			case CMDS.LET: {
				err = assignVar();
				break;
			}

			case CMDS.SET: {
				err = assignArrayItem();
				break;
			}

			case CMDS.DATA:
				break;

			case CMDS.READ: {
				err = readStatement();
				break;
			}

			case CMDS.IF: {
				err = evalExpr();
				if (err) break;

				if (!expr.value) break;

				readBufferProgram(SIZE.byte);
			}

			case CMDS.GOTO: {
				context.lineIdx = readBufferProgram(SIZE.word);
				break;
			}

			case CMDS.PRINT: {
				err= printStatement();
				break;
			}

			case CMDS.FOR: {
				const iteratorIdx = readBufferProgram(SIZE.word);

				err = evalExpr();
				if (err) return err;
				if (expr.type === TYPES.string) return ERRORS.TYPE_MISMATCH;

				const varIdx = getIteratorVar(iteratorIdx, ITERATOR.VAR);
				setVar(varIdx, expr.value);

				// upper bound
				err = evalExpr();
				if (err) return err;
				setIteratorVar(iteratorIdx, ITERATOR.MAX, expr.value);

				// step
				err = evalExpr();
				if (err) return err;
				setIteratorVar(iteratorIdx, ITERATOR.INC, expr.value);

				setIteratorVar(iteratorIdx, ITERATOR.PTR, context.lineIdx);

				break;
			}

			case CMDS.NEXT: {
				const iteratorIdx = readBufferProgram(SIZE.word);

				const inc = getIteratorVar(iteratorIdx, ITERATOR.INC);
				const max = getIteratorVar(iteratorIdx, ITERATOR.MAX);
				const varIdx = getIteratorVar(iteratorIdx, ITERATOR.VAR);

				const sum = addInt16(inc, getVar(varIdx));

				if (cmpInt16(sum, max, "<=")) {
					setVar(varIdx, sum);
					context.lineIdx = getIteratorVar(iteratorIdx, ITERATOR.PTR);
				}

				break;
			}

			default:
				console.error("UNKNOWN_STATEMENT", cmd, lineNum, program.idx, context.lineIdx);
				err= ERRORS.UNKNOWN_STATEMENT;
		}

		if(err) return err;

		resetTempStrings();
	}

	return 0;
}

function addInt16(a: number, b: number) {
	return a + b;
}

function cmpInt16(a: number, b: number, op: string) {
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
