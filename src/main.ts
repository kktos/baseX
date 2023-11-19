import { appendFileSync, closeSync, openSync, readFileSync } from "node:fs";
import { Terminal, terminal as term } from "terminal-kit";
import yargs, { ArgumentsCamelCase } from "yargs";
import { dumpArrays } from "./arrays";
import { cli } from "./cli";
import { ERRORS, source } from "./defs";
import { disasmPrg } from "./disasm";
import { dumpHeaders } from "./headers";
import { list } from "./list";
import { TProgram, currentLineNum, parseLine, parseSource } from "./parser";
import { dumpLines } from "./prglines";
import { dumpStrings } from "./strings";
import { EnumToName, hexWord, hexdump } from "./utils";
import { dumpVars } from "./vars";
import { run } from "./vm/vm";

declare global {
	// biome-ignore lint/suspicious/noRedeclare: <explanation>
	// biome-ignore lint/style/noVar: <explanation>
	var term: Terminal;
}

global.term = term;

// let cmd: string = "";
// const term = require( 'terminal-kit' ).terminal ;

type CmdParms = {
	filename: string;
	logFile: string;
	line: string;
};

function parse(srcFile: string) {
	const content = readFileSync(srcFile);
	const prg = parseSource(content.toString());
	if (prg.err) {
		console.error(`ERR ${hexWord(prg.err)} - ${EnumToName(ERRORS, prg.err)}`, prg.lineNum);
		return null;
	}
	return prg;
}

function cmd_parse(args: ArgumentsCamelCase<CmdParms>) {
	const prg = parse(args.filename);
	if (prg) dump(args, prg);
}

function cmd_run(args: ArgumentsCamelCase<CmdParms>) {
	const prg = parse(args.filename);
	if (!prg) return;

	// disasmPrg();
	// list();

	const err = run(prg);

	if (err) term.red(`ERR ${hexWord(err)} - ${EnumToName(ERRORS, err)} LINE ${prg.lineNum}\n`);

	dump(args, prg);
}

async function cmd_cli(_args: ArgumentsCamelCase<CmdParms>) {
	await cli();
}

async function cmd_test(args: ArgumentsCamelCase<CmdParms>) {
	source.idx = 0;
	source.buffer = args.line;

	console.log(args.line);

	const err = parseLine();
	if (err) {
		console.error(`ERR ${hexWord(err)} - ${EnumToName(ERRORS, err)}`, currentLineNum);
	}
}

function dump(args: ArgumentsCamelCase<CmdParms>, prg: TProgram) {
	let fd = -1;
	let append = (...args: string[]) => {
		process.stdout.write(args.join(" "));
	};

	if (args.logFile) {
		try {
			fd = openSync(args.logFile, "w");
			append = (...args: string[]) => {
				appendFileSync(fd, args.join(" "), "utf8");
			};
		} catch (err) {}
	}

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
		dumpLines(append);
	}
	if (args.disasm || args.all) {
		append("----------- DISASM\n");
		disasmPrg(append);
	}
	if (args.list || args.all) {
		append("----------- LISTING\n");
		list(append);
	}

	if (fd !== -1) closeSync(fd);
}

yargs(process.argv.splice(2))
	.scriptName("basX")
	.command<CmdParms>("parse <filename>", "parse basic source file", () => {}, cmd_parse)
	.command<CmdParms>("run <filename>", "run basic source file", () => {}, cmd_run)
	.command<CmdParms>("cli", "run basic CLI", () => {}, cmd_cli)
	.command<CmdParms>("test <line>", "test line", () => {}, cmd_test)
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
	.parseAsync();
