import { appendFileSync, closeSync, openSync, readFileSync } from "node:fs";
import { terminal as term, Terminal } from "terminal-kit";
import yargs from "yargs";
import { dumpArrays } from "./arrays";
import { ERRORS } from "./defs";
import { disasmPrg, dumpLines } from "./disasm";
import { dumpHeaders } from "./headers";
import { list } from "./list";
import { parseSource, TProgram } from "./parser";
import { dumpStrings } from "./strings";
import { EnumToName, hexdump, hexWord } from "./utils";
import { dumpVars } from "./vars";
import { run } from "./vm";

declare global {
	// rome-ignore lint/nursery/noVar: <explanation>
	var term: Terminal;
}

global.term = term;

let cmd: string = "";
// const term = require( 'terminal-kit' ).terminal ;

const args = yargs(process.argv.splice(2))
	.scriptName("basX")
	.command("parse <filename>", "parse basic source file", {}, () => {
		cmd = "parse";
	})
	.command("run <filename>", "run basic source file", {}, () => {
		cmd = "run";
	})
	.options({
		logFile: { string: true },
		headers: { type: "boolean" },
		vars: { type: "boolean" },
		arrays: { type: "boolean" },
		strings: { type: "boolean" },
		code: { type: "boolean" },
		lines: { type: "boolean" },
		disasm: { type: "boolean" },
		list: { type: "boolean" },
		all: { type: "boolean" },
	})
	.demandCommand()
	.parseSync();

function parse(srcFile: string) {
	const content = readFileSync(srcFile);
	const prg = parseSource(content.toString());
	if (prg.err) {
		console.error(`ERR ${hexWord(prg.err)} - ${EnumToName(ERRORS, prg.err)}`, prg.lineNum);
		return null;
	}
	return prg;
}

switch (cmd) {
	case "parse":
		const prg = parse(args["filename"] as string);
		if (prg) dump(prg);
		break;

	case "run": {
		const prg = parse(args["filename"] as string);
		if (!prg) break;

		// disasmPrg();
		// list();

		const err = run(prg);

		if (err) term.red(`ERR ${hexWord(err)} - ${EnumToName(ERRORS, err)} LINE ${prg.lineNum}\n`);

		dump(prg);
		break;
	}
	default:
		throw new TypeError("Unknown Command");
}

// if(args["run"]) {
// 	console.log("************************************");
// 	console.log("*             RUN                  *");
// 	console.log("************************************");

// }

function dump(prg: TProgram) {
	if(!args.logFile)
		return;

	let fd: number= -1;
	try {
		fd = openSync(args.logFile, "w");

		const append= (...args: string[]) => {
			appendFileSync(fd, args.join(" "), 'utf8');
		};

		if (args.headers || args.all) dumpHeaders(append);

		if (args.vars || args.all) dumpVars(append);

		if (args.arrays || args.all) dumpArrays(append);

		if (args.strings || args.all) dumpStrings(append);

		if (args.code || args.all) {
			append("\n");
			append("----------- CODE\n");
			append("\n");
			if (prg.code) append(hexdump(prg.code.buffer, 0, prg.code.idx));
			append("\n");
		}
		if (args.lines || args.all) {
			append("----------- LINES\n");
			append("\n");
			dumpLines();
		}
		if (args.disasm || args.all) disasmPrg(append);
		if (args.list || args.all) list();


	} catch (err) {
	// Handle the error
	} finally {
		closeSync(fd);
	}


}
