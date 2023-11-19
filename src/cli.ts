import { readFileSync } from "node:fs";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { dumpArrays } from "./arrays";
import { ERRORS, source } from "./defs";
import { disasmPrg } from "./disasm";
import { dumpHeaders } from "./headers";
import { list } from "./list";
import { TProgram, currentLineNum, initParser, parseLine, parseSource } from "./parser";
import { parseNum } from "./parsers/number.parser";
import { dumpLines } from "./prglines";
import { dumpStrings } from "./strings";
import { EnumToName, hexWord } from "./utils";
import { dumpVars } from "./vars";
import { run } from "./vm/vm";

let prg: TProgram | null;

const append = (...args: string[]) => {
	process.stdout.write(args.join(" "));
};

function loadProgram(srcFile: string) {
	let content;
	try {
		content = readFileSync(srcFile);
		const prg = parseSource(content.toString());
		if (prg.err) {
			console.error(`ERR ${hexWord(prg.err)} - ${EnumToName(ERRORS, prg.err)}`, prg.lineNum);
			return null;
		}
		return prg;
	} catch (err) {
		console.error((err as Error).message);
		return null;
	}
}

function execLine(line: string) {
	const words = line.split(/\s+/);

	switch (words[0]) {
		case "list":
			list(append);
			break;

		case "dh":
			dumpHeaders(append);
			break;
		case "dp":
			disasmPrg(append);
			break;
		case "dv":
			dumpVars(append);
			break;
		case "ds":
			dumpStrings(append);
			break;
		case "da":
			dumpArrays(append);
			break;
		case "dl":
			dumpLines(append);
			break;

		case "load": {
			prg = loadProgram(words[1]);
			break;
		}
		case "run": {
			if (!prg) break;
			let err;
			try {
				err = run(prg);
			} catch (err) {
				console.error(err);
			}
			if (err) console.error(`ERR ${hexWord(err as number)} - ${EnumToName(ERRORS, err as number)}`, prg?.lineNum);
			break;
		}
	}

	return ERRORS.NONE;
}

export async function cli() {
	const rl = readline.createInterface({ input, output });

	initParser();

	while (true) {
		const line = await rl.question("] ");

		if (line === "quit") break;

		source.idx = 0;
		source.buffer = line;

		if (Number.isNaN(parseNum(true))) {
			execLine(line);
			continue;
		}

		const err = parseLine();
		if (err) {
			console.error(`ERR ${hexWord(err)} - ${EnumToName(ERRORS, err)}`, currentLineNum);
		}
	}

	rl.close();
}
