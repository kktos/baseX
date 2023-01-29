import { readFileSync } from "node:fs";
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
// import { dumpArrays } from "./arrays.js";
// import { ERRORS } from "./defs.js";
// import { list } from "./list.js";
// import { parseSource } from "./parser.js";
// import { dumpStrings } from "./strings.js";
// import { EnumToName, hexWord } from "./utils.js";
// import { dumpVars } from "./vars.js";
// import { run } from "./vm.js";

let cmd: string= "";

const args = yargs(process.argv.splice(2))
	.scriptName("baseX")
	.command("parse <filename>", "parse basic source file", {}, ()=>{ cmd="parse"; })
	.command("run <filename>", "run basic source file", {}, ()=>{ cmd="run"; })
	.options({
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
	const content= readFileSync(srcFile);
	const prg = parseSource(content.toString());
	if (prg.err) {
		console.error(
			`ERR ${hexWord(prg.err)} - ${EnumToName(ERRORS, prg.err)}`,
			prg.lineNum,
		);
		return null;
	}
	return prg;
}

switch(cmd) {
	case "parse":
		const prg= parse(args["filename"] as string);
		if(prg)
			dump(prg);
		break;

	case "run": {
		const prg= parse(args["filename"] as string);
		if(!prg)
			break;
		const err= run(prg);
		if(err)
			console.error(`ERR ${hexWord(err)} - ${EnumToName(ERRORS, err)}`, prg.lineNum );
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
	if(args.headers || args.all)
		dumpHeaders();
	if(args.vars || args.all)
		dumpVars();
	if(args.arrays || args.all)
		dumpArrays();
	if(args.strings || args.all)
		dumpStrings();
	if(args.code || args.all) {
		console.log("");
		console.log("----------- CODE");
		console.log("");
		if(prg.code)
			console.log(hexdump(prg.code.buffer, 0, prg.code.idx));
		console.log("");
	}
	if(args.lines || args.all) {
		console.log("----------- LINES");
		console.log("");
		dumpLines();
	}
	if(args.disasm || args.all)
		disasmPrg();
	if(args.list || args.all)
		list();
}
