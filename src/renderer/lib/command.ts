/**
 * Splits a WP-CLI command the way a shell would, without invoking one:
 * quotes group words, and a backslash escapes the next character outside
 * single quotes. Nothing here reaches a shell, so a stray `;` is just a
 * character in an argument.
 * @param input
 */
export function parseCommand( input: string ): string[] {
	const args: string[] = [];
	let current = '';
	let quote: '"' | "'" | null = null;
	let escaped = false;
	let started = false;

	for ( const character of input.trim() ) {
		if ( escaped ) {
			current += character;
			escaped = false;
			started = true;
			continue;
		}
		if ( character === '\\' && quote !== "'" ) {
			escaped = true;
			continue;
		}
		if ( quote ) {
			if ( character === quote ) {
				quote = null;
			} else {
				current += character;
			}
			started = true;
			continue;
		}
		if ( character === '"' || character === "'" ) {
			quote = character;
			started = true;
			continue;
		}
		if ( /\s/.test( character ) ) {
			if ( started ) {
				args.push( current );
				current = '';
				started = false;
			}
			continue;
		}
		current += character;
		started = true;
	}

	if ( escaped ) {
		current += '\\';
	}
	if ( started ) {
		args.push( current );
	}
	return args;
}
