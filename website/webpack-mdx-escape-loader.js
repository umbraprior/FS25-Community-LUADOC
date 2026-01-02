/**
 * Webpack loader to escape problematic MDX characters in markdown files
 * This runs BEFORE MDX processing, so it can escape characters that MDX would interpret as JSX
 */

function escapeMdxChars(source) {
  if (typeof source !== 'string') {
    return source;
  }

  let escaped = source;

  // Escape all problematic patterns that MDX interprets as JSX
  // Order matters: handle complex patterns first, then simple ones

  // 1. Escape: 0<N<32 (number < letter < number)
  escaped = escaped.replace(/(\d)<([A-Za-z_$])<(\d)/g, '$1&lt;$2&lt;$3');

  // 2. Escape: <=number or <= number
  escaped = escaped.replace(/<=(\s*\d+)/g, '&lt;=$1');

  // 3. Escape: <number or < number (but not if already &lt;)
  // Use function to check if already escaped
  escaped = escaped.replace(/<(\s*\d+)/g, function(match, digits, offset, fullString) {
    // Check if this < is part of &lt; (already escaped)
    const before = fullString.substring(Math.max(0, offset - 4), offset);
    if (before.endsWith('&lt;') || before.endsWith('&l') || before.endsWith('&')) {
      return match; // Already escaped, don't change
    }
    return '&lt;' + digits;
  });

  // 4. Escape: number>= or number >=
  escaped = escaped.replace(/(\d+)\s*>=/g, '$1&gt;=');

  // 5. Escape: number> or number > (but not >= or &gt;)
  escaped = escaped.replace(/(\d+)\s*>/g, function(match, digits, offset, fullString) {
    // Check if followed by = (>= already handled) or if part of &gt;
    const after = fullString.substring(offset + match.length, offset + match.length + 2);
    const before = fullString.substring(Math.max(0, offset - 4), offset);
    if (after.startsWith('=') || before.endsWith('&gt') || before.endsWith('&g')) {
      return match; // Already handled or part of entity
    }
    return digits + '&gt;';
  });

  // Escape curly braces containing assignments: {key=value, ...}
  escaped = escaped.replace(/\{([a-zA-Z0-9_$.]+=[^}]+)\}/g, '&#123;$1&#125;');
  
  // Escape curly braces with comma-separated values: {x0,y0,z0,...,xn,yn,zn}
  // Match patterns like {x0,y0,z0} or {x0,y0,z0,...,xn,yn,zn} or {x1,z1, x2,z2}
  // Simple approach: escape all curly braces with comma-separated identifiers
  // (We'll be careful not to break code blocks, but this runs before MDX parsing)
  escaped = escaped.replace(/\{([a-z][a-z0-9]*(?:\s*,\s*[a-z0-9]+)+(?:\s*,\s*\.\.\.(?:\s*,\s*[a-z0-9]+)*)?)\}/gi, '&#123;$1&#125;');

  return escaped;
}

module.exports = function(source) {
  // This loader is only applied to .md files via webpack rule
  // Process the source to escape problematic MDX characters
  
  // Always log to verify loader is being called
  if (this.resourcePath) {
    const filePath = this.resourcePath.split(/[/\\]/).slice(-3).join('/');
    console.log(`[MDX Escape Loader] Processing: ${filePath}`);
  }
  
  const original = source;
  const processed = escapeMdxChars(source);
  
  // Log if we made changes
  if (original !== processed) {
    const path = this.resourcePath ? this.resourcePath.split(/[/\\]/).slice(-2).join('/') : 'unknown';
    console.log(`[MDX Escape Loader] Escaped characters in: ${path}`);
    // Show a sample of what was changed
    const sample = original.substring(0, 100).replace(/\n/g, '\\n');
    const sampleEscaped = processed.substring(0, 100).replace(/\n/g, '\\n');
    if (sample !== sampleEscaped) {
      console.log(`[MDX Escape Loader] Sample change: "${sample}" -> "${sampleEscaped}"`);
    }
  }
  
  return processed;
};

