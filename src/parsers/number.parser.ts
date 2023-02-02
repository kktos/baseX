import { TOKEN_TYPES } from "../defs";
import { lexeme, lexer } from "../lexer";

export function parseNum() {
	const tok = lexer();
	return !tok.err && tok.type === TOKEN_TYPES.INT ? parseInt(lexeme) : NaN;
}
