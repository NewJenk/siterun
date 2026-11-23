/**
 * The siterun mark is the `</>` glyph. The wordmark pairs it with lowercase
 * "siterun"; only "run" is italic, which gives the name its motion.
 */
export function SiterunMark( { className }: { className?: string } ) {
	return (
		<span className={ className ? `siterun-mark ${ className }` : 'siterun-mark' } aria-hidden="true">
			&lt;/&gt;
		</span>
	);
}

export function SiterunWordmark( { className }: { className?: string } ) {
	return (
		<span className={ className ? `siterun-wordmark ${ className }` : 'siterun-wordmark' }>
			<SiterunMark className="siterun-wordmark-mark" />
			<span className="siterun-wordmark-text">
				site<span className="siterun-wordmark-run">run</span>
			</span>
		</span>
	);
}
