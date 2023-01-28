import { readFileSync } from "node:fs";
import yargs from "yargs";
import { dumpArrays } from "./arrays";
import { ERRORS } from "./defs";
import { parseSource } from "./parser";
import { dumpStrings } from "./strings";
import { EnumToName, hexWord } from "./utils";
import { dumpVars } from "./vars";
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
	// .options({
	// 	parser: {
	// 		type: "string",
	// 		demandOption: true,
	// 	},
	// })
	.demandCommand()
	.parseSync();

function parse(srcFile: string) {
	const content= readFileSync(srcFile);
	const prg = parseSource(content.toString(), true);
	if (prg.err) {
		console.error(
			`ERR ${hexWord(prg.err)} - ${EnumToName(ERRORS, prg.err)}`,
			prg.lineNum,
		);
		console.log(prg.lines);
		dump();
		process.exit();
	}
}

switch(cmd) {
	case "parse":
		parse(args["filename"] as string);
		process.exit();
		break;
	default:
		throw new TypeError("Unknown Command");
}

// if(args["run"]) {
// 	console.log("************************************");
// 	console.log("*             RUN                  *");
// 	console.log("************************************");

// 	const err= run(prg);
// 	if(err) {
// 		console.error(`ERR ${hexWord(err)} - ${EnumToName(ERRORS, err)}`, prg.lineNum );
// 	}
// }

// if(args["dump"])
// 	dump();

// if(args["list"]) {
// 	console.log("************************************");
// 	console.log("*             LIST                 *");
// 	console.log("************************************");

// 	list();
// }

function dump() {
	console.log("");
	console.log("----------- VARS");
	console.log("");
	dumpVars();
	console.log("");
	console.log("----------- ARRAYS");
	console.log("");
	dumpArrays();
	console.log("");
	console.log("----------- STRINGS");
	console.log("");
	dumpStrings();
}
